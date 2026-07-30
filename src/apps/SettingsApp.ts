import { OSWindow } from '@core/WindowManager';
import { ReOSBus } from '@core/ReOSBus';
import { SettingsModule } from '@modules/config/SettingsModule';

export class SettingsApp {
  private bus = ReOSBus.getInstance();
  private settingsModule: SettingsModule;

  constructor(settingsModule: SettingsModule) {
    this.settingsModule = settingsModule;
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '⚙️',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = 'var(--reos-status-bg)';
        body.style.color = 'var(--reos-fg)';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderSettings(body);
      }
    };
  }

  private renderSettings(body: HTMLElement) {
    const s = this.settingsModule.getSettings();

    body.innerHTML = `
      <div style="flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
        <div style="font-weight: bold; font-size: 14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px; color:#ffa500;">⚙️ SYSTEM CUSTOMIZATION</div>

        <!-- 1. Theme -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-weight: bold; opacity:0.85; font-size:12px;">System Theme</label>
          <select class="setting-theme" style="padding: 6px 8px; background: var(--reos-bg); color: inherit; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 4px; font-family: inherit;">
            <option value="Pure Black (Re\`OS Default)" ${s.theme.includes('Pure Black') ? 'selected' : ''}>Pure Black (Re\`OS Default)</option>
            <option value="Classic CMD" ${s.theme.includes('Classic CMD') ? 'selected' : ''}>Classic CMD</option>
            <option value="VS Code Dark+" ${s.theme.includes('VS Code') ? 'selected' : ''}>VS Code Dark+</option>
            <option value="Matrix" ${s.theme.includes('Matrix') ? 'selected' : ''}>Matrix</option>
            <option value="Light" ${s.theme.includes('Light') ? 'selected' : ''}>Light</option>
          </select>
        </div>

        <!-- 2. Font Size -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-weight: bold; opacity:0.85; font-size:12px;">Monospaced Editor Font Size</label>
          <select class="setting-font" style="padding: 6px 8px; background: var(--reos-bg); color: inherit; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 4px; font-family: inherit;">
            ${[12, 13, 14, 15, 16, 18, 20, 22].map(size => `<option value="${size}" ${s.fontSizePx === size ? 'selected' : ''}>${size}px</option>`).join('')}
          </select>
        </div>

        <!-- 3. Desktop Wallpaper -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-weight: bold; opacity:0.85; font-size:12px;">Desktop Wallpaper Style</label>
          <select class="setting-wallpaper" style="padding: 6px 8px; background: var(--reos-bg); color: inherit; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 4px; font-family: inherit;">
            <option value="deep-space">🌌 Deep Space Gradient</option>
            <option value="aurora">💚 Northern Aurora</option>
            <option value="retro-windows">💙 Classic Teal Desktop</option>
            <option value="dark-matrix">🖤 Matrix Grid</option>
          </select>
        </div>

        <!-- 4. Accent Color -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-weight: bold; opacity:0.85; font-size:12px;">System Accent Color</label>
          <div style="display:flex; gap:8px;" class="accent-color-palette">
            <div class="accent-color-dot" data-color="#0f6" style="width:24px; height:24px; border-radius:50%; background:#0f6; cursor:pointer; border:2px solid transparent;"></div>
            <div class="accent-color-dot" data-color="#3b82f6" style="width:24px; height:24px; border-radius:50%; background:#3b82f6; cursor:pointer; border:2px solid transparent;"></div>
            <div class="accent-color-dot" data-color="#ec4899" style="width:24px; height:24px; border-radius:50%; background:#ec4899; cursor:pointer; border:2px solid transparent;"></div>
            <div class="accent-color-dot" data-color="#eab308" style="width:24px; height:24px; border-radius:50%; background:#eab308; cursor:pointer; border:2px solid transparent;"></div>
            <div class="accent-color-dot" data-color="#a855f7" style="width:24px; height:24px; border-radius:50%; background:#a855f7; cursor:pointer; border:2px solid transparent;"></div>
          </div>
        </div>

        <!-- 5. Reset Workspace -->
        <div style="margin-top: 14px; border-top:1px solid rgba(255,255,255,0.08); padding-top:14px;">
          <button class="setting-reset-btn" style="padding: 8px 16px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 4px; cursor: pointer; font-family: inherit; font-weight: bold;">Reset All Systems to Factory Defaults</button>
        </div>

        <div style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); font-size: 11px; line-height: 1.5; opacity: 0.8;">
          <strong>Re\`OS v2.0.0 — Modern Desktop Architecture</strong>
          <p>Local-first, zero-cloud environment with resizable windows, virtual process scheduler, SQLite editor, offline Git engine, and live visual HTML previews.</p>
        </div>
      </div>
    `;

    // Bind theme selector
    const themeSelect = body.querySelector('.setting-theme') as HTMLSelectElement;
    themeSelect.addEventListener('change', () => {
      this.settingsModule.updateSetting('theme', themeSelect.value as any);
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Theme changed to: ${themeSelect.value}`,
        type: 'success'
      });
    });

    // Bind font size selector
    const fontSelect = body.querySelector('.setting-font') as HTMLSelectElement;
    fontSelect.addEventListener('change', () => {
      const size = parseInt(fontSelect.value, 10);
      this.settingsModule.updateSetting('fontSizePx', size);
      document.documentElement.style.setProperty('--reos-font-size', `${size}px`);
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Font size updated to ${size}px`,
        type: 'info'
      });
    });

    // Bind wallpaper selector
    const wpSelect = body.querySelector('.setting-wallpaper') as HTMLSelectElement;
    const currentWP = localStorage.getItem('reos_desktop_wallpaper') || 'deep-space';
    wpSelect.value = currentWP;
    wpSelect.addEventListener('change', () => {
      const selected = wpSelect.value;
      localStorage.setItem('reos_desktop_wallpaper', selected);
      this.bus.publish('THEME:WALLPAPER_CHANGED', { wallpaper: selected });
      this.bus.publish('NOTIFICATION:ADD', {
        text: 'Desktop background updated!',
        type: 'success'
      });
    });

    // Bind accent color palette
    const activeColor = localStorage.getItem('reos_accent_color') || '#0f6';
    body.querySelectorAll('.accent-color-dot').forEach(el => {
      const color = el.getAttribute('data-color') || '';
      if (color === activeColor) {
        (el as HTMLElement).style.borderColor = '#fff';
      }
      el.addEventListener('click', () => {
        body
          .querySelectorAll('.accent-color-dot')
          .forEach(d => ((d as HTMLElement).style.borderColor = 'transparent'));
        (el as HTMLElement).style.borderColor = '#fff';
        localStorage.setItem('reos_accent_color', color);
        document.documentElement.style.setProperty('--reos-prompt', color);
        this.bus.publish('NOTIFICATION:ADD', { text: 'System accents updated!', type: 'info' });
      });
    });

    // Reset button
    const resetBtn = body.querySelector('.setting-reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      if (
        confirm(
          'Warning: This will permanently wipe all local files, databases, and preferences. Are you sure?'
        )
      ) {
        localStorage.clear();
        if (typeof indexedDB !== 'undefined') {
          indexedDB.deleteDatabase('reos_vfs_db_v1');
        }
        this.bus.publish('NOTIFICATION:ADD', { text: 'Systems wiped. Rebooting...', type: 'info' });
        setTimeout(() => window.location.reload(), 1500);
      }
    });
  }
}
