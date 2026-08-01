import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';
import { WindowManager } from '@core/WindowManager';

export class TaskkillCommandModule implements ICommand {
  public readonly name = 'taskkill';
  public readonly aliases = ['kill'];
  public readonly description =
    'Terminates an active window application thread using its Process ID (PID).';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: taskkill <pid> [or] kill <pid>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }

    const pid = parseInt(args[0], 10);
    if (isNaN(pid)) {
      const errMsg = `[Error] Invalid Process ID (PID) format: '${args[0]}'. PID must be a number.\n`;
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }

    const winMgr = WindowManager.getInstance();
    const openWins = winMgr.getWindows();

    // Map PID to window index (PID mapping is 200 + idx * 13)
    let targetWinId: string | null = null;
    let targetTitle = '';

    openWins.forEach((win, idx) => {
      const winPid = 200 + idx * 13;
      if (winPid === pid) {
        targetWinId = win.id;
        targetTitle = win.title;
      }
    });

    if (targetWinId) {
      winMgr.closeWindow(targetWinId);
      const successMsg = `[Success] Terminated application window: "${targetTitle}" (PID: ${pid}).\n`;
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: successMsg });
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Killed process: ${targetTitle} (PID: ${pid})`,
        type: 'info'
      });
      return { success: true, exitCode: 0 };
    } else {
      const errMsg = `[Error] Process with ID ${pid} not found or represents a protected kernel thread.\n`;
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `taskkill <pid> [or] kill <pid>`,
      examples: [`taskkill 200`, `kill 213`]
    };
  }
}
