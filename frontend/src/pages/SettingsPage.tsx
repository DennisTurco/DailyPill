import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AIStatus {
  available: boolean;
  model: string;
  base_url: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadStatus() {
    api
      .get<AIStatus>("/ai/status")
      .then(setStatus)
      .catch((err) => setError(String(err)));
  }

  useEffect(loadStatus, []);

  return (
    <div>
      <h1><i className="fa-solid fa-gear"/> Settings</h1>

      <div className="card">
        <h3>Ollama</h3>
        {error && <div className="error">{error}</div>}
        {status && (
          <div>
            <div>
              Status:{" "}
              <span className={status.available ? "success" : "error"}>
                {status.available ? "reachable" : "unreachable"}
              </span>
            </div>
            <div>Model: {status.model}</div>
            <div>Endpoint: {status.base_url}</div>
            <p style={{ color: "#9aa0b4" }}>
              Model name and endpoint are configured via <code>OLLAMA_MODEL</code> and{" "}
              <code>OLLAMA_BASE_URL</code> in the root <code>.env</code> file (read by the backend on
              startup).
            </p>
          </div>
        )}
        <button className="secondary" onClick={loadStatus}>
          Refresh
        </button>
      </div>

      <div className="card">
        <h3>About</h3>
        <p style={{ color: "#9aa0b4" }}>
          DailyPill runs a local FastAPI backend on port 8420 and schedules quiz pop-ups via the Electron
          tray. Auto-launch at OS login is registered automatically in production builds.
        </p>
      </div>
    </div>
  );
}
