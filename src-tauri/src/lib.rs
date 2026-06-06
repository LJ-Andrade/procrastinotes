mod commands;
mod db;
mod models;

use db::Db;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The SQLite file lives in the per-app data directory. It is the
            // source of truth; the app works fully offline.
            let dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&dir).expect("failed to create app data dir");
            let db_path = dir.join("procrastinotes.db");
            let conn = db::init_connection(&db_path).expect("failed to initialize database");
            app.manage(Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::create_project,
            commands::rename_project,
            commands::delete_project,
            commands::reorder_projects,
            commands::list_sections,
            commands::create_section,
            commands::rename_section,
            commands::delete_section,
            commands::reorder_sections,
            commands::list_pages,
            commands::get_page,
            commands::create_page,
            commands::update_page,
            commands::rename_page,
            commands::delete_page,
            commands::reorder_pages,
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
