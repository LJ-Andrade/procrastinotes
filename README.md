# Procrastinotes

A lightweight, **local-first** notepad for writing and organizing your notes.
Open it, pick a project, start writing, close it. No accounts, no setup, no
cloud required — your data lives in a single local database that you own.

It's meant to feel like a modern notepad, not a heavy productivity suite: fast,
simple, and fully offline.

## Features

- **3-level organization** — Projects → Sections → Pages, with full create /
  rename / delete and drag-to-reorder.
- **Rich editor** ([Tiptap](https://tiptap.dev)) — headings, bold / italic /
  strikethrough, bullet, numbered and **checkbox** lists, quotes, code blocks,
  and drag-to-reorder blocks.
- **Images** — paste from the clipboard (`Ctrl+V`), drag-and-drop, or pick a
  file. Auto-resized and stored inside your local database; select an image and
  drag the side handles to resize it.
- **Instant search** — full-text command palette (`Ctrl+K`) across all your
  notes, plus quick capture (`Ctrl+N`) and find-in-page (`Ctrl+F`).
- **Autosave** — everything you type is saved automatically.
- **Make it yours** — light / dark / auto themes, accent colors, custom editor
  backgrounds, and a local profile.
- **Your data, your control** — one-click backup export / import. No servers,
  works 100% offline.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette / search |
| `Ctrl+N` | Quick capture |
| `Ctrl+F` | Find on page |
| `Ctrl+S` | Save now |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+,` | Preferences |
| `?`      | Keyboard shortcuts help |

## Install (Windows)

Grab the latest `Procrastinotes_x.y.z_x64-setup.exe` from the
[Releases](https://github.com/LJ-Andrade/procrastinotes/releases) page and run
it.

> Windows may show a SmartScreen warning ("unknown publisher") because the app
> isn't code-signed yet. Click **More info → Run anyway**. A Microsoft Store
> release (no warnings) is planned.

## Support

Procrastinotes is free. If it's useful to you and you'd like to support its
development, you can buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/moubix)

## Build from source

Prerequisites: [Node.js](https://nodejs.org), the
[Rust toolchain](https://www.rust-lang.org/tools/install) (stable, MSVC), and
the Microsoft C++ build tools. WebView2 ships with Windows 11.

```bash
npm install
npm run tauri dev      # run in development with hot reload
npm run build          # typecheck + build the frontend only
npm run tauri build    # produce the installer (.exe / .msi)
```

The SQLite database is created automatically in the per-app data directory on
first run.

## Tech stack

[Tauri 2](https://tauri.app) (shell) · React + TypeScript (UI) ·
[Tiptap](https://tiptap.dev) (editor) · Rust + `rusqlite` (data layer) ·
SQLite + FTS5 (storage & search). SQLite is the single source of truth and the
UI talks to it only through a `DataStore` boundary, so other backends (e.g. a
future web build over IndexedDB) can be swapped in without touching the UI.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — developer guide (how the code
  works, conventions, gotchas, how to add features). **Start here.**
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — product specification.
- [`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) — original plan.

## Roadmap

Windows desktop is the current target. Planned next: a Microsoft Store release,
per-project icons & colors, an Android port, and optional Google Drive sync
(local-first, no server).

## License

Proprietary freeware — free to use, and free to share the official unmodified
installer, but **not** to modify or sell. All rights reserved.
See [LICENSE](LICENSE).
