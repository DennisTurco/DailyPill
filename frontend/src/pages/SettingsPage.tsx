import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Setting } from "../lib/types";
import { getSettingValue } from "../settings";
import { triggerOnboarding } from "../lib/onboarding";

interface AIStatus {
  available: boolean;
  model: string;
  base_url: string;
  gpu_available: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [questionCount, setQuestionCount] = useState("5");
  const [savingQuestionCount, setSavingQuestionCount] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  function loadStatus() {
    api
      .get<AIStatus>("/ai/status")
      .then(setStatus)
      .catch((err) => setError(String(err)));
  }

  function loadSettings() {
    api
      .get<Setting[]>("/settings")
      .then((settings) => {
        const value = getSettingValue(settings, "QuestionCount");
        if (value !== null) setQuestionCount(value);
      })
      .catch((err) => setSettingsError(String(err)));
  }

  useEffect(() => {
    loadStatus();
    loadSettings();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function saveQuestionCount() {
    setSettingsError(null);
    setSettingsSaved(false);
    setSavingQuestionCount(true);
    try {
      await api.put("/settings/QuestionCount", { value: questionCount });
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(String(err));
    } finally {
      setSavingQuestionCount(false);
    }
  }

  return (
    <div>
      <h1><i className="fa-solid fa-gear"/> Settings</h1>

      <div className="card">
        <h3>Preferences</h3>
        {settingsError && <div className="error">{settingsError}</div>}
        <label htmlFor="sett-questionCount">Question count per quiz</label>
        <input
          id="sett-questionCount"
          type="number"
          min={1}
          max={50}
          value={questionCount}
          onChange={(e) => {
            setQuestionCount(e.target.value);
            setSettingsSaved(false);
          }}
          placeholder="5"
        />
        <div>
          <button onClick={saveQuestionCount} disabled={savingQuestionCount}>
            {savingQuestionCount ? "Saving..." : "Save"}
          </button>
          {settingsSaved && <span className="success"> Saved</span>}
        </div>
      </div>

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
            <p style={{ color: "var(--text-muted)" }}>
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
        <h3>Data</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Import topics and questions from YAML files into the database, or export the current database
          back to YAML.
        </p>
        <div className="row">
          <button className="secondary" onClick={() => {}}>
            <i className="fa-solid fa-file-import"/> Import from YAML
          </button>
          <button className="secondary" onClick={() => {}}>
            <i className="fa-solid fa-file-export"/> Export to YAML
          </button>
        </div>
      </div>

      <div className="card">
        <h3>About</h3>
        <p style={{ color: "var(--text-muted)" }}>
          DailyPill runs a local ASP.NET Core backend on port 8420 and schedules quiz pop-ups via the Electron
          tray. Auto-launch at OS login is registered automatically in production builds.
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="secondary" onClick={triggerOnboarding}>
            <i className="fa-solid fa-compass" /> Show onboarding tour
          </button>
        </div>
        <div className="row">
          <a
            className="btn btn-ghost"
            style={{ border: "1px solid var(--border-strong)" }}
            href="https://github.com/DennisTurco/DailyPill/issues/new?template=bug_report.yml"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-solid fa-bug"/> Report a bug
          </a>
          <a
            className="btn btn-ghost"
            style={{ border: "1px solid var(--border-strong)" }}
            href="https://github.com/DennisTurco/DailyPill/issues/new?template=feature_request.yml"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-solid fa-lightbulb"/> Request a feature
          </a>
        </div>
      </div>
    </div>
  );
}
