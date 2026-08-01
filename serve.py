#!/usr/bin/env python3
"""
Volt Static Server (Python Standalone)
Serves the pre-compiled `dist/` folder with proper Cross-Origin Isolation headers
(COOP/COEP) so WebAssembly, Web Workers, and SharedArrayBuffer (Atomics) work natively
without requiring Node.js or npm.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = "dist"

class VoltHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Attach Cross-Origin Isolation headers for SharedArrayBuffer & Atomics support
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

def main():
    if not os.path.exists(DIRECTORY):
        print(f"[Error] Directory '{DIRECTORY}' not found. Please ensure 'dist/' exists.")
        sys.exit(1)

    # Change to directory containing script if needed
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Start multi-threaded or standard TCP server
    with socketserver.TCPServer(("", PORT), VoltHTTPRequestHandler) as httpd:
        print("================================================================")
        print("             Volt Static Local Server (Python)")
        print("================================================================")
        print(f" Serving directory : ./{DIRECTORY}")
        print(f" Local URL         : http://localhost:{PORT}")
        print(" COOP/COEP Headers : ENABLED (SharedArrayBuffer & Atomics active)")
        print(" Node.js / npm     : NOT REQUIRED")
        print("----------------------------------------------------------------")
        print(" Press Ctrl+C to stop the server.")
        print("================================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Volt Python server. Goodbye!")

if __name__ == "__main__":
    main()
