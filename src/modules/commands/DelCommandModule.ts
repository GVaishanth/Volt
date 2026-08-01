import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class DelCommandModule implements ICommand {
  public readonly name = 'del';
  public readonly aliases = ['rm', 'erase'];
  public readonly description =
    'Deletes target files from the virtual filesystem, verifying open file descriptor locks.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: del <filename>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    const targetPath = args.join(' ');
    this.bus.publish('VFS:DEL_REQUEST', { targetPath });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `del <filename> [or] rm <filename>`,
      examples: [`del main.o`, `rm test.py`]
    };
  }
}
