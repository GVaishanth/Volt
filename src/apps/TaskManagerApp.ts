import { OSWindow, WindowManager } from '@core/WindowManager';
import { VoltBus } from '@core/VoltBus';

export class TaskManagerApp {
  private bus = VoltBus.getInstance();
  private intervalId: any = null;

  constructor() {}

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '📊',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = '#111';
        body.style.color = '#fff';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderTaskManager(body);

        // Start animating resource usage charts
        this.intervalId = setInterval(() => {
          this.updateResourceUsage(body);
        }, 1000);
      },
      onClose: () => {
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
      }
    };
  }

  private renderTaskManager(body: HTMLElement) {
    body.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 12px; gap: 12px;">
        <!-- Header info -->
        <div style="font-weight: bold; font-size: 13px; display:flex; justify-content:space-between; align-items:center;">
          <span>📋 PROCESS MANAGER (TASK MANAGER)</span>
          <span style="font-size: 11px; opacity:0.5;">System: Active</span>
        </div>

        <!-- Resources Usage overview -->
        <div style="display: flex; gap: 12px; height: 74px;">
          <!-- CPU -->
          <div style="flex: 1; background: #000; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px; display:flex; flex-direction:column; justify-content:center; gap:4px;">
            <div style="font-size: 11px; opacity:0.6; font-weight:bold;">CPU USAGE</div>
            <div style="font-size: 20px; font-weight:bold; color: #00ff66;" class="task-cpu-text">12%</div>
            <div style="width:100%; height:4px; background:#222; border-radius:2px; overflow:hidden;">
              <div style="height:100%; width:12%; background:#00ff66; transition:width 0.4s ease;" class="task-cpu-bar"></div>
            </div>
          </div>
          <!-- RAM -->
          <div style="flex: 1; background: #000; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px; display:flex; flex-direction:column; justify-content:center; gap:4px;">
            <div style="font-size: 11px; opacity:0.6; font-weight:bold;">MEMORY (RAM)</div>
            <div style="font-size: 20px; font-weight:bold; color: #3b82f6;" class="task-ram-text">42 MB / 128 MB</div>
            <div style="width:100%; height:4px; background:#222; border-radius:2px; overflow:hidden;">
              <div style="height:100%; width:33%; background:#3b82f6; transition:width 0.4s ease;" class="task-ram-bar"></div>
            </div>
          </div>
        </div>

        <!-- Process List Table -->
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;">
          <div style="display:flex; background: rgba(255,255,255,0.05); padding: 8px; font-size: 11px; font-weight:bold; opacity:0.6; border-bottom: 1px solid rgba(255,255,255,0.15);">
            <div style="width: 15%;">PID</div>
            <div style="width: 40%;">PROCESS NAME / APP</div>
            <div style="width: 15%;">CPU %</div>
            <div style="width: 15%;">MEM</div>
            <div style="width: 15%; text-align:right;">ACTION</div>
          </div>
          <div class="task-process-rows" style="flex: 1; overflow-y:auto; display:flex; flex-direction:column;"></div>
        </div>
      </div>
    `;

    this.renderProcessRows(body);
  }

  private renderProcessRows(body: HTMLElement) {
    const listEl = body.querySelector('.task-process-rows') as HTMLElement;
    if (!listEl) return;

    listEl.innerHTML = '';
    const winMgr = WindowManager.getInstance();
    const openWins = winMgr.getWindows();

    // Add virtual/system processes
    const processes = [
      {
        pid: 101,
        name: 'volt_kernel_bus.sys',
        cpu: 1,
        mem: '1.2 MB',
        winId: null as string | null
      },
      { pid: 102, name: 'vfs_worker.ts', cpu: 0, mem: '3.4 MB', winId: null as string | null },
      {
        pid: 104,
        name: 'wasm_compiler_service',
        cpu: 0,
        mem: '12.1 MB',
        winId: null as string | null
      }
    ];

    // Add each open window as an active process
    openWins.forEach((win, idx) => {
      processes.push({
        pid: 200 + idx * 13,
        name: `app_${win.appId}.exe (${win.title})`,
        cpu: win.minimized ? 0 : Math.floor(Math.random() * 5) + 1,
        mem: `${(Math.floor(Math.random() * 8) + 4).toFixed(1)} MB`,
        winId: win.id
      });
    });

    for (const p of processes) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.padding = '8px';
      row.style.fontSize = '12px';
      row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
      row.style.alignItems = 'center';
      row.addEventListener(
        'mouseenter',
        () => (row.style.backgroundColor = 'rgba(255,255,255,0.02)')
      );
      row.addEventListener('mouseleave', () => (row.style.backgroundColor = ''));

      row.innerHTML = `
        <div style="width: 15%; opacity:0.5;">${p.pid}</div>
        <div style="width: 40%; font-weight:bold; color: #a8ffb2;">${p.name}</div>
        <div style="width: 15%;">${p.cpu}%</div>
        <div style="width: 15%;">${p.mem}</div>
        <div style="width: 15%; text-align:right;">
          ${p.winId ? `<button class="kill-btn" data-win-id="${p.winId}" style="background:#ef444433; border: 1px solid #ef444499; color:#f87171; padding:2px 8px; font-size:10px; cursor:pointer; border-radius:3px;">Kill</button>` : `<span style="font-size:10px; opacity:0.3;">system</span>`}
        </div>
      `;

      row.querySelector('.kill-btn')?.addEventListener('click', () => {
        if (p.winId) {
          winMgr.closeWindow(p.winId);
          this.bus.publish('NOTIFICATION:ADD', {
            text: `Terminated process: ${p.name}`,
            type: 'info'
          });
          this.renderProcessRows(body);
        }
      });

      listEl.appendChild(row);
    }
  }

  private updateResourceUsage(body: HTMLElement) {
    const cpuText = body.querySelector('.task-cpu-text') as HTMLElement;
    const cpuBar = body.querySelector('.task-cpu-bar') as HTMLElement;
    const ramText = body.querySelector('.task-ram-text') as HTMLElement;
    const ramBar = body.querySelector('.task-ram-bar') as HTMLElement;

    if (!cpuText || !cpuBar) return;

    // Simulate animated waves
    const winCount = WindowManager.getInstance().getWindows().length;
    const cpuBase = 4 + winCount * 3;
    const cpuVal = Math.min(100, Math.floor(Math.random() * 8) + cpuBase);
    const ramVal = Math.min(128, 24 + winCount * 8 + Math.floor(Math.random() * 4));

    cpuText.innerText = `${cpuVal}%`;
    cpuBar.style.width = `${cpuVal}%`;
    ramText.innerText = `${ramVal.toFixed(1)} MB / 128 MB`;
    ramBar.style.width = `${(ramVal / 128) * 100}%`;

    // Refresh rows list as well to show fluctuating CPU
    this.renderProcessRows(body);
  }
}
