import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class DownloadCommandModule implements ICommand {
  public readonly name = 'download';
  public readonly aliases = [];
  public readonly description =
    'Downloads a target file from the virtual disk directly to your local PC disk as a regular browser download.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    context: IExecutionContext
  ): Promise<ICommandResult> {
    if (args.length === 0) {
      const errMsg = 'The syntax of the command is incorrect.\nSyntax: download <filename>\n';
      this.bus.publish('EXEC:STDERR_CHUNK', { text: errMsg });
      return { success: false, exitCode: 1, error: errMsg };
    }
    const target = args.join(' ');
    this.bus.publish('FILE:DOWNLOAD_REQUEST', { target, cwd: context.cwd });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `download <filename>`,
      examples: [`download main.cpp`, `download README.txt`]
    };
  }
}
