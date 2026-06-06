# Procrastinotes

A lightweight, local-first productivity app for writing and organizing
information. Modern notepad, not a complex productivity platform.

Open → pick a project → start writing → close. No setup, no friction.

## Stack

- **Tauri 2** — desktop shell (Windows first; Android, web and iOS later)
- **React + TypeScript** — UI
- **Tiptap** — editor (Phase 2)
- **Rust + SQLite** (`rusqlite`) — native data layer, source of truth
- **SQLite FTS5** — instant local search

The UI talks to a single `DataStore` interface (`src/data/`), so the same
React app can later run on the web over IndexedDB without UI changes.

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the product spec and
[`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) for the architecture and
build plan.

## Development

Prerequisites: Node.js, Rust (stable, MSVC toolchain), and the Microsoft C++
build tools. WebView2 ships with Windows 11.

```bash
npm install
npm run tauri dev     # run the desktop app
npm run build         # typecheck + build the frontend
```

The SQLite database is created automatically in the per-app data directory on
first run.
