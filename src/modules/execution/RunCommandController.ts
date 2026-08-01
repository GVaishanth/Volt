import { VoltBus } from '@core/VoltBus';
import { LanguageDetectionModule } from './LanguageDetectionModule';
import { ExecutionEngineModule } from './ExecutionEngineModule';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { EditorModule } from '@modules/editor/EditorModule';

export interface IRunCommandController {
  executeRunPipeline(targetArg: string | undefined, cwd: string): Promise<boolean>;
}

export class RunCommandController implements IRunCommandController {
  private bus: VoltBus;
  private detector: LanguageDetectionModule;
  private engine: ExecutionEngineModule;
  private vfs?: VFSModule;
  private editor?: EditorModule;

  constructor(vfs?: VFSModule, editor?: EditorModule) {
    this.bus = VoltBus.getInstance();
    this.detector = new LanguageDetectionModule();
    this.engine = new ExecutionEngineModule();
    this.vfs = vfs;
    this.editor = editor;

    this.bus.subscribe('EXEC:RUN_REQUEST', event => {
      if (this.vfs) {
        const payload = event.payload as any;
        void this.executeRunPipeline(payload?.targetArg, this.vfs.getCWD());
      }
    });
  }

  public async executeRunPipeline(targetArg: string | undefined, cwd: string): Promise<boolean> {
    if (this.engine.isRunning()) {
      this.bus.publish('EXEC:STDERR_CHUNK', {
        text: '[Error: Process already running. Press Ctrl+C to terminate.]\n'
      });
      return false;
    }

    if (this.editor) {
      await this.editor.saveActiveBuffer();
    }

    let entryPoint = targetArg;
    if (!entryPoint) {
      const activeBuf = this.editor?.getActiveBuffer();
      if (activeBuf) {
        entryPoint = activeBuf.path;
      } else if (this.vfs) {
        try {
          const entries = await this.vfs.readdir(cwd);
          const codeFiles = entries.filter(e => {
            const l = e.name.toLowerCase();
            return (
              l.endsWith('.cpp') || l.endsWith('.c') || l.endsWith('.py') || l.endsWith('.java') || l.endsWith('.js') || l.endsWith('.sh')
            );
          });
          if (codeFiles.length === 1) {
            entryPoint = codeFiles[0].path;
          } else if (codeFiles.length > 1) {
            const mainFile = codeFiles.find(
              f => f.name.toLowerCase().startsWith('main') || f.name.toLowerCase().startsWith('app')
            );
            if (mainFile) {
              entryPoint = mainFile.path;
            } else {
              entryPoint = codeFiles[0].path;
            }
          }
        } catch {
          // Ignore
        }
      }
    } else if (this.vfs && !entryPoint.includes('\\') && !entryPoint.includes('/')) {
      entryPoint = `${cwd}\\${entryPoint}`.replace(/\\+/g, '\\');
    }

    if (!entryPoint) {
      this.bus.publish('EXEC:STDERR_CHUNK', {
        text: '[Run Error] No target file specified or found in current directory. Type: run <filename>\n'
      });
      return false;
    }

    const detection = await this.detector.detect(entryPoint, cwd, this.vfs);
    if (detection.confidence === 'AMBIGUOUS' && detection.language === 'Text') {
      this.bus.publish('EXEC:STDERR_CHUNK', {
        text: `[Volt Auto-Detect] Cannot infer programming language for '${entryPoint}'.\n`
      });
      return false;
    }

    const fileName = entryPoint.split('\\').pop() || entryPoint;
    this.bus.publish('EXEC:STDOUT_CHUNK', {
      text: `[Volt Auto-Detect] Running ${detection.language} project (Entry: ${fileName})...\n`
    });

    const exitCode = await this.engine.spawnProcess(detection.language, entryPoint, this.vfs);
    return exitCode === 0;
  }
}
