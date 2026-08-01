import { VoltBus } from '@core/VoltBus';
import { IWorkspaceTab } from '@types';

export interface ITabManagerModule {
  mount(container: HTMLElement): void;
  openTab(path: string, label: string): void;
  closeTab(tabIdOrPath: string): void;
  switchTab(tabIdOrPath: string): void;
  markDirty(tabIdOrPath: string, isDirty: boolean): void;
  getTabsCount(): number;
}

export class TabManagerModule implements ITabManagerModule {
  private bus: VoltBus;
  private tabs: Map<string, IWorkspaceTab> = new Map();
  private activePath: string | null = null;
  private container?: HTMLElement;

  constructor() {
    this.bus = VoltBus.getInstance();

    this.bus.subscribe('EDITOR:OPEN', event => {
      if (event.payload) {
        const { path } = event.payload as any;
        if (path) {
          const label = path.split('\\').pop() || path;
          this.openTab(path, label);
        }
      }
    });

    this.bus.subscribe('EDITOR:CLOSE', event => {
      if (event.payload) {
        const { path } = event.payload as any;
        if (path) this.closeTab(path);
      }
    });

    this.bus.subscribe('EDITOR:BUFFER_DIRTY', event => {
      if (event.payload) {
        const { path } = event.payload as any;
        if (path) this.markDirty(path, true);
      }
    });

    this.bus.subscribe('EDITOR:BUFFER_CLEAN', event => {
      if (event.payload) {
        const { path } = event.payload as any;
        if (path) this.markDirty(path, false);
      }
    });
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.render();

    // Keyboard tab cycling
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
          e.preventDefault();
          this.cycleTabs(!e.shiftKey);
        }
      });
    }
  }

  public getTabsCount(): number {
    return this.tabs.size;
  }

  public openTab(path: string, label: string): void {
    const key = path.toLowerCase();
    if (!this.tabs.has(key)) {
      this.tabs.set(key, {
        id: key,
        path,
        label,
        isDirty: false,
        isActive: false
      });
    }
    this.switchTab(path);
  }

  public switchTab(tabIdOrPath: string): void {
    const key = tabIdOrPath.toLowerCase();
    const tab = this.tabs.get(key);
    if (!tab) return;

    for (const t of this.tabs.values()) {
      t.isActive = t.id === key;
    }
    this.activePath = tab.path;
    this.render();
    this.bus.publish('TAB:SWITCH', { path: tab.path });
  }

  public closeTab(tabIdOrPath: string): void {
    const key = tabIdOrPath.toLowerCase();
    const tab = this.tabs.get(key);
    if (!tab) return;

    this.tabs.delete(key);
    if (this.activePath && this.activePath.toLowerCase() === key) {
      const remaining = Array.from(this.tabs.values());
      if (remaining.length > 0) {
        this.switchTab(remaining[remaining.length - 1].path);
      } else {
        this.activePath = null;
        this.bus.publish('TAB:SWITCH', { path: null });
      }
    }
    this.render();
    this.bus.publish('TAB:CLOSE', { path: tab.path });
  }

  public markDirty(tabIdOrPath: string, isDirty: boolean): void {
    const key = tabIdOrPath.toLowerCase();
    const tab = this.tabs.get(key);
    if (!tab) return;

    tab.isDirty = isDirty;
    this.render();
  }

  private cycleTabs(forward: boolean): void {
    const tabList = Array.from(this.tabs.values());
    if (tabList.length <= 1) return;

    const idx = tabList.findIndex(t => t.path === this.activePath);
    if (idx === -1) return;

    const nextIdx = forward
      ? (idx + 1) % tabList.length
      : (idx - 1 + tabList.length) % tabList.length;
    this.switchTab(tabList[nextIdx].path);
  }

  private render(): void {
    if (!this.container) return;
    if (this.tabs.size === 0) {
      this.container.innerHTML = `<div class="volt-tab-bar-empty">No Editor Files Open (Terminal Full Workspace Mode)</div>`;
      return;
    }

    let html = `<div class="volt-tabs-strip">`;
    for (const tab of this.tabs.values()) {
      const dirtyBullet = tab.isDirty ? ' <span class="volt-tab-dirty-dot">&bull;</span>' : '';
      html += `
        <div class="volt-tab-item ${tab.isActive ? 'active' : ''}" data-path="${tab.path}">
          <span class="volt-tab-label">${tab.label}${dirtyBullet}</span>
          <span class="volt-tab-close" data-path="${tab.path}">&times;</span>
        </div>
      `;
    }
    html += `</div>`;
    this.container.innerHTML = html;

    const items = this.container.querySelectorAll('.volt-tab-item');
    items.forEach(item => {
      item.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const path = item.getAttribute('data-path');
        if (!path) return;

        if (target && target.classList.contains('volt-tab-close')) {
          e.stopPropagation();
          this.bus.publish('EDITOR:CLOSE', { path });
          return;
        }
        this.switchBufferAndTab(path);
      });
    });
  }

  private switchBufferAndTab(path: string): void {
    this.switchTab(path);
    // Notify editor to switch buffer without creating infinite loop
    const key = path.toLowerCase();
    const tab = this.tabs.get(key);
    if (tab) {
      this.bus.publish('EDITOR:OPEN_REQUEST', { targetPath: tab.path });
    }
  }
}
