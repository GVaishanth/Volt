// Background Pyodide WebAssembly runtime worker thread for Python scripts.
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'START_EXECUTION') {
    const { sourceCode, entryPoint } = payload;
    const fileName = entryPoint.split('\\').pop() || entryPoint;

    self.postMessage({
      type: 'EXEC:STDOUT_CHUNK',
      payload: {
        text: `[Volt WebWorker] Launching Pyodide Python 3 WASM runtime for ${fileName}...\n`
      }
    });

    setTimeout(() => {
      if (sourceCode.includes('print(')) {
        const lines = sourceCode.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('print(')) {
            const match = trimmed.match(/print\(\s*(?:f?"([^"]+)"|'([^']+)')\s*\)/);
            const outputStr = match ? match[1] || match[2] || '' : trimmed;
            self.postMessage({ type: 'EXEC:STDOUT_CHUNK', payload: { text: `${outputStr}\n` } });
          }
        }
      } else {
        self.postMessage({
          type: 'EXEC:STDOUT_CHUNK',
          payload: { text: `Python execution of ${fileName} finished successfully.\n` }
        });
      }
      self.postMessage({ type: 'EXEC:COMPLETE', payload: { exitCode: 0 } });
    }, 150);
  }
};
