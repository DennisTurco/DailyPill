import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Tabs } from "../components/Tabs";
import { AIGeneratedInfoFact, InfoFact, Topic } from "../lib/types";

export default function InfoFactsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [facts, setFacts] = useState<InfoFact[]>([]);
  const [filterTopic, setFilterTopic] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewFact, setPreviewFact] = useState<InfoFact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InfoFact | null>(null);
  const [activeTab, setActiveTab] = useState("ai");

  const [form, setForm] = useState({
    topic_id: 0,
    title: "",
    description: "",
    link: "",
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiTopicId, setAiTopicId] = useState<number | "">("");
  const [aiDrafts, setAiDrafts] = useState<AIGeneratedInfoFact[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function loadTopics() {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setError(String(err)));
  }

  function loadFacts() {
    const query = filterTopic ? `?topic_id=${filterTopic}` : "";
    api
      .get<InfoFact[]>(`/info-facts${query}`)
      .then(setFacts)
      .catch((err) => setError(String(err)));
  }

  useEffect(loadTopics, []);
  useEffect(loadFacts, [filterTopic]);

  const informationalTopics = topics.filter((t) => t.is_informational);

  function resetForm() {
    setForm({ topic_id: 0, title: "", description: "", link: "" });
    setEditingId(null);
  }

  async function saveFact() {
    if (!form.topic_id || !form.title.trim() || !form.description.trim()) return;
    const payload = {
      topic_id: form.topic_id,
      title: form.title,
      description: form.description,
      link: form.link || null,
    };
    try {
      if (editingId) {
        await api.put(`/info-facts/${editingId}`, payload);
      } else {
        await api.post("/info-facts", payload);
      }
      resetForm();
      loadFacts();
    } catch (err) {
      setError(String(err));
    }
  }

  function editFact(fact: InfoFact) {
    setActiveTab("manual");
    setEditingId(fact.id);
    setForm({
      topic_id: fact.topic_id,
      title: fact.title,
      description: fact.description,
      link: fact.link ?? "",
    });
  }

  async function deleteFact(id: number) {
    try {
      await api.del(`/info-facts/${id}`);
      loadFacts();
    } catch (err) {
      setError(String(err));
    }
  }

  function topicName(topicId: number) {
    return topics.find((t) => t.id === topicId)?.name ?? "—";
  }

  async function generateWithAI() {
    if (!aiTopicId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await api.post<{ facts: AIGeneratedInfoFact[]; dropped: number }>(
        "/ai/generate-info-facts",
        { topic_id: aiTopicId, prompt: aiPrompt, count: aiCount }
      );
      setAiDrafts(response.facts);
      if (response.facts.length === 0) {
        setAiError("The AI didn't return any usable facts. Try rephrasing your prompt or generating again.");
      } else if (response.dropped > 0) {
        setAiError(
          `${response.dropped} fact(s) the AI generated couldn't be parsed and were skipped. ${response.facts.length} usable fact(s) below.`
        );
      }
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft(draft: AIGeneratedInfoFact, index: number) {
    if (!aiTopicId) return;
    try {
      await api.post("/info-facts", { ...draft, topic_id: aiTopicId });
      setAiDrafts((prev) => prev.filter((_, i) => i !== index));
      loadFacts();
    } catch (err) {
      setAiError(String(err));
    }
  }

  return (
    <div>
      <h1><i className="fa-solid fa-tablets"/> Info facts</h1>
      {error && <div className="error">{error}</div>}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "ai",
            label: <><i className="fa-solid fa-robot"/> AI-generate</>,
            content: (
              <>
                <label>Topic</label>
                <select value={aiTopicId} onChange={(e) => setAiTopicId(Number(e.target.value))}>
                  <option value="" disabled>
                    Select...
                  </option>
                  {informationalTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <label>Prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  placeholder="e.g. generate 5 short facts about the Liskov Substitution Principle"
                />
                <label>Count</label>
                <input type="number" value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} min={1} max={20} />
                <div style={{ marginTop: 10 }}>
                  <button disabled={aiLoading || !aiTopicId} onClick={generateWithAI}>
                    {aiLoading ? "Generating..." : "Generate"}
                  </button>
                </div>
                {aiError && <div className="error" style={{ marginTop: 8 }}>{aiError}</div>}

                {aiDrafts.map((draft, i) => (
                  <div className="card" key={i} style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 600 }}>{draft.title}</div>
                    <div style={{ color: "var(--text-muted)" }}>{draft.description}</div>
                    {draft.link && <div style={{ color: "var(--text-muted)" }}>{draft.link}</div>}
                    <button style={{ marginTop: 8 }} onClick={() => saveDraft(draft, i)}>
                      Save to dataset
                    </button>
                  </div>
                ))}
              </>
            ),
          },
          {
            key: "manual",
            label: <><i className="fa-solid fa-circle-plus"/> {editingId ? "Edit fact" : "Add manually"}</>,
            content: (
              <>
                <label>Topic</label>
                <select value={form.topic_id} onChange={(e) => setForm({ ...form, topic_id: Number(e.target.value) })}>
                  <option value={0} disabled>
                    Select...
                  </option>
                  {informationalTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                />
                <label>Link (optional)</label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
                <div style={{ marginTop: 10 }} className="row">
                  <button onClick={saveFact}> {editingId ? "Save changes" : "Add fact"}</button>
                  {editingId && (
                    <button className="secondary" onClick={resetForm}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </>
            ),
          },
        ]}
      />

      <div className="card filter-bar">
        <div>
          <label>Filter by topic</label>
          <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value ? Number(e.target.value) : "")}>
            <option value="">All informational topics</option>
            {informationalTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Topic</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td>{f.title}</td>
                  <td>{topicName(f.topic_id)}</td>
                  <td>{f.link ? <span className="badge">link</span> : <span className="text-muted text-sm">—</span>}</td>
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => setPreviewFact(f)}>
                        Preview
                      </button>
                      <button className="secondary" onClick={() => editFact(f)}>
                        Edit
                      </button>
                      <button className="danger" onClick={() => setDeleteTarget(f)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span className="text-muted text-sm">{facts.length} facts</span>
        </div>
      </div>

      {previewFact && (
        <Modal title={previewFact.title} onClose={() => setPreviewFact(null)}>
          <p>{previewFact.description}</p>
          {previewFact.link && (
            <a href={previewFact.link} target="_blank" rel="noreferrer">
              Learn more →
            </a>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.title}"?`}
          onConfirm={() => {
            deleteFact(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
