import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';
import { CapabilityProfiler } from '@core/CapabilityProfiler';
import { WindowManager } from '@core/WindowManager';

export class SysteminfoCommandModule implements ICommand {
  public readonly name = 'systeminfo';
  public readonly aliases = ['sysinfo'];
  public readonly description =
    'Displays highly detailed diagnostic parameters, VFS storage quotas, and open window threads.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const profile = CapabilityProfiler.getProfile();
    const winMgr = WindowManager.getInstance();
    const openWins = winMgr.getWindows();

    let storageReport = 'Memory / Sandbox (52.4 MB quota)';
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        const usedMb = ((est.usage || 1400000) / (1024 * 1024)).toFixed(2);
        const quotaMb = ((est.quota || 52428800) / (1024 * 1024)).toFixed(0);
        storageReport = `${usedMb} MB / ${quotaMb} MB (${profile?.preferredFilesystem || 'IndexedDB'})`;
      }
    } catch {
      storageReport = 'Memory / Sandbox (52.4 MB quota)';
    }

    const sysText = `
================================================================
                    VOLT WORKSTATION SYSTEM INFO
================================================================
Host OS Name       : VOLT Web Operating System
OS Version         : 2.0.0 (Production Release)
System Architecture: Browser-Native, Local-First 
Storage Adapter    : ${profile?.preferredFilesystem || 'Memory / LocalStorage'}
Memory Quota       : ${storageReport}
Memory Transport   : ${profile?.preferredMemoryTransport || 'MessageChannel'}
Terminal Renderer  : ${profile?.preferredTerminalRenderer || 'DOM'}

SYSTEM RUNTIMES & ENGINES:
 - WebAssembly (WASM): ${profile?.hasWebAssembly ? 'ACTIVE' : 'FALLBACK'}
 - Multi-threading   : ${profile?.hasSharedArrayBuffer ? 'SharedArrayBuffer Active' : 'MessageChannel Fallback'}
 - Web Workers       : ${profile?.hasWebWorkers ? 'SUPPORTED' : 'DISABLED'}
 - Compilers Seeding : C, C++, Python, Java, JavaScript

ACTIVE WINDOW THREADS:
 - Total Open Apps  : ${openWins.length}
 ${openWins.map((w, idx) => `  [PID ${200 + idx * 13}] Title: "${w.title}" (ID: ${w.id})`).join('\n ') || '  (No active application windows)'}
================================================================\n`;

    this.bus.publish('EXEC:STDOUT_CHUNK', { text: sysText });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `systeminfo [or] sysinfo`,
      examples: [`systeminfo`]
    };
  }
}
