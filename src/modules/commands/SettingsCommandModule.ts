import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class SettingsCommandModule implements ICommand {
  public readonly name = 'settings';
  public readonly aliases = [];
  public readonly description = 'Toggles or opens the Settings overlay UI (`⚙ Settings`).';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('SETTINGS:TOGGLE');
    this.bus.publish('EXEC:STDOUT_CHUNK', {
      text: `Opened Settings Overlay. Press Esc or click Close (×) to dismiss.\n`
    });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `settings`,
      examples: [`settings`]
    };
  }
}
