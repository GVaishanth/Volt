import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { ReOSBus } from '@core/ReOSBus';

export class TreeCommandModule implements ICommand {
  public readonly name = 'tree';
  public readonly aliases = [];
  public readonly description =
    'Outputs an ASCII directory hierarchy for the current working directory.';
  private bus: ReOSBus = ReOSBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('VFS:DIR_REQUEST', {
      targetPath: _context.cwd,
      detailed: true,
      showAll: true
    });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `tree [path]`,
      examples: [`tree`, `tree C:\\Users\\ReOS`]
    };
  }
}
