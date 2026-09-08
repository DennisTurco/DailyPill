import { Modal } from "./Modal";

export function ConfirmModal({
  title = "Confirm delete",
  message,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <button className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </Modal>
  );
}
