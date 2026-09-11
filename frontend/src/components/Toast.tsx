import { CSSProperties, useEffect } from "react";

export interface ToastMessage {
  text: string;
  kind: "warning" | "error" | "info";
}

const KIND_COLORS: Record<ToastMessage["kind"], string> = {
  warning: "#f5a623",
  error: "#ff6b6b",
  info: "#7c9cff",
};

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className="toast"
      style={{ "--toast-color": KIND_COLORS[toast.kind] } as CSSProperties}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{toast.text}</span>
        <button
          className="secondary"
          onClick={onDismiss}
          style={{ padding: "2px 8px", marginLeft: 10, fontSize: 12 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
