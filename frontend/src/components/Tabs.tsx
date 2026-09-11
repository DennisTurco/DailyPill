import { ReactNode } from "react";

export interface TabItem {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const active = items.find((t) => t.key === activeKey) ?? items[0];

  return (
    <div>
      <div className="tab-list">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${item.key === active.key ? "active" : ""}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="card tab-panel">{active.content}</div>
    </div>
  );
}
