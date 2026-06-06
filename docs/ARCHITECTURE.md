# Procrastinotes — Architecture & Developer Guide

A practical guide for anyone (human or agent) continuing work on this codebase.
For the product vision see `docs/REQUIREMENTS.md`; for the original plan see
`docs/TECHNICAL_PLAN.md`. This file describes the code **as it actually is**.

---

## 1. What it is

A local-first desktop notepad. Open → pick a project → write → close. Data
lives in a local SQLite database; the app works fully offline.

**Stack:** Tauri 2 (shell) · React + TypeScript (UI) · Tiptap (editor) ·
Rust + `rusqlite` (native data layer, source of truth) · SQLite FTS5 (search).

Target order: **Windows desktop first** → Android → web → iOS. Only the Windows
desktop build is implemented today.

---

## 2. The one big idea: the `DataStore` boundary

The UI never touches SQLite (or any storage) directly. It depends only on the
`DataStore` interface (`src/data/DataStore.ts`). The active implementation is
exported as `store` from `src/data/index.ts`.

```
React UI ──> store: DataStore ──> TauriDataStore ──> invoke() ──> Rust commands ──> rusqlite ──> SQLite
```

Today there is one implementation, `TauriDataStore` (`src/data/TauriDataStore.ts`),
which calls Tauri commands. A future **web build** can implement the same
interface over IndexedDB without changing any UI code — `src/data/index.ts` is
the single place that would choose between them.

**To add a data operation:** add a Rust command → register it in
`src-tauri/src/lib.rs` → add the method to `DataStore` → implement it in
`TauriDataStore`. Keep all three in sync.

> Tauri converts JS **camelCase** invoke args to Rust **snake_case** params
> automatically (e.g. `{ sectionId }` → `section_id`). Rust models are
> serialized as camelCase (`#[serde(rename_all = "camelCase")]`), so the same
> shapes flow end to end and mirror the TS types in `src/types.ts`.

---

## 3. Repository layout

### Frontend — `src/`
| File | Responsibility |
|------|----------------|
| `main.tsx` | Entry. **Deliberately NOT wrapped in `React.StrictMode`** (see Gotchas). |
| `App.tsx` | Root component. Holds most state and orchestrates everything: project/section/page selection, autosave, global keyboard shortcuts, modals, background, etc. |
| `types.ts` | Domain types: `Project`, `Section`, `Page`, `SearchHit`. |
| `data/DataStore.ts` | The persistence interface. |
| `data/TauriDataStore.ts` | Tauri/SQLite implementation (`invoke`). |
| `data/index.ts` | Exports the active `store`. |
| `editor/Editor.tsx` | Tiptap editor wrapper. Loads content on `docId` change, emits `onChange` (JSON + plain text), hosts the drag handle, focuses on `focusSignal`. |
| `editor/EditorToolbar.tsx` | Formatting toolbar; reads active marks via `useEditorState`. |
| `TitleBar.tsx` | Custom frameless title bar: sidebar toggle, optional app icon, title, help/preferences buttons, window controls. |
| `SidebarList.tsx` | Reusable list (projects/sections/pages): click-select, double-click rename, hover delete (→ `ConfirmDialog`), native drag-and-drop reorder. |
| `CommandPalette.tsx` | `Ctrl+K` palette: debounced FTS search + create/backup/help actions. |
| `FindBar.tsx` | `Ctrl+F` find-in-page using the **CSS Custom Highlight API** (no DOM mutation). |
| `ShortcutsHelp.tsx` | `?` keyboard-shortcuts modal. |
| `PreferencesModal.tsx` | `Ctrl+,` preferences: profile, theme, accent, editor background, ambient, backup. Two-column layout + Save. |
| `ConfirmDialog.tsx` | App-styled confirmation dialog (replaces native `confirm()`). |
| `Ambient.tsx` | Optional particle canvas (renders inside the editor area). |
| `preferences.ts` | `usePreferences` hook + `Preferences` type + `ACCENTS`/`AVATARS`. Persists to `localStorage`. |
| `backgrounds.ts` | Editor background presets, auto-loaded from `src/assets/backgrounds/` via `import.meta.glob`. |
| `App.css` | All styles, including the theme CSS variables. |
| `assets/` | `icon.png` (title-bar icon), `backgrounds/*` (preset images). |

### Backend — `src-tauri/`
| File | Responsibility |
|------|----------------|
| `src/main.rs` | Thin entry → `procrastinotes_lib::run()`. |
| `src/lib.rs` | Tauri builder: registers plugins (`opener`, `dialog`), opens the DB in `setup()`, and lists every command in `invoke_handler!`. |
| `src/db.rs` | `Db(Mutex<Connection>)` state, `init_connection` (WAL + foreign keys), and forward-only migrations keyed off `PRAGMA user_version`. `MIGRATION_001` holds the schema. |
| `src/models.rs` | `Project`, `Section`, `Page`, `SearchHit` (serde camelCase). |
| `src/commands.rs` | All `#[tauri::command]`s. |
| `tauri.conf.json` | Window config (`decorations:false`, `dragDropEnabled:false`), identifier, bundle icons. |
| `capabilities/default.json` | Permission allow-list (core, opener, dialog, window controls). |
| `icons/` | Generated app icons (from `npm run tauri icon`). |

---

## 4. Data model & persistence

Schema (see `MIGRATION_001` in `src/db.rs`): `projects` → `sections` → `pages`.

- **UUID text primary keys** everywhere (no autoincrement) — needed for future sync.
- **Soft deletes**: `deleted_at` timestamp; queries filter `WHERE deleted_at IS NULL`. Nothing is hard-deleted (except FTS rows).
- **`parent_id`** (nullable) on `sections` and `pages` is **reserved for future nesting** and stays `NULL` in V1. The UI shows a flat 3-level hierarchy.
- **Page content** is stored as **Tiptap JSON** in `content_json` (never HTML). `content_text` is a derived plain-text copy that feeds search.
- **Search**: a standalone FTS5 virtual table `pages_fts(page_id, title, content_text)` is kept in sync **manually** from the command layer (on create/update/rename/delete of pages). It is standalone (not external-content) because PKs are TEXT UUIDs. `search()` does prefix matching per token and returns `snippet()`s with matches wrapped in `[ ]`.
- **Timestamps** are RFC 3339 strings (`chrono::Utc::now().to_rfc3339()`).

**Migrations are forward-only.** To change the schema, add a new
`if version < N { ... }` block in `run_migrations` and bump `user_version`.
Never edit a shipped migration.

**Backup** (`export_backup` / `import_backup`): export uses `VACUUM INTO` to
write a clean snapshot; import `ATTACH`es the file and replaces all rows in a
transaction, then rebuilds FTS. Import is destructive and is confirmed in the
UI. Native file dialogs come from `@tauri-apps/plugin-dialog`.

---

## 5. Conventions & patterns

- **Preferences** live in `localStorage` (device-local, not synced data) via
  `usePreferences`. Theme is applied by setting `data-theme` on `<html>`
  (`light` / `dark` / `auto`); accent is applied by overriding the `--accent`
  and `--accent-soft` CSS variables. There are **no user accounts** — the
  "profile" is just a local name + emoji (a product non-goal; keep it that way).
- **Theming**: CSS variables on `:root` (light defaults), `:root[data-theme="dark"]`,
  and a `prefers-color-scheme` media query for `auto`. Always use the variables.
- **Drop-in assets** via `import.meta.glob`: any image in
  `src/assets/backgrounds/` becomes a background preset automatically; the
  title-bar icon is `src/assets/icon.*`. No code change needed to add files.
- **Custom images** (user-picked backgrounds) are read into a `data:` URL by the
  Rust `read_image_data_url` command — this avoids configuring Tauri's asset
  protocol. Only the file path is stored in preferences.
- **Modals** share the `.modal-overlay` pattern. Some close via App's global
  `Escape` handler; `ConfirmDialog` and `FindBar` handle their own keys.
- **Global keyboard shortcuts** are registered in one `keydown` effect in
  `App.tsx` using refs/stable setters to avoid stale closures. An `isTyping`
  guard prevents single-key shortcuts (like `?`) from firing while typing.
- **Native drag-and-drop** (Tiptap block handle and `SidebarList` reordering)
  relies on `dragDropEnabled:false` in the window config.

### Keyboard shortcuts (current)
`Ctrl+K` palette · `Ctrl+N` quick capture · `Ctrl+F` find on page ·
`Ctrl+S` flush save · `Ctrl+\` toggle sidebar · `Ctrl+,` preferences ·
`?` shortcuts help · `Esc` close dialogs. Editor: `Ctrl+B`/`Ctrl+I` and
markdown input rules (`# `, `- `, `1. `, `[ ] `, `Shift+Enter`).

---

## 6. Gotchas (read before debugging)

- **No `React.StrictMode`.** Its dev double-mount unregisters/re-registers the
  Tiptap drag-handle plugin and breaks dragging. Do not re-add it.
- **`dragDropEnabled: false`** in `tauri.conf.json` is required so HTML5
  drag-and-drop works inside the WebView2 webview. With it on (the default),
  drags show the "no-drop" cursor.
- **`decorations: false`** → there is no native title bar; `TitleBar.tsx` is
  custom. The bar is draggable via `data-tauri-drag-region`; window controls use
  `@tauri-apps/api/window`. Required window permissions are in
  `capabilities/default.json`.
- **Windows taskbar icon is cached in dev.** The generated `.ico` is correct but
  Windows shows a stale/default icon for `target\debug\procrastinotes.exe`. The
  real icon appears in `npm run tauri build`.
- **`cargo` is not on the Git-Bash PATH** in some setups. Run Rust/Tauri
  commands from PowerShell, prepending
  `$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path`.
- **Dev process lifecycle:** `npm run tauri dev` exits when the app window is
  closed. Frontend edits hot-reload via Vite HMR; changes to Rust, `Cargo.toml`,
  `capabilities/`, or `tauri.conf.json` trigger a full rebuild + relaunch.

---

## 7. Running & building

```bash
npm install
npm run tauri dev          # dev with hot reload (first run compiles ~min)
npm run build              # typecheck + build the frontend bundle
npm run tauri build        # production .exe + installer (embeds the icon)
npm run tauri icon path/to/icon.png   # regenerate app icons from one 1024² PNG
```

The SQLite database is created automatically in the per-app data directory on
first run.

---

## 8. Adding a feature — quick recipe

- **New data operation:** Rust command in `commands.rs` → register in
  `lib.rs` `invoke_handler!` → add to `DataStore` → implement in
  `TauriDataStore`. If it touches the schema, add a new migration.
- **New page/section/project field:** add the column (new migration), update the
  Rust model + the relevant `INSERT`/`SELECT`s (including the backup
  `import_backup` column lists), the TS type in `types.ts`, and the UI.
- **New preference:** add it to `Preferences` + `DEFAULTS` in `preferences.ts`,
  apply it (CSS var / attribute / component), and add a control in
  `PreferencesModal.tsx`.
- **New keyboard shortcut:** extend the `keydown` effect in `App.tsx` and list
  it in `ShortcutsHelp.tsx`.

---

## 9. Status & roadmap

**Done (V1 is essentially feature-complete):** projects/sections/pages with
full CRUD + rename + drag-reorder; Tiptap editor (headings, lists, circular
task-list checkboxes, code, quote, block drag handle, formatting toolbar);
autosave; global FTS command palette; quick capture; find-in-page; shortcuts
help; custom frameless title bar; collapsible sidebar; preferences (theme,
accent, local profile, ambient particles, editor background with presets +
custom upload + opacity); styled delete confirmation; backup export/import.

**Not done yet / next ideas:** per-project icon & color UI (the `icon`/`color`/
`cover` columns already exist on `projects`); images inside page content;
tags / favorites / pinned / recent / daily notes / templates; markdown
import-export; the web `DataStore` (IndexedDB) implementation; **Android port**;
**Google Drive sync** (local-first, no server — see `docs/TECHNICAL_PLAN.md`);
iOS; encryption.

> Note: `AGENTS.md` / `CLAUDE.md` in the repo root currently describe an
> unrelated project and do not apply to Procrastinotes. Treat this file and
> `docs/REQUIREMENTS.md` as the source of truth.
