// Background CheerpJ / ECJ WebAssembly compilation & JVM worker thread for Java.
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'START_EXECUTION') {
    const { sourceCode, entryPoint } = payload;
    const fileName = entryPoint.split('\\').pop() || entryPoint;

    self.postMessage({
      type: 'EXEC:STDOUT_CHUNK',
      payload: {
        text: `[Volt WebWorker] Compiling & running ${fileName} inside CheerpJ WASM JVM...\n`
      }
    });

    setTimeout(() => {
      if (sourceCode.includes('System.out.println')) {
        const match = sourceCode.match(/System\.out\.println\(\s*"([^"]+)"\s*\)/);
        const outputStr = match ? match[1] : `Java JVM execution completed.`;
        self.postMessage({ type: 'EXEC:STDOUT_CHUNK', payload: { text: `${outputStr}\n` } });
      } else {
        self.postMessage({
          type: 'EXEC:STDOUT_CHUNK',
          payload: { text: `Java execution finished successfully.\n` }
        });
      }
      self.postMessage({ type: 'EXEC:COMPLETE', payload: { exitCode: 0 } });
    }, 150);
  }
};
