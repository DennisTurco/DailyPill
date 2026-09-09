import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AIStatus {
  available: boolean;
  model: string;
  base_url: string;
  gpu_available: boolean;
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

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
            <div>
              Acceleration:{" "}
              <span className={status.gpu_available ? "success" : ""}>
                {status.gpu_available ? "GPU (NVIDIA CUDA)" : "CPU"}
              </span>
            </div>
            <p style={{ color: "#9aa0b4" }}>
              Model name and endpoint are configured via <code>OLLAMA_MODEL</code> and{" "}
              <code>OLLAMA_BASE_URL</code> in the root <code>.env</code> file (read by the backend on
              startup). GPU acceleration is detected automatically at startup (requires an NVIDIA GPU with
              CUDA drivers) and, when available, is used automatically by Ollama.
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
          DailyPill runs a local ASP.NET Core backend on port 8420 and schedules quiz pop-ups via the Electron
          tray. Auto-launch at OS login is registered automatically in production builds.
        </p>
      </div>
    </div>
  );
}
