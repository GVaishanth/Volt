import { VoltBus } from '@core/VoltBus';
import { SYSTEM_CONSTANTS } from '@core/Constants';

export interface ISystemSettings {
  theme: (typeof SYSTEM_CONSTANTS.SUPPORTED_THEMES)[number];
  fontSizePx: number;
  autoSaveDelayMs: number | null;
  wordWrap: boolean;
}

export interface ISettingsModule {
  getSettings(): ISystemSettings;
  updateSetting<K extends keyof ISystemSettings>(key: K, value: ISystemSettings[K]): Promise<void>;
  resetToDefault(): Promise<void>;
}

const SETTINGS_STORAGE_KEY = 'volt_system_settings_v1';

export class SettingsModule implements ISettingsModule {
  private bus: VoltBus;
  private settings: ISystemSettings = {
    theme: 'Pure Black (Volt Default)',
    fontSizePx: 14,
    autoSaveDelayMs: 2000,
    wordWrap: false
  };

  constructor() {
    this.bus = VoltBus.getInstance();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...this.settings, ...parsed };
        }
      }
    } catch {
      // Fallback to defaults if localStorage is restricted
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // Ignore storage write errors in restricted sandboxes
    }
  }

  public getSettings(): ISystemSettings {
    return { ...this.settings };
  }

  public async updateSetting<K extends keyof ISystemSettings>(
    key: K,
    value: ISystemSettings[K]
  ): Promise<void> {
    this.settings[key] = value;
    this.saveToStorage();
    this.bus.publish('SETTINGS:UPDATED', { key, value, settings: this.getSettings() });
    if (key === 'theme') {
      this.bus.publish('THEME:CHANGED', { theme: value });
    }
  }

  public async resetToDefault(): Promise<void> {
    this.settings = {
      theme: 'Pure Black (Volt Default)',
      fontSizePx: 14,
      autoSaveDelayMs: 2000,
      wordWrap: false
    };
    this.saveToStorage();
    this.bus.publish('SETTINGS:UPDATED', { settings: this.getSettings() });
    this.bus.publish('THEME:CHANGED', { theme: this.settings.theme });
  }
}
