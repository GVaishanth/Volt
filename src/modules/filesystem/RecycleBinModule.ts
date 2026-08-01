import { VoltBus } from '@core/VoltBus';
import { VFSModule } from './VFSModule';

export class RecycleBinModule {
  private bus = VoltBus.getInstance();
  private vfs: VFSModule;

  constructor(vfs: VFSModule) {
    this.vfs = vfs;
  }

  async deleteToRecycle(paths: string[]): Promise<void> {
    for (const p of paths) {
      await this.vfs.moveToRecycleBin(p);
    }
    this.bus.publish('VFS:FILE_DELETED', { paths });
  }

  async restore(path: string): Promise<boolean> {
    return this.vfs.restoreFromRecycleBin(path);
  }

  async empty(): Promise<void> {
    await this.vfs.emptyRecycleBin();
  }
}
