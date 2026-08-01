# VPU presents

# VOLT

A modern desktop environment built entirely for the web.

---

**VOLT** (formerly Volt) is a 100% local-first, browser-native development operating environment and desktop experience. It runs completely client-side in the web browser with zero backend dependencies, zero telemetry, and zero cloud fallbacks. 

It is designed to showcase how modern web APIs (like Origin Private File System, Web Workers, IndexedDB, and WebAssembly) can be harnessed to create a rich, cohesive, and fully functional multi-window operating system workspace right in your browser.

---

## 🖥️ Layout & Interaction Paradigms

VOLT features two distinct interface paradigms that you can toggle on the fly:

### 1. The Classic IDE Mode
Engineered around a highly optimized 70/20/10 layout rule:
- **70% Windows Command Prompt:** The permanent terminal core and primary control surface of your environment.
- **20% VS Code Modal Editor:** A lightweight code buffer editing panel that opens seamlessly next to your CLI.
- **10% Chrome File Tabs:** Exclusively for managing and switching between open files in the editor.

### 2. The Multi-Window Desktop Mode
A modern, rich, window-managed desktop environment featuring:
- **Desktop Grid:** Custom double-clickable application shortcuts.
- **Windows Manager Canvas:** Fully draggable, resizable, minimizable, maximizable, and snappable application frames.
- **System Taskbar & Tray:** Includes a **🚀 Start Menu** with app listings and system commands (Restart/Shutdown), an open windows strip, custom wallpaper toggle, live ticking clock, and local date.
- **Toast Notifications Center:** For system-wide alerts, operation successes, and warning notifications.
- **Command Palette (`Ctrl + Shift + P`):** Quick command search overlay to trigger system actions or launch apps instantly.

---

## 🚀 Fully Functional Built-in Applications (V2)

VOLT ships with an suite of powerful, client-side tools designed for web-native productivity:

1. **💻 Terminal (CMD Console)**
   - Windows CMD layout featuring `cd`, `dir` (with `-l`, `-a`, `/tree` flags), `mkdir`, `copy`, `move`, `ren`, `del`, `type`, `echo`, `attrib`, `date`, `time`, `find`, and custom diagnostic tools.
   - Intelligent autocorrection (Levenshtein typo suggestions like *"Did you mean: mkdir"*).
   - Rich interaction: Arrow keys command history, `Tab` completion, `Ctrl + R` reverse search, and `Ctrl + C` process interruption.
   - **Smart Error Links:** Stack trace errors (like `file:line:col`) are rendered as clickable elements that instantly open the file in the Editor, jumping and highlighting the precise line.

2. **📝 Code Editor**
   - Monaco-inspired buffer editing with active line numbers.
   - Smarter indentation: `Tab` inserts 4 spaces, `Backspace` automatically unindents 4 spaces.
   - Heuristic syntax detection based on file extensions.
   - **Auto-save:** Automatically commits buffer edits to the virtual filesystem after 2 seconds of inactivity.

3. **📂 Advanced File Explorer**
   - Left-sidebar with quick drive links (`Local Disk C:`, `Home`, `Desktop`, `Documents`, `Projects`, `Recycle Bin`).
   - Detailed file listing with sortable column headers (Name, Type, Size, Last Modified).
   - Double-click to navigate folders or open files in the Editor.
   - **Right-Click Context Menu:** Rename files, duplicate files, download individual files, cut/copy/paste across directories, or delete to the Recycle Bin.
   - **Workspace Backup:** Full single-button JSON export/import of your entire Virtual Filesystem.

4. **🌐 Web Browser & Postman API Client**
   - **Web Preview:** Runs a local-first virtual preview page. Create a file under `C:\Users\Volt\Projects\index.html` and preview your custom HTML, CSS, and JS code live! Supports postMessage-based DevTools console logs.
   - **API Client:** A lightweight REST client resembling Postman. Select HTTP methods (`GET`, `POST`, `PUT`, `DELETE`), input a target endpoint URL, construct custom JSON raw payloads, and inspect formatted JSON responses along with request durations and status codes.

5. **🗄️ SQLite Database Manager**
   - Interactive SQL editor pre-seeded with a sample `sys_config` database.
   - Execute single or multi-queries: `CREATE TABLE`, `INSERT INTO`, `SELECT` (with basic `WHERE` filtering), and `DROP TABLE`.
   - Sidebar database catalog showing active tables list and live row counts.
   - **Data Transfer:** Directly import a `.csv` file to create a virtual table, or export query results instantly to `.csv` or `.json` formats.

6. **🐙 Git Version Control Simulator**
   - Initialize a local git repository on your virtual drive.
   - Check out branches, create new development branches, stage untracked/modified files, and commit changes under unique hashes.
   - Inspect local repository logs on a chronological timeline.
   - **Line-by-line Diff Viewer:** Select a tracked file and visually compare current workspace modifications against the latest commit (additions in green `+`, removals in red `-`).

7. **📊 Task Manager**
   - Tracks active background processes, system resource utilization, memory adapters, and CPU simulation statistics.

8. **⚙️ System Settings**
   - Customize window environments, adjust global font sizes, toggle auto-save and word-wrap.
   - Pick from multiple preset high-contrast themes (*Classic CMD, Pure Black, VS Code Dark+, Retro Matrix, Light Modern*).

9. **📖 User Guide**
   - Full embedded documentation explaining keystrokes, CLI commands, and platform features.

---

## ⚙️ Architecture & Under-the-Hood Technology

VOLT leverages a modular, decoupled architecture driven by an event bus, ensuring high performance, clean interfaces, and easy extendability:

- **Decoupled Event Bus (`VoltBus`):** Single source of communication across all apps and core components using standard Pub/Sub patterns.
- **Progressive Virtual Filesystem (VFS):** Supports tier-based storage adapters. It automatically profiles browser capabilities to prefer **Origin Private File System (OPFS)**, gracefully falling back to **IndexedDB**, and ultimately **Memory Adapter** / **LocalStorage** if sandboxed.
- **Client-Side Execution Engine:** Supports WebAssembly-driven local compiling and execution. Includes interactive VM runtimes with stdin-read loops, stdout-streams, stderr-error-parsing, and keyboard interrupts.
- **Capability Profiler:** Dynamically scans the user's browser environment for WASM, OPFS, SharedArrayBuffer, Web Workers, and Canvas rendering support to adjust UI and process behaviors smoothly.

---

## 🚀 Local Development & Quickstart

### Prerequisites
- Node.js (v18+)
- Python 3 (For single-file compilation and standalone server)

### 1. Installation
Clone the repository and install dependency buffers:
```bash
git clone https://github.com/GVaishanth/Volt.git
cd Volt
npm install
```

### 2. Development Server
Start the local Vite server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 3. Build & Single-File Bundler
To compile the entire operating environment into a **100% self-contained single-file HTML bundle** that you can open locally over `file://` protocol by simply double-clicking it:
```bash
npm run build
```
This command runs:
1. `tsc` for TypeScript verification.
2. `vite build` with inlining plugins to embed all CSS, JS, and asset files.
3. `postbuild-singlefile.py` to strip out ES modules, wrap scripts in classic IIFEs, relocate scripts to the bottom of `<body>` to resolve DOM initialization race conditions, and output:
   - `dist/index.html` (Vite single-file output)
   - `Volt-Double-Click.html` (Root-level copy ready for instant offline execution)

### 4. Running the Standalone Python Server
To preview the compiled `dist/` directory with proper **Cross-Origin Isolation** headers (`COOP`/`COEP`) enabled, ensuring high-performance SharedArrayBuffers and Atomics can run without setting up Node:
```bash
python3 serve.py
```
Your standalone, high-performance web sandbox will be live at `http://localhost:8080`.

---

## 🧪 Verification & Automated Testing

VOLT comes with a comprehensive suite of unit and UI integration tests. To execute the test suite:
```bash
npm run test
```

To run TypeScript compiler diagnostics and linter audits:
```bash
npm run typecheck
npm run lint
```

All standard audits, linter checks, typechecks, and tests are passing successfully.
