import { useEffect } from "react";

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
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        maxWidth: 360,
        background: "#1a1d29",
        border: `1px solid ${KIND_COLORS[toast.kind]}`,
        borderLeft: `4px solid ${KIND_COLORS[toast.kind]}`,
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        zIndex: 1000,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "#e6e6e6" }}>{toast.text}</span>
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
