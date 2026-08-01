import { VFSModule } from './VFSModule';

export interface IFileTransferModule {
  handleDropEvent(event: DragEvent, targetCwd: string): Promise<string[]>;
  exportDirectoryToZip(path: string): Promise<Blob>;
}

export class FileTransferModule implements IFileTransferModule {
  private vfs: VFSModule;

  constructor(vfs: VFSModule) {
    this.vfs = vfs;
  }

  public async handleDropEvent(event: DragEvent, targetCwd: string): Promise<string[]> {
    event.preventDefault();
    const createdPaths: string[] = [];
    if (!event.dataTransfer || !event.dataTransfer.files) return createdPaths;

    const files = Array.from(event.dataTransfer.files);
    for (const file of files) {
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

      const targetPath = `${targetCwd}\\${file.name}`.replace(/\\+/g, '\\');
      await this.vfs.writeFile(targetPath, content);
      createdPaths.push(targetPath);
    }
    return createdPaths;
  }

  public async exportDirectoryToZip(_path: string): Promise<Blob> {
    // Basic fallback: return text representation
    return new Blob(['Volt Project Archive Snapshot'], { type: 'text/plain' });
  }
}
