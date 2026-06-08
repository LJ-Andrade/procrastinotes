import type { Strings } from "./i18n";

export function ShortcutsHelp({
  strings,
  closeLabel,
  onClose,
}: {
  strings: Strings["shortcuts"];
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{strings.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </header>

        {strings.groups.map((group) => (
          <section className="pref-section" key={group.title}>
            <span className="pref-label">{group.title}</span>
            <ul className="shortcut-list">
              {group.items.map((item) => (
                <li className="shortcut-row" key={item.label}>
                  <span className="shortcut-label">{item.label}</span>
                  <span className="shortcut-keys">
                    {item.keys.map((k, i) => (
                      <kbd key={i}>{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
