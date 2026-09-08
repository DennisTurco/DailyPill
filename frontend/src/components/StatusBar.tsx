import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AIStatus {
  pulling_model: boolean;
  model: string;
  pull_status: string | null;
  pull_percent: number | null;
}

export function StatusBar() {
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      api
        .get<AIStatus>("/ai/status")
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!status?.pulling_model) return null;

  const percent = status.pull_percent != null ? ` (${status.pull_percent}%)` : "";

  return (
    <div className="status-bar">
      <i className="fa-solid fa-spinner fa-spin" />
      Downloading Ollama model "{status.model}"{percent}
      {status.pull_status ? ` — ${status.pull_status}` : "..."}
    </div>
  );
}
