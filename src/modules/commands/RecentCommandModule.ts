import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class RecentCommandModule implements ICommand {
  public readonly name = 'recent';
  public readonly aliases = [];
  public readonly description =
    'Displays a list of recently edited or executed files across the virtual filesystem.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('VFS:RECENT_REQUEST');
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `recent`,
      examples: [`recent`]
    };
  }
}
