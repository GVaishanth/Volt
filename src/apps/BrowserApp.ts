import { VFSModule } from '@modules/filesystem/VFSModule';
import { OSWindow } from '@core/WindowManager';
import { VoltBus } from '@core/VoltBus';

export class BrowserApp {
  private vfs: VFSModule;
  private bus = VoltBus.getInstance();
  private currentUrl: string = 'http://localhost:3000/index.html';
  private history: string[] = ['http://localhost:3000/index.html'];
  private historyIndex: number = 0;
  private activeTab: 'preview' | 'api-tester' = 'preview';

  // API Tester State
  private apiMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
  private apiUrl: string = 'https://jsonplaceholder.typicode.com/todos/1';
  private apiBody: string = '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}';
  private apiResponse: string = '';
  private apiStatus: string = '';

  constructor(vfs: VFSModule) {
    this.vfs = vfs;
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '🌐',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = '#1e1e1e';
        body.style.color = '#d4d4d4';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderBrowser(body);
      }
    };
  }

  private renderBrowser(body: HTMLElement) {
    body.innerHTML = `
      <!-- App Tabs -->
      <div class="browser-tabs" style="display: flex; background: #121212; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
        <div class="browser-tab-item tab-preview ${this.activeTab === 'preview' ? 'active' : ''}" style="padding: 8px 16px; cursor: pointer; border-right: 1px solid rgba(255,255,255,0.08); font-size:13px; font-weight:bold;">🌐 Web Preview Server</div>
        <div class="browser-tab-item tab-api ${this.activeTab === 'api-tester' ? 'active' : ''}" style="padding: 8px 16px; cursor: pointer; border-right: 1px solid rgba(255,255,255,0.08); font-size:13px; font-weight:bold;">🛠️ API Client (Postman)</div>
      </div>

      <!-- Tab Content Area -->
      <div class="browser-content-area" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;"></div>
    `;

    body.querySelectorAll('.browser-tab-item').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('tab-preview')) {
          this.activeTab = 'preview';
        } else {
          this.activeTab = 'api-tester';
        }
        this.renderBrowser(body);
      });
    });

    const contentArea = body.querySelector('.browser-content-area') as HTMLElement;
    if (this.activeTab === 'preview') {
      this.renderWebPreview(contentArea);
    } else {
      this.renderApiTester(contentArea);
    }
  }

  private renderWebPreview(container: HTMLElement) {
    container.innerHTML = `
      <!-- Navigation Bar -->
      <div class="browser-navbar" style="padding: 6px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.15);">
        <button class="nav-btn btn-back" style="background:#ffffff12; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:2px 8px; cursor:pointer;" ${this.historyIndex === 0 ? 'disabled' : ''}>◀</button>
        <button class="nav-btn btn-forward" style="background:#ffffff12; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:2px 8px; cursor:pointer;" ${this.historyIndex === this.history.length - 1 ? 'disabled' : ''}>▶</button>
        <button class="nav-btn btn-reload" style="background:#ffffff12; border:1px solid rgba(255,255,255,0.1); color:inherit; padding:2px 8px; cursor:pointer;">🔄</button>
        <input class="nav-url-input" type="text" value="${this.currentUrl}" style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.18); color:#0f6; padding:3px 8px; font-family:inherit; font-size:13px;" />
      </div>

      <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
        <!-- HTML Preview Frame -->
        <iframe class="preview-iframe" style="flex: 1; border: none; background: #fff;" sandbox="allow-scripts"></iframe>

        <!-- Simulated DevTools Sidebar -->
        <div class="devtools-sidebar" style="width: 250px; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden; background: #151515;">
          <div style="padding: 6px 10px; background: #222; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.08);">BROWSER DEVTOOLS</div>
          <div class="devtools-console" style="flex: 1; overflow-y: auto; padding: 8px; font-size: 11px; color: #ffa500; font-family: inherit; line-height: 1.4; display: flex; flex-direction: column; gap: 4px;">
            <div style="color: #888;">[Console Loaded] listening for preview logs...</div>
          </div>
        </div>
      </div>
    `;

    const iframe = container.querySelector('.preview-iframe') as HTMLIFrameElement;
    const urlInput = container.querySelector('.nav-url-input') as HTMLInputElement;
    const btnBack = container.querySelector('.btn-back') as HTMLButtonElement;
    const btnForward = container.querySelector('.btn-forward') as HTMLButtonElement;
    const btnReload = container.querySelector('.btn-reload') as HTMLButtonElement;

    // Actions
    btnReload.addEventListener('click', () => this.loadPreview(iframe, container));
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        this.currentUrl = urlInput.value;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(this.currentUrl);
        this.historyIndex = this.history.length - 1;
        this.loadPreview(iframe, container);
      }
    });

    btnBack.addEventListener('click', () => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.currentUrl = this.history[this.historyIndex];
        urlInput.value = this.currentUrl;
        this.loadPreview(iframe, container);
      }
    });

    btnForward.addEventListener('click', () => {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.currentUrl = this.history[this.historyIndex];
        urlInput.value = this.currentUrl;
        this.loadPreview(iframe, container);
      }
    });

    this.loadPreview(iframe, container);
  }

  private async loadPreview(iframe: HTMLIFrameElement, container: HTMLElement) {
    const consoleEl = container.querySelector('.devtools-console') as HTMLElement;
    if (consoleEl) {
      consoleEl.innerHTML = `<div style="color: #888;">[Console Reloading] ...</div>`;
    }

    // Try to resolve the file from VFS
    let filename = 'index.html';
    const match = this.currentUrl.match(/localhost:3000\/(.*)$/);
    if (match && match[1]) {
      filename = match[1];
    }

    const fullPath = `C:\\Users\\Volt\\Projects\\${filename}`.replace(/\\+/g, '\\');
    const defaultFullPath = `C:\\Users\\Volt\\README.txt`;

    try {
      let content = '';
      if (await this.vfs.exists(fullPath)) {
        content = await this.vfs.readFileAsText(fullPath);
      } else if (filename === 'index.html') {
        // Create a default visual page since none exists yet
        content = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #fdfdfd; color: #333; }
              h1 { color: #007acc; }
              .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); max-width: 400px; margin: 0 auto; background: white; }
              button { background: #007acc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 15px; }
              button:hover { background: #005999; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🌐 Local Preview</h1>
              <p>Welcome to the V2 Local Preview Server!</p>
              <p style="font-size: 13px; color: #666;">Create <strong>C:\\Users\\Volt\\Projects\\index.html</strong> inside the File Explorer, then reload to preview your real HTML project live in-browser!</p>
              <button onclick="console.log('Button clicked at ' + new Date().toLocaleTimeString())">Test Console Log</button>
            </div>
            <script>
              // Intercept console.log and forward to devtools
              const origLog = console.log;
              console.log = function(...args) {
                origLog(...args);
                window.parent.postMessage({ type: 'CONSOLE_LOG', text: args.join(' ') }, '*');
              };
            </script>
          </body>
          </html>
        `;
      } else {
        content = await this.vfs.readFileAsText(defaultFullPath);
        content = `<html><body style="background:#f0f0f0;font-family:monospace;white-space:pre;padding:20px;">${content}</body></html>`;
      }

      // Read sibling CSS/JS if embedded
      // Let's create blob and load
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      iframe.src = URL.createObjectURL(blob);

      // Listen for iframe log messages
      const onMessage = (e: MessageEvent) => {
        if (e.data && e.type === 'message' && e.data.type === 'CONSOLE_LOG') {
          if (consoleEl) {
            const row = document.createElement('div');
            row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
            row.style.padding = '2px 0';
            row.innerHTML = `<span style="color:#888;">[Log]</span> ${e.data.text}`;
            consoleEl.appendChild(row);
          }
        }
      };

      window.addEventListener('message', onMessage);

      // Cleanup previous listener on reload
      iframe.addEventListener('load', () => {
        if (consoleEl) {
          consoleEl.innerHTML = `<div style="color: #22c55e;">[DevTools Console] Page Loaded Successfully!</div>`;
        }
      });
    } catch (err) {
      iframe.srcdoc = `<html><body style="color:red;padding:20px;">Error loading page: ${(err as any).message}</body></html>`;
    }
  }

  private renderApiTester(container: HTMLElement) {
    container.innerHTML = `
      <div style="flex: 1; display: flex; overflow: hidden; background: #141414;">
        <!-- Request Builder Panel -->
        <div class="api-request-builder" style="flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; border-right: 1px solid rgba(255,255,255,0.08); overflow-y: auto;">
          <div style="font-weight: bold; font-size: 13px; color: #87cefa;">🚀 REQUEST BUILDER</div>
          
          <!-- Method & URL -->
          <div style="display: flex; gap: 6px;">
            <select class="api-method-select" style="background: #222; color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 4px; font-family: inherit;">
              <option value="GET" ${this.apiMethod === 'GET' ? 'selected' : ''}>GET</option>
              <option value="POST" ${this.apiMethod === 'POST' ? 'selected' : ''}>POST</option>
              <option value="PUT" ${this.apiMethod === 'PUT' ? 'selected' : ''}>PUT</option>
              <option value="DELETE" ${this.apiMethod === 'DELETE' ? 'selected' : ''}>DELETE</option>
            </select>
            <input class="api-url-input" type="text" value="${this.apiUrl}" style="flex: 1; background: #000; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 4px 8px; font-family: inherit; font-size:12px;" />
            <button class="api-send-btn" style="background: #007acc; color:#fff; border: none; padding: 4px 14px; cursor: pointer; font-weight: bold;">SEND</button>
          </div>

          <!-- Request Body (JSON) -->
          <div style="margin-top: 6px; display:flex; flex-direction:column; gap:4px; flex:1;">
            <label style="font-size: 11px; opacity: 0.6; font-weight: bold;">REQUEST BODY (JSON)</label>
            <textarea class="api-body-textarea" style="flex: 1; min-height: 120px; background: #050505; border: 1px solid rgba(255,255,255,0.12); color: #0f6; padding: 8px; font-family: inherit; font-size: 12px; resize: none; outline:none; white-space:pre; overflow:auto;">${this.apiBody}</textarea>
          </div>
        </div>

        <!-- Response Viewer Panel -->
        <div class="api-response-viewer" style="flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
          <div style="display:flex; justify-content:space-between;">
            <span style="font-weight: bold; font-size: 13px; color: #0f6;">📥 RESPONSE</span>
            <span class="api-status-badge" style="font-weight: bold; font-size: 12px; color: #ffa500;">${this.apiStatus}</span>
          </div>
          <textarea class="api-response-textarea" readonly style="flex: 1; background: #050505; border: 1px solid rgba(255,255,255,0.12); color: #fff; padding: 8px; font-family: inherit; font-size: 12px; resize: none; outline:none; overflow:auto; white-space:pre;" placeholder="No response yet. Click SEND to trigger request.">${this.apiResponse}</textarea>
        </div>
      </div>
    `;

    const select = container.querySelector('.api-method-select') as HTMLSelectElement;
    const urlInput = container.querySelector('.api-url-input') as HTMLInputElement;
    const bodyTextarea = container.querySelector('.api-body-textarea') as HTMLTextAreaElement;
    const sendBtn = container.querySelector('.api-send-btn') as HTMLButtonElement;
    const responseTextarea = container.querySelector(
      '.api-response-textarea'
    ) as HTMLTextAreaElement;
    const statusBadge = container.querySelector('.api-status-badge') as HTMLElement;

    select.addEventListener('change', () => {
      this.apiMethod = select.value as any;
    });

    urlInput.addEventListener('input', () => {
      this.apiUrl = urlInput.value;
    });

    bodyTextarea.addEventListener('input', () => {
      this.apiBody = bodyTextarea.value;
    });

    sendBtn.addEventListener('click', async () => {
      statusBadge.innerText = 'FETCHING...';
      responseTextarea.value = 'Requesting... Please wait...';

      try {
        const fetchOptions: RequestInit = {
          method: this.apiMethod,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        if (this.apiMethod !== 'GET' && this.apiBody.trim()) {
          fetchOptions.body = this.apiBody;
        }

        const t0 = performance.now();
        const response = await fetch(this.apiUrl, fetchOptions);
        const t1 = performance.now();
        const duration = (t1 - t0).toFixed(0);

        this.apiStatus = `${response.status} ${response.statusText} (${duration}ms)`;
        statusBadge.innerText = this.apiStatus;

        const data = await response.json();
        this.apiResponse = JSON.stringify(data, null, 2);
        responseTextarea.value = this.apiResponse;

        this.bus.publish('NOTIFICATION:ADD', {
          text: `API Request complete with Status: ${response.status}`,
          type: 'success'
        });
      } catch (err) {
        this.apiStatus = 'Error';
        statusBadge.innerText = 'Network Error';
        this.apiResponse = `[Network Request Failed]\nCould not connect to: ${this.apiUrl}\nDetails: ${(err as any).message}`;
        responseTextarea.value = this.apiResponse;
        this.bus.publish('NOTIFICATION:ADD', { text: 'API Request failed', type: 'error' });
      }
    });
  }
}
