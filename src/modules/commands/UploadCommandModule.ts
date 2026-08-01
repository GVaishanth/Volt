import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class UploadCommandModule implements ICommand {
  public readonly name = 'upload';
  public readonly aliases = [];
  public readonly description =
    'Triggers a native browser file selection dialog to upload files from your local PC directly into your current working directory.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    _args: string[],
    _flags: Map<string, boolean>,
    context: IExecutionContext
  ): Promise<ICommandResult> {
    this.bus.publish('FILE:UPLOAD_REQUEST', { cwd: context.cwd });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `upload`,
      examples: [`upload`]
    };
  }
}
