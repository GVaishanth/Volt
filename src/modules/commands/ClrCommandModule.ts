import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class ClrCommandModule implements ICommand {
  public readonly name = 'clr';
  public readonly aliases = ['cls'];
  public readonly description =
    'The official built-in terminal clear command. Flushes scrollback (`cls` exists as compatibility alias).';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('CMD:CLEAR');
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `clr [or] cls`,
      examples: [`clr`]
    };
  }
}
