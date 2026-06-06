# Procrastinotes — Build & Deploy Guide

How to turn the source tree into a distributable Windows executable, where the
artifacts land, and what to know before handing the build to a user.

Windows is the only target wired up today. macOS / Linux / Android sections at
the bottom are notes for later, not finished playbooks.

---

## 1. Prerequisites (Windows)

Install once on the build machine.

| Tool | Why | How |
| --- | --- | --- |
| **Node.js 18+** | Runs Vite and the Tauri CLI | <https://nodejs.org/> (LTS) |
| **Rust (stable, MSVC)** | Compiles the native shell | `rustup-init.exe` from <https://rustup.rs/>, accept default (`stable-x86_64-pc-windows-msvc`) |
| **Microsoft C++ Build Tools** | Linker + Windows SDK that Rust uses | "Build Tools for Visual Studio" → workload **Desktop development with C++** |
| **WebView2 Runtime** | Renders the UI at runtime | Ships with Windows 11. On Windows 10 install the **Evergreen Bootstrapper** from Microsoft if missing |
| **WiX Toolset v3** *(optional)* | Required only if you want the `.msi` installer | Tauri downloads it automatically on first build; manual install at <https://wixtoolset.org/> if the auto-download is blocked |

Quick sanity check:

```powershell
node --version       # v18+ or v20+
rustc --version      # 1.7x+ with -msvc
cargo --version
```

Then install the JS deps once:

```powershell
npm install
```

---

## 2. Day-to-day commands

| Command | What it does |
| --- | --- |
| `npm run tauri dev` | Live dev: starts Vite on `http://localhost:1420`, builds the Rust shell in debug mode, opens the WebView2 window. Hot reload for the frontend; the Rust side rebuilds when you save `.rs` files. |
| `npm run build` | Frontend-only check: `tsc` (typecheck) + `vite build` into `dist/`. Useful as a quick "does the JS compile" gate before a full bundle. |
| `npm run tauri build` | **Release build.** Runs `npm run build` first (defined in [tauri.conf.json:9](src-tauri/tauri.conf.json:9) as `beforeBuildCommand`), then compiles Rust in release mode and bundles installers. |

The dev command is what you want 99% of the time. The build command is for
producing the artifact you hand to a user.

---

## 3. Producing the release build

From the repo root:

```powershell
npm run tauri build
```

What happens, in order:

1. **Frontend bundle.** `tsc` typechecks the TypeScript, then `vite build` writes
   the static assets to `dist/` (the `frontendDist` configured in
   [tauri.conf.json:10](src-tauri/tauri.conf.json:10)).
2. **Rust compile (release).** `cargo build --release` produces
   `src-tauri/target/release/procrastinotes.exe`. First build is slow (~5–10 min
   downloading and compiling crates). Subsequent builds reuse the target
   directory.
3. **Bundle.** Tauri packages the exe + WebView2 loader + icons + frontend
   into installers under `src-tauri/target/release/bundle/`.

When it finishes, you'll see paths like:

```
src-tauri/target/release/procrastinotes.exe
src-tauri/target/release/bundle/msi/Procrastinotes_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/Procrastinotes_0.1.0_x64-setup.exe
```

### Which artifact do I ship?

| Artifact | What it is | When to use |
| --- | --- | --- |
| `bundle/nsis/Procrastinotes_<v>_x64-setup.exe` | NSIS installer (~10 MB). Familiar Next/Next/Finish wizard, per-user install by default. | **Default for distribution.** Works on Windows 10/11, no admin needed. |
| `bundle/msi/Procrastinotes_<v>_x64_en-US.msi` | Windows Installer package. | Use when the target environment requires MSI (corporate deployments, Group Policy). |
| `target/release/procrastinotes.exe` | The raw binary — no installer, no resources extracted. | **Don't ship this directly.** It still expects WebView2 and won't be in Start Menu, won't create the app data dir on first launch via shortcut, won't uninstall cleanly. Useful for quick local testing of the release build. |

To skip one of the bundle formats (faster build), pass `--bundles`:

```powershell
npm run tauri build -- --bundles nsis       # only NSIS
npm run tauri build -- --bundles msi        # only MSI
npm run tauri build -- --bundles app        # no installer, just the exe
```

---

## 4. Where the app stores data at runtime

Documented here so support questions and "where is my data?" don't require
spelunking. Both paths are user-scoped (`javze` is whatever the current user is).

| Path | What lives there | Survives uninstall? |
| --- | --- | --- |
| `%APPDATA%\com.ljandrade.procrastinotes\` | `procrastinotes.db` (SQLite) + `-shm` / `-wal` companions. **This is the source of truth — back this folder up.** | Yes (by default; installers don't delete user data) |
| `%LOCALAPPDATA%\com.ljandrade.procrastinotes\EBWebView\` | WebView2 user-data directory (Chromium cache, GPU shader cache, profile state). Disposable. | Yes |

Concrete example on this machine:

```
C:\Users\<user>\AppData\Roaming\com.ljandrade.procrastinotes\procrastinotes.db
C:\Users\<user>\AppData\Local\com.ljandrade.procrastinotes\EBWebView\
```

If a user reports the editor showing a blank page or a sad-face icon at startup,
deleting `EBWebView` is the safe first move — the DB is in `Roaming` and is not
touched.

The identifier comes from [tauri.conf.json:5](src-tauri/tauri.conf.json:5)
(`com.ljandrade.procrastinotes`). Changing it would orphan every existing
install's data — don't do that lightly.

---

## 5. Versioning

The version that ends up in the installer filename and the app's "About" comes
from **two places that must stay in sync**:

- [package.json:4](package.json:4) — `"version"`
- [src-tauri/tauri.conf.json:4](src-tauri/tauri.conf.json:4) — `"version"`
- [src-tauri/Cargo.toml:3](src-tauri/Cargo.toml:3) — `version = "..."`

Bump all three together before running `tauri build`. Suggested flow:

```powershell
# Edit the three files to the new version, then:
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "Release v0.2.0"
git tag v0.2.0
npm run tauri build
```

We don't have a script to bump them in lockstep yet; do it by hand and verify
with `grep "0\.1\.0"` before tagging.

---

## 6. Code signing (production distribution)

Unsigned binaries on Windows trigger SmartScreen ("Windows protected your PC")
on first launch. Fine for personal use, painful when handing to a user.

Tauri supports signing as part of the build. Required pieces:

1. A code-signing certificate (`.pfx`) — purchased from a CA, or a self-signed
   cert for testing (still triggers SmartScreen but lets you verify the pipeline).
2. The cert's password.
3. Add a `windows.signCommand` or equivalent under `bundle` in
   `tauri.conf.json`, or set the environment variables Tauri reads:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\path\to\cert.pfx"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "..."
npm run tauri build
```

Reference: <https://tauri.app/distribute/sign/windows/>.

Today **none of this is configured.** The artifacts produced by
`npm run tauri build` are unsigned. When we're ready to distribute publicly,
that's the next step.

---

## 7. Auto-update

Not enabled. Tauri's updater is opt-in via the `tauri-plugin-updater` plugin
and a `tauri.conf.json > plugins.updater` block, neither of which is configured
in this repo.

If we add it later:

1. Add `tauri-plugin-updater` to `Cargo.toml` and register it in
   [src-tauri/src/lib.rs](src-tauri/src/lib.rs).
2. Generate a signing key pair (`tauri signer generate`).
3. Host an `update.json` manifest somewhere reachable from the app.
4. Configure the endpoint and the public key in `tauri.conf.json`.

Until then, "update" = the user downloads a new installer manually.

---

## 8. CI builds (not set up)

No CI workflow exists. If we want one, the canonical setup is GitHub Actions on
a Windows runner:

```yaml
# .github/workflows/release.yml — sketch, not committed
name: release
on:
  push:
    tags: ["v*"]
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run tauri build
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/msi/*.msi
```

That builds on every `v*` tag and attaches the installers to a GitHub Release.

---

## 9. Smoke test before handing off a build

Before sending a `.exe` to a user, run through this list on the build machine
(or a clean VM if you have one):

1. **Install runs cleanly.** Double-click the NSIS installer → wizard finishes
   without errors.
2. **App opens.** Start menu → Procrastinotes. Window appears, editor renders
   (no white background, no sad-face icon — that's the WebView2 crash page).
3. **Data persists.** Create a project / section / page, write something, close
   the window, reopen — content is still there.
4. **DB lives in the right place.** Check `%APPDATA%\com.ljandrade.procrastinotes\`
   exists and contains `procrastinotes.db`.
5. **Uninstall is reachable.** Settings → Apps → Procrastinotes → Uninstall
   removes the binary. User data in `Roaming` is intentionally left behind.

If any step fails, don't ship — debug with `npm run tauri dev` first to isolate
whether it's a code issue or a packaging issue.

---

## 10. Troubleshooting the build

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `error: linker 'link.exe' not found` | C++ Build Tools missing | Install "Desktop development with C++" workload |
| `error: failed to run custom build command for openssl-sys` | Stale rustls / openssl config | We use rustls (no OpenSSL). If you see this, the dep tree drifted — check `reqwest` features in [src-tauri/Cargo.toml:30](src-tauri/Cargo.toml:30) still says `"rustls-tls"` |
| Long initial build, then "Blocking waiting for file lock on build directory" | Another `cargo` process is running (often a stale `tauri dev`) | Close other terminals, kill leftover `cargo.exe` / `procrastinotes.exe` processes |
| `npm run tauri build` succeeds but `bundle/` is empty | `--bundles app` was used, or bundling was skipped | Re-run without overrides, or pass `--bundles nsis,msi` explicitly |
| Installer runs but app shows sad face on launch | WebView2 user-data dir corrupted | Delete `%LOCALAPPDATA%\com.ljandrade.procrastinotes\EBWebView\` |
| `cargo` not on PATH in Git Bash | Rust installs under `~/.cargo/bin`, which Git Bash doesn't auto-add | Use PowerShell, or add `export PATH=$HOME/.cargo/bin:$PATH` to your shell rc |

---

## 11. macOS / Linux / Android (notes for later)

Not built or tested today. Rough sketch of what'd be needed:

- **macOS:** `npm run tauri build` on a Mac produces a `.dmg` and `.app` under
  the same `bundle/` tree. Needs an Apple Developer ID for signing/notarization
  before distribution outside the dev's own machine.
- **Linux:** `.deb` and `.AppImage` come out of `tauri build` on a Linux host.
  Requires `libwebkit2gtk-4.1-dev` and friends at build time.
- **Android:** `npm run tauri android init` then `npm run tauri android build`.
  Needs Android SDK + NDK, and the data layer (`TauriDataStore` calls into Rust
  via `invoke` — this still works on Android, no porting needed for now).

When any of those becomes a real target, add a section here with the actual
commands that worked, not these notes.
