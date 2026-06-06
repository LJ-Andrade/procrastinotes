# Google Drive Sync — Design

Goal: fully automatic sync so the same account can use Procrastinotes on more
than one computer with zero manual steps. Local-first: SQLite stays the source
of truth; sync is a separate layer that never blocks the UI and tolerates being
offline.

Status: **design / not yet implemented.** Blocked on Google OAuth credentials
(only the project owner can create them).

---

## Approach (Phase 1 — whole-database sync)

The entire database is synced as a single file in the user's **Drive
`appDataFolder`** (a hidden, per-app folder — no server, no cost, minimal
scope). This reuses the existing snapshot/replace machinery
(`export_backup` / `import_backup`).

Conflict policy: **last-write-wins by content timestamp**, which is correct for
"one computer at a time" usage (the expected case). A later Phase 2 can do
record-level merge using the UUID + `updated_at` + soft-delete design already in
the schema.

### Sync triggers
- **On app start:** pull if the remote is newer than what we last synced.
- **After edits (debounced) and on close:** push.
- Manual "Sync now" available too.

### Direction decision
Track three values: `local_cua` = `MAX(updated_at)` across local rows;
`synced_cua` = the value at the last successful sync (stored locally);
`remote_cua` = stored on the Drive file as a custom `appProperties` field we
control.

- No remote file → **push** (first sync).
- `local_cua > synced_cua` and remote unchanged → **push**.
- remote changed and `local_cua == synced_cua` → **pull**.
- both changed → **conflict**: keep the newer `cua` (RFC 3339 strings sort
  chronologically); back up the losing side locally before overwriting.

Pull replaces the local DB via the import path; push uploads a fresh
`VACUUM INTO` snapshot. The app reloads its in-memory state after a pull.

---

## OAuth (desktop / installed-app flow with PKCE)

1. Generate a PKCE verifier/challenge.
2. Start a loopback HTTP listener on `http://127.0.0.1:<random-port>`.
3. Open the system browser to Google's auth URL with scope
   `https://www.googleapis.com/auth/drive.appdata`, `access_type=offline`,
   `prompt=consent`, the PKCE challenge, and the loopback `redirect_uri`.
4. Catch the `code` on the loopback server.
5. Exchange the code at `https://oauth2.googleapis.com/token` for an
   access token + **refresh token**.
6. Persist the refresh token in the app data dir (`sync.json`). Refresh the
   access token on demand.

The OAuth **Client ID + secret** (a "Desktop app" client) are baked into the
build. For an installed app the secret is not confidential. The Google OAuth
consent screen should be set to **"In production"** so refresh tokens do not
expire after 7 days (the "Testing" limitation); the unverified-app warning is
expected and harmless for personal use.

### Drive REST calls used
- List: `GET /drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,appProperties)`
- Create/upload: multipart `POST /upload/drive/v3/files?uploadType=multipart` with `parents:["appDataFolder"]`
- Update content: `PATCH /upload/drive/v3/files/{id}?uploadType=media`
- Update metadata (`appProperties`): `PATCH /drive/v3/files/{id}`
- Download: `GET /drive/v3/files/{id}?alt=media`

---

## Planned surface

Rust (`src-tauri/src/sync.rs`, new): `drive_connect`, `drive_disconnect`,
`drive_status`, `sync_now`. Likely deps: `reqwest` (rustls), `sha2`, `base64`
(already present), a small loopback listener via `std::net`.

Frontend: a **Sync** section in `PreferencesModal` (Connect / Disconnect, last
sync time, status), plus a subtle status indicator and the auto-sync triggers
wired in `App.tsx`. A `DataStore`/command pair exposes status and `syncNow`.

Failure handling: every sync error is caught and surfaced quietly; the app keeps
working on the local database.
