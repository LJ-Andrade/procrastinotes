import {
  ACCENTS,
  AVATARS,
  type Preferences,
  type Theme,
} from "./preferences";

interface PreferencesModalProps {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["light", "dark", "auto"];

export function PreferencesModal({
  prefs,
  update,
  onExportBackup,
  onImportBackup,
  onClose,
}: PreferencesModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Preferences</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section className="pref-section">
          <span className="pref-label">Profile</span>
          <input
            className="pref-input"
            value={prefs.profileName}
            placeholder="Your name"
            onChange={(e) => update({ profileName: e.target.value })}
          />
          <div className="avatar-row">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`avatar ${a === prefs.profileAvatar ? "active" : ""}`}
                onClick={() => update({ profileAvatar: a })}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

        <section className="pref-section">
          <span className="pref-label">Theme</span>
          <div className="segmented">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`seg ${prefs.theme === t ? "active" : ""}`}
                onClick={() => update({ theme: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="pref-section">
          <span className="pref-label">Accent</span>
          <div className="swatch-row">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={`swatch ${prefs.accent === a.id ? "active" : ""}`}
                style={{ background: a.color }}
                onClick={() => update({ accent: a.id })}
                aria-label={a.label}
                title={a.label}
              />
            ))}
          </div>
        </section>

        <section className="pref-section">
          <span className="pref-label">Backup</span>
          <div className="pref-buttons">
            <button className="pref-button" onClick={onExportBackup}>
              Export…
            </button>
            <button className="pref-button" onClick={onImportBackup}>
              Import…
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
