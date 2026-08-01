import { describe, it, expect, beforeEach } from 'vitest';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { CommandDispatcher } from '@modules/commands/CommandDispatcher';
import { LanguageDetectionModule } from '@modules/execution/LanguageDetectionModule';
import {
  CdCommandModule, DirCommandModule, MkdirCommandModule, DelCommandModule,
  CopyCommandModule, MoveCommandModule, RenCommandModule, ClrCommandModule,
  TypeCommandModule, EditCommandModule, RunCommandModule, VersionCommandModule,
  HelpCommandModule
} from '@modules/commands';

describe('Volt Core System Integration Tests', () => {
  let vfs: VFSModule;
  let dispatcher: CommandDispatcher;
  let detector: LanguageDetectionModule;

  beforeEach(async () => {
    // Clean any leftover storage data to prevent pollution
    try {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof indexedDB !== 'undefined') {
        const dbNames = ['volt_vfs_db_v1'];
        for (const name of dbNames) {
          indexedDB.deleteDatabase(name);
        }
      }
    } catch { /* ignore */ }

    vfs = new VFSModule();
    await vfs.init();

    dispatcher = new CommandDispatcher();
    dispatcher.registerCommand(new CdCommandModule());
    dispatcher.registerCommand(new DirCommandModule());
    dispatcher.registerCommand(new MkdirCommandModule());
    dispatcher.registerCommand(new DelCommandModule());
    dispatcher.registerCommand(new CopyCommandModule());
    dispatcher.registerCommand(new MoveCommandModule());
    dispatcher.registerCommand(new RenCommandModule());
    dispatcher.registerCommand(new ClrCommandModule());
    dispatcher.registerCommand(new TypeCommandModule());
    dispatcher.registerCommand(new EditCommandModule());
    dispatcher.registerCommand(new RunCommandModule());
    dispatcher.registerCommand(new VersionCommandModule());
    dispatcher.registerCommand(new HelpCommandModule(() => dispatcher));

    detector = new LanguageDetectionModule();
  });

  it('should initialize VFS with default sample workspace', async () => {
    const entries = await vfs.readdir('C:\\Users\\Volt');
    const names = entries.map(e => e.name);
    expect(names).toContain('main.cpp');
    expect(names).toContain('hello.py');
    expect(names).toContain('Main.java');
    expect(names).toContain('README.txt');
  });

  it('should create directories and files across the virtual filesystem', async () => {
    await vfs.mkdir('C:\\Users\\Volt\\projects\\demo');
    await vfs.writeFile('C:\\Users\\Volt\\projects\\demo\\app.c', '#include <stdio.h>\nint main() { return 0; }');
    
    expect(await vfs.exists('C:\\Users\\Volt\\projects\\demo\\app.c')).toBe(true);
    const content = await vfs.readFileAsText('C:\\Users\\Volt\\projects\\demo\\app.c');
    expect(content).toContain('#include <stdio.h>');
  });

  it('should resolve POSIX/Linux command aliases and built-in execution', async () => {
    const context = { cwd: 'C:\\Users\\Volt', terminalBufferId: 'cmd-1', activeEditorFile: null };
    
    // Test `pwd`
    const pwdRes = await dispatcher.dispatch('pwd', context);
    expect(pwdRes.success).toBe(true);
    expect(pwdRes.output).toBe('C:\\Users\\Volt');

    // Test `ls` -> `dir`
    const lsRes = await dispatcher.dispatch('ls', context);
    expect(lsRes.success).toBe(true);
  });

  it('should suggest corrections using Levenshtein distance for typos', async () => {
    const context = { cwd: 'C:\\Users\\Volt', terminalBufferId: 'cmd-1', activeEditorFile: null };
    
    const typoRes = await dispatcher.dispatch('mkdr new_folder', context);
    expect(typoRes.success).toBe(false);
    expect(typoRes.error).toContain('Did you mean:\nmkdir');
  });

  it('should parse double-quoted arguments with spaces as a single parameter', async () => {
    const context = { cwd: 'C:\\Users\\Volt', terminalBufferId: 'cmd-1', activeEditorFile: null };
    
    // Register a local subscription to VFS:COPY_REQUEST to simulate the shell listener
    const bus = (dispatcher as any).bus;
    let copiedSource = '';
    let copiedDest = '';
    bus.subscribe('VFS:COPY_REQUEST', (e: any) => {
      copiedSource = e.payload.source;
      copiedDest = e.payload.destination;
    });

    const copyRes = await dispatcher.dispatch('copy "spaced file.txt" "another spaced file.txt"', context);
    expect(copyRes.success).toBe(true);
    expect(copiedSource).toBe('spaced file.txt');
    expect(copiedDest).toBe('another spaced file.txt');
  });

  it('should deterministically detect programming language using 5-step heuristics', async () => {
    // Check via extensions
    const resCpp = await detector.detect('test.cpp', 'C:\\Users\\Volt');
    expect(resCpp.language).toBe('C++');
    expect(resCpp.confidence).toBe('HIGH');

    // Check via content heuristics when extension or buffer is tested
    await vfs.writeFile('C:\\Users\\Volt\\script', 'import sys\nprint("hello")');
    const resPy = await detector.detect('C:\\Users\\Volt\\script', 'C:\\Users\\Volt', vfs);
    expect(resPy.language).toBe('Python');
    expect(resPy.confidence).toBe('HIGH');
  });
});
