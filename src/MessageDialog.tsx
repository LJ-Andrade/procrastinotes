import { useEffect } from "react";

interface MessageDialogProps {
  title: string;
  message: string;
  closeLabel: string;
  onClose: () => void;
}

export function MessageDialog({
  title,
  message,
  closeLabel,
  onClose,
}: MessageDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-accent" onClick={onClose} autoFocus>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
