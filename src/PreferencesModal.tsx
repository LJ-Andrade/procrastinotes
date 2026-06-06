import {
  ACCENTS,
  AVATARS,
  type Preferences,
  type Theme,
} from "./preferences";
import { BACKGROUNDS } from "./backgrounds";

interface PreferencesModalProps {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onPickBackground: () => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["light", "dark", "auto"];

export function PreferencesModal({
  prefs,
  update,
  onExportBackup,
  onImportBackup,
  onPickBackground,
  onClose,
}: PreferencesModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prefs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Preferences</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="pref-grid">
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
          <span className="pref-label">Editor background</span>
          <div className="bg-row">
            <button
              className={`bg-thumb bg-none ${prefs.background === "" ? "active" : ""}`}
              onClick={() => update({ background: "" })}
              title="None"
            >
              ✕
            </button>
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                className={`bg-thumb ${prefs.background === b.id ? "active" : ""}`}
                style={{ backgroundImage: `url(${b.url})` }}
                onClick={() => update({ background: b.id })}
                title={b.label}
              />
            ))}
            <button
              className={`bg-thumb bg-upload ${prefs.background === "custom" ? "active" : ""}`}
              onClick={onPickBackground}
              title="Choose your own image"
            >
              +
            </button>
          </div>
          {prefs.background !== "" && (
            <label className="slider-row">
              <span>Opacity</span>
              <input
                type="range"
                min={0.04}
                max={0.7}
                step={0.02}
                value={prefs.backgroundOpacity}
                onChange={(e) =>
                  update({ backgroundOpacity: Number(e.target.value) })
                }
              />
            </label>
          )}
        </section>

        <section className="pref-section">
          <span className="pref-label">Ambient</span>
          <label className="toggle-row">
            <span>Floating particles</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.ambient}
              className={`toggle ${prefs.ambient ? "on" : ""}`}
              onClick={() => update({ ambient: !prefs.ambient })}
            >
              <span className="toggle-knob" />
            </button>
          </label>
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

        <footer className="modal-footer">
          <button className="pref-button primary" onClick={onClose}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
