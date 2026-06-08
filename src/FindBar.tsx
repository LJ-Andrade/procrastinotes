import { useEffect, useRef, useState } from "react";
import type { Strings } from "./i18n";

/**
 * Find-in-page bar (Ctrl+F). Highlights matches in the editor using the CSS
 * Custom Highlight API, so the editor's DOM/content is never modified.
 * Enter / Shift+Enter cycle through matches; Esc closes.
 */
export function FindBar({
  strings,
  onClose,
}: {
  strings: Strings["find"];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const ranges = useRef<Range[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return clearHighlights; // clean up when the bar closes
  }, []);

  // Recompute matches whenever the query changes.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ProseMirror");
    const found = root ? findRanges(root, query) : [];
    ranges.current = found;
    setTotal(found.length);
    setIndex(0);
    paint(found, 0);
    if (found.length) scrollTo(found[0]);
  }, [query]);

  function go(delta: number) {
    if (!ranges.current.length) return;
    const next =
      (index + delta + ranges.current.length) % ranges.current.length;
    setIndex(next);
    paint(ranges.current, next);
    scrollTo(ranges.current[next]);
  }

  return (
    <div className="find-bar">
      <input
        ref={inputRef}
        className="find-input"
        placeholder={strings.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="find-count">
        {total ? `${index + 1}/${total}` : query ? "0/0" : ""}
      </span>
      <button
        className="find-nav"
        onClick={() => go(-1)}
        disabled={!total}
        title={strings.previous}
      >
        ↑
      </button>
      <button
        className="find-nav"
        onClick={() => go(1)}
        disabled={!total}
        title={strings.next}
      >
        ↓
      </button>
      <button className="find-nav" onClick={onClose} title={strings.close}>
        ✕
      </button>
    </div>
  );
}

function findRanges(root: HTMLElement, query: string): Range[] {
  const result: Range[] = [];
  if (!query) return result;
  const q = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node.nodeValue ?? "").toLowerCase();
    let from = text.indexOf(q);
    while (from !== -1) {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, from + q.length);
      result.push(range);
      from = text.indexOf(q, from + q.length);
    }
  }
  return result;
}

function paint(all: Range[], current: number) {
  if (typeof Highlight === "undefined" || !("highlights" in CSS)) return;
  CSS.highlights.delete("find");
  CSS.highlights.delete("find-current");
  if (!all.length) return;
  const others = all.filter((_, i) => i !== current);
  if (others.length) CSS.highlights.set("find", new Highlight(...others));
  CSS.highlights.set("find-current", new Highlight(all[current]));
}

function clearHighlights() {
  if (!("highlights" in CSS)) return;
  CSS.highlights.delete("find");
  CSS.highlights.delete("find-current");
}

function scrollTo(range: Range) {
  range.startContainer.parentElement?.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
}
