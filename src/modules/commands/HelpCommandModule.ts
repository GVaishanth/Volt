import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class HelpCommandModule implements ICommand {
  public readonly name = 'help';
  public readonly aliases = ['?'];
  public readonly description =
    'Interactive system documentation engine displaying command syntax, description, and examples.';
  private bus: VoltBus = VoltBus.getInstance();
  private getDispatcher: () => any;

  constructor(getDispatcher: () => any) {
    this.getDispatcher = getDispatcher;
  }

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const dispatcher = this.getDispatcher();
    if (args.length === 0) {
      const allCommands: ICommand[] = dispatcher ? dispatcher.getAllCommands() : [];
      let text = `Volt — 100% Local-First Development Operating Environment\n\n`;
      text += `Available Commands:\n`;
      for (const cmd of allCommands.sort((a, b) => a.name.localeCompare(b.name))) {
        const aliasText = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
        const paddedName = (cmd.name + aliasText).padEnd(22, ' ');
        text += `  ${paddedName} ${cmd.description}\n`;
      }
      text += `\nType 'help <command_name>' for detailed documentation, syntax, and examples.\n`;
      this.bus.publish('EXEC:STDOUT_CHUNK', { text });
      return { success: true, exitCode: 0 };
    } else {
      const targetName = args[0].toLowerCase();
      const targetCmd: ICommand | undefined = dispatcher
        ? dispatcher.getCommand(targetName)
        : undefined;
      if (!targetCmd) {
        const errMsg = `[Help Error] No command found with name '${targetName}'. Type help for a full list.\n`;
        this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
        return { success: false, exitCode: 1, error: errMsg };
      }
      const doc = targetCmd.getHelpDocumentation();
      let text = `\nCommand: ${doc.commandName.toUpperCase()}\n`;
      text += `Description: ${doc.description}\n`;
      text += `Syntax:      ${doc.syntax}\n`;
      text += `Examples:\n`;
      for (const ex of doc.examples) {
        text += `  > ${ex}\n`;
      }
      text += `\n`;
      this.bus.publish('EXEC:STDOUT_CHUNK', { text });
      return { success: true, exitCode: 0 };
    }
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `help [command_name]`,
      examples: [`help`, `help run`, `help mkdir`, `help cd`, `help edit`, `help clr`]
    };
  }
}
