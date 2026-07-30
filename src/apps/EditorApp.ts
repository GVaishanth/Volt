import { EditorModule } from '@modules/editor/EditorModule';
import { TabManagerModule } from '@modules/shell/TabManagerModule';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { OSWindow } from '@core/WindowManager';
export class EditorApp {
  private editorModule: EditorModule;
  private tabManager: TabManagerModule;

  constructor(vfs: VFSModule) {
    this.editorModule = new EditorModule(vfs);
    this.tabManager = new TabManagerModule();
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '📝',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = 'var(--reos-editor-bg)';

        body.innerHTML = `
          <div class="editor-app-tab-bar" style="height: 34px; background: var(--reos-editor-bg); border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center;"></div>
          <div class="editor-app-monaco-container" style="flex: 1; overflow: hidden; position: relative;"></div>
        `;

        const tabContainer = body.querySelector('.editor-app-tab-bar') as HTMLElement;
        const monacoContainer = body.querySelector('.editor-app-monaco-container') as HTMLElement;

        this.tabManager.mount(tabContainer);
        this.editorModule.mount(monacoContainer);

        // Adjust css inside app
        const wrapper = monacoContainer.querySelector('.reos-editor-wrapper') as HTMLElement;
        if (wrapper) {
          wrapper.style.height = '100%';
          wrapper.style.width = '100%';
        }

        const textarea = monacoContainer.querySelector(
          '#reos-editor-textarea'
        ) as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = '100%';
          textarea.focus();
        }

        // Keep buffer sync on click
        body.addEventListener('click', () => {
          if (textarea) textarea.focus();
        });
      }
    };
  }

  public getEditorModule(): EditorModule {
    return this.editorModule;
  }
}
