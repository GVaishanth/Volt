import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class TypeCommandModule implements ICommand {
  public readonly name = 'type';
  public readonly aliases = ['cat'];
  public readonly description =
    'Reads text file contents from VFS and streams directly to terminal standard output.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: type <filename>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    const targetPath = args.join(' ');
    this.bus.publish('VFS:TYPE_REQUEST', { targetPath });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `type <filename> [or] cat <filename>`,
      examples: [`type README.txt`, `cat main.cpp`]
    };
  }
}
