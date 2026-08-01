import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult } from '@types';
import { LevenshteinUtil } from '@utils/levenshtein';
import { VoltBus } from '@core/VoltBus';

export interface ICommandDispatcher {
  registerCommand(command: ICommand): void;
  dispatch(rawInput: string, context: IExecutionContext): Promise<ICommandResult>;
  getAllCommands(): ICommand[];
  getCommand(name: string): ICommand | undefined;
}

export class CommandDispatcher implements ICommandDispatcher {
  private commands: Map<string, ICommand> = new Map();
  private levenshtein: LevenshteinUtil = new LevenshteinUtil();
  private bus: VoltBus = VoltBus.getInstance();

  public registerCommand(command: ICommand): void {
    this.commands.set(command.name.toLowerCase(), command);
    for (const alias of command.aliases) {
      this.commands.set(alias.toLowerCase(), command);
    }
  }

  public getCommand(name: string): ICommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  public getAllCommands(): ICommand[] {
    return Array.from(new Set(this.commands.values()));
  }

  public async dispatch(rawInput: string, context: IExecutionContext): Promise<ICommandResult> {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { success: true, exitCode: 0 };
    }

    // Parse tokens supporting double-quoted arguments
    const tokens: string[] = [];
    const tokenRegex = /[^\s"]+|"([^"]*)"/g;
    let match;
    while ((match = tokenRegex.exec(trimmed)) !== null) {
      if (match[1] !== undefined) {
        tokens.push(match[1]);
      } else {
        tokens.push(match[0]);
      }
    }

    let cmdName = tokens[0].toLowerCase();
    const args: string[] = [];
    const flags: Map<string, boolean> = new Map();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('/') || (token.startsWith('-') && token.length > 1)) {
        flags.set(token.replace(/^[/-]+/, '').toLowerCase(), true);
      } else {
        args.push(token);
      }
    }

    // POSIX / Linux built-in aliases mapping
    if (cmdName === 'ls') cmdName = 'dir';
    if (cmdName === 'cat') cmdName = 'type';
    if (cmdName === 'rm') cmdName = 'del';
    if (cmdName === 'pwd') {
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: `${context.cwd}\n` });
      return { success: true, exitCode: 0, output: context.cwd };
    }

    const command = this.commands.get(cmdName);
    if (command) {
      try {
        const result = await command.execute(args, flags, context);
        return result;
      } catch (err: any) {
        const errMsg = err?.message || 'Command execution aborted with error';
        this.bus.publish('EXEC:STDERR_CHUNK', { text: `[Command Error] ${errMsg}\n` });
        return { success: false, exitCode: 1, error: errMsg };
      }
    } else {
      // Levenshtein typo correction
      const allNames = Array.from(new Set(Array.from(this.commands.values()).map(c => c.name)));
      const closest = this.levenshtein.findClosestMatch(cmdName, allNames, 2);
      if (closest) {
        const suggestionMsg = `Did you mean:\n${closest}\n`;
        this.bus.publish('EXEC:STDERR_CHUNK', { text: suggestionMsg });
        return { success: false, exitCode: 1, error: suggestionMsg };
      } else {
        const unknownMsg = `'${tokens[0]}' is not recognized as an internal or external command, operable program or batch file.\nType help for a list of available commands.\n`;
        this.bus.publish('EXEC:STDERR_CHUNK', { text: unknownMsg });
        return { success: false, exitCode: 1, error: unknownMsg };
      }
    }
  }
}
