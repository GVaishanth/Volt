import { VFSModule } from '@modules/filesystem/VFSModule';
import { OSWindow } from '@core/WindowManager';
import { ReOSBus } from '@core/ReOSBus';

interface GitCommit {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  files: { path: string; content: string }[];
}

export class GitApp {
  private vfs: VFSModule;
  private bus = ReOSBus.getInstance();

  // Simulated Git Repository State
  private isInitialized = false;
  private currentBranch = 'main';
  private branches: string[] = ['main'];
  private stagedFiles: Set<string> = new Set();
  private commits: GitCommit[] = [];
  private activeView: 'status' | 'log' | 'diff' = 'status';
  private activeDiffFile: string | null = null;

  constructor(vfs: VFSModule) {
    this.vfs = vfs;
    this.loadGitState();
  }

  private loadGitState() {
    try {
      const state = localStorage.getItem('reos_git_state');
      if (state) {
        const parsed = JSON.parse(state);
        this.isInitialized = parsed.isInitialized;
        this.currentBranch = parsed.currentBranch;
        this.branches = parsed.branches;
        this.commits = parsed.commits;
      }
    } catch {
      /* ignore */
    }
  }

  private saveGitState() {
    localStorage.setItem(
      'reos_git_state',
      JSON.stringify({
        isInitialized: this.isInitialized,
        currentBranch: this.currentBranch,
        branches: this.branches,
        commits: this.commits
      })
    );
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '🐙',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = '#181818';
        body.style.color = '#fff';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderGit(body);
      }
    };
  }

  private renderGit(body: HTMLElement) {
    if (!this.isInitialized) {
      body.innerHTML = `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 20px;">
          <span style="font-size: 48px;">🐙</span>
          <div style="font-size: 16px; font-weight: bold; text-align: center;">No Local Git Repository Detected</div>
          <p style="font-size: 13px; opacity:0.6; text-align:center; max-width: 400px; line-height: 1.5;">Initialize a local repository in Re-OS to start tracking file version histories, managing development branches, and comparing changes over time!</p>
          <button class="git-init-btn" style="background:#007acc; border:none; color:#fff; font-weight:bold; font-family:inherit; padding:8px 24px; font-size:13px; border-radius:4px; cursor:pointer;">git init</button>
        </div>
      `;

      body.querySelector('.git-init-btn')?.addEventListener('click', () => {
        this.isInitialized = true;
        this.saveGitState();
        this.bus.publish('NOTIFICATION:ADD', {
          text: 'Initialized empty Git repository in C:\\Users\\ReOS',
          type: 'success'
        });
        this.renderGit(body);
      });
      return;
    }

    body.innerHTML = `
      <!-- Top Git Header Info -->
      <div class="git-header" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.15); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🐙</span>
          <span style="font-weight: bold; font-size: 14px;">Git Version Control</span>
          <span style="background: rgba(0,255,102,0.1); border: 1px solid #0f6; color: #0f6; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Branch: ${this.currentBranch}</span>
        </div>
        <div style="display: flex; gap: 6px; font-size: 12px; align-items: center;">
          <span style="opacity:0.5;">Switch Branch:</span>
          <select class="git-branch-select" style="background: #000; color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 2px 6px; font-family: inherit;">
            ${this.branches.map(b => `<option value="${b}" ${b === this.currentBranch ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
          <button class="git-new-branch-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: inherit; padding: 2px 8px; cursor: pointer;">+ Branch</button>
        </div>
      </div>

      <!-- Main Columns -->
      <div style="flex: 1; display: flex; overflow: hidden;">
        <!-- Left Side Actions / Tabs -->
        <div style="width: 140px; border-right: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.1); padding: 8px; display: flex; flex-direction: column; gap: 6px;">
          <div class="git-tab-btn tab-status ${this.activeView === 'status' ? 'active' : ''}" style="padding: 6px 10px; cursor: pointer; font-size: 13px; border-radius: 4px;">Status</div>
          <div class="git-tab-btn tab-log ${this.activeView === 'log' ? 'active' : ''}" style="padding: 6px 10px; cursor: pointer; font-size: 13px; border-radius: 4px;">Commit Log</div>
          <div class="git-tab-btn tab-diff ${this.activeView === 'diff' ? 'active' : ''}" style="padding: 6px 10px; cursor: pointer; font-size: 13px; border-radius: 4px;">File Diff</div>
        </div>

        <!-- Right Side Panel Area -->
        <div class="git-panel-content" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
      </div>
    `;

    // Bind Tabs
    body.querySelector('.tab-status')?.addEventListener('click', () => {
      this.activeView = 'status';
      this.renderGit(body);
    });
    body.querySelector('.tab-log')?.addEventListener('click', () => {
      this.activeView = 'log';
      this.renderGit(body);
    });
    body.querySelector('.tab-diff')?.addEventListener('click', () => {
      this.activeView = 'diff';
      this.renderGit(body);
    });

    body.querySelectorAll('.git-tab-btn').forEach(el => {
      if (el.classList.contains('active')) {
        (el as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
        (el as HTMLElement).style.fontWeight = 'bold';
      }
    });

    const selectBranch = body.querySelector('.git-branch-select') as HTMLSelectElement;
    selectBranch.addEventListener('change', () => {
      this.currentBranch = selectBranch.value;
      this.saveGitState();
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Checked out branch: ${this.currentBranch}`,
        type: 'info'
      });
      this.renderGit(body);
    });

    const btnNewBranch = body.querySelector('.git-new-branch-btn') as HTMLButtonElement;
    btnNewBranch.addEventListener('click', () => {
      const name = prompt('Enter new branch name:');
      if (name && !this.branches.includes(name)) {
        this.branches.push(name);
        this.currentBranch = name;
        this.saveGitState();
        this.bus.publish('NOTIFICATION:ADD', {
          text: `Created and checked out branch: ${name}`,
          type: 'success'
        });
        this.renderGit(body);
      }
    });

    const panel = body.querySelector('.git-panel-content') as HTMLElement;
    if (this.activeView === 'status') {
      this.renderStatusView(panel, body);
    } else if (this.activeView === 'log') {
      this.renderLogView(panel);
    } else {
      this.renderDiffView(panel);
    }
  }

  private async renderStatusView(container: HTMLElement, body: HTMLElement) {
    // Determine modified or untracked files
    const workspaceFiles = await this.vfs.readdir('C:\\Users\\ReOS');
    const lastCommit = this.commits[this.commits.length - 1];

    const untracked: string[] = [];
    const modified: string[] = [];

    for (const f of workspaceFiles) {
      if (f.type === 'file') {
        const path = f.path;
        const currentContent = await this.vfs.readFileAsText(path);

        if (!lastCommit) {
          untracked.push(f.name);
        } else {
          const committedFile = lastCommit.files.find(cf => cf.path === path);
          if (!committedFile) {
            untracked.push(f.name);
          } else if (committedFile.content !== currentContent) {
            modified.push(f.name);
          }
        }
      }
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; height:100%;">
        <div style="font-weight: bold; font-size: 13px;">GIT REPOSITORY STATUS</div>

        <!-- Staged files panel -->
        <div style="background:#000; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px;">
          <div style="font-size:11px; color:#22c55e; font-weight:bold; margin-bottom:6px;">STAGED FOR COMMIT (${this.stagedFiles.size})</div>
          ${
            Array.from(this.stagedFiles)
              .map(f => `<div style="font-size:12px; padding:2px 0;">➕ ${f}</div>`)
              .join('') ||
            '<div style="font-size:12px; opacity:0.4; font-style:italic;">No files staged yet.</div>'
          }
        </div>

        <!-- Untracked/Modified files panel -->
        <div style="display: flex; gap: 10px; flex: 1;">
          <div style="flex: 1; background:#000; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px; display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:11px; color:#ef4444; font-weight:bold;">UNTRACKED / MODIFIED (${untracked.length + modified.length})</div>
            <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
              ${untracked
                .map(
                  f => `
                <div style="font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🔴 ${f} <span style="font-size:9px; opacity:0.4;">[untracked]</span></span>
                  <button class="stage-btn" data-file="${f}" style="background:#1e293b; color:#fff; border:none; padding:1px 6px; font-size:10px; cursor:pointer;">Stage</button>
                </div>
              `
                )
                .join('')}
              ${modified
                .map(
                  f => `
                <div style="font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🟡 ${f} <span style="font-size:9px; opacity:0.4;">[modified]</span></span>
                  <button class="stage-btn" data-file="${f}" style="background:#1e293b; color:#fff; border:none; padding:1px 6px; font-size:10px; cursor:pointer;">Stage</button>
                </div>
              `
                )
                .join('')}
              ${untracked.length === 0 && modified.length === 0 ? '<div style="font-size:12px; opacity:0.4; font-style:italic; padding-top:20px; text-align:center;">Working tree clean. Nothing to stage.</div>' : ''}
            </div>
            ${untracked.length > 0 || modified.length > 0 ? `<button class="stage-all-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color:inherit; font-family:inherit; padding:4px; font-size:11px; cursor:pointer; width:100%;">Stage All Files</button>` : ''}
          </div>

          <!-- Commit message form -->
          <div style="width: 200px; background:#000; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:11px; font-weight:bold; opacity:0.7;">CREATE COMMIT</div>
            <textarea class="commit-msg-input" placeholder="Type commit message..." style="flex:1; width:100%; min-height:80px; background:#111; border:1px solid rgba(255,255,255,0.15); color:#fff; padding:6px; font-family:inherit; font-size:12px; resize:none;"></textarea>
            <button class="commit-submit-btn" style="background:#22c55e; border:none; color:#000; font-weight:bold; font-family:inherit; padding:6px; font-size:12px; border-radius:4px; cursor:pointer; width:100%;">COMMIT CHANGES</button>
          </div>
        </div>
      </div>
    `;

    // Bind Stage Buttons
    container.querySelectorAll('.stage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = btn.getAttribute('data-file');
        if (file) {
          this.stagedFiles.add(file);
          this.renderStatusView(container, body);
        }
      });
    });

    container.querySelector('.stage-all-btn')?.addEventListener('click', () => {
      untracked.forEach(f => this.stagedFiles.add(f));
      modified.forEach(f => this.stagedFiles.add(f));
      this.renderStatusView(container, body);
    });

    const commitMsgTextarea = container.querySelector('.commit-msg-input') as HTMLTextAreaElement;
    const commitSubmitBtn = container.querySelector('.commit-submit-btn') as HTMLButtonElement;

    commitSubmitBtn.addEventListener('click', async () => {
      const msg = commitMsgTextarea.value.trim();
      if (!msg) {
        alert('Please enter a commit message!');
        return;
      }
      if (this.stagedFiles.size === 0) {
        alert('No staged changes to commit. Stage files first!');
        return;
      }

      // Snapshot all staged files inside VFS
      const commitFiles: { path: string; content: string }[] = [];
      const keys = await this.vfs.readdir('C:\\Users\\ReOS');
      for (const k of keys) {
        if (k.type === 'file') {
          const content = await this.vfs.readFileAsText(k.path);
          commitFiles.push({ path: k.path, content });
        }
      }

      const commit: GitCommit = {
        id: Math.random().toString(36).substring(2, 8).toUpperCase(),
        message: msg,
        author: 'ReOS Developer',
        timestamp: Date.now(),
        files: commitFiles
      };

      this.commits.push(commit);
      this.stagedFiles.clear();
      this.saveGitState();
      this.bus.publish('NOTIFICATION:ADD', {
        text: `Committed successfully [id: ${commit.id}]`,
        type: 'success'
      });
      this.renderGit(body);
    });
  }

  private renderLogView(container: HTMLElement) {
    if (this.commits.length === 0) {
      container.innerHTML = `<div style="text-align:center; opacity:0.4; font-style:italic; padding-top:40px;">No commit history. Make your first commit in the Status tab!</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="font-weight: bold; font-size: 13px;">COMMIT TIMELINE LOG HISTORY</div>
        <div style="display:flex; flex-direction:column; gap:8px; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 12px; margin-left: 6px;">
          ${this.commits
            .map(c => {
              const d = new Date(c.timestamp).toISOString().replace('T', ' ').substring(0, 16);
              return `
              <div style="position:relative; margin-bottom:12px;">
                <!-- Node bullet -->
                <div style="position:absolute; left:-18px; top:4px; width:10px; height:10px; border-radius:50%; background:#0f6; border:2px solid #181818;"></div>
                <div style="font-size:12px; font-weight:bold; color:#0f6;">commit ${c.id}</div>
                <div style="font-size:11px; opacity:0.5; margin-top:2px;">Author: ${c.author} | Date: ${d}</div>
                <div style="font-size:13px; font-weight:bold; margin-top:4px; padding-left:8px; border-left: 3px solid #007acc; color:#fff;">${c.message}</div>
                <div style="font-size:11px; opacity:0.6; margin-top:4px;">Files tracked: ${c.files.length} items</div>
              </div>
            `;
            })
            .reverse()
            .join('')}
        </div>
      </div>
    `;
  }

  private async renderDiffView(container: HTMLElement) {
    const files = await this.vfs.readdir('C:\\Users\\ReOS');
    const textFiles = files.filter(f => f.type === 'file');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; height:100%;">
        <div style="font-weight: bold; font-size: 13px;">FILE COMPARISON DIFF VIEWER</div>
        <div style="display:flex; gap: 8px;">
          <span style="font-size:12px; opacity:0.7;">Select target file:</span>
          <select class="diff-file-select" style="background:#000; color:#fff; border: 1px solid rgba(255,255,255,0.15); padding: 1px 6px; font-family: inherit; font-size:12px;">
            <option value="">-- Choose file --</option>
            ${textFiles.map(f => `<option value="${f.path}" ${f.path === this.activeDiffFile ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>

        <div class="diff-result-panel" style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:10px; font-size:12px; line-height:1.4; overflow:auto; font-family:inherit; white-space:pre;"></div>
      </div>
    `;

    const select = container.querySelector('.diff-file-select') as HTMLSelectElement;
    const diffPanel = container.querySelector('.diff-result-panel') as HTMLElement;

    select.addEventListener('change', async () => {
      this.activeDiffFile = select.value;
      if (!this.activeDiffFile) {
        diffPanel.innerHTML = '';
        return;
      }

      try {
        const currentContent = await this.vfs.readFileAsText(this.activeDiffFile);
        const lastCommit = this.commits[this.commits.length - 1];

        if (!lastCommit) {
          // Compare with empty
          this.renderFullAdditionDiff(diffPanel, currentContent);
        } else {
          const committedFile = lastCommit.files.find(cf => cf.path === this.activeDiffFile);
          if (!committedFile) {
            this.renderFullAdditionDiff(diffPanel, currentContent);
          } else {
            this.renderLineByLineDiff(diffPanel, committedFile.content, currentContent);
          }
        }
      } catch (err) {
        diffPanel.innerHTML = `<span style="color:red;">Error calculating diff files.</span>`;
      }
    });

    if (this.activeDiffFile) {
      select.dispatchEvent(new Event('change'));
    }
  }

  private renderFullAdditionDiff(panel: HTMLElement, content: string) {
    const lines = content.split('\n');
    panel.innerHTML = lines
      .map(
        l =>
          `<div style="background-color: rgba(34,197,94,0.1); color: #4ade80; padding-left: 4px;">+ ${this.escapeHtml(l)}</div>`
      )
      .join('');
  }

  private renderLineByLineDiff(panel: HTMLElement, original: string, current: string) {
    const origLines = original.split('\n');
    const currLines = current.split('\n');

    let html = '';
    const max = Math.max(origLines.length, currLines.length);

    for (let i = 0; i < max; i++) {
      const origLine = origLines[i];
      const currLine = currLines[i];

      if (origLine === currLine) {
        html += `<div style="opacity:0.6; padding-left: 10px;">  ${this.escapeHtml(currLine)}</div>`;
      } else {
        if (origLine !== undefined) {
          html += `<div style="background-color: rgba(239,68,68,0.1); color: #f87171; padding-left: 4px;">- ${this.escapeHtml(origLine)}</div>`;
        }
        if (currLine !== undefined) {
          html += `<div style="background-color: rgba(34,197,94,0.1); color: #4ade80; padding-left: 4px;">+ ${this.escapeHtml(currLine)}</div>`;
        }
      }
    }
    panel.innerHTML = html;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
