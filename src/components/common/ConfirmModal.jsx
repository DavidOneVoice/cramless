import "./ConfirmModal.css";
export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Yes, continue",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">{title}</h3>
        </div>

        <div className="modalBody">
          <p className="muted" style={{ margin: 0, whiteSpace: "pre-line" }}>
            {message}
          </p>
        </div>

        <div className="modalActions">
          <button className="navBtn" type="button" onClick={onCancel}>
            {cancelText}
          </button>

          <button
            className={danger ? "dangerBtn" : "primaryBtn"}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
