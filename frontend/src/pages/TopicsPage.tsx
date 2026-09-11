import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { Collapsible } from "../components/Collapsible";
import { Topic, TopicContextDocument } from "../lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduleDraft {
  day_of_week: number;
  time_of_day: string;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isInformational, setIsInformational] = useState(false);
  const [documents, setDocuments] = useState<TopicContextDocument[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const pageSize = 20;
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);

  const [contextFile, setContextFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadContext(topicId: number) {
    if (!contextFile) return;
    const formData = new FormData();
    formData.append("file", contextFile);
    try {
      const uploaded = await api.upload<TopicContextDocument>(`/context-document/upload/${topicId}`, formData);
      setDocuments((prev) => [...prev, uploaded]);
      setContextFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(String(err));
    }
  }

  function load() {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setError(String(err)));
  }

  useEffect(load, []);

  function addSchedule() {
    setSchedules((prev) => [...prev, { day_of_week: 1, time_of_day: "17:00" }]);
  }

  function updateSchedule(index: number, patch: Partial<ScheduleDraft>) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  async function deleteDocument(id: number, index: number) {
    try {
      await api.del(`/context-document/${id}`);
      removeDocument(index);
    } catch (err) {
      setError(String(err));
    }
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setName("");
    setCategory("");
    setDescription("");
    setIsInformational(false);
    setDocuments([]);
    setSchedules([]);
    setEditingId(null);
  }

  function startEdit(topic: Topic) {
    setFormOpen(true);
    setEditingId(topic.id);
    setName(topic.name);
    setCategory(topic.category ?? "");
    setDescription(topic.description ?? "");
    setIsInformational(topic.is_informational);
    setDocuments(topic.documents ?? []);
    setSchedules(topic.schedules.map((s) => ({ day_of_week: s.day_of_week, time_of_day: s.time_of_day.slice(0, 5) })));
  }

  async function saveTopic() {
    if (!name.trim()) return;
    const payload = {
      name,
      category: category || null,
      description: description || null,
      is_informational: isInformational,
      schedules: schedules.map((s) => ({ ...s, is_active: true })),
    };
    try {
        const saved = editingId
            ? await api.put<Topic>(`/topics/${editingId}`, payload)
            : await api.post<Topic>("/topics", payload);

        if (contextFile) {
            await uploadContext(saved.id)
        }
      resetForm();
      setFormOpen(false);
      load();
    } catch (err) {
      setError(String(err));
    }
  }

  async function deleteTopic(id: number) {
    try {
      await api.del(`/topics/${id}`);
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      setError(String(err));
    }
  }

  const totalPages = Math.max(1, Math.ceil(topics.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = topics.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div>
      <h1><i className="fa-solid fa-layer-group"/> Topics</h1>
      {error && <div className="error">{error}</div>}

      <Collapsible
        title={<><i className="fa-solid fa-circle-plus"/> {editingId ? "Edit topic" : "New topic"}</>}
        open={formOpen}
        onToggle={() => {
          if (formOpen && editingId) resetForm();
          setFormOpen((o) => !o);
        }}
      >
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Category</label>
        <input value={category} onChange={(e) => setCategory(e.target.value)} />
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

        <label className="row" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={isInformational}
            onChange={(e) => setIsInformational(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span>Informational only (no quiz)</span>
        </label>

        <label>Schedule</label>
        {schedules.map((s, i) => (
          <div className="row" key={i} style={{ marginBottom: 6 }}>
            <select value={s.day_of_week} onChange={(e) => updateSchedule(i, { day_of_week: Number(e.target.value) })}>
              {DAYS.map((d, idx) => (
                <option key={d} value={idx}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={s.time_of_day}
              onChange={(e) => updateSchedule(i, { time_of_day: e.target.value })}
            />
            <button className="danger" onClick={() => removeSchedule(i)}>
              Remove
            </button>
          </div>
        ))}
        <button className="secondary" onClick={addSchedule}>
          + Add schedule slot
        </button>

        <label>Context document (.md)</label>
        {documents.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {documents.map((d, i) => (
              <span className="badge" key={d.id} style={{ marginRight: 6 }}>
                {d.filename}{" "}
                <button
                  type="button"
                  className="danger"
                  style={{ marginLeft: 4 }}
                  onClick={() => deleteDocument(d.id, i)}
                >
                  Remove
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          onChange={(e) => setContextFile(e.target.files?.[0] ?? null)}
        />
        {contextFile && (
          <div className="text-muted text-sm" style={{ marginTop: 4 }}>
            Selected: {contextFile.name}{" "}
            <button
              type="button"
              className="secondary"
              style={{ marginLeft: 6 }}
              onClick={() => {
                setContextFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={saveTopic}>{editingId ? "Save changes" : "Create topic"}</button>
          {editingId && (
            <button
              className="secondary"
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </Collapsible>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Schedule</th>
                <th>Document</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((topic) => (
                <tr key={topic.id}>
                  <td>
                    <div><strong>{topic.name}</strong></div>
                    {topic.description && (
                      <div className="text-muted text-sm">{topic.description}</div>
                    )}
                  </td>
                  <td>
                    {topic.category && <span className="badge">{topic.category}</span>}{" "}
                    {topic.is_informational && <span className="badge">Informational</span>}
                  </td>
                  <td>
                    {topic.schedules.length > 0 ? (
                      topic.schedules.map((s) => (
                        <span className="badge" key={s.id} style={{ marginRight: 6 }}>
                          {DAYS[s.day_of_week]} {s.time_of_day}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-sm">—</span>
                    )}
                  </td>
                  <td>
                    {topic.documents?.length ? (
                      topic.documents.map((d) => (
                        <span className="badge" key={d.id} style={{ marginRight: 6 }}>
                          {d.filename}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => startEdit(topic)}>
                        Edit
                      </button>
                      <button className="danger" onClick={() => setDeleteTarget(topic)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="card-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="text-muted text-sm">
            {topics.length === 0
              ? "0 topics"
              : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, topics.length)} of ${topics.length} topics`}
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                title="Prev page"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              <span className="text-muted text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                title="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will also delete its questions, facts and schedules.`}
          onConfirm={() => {
            deleteTopic(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
