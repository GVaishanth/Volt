import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class MoveCommandModule implements ICommand {
  public readonly name = 'move';
  public readonly aliases = ['mv'];
  public readonly description = 'Relocates target files or directories across the virtual disk.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length < 2) {
      const errMsg =
        'The syntax of the command is incorrect.\nSyntax: move <source> <destination>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    this.bus.publish('VFS:MOVE_REQUEST', { source: args[0], destination: args[1] });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `move <source> <destination>`,
      examples: [`move main.cpp src\\main.cpp`]
    };
  }
}
