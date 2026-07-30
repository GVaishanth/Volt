import { OSWindow } from '@core/WindowManager';
import { ReOSBus } from '@core/ReOSBus';

interface DbTable {
  name: string;
  columns: string[];
  rows: any[][];
}

export class DatabaseApp {
  private bus = ReOSBus.getInstance();
  private tables: Map<string, DbTable> = new Map();
  private queryInput: string =
    'CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  email TEXT\n);\n\nINSERT INTO users VALUES (1, "Alice", "alice@example.com");\nINSERT INTO users VALUES (2, "Bob", "bob@example.com");\n\nSELECT * FROM users;';
  private queryResults: { columns: string[]; rows: any[][]; info?: string } | null = null;
  private queryError: string | null = null;

  constructor() {
    // Populate with some default system tables
    this.tables.set('sys_config', {
      name: 'sys_config',
      columns: ['key', 'value', 'scope'],
      rows: [
        ['os_version', '2.0.0', 'global'],
        ['theme', 'Pure Black', 'user'],
        ['autosave', '2000', 'workspace']
      ]
    });
  }

  public getWindowOptions(): Partial<OSWindow> {
    return {
      icon: '🗄️',
      singleInstance: true,
      onMount: (body: HTMLElement) => {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.height = '100%';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = '#111';
        body.style.color = '#fff';
        body.style.fontFamily = 'Consolas, monospace';

        this.renderDatabase(body);
      }
    };
  }

  private renderDatabase(body: HTMLElement) {
    body.innerHTML = `
      <div style="flex: 1; display: flex; overflow: hidden;">
        <!-- Left Sidebar: Tables & Schema -->
        <div class="db-sidebar" style="width: 180px; border-right: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-weight: bold; font-size: 11px; opacity: 0.5;">DATABASE BROWSER</div>
          <div style="font-size: 13px; font-weight: bold; color: #ffa500; display:flex; align-items:center; gap:4px;">📂 local_sqlite.db</div>
          
          <div style="font-weight: bold; font-size: 11px; opacity: 0.5; margin-top: 14px;">TABLES (<span class="db-table-count">0</span>)</div>
          <div class="db-tables-list" style="display: flex; flex-direction: column; gap: 4px;"></div>

          <div style="font-weight: bold; font-size: 11px; opacity: 0.5; margin-top: 14px;">CSV IMPORT</div>
          <button class="db-import-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 4px; font-family: inherit; font-size: 11px; cursor: pointer;">📂 Load CSV</button>
        </div>

        <!-- Main Query & Results Workspace -->
        <div class="db-workspace" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 12px; gap: 10px;">
          <!-- SQL Editor -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-height: 120px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 11px; opacity: 0.5;">SQL QUERY EDITOR</span>
              <button class="db-run-btn" style="background: #007acc; border: none; color: #fff; padding: 4px 16px; font-family: inherit; font-weight: bold; font-size: 12px; cursor: pointer; border-radius: 4px;">⚡ RUN QUERY</button>
            </div>
            <textarea class="db-query-textarea" style="flex: 1; background: #000; border: 1px solid rgba(255,255,255,0.15); color: #00ff66; padding: 10px; font-family: inherit; font-size: 13px; resize: none; outline: none;">${this.queryInput}</textarea>
          </div>

          <!-- Results Panel -->
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">
              <span style="font-weight: bold; font-size: 11px; opacity: 0.5;">QUERY RESULTS</span>
              <div style="display: flex; gap: 6px;">
                <button class="db-export-csv-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 2px 8px; font-family: inherit; font-size: 11px; cursor: pointer;">CSV</button>
                <button class="db-export-json-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 2px 8px; font-family: inherit; font-size: 11px; cursor: pointer;">JSON</button>
              </div>
            </div>
            <div class="db-results-container" style="flex: 1; overflow: auto; background: #050505; border: 1px solid rgba(255,255,255,0.1); padding: 8px; font-size: 13px;"></div>
          </div>
        </div>
      </div>
    `;

    const queryArea = body.querySelector('.db-query-textarea') as HTMLTextAreaElement;
    queryArea.addEventListener('input', () => {
      this.queryInput = queryArea.value;
    });

    const runBtn = body.querySelector('.db-run-btn') as HTMLButtonElement;
    runBtn.addEventListener('click', () => {
      this.runSQL(queryArea.value, body);
    });

    const importBtn = body.querySelector('.db-import-btn') as HTMLButtonElement;
    importBtn.addEventListener('click', () => {
      this.importCSV(body);
    });

    const exportCsvBtn = body.querySelector('.db-export-csv-btn') as HTMLButtonElement;
    exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));

    const exportJsonBtn = body.querySelector('.db-export-json-btn') as HTMLButtonElement;
    exportJsonBtn.addEventListener('click', () => this.exportResults('json'));

    this.renderTablesList(body);
    this.renderResults(body);
  }

  private renderTablesList(body: HTMLElement) {
    const listEl = body.querySelector('.db-tables-list') as HTMLElement;
    const countEl = body.querySelector('.db-table-count') as HTMLElement;
    if (!listEl) return;

    listEl.innerHTML = '';
    countEl.innerText = String(this.tables.size);

    for (const [name, table] of this.tables.entries()) {
      const item = document.createElement('div');
      item.style.padding = '4px 6px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '12px';
      item.style.opacity = '0.8';
      item.innerHTML = `📊 ${name} <span style="opacity: 0.5; font-size:10px;">(${table.rows.length} rows)</span>`;

      item.addEventListener('mouseenter', () => (item.style.opacity = '1'));
      item.addEventListener('mouseleave', () => (item.style.opacity = '0.8'));
      item.addEventListener('click', () => {
        this.queryInput = `SELECT * FROM ${name};`;
        const queryArea = body.querySelector('.db-query-textarea') as HTMLTextAreaElement;
        if (queryArea) queryArea.value = this.queryInput;
        this.runSQL(this.queryInput, body);
      });

      listEl.appendChild(item);
    }
  }

  private renderResults(body: HTMLElement) {
    const container = body.querySelector('.db-results-container') as HTMLElement;
    if (!container) return;

    if (this.queryError) {
      container.innerHTML = `<div style="color: #f64; line-height: 1.5;"><strong>SQL Error:</strong><br>${this.queryError}</div>`;
      return;
    }

    if (!this.queryResults) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; opacity:0.4; font-style:italic;">Execute a query to view results.</div>`;
      return;
    }

    const { columns, rows, info } = this.queryResults;
    if (info) {
      container.innerHTML = `<div style="color: #a8ffb2; padding: 4px;">${info}</div>`;
      return;
    }

    if (columns.length === 0) {
      container.innerHTML = `<div style="color: #888; text-align: center; padding: 10px;">Empty set returned.</div>`;
      return;
    }

    let html = `<table style="width:100%; border-collapse: collapse; text-align: left; font-size: 12px;">`;
    // Headers
    html += `<thead><tr style="border-bottom: 2px solid rgba(255,255,255,0.15);">`;
    for (const col of columns) {
      html += `<th style="padding: 6px; font-weight: bold; opacity:0.8;">${col}</th>`;
    }
    html += `</tr></thead><tbody>`;

    // Rows
    for (const row of rows) {
      html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.06); hover: background-color: rgba(255,255,255,0.02)">`;
      for (const val of row) {
        html += `<td style="padding: 6px; opacity:0.9;">${val}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;

    container.innerHTML = html;
  }

  private runSQL(queryText: string, body: HTMLElement) {
    this.queryError = null;
    this.queryResults = null;

    const queries = queryText
      .split(';')
      .map(q => q.trim())
      .filter(Boolean);
    let lastResult: any = null;

    try {
      for (const query of queries) {
        lastResult = this.parseAndExecuteSingleQuery(query);
      }
      this.queryResults = lastResult;
      this.bus.publish('NOTIFICATION:ADD', {
        text: 'SQL Query executed successfully!',
        type: 'success'
      });
    } catch (err: any) {
      this.queryError = err.message || 'Syntax error near query.';
      this.bus.publish('NOTIFICATION:ADD', { text: 'SQL Execution failed', type: 'error' });
    }

    this.renderTablesList(body);
    this.renderResults(body);
  }

  private parseAndExecuteSingleQuery(query: string): any {
    const clean = query.replace(/\s+/g, ' ').trim();
    const upper = clean.toUpperCase();

    // 1. SELECT Query
    if (upper.startsWith('SELECT')) {
      const match = clean.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
      if (!match)
        throw new Error(
          'Malformed SELECT query. Supported syntax: SELECT [columns/*] FROM [table]'
        );

      const colsPart = match[1].trim();
      const tableName = match[2].trim();
      const wherePart = match[3] ? match[3].trim() : null;

      const table = this.tables.get(tableName.toLowerCase());
      if (!table) throw new Error(`Table "${tableName}" not found.`);

      // Column selection
      let selectedCols = table.columns;
      if (colsPart !== '*') {
        selectedCols = colsPart.split(',').map(c => c.trim().toLowerCase());
        for (const col of selectedCols) {
          if (!table.columns.includes(col)) {
            throw new Error(`Column "${col}" not found in table "${tableName}".`);
          }
        }
      }

      // Filter rows
      let filteredRows = table.rows;
      if (wherePart) {
        // Simple condition filter: column = value or column > value
        const condMatch = wherePart.match(/([a-zA-Z0-9_]+)\s*(=|>|<)\s*(.+)/);
        if (condMatch) {
          const colName = condMatch[1].trim().toLowerCase();
          const op = condMatch[2].trim();
          const targetVal = condMatch[3].trim().replace(/^["']|["']$/g, '');

          const colIdx = table.columns.indexOf(colName);
          if (colIdx !== -1) {
            filteredRows = table.rows.filter(row => {
              const val = row[colIdx];
              if (op === '=') return String(val) === String(targetVal);
              if (op === '>') return Number(val) > Number(targetVal);
              if (op === '<') return Number(val) < Number(targetVal);
              return true;
            });
          }
        }
      }

      // Map rows to selected columns
      const finalRows = filteredRows.map(row => {
        return selectedCols.map(col => {
          const idx = table.columns.indexOf(col);
          return row[idx];
        });
      });

      return { columns: selectedCols.map(c => c.toUpperCase()), rows: finalRows };
    }

    // 2. CREATE TABLE
    if (upper.startsWith('CREATE TABLE')) {
      const match = clean.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\((.+)\)/i);
      if (!match)
        throw new Error('Malformed CREATE TABLE. Syntax: CREATE TABLE [table] (col1, col2, ...)');

      const name = match[1].toLowerCase();
      const colsPart = match[2];

      const columns = colsPart.split(',').map(c => {
        return c.trim().split(' ')[0].trim().toLowerCase();
      });

      this.tables.set(name, { name, columns, rows: [] });
      return { info: `Table "${name}" created successfully.` };
    }

    // 3. INSERT INTO
    if (upper.startsWith('INSERT INTO')) {
      const match = clean.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s+(?:VALUES\s*\((.+)\)|(.+))/i);
      if (!match)
        throw new Error('Malformed INSERT. Syntax: INSERT INTO [table] VALUES (val1, val2, ...)');

      const name = match[1].toLowerCase();
      const valuesPart = match[2] || match[3];

      const table = this.tables.get(name);
      if (!table) throw new Error(`Table "${name}" not found.`);

      const rawValues = valuesPart.replace(/^\(|\)$/g, '').split(',');
      const values = rawValues.map(v => {
        const val = v.trim().replace(/^["']|["']$/g, '');
        return isNaN(Number(val)) ? val : Number(val);
      });

      if (values.length !== table.columns.length) {
        throw new Error(
          `Column count mismatch: table has ${table.columns.length} columns, but ${values.length} values were provided.`
        );
      }

      table.rows.push(values);
      return { info: `1 row inserted into table "${name}".` };
    }

    // 4. DROP TABLE
    if (upper.startsWith('DROP TABLE')) {
      const match = clean.match(/DROP\s+TABLE\s+([a-zA-Z0-9_]+)/i);
      if (!match) throw new Error('Syntax: DROP TABLE [table]');

      const name = match[1].toLowerCase();
      if (!this.tables.has(name)) throw new Error(`Table "${name}" not found.`);

      this.tables.delete(name);
      return { info: `Table "${name}" dropped successfully.` };
    }

    throw new Error(
      'Unsupported SQL command. Supported: CREATE TABLE, INSERT INTO, SELECT, DROP TABLE.'
    );
  }

  private importCSV(body: HTMLElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      try {
        const text = await file.text();
        const lines = text
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        if (lines.length === 0) return;

        const tableName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
        const columns = lines[0].split(',').map(c => c.trim().toLowerCase());
        const rows: any[][] = [];

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => {
            const val = v.trim().replace(/^["']|["']$/g, '');
            return isNaN(Number(val)) ? val : Number(val);
          });
          if (vals.length === columns.length) {
            rows.push(vals);
          }
        }

        this.tables.set(tableName, { name: tableName, columns, rows });
        this.queryInput = `SELECT * FROM ${tableName};`;
        const queryArea = body.querySelector('.db-query-textarea') as HTMLTextAreaElement;
        if (queryArea) queryArea.value = this.queryInput;

        this.runSQL(this.queryInput, body);
        this.bus.publish('NOTIFICATION:ADD', {
          text: `Imported table "${tableName}" from CSV!`,
          type: 'success'
        });
      } catch (err) {
        alert('Error parsing CSV file.');
      }
    };
    input.click();
  }

  private exportResults(format: 'csv' | 'json') {
    if (!this.queryResults || !this.queryResults.columns) {
      alert('No query results to export.');
      return;
    }

    const { columns, rows } = this.queryResults;
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'csv') {
      content = columns.join(',') + '\n';
      content += rows.map(r => r.join(',')).join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    } else {
      const dataObjects = rows.map(row => {
        const obj: any = {};
        columns.forEach((col, idx) => {
          obj[col.toLowerCase()] = row[idx];
        });
        return obj;
      });
      content = JSON.stringify(dataObjects, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.bus.publish('NOTIFICATION:ADD', {
      text: `Exported query results as ${format.toUpperCase()}`,
      type: 'success'
    });
  }
}
