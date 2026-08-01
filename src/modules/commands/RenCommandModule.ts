import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class RenCommandModule implements ICommand {
  public readonly name = 'ren';
  public readonly aliases = ['rename'];
  public readonly description = 'Renames target files or directories in place.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length < 2) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: ren <old_name> <new_name>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    this.bus.publish('VFS:RENAME_REQUEST', { oldName: args[0], newName: args[1] });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `ren <old_name> <new_name>`,
      examples: [`ren main.cpp app.cpp`]
    };
  }
}
