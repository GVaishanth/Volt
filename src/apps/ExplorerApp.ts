import { VFSModule } from '@modules/filesystem/VFSModule';
import { OSWindow, WindowManager } from '@core/WindowManager';
import { VoltBus } from '@core/VoltBus';

export class ExplorerApp {
  private vfs: VFSModule;
  private currentPath: string = 'C:\\Users\\Volt';
  private bus = VoltBus.getInstance();
  private selectedPaths: Set<string> = new Set();
  private clipboard: { action: 'copy' | 'cut'; paths: string[] } | null = null;
  private sortBy: 'name' | 'size' | 'type' | 'modified' = 'name';
  private searchKeyword: string = '';

  constructor(vfs: VFSModule) {
    this.vfs = vfs;
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '📂',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = 'var(--volt-status-bg)';
        body.style.color = 'var(--volt-fg)';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderExplorer(body);
      }
    };
  }

  private async renderExplorer(body: HTMLElement) {
    body.innerHTML = `
      <!-- Toolbar -->
      <div class="explorer-toolbar" style="padding: 8px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.1); flex-wrap: wrap;">
        <button class="explorer-btn btn-back" style="background:#ffffff15; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:3px 8px; cursor:pointer;" title="Go Up (..)">⬆ Up</button>
        <input class="explorer-path-input" type="text" value="${this.currentPath}" style="flex:1; min-width:150px; background:#000; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:3px 6px; font-family:inherit;" />
        <button class="explorer-btn btn-new-file" style="background:#ffffff15; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:3px 8px; cursor:pointer;">+ File</button>
        <button class="explorer-btn btn-new-dir" style="background:#ffffff15; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:3px 8px; cursor:pointer;">+ Folder</button>
        <button class="explorer-btn btn-export-ws" style="background:#228b223a; border:1px solid #228b2299; color:#98fb98; padding:3px 8px; cursor:pointer;" title="Export entire VFS workspace as JSON">📥 Export</button>
        <button class="explorer-btn btn-import-ws" style="background:#1e90ff3a; border:1px solid #1e90ff99; color:#87cefa; padding:3px 8px; cursor:pointer;" title="Import workspace JSON">📤 Import</button>
        <button class="explorer-btn btn-upload-file" style="background:#ffa5002a; border:1px solid #ffa50099; color:#ffb533; padding:3px 8px; cursor:pointer;" title="Upload local files/images into this directory">⬆ Upload</button>
        <input class="explorer-search-input" type="text" placeholder="Search..." value="${this.searchKeyword}" style="width:100px; background:#000; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:3px 6px; font-family:inherit;" />
      </div>

      <!-- Main Layout -->
      <div class="explorer-main" style="flex: 1; display: flex; overflow: hidden;">
        <!-- Sidebar Navigation Tree -->
        <div class="explorer-tree-sidebar" style="width: 180px; border-right: 1px solid rgba(255,255,255,0.1); overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.15);">
          <div style="font-weight: bold; font-size: 11px; opacity: 0.6; margin-bottom: 6px; padding-left: 4px;">SYSTEM DRIVES</div>
          <div class="tree-sidebar-item" data-path="C:\\" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">💾 Local Disk (C:)</div>
          <div style="font-weight: bold; font-size: 11px; opacity: 0.6; margin-top: 12px; margin-bottom: 6px; padding-left: 4px;">FAVORITES</div>
          <div class="tree-sidebar-item" data-path="C:\\Users\\Volt" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">🏠 Volt Home</div>
          <div class="tree-sidebar-item" data-path="C:\\Users\\Volt\\Desktop" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">🖥️ Desktop</div>
          <div class="tree-sidebar-item" data-path="C:\\Users\\Volt\\Documents" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">📂 Documents</div>
          <div class="tree-sidebar-item" data-path="C:\\Users\\Volt\\Projects" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">📁 Projects</div>
          <div class="tree-sidebar-item" data-path="C:\\Recycle Bin" style="cursor: pointer; padding: 4px; display: flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 13px;">🗑️ Recycle Bin</div>
        </div>

        <!-- Files Grid/List Area -->
        <div class="explorer-grid-container" style="flex: 1; overflow-y: auto; padding: 12px; position: relative;">
          <!-- Sort Headers -->
          <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; font-size: 11px; opacity: 0.5; font-weight: bold; margin-bottom: 8px;">
            <div class="sort-header" data-sort="name" style="width: 50%; cursor: pointer;">NAME ${this.sortBy === 'name' ? '▼' : ''}</div>
            <div class="sort-header" data-sort="type" style="width: 15%; cursor: pointer;">TYPE ${this.sortBy === 'type' ? '▼' : ''}</div>
            <div class="sort-header" data-sort="size" style="width: 15%; cursor: pointer;">SIZE ${this.sortBy === 'size' ? '▼' : ''}</div>
            <div class="sort-header" data-sort="modified" style="width: 20%; cursor: pointer;">MODIFIED ${this.sortBy === 'modified' ? '▼' : ''}</div>
          </div>
          <!-- Files List -->
          <div class="explorer-files-list" style="display: flex; flex-direction: column; gap: 4px;"></div>
        </div>
      </div>

      <!-- Status Bar / Clipboard info -->
      <div class="explorer-statusbar" style="padding: 4px 10px; display: flex; font-size: 11px; opacity: 0.7; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.08);">
        <div class="status-selected-count">0 items selected</div>
        <div class="status-clipboard-info" style="margin-left: auto;"></div>
      </div>
    `;

    // Bind Event Listeners
    const btnBack = body.querySelector('.btn-back') as HTMLButtonElement;
    btnBack.addEventListener('click', () => this.goUp(body));

    const pathInput = body.querySelector('.explorer-path-input') as HTMLInputElement;
    pathInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        this.navigateTo(pathInput.value, body);
      }
    });

    const searchInput = body.querySelector('.explorer-search-input') as HTMLInputElement;
    searchInput.addEventListener('input', () => {
      this.searchKeyword = searchInput.value;
      this.loadFiles(body);
    });

    const btnNewFile = body.querySelector('.btn-new-file') as HTMLButtonElement;
    btnNewFile.addEventListener('click', () => this.createNewItem('file', body));

    const btnNewDir = body.querySelector('.btn-new-dir') as HTMLButtonElement;
    btnNewDir.addEventListener('click', () => this.createNewItem('directory', body));

    const btnExport = body.querySelector('.btn-export-ws') as HTMLButtonElement;
    btnExport.addEventListener('click', () => this.exportWorkspace());

    const btnImport = body.querySelector('.btn-import-ws') as HTMLButtonElement;
    btnImport.addEventListener('click', () => this.importWorkspace(body));

    const btnUpload = body.querySelector('.btn-upload-file') as HTMLButtonElement;
    btnUpload.addEventListener('click', () => this.uploadLocalFiles(body));

    body.querySelectorAll('.tree-sidebar-item').forEach(el => {
      const p = el.getAttribute('data-path');
      if (p) {
        el.addEventListener('click', () => this.navigateTo(p, body));
        if (p.toLowerCase() === this.currentPath.toLowerCase()) {
          (el as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
        }
      }
    });

    body.querySelectorAll('.sort-header').forEach(el => {
      const field = el.getAttribute('data-sort') as any;
      if (field) {
        el.addEventListener('click', () => {
          this.sortBy = field;
          this.renderExplorer(body);
        });
      }
    });

    await this.loadFiles(body);
  }

  private async loadFiles(body: HTMLElement) {
    const listEl = body.querySelector('.explorer-files-list') as HTMLElement;
    if (!listEl) return;

    listEl.innerHTML = '';
    let entries = await this.vfs.readdir(this.currentPath);

    // Apply Search Filter
    if (this.searchKeyword.trim()) {
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(this.searchKeyword.toLowerCase())
      );
    }

    // Apply Sort Heuristics
    entries.sort((a, b) => {
      if (this.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (this.sortBy === 'size') {
        return a.size - b.size;
      } else if (this.sortBy === 'type') {
        return a.type.localeCompare(b.type);
      } else if (this.sortBy === 'modified') {
        return a.modifiedAt - b.modifiedAt;
      }
      return 0;
    });

    if (entries.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.5; font-style:italic; font-size:13px;">This directory is empty.</div>`;
      this.updateSelectionStatus(body);
      return;
    }

    for (const e of entries) {
      const isDir = e.type === 'directory';
      const icon = isDir ? '📁' : this.getFileIcon(e.name);
      const formattedSize = isDir ? '--' : this.formatBytes(e.size);
      const dateStr = new Date(e.modifiedAt).toISOString().replace('T', ' ').substring(0, 16);

      const fileRow = document.createElement('div');
      fileRow.className = `explorer-file-row ${this.selectedPaths.has(e.path) ? 'selected' : ''}`;
      fileRow.setAttribute('data-path', e.path);
      fileRow.style.display = 'flex';
      fileRow.style.padding = '6px';
      fileRow.style.cursor = 'pointer';
      fileRow.style.borderRadius = '4px';
      fileRow.style.fontSize = '13px';
      fileRow.style.borderBottom = '1px solid rgba(255,255,255,0.03)';

      fileRow.innerHTML = `
        <div style="width: 50%; display: flex; align-items: center; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span>${icon}</span>
          <span class="file-name-text">${e.name}</span>
        </div>
        <div style="width: 15%; opacity: 0.7;">${isDir ? 'Folder' : e.name.split('.').pop()?.toUpperCase() || 'File'}</div>
        <div style="width: 15%; opacity: 0.7;">${formattedSize}</div>
        <div style="width: 20%; opacity: 0.7;">${dateStr}</div>
      `;

      // Single Click (Select / Multi-Select with Ctrl)
      fileRow.addEventListener('click', ev => {
        if (ev.ctrlKey || ev.metaKey) {
          if (this.selectedPaths.has(e.path)) {
            this.selectedPaths.delete(e.path);
            fileRow.style.backgroundColor = '';
          } else {
            this.selectedPaths.add(e.path);
            fileRow.style.backgroundColor = 'rgba(255,255,255,0.12)';
          }
        } else {
          body
            .querySelectorAll('.explorer-file-row')
            .forEach(row => ((row as HTMLElement).style.backgroundColor = ''));
          this.selectedPaths.clear();
          this.selectedPaths.add(e.path);
          fileRow.style.backgroundColor = 'rgba(255,255,255,0.12)';
        }
        this.updateSelectionStatus(body);
      });

      // Double Click (Open File / Navigate Folder)
      fileRow.addEventListener('dblclick', () => {
        if (isDir) {
          this.navigateTo(e.path, body);
        } else {
          const ext = e.name.split('.').pop()?.toLowerCase() || '';
          const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
          if (isImage) {
            this.showImageOptionsBox(e.path, e.name, body);
          } else {
            // Open in code editor
            this.bus.publish('EDITOR:OPEN_REQUEST', { targetPath: e.path });
          }
        }
      });

      // Right Click Context Menu
      fileRow.addEventListener('contextmenu', ev => {
        ev.preventDefault();
        this.showContextMenu(ev.clientX, ev.clientY, e.path, isDir, body);
      });

      listEl.appendChild(fileRow);
    }

    this.updateSelectionStatus(body);
  }

  private showContextMenu(x: number, y: number, path: string, isDir: boolean, body: HTMLElement) {
    // Remove previous context menus
    document.querySelectorAll('.explorer-context-menu').forEach(el => el.remove());

    const menu = document.createElement('div');
    menu.className = 'explorer-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.backgroundColor = '#181818';
    menu.style.border = '1px solid rgba(255,255,255,0.15)';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '100000';
    menu.style.fontFamily = 'inherit';
    menu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';

    const createItem = (label: string, action: () => void, isDangerous = false) => {
      const item = document.createElement('div');
      item.innerText = label;
      item.style.padding = '6px 16px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '13px';
      item.style.color = isDangerous ? '#f64' : '#fff';
      item.addEventListener(
        'mouseenter',
        () => (item.style.backgroundColor = 'rgba(255,255,255,0.1)')
      );
      item.addEventListener('mouseleave', () => (item.style.backgroundColor = ''));
      item.addEventListener('click', () => {
        action();
        menu.remove();
      });
      return item;
    };

    menu.appendChild(createItem('✏️ Rename', () => this.renameItem(path, body)));
    if (!isDir) {
      menu.appendChild(createItem('📥 Download File', () => this.downloadFile(path)));
      menu.appendChild(createItem('📁 Duplicate', () => this.duplicateItem(path, body)));
    }

    const divider = document.createElement('div');
    divider.style.height = '1px';
    divider.style.backgroundColor = 'rgba(255,255,255,0.08)';
    divider.style.margin = '4px 0';
    menu.appendChild(divider);

    menu.appendChild(createItem('✂️ Cut', () => this.clipboardAction('cut', [path], body)));
    menu.appendChild(createItem('📋 Copy', () => this.clipboardAction('copy', [path], body)));

    if (this.clipboard) {
      menu.appendChild(createItem('📋 Paste', () => this.pasteClipboard(body)));
    }

    menu.appendChild(divider.cloneNode());
    menu.appendChild(createItem('🗑️ Delete', () => this.deleteItem(path, body), true));

    document.body.appendChild(menu);

    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeMenu), 50);
  }

  private async createNewItem(type: 'file' | 'directory', body: HTMLElement) {
    const defaultName = type === 'file' ? 'untitled.txt' : 'New Folder';
    const name = prompt(`Enter ${type} name:`, defaultName);
    if (!name) return;

    const fullPath = `${this.currentPath}\\${name}`.replace(/\\+/g, '\\');
    if (type === 'file') {
      await this.vfs.writeFile(fullPath, '');
    } else {
      await this.vfs.mkdir(fullPath);
    }
    this.bus.publish('NOTIFICATION:ADD', { text: `Created ${type}: ${name}`, type: 'success' });
    this.loadFiles(body);
  }

  private async renameItem(path: string, body: HTMLElement) {
    const oldName = path.split('\\').pop() || '';
    const newName = prompt('Enter new name:', oldName);
    if (!newName) return;

    const newPath = path.replace(/[^\\]+$/, newName);
    await this.vfs.rename(path, newPath);
    this.bus.publish('NOTIFICATION:ADD', { text: `Renamed file to ${newName}`, type: 'success' });
    this.loadFiles(body);
  }

  private async duplicateItem(path: string, body: HTMLElement) {
    try {
      const content = await this.vfs.readFileAsText(path);
      const nameParts = path.split('\\').pop()?.split('.') || ['copy'];
      const ext = nameParts.pop();
      const baseName = nameParts.join('.');
      const newPath = path.replace(/[^\\]+$/, `${baseName}_copy.${ext}`);

      await this.vfs.writeFile(newPath, content);
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Duplicated file: ${baseName}_copy.${ext}`,
        type: 'info'
      });
      this.loadFiles(body);
    } catch {
      alert('Cannot duplicate directories at this time.');
    }
  }

  private downloadFile(path: string) {
    const cwd = path.substring(0, path.lastIndexOf('\\')) || 'C:\\';
    const file = path.split('\\').pop() || 'download.txt';
    this.bus.publish('FILE:DOWNLOAD_REQUEST', { target: file, cwd });
  }

  private clipboardAction(action: 'copy' | 'cut', paths: string[], body: HTMLElement) {
    this.clipboard = { action, paths };
    this.bus.publish('NOTIFICATION:ADD', {
      text: `${action.toUpperCase()} ${paths.length} items to clipboard`,
      type: 'info'
    });
    this.renderExplorer(body);
  }

  private async pasteClipboard(body: HTMLElement) {
    if (!this.clipboard) return;

    const { action, paths } = this.clipboard;
    let pasteCount = 0;

    for (const src of paths) {
      const name = src.split('\\').pop() || 'copy';
      const dest = `${this.currentPath}\\${name}`.replace(/\\+/g, '\\');

      try {
        if (action === 'copy') {
          const content = await this.vfs.readFileAsText(src);
          await this.vfs.writeFile(dest, content);
        } else if (action === 'cut') {
          const content = await this.vfs.readFileAsText(src);
          await this.vfs.writeFile(dest, content);
          await this.vfs.unlink(src);
        }
        pasteCount++;
      } catch (err) {
        console.error(err);
      }
    }

    this.bus.publish('NOTIFICATION:ADD', {
      text: `Pasted ${pasteCount} items successfully`,
      type: 'success'
    });
    if (action === 'cut') {
      this.clipboard = null;
    }
    this.loadFiles(body);
  }

  private async deleteItem(path: string, body: HTMLElement) {
    const isInsideRecycleBin = path.toLowerCase().startsWith('c:\\recycle bin');
    const fileName = path.split('\\').pop() || '';
    const msg = isInsideRecycleBin
      ? `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`
      : `Are you sure you want to move "${fileName}" to the Recycle Bin?`;

    if (confirm(msg)) {
      if (isInsideRecycleBin) {
        const success = await this.vfs.unlink(path);
        if (success) {
          this.bus.publish('NOTIFICATION:ADD', { text: `Permanently deleted: ${fileName}`, type: 'info' });
          this.loadFiles(body);
        } else {
          alert('Could not permanently delete file.');
        }
      } else {
        const success = await this.vfs.moveToRecycleBin(path);
        if (success) {
          this.bus.publish('NOTIFICATION:ADD', { text: `Moved to Recycle Bin: ${fileName}`, type: 'info' });
          this.loadFiles(body);
        } else {
          alert('Access Denied: Protected folder or file error.');
        }
      }
    }
  }

  private navigateTo(path: string, body: HTMLElement) {
    this.currentPath = path;
    void this.vfs.setCWD(path);
    this.selectedPaths.clear();
    const pathInput = body.querySelector('.explorer-path-input') as HTMLInputElement;
    if (pathInput) pathInput.value = path;

    // Synchronize left-sidebar favorites background-highlights in real-time!
    body.querySelectorAll('.tree-sidebar-item').forEach(el => {
      const p = el.getAttribute('data-path');
      if (p) {
        if (p.toLowerCase() === path.toLowerCase()) {
          (el as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
        } else {
          (el as HTMLElement).style.backgroundColor = 'transparent';
        }
      }
    });

    this.loadFiles(body);
  }

  private goUp(body: HTMLElement) {
    if (this.currentPath === 'C:\\' || this.currentPath === 'C:') return;
    const parts = this.currentPath.split('\\');
    parts.pop();
    const nextPath = parts.join('\\') || 'C:\\';
    this.navigateTo(nextPath, body);
  }

  private updateSelectionStatus(body: HTMLElement) {
    const selectedCountEl = body.querySelector('.status-selected-count') as HTMLElement;
    if (selectedCountEl) {
      selectedCountEl.innerText = `${this.selectedPaths.size} item(s) selected`;
    }

    const clipboardEl = body.querySelector('.status-clipboard-info') as HTMLElement;
    if (clipboardEl) {
      clipboardEl.innerText = this.clipboard
        ? `Clipboard: ${this.clipboard.paths.length} items (${this.clipboard.action})`
        : '';
    }
  }

  private exportWorkspace() {
    const workspace = {
      version: 2,
      name: 'Volt Workspace Export',
      timestamp: Date.now(),
      files: [] as any[]
    };

    // We can fetch files directly from VFS
    const keys = Array.from((this.vfs as any).nodes.keys());
    for (const key of keys) {
      const node = (this.vfs as any).nodes.get(key);
      if (node && node.type === 'file') {
        workspace.files.push({
          path: node.path,
          content: node.content,
          createdAt: node.createdAt,
          modifiedAt: node.modifiedAt
        });
      }
    }

    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volt-workspace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.bus.publish('NOTIFICATION:ADD', { text: 'Workspace Export Completed!', type: 'success' });
  }

  private importWorkspace(body: HTMLElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      try {
        const text = await file.text();
        const ws = JSON.parse(text);
        if (ws.version === 2 && Array.isArray(ws.files)) {
          let count = 0;
          for (const f of ws.files) {
            if (f.path && f.content !== undefined) {
              await this.vfs.writeFile(f.path, f.content);
              count++;
            }
          }
          this.bus.publish('NOTIFICATION:ADD', {
            text: `Imported ${count} files from workspace!`,
            type: 'success'
          });
          this.loadFiles(body);
        } else {
          alert('Invalid workspace format.');
        }
      } catch (err) {
        alert('Error parsing workspace file.');
      }
    };
    input.click();
  }

  private getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'txt') return '📄';
    if (ext === 'py') return '🐍';
    if (ext === 'cpp' || ext === 'cc' || ext === 'h') return '⚙️';
    if (ext === 'java') return '☕';
    if (ext === 'md') return '📝';
    if (ext === 'html') return '🌐';
    if (ext === 'css') return '🎨';
    if (ext === 'js' || ext === 'ts') return '⚡';
    if (ext === 'db' || ext === 'sqlite') return '🗄️';
    return '📄';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private async showImageOptionsBox(path: string, fileName: string, _body: HTMLElement) {
    // Remove any previous image options modals
    document.querySelectorAll('.image-options-modal').forEach(el => el.remove());

    const currentWP = localStorage.getItem('volt_desktop_wallpaper');
    const hasCustomWP = currentWP === 'custom';

    const modal = document.createElement('div');
    modal.className = 'image-options-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000000';

    modal.innerHTML = `
      <div class="image-options-card" style="width: 320px; background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); overflow: hidden; font-family: inherit;">
        <div style="padding: 10px 14px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:bold; color:#00ff66;">🖼️ IMAGE OPTIONS</span>
          <button class="close-img-options" style="background:transparent; border:none; color:#aaa; font-size:16px; cursor:pointer;">&times;</button>
        </div>
        <div style="padding: 16px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:12px; opacity:0.8; word-break:break-all; text-align:center; margin-bottom:8px;">File: ${fileName}</div>
          <button class="opt-open-image" style="background: #2a2a2a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; font-family: inherit; font-size: 13px; cursor: pointer; border-radius: 4px; display:flex; align-items:center; gap:8px; justify-content:center; width: 100%;">
            🔍 Open Image
          </button>
          <button class="opt-set-wallpaper" style="background: #007acc; border: none; color: #fff; padding: 8px; font-family: inherit; font-size: 13px; cursor: pointer; border-radius: 4px; font-weight:bold; display:flex; align-items:center; gap:8px; justify-content:center; width: 100%;">
            🌌 Set as Wallpaper
          </button>
          ${hasCustomWP ? `
          <button class="opt-remove-wallpaper" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 8px; font-family: inherit; font-size: 13px; cursor: pointer; border-radius: 4px; display:flex; align-items:center; gap:8px; justify-content:center; width: 100%;">
            ❌ Remove as Wallpaper
          </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-img-options')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });

    // 1. Open Image Option
    modal.querySelector('.opt-open-image')?.addEventListener('click', async () => {
      modal.remove();
      try {
        const dataUrl = await this.vfs.readFileAsText(path);
        // Spawns a custom photo viewer window!
        const winMgr = WindowManager.getInstance();
        winMgr.openApp('photo-viewer', `Photo Viewer - ${fileName}`, {
          icon: '🖼️',
          onMount: (winBody: HTMLElement) => {
            winBody.style.backgroundColor = '#0a0a0a';
            winBody.style.display = 'flex';
            winBody.style.alignItems = 'center';
            winBody.style.justifyContent = 'center';
            winBody.style.height = '100%';
            winBody.style.width = '100%';
            winBody.style.overflow = 'auto';
            winBody.innerHTML = `
              <img src="${dataUrl}" style="max-width: 95%; max-height: 95%; object-fit: contain; box-shadow: 0 4px 15px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1);" />
            `;
          }
        });
      } catch {
        alert('Could not open image file.');
      }
    });

    // 2. Set as Background Wallpaper Option
    modal.querySelector('.opt-set-wallpaper')?.addEventListener('click', async () => {
      modal.remove();
      try {
        const dataUrl = await this.vfs.readFileAsText(path);
        localStorage.setItem('volt_desktop_wallpaper', 'custom');
        localStorage.setItem('volt_custom_wallpaper_data', dataUrl);
        this.bus.publish('THEME:WALLPAPER_CHANGED', { wallpaper: 'custom', customDataUrl: dataUrl });
        this.bus.publish('NOTIFICATION:ADD', {
          text: 'Desktop wallpaper updated successfully!',
          type: 'success'
        });
      } catch {
        alert('Could not set file as background wallpaper.');
      }
    });

    // 3. Remove Custom Wallpaper Option
    modal.querySelector('.opt-remove-wallpaper')?.addEventListener('click', () => {
      modal.remove();
      localStorage.removeItem('volt_desktop_wallpaper');
      localStorage.removeItem('volt_custom_wallpaper_data');
      this.bus.publish('THEME:WALLPAPER_CHANGED', { wallpaper: 'deep-space' }); // Restore default preset
      this.bus.publish('NOTIFICATION:ADD', {
        text: 'Custom background wallpaper removed.',
        type: 'info'
      });
    });
  }

  private uploadLocalFiles(body: HTMLElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      let count = 0;
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
        let content = '';

        if (isImage) {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        } else {
          content = await file.text();
        }

        const targetPath = `${this.currentPath}\\${file.name}`.replace(/\\+/g, '\\');
        await this.vfs.writeFile(targetPath, content);
        count++;
      }
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Uploaded ${count} file(s) into current folder!`,
        type: 'success'
      });
      this.loadFiles(body);
    };
    input.click();
  }
}
