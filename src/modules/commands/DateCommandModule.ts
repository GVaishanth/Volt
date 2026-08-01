import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class DateCommandModule implements ICommand {
  public readonly name = 'date';
  public readonly aliases = [];
  public readonly description = 'Displays the current local system date.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const today = new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    this.bus.publish('EXEC:STDOUT_CHUNK', { text: `The current date is: ${today}\n` });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `date`,
      examples: [`date`]
    };
  }
}
