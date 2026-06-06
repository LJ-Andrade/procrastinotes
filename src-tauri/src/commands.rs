use crate::db::Db;
use crate::models::{Page, Project, SearchHit, Section};
use rusqlite::Row;
use tauri::State;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Current time as an RFC 3339 string. All timestamps use this format.
fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

/// Lock the connection, converting a poisoned mutex into a string error.
macro_rules! conn {
    ($db:expr) => {
        $db.0.lock().map_err(|e| e.to_string())?
    };
}

fn map_project(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get("id")?,
        name: row.get("name")?,
        icon: row.get("icon")?,
        color: row.get("color")?,
        cover: row.get("cover")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

fn map_section(row: &Row) -> rusqlite::Result<Section> {
    Ok(Section {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        parent_id: row.get("parent_id")?,
        name: row.get("name")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

fn map_page(row: &Row) -> rusqlite::Result<Page> {
    Ok(Page {
        id: row.get("id")?,
        section_id: row.get("section_id")?,
        parent_id: row.get("parent_id")?,
        title: row.get("title")?,
        content_json: row.get("content_json")?,
        content_text: row.get("content_text")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_projects(db: State<Db>) -> Result<Vec<Project>, String> {
    let conn = conn!(db);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM projects WHERE deleted_at IS NULL \
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], map_project)
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(db: State<Db>, name: String) -> Result<Project, String> {
    let conn = conn!(db);
    let id = new_id();
    let ts = now();
    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order) + 1, 0) FROM projects WHERE deleted_at IS NULL",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO projects (id, name, sort_order, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?4)",
        rusqlite::params![id, name, sort_order, ts],
    )
    .map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM projects WHERE id = ?1", [&id], map_project)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_project(db: State<Db>, id: String, name: String) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE projects SET name = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, name, now()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(db: State<Db>, id: String) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE projects SET deleted_at = ?2 WHERE id = ?1",
        rusqlite::params![id, now()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_projects(db: State<Db>, ids: Vec<String>) -> Result<(), String> {
    let mut conn = conn!(db);
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE projects SET sort_order = ?2 WHERE id = ?1",
            rusqlite::params![id, index as i64],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_sections(db: State<Db>, project_id: String) -> Result<Vec<Section>, String> {
    let conn = conn!(db);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM sections WHERE project_id = ?1 AND deleted_at IS NULL \
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&project_id], map_section)
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_section(
    db: State<Db>,
    project_id: String,
    name: String,
) -> Result<Section, String> {
    let conn = conn!(db);
    let id = new_id();
    let ts = now();
    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order) + 1, 0) FROM sections \
             WHERE project_id = ?1 AND deleted_at IS NULL",
            [&project_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO sections (id, project_id, name, sort_order, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        rusqlite::params![id, project_id, name, sort_order, ts],
    )
    .map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM sections WHERE id = ?1", [&id], map_section)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_section(db: State<Db>, id: String, name: String) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE sections SET name = ?2, updated_at = ?3 WHERE id = ?1",
        rusqlite::params![id, name, now()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_section(db: State<Db>, id: String) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE sections SET deleted_at = ?2 WHERE id = ?1",
        rusqlite::params![id, now()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_sections(db: State<Db>, ids: Vec<String>) -> Result<(), String> {
    let mut conn = conn!(db);
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE sections SET sort_order = ?2 WHERE id = ?1",
            rusqlite::params![id, index as i64],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/// Lists pages without their content payload, to keep the listing light.
#[tauri::command]
pub fn list_pages(db: State<Db>, section_id: String) -> Result<Vec<Page>, String> {
    let conn = conn!(db);
    let mut stmt = conn
        .prepare(
            "SELECT id, section_id, parent_id, title, \
                    '' AS content_json, '' AS content_text, \
                    sort_order, created_at, updated_at, deleted_at \
             FROM pages WHERE section_id = ?1 AND deleted_at IS NULL \
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&section_id], map_page)
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

/// Fetches a single page including its full content.
#[tauri::command]
pub fn get_page(db: State<Db>, id: String) -> Result<Option<Page>, String> {
    let conn = conn!(db);
    let mut stmt = conn
        .prepare("SELECT * FROM pages WHERE id = ?1 AND deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map([&id], map_page)
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(row) => Ok(Some(row.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn create_page(db: State<Db>, section_id: String, title: String) -> Result<Page, String> {
    let conn = conn!(db);
    let id = new_id();
    let ts = now();
    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order) + 1, 0) FROM pages \
             WHERE section_id = ?1 AND deleted_at IS NULL",
            [&section_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pages (id, section_id, title, sort_order, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        rusqlite::params![id, section_id, title, sort_order, ts],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pages_fts (page_id, title, content_text) VALUES (?1, ?2, '')",
        rusqlite::params![id, title],
    )
    .map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM pages WHERE id = ?1", [&id], map_page)
        .map_err(|e| e.to_string())
}

/// Saves a page. `content_json` is Tiptap JSON; `content_text` is the derived
/// plain text used for search. Both come from the editor on the frontend.
#[tauri::command]
pub fn update_page(
    db: State<Db>,
    id: String,
    title: String,
    content_json: String,
    content_text: String,
) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE pages SET title = ?2, content_json = ?3, content_text = ?4, updated_at = ?5 \
         WHERE id = ?1",
        rusqlite::params![id, title, content_json, content_text, now()],
    )
    .map_err(|e| e.to_string())?;
    // Keep the FTS index in sync: delete + reinsert this page's row.
    conn.execute("DELETE FROM pages_fts WHERE page_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pages_fts (page_id, title, content_text) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, title, content_text],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_page(db: State<Db>, id: String) -> Result<(), String> {
    let conn = conn!(db);
    conn.execute(
        "UPDATE pages SET deleted_at = ?2 WHERE id = ?1",
        rusqlite::params![id, now()],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM pages_fts WHERE page_id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_pages(db: State<Db>, ids: Vec<String>) -> Result<(), String> {
    let mut conn = conn!(db);
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE pages SET sort_order = ?2 WHERE id = ?1",
            rusqlite::params![id, index as i64],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/// Global full-text search over page titles and content.
/// Only returns hits for pages that are not soft-deleted.
#[tauri::command]
pub fn search(db: State<Db>, query: String) -> Result<Vec<SearchHit>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    // Prefix match on each token so partial words match while typing.
    let fts_query = trimmed
        .split_whitespace()
        .map(|t| format!("{}*", t.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ");

    let conn = conn!(db);
    let mut stmt = conn
        .prepare(
            "SELECT p.id AS page_id, p.section_id AS section_id, \
                    s.project_id AS project_id, p.title AS title, \
                    snippet(pages_fts, 2, '[', ']', '…', 8) AS snippet \
             FROM pages_fts \
             JOIN pages p ON p.id = pages_fts.page_id \
             JOIN sections s ON s.id = p.section_id \
             WHERE pages_fts MATCH ?1 AND p.deleted_at IS NULL \
             ORDER BY rank \
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([&fts_query], |row| {
            Ok(SearchHit {
                page_id: row.get("page_id")?,
                section_id: row.get("section_id")?,
                project_id: row.get("project_id")?,
                title: row.get("title")?,
                snippet: row.get("snippet")?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}
