# Procrastinotes - Technical Plan v1

Status: proposal, pending approval.
Companion to `docs/REQUIREMENTS.md` (product spec / source of truth for intended behavior).

---

## 1. Goals recap

- Local-first notepad: open, pick a project, write, close. No friction.
- Targets in order: **Windows desktop → Android → Web → iOS**.
- Sync via the user's own cloud (Google Drive first). No servers, no paid services.
- Calm, beautiful UI. Beauty through craft, not visual noise.

---

## 2. Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Shell / runtime | **Tauri 2** | UI is a real web app → reusable across desktop, mobile and web. Small native footprint. |
| UI | **React + TypeScript** | Mature ecosystem, fits Tiptap, reusable on web. |
| Editor | **Tiptap** (ProseMirror) | Structured JSON output, extensible, looks great. |
| Native layer | **Rust + `rusqlite`** | Rust owns the data: SQLite access, backup, future sync engine, future encryption. |
| Storage (native) | **SQLite** + **FTS5** | Source of truth on desktop/mobile; FTS5 for instant local search. |
| Storage (web) | **IndexedDB** | Browser fallback behind the same data interface. |
| State | Lightweight store (Zustand) | Minimal, no boilerplate. |

### Key architectural decision: the `DataStore` interface

The UI never talks to SQLite directly. It talks to a TypeScript `DataStore` interface.
Two implementations:

- `TauriDataStore` → invokes Rust commands → `rusqlite` → SQLite (desktop + mobile).
- `WebDataStore` → IndexedDB (browser).

This is what makes "web app too" cheap: same UI, swap the engine. Every feature is
written once against the interface.

```
React UI ──> DataStore (TS interface)
                ├── TauriDataStore ──> Rust commands ──> rusqlite ──> SQLite
                └── WebDataStore  ──> IndexedDB
```

---

## 3. Data model

UUIDs everywhere (no auto-increment). Soft deletes via `deleted_at`. Both are required
for future sync.

### Flexibility decision
The UI exposes exactly 3 levels in V1 (Project → Section → Page), but the schema keeps
the door open for nesting without a painful migration:

- `sections.parent_id` (nullable) → allows nested sections later.
- `pages.parent_id` (nullable) → allows nested pages later.

V1 simply leaves these `NULL` and renders 3 flat levels.

### Tables

```
projects
  id            TEXT (UUID) PK
  name          TEXT
  icon          TEXT NULL        -- emoji/icon for personality
  color         TEXT NULL        -- accent color
  cover         TEXT NULL        -- optional cover image ref (future)
  sort_order    INTEGER
  created_at    TEXT
  updated_at    TEXT
  deleted_at    TEXT NULL

sections
  id            TEXT (UUID) PK
  project_id    TEXT (UUID) FK
  parent_id     TEXT (UUID) NULL  -- future nesting, NULL in V1
  name          TEXT
  sort_order    INTEGER
  created_at / updated_at / deleted_at

pages
  id            TEXT (UUID) PK
  section_id    TEXT (UUID) FK
  parent_id     TEXT (UUID) NULL  -- future nesting, NULL in V1
  title         TEXT
  content_json  TEXT              -- Tiptap JSON (NOT html)
  content_text  TEXT              -- derived plain text, feeds FTS5
  sort_order    INTEGER
  created_at / updated_at / deleted_at
```

### Search
`content_text` is derived from the Tiptap JSON on every save and indexed with an FTS5
virtual table. Global search = single fast FTS5 query across titles + plain text.

### Content storage
Store **Tiptap JSON only**, never HTML. Better sync, easier migrations, structured data.

---

## 4. Sync (post-V1, but architected now)

- **Local-first, always.** SQLite is the source of truth. The app fully works offline.
  Sync failing must never block the user.
- **Provider 1: Google Drive** via OAuth, using the per-app hidden folder
  (`appDataFolder`). The user logs in with their own Google account. **No server, no cost.**
- Sync is a **separate Rust layer**, independent from the UI. UI never waits on it.
- Architecture stays open to WebDAV / Dropbox / OneDrive later via a `SyncProvider` trait.
- UUIDs + soft deletes + `updated_at` give us what we need for later conflict handling.

V1 ships only **Export / Import backup** (single portable file). Real sync comes after.

---

## 5. Visual direction

Beauty through craft, not noise. Concretely:

- **Typography first**: a quality serif option for writing (iA Writer / Bear feel) + clean UI sans.
- **Themes**: light / dark + a small set of hand-picked accent palettes.
- **Per-project personality**: icon/emoji + accent color, optional cover image.
- **Tasteful micro-interactions**: command palette entrance, page transitions. Movement is
  punctual, never constant.
- **Optional "ambient" mode**: a very soft gradient/texture per project, **off by default**,
  for users who want extra flavor without breaking the calm.

Explicitly avoided: permanent animated backgrounds (hurt focus, battery on Android, and the
sub-2s / imperceptible-latency targets).

---

## 6. Execution phases (build order)

Each phase is shippable and built against the `DataStore` interface.

**Phase 0 — Skeleton**
- Tauri 2 + React + TS project scaffold (Windows target).
- Rust data layer: rusqlite, migrations, schema above, UUID + soft-delete helpers.
- `DataStore` interface + `TauriDataStore` wiring.

**Phase 1 — Structure**
- 3-column layout (calm, minimal).
- Projects + sections CRUD in the left sidebar.
- Drag & drop reorder.

**Phase 2 — Writing**
- Tiptap editor in the main area (text, headings, lists, tasks/checkboxes, optional code blocks).
- Autosave (Tiptap JSON → SQLite), derive `content_text`.
- `Ctrl+S` as explicit-save placebo on top of autosave.

**Phase 3 — Speed / navigation**
- Command palette (`Ctrl+K`): search + create + navigate.
- Quick capture (`Ctrl+N`): instant new page, cursor focused.
- Keyboard-only navigation. Shortcuts: `Ctrl+F`, `Ctrl+Shift+F`.

**Phase 4 — Search**
- FTS5 global search across projects, sections, pages, content.

**Phase 5 — Backup**
- Export / import single portable backup file.

**Phase 6 — Polish (the "lindo")**
- Themes, typography, per-project icon/color, micro-interactions, optional ambient mode.

**Phase 7 — Android**
- Port via Tauri mobile once desktop is solid. Adapt storage/permissions to the sandbox.

**Later — Web & sync**
- `WebDataStore` (IndexedDB) → ship the web build.
- Google Drive sync layer in Rust.
- iOS.

---

## 7. Open decisions / risks

- Tauri 2 mobile is newer than desktop → Android is its own phase, not parallel.
- Android backup can't rely on copying the raw `.db`; export/import stays portable.
- Google OAuth needs a client ID set up (free) before sync work begins.
