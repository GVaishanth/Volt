import { VoltBus } from '@core/VoltBus';
import { ISmartErrorDiagnostic } from '@types';
import { CommandHistoryModule } from './CommandHistoryModule';
import { AutocompleteModule } from './AutocompleteModule';
import { VFSModule } from '@modules/filesystem/VFSModule';

export interface ITerminalEngineModule {
  mount(container: HTMLElement): void;
  renderWelcomeBanner(): void;
  renderPrompt(cwd: string): void;
  writeOutput(text: string): void;
  writeError(text: string): void;
  clearScrollback(): void;
  parseSmartErrorLinks(rawStderr: string): ISmartErrorDiagnostic[];
  setStdinMode(active: boolean, promptText?: string): void;
  focus(): void;
}

export class TerminalEngineModule implements ITerminalEngineModule {
  private bus: VoltBus;
  private history: CommandHistoryModule;
  private autocomplete: AutocompleteModule;
  private vfs?: VFSModule;
  private container?: HTMLElement;
  private outputElement?: HTMLElement;
  private inputElement?: HTMLInputElement;
  private promptPrefixElement?: HTMLElement;
  private cwd: string = 'C:\\Users\\Volt';
  private isWaitingForStdin: boolean = false;
  private outputQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private errorQueue: string[] = [];
  private isProcessingErrorQueue: boolean = false;
  private userHasScrolledUp: boolean = false;
  private isProgrammaticScroll: boolean = false;

  constructor(vfs?: VFSModule) {
    this.bus = VoltBus.getInstance();
    this.history = new CommandHistoryModule();
    this.autocomplete = new AutocompleteModule();
    this.vfs = vfs;

    this.bus.subscribe('CMD:CLEAR', () => {
      this.clearScrollback();
    });

    this.bus.subscribe('VFS:CWD_CHANGED', event => {
      if (event.payload && typeof (event.payload as any).cwd === 'string') {
        this.renderPrompt((event.payload as any).cwd);
      }
    });

    this.bus.subscribe('EXEC:STDOUT_CHUNK', event => {
      if (event.payload && typeof (event.payload as any).text === 'string') {
        this.writeOutput((event.payload as any).text);
      }
    });

    this.bus.subscribe('EXEC:STDERR_CHUNK', event => {
      if (event.payload && typeof (event.payload as any).text === 'string') {
        this.writeError((event.payload as any).text);
      }
    });

    this.bus.subscribe('EXEC:STDIN_REQUEST', event => {
      const payload = event.payload as any;
      const promptText = payload?.promptText || '? ';
      this.setStdinMode(true, promptText);
    });
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = `
      <div class="volt-terminal-wrapper">
        <div id="volt-terminal-output" class="volt-terminal-output"></div>
        <div class="volt-terminal-input-line">
          <span id="volt-prompt-prefix" class="volt-prompt-prefix">C:\\Users\\Volt&gt;&nbsp;</span>
          <input id="volt-terminal-input" class="volt-terminal-input" type="text" spellcheck="false" autocomplete="off" autofocus />
        </div>
      </div>
    `;

    this.outputElement = this.container.querySelector('#volt-terminal-output') as HTMLElement;
    this.promptPrefixElement = this.container.querySelector('#volt-prompt-prefix') as HTMLElement;
    this.inputElement = this.container.querySelector('#volt-terminal-input') as HTMLInputElement;

    const wrapper = this.container.querySelector('.volt-terminal-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.addEventListener('scroll', () => {
        if (this.isProgrammaticScroll) return;
        const threshold = 80;
        const isAtBottom = wrapper.scrollHeight - wrapper.scrollTop - wrapper.clientHeight < threshold;
        if (!isAtBottom) {
          this.userHasScrolledUp = true;
        } else {
          this.userHasScrolledUp = false;
        }
      });
    }

    this.bindEvents();
    this.renderWelcomeBanner();
  }

  private bindEvents(): void {
    if (!this.inputElement || !this.container) return;

    this.container.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('volt-error-link')) {
        const file = target.getAttribute('data-file');
        const line = parseInt(target.getAttribute('data-line') || '1', 10);
        const col = parseInt(target.getAttribute('data-col') || '1', 10);
        if (file) {
          this.bus.publish('NAV:SMART_ERROR_JUMP', { file, line, column: col });
        }
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        this.focus();
      }
    });

    this.inputElement.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = this.inputElement!.value;
        this.inputElement!.value = '';

        if (this.isWaitingForStdin) {
          this.writeOutput(`${value}\n`);
          this.setStdinMode(false);
          this.bus.publish('EXEC:STDIN_RESPONSE', { text: value });
        } else {
          const promptText = this.promptPrefixElement?.innerText || `${this.cwd}> `;
          this.writeOutput(`${promptText}${value}\n`);
          if (value.trim()) {
            this.history.push(value);
          }
          this.bus.publish('CMD:SUBMIT', { command: value, cwd: this.cwd });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = this.history.cyclePrevious();
        if (prev !== null) {
          this.inputElement!.value = prev;
          setTimeout(() => this.inputElement?.setSelectionRange(prev.length, prev.length), 0);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = this.history.cycleNext();
        if (next !== null) {
          this.inputElement!.value = next;
          setTimeout(() => this.inputElement?.setSelectionRange(next.length, next.length), 0);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentVal = this.inputElement!.value;
        const suggestions = await this.autocomplete.suggest(currentVal, this.cwd, this.vfs);
        if (suggestions.length === 1) {
          this.inputElement!.value = suggestions[0];
        } else if (suggestions.length > 1) {
          this.writeOutput(`${this.cwd}> ${currentVal}\n`);
          this.writeOutput(`Suggestions: ${suggestions.join('   ')}\n`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (this.isWaitingForStdin) {
          this.setStdinMode(false);
          this.writeOutput('^C\n');
          this.bus.publish('EXEC:INTERRUPT');
        } else {
          this.inputElement!.value = '';
          this.writeOutput(`${this.cwd}> ^C\n`);
          this.bus.publish('EXEC:INTERRUPT');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const query = prompt('Ctrl+R: Search command history prefix/substring:');
        if (query) {
          const matches = this.history.searchReverse(query);
          if (matches.length > 0) {
            this.inputElement!.value = matches[0];
          } else {
            this.writeOutput(`[History Search] No match found for '${query}'\n`);
          }
        }
      }
    });
  }

  public renderWelcomeBanner(): void {
    const banner = `VPU presents VOLT
Version 2.0.0
Browser: Chrome (Chromium) / Modern Web
Persistent Storage: 1.4 MB Used (OPFS)
Supported Languages: C, C++, Python, Java, JavaScript, Bash
Type help to begin.

`;
    this.writeOutput(banner);
    this.renderPrompt(this.cwd);
  }

  public renderPrompt(cwd: string): void {
    this.cwd = cwd;
    if (this.promptPrefixElement && !this.isWaitingForStdin) {
      this.promptPrefixElement.innerText = `${this.cwd}> `;
    }
  }

  public writeOutput(text: string): void {
    this.outputQueue.push(text);
    void this.processOutputQueue();
  }

  private async processOutputQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.outputElement) return;
    this.isProcessingQueue = true;

    while (this.outputQueue.length > 0) {
      const text = this.outputQueue.shift();
      if (!text) continue;

      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const span = document.createElement('span');
        this.outputElement.appendChild(span);

        // Split word-by-word inside each line
        const tokens = line.split(/(\s+)/).filter(Boolean);
        const delay = text.length > 200 ? 1 : 12;

        for (const token of tokens) {
          span.innerText += token;
          this.scrollToBottom();
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (i < lines.length - 1) {
          const br = document.createElement('br');
          this.outputElement.appendChild(br);
          this.scrollToBottom();
        }
      }
    }

    this.isProcessingQueue = false;
  }

  public writeError(text: string): void {
    this.errorQueue.push(text);
    void this.processErrorQueue();
  }

  private async processErrorQueue(): Promise<void> {
    if (this.isProcessingErrorQueue || !this.outputElement) return;
    this.isProcessingErrorQueue = true;

    while (this.errorQueue.length > 0) {
      const text = this.errorQueue.shift();
      if (!text) continue;

      const diagnostics = this.parseSmartErrorLinks(text);
      if (diagnostics.length === 0) {
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const span = document.createElement('span');
          span.className = 'volt-terminal-error';
          this.outputElement.appendChild(span);

          const tokens = line.split(/(\s+)/).filter(Boolean);
          const delay = text.length > 200 ? 1 : 12;

          for (const token of tokens) {
            span.innerText += token;
            this.scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          if (i < lines.length - 1) {
            const br = document.createElement('br');
            this.outputElement.appendChild(br);
            this.scrollToBottom();
          }
        }
      } else {
        // Direct append for clickable compiler diagnostics to maintain accuracy and prevent broken link-ranges during stream
        const containerSpan = document.createElement('span');
        containerSpan.className = 'volt-terminal-error';
        const lines = text.split('\n');
        for (const line of lines) {
          const match = line.match(/^([a-zA-Z0-9_.\-\\]+):(\d+):(\d+):/);
          if (match) {
            const file = match[1];
            const lineNum = match[2];
            const colNum = match[3];
            const link = document.createElement('span');
            link.className = 'volt-error-link';
            link.setAttribute('data-file', file);
            link.setAttribute('data-line', lineNum);
            link.setAttribute('data-col', colNum);
            link.innerText = `${file}:${lineNum}:${colNum}`;

            containerSpan.appendChild(link);
            const rest = document.createElement('span');
            rest.innerText = line.substring(match[0].length) + '\n';
            containerSpan.appendChild(rest);
          } else {
            const normal = document.createElement('span');
            normal.innerText = line + '\n';
            containerSpan.appendChild(normal);
          }
        }
        this.outputElement.appendChild(containerSpan);
        this.scrollToBottom(true);
      }
    }

    this.isProcessingErrorQueue = false;
  }

  public clearScrollback(): void {
    if (this.outputElement) {
      this.outputElement.innerHTML = '';
    }
    this.renderPrompt(this.cwd);
    this.focus();
  }

  public parseSmartErrorLinks(rawStderr: string): ISmartErrorDiagnostic[] {
    const results: ISmartErrorDiagnostic[] = [];
    const lines = rawStderr.split('\n');
    const regex = /^([a-zA-Z0-9_.\-\\]+):(\d+):(\d+):\s*(error|warning):\s*(.*)/i;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          message: match[5],
          rawText: line
        });
      }
    }
    return results;
  }

  public setStdinMode(active: boolean, promptText?: string): void {
    this.isWaitingForStdin = active;
    if (this.promptPrefixElement) {
      if (active) {
        this.promptPrefixElement.innerText = promptText || '? ';
      } else {
        this.promptPrefixElement.innerText = `${this.cwd}> `;
      }
    }
    if (active) {
      this.focus();
    }
  }

  public focus(): void {
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  private scrollToBottom(force: boolean = false): void {
    if (this.container) {
      const wrapper = this.container.querySelector('.volt-terminal-wrapper') as HTMLElement;
      if (wrapper) {
        const threshold = 80;
        const isNearBottom = wrapper.scrollHeight - wrapper.scrollTop - wrapper.clientHeight < threshold;
        if (isNearBottom || force || wrapper.scrollTop === 0) {
          if (!this.userHasScrolledUp || force) {
            this.isProgrammaticScroll = true;
            wrapper.scrollTop = wrapper.scrollHeight;
            setTimeout(() => {
              this.isProgrammaticScroll = false;
            }, 30);
          }
        }
      }
    }
  }
}
