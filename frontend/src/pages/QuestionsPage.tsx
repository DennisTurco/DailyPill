import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { difficultyLabel } from "../lib/format";
import { AIGeneratedQuestion, Question, QuestionType, Topic } from "../lib/types";

const TYPES: QuestionType[] = ["multiple_choice", "completion", "single_word", "open_answer"];

export default function QuestionsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterTopic, setFilterTopic] = useState<number | "">("");
  const [filterDifficulty, setFilterDifficulty] = useState<number | "">("");
  const [filterType, setFilterType] = useState<QuestionType | "">("");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    topic_id: 0,
    type: "multiple_choice" as QuestionType,
    text: "",
    optionsRaw: "",
    correct_answer: "",
    difficulty: 3,
    explanation: "",
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiTopicId, setAiTopicId] = useState<number | "">("");
  const [aiDrafts, setAiDrafts] = useState<AIGeneratedQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function loadTopics() {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setError(String(err)));
  }

  function loadQuestions() {
    const params = new URLSearchParams();
    if (filterTopic) params.set("topic_id", String(filterTopic));
    if (filterDifficulty) params.set("difficulty", String(filterDifficulty));
    if (filterType) params.set("type", filterType);
    const query = params.toString() ? `?${params.toString()}` : "";
    api
      .get<Question[]>(`/questions${query}`)
      .then(setQuestions)
      .catch((err) => setError(String(err)));
  }

  useEffect(loadTopics, []);
  useEffect(loadQuestions, [filterTopic, filterDifficulty, filterType]);

  async function createQuestion() {
    if (!form.topic_id || !form.text.trim() || !form.correct_answer.trim()) return;
    const options =
      form.type === "multiple_choice"
        ? form.optionsRaw.split("\n").map((s) => s.trim()).filter(Boolean)
        : null;
    try {
      await api.post("/questions", {
        topic_id: form.topic_id,
        type: form.type,
        text: form.text,
        options,
        correct_answer: form.correct_answer,
        difficulty: form.difficulty,
        explanation: form.explanation || null,
      });
      setForm({ ...form, text: "", optionsRaw: "", correct_answer: "", explanation: "" });
      loadQuestions();
    } catch (err) {
      setError(String(err));
    }
  }

  async function deleteQuestion(id: number) {
    try {
      await api.del(`/questions/${id}`);
      loadQuestions();
    } catch (err) {
      setError(String(err));
    }
  }

  async function generateWithAI() {
    if (!aiTopicId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await api.post<{ questions: AIGeneratedQuestion[] }>("/ai/generate-questions", {
        topic_id: aiTopicId,
        prompt: aiPrompt,
        count: aiCount,
      });
      setAiDrafts(response.questions);
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft(draft: AIGeneratedQuestion, index: number) {
    if (!aiTopicId) return;
    try {
      await api.post("/questions", { ...draft, topic_id: aiTopicId });
      setAiDrafts((prev) => prev.filter((_, i) => i !== index));
      loadQuestions();
    } catch (err) {
      setAiError(String(err));
    }
  }

  return (
    <div>
      <h1><i className="fa-solid fa-circle-question"/> Questions</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>AI-generate questions</h3>
        <label>Topic</label>
        <select value={aiTopicId} onChange={(e) => setAiTopicId(Number(e.target.value))}>
          <option value="" disabled>
            Select...
          </option>
          {topics.map((t) => (
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
          placeholder="e.g. generate 5 medium questions about C# LINQ"
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
            <div>{draft.text}</div>
            {draft.options && (
              <ul>
                {draft.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            <div style={{ color: "#9aa0b4" }}>Correct: {draft.correct_answer}</div>
            <button style={{ marginTop: 8 }} onClick={() => saveDraft(draft, i)}>
              Save to dataset
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Add question manually</h3>
        <label>Topic</label>
        <select value={form.topic_id} onChange={(e) => setForm({ ...form, topic_id: Number(e.target.value) })}>
          <option value={0} disabled>
            Select...
          </option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label>Type</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label>Text</label>
        <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} />
        {form.type === "multiple_choice" && (
          <>
            <label>Options (one per line)</label>
            <textarea
              value={form.optionsRaw}
              onChange={(e) => setForm({ ...form, optionsRaw: e.target.value })}
              rows={4}
            />
          </>
        )}
        <label>Correct answer</label>
        <input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
        <label>Difficulty (1-5)</label>
        <input
          type="number"
          min={1}
          max={5}
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
        />
        <label>Explanation (optional)</label>
        <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} />
        <div style={{ marginTop: 10 }}>
          <button onClick={createQuestion}>Add question</button>
        </div>
      </div>

      <div className="card row">
        <div>
          <label>Filter by topic</label>
          <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value ? Number(e.target.value) : "")}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Filter by difficulty</label>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">All difficulties</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Filter by type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as QuestionType | "")}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Text</th>
            <th>Type</th>
            <th>Difficulty</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.id}>
              <td>{q.text}</td>
              <td>{q.type}</td>
              <td>{difficultyLabel(q.difficulty)}</td>
              <td>
                <button className="danger" onClick={() => deleteQuestion(q.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
