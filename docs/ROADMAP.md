# Procrastinotes Roadmap

Last updated: 2026-06-07

## Current baseline

- Desktop Windows release `0.1.1` builds successfully with Tauri 2.
- Google Drive sync is working with the current OAuth setup.
- Custom in-app dialogs replaced browser-native prompts.
- UI language support is in place with a file-based translation structure.
- Preferences now separate profile/sync concerns from appearance customization.

## Next up

1. Release hardening
   - Smoke test the `0.1.1` installer on a second Windows machine.
   - Verify first-run behavior, reconnect flow, sync flow, uninstall flow, and data persistence.
   - Prepare a lightweight release checklist for future builds.

2. Windows distribution readiness
   - Configure Windows code signing for installers and bundled executables.
   - Decide certificate strategy: internal testing, OV certificate, or EV certificate.
   - Add post-build signing steps and document the required secrets/environment variables.

3. Sync robustness
   - Sync user appearance preferences that should travel between devices.
   - Define which preferences are device-local vs account-synced.
   - Improve sync error handling and reconnect guidance in the UI.

4. Localization pass
   - Audit the remaining user-facing strings and move them into translation files.
   - Add missing labels/messages for edge cases, onboarding, and sync failures.
   - Prepare the structure for adding more languages without touching feature code.

## Later

1. Release quality
   - Add an app version/about surface inside settings.
   - Add optional changelog/release notes support.
   - Evaluate CI builds for tagged releases.

2. Editor and UX polish
   - Continue responsive polish for compact window sizes.
   - Review keyboard navigation and accessibility of dialogs/settings.
   - Refine project/page management flows for faster capture.

3. Android exploration
   - Run a technical spike for Tauri Android setup on this codebase.
   - Validate editor performance, file/database behavior, OAuth flow, and sync UX on mobile.
   - Decide whether Android should stay Tauri-based or branch into a dedicated mobile client later.
