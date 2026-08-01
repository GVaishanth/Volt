import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class ProjectsCommandModule implements ICommand {
  public readonly name = 'projects';
  public readonly aliases = [];
  public readonly description =
    'Lists top-level project directories inside C:\\Users\\Volt or switches directly between them.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length > 0) {
      const target = args[0];
      this.bus.publish('VFS:CD_REQUEST', { targetPath: `C:\\Users\\Volt\\${target}` });
    } else {
      this.bus.publish('VFS:PROJECTS_REQUEST');
    }
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `projects [project_name]`,
      examples: [`projects`, `projects demo`]
    };
  }
}
