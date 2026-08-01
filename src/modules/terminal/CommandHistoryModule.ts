export interface ICommandHistoryModule {
  push(command: string): void;
  cyclePrevious(): string | null;
  cycleNext(): string | null;
  searchReverse(prefix: string): string[];
}

const HISTORY_STORAGE_KEY = 'volt_terminal_history_v1';

export class CommandHistoryModule implements ICommandHistoryModule {
  private history: string[] = [];
  private cursor: number = -1;

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.history = parsed;
            this.cursor = this.history.length;
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  private saveHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history.slice(-500))); // Keep last 500 commands
      }
    } catch {
      // Ignore errors
    }
  }

  public push(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;
    if (this.history.length > 0 && this.history[this.history.length - 1] === trimmed) {
      this.cursor = this.history.length;
      return;
    }
    this.history.push(trimmed);
    this.cursor = this.history.length;
    this.saveHistory();
  }

  public cyclePrevious(): string | null {
    if (this.history.length === 0) return null;
    if (this.cursor > 0) {
      this.cursor--;
    }
    return this.history[this.cursor] || null;
  }

  public cycleNext(): string | null {
    if (this.history.length === 0) return null;
    if (this.cursor < this.history.length) {
      this.cursor++;
    }
    if (this.cursor >= this.history.length) {
      return '';
    }
    return this.history[this.cursor] || null;
  }

  public searchReverse(prefix: string): string[] {
    if (!prefix) return [];
    const lower = prefix.toLowerCase();
    return this.history
      .slice()
      .reverse()
      .filter(cmd => cmd.toLowerCase().includes(lower));
  }
}
