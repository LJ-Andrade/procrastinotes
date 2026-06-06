import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";

export interface EditorChange {
  /** Tiptap document as a JSON string. */
  json: string;
  /** Derived plain text, used for search. */
  text: string;
}

interface EditorProps {
  /** Identifies the document being edited. When it changes, content reloads. */
  docId: string;
  /** Stored content for this document (Tiptap JSON string, or legacy text). */
  initialJson: string;
  onChange: (change: EditorChange) => void;
  /** Bumping this number asks the editor to take focus (e.g. quick capture). */
  focusSignal?: number;
}

/**
 * Tiptap-backed editor. Supports headings, bold/italic/strike, bullet and
 * ordered lists, code blocks, and task lists with nested checkboxes.
 *
 * Markdown-style input rules work while typing:
 *   "# "  → heading      "- "   → bullet list
 *   "1. " → ordered list  "[ ] " → checkbox (task list)
 */
export function Editor({
  docId,
  initialJson,
  onChange,
  focusSignal,
}: EditorProps) {
  // Keep the latest onChange without recreating the editor instance.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: parseContent(initialJson),
    onUpdate: ({ editor }) => {
      onChangeRef.current({
        json: JSON.stringify(editor.getJSON()),
        text: editor.getText(),
      });
    },
  });

  // Load the content of the selected document without emitting a save.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(parseContent(initialJson) ?? "", {
      emitUpdate: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, editor]);

  // Take focus on request (skip the initial render, when focusSignal is 0).
  useEffect(() => {
    if (!editor || !focusSignal) return;
    editor.commands.focus("end");
  }, [focusSignal, editor]);

  return (
    <div className="editor-wrapper">
      {editor && (
        <DragHandle editor={editor} nested>
          <svg
            className="drag-handle-icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="5.5" cy="3.5" r="1.4" />
            <circle cx="10.5" cy="3.5" r="1.4" />
            <circle cx="5.5" cy="8" r="1.4" />
            <circle cx="10.5" cy="8" r="1.4" />
            <circle cx="5.5" cy="12.5" r="1.4" />
            <circle cx="10.5" cy="12.5" r="1.4" />
          </svg>
        </DragHandle>
      )}
      <EditorContent editor={editor} className="editor" />
    </div>
  );
}

/**
 * Turns stored content into something Tiptap can render.
 * Handles three cases: a real Tiptap doc, the Phase 0 `{type:"plain"}`
 * placeholder, and raw text — so existing pages migrate cleanly.
 */
function parseContent(raw: string): JSONContent | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "doc") return parsed as JSONContent;
    if (parsed?.type === "plain") return textToDoc(parsed.text ?? "");
  } catch {
    return textToDoc(raw);
  }
  return undefined;
}

function textToDoc(text: string): JSONContent | undefined {
  if (!text) return undefined;
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
