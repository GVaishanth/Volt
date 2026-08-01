import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class GrepCommandModule implements ICommand {
  public readonly name = 'grep';
  public readonly aliases = [];
  public readonly description =
    'Searches text files for occurrences of a string query, streaming results with line numbers.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length < 2) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: grep <query> <filename>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }

    const query = args[0];
    const targetFile = args[1];

    // Trigger search over event bus
    this.bus.publish('VFS:FIND_REQUEST', { query, targetFile });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `grep <query> <filename>`,
      examples: [`grep welcome README.txt`, `grep include main.cpp`]
    };
  }
}
