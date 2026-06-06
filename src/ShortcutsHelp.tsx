interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    items: [
      { keys: ["Ctrl", "K"], label: "Command palette / search" },
      { keys: ["Ctrl", "N"], label: "New page (quick capture)" },
      { keys: ["Ctrl", "\\"], label: "Toggle sidebar" },
      { keys: ["Ctrl", ","], label: "Preferences" },
      { keys: ["?"], label: "This help" },
      { keys: ["Esc"], label: "Close dialogs" },
    ],
  },
  {
    title: "Writing",
    items: [
      { keys: ["Ctrl", "B"], label: "Bold" },
      { keys: ["Ctrl", "I"], label: "Italic" },
      { keys: ["#", "Space"], label: "Heading" },
      { keys: ["-", "Space"], label: "Bullet list" },
      { keys: ["1", ".", "Space"], label: "Numbered list" },
      { keys: ["[ ]", "Space"], label: "Checkbox" },
      { keys: ["Shift", "Enter"], label: "Line break (no new paragraph)" },
    ],
  },
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Keyboard shortcuts</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {GROUPS.map((group) => (
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
