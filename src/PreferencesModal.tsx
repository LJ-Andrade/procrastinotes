import {
  ACCENTS,
  AVATARS,
  type Language,
  type Preferences,
  type Theme,
} from "./preferences";
import { BACKGROUNDS } from "./backgrounds";
import type { Strings } from "./i18n";
import type { SyncStatus } from "./types";

interface PreferencesModalProps {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  strings: Strings["prefs"];
  closeLabel: string;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onPickBackground: () => void;
  syncStatus: SyncStatus | null;
  syncing: boolean;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSyncNow: () => void;
  onClose: () => void;
}

const THEMES: Theme[] = ["light", "dark", "auto"];
const LANGUAGES: Language[] = ["es", "en"];

export function PreferencesModal({
  prefs,
  update,
  strings,
  closeLabel,
  onExportBackup,
  onImportBackup,
  onPickBackground,
  syncStatus,
  syncing,
  onConnectDrive,
  onDisconnectDrive,
  onSyncNow,
  onClose,
}: PreferencesModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prefs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{strings.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </header>

        <div className="prefs-layout">
          <div className="prefs-column">
            <section className="pref-group">
              <h3 className="pref-group-title">{strings.accountGroup}</h3>

              <section className="pref-section">
                <span className="pref-label">{strings.profile}</span>
                <input
                  className="pref-input"
                  value={prefs.profileName}
                  placeholder={strings.yourName}
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
                <span className="pref-label">{strings.language}</span>
                <div className="segmented">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language}
                      className={`seg ${prefs.language === language ? "active" : ""}`}
                      onClick={() => update({ language })}
                    >
                      {strings.languages[language]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="pref-section">
                <span className="pref-label">{strings.sync}</span>
                {syncStatus?.connected ? (
                  <>
                    <p className="sync-info">
                      {syncStatus.email ?? strings.connected}
                      {syncStatus.lastSync && (
                        <span className="sync-time">
                          {` · ${strings.lastSync} `}
                          {new Date(syncStatus.lastSync).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <div className="pref-buttons">
                      <button
                        className="pref-button"
                        onClick={onSyncNow}
                        disabled={syncing}
                      >
                        {syncing ? strings.syncing : strings.syncNow}
                      </button>
                      <button className="pref-button" onClick={onDisconnectDrive}>
                        {strings.disconnect}
                      </button>
                    </div>
                  </>
                ) : (
                  <button className="pref-button primary" onClick={onConnectDrive}>
                    {strings.connectDrive}
                  </button>
                )}
              </section>
            </section>

            <section className="pref-group">
              <h3 className="pref-group-title">{strings.utilityGroup}</h3>

              <section className="pref-section">
                <span className="pref-label">{strings.backup}</span>
                <div className="pref-buttons">
                  <button className="pref-button" onClick={onExportBackup}>
                    {strings.export}
                  </button>
                  <button className="pref-button" onClick={onImportBackup}>
                    {strings.import}
                  </button>
                </div>
              </section>
            </section>
          </div>

          <div className="prefs-column">
            <section className="pref-group">
              <h3 className="pref-group-title">{strings.customizationGroup}</h3>

              <section className="pref-section">
                <span className="pref-label">{strings.theme}</span>
                <div className="segmented">
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      className={`seg ${prefs.theme === t ? "active" : ""}`}
                      onClick={() => update({ theme: t })}
                    >
                      {strings.themes[t]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="pref-section">
                <span className="pref-label">{strings.accent}</span>
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
                <span className="pref-label">{strings.editorBackground}</span>
                <div className="bg-row">
                  <button
                    className={`bg-thumb bg-none ${prefs.background === "" ? "active" : ""}`}
                    onClick={() => update({ background: "" })}
                    title={strings.none}
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
                    title={strings.chooseImage}
                  >
                    +
                  </button>
                </div>
                {prefs.background !== "" && (
                  <label className="slider-row">
                    <span>{strings.opacity}</span>
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
                <span className="pref-label">{strings.ambient}</span>
                <label className="toggle-row">
                  <span>{strings.floatingParticles}</span>
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
            </section>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="pref-button primary" onClick={onClose}>
            {strings.save}
          </button>
        </footer>
      </div>
    </div>
  );
}
