import { VoltBus } from './VoltBus';

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  icon?: string;
  singleInstance?: boolean;
  onMount?: (windowBody: HTMLElement, win: OSWindow) => void;
  onClose?: () => void;
}

export class WindowManager {
  private static instance: WindowManager;
  private bus = VoltBus.getInstance();
  private windows: Map<string, OSWindow> = new Map();
  private container?: HTMLElement;
  private topZIndex = 100;
  private shortcutsRegistered = false;

  private constructor() {
    this.registerShortcuts();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public setContainer(container: HTMLElement): void {
    this.container = container;
  }

  public getWindows(): OSWindow[] {
    return Array.from(this.windows.values());
  }

  public getWindow(id: string): OSWindow | undefined {
    return this.windows.get(id);
  }

  private registerShortcuts(): void {
    if (this.shortcutsRegistered || typeof window === 'undefined') return;
    this.shortcutsRegistered = true;

    let spacePressed = false;

    window.addEventListener('keydown', e => {
      // Helper to check if user is typing in a text field
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      // Track spacebar hold state
      if (e.code === 'Space') {
        if (!isTyping) {
          spacePressed = true;
          e.preventDefault(); // Prevent page scrolling
        }
        return;
      }

      // Space + key shortcuts
      if (spacePressed && !isTyping) {
        const key = e.key.toLowerCase();
        if (key === 'e') {
          e.preventDefault();
          this.bus.publish('APP:LAUNCH', { appName: 'explorer' });
        } else if (key === 't') {
          e.preventDefault();
          this.bus.publish('APP:LAUNCH', { appName: 'terminal' });
        } else if (key === 'r') {
          e.preventDefault();
          this.bus.publish('APP:LAUNCH', { appName: 'help' });
        } else if (key === 'd') {
          e.preventDefault();
          this.toggleShowDesktop();
        } else if (key === 'p') {
          e.preventDefault();
          this.openCommandPalette();
        }
      }

      // Keep standard fallback modifier hotkeys
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.bus.publish('APP:LAUNCH', { appName: 'terminal' });
      }
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        this.openCommandPalette();
      }
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        spacePressed = false;
      }
    });

    // Reset modifier state when window loses focus to prevent stuck keys
    window.addEventListener('blur', () => {
      spacePressed = false;
    });
  }

  public openApp(appId: string, title: string, options: Partial<OSWindow> = {}): OSWindow {
    // If singleInstance and already open, focus it
    if (options.singleInstance ?? true) {
      const existing = Array.from(this.windows.values()).find(w => w.appId === appId);
      if (existing) {
        if (existing.minimized) {
          this.minimizeWindow(existing.id);
        }
        this.focusWindow(existing.id);
        return existing;
      }
    }

    const id = `win-${appId}-${Math.random().toString(36).substring(2, 9)}`;
    const x = 50 + ((this.windows.size * 25) % 200);
    const y = 50 + ((this.windows.size * 25) % 200);

    const win: OSWindow = {
      id,
      appId,
      title,
      position: { x, y },
      size: { width: 680, height: 450 },
      minimized: false,
      maximized: false,
      zIndex: ++this.topZIndex,
      singleInstance: true,
      ...options
    };

    this.windows.set(id, win);
    this.renderWindow(win);
    this.bus.publish('LAYOUT:WINDOW_OPENED', { windowId: id, appId });
    return win;
  }

  public closeWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    if (win.onClose) {
      try {
        win.onClose();
      } catch (err) {
        console.error(err);
      }
    }

    const el = document.getElementById(id);
    if (el) el.remove();

    this.windows.delete(id);
    this.bus.publish('LAYOUT:WINDOW_CLOSED', { windowId: id });
  }

  public minimizeWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.minimized = !win.minimized;
    const el = document.getElementById(id);
    if (el) {
      if (win.minimized) {
        el.classList.add('minimized');
        el.style.display = 'none';
      } else {
        el.classList.remove('minimized');
        el.style.display = 'flex';
        this.focusWindow(id);
      }
    }
    this.bus.publish('LAYOUT:WINDOW_MINIMIZED', { windowId: id, minimized: win.minimized });
  }

  public maximizeWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.maximized = !win.maximized;
    const el = document.getElementById(id);
    if (el) {
      if (win.maximized) {
        el.classList.add('maximized');
        el.style.top = '0px';
        el.style.left = '0px';
        el.style.width = '100%';
        el.style.height = 'calc(100vh - 40px)'; // leave room for taskbar
      } else {
        el.classList.remove('maximized');
        el.style.top = `${win.position.y}px`;
        el.style.left = `${win.position.x}px`;
        el.style.width = `${win.size.width}px`;
        el.style.height = `${win.size.height}px`;
      }
    }
    this.bus.publish('LAYOUT:WINDOW_MAXIMIZED', { windowId: id, maximized: win.maximized });
  }

  public focusWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.zIndex = ++this.topZIndex;
    const el = document.getElementById(id);
    if (el) {
      el.style.zIndex = String(win.zIndex);
      // add active class and remove from others
      document.querySelectorAll('.os-window').forEach(w => w.classList.remove('active'));
      el.classList.add('active');
    }
    this.bus.publish('LAYOUT:WINDOW_FOCUSED', { windowId: id });
  }

  private toggleShowDesktop(): void {
    const allMin = Array.from(this.windows.values()).every(w => w.minimized);
    for (const win of this.windows.values()) {
      if (allMin) {
        // Restore all
        if (win.minimized) this.minimizeWindow(win.id);
      } else {
        // Minimize all
        if (!win.minimized) this.minimizeWindow(win.id);
      }
    }
  }

  private openCommandPalette(): void {
    this.bus.publish('CMD:PALETTE_TOGGLE');
  }

  private renderWindow(win: OSWindow): void {
    if (!this.container) return;

    const el = document.createElement('div');
    el.id = win.id;
    el.className = 'os-window';
    el.style.position = 'absolute';
    el.style.left = `${win.position.x}px`;
    el.style.top = `${win.position.y}px`;
    el.style.width = `${win.size.width}px`;
    el.style.height = `${win.size.height}px`;
    el.style.zIndex = String(win.zIndex);
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    el.innerHTML = `
      <div class="os-window-header">
        <div class="os-window-title">
          <span class="os-window-icon">${win.icon || '⚙️'}</span>
          <span class="os-window-title-text">${win.title}</span>
        </div>
        <div class="os-window-actions">
          <button class="os-window-btn btn-min" title="Minimize">_</button>
          <button class="os-window-btn btn-max" title="Maximize">🗖</button>
          <button class="os-window-btn btn-close" title="Close">×</button>
        </div>
      </div>
      <div class="os-window-body"></div>
      <div class="os-window-resize-handle"></div>
    `;

    this.container.appendChild(el);

    const body = el.querySelector('.os-window-body') as HTMLElement;
    if (win.onMount && body) {
      win.onMount(body, win);
    }

    // Bind Window Header Action Click Events
    el.querySelector('.btn-min')?.addEventListener('click', e => {
      e.stopPropagation();
      this.minimizeWindow(win.id);
    });
    el.querySelector('.btn-max')?.addEventListener('click', e => {
      e.stopPropagation();
      this.maximizeWindow(win.id);
    });
    el.querySelector('.btn-close')?.addEventListener('click', e => {
      e.stopPropagation();
      this.closeWindow(win.id);
    });

    el.addEventListener('mousedown', () => {
      this.focusWindow(win.id);
    });

    // Make window Draggable
    const header = el.querySelector('.os-window-header') as HTMLElement;
    let isDragging = false;
    let startX = 0,
      startY = 0;
    let winX = win.position.x,
      winY = win.position.y;

    const disableIframes = () => {
      document.querySelectorAll('iframe').forEach(iframe => {
        iframe.style.pointerEvents = 'none';
      });
    };

    const enableIframes = () => {
      document.querySelectorAll('iframe').forEach(iframe => {
        iframe.style.pointerEvents = 'auto';
      });
    };

    header.addEventListener('mousedown', e => {
      if (win.maximized) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      winX = win.position.x;
      winY = win.position.y;
      this.focusWindow(win.id);
      disableIframes();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newX = winX + dx;
      let newY = winY + dy;

      // Restrict top boundary so it doesn't disappear under menu
      if (newY < 0) newY = 0;

      el.style.left = `${newX}px`;
      el.style.top = `${newY}px`;
      win.position.x = newX;
      win.position.y = newY;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        isDragging = false;
        enableIframes();
        // Snap feature
        if (e.clientX < 40) {
          // Snap Left
          el.style.left = '0px';
          el.style.top = '0px';
          el.style.width = '50%';
          el.style.height = 'calc(100vh - 40px)';
          win.maximized = false; // pseudo maximized
        } else if (e.clientX > window.innerWidth - 40) {
          // Snap Right
          el.style.left = '50%';
          el.style.top = '0px';
          el.style.width = '50%';
          el.style.height = 'calc(100vh - 40px)';
          win.maximized = false; // pseudo maximized
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    };

    // Make window Resizable
    const handle = el.querySelector('.os-window-resize-handle') as HTMLElement;
    let isResizing = false;
    let startW = 0,
      startH = 0;

    handle?.addEventListener('mousedown', e => {
      if (win.maximized) return;
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = win.size.width;
      startH = win.size.height;
      this.focusWindow(win.id);
      disableIframes();
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
      e.preventDefault();
    });

    const onResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newW = Math.max(300, startW + dx);
      const newH = Math.max(200, startH + dy);

      el.style.width = `${newW}px`;
      el.style.height = `${newH}px`;
      win.size.width = newW;
      win.size.height = newH;
    };

    const onResizeUp = () => {
      if (isResizing) {
        isResizing = false;
        enableIframes();
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
      }
    };
  }
}
