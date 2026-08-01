import { VoltBus } from '@core/VoltBus';
import { SettingsModule, ISystemSettings } from './SettingsModule';
import { SYSTEM_CONSTANTS } from '@core/Constants';

export interface ISettingsOverlayModule {
  mount(container: HTMLElement): void;
  toggleOverlay(): void;
  closeOverlay(): void;
}

export class SettingsOverlayModule implements ISettingsOverlayModule {
  private bus: VoltBus;
  private settingsModule: SettingsModule;
  private container?: HTMLElement;
  private isOpen: boolean = false;

  constructor(settingsModule: SettingsModule) {
    this.bus = VoltBus.getInstance();
    this.settingsModule = settingsModule;

    this.bus.subscribe('SETTINGS:TOGGLE', () => {
      this.toggleOverlay();
    });

    this.bus.subscribe('SETTINGS:UPDATED', () => {
      if (this.isOpen) {
        this.renderForm();
      }
    });
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = `
      <div id="volt-settings-modal" class="volt-settings-modal hidden">
        <div class="volt-settings-card">
          <div class="volt-settings-header">
            <span>Volt SYSTEM SETTINGS</span>
            <button id="volt-settings-close-btn" class="volt-settings-close-btn">&times;</button>
          </div>
          <div id="volt-settings-body" class="volt-settings-body"></div>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('#volt-settings-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeOverlay());
    }

    const modal = this.container.querySelector('#volt-settings-modal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) this.closeOverlay();
      });
    }
  }

  public toggleOverlay(): void {
    if (this.isOpen) {
      this.closeOverlay();
    } else {
      this.openOverlay();
    }
  }

  public openOverlay(): void {
    if (!this.container) return;
    const modal = this.container.querySelector('#volt-settings-modal') as HTMLElement;
    if (modal) {
      modal.classList.remove('hidden');
      this.isOpen = true;
      this.renderForm();
    }
  }

  public closeOverlay(): void {
    if (!this.container) return;
    const modal = this.container.querySelector('#volt-settings-modal') as HTMLElement;
    if (modal) {
      modal.classList.add('hidden');
      this.isOpen = false;
    }
  }

  private renderForm(): void {
    if (!this.container) return;
    const body = this.container.querySelector('#volt-settings-body') as HTMLElement;
    if (!body) return;

    const current: ISystemSettings = this.settingsModule.getSettings();

    let themeOptions = '';
    for (const t of SYSTEM_CONSTANTS.SUPPORTED_THEMES) {
      themeOptions += `<option value="${t}" ${t === current.theme ? 'selected' : ''}>${t}</option>`;
    }

    let fontSizeOptions = '';
    for (const sz of [12, 13, 14, 15, 16, 18, 20, 22, 24]) {
      fontSizeOptions += `<option value="${sz}" ${sz === current.fontSizePx ? 'selected' : ''}>${sz}px</option>`;
    }

    body.innerHTML = `
      <div class="volt-settings-section">
        <label class="volt-settings-label" for="setting-theme">System Theme (70% CMD / 20% Editor)</label>
        <select id="setting-theme" class="volt-settings-select">${themeOptions}</select>
      </div>

      <div class="volt-settings-section">
        <label class="volt-settings-label" for="setting-font">Monospaced Font Size</label>
        <select id="setting-font" class="volt-settings-select">${fontSizeOptions}</select>
      </div>

      <div class="volt-settings-section">
        <label class="volt-settings-label" for="setting-autosave">Auto Save Buffer</label>
        <select id="setting-autosave" class="volt-settings-select">
          <option value="2000" ${current.autoSaveDelayMs === 2000 ? 'selected' : ''}>Enabled (2 seconds delay)</option>
          <option value="5000" ${current.autoSaveDelayMs === 5000 ? 'selected' : ''}>Enabled (5 seconds delay)</option>
          <option value="0" ${!current.autoSaveDelayMs ? 'selected' : ''}>Disabled (Manual Ctrl+S only)</option>
        </select>
      </div>

      <div class="volt-settings-section">
        <label class="volt-settings-label">
          <input type="checkbox" id="setting-wordwrap" ${current.wordWrap ? 'checked' : ''} />
          Word Wrap in Modal Code Editor (20% VS Code Layer)
        </label>
      </div>

      <div class="volt-settings-actions">
        <button id="setting-reset-btn" class="volt-settings-reset-btn">Clear All Data</button>
      </div>

      <div class="volt-settings-about">
        <strong>Volt v1.0.0 — Local-First Environment</strong>
        <p>100% Client-Side WebAssembly & Web Worker execution. Zero cloud compilation, zero backend telemetry. Inspired by Windows CMD (70%), VS Code modal editor (20%), and Chrome tabs (10%).</p>
      </div>
    `;

    const themeSelect = body.querySelector('#setting-theme') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        void this.settingsModule.updateSetting('theme', themeSelect.value as any);
      });
    }

    const fontSelect = body.querySelector('#setting-font') as HTMLSelectElement;
    if (fontSelect) {
      fontSelect.addEventListener('change', () => {
        const val = parseInt(fontSelect.value, 10) || 14;
        void this.settingsModule.updateSetting('fontSizePx', val);
        document.documentElement.style.setProperty('--volt-font-size', `${val}px`);
      });
    }

    const autoSaveSelect = body.querySelector('#setting-autosave') as HTMLSelectElement;
    if (autoSaveSelect) {
      autoSaveSelect.addEventListener('change', () => {
        const val = parseInt(autoSaveSelect.value, 10);
        void this.settingsModule.updateSetting('autoSaveDelayMs', val > 0 ? val : null);
      });
    }

    const wordWrapCheckbox = body.querySelector('#setting-wordwrap') as HTMLInputElement;
    if (wordWrapCheckbox) {
      wordWrapCheckbox.addEventListener('change', () => {
        void this.settingsModule.updateSetting('wordWrap', wordWrapCheckbox.checked);
        const textarea = document.getElementById('volt-editor-textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.wrap = wordWrapCheckbox.checked ? 'soft' : 'off';
        }
      });
    }

    const resetBtn = body.querySelector('#setting-reset-btn') as HTMLButtonElement;
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data and restart?')) {
          localStorage.clear();
          if (typeof indexedDB !== 'undefined') {
            indexedDB.deleteDatabase('volt_vfs_db_v1');
          }
          this.bus.publish('NOTIFICATION:ADD', { text: 'Systems wiped. Rebooting...', type: 'info' });
          setTimeout(() => window.location.reload(), 1200);
        }
      });
    }
  }
}
