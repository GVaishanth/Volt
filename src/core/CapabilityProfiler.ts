export interface IBrowserCapabilityProfile {
  hasWebAssembly: boolean;
  hasOPFS: boolean;
  hasIndexedDB: boolean;
  hasSharedArrayBuffer: boolean;
  hasWebWorkers: boolean;
  preferredFilesystem: 'OPFS' | 'IndexedDB';
  preferredMemoryTransport: 'SharedArrayBuffer' | 'MessageChannel';
  preferredTerminalRenderer: 'Canvas' | 'DOM';
}

export class CapabilityProfiler {
  private static profile: IBrowserCapabilityProfile | null = null;

  public static async detectCapabilities(): Promise<IBrowserCapabilityProfile> {
    if (this.profile) {
      return this.profile;
    }

    const hasWebAssembly =
      typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
    const hasWebWorkers = typeof Worker !== 'undefined';
    const hasSharedArrayBuffer =
      typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined';
    const hasIndexedDB = typeof indexedDB !== 'undefined';

    let hasOPFS = false;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.getDirectory === 'function'
      ) {
        // Some hosted/sandboxed contexts can leave this promise pending indefinitely.
        // OPFS is only a capability hint here (Volt persists through IndexedDB), so a
        // short probe is sufficient and must never block the entire application boot.
        const probe = navigator.storage.getDirectory();
        const result = await Promise.race([
          probe.then(() => true).catch(() => false),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 750))
        ]);
        hasOPFS = result;
      }
    } catch {
      hasOPFS = false;
    }

    let preferredTerminalRenderer: 'Canvas' | 'DOM' = 'DOM';
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        if (canvas.getContext('2d')) {
          preferredTerminalRenderer = 'Canvas';
        }
      }
    } catch {
      preferredTerminalRenderer = 'DOM';
    }

    this.profile = {
      hasWebAssembly,
      hasOPFS,
      hasIndexedDB,
      hasSharedArrayBuffer,
      hasWebWorkers,
      preferredFilesystem: hasOPFS ? 'OPFS' : 'IndexedDB',
      preferredMemoryTransport: hasSharedArrayBuffer ? 'SharedArrayBuffer' : 'MessageChannel',
      preferredTerminalRenderer
    };

    return this.profile;
  }

  public static getProfile(): IBrowserCapabilityProfile | null {
    return this.profile;
  }
}
