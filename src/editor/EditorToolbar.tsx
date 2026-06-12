import { useEditorState, type Editor } from "@tiptap/react";
import { useRef } from "react";
import type { Strings } from "../i18n";
import { imageFilesFrom, insertImageFiles } from "./imageAsset";

/**
 * A small, always-visible formatting toolbar for the editor. Gives clickable
 * icon controls for the same actions available via keyboard / markdown input.
 */
export function EditorToolbar({
  editor,
  strings,
}: {
  editor: Editor;
  strings: Strings["editor"];
}) {
  // Subscribe to just the active states so the toolbar re-renders when they
  // change (Tiptap v3 does not re-render on every transaction by default).
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      task: editor.isActive("taskList"),
      code: editor.isActive("codeBlock"),
      quote: editor.isActive("blockquote"),
    }),
  });

  const chain = () => editor.chain().focus();
  const cls = (active: boolean) => `fmt-btn ${active ? "active" : ""}`;

  const fileInput = useRef<HTMLInputElement>(null);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const images = imageFilesFrom(e.target.files);
    if (images.length > 0) void insertImageFiles(editor, images);
    // Reset so picking the same file again re-triggers change.
    e.target.value = "";
  };

  return (
    <div className="editor-toolbar">
      <button
        className={cls(s.h1)}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
        title={strings.heading1}
      >
        H1
      </button>
      <button
        className={cls(s.h2)}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
        title={strings.heading2}
      >
        H2
      </button>

      <span className="fmt-sep" />

      <button
        className={cls(s.bold)}
        onClick={() => chain().toggleBold().run()}
        title={strings.bold}
      >
        <span className="fmt-b">B</span>
      </button>
      <button
        className={cls(s.italic)}
        onClick={() => chain().toggleItalic().run()}
        title={strings.italic}
      >
        <span className="fmt-i">I</span>
      </button>
      <button
        className={cls(s.strike)}
        onClick={() => chain().toggleStrike().run()}
        title={strings.strikethrough}
      >
        <span className="fmt-s">S</span>
      </button>

      <span className="fmt-sep" />

      <button
        className={cls(s.bullet)}
        onClick={() => chain().toggleBulletList().run()}
        title={strings.bulletList}
      >
        <IconBullet />
      </button>
      <button
        className={cls(s.ordered)}
        onClick={() => chain().toggleOrderedList().run()}
        title={strings.numberedList}
      >
        <span className="fmt-ol">1.</span>
      </button>
      <button
        className={cls(s.task)}
        onClick={() => chain().toggleTaskList().run()}
        title={strings.checklist}
      >
        <IconTask />
      </button>

      <span className="fmt-sep" />

      <button
        className={cls(s.quote)}
        onClick={() => chain().toggleBlockquote().run()}
        title={strings.quote}
      >
        <IconQuote />
      </button>
      <button
        className={cls(s.code)}
        onClick={() => chain().toggleCodeBlock().run()}
        title={strings.codeBlock}
      >
        <span className="fmt-code">{"</>"}</span>
      </button>

      <span className="fmt-sep" />

      <button
        className={cls(false)}
        onClick={() => fileInput.current?.click()}
        title={strings.image}
      >
        <IconImage />
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onPickImage}
      />
    </div>
  );
}

function IconImage() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.6" />
      <circle cx="5.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <path d="M2.5 12 L6 8.5 L8.5 11 L11 8 L13.5 11" />
    </svg>
  );
}

function IconBullet() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="2.6" cy="4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="2.6" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <line x1="6" y1="4" x2="14" y2="4" />
      <line x1="6" y1="8" x2="14" y2="8" />
      <line x1="6" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconTask() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="1.5" y="2.5" width="5" height="5" rx="1.2" />
      <path d="M2.6 5 L3.7 6 L5.6 3.7" strokeWidth="1.2" />
      <line x1="9" y1="5" x2="14" y2="5" />
      <rect x="1.5" y="9" width="5" height="5" rx="1.2" />
      <line x1="9" y1="11.5" x2="14" y2="11.5" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <line x1="2.6" y1="3.5" x2="2.6" y2="12.5" strokeWidth="2" />
      <line x1="6" y1="5" x2="13.5" y2="5" />
      <line x1="6" y1="8" x2="13.5" y2="8" />
      <line x1="6" y1="11" x2="11" y2="11" />
    </svg>
  );
}
