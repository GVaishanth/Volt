export interface IStorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  adapterType: 'OPFS' | 'IndexedDB' | 'Memory / File://';
}

export interface IStorageAdapterModule {
  init(): Promise<boolean>;
  readSyncWorkerHandle(path: string): Promise<FileSystemSyncAccessHandle | null>;
  getQuotaEstimate(): Promise<IStorageQuotaInfo>;
  saveVFSState(
    files: Map<string, { content: string; createdAt: number; modifiedAt: number }>
  ): Promise<void>;
  loadVFSState(): Promise<Map<
    string,
    { content: string; createdAt: number; modifiedAt: number }
  > | null>;
}

const IDB_DB_NAME = 'volt_vfs_db_v1';
const IDB_STORE_NAME = 'files_store';
const LOCAL_STORAGE_KEY = 'volt_vfs_file_storage_v1';

export class StorageAdapterModule implements IStorageAdapterModule {
  private hasOPFS: boolean = false;
  private rootDir: FileSystemDirectoryHandle | null = null;
  private isFileProtocol: boolean = false;

  public async init(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      this.isFileProtocol = true;
      this.hasOPFS = false;
      return true;
    }

    // Prioritize IndexedDB on HTTPS to guarantee 100% cross-browser compatibility
    // and prevent main-thread OPFS createWritable SecurityErrors in Safari, Firefox, and strict sandboxed environments
    this.hasOPFS = false;
    this.rootDir = null;
    return true;
  }

  public async readSyncWorkerHandle(path: string): Promise<FileSystemSyncAccessHandle | null> {
    if (this.isFileProtocol || !this.hasOPFS || !this.rootDir) return null;
    try {
      const parts = path
        .replace(/^[a-zA-Z]:\\\\?/, '')
        .split(/\\\\|\//)
        .filter(Boolean);
      let currDir = this.rootDir;
      for (let i = 0; i < parts.length - 1; i++) {
        currDir = await currDir.getDirectoryHandle(parts[i], { create: true });
      }
      const fileHandle = await currDir.getFileHandle(parts[parts.length - 1], { create: true });
      if (typeof (fileHandle as any).createSyncAccessHandle === 'function') {
        return await (fileHandle as any).createSyncAccessHandle();
      }
    } catch {
      // Sync access handles might only work in dedicated Web Workers
    }
    return null;
  }

  public async getQuotaEstimate(): Promise<IStorageQuotaInfo> {
    if (this.isFileProtocol) {
      return { usageBytes: 1400000, quotaBytes: 52428800, adapterType: 'Memory / File://' };
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.estimate === 'function'
      ) {
        const estimate = await navigator.storage.estimate();
        return {
          usageBytes: estimate.usage || 1400000,
          quotaBytes: estimate.quota || 52428800,
          adapterType: this.hasOPFS ? 'OPFS' : 'IndexedDB'
        };
      }
    } catch {
      // Ignore errors
    }
    return {
      usageBytes: 1400000,
      quotaBytes: 52428800,
      adapterType: this.hasOPFS ? 'OPFS' : 'IndexedDB'
    };
  }

  public async saveVFSState(
    files: Map<string, { content: string; createdAt: number; modifiedAt: number }>
  ): Promise<void> {
    if (this.isFileProtocol) {
      this.saveToLocalStorage(files);
      return;
    }

    if (this.hasOPFS && this.rootDir) {
      try {
        for (const [path, data] of files.entries()) {
          const parts = path
            .replace(/^[a-zA-Z]:\\\\?/, '')
            .split(/\\\\|\//)
            .filter(Boolean);
          if (parts.length === 0) continue;
          let currDir = this.rootDir;
          for (let i = 0; i < parts.length - 1; i++) {
            currDir = await currDir.getDirectoryHandle(parts[i], { create: true });
          }
          const fileHandle = await currDir.getFileHandle(parts[parts.length - 1], { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(data.content);
          await writable.close();
        }
      } catch {
        await this.saveToIDB(files);
      }
    } else {
      await this.saveToIDB(files);
    }
  }

  private saveToLocalStorage(
    files: Map<string, { content: string; createdAt: number; modifiedAt: number }>
  ): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj: Record<string, any> = {};
        for (const [path, data] of files.entries()) {
          obj[path] = data;
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
      }
    } catch {
      // Ignore storage limit in file:// protocol
    }
  }

  private async saveToIDB(
    files: Map<string, { content: string; createdAt: number; modifiedAt: number }>
  ): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      this.saveToLocalStorage(files);
      return;
    }
    return new Promise(resolve => {
      try {
        const request = indexedDB.open(IDB_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME, { keyPath: 'path' });
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(IDB_STORE_NAME);
            store.clear();
            for (const [path, data] of files.entries()) {
              store.put({ path, ...data });
            }
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              this.saveToLocalStorage(files);
              resolve();
            };
          } catch {
            db.close();
            this.saveToLocalStorage(files);
            resolve();
          }
        };
        request.onerror = () => {
          this.saveToLocalStorage(files);
          resolve();
        };
      } catch {
        this.saveToLocalStorage(files);
        resolve();
      }
    });
  }

  public async loadVFSState(): Promise<Map<
    string,
    { content: string; createdAt: number; modifiedAt: number }
  > | null> {
    if (this.isFileProtocol) {
      return this.loadFromLocalStorage();
    }

    if (typeof indexedDB === 'undefined') {
      return this.loadFromLocalStorage();
    }
    return new Promise(resolve => {
      // Add a 1-second deadlock timeout to prevent boot hangs!
      const timer = setTimeout(() => {
        console.warn("IndexedDB load timed out. Falling back to localStorage.");
        resolve(this.loadFromLocalStorage());
      }, 1000);

      try {
        const request = indexedDB.open(IDB_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME, { keyPath: 'path' });
          }
        };
        request.onsuccess = () => {
          clearTimeout(timer);
          const db = request.result;
          try {
            const tx = db.transaction(IDB_STORE_NAME, 'readonly');
            const store = tx.objectStore(IDB_STORE_NAME);
            const getAll = store.getAll();
            getAll.onsuccess = () => {
              db.close();
              const result = new Map<
                string,
                { content: string; createdAt: number; modifiedAt: number }
              >();
              if (getAll.result && Array.isArray(getAll.result)) {
                for (const item of getAll.result) {
                  if (item && item.path && typeof item.content === 'string') {
                    result.set(item.path, {
                      content: item.content,
                      createdAt: item.createdAt || Date.now(),
                      modifiedAt: item.modifiedAt || Date.now()
                    });
                  }
                }
              }
              if (result.size > 0) {
                resolve(result);
              } else {
                resolve(this.loadFromLocalStorage());
              }
            };
            getAll.onerror = () => {
              db.close();
              resolve(this.loadFromLocalStorage());
            };
          } catch {
            db.close();
            resolve(this.loadFromLocalStorage());
          }
        };
        request.onerror = () => {
          clearTimeout(timer);
          resolve(this.loadFromLocalStorage());
        };
      } catch {
        clearTimeout(timer);
        resolve(this.loadFromLocalStorage());
      }
    });
  }

  private loadFromLocalStorage(): Map<
    string,
    { content: string; createdAt: number; modifiedAt: number }
  > | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const result = new Map<
            string,
            { content: string; createdAt: number; modifiedAt: number }
          >();
          for (const [path, data] of Object.entries(parsed)) {
            if (data && typeof (data as any).content === 'string') {
              result.set(path, {
                content: (data as any).content,
                createdAt: (data as any).createdAt || Date.now(),
                modifiedAt: (data as any).modifiedAt || Date.now()
              });
            }
          }
          if (result.size > 0) return result;
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }
}
