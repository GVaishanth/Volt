import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class DirCommandModule implements ICommand {
  public readonly name = 'dir';
  public readonly aliases = ['ls'];
  public readonly description =
    'Displays directory listings. Supports flags -l (detailed permissions/sizes), -a (all entries), /tree or /w.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    flags: Map<string, boolean>,
    context: IExecutionContext
  ): Promise<ICommandResult> {
    if (
      flags.has('tree') ||
      args.includes('/tree') ||
      args.includes('-tree') ||
      args.includes('--tree')
    ) {
      this.bus.publish('VFS:DIR_REQUEST', {
        targetPath: context.cwd,
        detailed: false,
        showAll: false
      });
      return { success: true, exitCode: 0 };
    }

    const detailed =
      flags.has('l') || args.includes('-l') || args.includes('-la') || args.includes('-al');
    const showAll =
      flags.has('a') || args.includes('-a') || args.includes('-la') || args.includes('-al');

    // Clean up flags from target path search
    const cleanArgs = args.filter(a => !a.startsWith('-') && !a.startsWith('/'));
    const targetPath = cleanArgs.length > 0 ? cleanArgs.join(' ') : context.cwd;

    this.bus.publish('VFS:DIR_REQUEST', { targetPath, detailed, showAll });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `dir [path] [/tree] [-l] [-a] [or] ls [-l] [-a] [path]`,
      examples: [`dir`, `ls -l`, `ls -la C:\\Users\\Volt`, `dir /tree`]
    };
  }
}
