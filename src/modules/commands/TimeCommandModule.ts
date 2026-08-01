import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class TimeCommandModule implements ICommand {
  public readonly name = 'time';
  public readonly aliases = [];
  public readonly description = 'Displays the current local system time.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const now = new Date().toLocaleTimeString();
    this.bus.publish('EXEC:STDOUT_CHUNK', { text: `The current time is: ${now}\n` });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `time`,
      examples: [`time`]
    };
  }
}
