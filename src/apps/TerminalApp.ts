import { TerminalEngineModule } from '@modules/terminal/TerminalEngineModule';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { OSWindow } from '@core/WindowManager';

export class TerminalApp {
  private terminalEngine: TerminalEngineModule;

  constructor(vfs: VFSModule) {
    this.terminalEngine = new TerminalEngineModule(vfs);
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '💻',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.backgroundColor = '#0c0c0c';
        body.style.color = '#cccccc';
        body.style.fontFamily = 'Consolas, monospace';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';

        this.terminalEngine.mount(body);

        // Custom styling for inside a window
        const wrapper = body.querySelector('.reos-terminal-wrapper') as HTMLElement;
        if (wrapper) {
          wrapper.style.height = '100%';
          wrapper.style.padding = '12px';
        }

        body.addEventListener('click', () => {
          this.terminalEngine.focus();
        });

        setTimeout(() => this.terminalEngine.focus(), 50);
      }
    };
  }
}
