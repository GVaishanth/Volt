# Terminal Module (`@modules/terminal/*`)

Acts as the permanent, unclosable 70% Windows CMD primary interface:

- `TerminalEngineModule`: Virtualized scrollback buffer rendering prompt (`C:\Users\Volt> `), raw keystroke capture, interactive `stdin` SharedArrayBuffer atomics, and Smart Error Navigation link parsing.
- `CommandHistoryModule`: Up/Down arrow key session stack and `Ctrl+R` reverse incremental search (`F7` history popup strictly excluded).
- `AutocompleteModule`: `Tab` key completion engine matching commands and virtual filesystem paths cleanly without prompt disruption.
