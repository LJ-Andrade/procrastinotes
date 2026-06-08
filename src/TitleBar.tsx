import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

// Optional title-bar icon. Drop a file at src/assets/icon.* (png/svg/webp/jpg)
// and it shows next to the title; absent = nothing rendered.
const iconModules = import.meta.glob("./assets/icon.{png,svg,webp,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const ICON_URL = Object.values(iconModules)[0];

interface TitleBarProps {
  labels: {
    toggleSidebar: string;
    keyboardShortcuts: string;
    preferences: string;
    minimize: string;
    maximize: string;
    close: string;
  };
  onToggleSidebar: () => void;
  onOpenPreferences: () => void;
  onShowHelp: () => void;
}

/**
 * Custom window title bar. Native decorations are disabled (see
 * tauri.conf.json) so the bar blends with the app background. The bar itself
 * is the drag region; the buttons drive window controls and app actions.
 */
export function TitleBar({
  labels,
  onToggleSidebar,
  onOpenPreferences,
  onShowHelp,
}: TitleBarProps) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left">
        <button
          className="tb-icon"
          onClick={onToggleSidebar}
          aria-label={labels.toggleSidebar}
          title={`${labels.toggleSidebar} (Ctrl+\\)`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16">
            <rect
              x="1.5"
              y="2.5"
              width="13"
              height="11"
              rx="1.5"
              fill="none"
              stroke="currentColor"
            />
            <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" />
          </svg>
        </button>
        {ICON_URL && (
          <img className="titlebar-icon" src={ICON_URL} alt="" data-tauri-drag-region />
        )}
        <span className="titlebar-title" data-tauri-drag-region>
          Procrastinotes
        </span>
      </div>

      <div className="titlebar-controls">
        <button
          className="tb-icon"
          onClick={onShowHelp}
          aria-label={labels.keyboardShortcuts}
          title={`${labels.keyboardShortcuts} (?)`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
            <path
              d="M6.2 6.2 C6.2 5 7 4.4 8 4.4 C9 4.4 9.8 5 9.8 6 C9.8 7 9 7.3 8 8 L8 9"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <circle cx="8" cy="11.2" r="0.8" fill="currentColor" />
          </svg>
        </button>
        <button
          className="tb-icon"
          onClick={onOpenPreferences}
          aria-label={labels.preferences}
          title={`${labels.preferences} (Ctrl+,)`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor">
            <line x1="2" y1="4" x2="14" y2="4" />
            <circle cx="6" cy="4" r="1.7" fill="var(--bg)" />
            <line x1="2" y1="8" x2="14" y2="8" />
            <circle cx="10.5" cy="8" r="1.7" fill="var(--bg)" />
            <line x1="2" y1="12" x2="14" y2="12" />
            <circle cx="5" cy="12" r="1.7" fill="var(--bg)" />
          </svg>
        </button>
        <button
          className="tb-btn"
          onClick={() => appWindow.minimize()}
          aria-label={labels.minimize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="tb-btn"
          onClick={() => appWindow.toggleMaximize()}
          aria-label={labels.maximize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
            />
          </svg>
        </button>
        <button
          className="tb-btn tb-close"
          onClick={() => appWindow.close()}
          aria-label={labels.close}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
