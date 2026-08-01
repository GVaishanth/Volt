import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class FindCommandModule implements ICommand {
  public readonly name = 'find';
  public readonly aliases = ['grep'];
  public readonly description =
    'Searches for a text string inside files within the current working directory.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      const errMsg =
        'The syntax of the command is incorrect.\nSyntax: find "<search_string>" [filename]\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    const query = args[0].replace(/^["']|["']$/g, '');
    const targetFile = args.length > 1 ? args[1] : undefined;
    this.bus.publish('VFS:FIND_REQUEST', { query, targetFile });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `find "<search_string>" [filename] [or] grep <search_string> [filename]`,
      examples: [`find "main" main.cpp`, `grep "include"`]
    };
  }
}
