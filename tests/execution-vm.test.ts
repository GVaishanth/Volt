import { describe, it, expect, beforeEach } from 'vitest';
import { VFSModule } from '@modules/filesystem/VFSModule';
import { ExecutionEngineModule } from '@modules/execution/ExecutionEngineModule';
import { VoltBus } from '@core/VoltBus';

describe('Volt ExecutionEngine Interactive VM', () => {
  let vfs: VFSModule;
  let bus: VoltBus;

  beforeEach(async () => {
    // Reset bus listeners by clearing internal map via hack (singleton)
    bus = VoltBus.getInstance();
    (bus as unknown as { listeners: Map<unknown, unknown> }).listeners = new Map();

    vfs = new VFSModule();
    await vfs.init();

    // Force capability profile so worker check passes in happy-dom
    const { CapabilityProfiler } = await import('@core/CapabilityProfiler');
    (CapabilityProfiler as unknown as { profile: unknown }).profile = {
      hasWebAssembly: true,
      hasOPFS: false,
      hasIndexedDB: true,
      hasSharedArrayBuffer: false,
      hasWebWorkers: true,
      preferredFilesystem: 'IndexedDB',
      preferredMemoryTransport: 'MessageChannel',
      preferredTerminalRenderer: 'DOM'
    };
  });

  function captureExecution(inputs: string[]) {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const stdinPrompts: string[] = [];

    let inputIdx = 0;

    const unsubOut = bus.subscribe('EXEC:STDOUT_CHUNK', (e) => {
      const txt = (e.payload as any)?.text || '';
      stdout.push(txt);
    });
    const unsubErr = bus.subscribe('EXEC:STDERR_CHUNK', (e) => {
      const txt = (e.payload as any)?.text || '';
      stderr.push(txt);
    });

    const unsubStdin = bus.subscribe('EXEC:STDIN_REQUEST', (e) => {
      const promptText = (e.payload as any)?.promptText || '? ';
      stdinPrompts.push(promptText);
      // Respond async
      setTimeout(() => {
        const responseText = inputs[inputIdx++] ?? '';
        bus.publish('EXEC:STDIN_RESPONSE', { text: responseText });
      }, 10);
    });

    return {
      stdout,
      stderr,
      stdinPrompts,
      cleanup: () => {
        unsubOut();
        unsubErr();
        unsubStdin();
      }
    };
  }

  it('Python: adult branch should only print adult message', async () => {
    const code = `
name = input("Enter your name for Volt test: ")
age = int(input("Enter your age: "))

if age >= 18:
    print(f"Access Granted to {name} (Adult: {age} yrs)")
else:
    print(f"Restricted Access for {name} (Minor: {age} yrs)")
`.trim();

    await vfs.writeFile('C:\\Users\\Volt\\test_adult.py', code);

    const cap = captureExecution(['Alice', '25']);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('Python', 'C:\\Users\\Volt\\test_adult.py', vfs);
    cap.cleanup();

    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(cap.stdinPrompts[0]).toContain('Enter your name');
    expect(cap.stdinPrompts[1]).toContain('Enter your age');
    expect(allOut).toContain('Access Granted to Alice (Adult: 25 yrs)');
    expect(allOut).not.toContain('Restricted Access');
  });

  it('Python: minor branch should only print minor message', async () => {
    const code = `
name = input("Enter your name for Volt test: ")
age = int(input("Enter your age: "))

if age >= 18:
    print(f"Access Granted to {name} (Adult: {age} yrs)")
else:
    print(f"Restricted Access for {name} (Minor: {age} yrs)")
`.trim();
    await vfs.writeFile('C:\\Users\\Volt\\test_minor.py', code);
    const cap = captureExecution(['Bob', '12']);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('Python', 'C:\\Users\\Volt\\test_minor.py', vfs);
    cap.cleanup();
    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(allOut).toContain('Restricted Access for Bob (Minor: 12 yrs)');
    expect(allOut).not.toContain('Access Granted');
  });

  it('Python: print with concatenation should not crash', async () => {
    const code = `
import sys
print("Volt Local Python Runtime - Python " + sys.version.split()[0])
print("Hello World")
`.trim();
    await vfs.writeFile('C:\\Users\\Volt\\test_concat.py', code);
    const cap = captureExecution([]);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('Python', 'C:\\Users\\Volt\\test_concat.py', vfs);
    cap.cleanup();
    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(allOut).toContain('Hello World');
    // The first print contains sys.version logic – it should either print something sensible or at least not block; we just ensure second line prints
  });

  it('C++: Admin branch', async () => {
    const code = `
#include <iostream>
#include <string>
int main() {
    std::string name;
    std::cout << "Enter your name for Volt C++ test: ";
    std::cin >> name;
    if (name == "Admin" || name == "Engineer") {
        std::cout << "Welcome Admin! High privileges active." << std::endl;
    } else {
        std::cout << "Welcome to Volt C++ Engine, " << name << "!" << std::endl;
    }
    return 0;
}
`.trim();
    await vfs.writeFile('C:\\Users\\Volt\\test_admin.cpp', code);
    const cap = captureExecution(['Admin']);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('C++', 'C:\\Users\\Volt\\test_admin.cpp', vfs);
    cap.cleanup();
    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(allOut).toContain('Welcome Admin! High privileges active.');
    expect(allOut).not.toContain('Welcome to Volt C++ Engine');
  });

  it('C++: non-admin branch', async () => {
    const code = `
#include <iostream>
#include <string>
int main() {
    std::string name;
    std::cout << "Enter your name for Volt C++ test: ";
    std::cin >> name;
    if (name == "Admin" || name == "Engineer") {
        std::cout << "Welcome Admin! High privileges active." << std::endl;
    } else {
        std::cout << "Welcome to Volt C++ Engine, " << name << "!" << std::endl;
    }
    return 0;
}
`.trim();
    await vfs.writeFile('C:\\Users\\Volt\\test_user.cpp', code);
    const cap = captureExecution(['Bob']);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('C++', 'C:\\Users\\Volt\\test_user.cpp', vfs);
    cap.cleanup();
    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(allOut).toContain('Welcome to Volt C++ Engine, Bob!');
    expect(allOut).not.toContain('High privileges active');
  });

  it('Java: scanner input', async () => {
    const code = `
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        System.out.println("Volt Java JVM Execution inside WebAssembly!");
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter username: ");
        String user = scanner.nextLine();
        System.out.println("Java JVM running for: " + user);
    }
}
`.trim();
    await vfs.writeFile('C:\\Users\\Volt\\TestJava.java', code);
    const cap = captureExecution(['Charlie']);
    const engine = new ExecutionEngineModule();
    const exit = await engine.spawnProcess('Java', 'C:\\Users\\Volt\\TestJava.java', vfs);
    cap.cleanup();
    const allOut = cap.stdout.join('');
    expect(exit).toBe(0);
    expect(allOut).toContain('Java JVM running for: Charlie');
  });
});
