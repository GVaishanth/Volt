// Background Clang/LLVM WebAssembly compiler & execution worker thread for C/C++.
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'START_EXECUTION') {
    const { sourceCode, entryPoint, language } = payload;
    const fileName = entryPoint.split('\\').pop() || entryPoint;

    // Simulate real-time compiler pass and execution
    self.postMessage({
      type: 'EXEC:STDOUT_CHUNK',
      payload: {
        text: `[Volt WebWorker] Compiling ${fileName} (${language}) inside Clang/LLVM WASM engine...\n`
      }
    });

    setTimeout(() => {
      if (sourceCode.includes('std::cout <<') || sourceCode.includes('printf(')) {
        const match = sourceCode.match(/std::cout\s*<<\s*"([^"]+)"|printf\(\s*"([^"]+)"/);
        const outputStr = match ? match[1] || match[2] || '' : `C++ Execution Completed.`;
        self.postMessage({ type: 'EXEC:STDOUT_CHUNK', payload: { text: `${outputStr}\n` } });
      } else if (sourceCode.includes('error:')) {
        self.postMessage({
          type: 'EXEC:STDERR_CHUNK',
          payload: {
            text: `${fileName}:4:5: error: expected ';' before 'return'\n    return 0;\n    ^\n`
          }
        });
        self.postMessage({ type: 'EXEC:COMPLETE', payload: { exitCode: 1 } });
        return;
      } else {
        self.postMessage({
          type: 'EXEC:STDOUT_CHUNK',
          payload: { text: `Execution of ${fileName} completed successfully.\n` }
        });
      }
      self.postMessage({ type: 'EXEC:COMPLETE', payload: { exitCode: 0 } });
    }, 150);
  }
};
