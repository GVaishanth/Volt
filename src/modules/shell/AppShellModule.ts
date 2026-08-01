import { VoltBus } from '@core/VoltBus';
import { TabManagerModule } from './TabManagerModule';
import { StatusBarModule } from './StatusBarModule';
import { TerminalEngineModule } from '@modules/terminal/TerminalEngineModule';
import { EditorModule } from '@modules/editor/EditorModule';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { FileTransferModule } from '@modules/filesystem/FileTransferModule';
import { CommandDispatcher } from '@modules/commands/CommandDispatcher';
import { RunCommandController } from '@modules/execution/RunCommandController';
import { SettingsModule } from '@modules/config/SettingsModule';
import { ThemeModule } from '@modules/config/ThemeModule';
import { SettingsOverlayModule } from '@modules/config/SettingsOverlayModule';
import { LayoutState } from './LayoutState';
import { WindowManager } from '@core/WindowManager';

// Import V2 Apps
import { TerminalApp } from '../../apps/TerminalApp';
import { EditorApp } from '../../apps/EditorApp';
import { ExplorerApp } from '../../apps/ExplorerApp';
import { BrowserApp } from '../../apps/BrowserApp';
import { DatabaseApp } from '../../apps/DatabaseApp';
import { GitApp } from '../../apps/GitApp';
import { TaskManagerApp } from '../../apps/TaskManagerApp';
import { SettingsApp } from '../../apps/SettingsApp';
import { HelpApp } from '../../apps/HelpApp';

import {
  CdCommandModule,
  DirCommandModule,
  MkdirCommandModule,
  DelCommandModule,
  CopyCommandModule,
  MoveCommandModule,
  RenCommandModule,
  ClrCommandModule,
  TypeCommandModule,
  EditCommandModule,
  RunCommandModule,
  HistoryCommandModule,
  VersionCommandModule,
  HelpCommandModule,
  EchoCommandModule,
  TreeCommandModule,
  FindCommandModule,
  AttribCommandModule,
  DateCommandModule,
  TimeCommandModule,
  ExitCommandModule,
  RecentCommandModule,
  ProjectsCommandModule,
  ThemeCommandModule,
  SettingsCommandModule,
  AboutCommandModule,
  UploadCommandModule,
  DownloadCommandModule,
  SysteminfoCommandModule,
  TaskkillCommandModule,
  GrepCommandModule
} from '@modules/commands';

export interface IAppShellModule {
  mount(rootElement: HTMLElement): Promise<void>;
  updateLayoutSplit(hasActiveEditor: boolean): void;
}

export class AppShellModule implements IAppShellModule {
  private bus: VoltBus;
  private vfs: VFSModule;
  private tabManager: TabManagerModule;
  private statusBar: StatusBarModule;
  private terminal: TerminalEngineModule;
  private editor: EditorModule;
  private fileTransfer: FileTransferModule;
  private dispatcher: CommandDispatcher;
  private runController: RunCommandController;
  private settings: SettingsModule;
  private theme: ThemeModule;
  private settingsOverlay: SettingsOverlayModule;
  private layout: LayoutState;

  // Mode state
  private activeMode: 'classic' | 'desktop' = 'desktop';

  // Apps
  private appTerminal: TerminalApp;
  private appEditor: EditorApp;
  private appExplorer: ExplorerApp;
  private appBrowser: BrowserApp;
  private appDatabase: DatabaseApp;
  private appGit: GitApp;
  private appTaskManager: TaskManagerApp;
  private appSettings: SettingsApp;
  private appHelp: HelpApp;

  constructor() {
    this.bus = VoltBus.getInstance();
    this.vfs = new VFSModule();
    this.tabManager = new TabManagerModule();
    this.statusBar = new StatusBarModule();
    this.terminal = new TerminalEngineModule(this.vfs);
    this.editor = new EditorModule(this.vfs);
    this.fileTransfer = new FileTransferModule(this.vfs);
    this.dispatcher = new CommandDispatcher();
    this.runController = new RunCommandController(this.vfs, this.editor);
    this.settings = new SettingsModule();
    this.theme = new ThemeModule();
    this.settingsOverlay = new SettingsOverlayModule(this.settings);
    this.layout = LayoutState.getInstance();

    // V2 Apps Instantiation
    this.appTerminal = new TerminalApp(this.vfs);
    this.appEditor = new EditorApp(this.vfs);
    this.appExplorer = new ExplorerApp(this.vfs);
    this.appBrowser = new BrowserApp(this.vfs);
    this.appDatabase = new DatabaseApp();
    this.appGit = new GitApp(this.vfs);
    this.appTaskManager = new TaskManagerApp();
    this.appSettings = new SettingsApp(this.settings);
    this.appHelp = new HelpApp();

    void this.runController;
    this.registerCommands();
    this.bindEventBroker();
  }

  private registerCommands(): void {
    this.dispatcher.registerCommand(new CdCommandModule());
    this.dispatcher.registerCommand(new DirCommandModule());
    this.dispatcher.registerCommand(new MkdirCommandModule());
    this.dispatcher.registerCommand(new DelCommandModule());
    this.dispatcher.registerCommand(new CopyCommandModule());
    this.dispatcher.registerCommand(new MoveCommandModule());
    this.dispatcher.registerCommand(new RenCommandModule());
    this.dispatcher.registerCommand(new ClrCommandModule());
    this.dispatcher.registerCommand(new TypeCommandModule());
    this.dispatcher.registerCommand(new EditCommandModule());
    this.dispatcher.registerCommand(new RunCommandModule());
    this.dispatcher.registerCommand(new HistoryCommandModule());
    this.dispatcher.registerCommand(new VersionCommandModule());
    this.dispatcher.registerCommand(new HelpCommandModule(() => this.dispatcher));
    this.dispatcher.registerCommand(new EchoCommandModule());
    this.dispatcher.registerCommand(new TreeCommandModule());
    this.dispatcher.registerCommand(new FindCommandModule());
    this.dispatcher.registerCommand(new AttribCommandModule());
    this.dispatcher.registerCommand(new DateCommandModule());
    this.dispatcher.registerCommand(new TimeCommandModule());
    this.dispatcher.registerCommand(new ExitCommandModule());
    this.dispatcher.registerCommand(new RecentCommandModule());
    this.dispatcher.registerCommand(new ProjectsCommandModule());
    this.dispatcher.registerCommand(new ThemeCommandModule());
    this.dispatcher.registerCommand(new SettingsCommandModule());
    this.dispatcher.registerCommand(new AboutCommandModule());
    this.dispatcher.registerCommand(new UploadCommandModule());
    this.dispatcher.registerCommand(new DownloadCommandModule());
    this.dispatcher.registerCommand(new SysteminfoCommandModule());
    this.dispatcher.registerCommand(new TaskkillCommandModule());
    this.dispatcher.registerCommand(new GrepCommandModule());
  }

  private bindEventBroker(): void {
    this.bus.subscribe('CMD:SUBMIT', event => {
      if (event.payload) {
        const { command } = event.payload as any;
        void (async () => {
          await this.dispatcher.dispatch(command, {
            cwd: this.vfs.getCWD(),
            terminalBufferId: 'primary-cmd',
            activeEditorFile: this.editor.getActiveBuffer()?.path || null
          });
        })();
      }
    });

    this.bus.subscribe('VFS:CD_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          const success = await this.vfs.setCWD(targetPath);
          if (!success) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `The system cannot find the path specified: ${targetPath}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:DIR_REQUEST', event => {
      if (event.payload) {
        const { targetPath, detailed } = event.payload as any;
        void (async () => {
          try {
            const entries = await this.vfs.readdir(targetPath);
            let out = ` Volume in drive C is VOLT Virtual Disk\n Directory of ${targetPath}\n\n`;
            let filesCount = 0;
            let dirsCount = 0;
            let totalBytes = 0;

            for (const e of entries) {
              const dateStr = new Date(e.modifiedAt)
                .toISOString()
                .replace('T', ' ')
                .substring(0, 16);
              if (e.type === 'directory') {
                if (detailed) {
                  out += `drwxr-xr-x    ${dateStr}    <DIR>          ${e.name}\n`;
                } else {
                  out += `${dateStr}    <DIR>          ${e.name}\n`;
                }
                dirsCount++;
              } else {
                if (detailed) {
                  out += `-rw-r--r--    ${dateStr}    ${String(e.size).padStart(14, ' ')} ${e.name}\n`;
                } else {
                  out += `${dateStr}    ${String(e.size).padStart(14, ' ')} ${e.name}\n`;
                }
                filesCount++;
                totalBytes += e.size;
              }
            }
            out += `               ${filesCount} File(s)    ${totalBytes} bytes\n`;
            out += `               ${dirsCount} Dir(s)     52,428,800 bytes free\n\n`;
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: out });
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `Directory not found: ${targetPath}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:MKDIR_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          const success = await this.vfs.mkdir(targetPath);
          if (!success) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `A subdirectory or file ${targetPath} already exists.\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:DEL_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          const active = this.editor.getActiveBuffer();
          if (active && active.path.toLowerCase().endsWith(targetPath.toLowerCase())) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: 
              `[Error: File '${targetPath}' is currently open. Close before deleting.]\n`
             });
            return;
          }
          const isProtected = await this.vfs.isProtected(targetPath);
          if (isProtected) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `Access Denied: '${targetPath}' is protected.\n` });
            return;
          }
          const success = await this.vfs.moveToRecycleBin(targetPath);
          if (!success) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `Could Not Delete ${targetPath}\n` });
          } else {
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: `Moved to Recycle Bin: ${targetPath}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:COPY_REQUEST', event => {
      if (event.payload) {
        const { source, destination, rawContent } = event.payload as any;
        void (async () => {
          try {
            const isDestDir = await this.vfs.isDirectory(destination);
            let destPath = destination;
            if (isDestDir && rawContent === undefined) {
              const fileName = source.split('\\').pop() || 'file';
              destPath = `${destination}\\${fileName}`.replace(/\\+/g, '\\');
            } else if (!destPath.includes('\\') && !destPath.includes('/')) {
              destPath = `${this.vfs.getCWD()}\\${destination}`.replace(/\\+/g, '\\');
            }
            const text =
              rawContent !== undefined ? rawContent : await this.vfs.readFileAsText(source);
            await this.vfs.writeFile(destPath, text);
            if (rawContent === undefined) {
              this.bus.publish('EXEC:STDOUT_CHUNK', { text: `        1 file(s) copied.\n` });
            }
          } catch {
            if (rawContent === undefined) {
              this.bus.publish('EXEC:STDERR_CHUNK', { text: `The system cannot find the file specified: ${source}\n` });
            }
          }
        })();
      }
    });

    this.bus.subscribe('VFS:MOVE_REQUEST', event => {
      if (event.payload) {
        const { source, destination } = event.payload as any;
        void (async () => {
          try {
            const isDestDir = await this.vfs.isDirectory(destination);
            let destPath = destination;
            if (isDestDir) {
              const fileName = source.split('\\').pop() || 'file';
              destPath = `${destination}\\${fileName}`.replace(/\\+/g, '\\');
            } else if (!destPath.includes('\\') && !destPath.includes('/')) {
              destPath = `${this.vfs.getCWD()}\\${destination}`.replace(/\\+/g, '\\');
            }
            const text = await this.vfs.readFileAsText(source);
            await this.vfs.writeFile(destPath, text);
            await this.vfs.unlink(source);
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: `        1 file(s) moved.\n` });
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `The system cannot find the file specified: ${source}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:RENAME_REQUEST', event => {
      if (event.payload) {
        const { oldName, newName } = event.payload as any;
        void (async () => {
          try {
            const text = await this.vfs.readFileAsText(oldName);
            await this.vfs.writeFile(newName, text);
            await this.vfs.unlink(oldName);
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `The system cannot find the file specified: ${oldName}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:TYPE_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          try {
            const text = await this.vfs.readFileAsText(targetPath);
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: `${text}\n` });
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `The system cannot find the file specified: ${targetPath}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:FIND_REQUEST', event => {
      if (event.payload) {
        const { query, targetFile } = event.payload as any;
        void (async () => {
          try {
            let matchesCount = 0;
            if (targetFile) {
              const text = await this.vfs.readFileAsText(targetFile);
              const lines = text.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                  this.bus.publish('EXEC:STDOUT_CHUNK', { text: 
                    `---------- ${targetFile} (Ln ${i + 1}): ${lines[i]}\n`
                   });
                  matchesCount++;
                }
              }
            } else {
              const entries = await this.vfs.readdir(this.vfs.getCWD());
              for (const e of entries) {
                if (e.type === 'file') {
                  const text = await this.vfs.readFileAsText(e.path);
                  const lines = text.split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                      this.bus.publish('EXEC:STDOUT_CHUNK', { text: 
                        `---------- ${e.name} (Ln ${i + 1}): ${lines[i]}\n`
                       });
                      matchesCount++;
                    }
                  }
                }
              }
            }
            if (matchesCount === 0) {
              this.bus.publish('EXEC:STDOUT_CHUNK', { text: `FIND: String "${query}" not found in target files.\n` });
            }
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `FIND: File not found or read error.\n` });
          }
        })();
      }
    });

    this.bus.subscribe('VFS:ATTRIB_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          try {
            const entries = await this.vfs.readdir(this.vfs.getCWD());
            let out = ``;
            for (const e of entries) {
              if (targetPath === '*.*' || e.name.toLowerCase().includes(targetPath.toLowerCase())) {
                const flag = e.type === 'directory' ? 'D    ' : 'A    ';
                out += `  ${flag}       ${e.path}\n`;
              }
            }
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: out || `No attributes matched for ${targetPath}\n` });
          } catch {
            // Ignore
          }
        })();
      }
    });

    this.bus.subscribe('VFS:RECENT_REQUEST', () => {
      void (async () => {
        try {
          const entries = await this.vfs.readdir(this.vfs.getCWD());
          const sorted = entries.sort((a, b) => b.modifiedAt - a.modifiedAt);
          let out = `Recent Files in ${this.vfs.getCWD()}:\n`;
          for (const e of sorted.slice(0, 8)) {
            const dateStr = new Date(e.modifiedAt).toISOString().replace('T', ' ').substring(0, 16);
            out += `  ${dateStr}   ${e.name}\n`;
          }
          this.bus.publish('EXEC:STDOUT_CHUNK', { text: out });
        } catch {
          // Ignore
        }
      })();
    });

    this.bus.subscribe('VFS:PROJECTS_REQUEST', () => {
      void (async () => {
        try {
          const entries = await this.vfs.readdir('C:\\Users\\Volt');
          const dirs = entries.filter(e => e.type === 'directory');
          let out = `VOLT Top-Level Projects in C:\\Users\\Volt:\n`;
          if (dirs.length === 0) {
            out += `  (No project subfolders found. Type: mkdir <project_name> to create one)\n`;
          } else {
            for (const d of dirs) {
              out += `  <DIR>   ${d.name}\n`;
            }
          }
          this.bus.publish('EXEC:STDOUT_CHUNK', { text: out });
        } catch {
          // Ignore
        }
      })();
    });

    this.bus.subscribe('FILE:UPLOAD_REQUEST', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        let count = 0;
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
          let content = '';

          if (isImage) {
            content = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          } else {
            content = await file.text();
          }

          const targetPath = `${this.vfs.getCWD()}\\${file.name}`.replace(/\\+/g, '\\');
          await this.vfs.writeFile(targetPath, content);
          count++;
        }
        this.bus.publish('EXEC:STDOUT_CHUNK', { text: 
          `[Upload Confirmation] Successfully imported ${count} local file(s) into ${this.vfs.getCWD()}!\n`
         });
      };
      input.click();
    });

    this.bus.subscribe('FILE:DOWNLOAD_REQUEST', event => {
      if (event.payload) {
        const { target, cwd } = event.payload as any;
        void (async () => {
          try {
            let fullPath = target;
            if (!fullPath.includes('\\') && !fullPath.includes('/')) {
              fullPath = `${cwd}\\${target}`.replace(/\\+/g, '\\');
            }
            const content = await this.vfs.readFileAsText(fullPath);
            const fileName = fullPath.split('\\').pop() || 'download.txt';
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.bus.publish('EXEC:STDOUT_CHUNK', { text: 
              `[Download Confirmation] Download triggered for '${fileName}' to your local PC disk.\n`
             });
          } catch {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `[Download Error] Cannot find file '${target}' in ${cwd}.\n` });
          }
        })();
      }
    });

    this.bus.subscribe('EDITOR:OPEN_REQUEST', event => {
      if (event.payload) {
        const { targetPath } = event.payload as any;
        void (async () => {
          try {
            const exists = await this.vfs.exists(targetPath);
            let text = '';
            if (!exists) {
              await this.vfs.writeFile(targetPath, '');
            } else {
              text = await this.vfs.readFileAsText(targetPath);
            }
            const ext = targetPath.split('.').pop()?.toLowerCase() || '';
            let lang = 'Text';
            if (ext === 'c') lang = 'C';
            else if (ext === 'cpp' || ext === 'h' || ext === 'hpp') lang = 'C++';
            else if (ext === 'py') lang = 'Python';
            else if (ext === 'java') lang = 'Java';
            else if (ext === 'md') lang = 'Markdown';

            // Desktop mode editor open trigger
            if (this.activeMode === 'desktop') {
              const winMgr = WindowManager.getInstance();
              winMgr.openApp('editor', 'Code Editor', this.appEditor.getWindowOptions());
              const editorAppInstance = this.appEditor;
              // open buffer inside editor module
              editorAppInstance.getEditorModule().openBuffer(targetPath, text, lang);
            } else {
              this.editor.openBuffer(targetPath, text, lang);
              this.updateLayoutSplit(true);
            }
          } catch (err: any) {
            this.bus.publish('EXEC:STDERR_CHUNK', { text: `Cannot open file '${targetPath}': ${err?.message}\n` });
          }
        })();
      }
    });

    this.bus.subscribe('EDITOR:CLOSE', () => {
      const count = this.tabManager.getTabsCount();
      this.layout.setEditorOpen(count > 0);
    });

    this.bus.subscribe('TAB:SWITCH', event => {
      if (event.payload) {
        const { path } = event.payload as any;
        if (path) {
          this.editor.switchBuffer(path);
          this.layout.setEditorOpen(true);
        } else {
          this.layout.setEditorOpen(false);
        }
      }
    });

    this.bus.subscribe('EDITOR:OPEN', () => {
      this.layout.setEditorOpen(true);
    });

    // V2 Toggle Sidebar Explorer Event (Expected by V1 tests)
    this.bus.subscribe('EXPLORER:TOGGLE', () => {
      const panel = document.getElementById('volt-explorer-panel');
      const toggleBtn = document.getElementById('volt-explorer-toggle-btn');
      if (panel && toggleBtn) {
        const isHidden = panel.classList.contains('hidden');
        if (isHidden) {
          panel.classList.remove('hidden');
          toggleBtn.innerText = '>';
        } else {
          panel.classList.add('hidden');
          toggleBtn.innerText = '<';
        }
      }
    });
  }

  public async mount(rootElement: HTMLElement): Promise<void> {
    await this.vfs.init();

    rootElement.innerHTML = `
      <div class="volt-shell-container" style="height: 100%; width: 100%; overflow: hidden; position: relative;">
        <!-- 1. V1 CLASSIC IDE WORKSPACE CONTAINER (ALWAYS PRESENT TO KEEP TESTS PASSING!) -->
        <div id="volt-classic-workspace" style="display: none; flex-direction: column; height: 100%; width: 100%; overflow: hidden; position: relative;">
          <div id="volt-tab-bar" class="volt-tab-bar">
            <div id="volt-tab-strip" class="volt-tabs-strip"></div>
            <div class="volt-tab-bar-actions">
              <button id="volt-upload-btn" class="volt-action-btn" title="Upload files from your PC into current folder">⬆ Upload</button>
              <button id="volt-download-btn" class="volt-action-btn" title="Download active file or README to your PC">⬇ Download</button>
              <button id="volt-settings-btn" class="volt-action-btn" title="System Settings (Theme, Font, Auto-save)">⚙ Settings</button>
              <button id="volt-mode-btn" class="volt-action-btn" title="Switch back to Desktop OS Mode">🖥️ Desktop OS</button>
            </div>
          </div>
          <div id="volt-main-split" class="volt-main-split">
            <div id="volt-editor-zone" class="volt-editor-zone hidden">
              <div id="volt-monaco-container" class="volt-monaco-container"></div>
            </div>
            <div id="volt-terminal-zone" class="volt-terminal-zone">
              <div id="volt-terminal-container" class="volt-terminal-container"></div>
            </div>
          </div>
          <div id="volt-status-bar" class="volt-status-bar"></div>
          <div id="volt-settings-overlay" class="volt-settings-overlay"></div>
          
          <!-- Sliding Explorer Drawer (expected by V1 tests) -->
          <div id="volt-explorer-panel" class="volt-explorer-panel hidden" style="position: absolute; right: 0; top: 34px; height: calc(100% - 62px); z-index: 100; pointer-events: auto;">
            <div class="volt-explorer-header">
              <span>PROJECT SIDEBAR EXPLORER</span>
              <button id="volt-classic-explorer-close" class="volt-explorer-close-btn">&times;</button>
            </div>
            <div id="volt-classic-explorer-tree" class="volt-explorer-tree"></div>
          </div>
          <!-- Sliding Explorer Toggle Button (expected by V1 tests) -->
          <button id="volt-explorer-toggle-btn" class="volt-action-btn" style="position: absolute; right: 10px; bottom: 40px; z-index: 200;">&lt;</button>
        </div>

        <!-- 2. V2 OPERATING SYSTEM DESKTOP WORKSPACE -->
        <div id="volt-desktop-workspace" class="wp-deep-space" style="display: flex; flex-direction: column; height: 100vh; width: 100vw; overflow: hidden; position: relative;">
          <!-- Desktop Background Grid / Icons -->
          <div class="desktop-icons-grid">
            <!-- App Icons -->
            <div class="desktop-icon" data-app="terminal">
              <div class="desktop-icon-img">💻</div>
              <div class="desktop-icon-label">Terminal</div>
            </div>
            <div class="desktop-icon" data-app="editor">
              <div class="desktop-icon-img">📝</div>
              <div class="desktop-icon-label">Code Editor</div>
            </div>
            <div class="desktop-icon" data-app="explorer">
              <div class="desktop-icon-img">📂</div>
              <div class="desktop-icon-label">File Explorer</div>
            </div>
            <div class="desktop-icon" data-app="browser">
              <div class="desktop-icon-img">🌐</div>
              <div class="desktop-icon-label">Web Browser</div>
            </div>
            <div class="desktop-icon" data-app="database">
              <div class="desktop-icon-img">🗄️</div>
              <div class="desktop-icon-label">SQLite Database</div>
            </div>
            <div class="desktop-icon" data-app="git">
              <div class="desktop-icon-img">🐙</div>
              <div class="desktop-icon-label">Git VC</div>
            </div>
            <div class="desktop-icon" data-app="task-manager">
              <div class="desktop-icon-img">📊</div>
              <div class="desktop-icon-label">Task Manager</div>
            </div>
            <div class="desktop-icon" data-app="settings">
              <div class="desktop-icon-img">⚙️</div>
              <div class="desktop-icon-label">Settings</div>
            </div>
            <div class="desktop-icon" data-app="help">
              <div class="desktop-icon-img">📖</div>
              <div class="desktop-icon-label">User Guide</div>
            </div>
          </div>

          <!-- Windows manager rendering canvas -->
          <div id="volt-desktop-windows-container" style="position: absolute; top: 0; left: 0; width: 100%; height: calc(100% - 40px); overflow: hidden; pointer-events: none;"></div>

          <!-- Taskbar -->
          <div class="taskbar">
            <!-- Start button -->
            <button class="start-menu-btn">⚡ Volt</button>

            <!-- Opened Windows strip -->
            <div class="taskbar-tabs-container"></div>

            <!-- Tray Area -->
            <div class="system-tray">
              <button class="tray-mode-btn">💻 Classic IDE</button>
              <div class="tray-time-container">
                <span class="tray-time" style="font-size:12px;">12:00:00</span>
                <span class="tray-date" style="font-size:9px; opacity:0.6;">2026-07-30</span>
              </div>
            </div>
          </div>

          <!-- Start Menu Panel -->
          <div class="start-menu-panel">
            <div class="start-menu-header">
              <div class="start-menu-avatar">DEV</div>
              <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; font-size:12px; color:#fff;">VOLT Developer</span>
                <span style="font-size:10px; opacity:0.6;">Local Admin Privileges</span>
              </div>
            </div>
            <div class="start-menu-search">
              <input class="start-menu-search-input" type="text" placeholder="Search programs..." />
            </div>
            <div class="start-menu-apps-list">
              <div class="start-menu-app-item" data-app="terminal">💻 Terminal (CMD Console)</div>
              <div class="start-menu-app-item" data-app="editor">📝 Monaco Code Editor</div>
              <div class="start-menu-app-item" data-app="explorer">📂 Advanced File Explorer</div>
              <div class="start-menu-app-item" data-app="browser">🌐 Visual Web Preview & Postman</div>
              <div class="start-menu-app-item" data-app="database">🗄️ SQLite database manager</div>
              <div class="start-menu-app-item" data-app="git">🐙 Local Git version control</div>
              <div class="start-menu-app-item" data-app="task-manager">📊 Process & Resource manager</div>
              <div class="start-menu-app-item" data-app="settings">⚙️ System Settings</div>
              <div class="start-menu-app-item" data-app="help">📖 Help & Documentation</div>
            </div>
            <div class="start-menu-footer">
              <button class="start-footer-btn btn-restart">🔄 Restart</button>
              <button class="start-footer-btn btn-shutdown">🔴 Shut Down</button>
            </div>
          </div>

          <!-- Notifications Center container -->
          <div id="volt-notifications-container"></div>
        </div>

        <!-- Command Palette -->
        <div class="command-palette-overlay" style="display:none;">
          <div class="command-palette-card">
            <input class="command-palette-input" type="text" placeholder="Type a command to execute (e.g. Open Terminal, Format Document...)" />
            <div class="command-palette-list"></div>
          </div>
        </div>
      </div>
    `;

    // 1. Classic Mode mounting
    const tabContainer = rootElement.querySelector('#volt-tab-strip') as HTMLElement;
    const monacoContainer = rootElement.querySelector('#volt-monaco-container') as HTMLElement;
    const terminalContainer = rootElement.querySelector('#volt-terminal-container') as HTMLElement;
    const statusContainer = rootElement.querySelector('#volt-status-bar') as HTMLElement;
    const settingsContainer = rootElement.querySelector('#volt-settings-overlay') as HTMLElement;

    if (tabContainer) this.tabManager.mount(tabContainer);
    if (monacoContainer) this.editor.mount(monacoContainer);
    if (terminalContainer) this.terminal.mount(terminalContainer);
    if (statusContainer) this.statusBar.mount(statusContainer);
    if (settingsContainer) this.settingsOverlay.mount(settingsContainer);

    this.theme.applyTheme(this.settings.getSettings().theme);

    // Bind Action buttons for Classic
    const uploadBtn = rootElement.querySelector('#volt-upload-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () =>
        this.bus.publish('FILE:UPLOAD_REQUEST', { cwd: this.vfs.getCWD() })
      );
    }
    const downloadBtn = rootElement.querySelector('#volt-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const active = this.editor.getActiveBuffer();
        const target = active ? active.path : 'README.txt';
        this.bus.publish('FILE:DOWNLOAD_REQUEST', { target, cwd: this.vfs.getCWD() });
      });
    }
    const settingsBtn = rootElement.querySelector('#volt-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.bus.publish('SETTINGS:TOGGLE'));
    }
    const classicModeBtn = rootElement.querySelector('#volt-mode-btn');
    if (classicModeBtn) {
      classicModeBtn.addEventListener('click', () => this.toggleMode());
    }

    // Classic Close Explorer panel
    const classicCloseExp = rootElement.querySelector('#volt-classic-explorer-close');
    classicCloseExp?.addEventListener('click', () => this.bus.publish('EXPLORER:TOGGLE'));

    // Classic toggle button click handler
    const classicToggleBtn = rootElement.querySelector('#volt-explorer-toggle-btn');
    classicToggleBtn?.addEventListener('click', () => this.bus.publish('EXPLORER:TOGGLE'));

    // 2. Desktop Mode Init
    const desktopWindowsContainer = rootElement.querySelector(
      '#volt-desktop-windows-container'
    ) as HTMLElement;
    const winMgr = WindowManager.getInstance();
    winMgr.setContainer(desktopWindowsContainer);

    // Bind Desktop App Icons Double Click
    rootElement.querySelectorAll('.desktop-icon').forEach(icon => {
      icon.addEventListener('dblclick', () => {
        const appName = icon.getAttribute('data-app') || '';
        this.launchApp(appName);
      });
    });

    // Mode Switch Button click
    const modeBtn = rootElement.querySelector('.tray-mode-btn') as HTMLButtonElement;
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        this.toggleMode();
      });
    }

    // Start Menu Panel logic
    const startBtn = rootElement.querySelector('.start-menu-btn') as HTMLButtonElement;
    const startMenu = rootElement.querySelector('.start-menu-panel') as HTMLElement;
    if (startBtn && startMenu) {
      startBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isVisible = startMenu.style.display === 'flex';
        startMenu.style.display = isVisible ? 'none' : 'flex';
      });
    }

    document.addEventListener('click', e => {
      if (startMenu && !startMenu.contains(e.target as Node) && e.target !== startBtn) {
        startMenu.style.display = 'none';
      }
    });

    // Start Menu App Items click
    rootElement.querySelectorAll('.start-menu-app-item').forEach(item => {
      item.addEventListener('click', () => {
        const appName = item.getAttribute('data-app') || '';
        this.launchApp(appName);
        if (startMenu) startMenu.style.display = 'none';
      });
    });

    // Start Menu Search filter
    const startSearch = rootElement.querySelector('.start-menu-search-input') as HTMLInputElement;
    if (startSearch) {
      startSearch.addEventListener('input', () => {
        const keyword = startSearch.value.toLowerCase();
        rootElement.querySelectorAll('.start-menu-app-item').forEach(item => {
          const text = (item as HTMLElement).innerText.toLowerCase();
          (item as HTMLElement).style.display = text.includes(keyword) ? 'flex' : 'none';
        });
      });
    }

    // Start Menu Restart button
    rootElement.querySelector('.btn-restart')?.addEventListener('click', () => {
      window.location.reload();
    });

    // Start Menu Shutdown button
    rootElement.querySelector('.btn-shutdown')?.addEventListener('click', () => {
      this.triggerShutdownAnimation(rootElement);
    });

    // Live Ticking Clock and Date in Tray
    const clockEl = rootElement.querySelector('.tray-time') as HTMLElement;
    const dateEl = rootElement.querySelector('.tray-date') as HTMLElement;
    setInterval(() => {
      const now = new Date();
      if (clockEl) clockEl.innerText = now.toLocaleTimeString();
      if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }, 1000);

    // Watch for custom accent and background updates
    this.bus.subscribe('THEME:WALLPAPER_CHANGED', e => {
      const payload = e.payload as any;
      const wp = payload?.wallpaper;
      const wsEl = rootElement.querySelector('#volt-desktop-workspace') as HTMLElement;
      if (wsEl) {
        if (wp === 'custom' || payload?.customDataUrl) {
          const dataUrl = payload?.customDataUrl || localStorage.getItem('volt_custom_wallpaper_data') || '';
          wsEl.className = 'wp-custom';
          wsEl.style.setProperty('background', `url("${dataUrl}") no-repeat center center / cover`, 'important');
        } else {
          wsEl.style.removeProperty('background'); // Clear custom background
          wsEl.className = `wp-${wp}`;
        }
      }
    });

    // Notification System Toast subscription
    this.bus.subscribe('NOTIFICATION:ADD', e => {
      const text = (e.payload as any)?.text || '';
      const type = (e.payload as any)?.type || 'info';
      this.showNotificationToast(rootElement, text, type);
    });

    // Watch for window active and state updates to sync Taskbar strip
    const updateTaskbar = () => {
      const strip = rootElement.querySelector('.taskbar-tabs-container') as HTMLElement;
      if (!strip) return;

      strip.innerHTML = '';
      const openWins = winMgr.getWindows();
      openWins.forEach(win => {
        const tab = document.createElement('button');
        tab.className = `taskbar-tab ${win.zIndex === (winMgr as any).topZIndex ? 'active' : ''}`;
        tab.innerHTML = `<span>${win.icon || '⚙️'}</span><span>${win.title}</span>`;
        tab.addEventListener('click', () => {
          if (win.minimized) {
            winMgr.minimizeWindow(win.id);
          } else if (win.zIndex !== (winMgr as any).topZIndex) {
            winMgr.focusWindow(win.id);
          } else {
            winMgr.minimizeWindow(win.id);
          }
          updateTaskbar();
        });
        strip.appendChild(tab);
      });
    };

    this.bus.subscribe('LAYOUT:WINDOW_OPENED', updateTaskbar);
    this.bus.subscribe('LAYOUT:WINDOW_CLOSED', updateTaskbar);
    this.bus.subscribe('LAYOUT:WINDOW_MINIMIZED', updateTaskbar);
    this.bus.subscribe('LAYOUT:WINDOW_FOCUSED', updateTaskbar);

    // global drag & drop file upload on desktop mode
    rootElement.addEventListener('dragover', e => e.preventDefault());
    rootElement.addEventListener('drop', async e => {
      e.preventDefault();
      const paths = await this.fileTransfer.handleDropEvent(e, this.vfs.getCWD());
      if (paths.length > 0) {
        this.bus.publish('NOTIFICATION:ADD', {
          text: `Uploaded ${paths.length} file(s) into current directory!`,
          type: 'success'
        });
        this.bus.publish('EXEC:STDOUT_CHUNK', { text: 
          `[File Upload] Successfully uploaded ${paths.length} file(s) into ${this.vfs.getCWD()}:\n  ${paths.map(p => p.split('\\').pop()).join('\n  ')}\n`
         });
      }
    });

    // Trigger Command Palette search modal (Ctrl + Shift + P)
    const paletteOverlay = rootElement.querySelector('.command-palette-overlay') as HTMLElement;
    const paletteInput = rootElement.querySelector('.command-palette-input') as HTMLInputElement;

    this.bus.subscribe('CMD:PALETTE_TOGGLE', () => {
      if (paletteOverlay && paletteInput) {
        const isVisible = paletteOverlay.style.display === 'flex';
        if (isVisible) {
          paletteOverlay.style.display = 'none';
        } else {
          paletteOverlay.style.display = 'flex';
          paletteInput.value = '';
          this.renderPaletteItems(rootElement, '');
          setTimeout(() => paletteInput.focus(), 50);
        }
      }
    });

    this.bus.subscribe('APP:LAUNCH', event => {
      if (event.payload) {
        const { appName, customOptions } = event.payload as any;
        this.launchApp(appName, customOptions || {});
      }
    });

    if (paletteInput) {
      paletteInput.addEventListener('input', () => {
        this.renderPaletteItems(rootElement, paletteInput.value);
      });
    }

    // Close palette on outer click
    if (paletteOverlay) {
      paletteOverlay.addEventListener('mousedown', e => {
        if (e.target === paletteOverlay) {
          this.bus.publish('CMD:PALETTE_TOGGLE');
        }
      });
    }

    // Set custom accent color if saved
    const activeColor = localStorage.getItem('volt_accent_color') || '#0f6';
    document.documentElement.style.setProperty('--volt-prompt', activeColor);

    // Render wallpaper if saved
    const activeWP = localStorage.getItem('volt_desktop_wallpaper') || 'deep-space';
    const wsEl = rootElement.querySelector('#volt-desktop-workspace') as HTMLElement;
    if (wsEl) {
      if (activeWP === 'custom') {
        const dataUrl = localStorage.getItem('volt_custom_wallpaper_data') || '';
        wsEl.className = 'wp-custom';
        wsEl.style.setProperty('background', `url("${dataUrl}") no-repeat center center / cover`, 'important');
      } else {
        wsEl.style.removeProperty('background');
        wsEl.className = `wp-${activeWP}`;
      }
    }

    // Set Mode according to previous settings
    this.updateLayoutMode();

    // Welcome user by launching CMD Console and User Guide on desktop boot!
    setTimeout(() => {
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      const halfWidth = Math.max(300, Math.floor(screenWidth / 2) - 30);
      const windowHeight = Math.max(200, screenHeight - 120);

      // Help on the left, Terminal on the right, matching in vertical position and height!
      this.launchApp('help', {
        position: { x: 20, y: 40 },
        size: { width: halfWidth, height: windowHeight }
      });
      this.launchApp('terminal', {
        position: { x: halfWidth + 40, y: 40 },
        size: { width: halfWidth, height: windowHeight }
      });
    }, 1200);

    this.layout.setEditorOpen(false);
  }

  private launchApp(appName: string, customOptions: any = {}) {
    const winMgr = WindowManager.getInstance();
    switch (appName) {
      case 'terminal':
        winMgr.openApp('terminal', 'Terminal', { ...this.appTerminal.getWindowOptions(), ...customOptions });
        break;
      case 'editor':
        winMgr.openApp('editor', 'Code Editor', { ...this.appEditor.getWindowOptions(), ...customOptions });
        break;
      case 'explorer':
        winMgr.openApp('explorer', 'File Explorer', { ...this.appExplorer.getWindowOptions(), ...customOptions });
        break;
      case 'browser':
        winMgr.openApp('browser', 'Web Browser', { ...this.appBrowser.getWindowOptions(), ...customOptions });
        break;
      case 'database':
        winMgr.openApp('database', 'SQLite Database', { ...this.appDatabase.getWindowOptions(), ...customOptions });
        break;
      case 'git':
        winMgr.openApp('git', 'Git VC', { ...this.appGit.getWindowOptions(), ...customOptions });
        break;
      case 'task-manager':
        winMgr.openApp('task-manager', 'Task Manager', { ...this.appTaskManager.getWindowOptions(), ...customOptions });
        break;
      case 'settings':
        winMgr.openApp('settings', 'Settings', { ...this.appSettings.getWindowOptions(), ...customOptions });
        break;
      case 'help':
        winMgr.openApp('help', 'User Guide', { ...this.appHelp.getWindowOptions(), ...customOptions });
        break;
    }
  }

  private toggleMode() {
    this.activeMode = this.activeMode === 'desktop' ? 'classic' : 'desktop';
    this.updateLayoutMode();
  }

  private updateLayoutMode() {
    const classic = document.getElementById('volt-classic-workspace');
    const desktop = document.getElementById('volt-desktop-workspace');
    const modeBtn = document.querySelector('.tray-mode-btn') as HTMLButtonElement;

    if (classic && desktop) {
      if (this.activeMode === 'classic') {
        classic.style.display = 'flex';
        desktop.style.display = 'none';
        if (modeBtn) modeBtn.innerText = '🖥️ Desktop OS';
      } else {
        classic.style.display = 'none';
        desktop.style.display = 'flex';
        if (modeBtn) modeBtn.innerText = '💻 Classic IDE';
      }
    }
  }

  private showNotificationToast(
    root: HTMLElement,
    text: string,
    type: 'info' | 'success' | 'error'
  ) {
    const container = root.querySelector('#volt-notifications-container') as HTMLElement;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'notification-toast';

    let icon = 'ℹ️';
    let borderColor = 'var(--volt-prompt)';
    if (type === 'success') {
      icon = '✅';
      borderColor = '#22c55e';
    } else if (type === 'error') {
      icon = '❌';
      borderColor = '#ef4444';
    }

    toast.style.borderLeftColor = borderColor;
    toast.innerHTML = `
      <div style="display:flex; gap: 8px; align-items:center;">
        <span>${icon}</span>
        <span style="font-weight:bold;">${text}</span>
      </div>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 3500);
  }

  private renderPaletteItems(root: HTMLElement, query: string) {
    const list = root.querySelector('.command-palette-list') as HTMLElement;
    if (!list) return;

    list.innerHTML = '';
    const items = [
      { text: 'Open Terminal', action: () => this.launchApp('terminal') },
      { text: 'Open Code Editor', action: () => this.launchApp('editor') },
      { text: 'Open File Explorer', action: () => this.launchApp('explorer') },
      { text: 'Open SQLite Database', action: () => this.launchApp('database') },
      { text: 'Open Web Browser & API Tester', action: () => this.launchApp('browser') },
      { text: 'Open Task Manager', action: () => this.launchApp('task-manager') },
      { text: 'Open Settings', action: () => this.launchApp('settings') },
      { text: 'Export VFS Workspace JSON', action: () => this.bus.publish('SETTINGS:TOGGLE') },
      {
        text: 'Switch System Theme (Toggle Theme)',
        action: () => this.bus.publish('SETTINGS:TOGGLE')
      },
      { text: 'Classic Mode / Desktop Mode Toggle', action: () => this.toggleMode() },
      { text: 'Restart / Reload Volt', action: () => window.location.reload() },
      {
        text: 'Shutdown Volt (Shutdown Animation)',
        action: () => this.triggerShutdownAnimation(root)
      }
    ];

    const filtered = items.filter(it => it.text.toLowerCase().includes(query.toLowerCase()));

    filtered.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `command-palette-item ${idx === 0 ? 'selected' : ''}`;
      row.innerText = item.text;
      row.addEventListener('click', () => {
        item.action();
        this.bus.publish('CMD:PALETTE_TOGGLE');
      });
      list.appendChild(row);
    });

    if (filtered.length === 0) {
      list.innerHTML = `<div style="padding:10px; opacity:0.4; text-align:center; font-size:12px;">No matching command palette items found.</div>`;
    }
  }

  private triggerShutdownAnimation(root: HTMLElement) {
    const shutdownOverlay = document.createElement('div');
    shutdownOverlay.style.position = 'fixed';
    shutdownOverlay.style.top = '0';
    shutdownOverlay.style.left = '0';
    shutdownOverlay.style.width = '100vw';
    shutdownOverlay.style.height = '100vh';
    shutdownOverlay.style.backgroundColor = '#000';
    shutdownOverlay.style.color = '#fff';
    shutdownOverlay.style.zIndex = '10000000';
    shutdownOverlay.style.fontFamily = 'Consolas, monospace';
    shutdownOverlay.style.display = 'flex';
    shutdownOverlay.style.flexDirection = 'column';
    shutdownOverlay.style.alignItems = 'center';
    shutdownOverlay.style.justifyContent = 'center';
    shutdownOverlay.style.gap = '20px';

    shutdownOverlay.innerHTML = `
      <div style="font-size: 28px; font-weight:bold; letter-spacing:4px;" class="shutdown-text">Volt is shutting down...</div>
      <div style="font-size:12px; opacity:0.5;">Saving virtual persistent registers...</div>
    `;

    root.appendChild(shutdownOverlay);

    // Animated fade-out
    setTimeout(() => {
      const txt = shutdownOverlay.querySelector('.shutdown-text') as HTMLElement;
      if (txt) txt.innerText = 'Safe to turn off your computer.';
    }, 1800);
  }

  // DEPRECATED — use LayoutState instead
  public updateLayoutSplit(hasActiveEditor: boolean): void {
    this.layout.setEditorOpen(hasActiveEditor);
  }
}
