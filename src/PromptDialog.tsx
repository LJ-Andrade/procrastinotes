import { useEffect, useMemo, useState } from "react";

interface PromptDialogProps {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  title,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  initialValue = "",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const trimmed = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && trimmed) {
        e.preventDefault();
        onConfirm(trimmed);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel, onConfirm, trimmed]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm prompt-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-title">{title}</h3>
        <label className="prompt-field">
          <span className="prompt-label">{label}</span>
          <input
            className="prompt-input"
            autoFocus
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn-accent"
            onClick={() => onConfirm(trimmed)}
            disabled={!trimmed}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
