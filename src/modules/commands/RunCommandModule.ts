import { ICommand } from './ICommand';
import { IExecutionContext, ICommandResult, IHelpDocument } from '@types';
import { VoltBus } from '@core/VoltBus';

export class RunCommandModule implements ICommand {
  public readonly name = 'run';
  public readonly aliases = [];
  public readonly description =
    'Primary zero-config language execution entry point. Automatically detects C, C++, Python, or Java and runs locally.';
  private bus: VoltBus = VoltBus.getInstance();

  public async execute(
    args: string[],
    _flags: Map<string, boolean>,
    _context: IExecutionContext
  ): Promise<ICommandResult> {
    const targetArg = args.length > 0 ? args[0] : undefined;
    this.bus.publish('EXEC:RUN_REQUEST', { targetArg });
    return { success: true, exitCode: 0 };
  }

  public getHelpDocumentation(): IHelpDocument {
    return {
      commandName: this.name,
      description: this.description,
      syntax: `run [filename]`,
      examples: [`run`, `run main.cpp`, `run hello.py`]
    };
  }
}
