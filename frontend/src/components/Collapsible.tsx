import { ReactNode } from "react";

export function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="card collapsible">
      <button type="button" className="collapsible-header" onClick={onToggle}>
        <h3>{title}</h3>
        <i className={`fa-solid fa-chevron-down collapsible-chevron ${open ? "open" : ""}`} />
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
