import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class EchoCommandModule implements ICommand {
  public readonly name = 'echo';
  public readonly aliases = [];
  public readonly description =
    'Prints text to the terminal or redirects output to a target file (`echo text > file.txt`).';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const raw = args.join(' ');
    if (raw.includes(' > ')) {
      const parts = raw.split(' > ');
      const content = parts[0].trim() + '\n';
      const targetPath = parts[1].trim();
      this.bus.publish('VFS:COPY_REQUEST', {
        source: 'echo_virtual_buf',
        destination: targetPath,
        rawContent: content
      });
    } else {
      this.bus.publish('EXEC:STDOUT_CHUNK', { text: `${raw}\n` });
    }
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `echo <text> [> filename]`,
      examples: [`echo Hello World`, `echo int main() {} > test.cpp`]
    };
  }
}
