import { VoltBus } from '@core/VoltBus';
import { StorageAdapterModule } from '@modules/filesystem/StorageAdapterModule';

export interface IStatusBarTelemetry {
  status: 'Ready' | 'Running...' | 'Compiling...';
  language: string;
  cursor: { line: number; column: number };
  indentation: string;
  encoding: string;
  storageReport: string;
}

export interface IStatusBarModule {
  mount(container: HTMLElement): void;
  updateTelemetry(telemetry: Partial<IStatusBarTelemetry>): void;
  refreshStorageEstimate(): Promise<void>;
}

export class StatusBarModule implements IStatusBarModule {
  private bus: VoltBus;
  private storageAdapter: StorageAdapterModule;
  private container?: HTMLElement;
  private telemetry: IStatusBarTelemetry = {
    status: 'Ready',
    language: 'C++',
    cursor: { line: 1, column: 1 },
    indentation: 'Spaces: 4',
    encoding: 'UTF-8',
    storageReport: '1.4 MB / 50.0 MB (OPFS)'
  };

  constructor() {
    this.bus = VoltBus.getInstance();
    this.storageAdapter = new StorageAdapterModule();

    this.bus.subscribe('EXEC:STATUS_UPDATE', event => {
      if (event.payload) {
        const { status, language } = event.payload as any;
        this.updateTelemetry({
          ...(status && { status }),
          ...(language && { language })
        });
      }
    });

    this.bus.subscribe('EDITOR:OPEN', event => {
      if (event.payload) {
        const { language } = event.payload as any;
        if (language) this.updateTelemetry({ language });
      }
    });

    this.bus.subscribe('EDITOR:CURSOR_MOVE', event => {
      if (event.payload) {
        const { line, column } = event.payload as any;
        if (typeof line === 'number' && typeof column === 'number') {
          this.updateTelemetry({ cursor: { line, column } });
        }
      }
    });

    this.bus.subscribe('VFS:FILE_CREATED', () => void this.refreshStorageEstimate());
    this.bus.subscribe('VFS:FILE_MODIFIED', () => void this.refreshStorageEstimate());
    this.bus.subscribe('VFS:FILE_DELETED', () => void this.refreshStorageEstimate());
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    void this.refreshStorageEstimate();
  }

  public updateTelemetry(telemetry: Partial<IStatusBarTelemetry>): void {
    this.telemetry = { ...this.telemetry, ...telemetry };
    this.render();
  }

  public async refreshStorageEstimate(): Promise<void> {
    const quota = await this.storageAdapter.getQuotaEstimate();
    const usedMb = (quota.usageBytes / (1024 * 1024)).toFixed(1);
    const quotaMb = (quota.quotaBytes / (1024 * 1024)).toFixed(1);
    const report = `${usedMb} MB / ${quotaMb} MB (${quota.adapterType})`;
    this.updateTelemetry({ storageReport: report });
  }

  private render(): void {
    if (!this.container) return;
    const { status, language, cursor, indentation, encoding, storageReport } = this.telemetry;
    this.container.innerHTML = `
      <div class="volt-status-item volt-status-status">
        <span class="volt-status-dot ${status === 'Ready' ? 'ready' : 'active'}"></span>
        <span>${status}</span>
      </div>
      <div class="volt-status-item">${language}</div>
      <div class="volt-status-item">Ln ${cursor.line}, Col ${cursor.column}</div>
      <div class="volt-status-item">${indentation}</div>
      <div class="volt-status-item">${encoding}</div>
      <div class="volt-status-item volt-status-storage" title="Browser Persistent Storage Quota">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="margin-right: 4px; vertical-align: -1px;"><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5H7.5L6 2H1.5z"/></svg>
        ${storageReport}
      </div>
    `;
  }
}
