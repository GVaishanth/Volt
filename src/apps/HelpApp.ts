import { OSWindow } from '@core/WindowManager';

export class HelpApp {
  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '📖',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'auto';
        body.style.backgroundColor = '#151515';
        body.style.color = '#fff';
        body.style.fontFamily = 'Consolas, monospace';
        body.style.padding = '16px';

        body.innerHTML = `
          <div style="font-weight: bold; font-size: 16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px; color:#ffa500;">📖 Volt V2 USER GUIDE</div>
          
          <div style="margin-top: 12px; line-height: 1.5; font-size: 13px; display:flex; flex-direction:column; gap:12px;">
            <div>
              <strong style="color: #00ff66;">⌨️ KEYBOARD SHORTCUTS</strong>
              <div style="display:flex; flex-direction:column; gap:4px; padding-left:10px; margin-top:4px;">
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Space + E</span> - Open File Explorer app</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Space + T</span> - Open Terminal app</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Space + R</span> - Open User Guide / Help app</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Space + D</span> - Show Desktop / Toggle Minimize All</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Space + P</span> - Open Command Palette</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Ctrl + Alt + T</span> - Open Terminal (fallback)</div>
                <div>• <span style="background:#222; padding:1px 5px; border-radius:3px;">Ctrl + Shift + P</span> - Command Palette (fallback)</div>
              </div>
            </div>

            <div>
              <strong style="color: #00ff66;">🌐 MULTI-APP WORKSPACE</strong>
              <p style="opacity:0.8; margin-top:4px;">Volt V2 features a fully integrated window manager. You can drag windows by their headers, resize them using the bottom-right corner, maximize, minimize, or snap them to the left or right halves of the screen by dragging them all the way to the side borders!</p>
            </div>

            <div>
              <strong style="color: #00ff66;">📁 SIMULATED WINDOWS FILESYSTEM</strong>
              <p style="opacity:0.8; margin-top:4px;">Files are persisted locally via Origin Private File System (OPFS) and IndexedDB. In File Explorer, use Right-Click on any file to open the context menu for advanced actions like Renaming, Duplicating, Deleting (sends to Recycle Bin), Cutting, Copying, or Pasting across directories. You can also import local files by dragging them over the Desktop, or export your complete filesystem as a single portable JSON file.</p>
            </div>

            <div>
              <strong style="color: #00ff66;">⚡ LOCAL CODE RUNTIMES</strong>
              <p style="opacity:0.8; margin-top:4px;">You can write and execute real code inside the browser! Supported local interpreters include Python (Pyodide WebAssembly), C/C++ (Clang LLVM local runtimes), Java (JVM runtime), JavaScript (V8 Engine), and Bash (Shell Scripts). Outputs, errors, and live stdin prompts are dynamically captured.</p>
            </div>
            
            <div style="text-align: center; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px; font-size:11px; opacity:0.5;">
              Volt — Your portable development OS in-browser. Version 2.0.0.
            </div>
          </div>
        `;
      }
    };
  }
}
