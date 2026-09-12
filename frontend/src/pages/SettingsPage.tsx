import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Setting, Topic } from "../lib/types";
import { getSettingValue } from "../settings";
import { triggerOnboarding } from "../lib/onboarding";
import { Toast, ToastMessage } from "../components/Toast";
import { Modal } from "../components/Modal";

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
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportTopicId, setExportTopicId] = useState<number | "">("");
  const [exporting, setExporting] = useState(false);

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

  function loadTopics() {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setToast({ kind: "error", text: String(err) }));
  }

  useEffect(() => {
    loadStatus();
    loadSettings();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  function pickImportFile() {
    importFileInputRef.current?.click();
  }

  async function importFromYaml(file: File) {
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.upload("/export-import/import", formData);
      setToast({
        kind: "info",
        text: `"${file.name}" imported successfully.`,
      });
    } catch (err) {
      setToast({
        kind: "error",
        text: String(err),
      });
    } finally {
      setImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    }
  }

  function openExportPicker() {
    loadTopics();
    setExportTopicId("");
    setShowExportPicker(true);
  }

  async function confirmExport() {
    if (!exportTopicId) return;
    setExporting(true);
    try {
      const { blob, filename } = await api.downloadFile(`/export-import/export?topicId=${exportTopicId}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setToast({
        kind: "info",
        text: `"${filename}" exported successfully.`,
      });
      setShowExportPicker(false);
    } catch (err) {
      setToast({
        kind: "error",
        text: String(err),
      });
    } finally {
      setExporting(false);
    }
  }

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
      <Toast toast={toast} onDismiss={() => setToast(null)} />
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
        <h3>Data</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Import topics and questions from YAML files into the database, or export the current database
          back to YAML.
        </p>
        <div className="row">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".yaml,.yml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importFromYaml(file);
            }}
          />
          <button className="secondary" onClick={pickImportFile} disabled={importing}>
            <i className="fa-solid fa-file-import"/> {importing ? "Importing..." : "Import from YAML"}
          </button>
          <button className="secondary" onClick={openExportPicker}>
            <i className="fa-solid fa-file-export"/> Export to YAML
          </button>
        </div>
        <p className="text-muted text-sm" style={{ marginTop: 12, marginBottom: 4 }}>
          New to the YAML format? Start from a template:
        </p>
        <div className="row">
          <a
            className="btn btn-ghost"
            style={{ border: "1px solid var(--border-strong)" }}
            href="/templates/topic-questions-template.yaml"
            download
          >
            <i className="fa-solid fa-download"/> Questions template
          </a>
          <a
            className="btn btn-ghost"
            style={{ border: "1px solid var(--border-strong)" }}
            href="/templates/topic-facts-template.yaml"
            download
          >
            <i className="fa-solid fa-download"/> Facts template
          </a>
        </div>
      </div>

      {showExportPicker && (
        <Modal title="Export topic to YAML" onClose={() => setShowExportPicker(false)}>
          <label htmlFor="export-topic">Topic</label>
          <select
            id="export-topic"
            value={exportTopicId}
            onChange={(e) => setExportTopicId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="" disabled>
              Select...
            </option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <button className="secondary" onClick={() => setShowExportPicker(false)}>
              Cancel
            </button>
            <button onClick={confirmExport} disabled={!exportTopicId || exporting}>
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </Modal>
      )}

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
    </div>
  );
}
