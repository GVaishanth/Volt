import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class CdCommandModule implements ICommand {
  public readonly name = 'cd';
  public readonly aliases = ['chdir'];
  public readonly description =
    'Modifies the current working directory inside the virtual filesystem.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: `${context.cwd}\n` });
      return { success: true, exitCode: 0, output: context.cwd };
    }

    const targetPath = args.join(' ');
    // Request VFS check or publish CD request
    this.bus.publish('VFS:CD_REQUEST', { targetPath });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `cd [path] [or] chdir [path]`,
      examples: [`cd src`, `cd ..`, `cd C:\\Users\\Volt`]
    };
  }
}
