#!/usr/bin/env python3
"""
Post-build script to ensure 100% single-file double-click compatibility
over file:// protocol without any web server required.
"""

import os
import sys

def main():
    dist_path = "dist/index.html"
    if not os.path.exists(dist_path):
        print("[Error] " + dist_path + " not found. Build the project first (npm run build).")
        sys.exit(1)

    with open(dist_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find the first module script tag and its matching closing tag
    open_tag = '<script type="module">'
    close_tag = '</script>'

    open_idx = html.find(open_tag)
    if open_idx == -1:
        print("[Warning] No <script type=\"module\"> found; file may already be classic script.")
    else:
        # Find the matching close tag for this open tag (first close after open)
        close_idx = html.find(close_tag, open_idx)
        if close_idx == -1:
            print("[Error] Found opening <script> but no closing </script>.")
            sys.exit(1)

        script_content = html[open_idx + len(open_tag):close_idx]
        # Wrap content in classic script block
        script_block = '<script>\n' + script_content + '\n</script>'

        # Build HTML with script removed from head and inserted before </body>
        before_script = html[:open_idx]
        after_script = html[close_idx + len(close_tag):]
        new_html = before_script + after_script

        # Insert before the last </body>
        body_close_idx = new_html.rfind('</body>')
        if body_close_idx == -1:
            print("[Error] No </body> tag found in HTML.")
            sys.exit(1)
        new_html = new_html[:body_close_idx] + script_block + '\n' + new_html[body_close_idx:]
        html = new_html

    # Write back to dist/
    with open(dist_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Copy to root for double-click access
    root_copy = "Volt-Double-Click.html"
    with open(root_copy, "w", encoding="utf-8") as f:
        f.write(html)

    print("[Post-Build] Single-file double-click bundles generated successfully:")
    print("  -> " + dist_path)
    print("  -> " + root_copy)

if __name__ == "__main__":
    main()
