import { useState } from "react";

export interface SidebarEntry {
  id: string;
  label: string;
}

interface SidebarListProps {
  items: SidebarEntry[];
  activeId: string | null;
  emptyText?: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

/**
 * A sidebar list with: click to select, double-click to rename inline, a
 * hover delete button, and native drag-and-drop reordering. Reused for
 * projects, sections and pages.
 */
export function SidebarList({
  items,
  activeId,
  emptyText,
  onSelect,
  onRename,
  onDelete,
  onReorder,
}: SidebarListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(item: SidebarEntry) {
    setEditingId(item.id);
    setDraft(item.label);
  }

  function commitEdit() {
    if (editingId) {
      const name = draft.trim();
      const item = items.find((i) => i.id === editingId);
      if (name && item && name !== item.label) onRename(editingId, name);
    }
    setEditingId(null);
  }

  function handleDrop(targetId: string) {
    if (dragId && dragId !== targetId) {
      const ids = items.map((i) => i.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReorder(ids);
      }
    }
    setDragId(null);
    setOverId(null);
  }

  if (items.length === 0) {
    return emptyText ? <p className="empty">{emptyText}</p> : null;
  }

  return (
    <div className="list">
      {items.map((item) => {
        const editing = editingId === item.id;
        return (
          <div
            key={item.id}
            className={`sortable-row${dragId === item.id ? " dragging" : ""}${
              overId === item.id && dragId !== item.id ? " drop-target" : ""
            }`}
            draggable={!editing}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (overId !== item.id) setOverId(item.id);
            }}
            onDrop={() => handleDrop(item.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            {editing ? (
              <input
                className="rename-input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <>
                <button
                  className={`list-item${item.id === activeId ? " active" : ""}`}
                  onClick={() => onSelect(item.id)}
                  onDoubleClick={() => startEdit(item)}
                >
                  {item.label}
                </button>
                <button
                  className="item-del"
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Delete "${item.label}"?`)) onDelete(item.id);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
