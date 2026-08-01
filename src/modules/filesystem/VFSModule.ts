import { VoltBus } from '@core/VoltBus';
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
  private bus: VoltBus;
  private storageAdapter: StorageAdapterModule;
  private cwd: string = 'C:\\Users\\Volt';
  private nodes: Map<string, InternalVFSNode> = new Map();
  private initialized: boolean = false;
  private adminUnlocked: boolean = false;

  constructor() {
    this.bus = VoltBus.getInstance();
    this.storageAdapter = new StorageAdapterModule();
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.storageAdapter.init();

    this.nodes.set('c:', {
      name: 'C:',
      path: 'C:\\',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    this.nodes.set('c:\\users', {
      name: 'Users',
      path: 'C:\\Users',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });
    this.nodes.set('c:\\users\\volt', {
      name: 'Volt',
      path: 'C:\\Users\\Volt',
      type: 'directory',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    });

    // Always create default filesystem first, then overlay saved files
    try {
      await this.createDefaultFilesystem();
    } catch (err) {
      console.error("Error creating default filesystem:", err);
    }

    try {
      // Never clear the origin's localStorage here. GitHub Pages may share its origin
      // with other projects, and a missing Volt key is normal for a first visit.
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
    } catch (err) {
      console.warn("Incompatible local storage state detected. Gracefully resetting to default workspace.", err);
      try {
        localStorage.clear();
      } catch { /* ignore */ }
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
      'C:\\Users\\Volt\\Desktop',
      'C:\\Users\\Volt\\Documents',
      'C:\\Users\\Volt\\Downloads',
      'C:\\Users\\Volt\\Pictures',
      'C:\\Users\\Volt\\Projects',

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
      'C:\\Users\\Volt\\README.txt',
      `Welcome to Volt!

Volt is a 100% local-first, browser-native development operating environment.

Features:
• 70% Windows Command Prompt (Terminal)
• 20% VS Code Modal Editor
• 10% Chrome-style File Tabs
• Realistic Virtual Filesystem with Recycle Bin
• Protected System Folders

Version: 1.0.0`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\How To Use Volt.txt',
      `How To Use Volt

Welcome to Volt — a browser-based development operating system.

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
      'C:\\Users\\Volt\\hello.py',
      `print("Welcome to Volt Python Runtime")
name = input("Enter your name: ")
print(f"Hello, {name}!")`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\main.cpp',
      `#include <iostream>
int main() {
    std::cout << "Hello from C++ in Volt!" << std::endl;
    return 0;
}`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\Main.java',
      `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java in Volt!");
    }
}`
    );

    // === POPULATE DESKTOP & TUTORIAL DIRECTORIES ===
    await this.mkdir('C:\\Users\\Volt\\Desktop\\Tutorial');
    await this.mkdir('C:\\Users\\Volt\\Projects\\Tutorial');

    await this.writeFile(
      'C:\\Users\\Volt\\Desktop\\Welcome to Volt.txt',
      `Welcome to your VOLT Desktop!

This folder represents the files visible on your main Desktop background interface and inside your active File Explorer.

Feel free to write code, create directories, upload your local photos, or customize the background wallpaper settings!

Volt System Version: 2.0.0`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\Desktop\\Quickstart.txt',
      `Volt Quickstart Guide

1. Press Space + T to open the terminal.
2. Type 'dir' to list directories.
3. CD into 'Desktop\\Tutorial' or 'Projects\\Tutorial' to find sample codes!
4. Run 'run hello.py' to compile and execute the python script with interactive stdin loops.
5. Double-click the custom SVGs inside Pictures/ folder to set them as your custom glowing background wallpapers!

Have fun development browser-first and local-first!`
    );

    const tutorialPy = `print("Welcome to the VOLT Coding Tutorial!")
name = input("Enter your name: ")
print(f"Excellent, {name}! You have successfully compiled and executed Python inside WebAssembly!")`;

    const tutorialCpp = `#include <iostream>
int main() {
    std::cout << "Welcome to the VOLT C++ Coding Tutorial!" << std::endl;
    std::cout << "Successfully compiled with Clang inside Web Worker!" << std::endl;
    return 0;
}`;

    const tutorialJava = `public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to the VOLT Java JVM Tutorial!");
        System.out.println("Successfully executed on WebAssembly JVM!");
    }
}`;

    const tutorialJs = `console.log("Welcome to the VOLT JavaScript Tutorial!");
console.log("This script is running natively inside Volt's browser V8 engine.");
let age = prompt("How many years have you been writing JavaScript?");
console.log("Wow, " + age + " years is a long time! Keep up the great work!");`;

    const tutorialSh = `# VOLT Bash Scripting Tutorial
echo "Starting local VOLT automation script..."
sysinfo
recent
echo "Shell script execution complete!"`;

    // Write to Desktop Tutorial
    await this.writeFile('C:\\Users\\Volt\\Desktop\\Tutorial\\hello.py', tutorialPy);
    await this.writeFile('C:\\Users\\Volt\\Desktop\\Tutorial\\main.cpp', tutorialCpp);
    await this.writeFile('C:\\Users\\Volt\\Desktop\\Tutorial\\Main.java', tutorialJava);
    await this.writeFile('C:\\Users\\Volt\\Desktop\\Tutorial\\hello.js', tutorialJs);
    await this.writeFile('C:\\Users\\Volt\\Desktop\\Tutorial\\script.sh', tutorialSh);

    // Write to Projects Tutorial
    await this.writeFile('C:\\Users\\Volt\\Projects\\Tutorial\\hello.py', tutorialPy);
    await this.writeFile('C:\\Users\\Volt\\Projects\\Tutorial\\main.cpp', tutorialCpp);
    await this.writeFile('C:\\Users\\Volt\\Projects\\Tutorial\\Main.java', tutorialJava);
    await this.writeFile('C:\\Users\\Volt\\Projects\\Tutorial\\hello.js', tutorialJs);
    await this.writeFile('C:\\Users\\Volt\\Projects\\Tutorial\\script.sh', tutorialSh);

    // === SEED DEFAULT SVG WALLPAPERS ===
    await this.writeFile(
      'C:\\Users\\Volt\\Pictures\\Volt-Futuristic.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05020c"/>
      <stop offset="50%" stop-color="#15102a"/>
      <stop offset="100%" stop-color="#030107"/>
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00ff66"/>
      <stop offset="100%" stop-color="#00ffff"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g stroke="rgba(0, 255, 102, 0.15)" stroke-width="2" fill="none">
    <path d="M 100,100 L 400,100 L 500,200 L 1000,200"/>
    <path d="M 1800,900 L 1500,900 L 1400,800 L 900,800"/>
    <circle cx="500" cy="200" r="6" fill="#00ff66"/>
    <circle cx="1400" cy="800" r="6" fill="#00ffff"/>
  </g>
  <path d="M 960,350 L 900,550 L 980,550 L 920,800 L 1020,500 L 940,500 Z" fill="url(#neon)" filter="url(#glow)"/>
  <text x="960" y="250" font-family="Consolas, monospace" font-size="28" font-weight="bold" fill="#888" letter-spacing="8" text-anchor="middle">VPU PRESENTS</text>
  <text x="960" y="900" font-family="Consolas, monospace" font-size="34" font-weight="bold" fill="#fff" letter-spacing="2" text-anchor="middle">VOLT — Browser-Native OS</text>
  <text x="960" y="950" font-family="Consolas, monospace" font-size="20" fill="#00ff66" letter-spacing="4" text-anchor="middle">Local-First | Client-Side | Secure Sandbox</text>
</svg>`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\Pictures\\Volt-Minimalist.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#12131C"/>
      <stop offset="100%" stop-color="#1E2030"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="960" cy="540" r="180" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
  <path d="M 960,400 L 910,550 L 970,550 L 930,730 L 1010,510 L 950,510 Z" fill="#00ff66" filter="url(#glow)"/>
  <text x="960" y="320" font-family="Consolas, monospace" font-size="24" font-weight="bold" fill="#00ff66" letter-spacing="10" text-anchor="middle">VPU PRESENTS</text>
  <text x="960" y="830" font-family="Consolas, monospace" font-size="48" font-weight="900" fill="#fff" letter-spacing="8" text-anchor="middle">VOLT</text>
  <text x="960" y="890" font-family="Consolas, monospace" font-size="18" fill="#888" letter-spacing="2" text-anchor="middle">A modern desktop environment built entirely for the web.</text>
</svg>`
    );

    await this.writeFile(
      'C:\\Users\\Volt\\Pictures\\Volt-Cyberpunk.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
  <rect width="1920" height="1080" fill="#000000"/>
  <defs>
    <linearGradient id="cyan-pink" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#4facfe"/>
    </linearGradient>
    <filter id="neon-glow">
      <feGaussianBlur stdDeviation="15" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Cyber grid -->
  <path d="M 0,540 H 1920" stroke="rgba(0, 242, 254, 0.08)" stroke-width="2"/>
  <path d="M 960,0 V 1080" stroke="rgba(0, 242, 254, 0.08)" stroke-width="2"/>
  <rect x="760" y="340" width="400" height="400" fill="none" stroke="url(#cyan-pink)" stroke-width="4" filter="url(#neon-glow)" rx="20"/>
  <path d="M 960,420 L 920,540 L 970,540 L 940,680 L 1000,510 L 950,510 Z" fill="#ff007f" filter="url(#neon-glow)"/>
  <text x="960" y="270" font-family="Consolas, monospace" font-size="28" font-weight="bold" fill="#ff007f" letter-spacing="12" text-anchor="middle" filter="url(#neon-glow)">VPU PRESENTS</text>
  <text x="960" y="820" font-family="Consolas, monospace" font-size="54" font-weight="900" fill="#00f2fe" letter-spacing="15" text-anchor="middle" filter="url(#neon-glow)">VOLT</text>
  <text x="960" y="880" font-family="Consolas, monospace" font-size="20" fill="#ffffff" letter-spacing="3" text-anchor="middle">LOCAL-FIRST browser-native workstation</text>
</svg>`
    );

    // Make README read-only
    const readmeNode = this.nodes.get('c:\\users\\volt\\readme.txt');
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
    const isReadingRecycleBin = target.startsWith('c:\\recycle bin');

    for (const [key, node] of this.nodes.entries()) {
      if (key === target) continue;
      if (key.startsWith(prefix) && !key.substring(prefix.length).includes('\\')) {
        if (isReadingRecycleBin) {
          if (!node.inRecycleBin) continue;
        } else {
          if (node.inRecycleBin) continue;
        }
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
    const parts = path.split('\\').filter(Boolean);
    if (parts.length <= 1) return; // Nothing to ensure above root drive

    let curr = parts[0]; // e.g. "C:"
    for (let i = 1; i < parts.length - 1; i++) {
      curr += '\\' + parts[i];
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
