import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';
import { SYSTEM_CONSTANTS } from '@core/Constants';

export class ThemeCommandModule implements ICommand {
  public readonly name = 'theme';
  public readonly aliases = [];
  public readonly description =
    'Lists available built-in themes or switches active theme (`theme Matrix`, `theme Light`).';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      let out = `Available Volt Themes:\n`;
      for (const t of SYSTEM_CONSTANTS.SUPPORTED_THEMES) {
        out += `  - ${t}\n`;
      }
      out += `\nType: theme <name> to switch (e.g., theme Matrix, theme Light, theme VS Code Dark+)\n`;
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: out });
      return { success: true, exitCode: 0 };
    }

    const query = args.join(' ').toLowerCase();
    const matched = SYSTEM_CONSTANTS.SUPPORTED_THEMES.find(t => t.toLowerCase().includes(query));
    if (matched) {
      this.bus.publish('THEME:CHANGED', { theme: matched });
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: `Theme updated to: ${matched}\n` });
      return { success: true, exitCode: 0 };
    } else {
      const err = `Theme '${args.join(' ')}' not found. Type 'theme' to see available themes.\n`;
      this.bus.publish('EXEC:STDERR_CHUNK', { text: err });
      return { success: false, exitCode: 1, error: err };
    }
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `theme [theme_name]`,
      examples: [`theme`, `theme Matrix`, `theme Light`, `theme Classic CMD`]
    };
  }
}
