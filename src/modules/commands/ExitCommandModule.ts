import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class ExitCommandModule implements ICommand {
  public readonly name = 'exit';
  public readonly aliases = [];
  public readonly description =
    'Exits active editor buffers, resets session context, and flushes terminal.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('EDITOR:CLOSE_ALL');
    this.bus.publish('CMD:CLEAR');
    this.bus.publish('EXEC:STDOUT_CHUNK', { text: `Session reset. Welcome back to Volt!\n` });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `exit`,
      examples: [`exit`]
    };
  }
}
