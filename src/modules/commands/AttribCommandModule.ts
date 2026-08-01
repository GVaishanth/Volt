import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class AttribCommandModule implements ICommand {
  public readonly name = 'attrib';
  public readonly aliases = [];
  public readonly description =
    'Displays file attributes (Archive, Directory, Read-Only flags) inside the virtual filesystem.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const targetPath = args.length > 0 ? args.join(' ') : '*.*';
    this.bus.publish('VFS:ATTRIB_REQUEST', { targetPath });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `attrib [filename]`,
      examples: [`attrib main.cpp`, `attrib *.*`]
    };
  }
}
