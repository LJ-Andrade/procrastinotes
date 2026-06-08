import { useEffect, useMemo, useRef, useState } from "react";
import { store } from "./data";
import type { Strings } from "./i18n";
import type { Project, SearchHit } from "./types";

interface CommandPaletteProps {
  strings: Strings["command"];
  untitledLabel: string;
  projects: Project[];
  onNavigate: (projectId: string, sectionId: string, pageId: string) => void;
  onCreatePage: () => void;
  onCreateProject: () => void;
  onShowShortcuts: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onClose: () => void;
}

type Item =
  | { kind: "page"; hit: SearchHit }
  | { kind: "action"; label: string; icon: string; run: () => void };

const SEARCH_DEBOUNCE = 140;

export function CommandPalette({
  strings,
  untitledLabel,
  projects,
  onNavigate,
  onCreatePage,
  onCreateProject,
  onShowShortcuts,
  onExportBackup,
  onImportBackup,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "";
  }, [projects]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced full-text search. A token guards against stale responses.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      const hits = await store.search(q);
      if (active) setResults(hits);
    }, SEARCH_DEBOUNCE);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const items: Item[] = [
    ...results.map((hit) => ({ kind: "page" as const, hit })),
    { kind: "action", label: strings.createPage, icon: "+", run: onCreatePage },
    {
      kind: "action",
      label: strings.createProject,
      icon: "▣",
      run: onCreateProject,
    },
    {
      kind: "action",
      label: strings.exportBackup,
      icon: "↧",
      run: onExportBackup,
    },
    {
      kind: "action",
      label: strings.importBackup,
      icon: "↥",
      run: onImportBackup,
    },
    {
      kind: "action",
      label: strings.keyboardShortcuts,
      icon: "?",
      run: onShowShortcuts,
    },
  ];

  // Keep the selection within range as the list changes.
  useEffect(() => {
    setSelected((s) => Math.min(s, items.length - 1));
  }, [items.length]);

  function runItem(item: Item) {
    if (item.kind === "page") {
      onNavigate(item.hit.projectId, item.hit.sectionId, item.hit.pageId);
    } else {
      item.run();
    }
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selected];
      if (item) runItem(item);
    }
  }

  return (
    <div className="modal-overlay command-overlay" onClick={onClose}>
      <div className="command" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-input"
          value={query}
          placeholder={strings.placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul className="command-list">
          {items.map((item, i) => (
            <li
              key={item.kind === "page" ? item.hit.pageId : item.label}
              className={`command-item ${i === selected ? "active" : ""}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => runItem(item)}
            >
              {item.kind === "page" ? (
                <>
                  <span className="command-title">
                    {item.hit.title || untitledLabel}
                  </span>
                  <span className="command-snippet">
                    <Snippet text={item.hit.snippet} />
                  </span>
                  <span className="command-meta">
                    {projectName(item.hit.projectId)}
                  </span>
                </>
              ) : (
                <>
                  <span className="command-icon">{item.icon}</span>
                  <span className="command-title">{item.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {strings.navigate}
          </span>
          <span>
            <kbd>↵</kbd> {strings.open}
          </span>
          <span>
            <kbd>esc</kbd> {strings.close}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Renders an FTS snippet, highlighting the `[...]`-wrapped matches. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <mark key={i}>{p.slice(1, -1)}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
