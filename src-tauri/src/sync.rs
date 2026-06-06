//! Automatic Google Drive sync (Phase 1: whole-database).
//!
//! Local-first: SQLite stays the source of truth. The whole DB is synced as a
//! single file in the user's Drive `appDataFolder` (hidden, per-app, no server).
//! See `docs/SYNC.md`.
//!
//! Threading: each command is `async` and does all of its blocking work
//! (HTTP via `reqwest::blocking`, the OAuth loopback, and SQLite) inside one
//! `spawn_blocking`, so the UI thread is never blocked and we avoid running
//! blocking I/O on the async runtime.

use crate::commands::{export_snapshot, import_snapshot};
use crate::db::Db;
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Manager};

// Desktop OAuth client, injected at compile time from gitignored build env
// (src-tauri/.cargo/config.toml — see .cargo/config.toml.example). Kept out of
// the (public) repo. If unset, sync stays disabled with a friendly message.
const CLIENT_ID: &str = match option_env!("PROCRASTINOTES_GOOGLE_CLIENT_ID") {
    Some(v) => v,
    None => "",
};
const CLIENT_SECRET: &str = match option_env!("PROCRASTINOTES_GOOGLE_CLIENT_SECRET") {
    Some(v) => v,
    None => "",
};
const SCOPE: &str = "https://www.googleapis.com/auth/drive.appdata openid email";
const REMOTE_NAME: &str = "procrastinotes.db";

// ---------------------------------------------------------------------------
// Persisted sync state (app_data_dir/sync.json)
// ---------------------------------------------------------------------------

#[derive(Default, Serialize, Deserialize)]
struct SyncState {
    refresh_token: Option<String>,
    email: Option<String>,
    remote_file_id: Option<String>,
    /// The remote content token we last saw (changes whenever any device pushes).
    synced_token: Option<String>,
    /// Local changes not yet pushed.
    dirty: bool,
    last_sync: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    connected: bool,
    email: Option<String>,
    last_sync: Option<String>,
    dirty: bool,
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("sync.json"))
}

fn load_state(app: &AppHandle) -> SyncState {
    state_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_state(app: &AppHandle, state: &SyncState) -> Result<(), String> {
    let s = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(state_path(app)?, s).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Async command wrappers — all blocking work runs in one spawn_blocking
// ---------------------------------------------------------------------------

async fn run_blocking<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    match tauri::async_runtime::spawn_blocking(f).await {
        Ok(inner) => inner,
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn drive_status(app: AppHandle) -> Result<SyncStatus, String> {
    run_blocking(move || Ok(status_blocking(&app))).await
}

#[tauri::command]
pub async fn drive_connect(app: AppHandle) -> Result<SyncStatus, String> {
    run_blocking(move || connect_blocking(&app)).await
}

#[tauri::command]
pub async fn drive_disconnect(app: AppHandle) -> Result<(), String> {
    run_blocking(move || {
        let _ = std::fs::remove_file(state_path(&app)?);
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn sync_mark_dirty(app: AppHandle) -> Result<(), String> {
    run_blocking(move || {
        let mut s = load_state(&app);
        if s.refresh_token.is_some() && !s.dirty {
            s.dirty = true;
            save_state(&app, &s)?;
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn sync_now(app: AppHandle) -> Result<String, String> {
    run_blocking(move || sync_blocking(&app)).await
}

#[tauri::command]
pub async fn sync_resolve(app: AppHandle, keep: String) -> Result<String, String> {
    run_blocking(move || resolve_blocking(&app, &keep)).await
}

// ---------------------------------------------------------------------------
// Blocking implementations
// ---------------------------------------------------------------------------

fn status_blocking(app: &AppHandle) -> SyncStatus {
    let s = load_state(app);
    SyncStatus {
        connected: s.refresh_token.is_some(),
        email: s.email,
        last_sync: s.last_sync,
        dirty: s.dirty,
    }
}

fn connect_blocking(app: &AppHandle) -> Result<SyncStatus, String> {
    if CLIENT_ID.is_empty() || CLIENT_SECRET.is_empty() {
        return Err(
            "Drive sync is not configured in this build (missing OAuth credentials).".into(),
        );
    }
    let verifier = rand_token(32);
    let challenge = pkce_challenge(&verifier);

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect = format!("http://127.0.0.1:{port}");

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&code_challenge={}&code_challenge_method=S256",
        urlencoding::encode(CLIENT_ID),
        urlencoding::encode(&redirect),
        urlencoding::encode(SCOPE),
        challenge,
    );
    open::that(&auth_url).map_err(|e| format!("Could not open browser: {e}"))?;

    let code = wait_for_code(listener)?;
    let tokens = exchange_code(&code, &verifier, &redirect)?;
    let refresh = tokens
        .refresh_token
        .ok_or("Google did not return a refresh token")?;
    let email = fetch_email(&tokens.access_token);

    let mut state = load_state(app);
    state.refresh_token = Some(refresh);
    state.email = email;
    save_state(app, &state)?;

    Ok(SyncStatus {
        connected: true,
        email: state.email,
        last_sync: state.last_sync,
        dirty: state.dirty,
    })
}

fn sync_blocking(app: &AppHandle) -> Result<String, String> {
    let mut state = load_state(app);
    let refresh = match &state.refresh_token {
        Some(r) => r.clone(),
        None => return Ok("disconnected".into()),
    };
    let access = refresh_access(&refresh)?;
    let local_changed = state.dirty;

    match find_remote(&access)? {
        None => {
            let bytes = make_snapshot(app)?;
            let token = rand_token(12);
            let id = upload_new(&access, &bytes, &token)?;
            state.remote_file_id = Some(id);
            state.synced_token = Some(token);
            finish(app, &mut state)?;
            Ok("pushed".into())
        }
        Some((id, remote_token)) => {
            state.remote_file_id = Some(id.clone());
            let remote_changed = remote_token != state.synced_token;
            if local_changed && remote_changed {
                save_state(app, &state)?;
                Ok("conflict".into())
            } else if remote_changed {
                let bytes = download_remote(&access, &id)?;
                apply_snapshot(app, &bytes)?;
                state.synced_token = remote_token;
                finish(app, &mut state)?;
                Ok("pulled".into())
            } else if local_changed {
                let bytes = make_snapshot(app)?;
                update_content(&access, &id, &bytes)?;
                let token = rand_token(12);
                update_token(&access, &id, &token)?;
                state.synced_token = Some(token);
                finish(app, &mut state)?;
                Ok("pushed".into())
            } else {
                state.last_sync = Some(now());
                save_state(app, &state)?;
                Ok("upToDate".into())
            }
        }
    }
}

fn resolve_blocking(app: &AppHandle, keep: &str) -> Result<String, String> {
    let mut state = load_state(app);
    let refresh = state.refresh_token.clone().ok_or("Not connected")?;
    let access = refresh_access(&refresh)?;
    let (id, remote_token) = find_remote(&access)?.ok_or("No remote file")?;
    state.remote_file_id = Some(id.clone());

    if keep == "remote" {
        // Keep Drive's version; back up the local one first.
        if let Ok(local) = make_snapshot(app) {
            let _ = std::fs::write(conflict_backup_path(app)?, &local);
        }
        let bytes = download_remote(&access, &id)?;
        apply_snapshot(app, &bytes)?;
        state.synced_token = remote_token;
        finish(app, &mut state)?;
        Ok("pulled".into())
    } else {
        // Keep this computer's version; back up the remote one first.
        if let Ok(remote_bytes) = download_remote(&access, &id) {
            let _ = std::fs::write(conflict_backup_path(app)?, &remote_bytes);
        }
        let bytes = make_snapshot(app)?;
        update_content(&access, &id, &bytes)?;
        let token = rand_token(12);
        update_token(&access, &id, &token)?;
        state.synced_token = Some(token);
        finish(app, &mut state)?;
        Ok("pushed".into())
    }
}

fn finish(app: &AppHandle, state: &mut SyncState) -> Result<(), String> {
    state.dirty = false;
    state.last_sync = Some(now());
    save_state(app, state)
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn conflict_backup_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join(format!(
        "conflict-backup-{}.db",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    )))
}

// ---------------------------------------------------------------------------
// Database snapshot <-> bytes
// ---------------------------------------------------------------------------

fn make_snapshot(app: &AppHandle) -> Result<Vec<u8>, String> {
    let path = app_dir(app)?.join("sync_push.db");
    let p = path.to_string_lossy().to_string();
    {
        let db = app.state::<Db>();
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        export_snapshot(&conn, &p)?;
    }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&path);
    Ok(bytes)
}

fn apply_snapshot(app: &AppHandle, bytes: &[u8]) -> Result<(), String> {
    let path = app_dir(app)?.join("sync_pull.db");
    let p = path.to_string_lossy().to_string();
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    {
        let db = app.state::<Db>();
        let mut conn = db.0.lock().map_err(|e| e.to_string())?;
        import_snapshot(&mut conn, &p)?;
    }
    let _ = std::fs::remove_file(&path);
    Ok(())
}

// ---------------------------------------------------------------------------
// PKCE + loopback
// ---------------------------------------------------------------------------

fn rand_token(n: usize) -> String {
    use rand::RngCore;
    let mut bytes = vec![0u8; n];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

fn wait_for_code(listener: TcpListener) -> Result<String, String> {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(accept_code(listener));
    });
    match rx.recv_timeout(Duration::from_secs(300)) {
        Ok(res) => res,
        Err(_) => Err("Authorization timed out".into()),
    }
}

fn accept_code(listener: TcpListener) -> Result<String, String> {
    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let request_line = String::from_utf8_lossy(&buf[..n])
        .lines()
        .next()
        .unwrap_or("")
        .to_string();

    let body = "<!doctype html><html><body style=\"font-family:system-ui;text-align:center;padding-top:64px;background:#1a1917;color:#e8e4dd\"><h2>Procrastinotes</h2><p>Connected. You can close this tab.</p></body></html>";
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());

    if let Some(code) = query_param(&request_line, "code") {
        Ok(code)
    } else if let Some(err) = query_param(&request_line, "error") {
        Err(format!("Authorization denied: {err}"))
    } else {
        Err("No authorization code received".into())
    }
}

fn query_param(request_line: &str, key: &str) -> Option<String> {
    let path = request_line.split_whitespace().nth(1)?;
    let query = path.split_once('?')?.1;
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == key {
                return urlencoding::decode(v).ok().map(|c| c.into_owned());
            }
        }
    }
    None
}

// ---------------------------------------------------------------------------
// OAuth token + Drive REST (reqwest::blocking)
// ---------------------------------------------------------------------------

fn http() -> reqwest::blocking::Client {
    reqwest::blocking::Client::new()
}

#[derive(Deserialize)]
struct TokenResp {
    access_token: String,
    refresh_token: Option<String>,
}

fn exchange_code(code: &str, verifier: &str, redirect: &str) -> Result<TokenResp, String> {
    let params = [
        ("client_id", CLIENT_ID),
        ("client_secret", CLIENT_SECRET),
        ("code", code),
        ("code_verifier", verifier),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect),
    ];
    let resp = http()
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Token exchange failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    resp.json::<TokenResp>().map_err(|e| e.to_string())
}

fn refresh_access(refresh_token: &str) -> Result<String, String> {
    let params = [
        ("client_id", CLIENT_ID),
        ("client_secret", CLIENT_SECRET),
        ("refresh_token", refresh_token),
        ("grant_type", "refresh_token"),
    ];
    let resp = http()
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Sign-in expired, please reconnect ({})",
            resp.text().unwrap_or_default()
        ));
    }
    Ok(resp.json::<TokenResp>().map_err(|e| e.to_string())?.access_token)
}

fn fetch_email(access: &str) -> Option<String> {
    let resp = http()
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access)
        .send()
        .ok()?;
    let v: serde_json::Value = resp.json().ok()?;
    v.get("email").and_then(|e| e.as_str()).map(String::from)
}

/// Returns `(file_id, content_token)` for our DB file if it exists.
fn find_remote(access: &str) -> Result<Option<(String, Option<String>)>, String> {
    let resp = http()
        .get("https://www.googleapis.com/drive/v3/files")
        .query(&[
            ("spaces", "appDataFolder"),
            ("fields", "files(id,name,appProperties)"),
        ])
        .bearer_auth(access)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Drive list failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    let v: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    if let Some(files) = v.get("files").and_then(|f| f.as_array()) {
        for f in files {
            if f.get("name").and_then(|n| n.as_str()) == Some(REMOTE_NAME) {
                let id = f
                    .get("id")
                    .and_then(|i| i.as_str())
                    .unwrap_or("")
                    .to_string();
                let token = f
                    .get("appProperties")
                    .and_then(|p| p.get("contentToken"))
                    .and_then(|t| t.as_str())
                    .map(String::from);
                return Ok(Some((id, token)));
            }
        }
    }
    Ok(None)
}

fn download_remote(access: &str, id: &str) -> Result<Vec<u8>, String> {
    let resp = http()
        .get(format!("https://www.googleapis.com/drive/v3/files/{id}"))
        .query(&[("alt", "media")])
        .bearer_auth(access)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Download failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    Ok(resp.bytes().map_err(|e| e.to_string())?.to_vec())
}

fn upload_new(access: &str, bytes: &[u8], token: &str) -> Result<String, String> {
    let boundary = "procrastinotes_boundary_8a3f";
    let meta = serde_json::json!({
        "name": REMOTE_NAME,
        "parents": ["appDataFolder"],
        "appProperties": { "contentToken": token },
    });
    let mut body: Vec<u8> = Vec::new();
    body.extend_from_slice(
        format!("--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n")
            .as_bytes(),
    );
    body.extend_from_slice(meta.to_string().as_bytes());
    body.extend_from_slice(
        format!("\r\n--{boundary}\r\nContent-Type: application/octet-stream\r\n\r\n").as_bytes(),
    );
    body.extend_from_slice(bytes);
    body.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());

    let resp = http()
        .post("https://www.googleapis.com/upload/drive/v3/files")
        .query(&[("uploadType", "multipart")])
        .bearer_auth(access)
        .header(
            "Content-Type",
            format!("multipart/related; boundary={boundary}"),
        )
        .body(body)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Upload failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    let v: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    Ok(v.get("id").and_then(|i| i.as_str()).unwrap_or("").to_string())
}

fn update_content(access: &str, id: &str, bytes: &[u8]) -> Result<(), String> {
    let resp = http()
        .patch(format!(
            "https://www.googleapis.com/upload/drive/v3/files/{id}"
        ))
        .query(&[("uploadType", "media")])
        .bearer_auth(access)
        .header("Content-Type", "application/octet-stream")
        .body(bytes.to_vec())
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Update failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    Ok(())
}

fn update_token(access: &str, id: &str, token: &str) -> Result<(), String> {
    let meta = serde_json::json!({ "appProperties": { "contentToken": token } });
    let resp = http()
        .patch(format!("https://www.googleapis.com/drive/v3/files/{id}"))
        .bearer_auth(access)
        .json(&meta)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!(
            "Metadata update failed: {}",
            resp.text().unwrap_or_default()
        ));
    }
    Ok(())
}
