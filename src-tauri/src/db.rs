use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Tauri-managed state holding the single SQLite connection.
/// SQLite is the source of truth; everything goes through here.
pub struct Db(pub Mutex<Connection>);

/// Open the database, configure pragmas and run pending migrations.
pub fn init_connection(db_path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path)?;
    // WAL improves concurrent read/write; foreign keys enforce referential integrity.
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

/// Forward-only migrations keyed off SQLite's `user_version` pragma.
/// Add a new `if version < N` block per schema change; never edit past ones.
fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(MIGRATION_001)?;
        conn.execute_batch("PRAGMA user_version = 1;")?;
    }

    Ok(())
}

/// Initial schema: projects, sections, pages, and the FTS5 search index.
/// UUID text primary keys + soft deletes (`deleted_at`) are required for future sync.
/// `parent_id` columns are reserved for future nesting and stay NULL in V1.
const MIGRATION_001: &str = r#"
CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT,
    color       TEXT,
    cover       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);

CREATE TABLE sections (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id),
    parent_id   TEXT REFERENCES sections(id),
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);

CREATE TABLE pages (
    id            TEXT PRIMARY KEY,
    section_id    TEXT NOT NULL REFERENCES sections(id),
    parent_id     TEXT REFERENCES pages(id),
    title         TEXT NOT NULL DEFAULT '',
    content_json  TEXT NOT NULL DEFAULT '',
    content_text  TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    deleted_at    TEXT
);

CREATE INDEX idx_sections_project ON sections(project_id);
CREATE INDEX idx_pages_section ON pages(section_id);

-- Standalone FTS5 index kept in sync manually from the command layer.
-- Standalone (not external-content) because our primary keys are TEXT UUIDs.
CREATE VIRTUAL TABLE pages_fts USING fts5(
    page_id UNINDEXED,
    title,
    content_text
);
"#;
