import { ReOSBus } from '@core/ReOSBus';
import { IVFSNodeMetadata } from '@types';
import { StorageAdapterModule } from './StorageAdapterModule';

export interface IVFSModule {
  getCWD(): string;
  setCWD(newPath: string): Promise<boolean>;
  readdir(path?: string): Promise<IVFSNodeMetadata[]>;
  readFileAsText(path: string): Promise<string>;
  writeFile(path: string, data: Uint8Array | string): Promise<boolean>;
  mkdir(path: string): Promise<boolean>;
  unlink(path: string): Promise<boolean>;
  move(source: string, dest: string): Promise<boolean>;
  rename(oldPath: string, newPath: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  isProtected(path: string): Promise<boolean>;
  isReadOnly(path: string): Promise<boolean>;
  moveToRecycleBin(path: string): Promise<boolean>;
  restoreFromRecycleBin(path: string): Promise<boolean>;
  emptyRecycleBin(): Promise<void>;
  init(): Promise<void>;
}

interface InternalVFSNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  readOnly?: boolean;
  protected?: boolean;
  hidden?: boolean;
  inRecycleBin?: boolean;
  originalPath?: string;
}

export class VFSModule implements IVFSModule {
  private bus: ReOSBus;
  private storageAdapter: StorageAdapterModule;
  private cwd: string = 'C:\\Users\\ReOS';
  private nodes: Map<string, InternalVFSNode> = new Map();
  private initialized: boolean = false;
  private adminUnlocked: boolean = false;

  constructor() {
    this.bus = ReOSBus.getInstance();
    this.storageAdapter = new StorageAdapterModule();
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.storageAdapter.init();

    this.nodes.set('c:\\\\', {
      name: 'C:',
      path: 'C:\\',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    this.nodes.set('c:\\\\users', {
      name: 'Users',
      path: 'C:\\Users',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    this.nodes.set('c:\\\\users\\\\reos', {
      name: 'ReOS',
      path: 'C:\\Users\\ReOS',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });

    // Always create default filesystem first, then overlay saved files
    await this.createDefaultFilesystem();

    const saved = await this.storageAdapter.loadVFSState();

    if (saved && saved.size > 0) {
      for (const [path, data] of saved.entries()) {
        const norm = this.normalizePath(path);
        this.ensureParentDirs(norm);
        this.nodes.set(norm.toLowerCase(), {
          name: norm.split('\\').pop()!,
          path: norm,
          type: 'file',
          content: data.content,
          size: new Blob([data.content]).size,
          createdAt: data.createdAt,
          modifiedAt: data.modifiedAt
        });
      }
    }

    this.initialized = true;
  }

  private async createDefaultFilesystem(): Promise<void> {
    const now = Date.now();

    // === DEFAULT REALISTIC FILESYSTEM ===
    const folders = [
      // System folders
      'C:\\System',
      'C:\\Windows',
      'C:\\Program Files',
      'C:\\Temp',
      'C:\\Recycle Bin',

      // User folders
      'C:\\Users\\ReOS\\Desktop',
      'C:\\Users\\ReOS\\Documents',
      'C:\\Users\\ReOS\\Downloads',
      'C:\\Users\\ReOS\\Pictures',
      'C:\\Users\\ReOS\\Projects',

      // Protected Admin folder
      'C:\\Admin'
    ];

    for (const f of folders) {
      const norm = this.normalizePath(f);
      this.ensureParentDirs(norm);
      this.nodes.set(norm.toLowerCase(), {
        name: f.split('\\').pop()!,
        path: norm,
        type: 'directory',
        size: 0,
        createdAt: now,
        modifiedAt: now,
        protected:
          f.includes('Admin') ||
          f.includes('System') ||
          f.includes('Windows') ||
          f.includes('Program Files')
      });
    }

    // Explicitly mark Admin as protected
    this.nodes.set('c:\\admin', {
      name: 'Admin',
      path: 'C:\\Admin',
      type: 'directory',
      size: 0,
      createdAt: now,
      modifiedAt: now,
      protected: true
    });

    // === DEFAULT DOCUMENTATION FILES ===
    await this.writeFile(
      'C:\\Users\\ReOS\\README.txt',
      `Welcome to Re\`OS!

Re\`OS is a 100% local-first, browser-native development operating environment.

Features:
• 70% Windows Command Prompt (Terminal)
• 20% VS Code Modal Editor
• 10% Chrome-style File Tabs
• Realistic Virtual Filesystem with Recycle Bin
• Protected System Folders

Version: 1.0.0`
    );

    await this.writeFile(
      'C:\\Users\\ReOS\\How To Use Re-OS.txt',
      `How To Use Re-OS

Welcome to Re\`OS — a browser-based development operating system.

BASIC TERMINAL COMMANDS
  dir / ls          List files and folders
  cd <folder>       Change current directory
  mkdir <name>      Create new folder
  edit <file>       Open file in the editor
  cat / type <file> View file contents
  run <file>        Execute code (Python, C++, Java, C)
  rm / del <file>   Delete file (moves to Recycle Bin)
  rename <old> <new>
  copy / move
  upload / download

EXPLORER USAGE
• Click folders to expand/collapse
• Double-click files to open in editor
• Right-click for context menu
• Multi-select with Ctrl + Click or Shift + Click
• Delete key supported

KEYBOARD SHORTCUTS
  Ctrl + S          Save current file
  Ctrl + C          Interrupt running process
  Tab               Command autocomplete
  Arrow Up/Down     Command history

SUPPORTED LANGUAGES
• C
• C++
• Python
• Java

PROTECTED FOLDERS
C:\\Admin is a protected folder. It requires a password to access.

TIPS
• All changes are saved automatically in your browser
• Deleted files go to Recycle Bin (can be restored)
• Use "emptybin" command to permanently delete`
    );

    // === SAMPLE CODE FILES ===
    await this.writeFile(
      'C:\\Users\\ReOS\\hello.py',
      `print("Welcome to Re\`OS Python Runtime")
name = input("Enter your name: ")
print(f"Hello, {name}!")`
    );

    await this.writeFile(
      'C:\\Users\\ReOS\\main.cpp',
      `#include <iostream>
int main() {
    std::cout << "Hello from C++ in Re\`OS!" << std::endl;
    return 0;
}`
    );

    await this.writeFile(
      'C:\\Users\\ReOS\\Main.java',
      `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java in Re\`OS!");
    }
}`
    );

    // Make README read-only
    const readmeNode = this.nodes.get('c:\\\\users\\\\reos\\\\readme.txt');
    if (readmeNode) readmeNode.readOnly = true;
  }

  // === Core methods (kept compatible) ===
  public getCWD(): string {
    return this.cwd;
  }

  public async setCWD(newPath: string): Promise<boolean> {
    const norm = this.normalizePath(newPath);
    const node = this.nodes.get(norm.toLowerCase());
    if (!node || node.type !== 'directory') return false;
    if (node.protected && !this.adminUnlocked && norm.toLowerCase().includes('admin')) return false;
    this.cwd = node.path;
    this.bus.publish('VFS:CWD_CHANGED', { cwd: this.cwd });
    return true;
  }

  public async readdir(path?: string): Promise<IVFSNodeMetadata[]> {
    const target = this.normalizePath(path || this.cwd).toLowerCase();
    const prefix = target + (target.endsWith('\\') ? '' : '\\');
    const results: IVFSNodeMetadata[] = [];

    for (const [key, node] of this.nodes.entries()) {
      if (key === target) continue;
      if (key.startsWith(prefix) && !key.substring(prefix.length).includes('\\')) {
        if (node.inRecycleBin) continue;
        results.push({
          name: node.name,
          path: node.path,
          type: node.type,
          size: node.size,
          createdAt: node.createdAt,
          modifiedAt: node.modifiedAt,
          readOnly: node.readOnly,
          protected: node.protected,
          hidden: node.hidden
        });
      }
    }
    return results.sort((a, b) =>
      a.type !== b.type ? (a.type === 'directory' ? -1 : 1) : a.name.localeCompare(b.name)
    );
  }

  public async exists(path: string): Promise<boolean> {
    return this.nodes.has(this.normalizePath(path).toLowerCase());
  }

  public async isDirectory(path: string): Promise<boolean> {
    const node = this.nodes.get(this.normalizePath(path).toLowerCase());
    return !!node && node.type === 'directory';
  }

  public async isProtected(path: string): Promise<boolean> {
    const node = this.nodes.get(this.normalizePath(path).toLowerCase());
    return !!node?.protected;
  }

  public async isReadOnly(path: string): Promise<boolean> {
    const node = this.nodes.get(this.normalizePath(path).toLowerCase());
    return !!node?.readOnly;
  }

  public async readFileAsText(path: string): Promise<string> {
    const norm = this.normalizePath(path).toLowerCase();
    const node = this.nodes.get(norm);
    if (!node || node.type !== 'file') throw new Error('File not found');
    return node.content || '';
  }

  public async writeFile(path: string, data: Uint8Array | string): Promise<boolean> {
    const norm = this.normalizePath(path);
    const key = norm.toLowerCase();
    const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const splitName = norm.split('\\').pop() || '';
    const name = splitName || '';

    this.ensureParentDirs(norm);
    const existing = this.nodes.get(key);
    const now = Date.now();

    this.nodes.set(key, {
      name,
      path: norm,
      type: 'file',
      content,
      size: new Blob([content]).size,
      createdAt: existing?.createdAt || now,
      modifiedAt: now,
      readOnly: existing?.readOnly,
      protected: existing?.protected
    });

    this.persistAllFiles();
    this.bus.publish(existing ? 'VFS:FILE_MODIFIED' : 'VFS:FILE_CREATED', { path: norm });
    return true;
  }

  public async mkdir(path: string): Promise<boolean> {
    const norm = this.normalizePath(path);
    const key = norm.toLowerCase();
    if (this.nodes.has(key)) return false;
    this.ensureParentDirs(norm);
    this.nodes.set(key, {
      name: norm.split('\\').pop()!,
      path: norm,
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    return true;
  }

  public async unlink(path: string): Promise<boolean> {
    const norm = this.normalizePath(path).toLowerCase();
    if (!this.nodes.has(norm)) return false;
    this.nodes.delete(norm);
    this.persistAllFiles();
    this.bus.publish('VFS:FILE_DELETED', { path });
    return true;
  }

  // === NEW: Recycle Bin Support ===
  public async moveToRecycleBin(path: string): Promise<boolean> {
    const norm = this.normalizePath(path).toLowerCase();
    const node = this.nodes.get(norm);
    if (!node) return false;
    if (node.protected) return false;

    node.inRecycleBin = true;
    node.originalPath = node.path;
    node.path = `C:\\Recycle Bin\\${node.name}`;

    this.persistAllFiles();
    this.bus.publish('VFS:FILE_DELETED', { path: node.path });
    return true;
  }

  public async restoreFromRecycleBin(path: string): Promise<boolean> {
    const norm = this.normalizePath(path).toLowerCase();
    const node = this.nodes.get(norm);
    if (!node || !node.inRecycleBin || !node.originalPath) return false;

    node.inRecycleBin = false;
    node.path = node.originalPath;
    delete node.originalPath;

    this.persistAllFiles();
    this.bus.publish('VFS:FILE_CREATED', { path: node.path });
    return true;
  }

  public async emptyRecycleBin(): Promise<void> {
    const toDelete: string[] = [];
    for (const [key, node] of this.nodes.entries()) {
      if (node.inRecycleBin) toDelete.push(key);
    }
    toDelete.forEach(k => this.nodes.delete(k));
    this.persistAllFiles();
    this.bus.publish('VFS:FILE_DELETED', { path: 'C:\\Recycle Bin' });
  }

  // === NEW: Move / Rename ===
  public async move(source: string, dest: string): Promise<boolean> {
    const srcKey = this.normalizePath(source).toLowerCase();
    const node = this.nodes.get(srcKey);
    if (!node) return false;
    if (node.protected) return false;

    const destNorm = this.normalizePath(dest);
    this.ensureParentDirs(destNorm);

    node.path = destNorm;
    node.name = destNorm.split('\\').pop()!;
    this.nodes.delete(srcKey);
    this.nodes.set(destNorm.toLowerCase(), node);

    this.persistAllFiles();
    this.bus.publish('VFS:FILE_MODIFIED', { path: destNorm });
    return true;
  }

  public async rename(oldPath: string, newPath: string): Promise<boolean> {
    return this.move(oldPath, newPath);
  }

  // === Utility ===
  private normalizePath(path: string): string {
    let p = path.replace(/\//g, '\\');
    if (!/^[a-zA-Z]:\\/.test(p)) {
      p = p.startsWith('\\') ? 'C:' + p : this.cwd + (this.cwd.endsWith('\\') ? '' : '\\') + p;
    }
    const parts = p.split('\\').filter(Boolean);
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '..') stack.pop();
      else if (part !== '.') stack.push(part);
    }
    return stack.join('\\');
  }

  private ensureParentDirs(path: string): void {
    const parts = path.split('\\');
    let curr = parts[0] + '\\';
    if (!this.nodes.has(curr.toLowerCase())) {
      this.nodes.set(curr.toLowerCase(), {
        name: parts[0] + '\\',
        path: curr,
        type: 'directory',
        size: 0,
        createdAt: Date.now(),
        modifiedAt: Date.now()
      });
    }
    for (let i = 1; i < parts.length - 1; i++) {
      curr += parts[i] + '\\';
      const key = curr.toLowerCase();
      if (!this.nodes.has(key)) {
        this.nodes.set(key, {
          name: parts[i],
          path: curr,
          type: 'directory',
          size: 0,
          createdAt: Date.now(),
          modifiedAt: Date.now()
        });
      }
    }
  }

  private persistAllFiles(): void {
    const filesToSave = new Map();
    for (const node of this.nodes.values()) {
      if (node.type === 'file' && typeof node.content === 'string' && !node.inRecycleBin) {
        filesToSave.set(node.path, {
          content: node.content,
          createdAt: node.createdAt,
          modifiedAt: node.modifiedAt
        });
      }
    }
    void this.storageAdapter.saveVFSState(filesToSave);
  }

  // Admin unlock
  public unlockAdmin(): void {
    this.adminUnlocked = true;
  }
  public lockAdmin(): void {
    this.adminUnlocked = false;
  }
  public isAdminUnlocked(): boolean {
    return this.adminUnlocked;
  }
}
