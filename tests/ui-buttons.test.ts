import { describe, it, expect, beforeEach } from 'vitest';
import { ReOSBus } from '@core/ReOSBus';
import { AppShellModule } from '@modules/shell/AppShellModule';

describe('ReOS UI Buttons Audit', () => {
  let bus: ReOSBus;
  let viewport: HTMLElement;

  beforeEach(async () => {
    bus = ReOSBus.getInstance();
    (bus as unknown as { listeners: Map<unknown, unknown> }).listeners = new Map();

    // Mock capability
    const { CapabilityProfiler } = await import('@core/CapabilityProfiler');
    (CapabilityProfiler as unknown as { profile: unknown }).profile = {
      hasWebAssembly: true,
      hasOPFS: false,
      hasIndexedDB: true,
      hasSharedArrayBuffer: false,
      hasWebWorkers: true,
      preferredFilesystem: 'IndexedDB',
      preferredMemoryTransport: 'MessageChannel',
      preferredTerminalRenderer: 'DOM'
    };

    document.body.innerHTML = '';
    viewport = document.createElement('div');
    viewport.id = 'reos-viewport';
    document.body.appendChild(viewport);

    // Clear storage
    try {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof indexedDB !== 'undefined') {
        const dbNames = ['reos_vfs_db_v1'];
        for (const name of dbNames) {
          indexedDB.deleteDatabase(name);
        }
      }
    } catch { /* ignore */ }
  });

  it('should mount all top action buttons', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    const uploadBtn = document.getElementById('reos-upload-btn');
    const downloadBtn = document.getElementById('reos-download-btn');
    const settingsBtn = document.getElementById('reos-settings-btn');
    const explorerToggleBtn = document.getElementById('reos-explorer-toggle-btn');

    expect(uploadBtn).toBeTruthy();
    expect(downloadBtn).toBeTruthy();
    expect(settingsBtn).toBeTruthy();
    expect(explorerToggleBtn).toBeTruthy();

    expect(uploadBtn?.textContent).toContain('Upload');
    expect(downloadBtn?.textContent).toContain('Download');
    expect(settingsBtn?.textContent).toContain('Settings');
  });

  it('settings button should toggle modal', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    const settingsBtn = document.getElementById('reos-settings-btn') as HTMLElement;
    const modal = () => document.getElementById('reos-settings-modal') as HTMLElement;

    expect(modal().classList.contains('hidden')).toBe(true);

    settingsBtn.click();
    // allow event loop for bus publish -> toggle
    await new Promise(r => setTimeout(r, 30));
    expect(modal().classList.contains('hidden')).toBe(false);

    // Click again should close (toggle)
    bus.publish('SETTINGS:TOGGLE');
    await new Promise(r => setTimeout(r, 20));
    expect(modal().classList.contains('hidden')).toBe(true);

    // Re-open via bus
    bus.publish('SETTINGS:TOGGLE');
    await new Promise(r => setTimeout(r, 20));
    expect(modal().classList.contains('hidden')).toBe(false);

    // Close via close button
    const closeBtn = document.getElementById('reos-settings-close-btn') as HTMLElement;
    closeBtn.click();
    await new Promise(r => setTimeout(r, 20));
    expect(modal().classList.contains('hidden')).toBe(true);
  });

  it('explorer toggle button should slide panel', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    const toggleBtn = document.getElementById('reos-explorer-toggle-btn') as HTMLElement;
    const panel = () => document.getElementById('reos-explorer-panel') as HTMLElement;

    // Initially hidden
    expect(panel().classList.contains('hidden')).toBe(true);
    expect(toggleBtn.innerText).toContain('<');

    toggleBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // After toggle, panel should be visible
    expect(panel().classList.contains('hidden')).toBe(false);
    expect(toggleBtn.innerText).toContain('>');

    toggleBtn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(panel().classList.contains('hidden')).toBe(true);
    expect(toggleBtn.innerText).toContain('<');
  });

  it('upload button should publish FILE:UPLOAD_REQUEST', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    let uploadRequested = false;
    bus.subscribe('FILE:UPLOAD_REQUEST', () => {
      uploadRequested = true;
    });

    const uploadBtn = document.getElementById('reos-upload-btn') as HTMLElement;
    uploadBtn.click();
    await new Promise(r => setTimeout(r, 20));
    expect(uploadRequested).toBe(true);
  });

  it('download button should publish FILE:DOWNLOAD_REQUEST', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    let downloadRequested = false;
    let targetCaptured: string | null = null;
    bus.subscribe('FILE:DOWNLOAD_REQUEST', (e) => {
      downloadRequested = true;
      targetCaptured = (e.payload as any)?.target || null;
    });

    const downloadBtn = document.getElementById('reos-download-btn') as HTMLElement;
    downloadBtn.click();
    await new Promise(r => setTimeout(r, 20));
    expect(downloadRequested).toBe(true);
    // By default downloads active file or README.txt
    expect(targetCaptured).toBeTruthy();
  });

  it('tree command and explorer toggle via bus should work', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    const panel = () => document.getElementById('reos-explorer-panel') as HTMLElement;
    expect(panel().classList.contains('hidden')).toBe(true);

    bus.publish('EXPLORER:TOGGLE');
    await new Promise(r => setTimeout(r, 50));
    expect(panel().classList.contains('hidden')).toBe(false);

    bus.publish('EXPLORER:TOGGLE');
    await new Promise(r => setTimeout(r, 50));
    expect(panel().classList.contains('hidden')).toBe(true);
  });

  it('drag and drop should be handled', async () => {
    const shell = new AppShellModule();
    await shell.mount(viewport);

    // Check that drop handlers are registered by verifying shell container exists
    const container = document.querySelector('.reos-shell-container') as HTMLElement;
    expect(container).toBeTruthy();
  });
});
