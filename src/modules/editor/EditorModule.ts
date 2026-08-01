import { VoltBus } from '@core/VoltBus';
import { IEditorBuffer } from '@types';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { LayoutState } from '@modules/shell/LayoutState';

export interface IEditorModule {
  mount(container: HTMLElement): void;
  openBuffer(path: string, initialContent: string, language: string): void;
  closeBuffer(path: string): void;
  switchBuffer(path: string): void;
  saveActiveBuffer(): Promise<boolean>;
  jumpToPosition(line: number, column: number): void;
  getActiveBuffer(): IEditorBuffer | null;
}

export class EditorModule implements IEditorModule {
  private bus: VoltBus;
  private buffers: Map<string, IEditorBuffer> = new Map();
  private activePath: string | null = null;
  private container?: HTMLElement;
  private textarea?: HTMLTextAreaElement;
  private lineNumbers?: HTMLElement;
  private vfs?: VFSModule;
  private autoSaveTimer: any = null;

  constructor(vfs?: VFSModule) {
    this.bus = VoltBus.getInstance();
    this.vfs = vfs;

    this.bus.subscribe('NAV:SMART_ERROR_JUMP', event => {
      if (event.payload) {
        const { file, line, column } = event.payload as any;
        if (file) {
          // If buffer is already open, jump or request open
          const fullPath = this.resolvePathToBuffer(file);
          if (fullPath && this.buffers.has(fullPath)) {
            this.switchBuffer(fullPath);
            this.jumpToPosition(line || 1, column || 1);
          } else if (this.vfs) {
            void (async () => {
              try {
                const text = await this.vfs!.readFileAsText(file);
                const lang = this.inferLanguage(file);
                this.openBuffer(file, text, lang);
                this.jumpToPosition(line || 1, column || 1);
              } catch {
                // Ignore if not found
              }
            })();
          }
        }
      }
    });
  }

  private resolvePathToBuffer(fileNameOrPath: string): string | null {
    const norm = fileNameOrPath.toLowerCase();
    for (const [key] of this.buffers.entries()) {
      if (key.toLowerCase().endsWith(norm)) {
        return key;
      }
    }
    return null;
  }

  private inferLanguage(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.c')) return 'C';
    if (
      lower.endsWith('.cpp') ||
      lower.endsWith('.cc') ||
      lower.endsWith('.h') ||
      lower.endsWith('.hpp')
    )
      return 'C++';
    if (lower.endsWith('.py')) return 'Python';
    if (lower.endsWith('.java')) return 'Java';
    if (lower.endsWith('.md')) return 'Markdown';
    return 'Text';
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = `
      <div class="volt-editor-wrapper">
        <div id="volt-editor-linenumbers" class="volt-editor-linenumbers">1</div>
        <textarea id="volt-editor-textarea" class="volt-editor-textarea" spellcheck="false" wrap="off"></textarea>
      </div>
    `;

    this.textarea = this.container.querySelector('#volt-editor-textarea') as HTMLTextAreaElement;
    this.lineNumbers = this.container.querySelector('#volt-editor-linenumbers') as HTMLElement;

    if (this.textarea) {
      this.textarea.addEventListener('input', () => {
        if (!this.activePath) return;
        const buf = this.buffers.get(this.activePath);
        if (buf) {
          buf.content = this.textarea!.value;
          buf.isDirty = true;
          this.updateLineNumbers();
          this.bus.publish('EDITOR:BUFFER_DIRTY', { path: this.activePath });
          this.scheduleAutoSave();
        }
      });

      this.textarea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          void this.saveActiveBuffer();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const start = this.textarea!.selectionStart;
          const end = this.textarea!.selectionEnd;
          this.textarea!.value =
            this.textarea!.value.substring(0, start) + '    ' + this.textarea!.value.substring(end);
          this.textarea!.selectionStart = this.textarea!.selectionEnd = start + 4;
          this.textarea!.dispatchEvent(new Event('input'));
        } else if (
          e.key === 'Backspace' &&
          this.textarea!.selectionStart === this.textarea!.selectionEnd
        ) {
          const start = this.textarea!.selectionStart;
          const prev4 = this.textarea!.value.substring(start - 4, start);
          if (prev4 === '    ') {
            e.preventDefault();
            this.textarea!.value =
              this.textarea!.value.substring(0, start - 4) + this.textarea!.value.substring(start);
            this.textarea!.selectionStart = this.textarea!.selectionEnd = start - 4;
            this.textarea!.dispatchEvent(new Event('input'));
          }
        }
      });

      this.textarea.addEventListener('click', () => this.updateCursorPosition());
      this.textarea.addEventListener('keyup', () => this.updateCursorPosition());
    }
  }

  private updateLineNumbers(): void {
    if (!this.textarea || !this.lineNumbers) return;
    const linesCount = this.textarea.value.split('\n').length;
    let numbersHtml = '';
    for (let i = 1; i <= Math.max(1, linesCount); i++) {
      numbersHtml += `<div>${i}</div>`;
    }
    this.lineNumbers.innerHTML = numbersHtml;
  }

  private updateCursorPosition(): void {
    if (!this.textarea || !this.activePath) return;
    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    const buf = this.buffers.get(this.activePath);
    if (buf) {
      buf.cursor = { line, column: col };
    }
    this.bus.publish('EDITOR:CURSOR_MOVE', { path: this.activePath, line, column: col });
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      void this.saveActiveBuffer();
    }, 2000);
  }

  public openBuffer(path: string, initialContent: string, language: string): void {
    let buf = this.buffers.get(path);
    if (!buf) {
      buf = {
        path,
        content: initialContent,
        language,
        isDirty: false,
        cursor: { line: 1, column: 1 }
      };
      this.buffers.set(path, buf);
    }
    this.switchBuffer(path);
    this.bus.publish('EDITOR:OPEN', { path, language, content: initialContent });

    // Use single source of truth
    const layout = LayoutState.getInstance();
    layout.setEditorOpen(true);
  }

  public switchBuffer(path: string): void {
    const buf = this.buffers.get(path);
    if (!buf || !this.textarea) return;
    this.activePath = path;
    this.textarea.value = buf.content;
    this.updateLineNumbers();
    this.updateCursorPosition();
    this.bus.publish('EXEC:STATUS_UPDATE', { status: 'Ready', language: buf.language });
  }

  public closeBuffer(path: string): void {
    if (this.buffers.has(path)) {
      this.buffers.delete(path);
    }
    if (this.activePath === path) {
      const remaining = Array.from(this.buffers.keys());
      if (remaining.length > 0) {
        this.switchBuffer(remaining[remaining.length - 1]);
      } else {
        this.activePath = null;
        if (this.textarea) this.textarea.value = '';
        if (this.lineNumbers) this.lineNumbers.innerHTML = '<div>1</div>';
      }
    }
    this.bus.publish('EDITOR:CLOSE', { path });
  }

  public async saveActiveBuffer(): Promise<boolean> {
    if (!this.activePath) return false;
    const buf = this.buffers.get(this.activePath);
    if (!buf) return false;

    if (this.vfs) {
      await this.vfs.writeFile(this.activePath, buf.content);
    }
    buf.isDirty = false;
    this.bus.publish('EDITOR:BUFFER_CLEAN', { path: this.activePath });
    return true;
  }

  public jumpToPosition(line: number, column: number): void {
    if (!this.textarea || !this.lineNumbers) return;
    const lines = this.textarea.value.split('\n');
    let targetPos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      targetPos += lines[i].length + 1;
    }
    targetPos += Math.min(column - 1, (lines[line - 1] || '').length);

    this.textarea.focus();
    this.textarea.setSelectionRange(targetPos, targetPos);

    // Scroll textarea and line numbers
    const lineHeight = 20; // approximate row height in pixels
    const scrollDelta = Math.max(0, (line - 3) * lineHeight);
    this.textarea.scrollTop = scrollDelta;
    this.lineNumbers.scrollTop = scrollDelta;

    // Highlight line inside line numbers
    const lineEls = this.lineNumbers.children;
    if (lineEls[line - 1]) {
      const el = lineEls[line - 1] as HTMLElement;
      el.classList.add('volt-line-error-flash');
      setTimeout(() => el.classList.remove('volt-line-error-flash'), 2500);
    }

    this.updateCursorPosition();
  }

  public getActiveBuffer(): IEditorBuffer | null {
    if (!this.activePath) return null;
    return this.buffers.get(this.activePath) || null;
  }
}
