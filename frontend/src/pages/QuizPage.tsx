import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Toast, ToastMessage } from "../components/Toast";
import { MarkdownContent } from "../components/MarkdownContent";
import { difficultyLabel, formatElapsed } from "../lib/format";
import { Question, QuizChatMessage, QuizFinishResponse, QuizStartResponse, Setting, Topic } from "../lib/types";
import { getSettingValue } from "../settings";

type Stage = "select" | "in_progress" | "finished";

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [session, setSession] = useState<QuizStartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizFinishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [settings, setSettings] = useState<Setting[]>([]);

  useEffect(() => {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setError(String(err)));
    api.get<Setting[]>("/settings").then(setSettings).catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    if (stage !== "in_progress") return;
    setElapsedSeconds(0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, session?.session_id]);

  useEffect(() => {
    const preselect = searchParams.get("topicId");
    if (preselect) {
      const id = Number(preselect);
      setTopicId(id);
      startQuiz(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function startQuiz(id: number) {
    setError(null);
    setLoading(true);
    try {
      const questionCount = Number(getSettingValue(settings, "QuestionCount") ?? 5);
      const response = await api.post<QuizStartResponse>("/quiz/start", {
        topic_id: id,
        question_count: questionCount,
      });
      setSession(response);
      setAnswers({});
      setStage("in_progress");
      if (!response.ai_available) {
        setToast({
          kind: "warning",
          text: "Local AI (Ollama) isn't reachable right now, so this quiz only includes questions that don't need AI review.",
        });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        answers: session.questions.map((q) => ({
          question_id: q.id,
          given_answer: answers[q.id] ?? "",
        })),
      };
      await api.post(`/quiz/${session.session_id}/submit`, payload);
      const finishResponse = await api.post<QuizFinishResponse>(`/quiz/${session.session_id}/finish`);
      setResult(finishResponse);
      setStage("finished");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function getIconAndColorByAnswer(isCorrect: boolean | null): React.JSX.Element | undefined {
    if (isCorrect == null)
        return undefined;
    return isCorrect
        ? <i className="fa-solid fa-circle-check" style={{color: "green"}}/>
        : <i className="fa-solid fa-circle-xmark" style={{color: "red"}}/>
  }

  if (error) return <div className="error">{error}</div>;

  if (stage === "select") {
    return (
      <div>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <h1><i className="fa-solid fa-circle-play"/> Quiz</h1>
        <div className="card">
          <label>Choose a topic</label>
          <select value={topicId ?? ""} onChange={(e) => setTopicId(Number(e.target.value))}>
            <option value="" disabled>
              Select...
            </option>
            {topics.filter((t) => !t.is_informational).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 12 }}>
            <button disabled={!topicId || loading} onClick={() => topicId && startQuiz(topicId)}>
              Start quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "in_progress" && session) {
    return (
      <div>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1>Quiz in progress</h1>
          <span className="badge">⏱ {formatElapsed(elapsedSeconds)}</span>
        </div>
        {session.questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
          />
        ))}
        <button disabled={loading} onClick={submitQuiz}>
          {loading ? "Submitting..." : "Submit answers"}
        </button>
      </div>
    );
  }

  if (stage === "finished" && result) {
    const questionById = new Map((session?.questions ?? []).map((q) => [q.id, q]));

    return (
      <div>
        <h1><i className="fa-solid fa-square-poll-vertical"/> Results</h1>
        <div className="card">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {result.total_score} / {result.max_score}
          </div>
        </div>
        {result.session.ai_review_summary && (
          <div className="card">
            <h3><i className="fa-solid fa-robot"/> AI recap</h3>
            <p>{result.session.ai_review_summary}</p>
          </div>
        )}
        <div className="card">
          <h3><i className="fa-solid fa-comments"/> Answer breakdown</h3>
          {result.session.answers.map((a, i) => {
            const question = questionById.get(a.question_id);
            return (
              <div
                key={a.id}
                style={{
                  paddingTop: i === 0 ? 0 : 16,
                  marginTop: i === 0 ? 0 : 16,
                  borderTop: i === 0 ? undefined : "1px solid var(--border)",
                }}
              >
                {question && <div style={{ fontWeight: 600 }}> {getIconAndColorByAnswer(a.is_correct)} {question.text}</div>}
                <div style={{ marginLeft: 16, marginTop: 4 }}>
                  <div className={a.is_correct === null ? "" : a.is_correct ? "success" : "error"}>
                    {a.is_correct === null ? "Pending review" : a.is_correct ? "Correct" : "Incorrect"} — you answered:
                  </div>
                  {question?.type === "open_answer" ? (
                    <MarkdownContent text={a.given_answer || "*(no answer given)*"} />
                  ) : (
                    <div>{a.given_answer}</div>
                  )}
                  {a.is_correct === false && question && (
                    <>
                      <div className="success" style={{ marginTop: 6 }}>
                        Correct answer:
                      </div>
                      <MarkdownContent text={question.correct_answer} />
                      {question.explanation && <MarkdownContent text={question.explanation} />}
                    </>
                  )}
                  {a.ai_feedback && <div style={{ color: "var(--text-muted)" }}>{a.ai_feedback}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <QuizChat sessionId={result.session.id} />
        <button onClick={() => setStage("select")}>Take another quiz</button>
      </div>
    );
  }

  return <div>Loading...</div>;
}

function QuizChat({ sessionId }: { sessionId: number }) {
  const [messages, setMessages] = useState<QuizChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ reply: string }>(`/quiz/${sessionId}/chat`, {
        message: text,
        history,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3><i className="fa-solid fa-comment-dots"/> Ask about this quiz</h3>
      <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--text-muted)" }}>
            Ask a follow-up question about the quiz you just took — e.g. why an answer was wrong, or for a deeper
            explanation of a topic.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, color: m.role === "user" ? "#7c9cff" : "var(--text-primary)" }}>
              {m.role === "user" ? "You" : "DailyPill"}
            </div>
            <MarkdownContent text={m.content} />
          </div>
        ))}
        {loading && <div style={{ color: "var(--text-muted)" }}>Thinking...</div>}
      </div>
      {error && (
        <div className="error" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this quiz..."
        />
        <button disabled={loading || !input.trim()} onClick={send}>
          <i className="fa-solid fa-paper-plane"/> Send
        </button>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="card">
      <div style={{ marginBottom: 8 }}>
        <span className="badge">{difficultyLabel(question.difficulty)}</span>
      </div>
      <div style={{ marginBottom: 10, fontWeight: 600 }}>{question.text}</div>
      {question.type === "multiple_choice" && question.options ? (
        <div>
          {question.options.map((opt) => (
            <label key={opt} className="row" style={{ marginTop: 6 }}>
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
                style={{ width: "auto" }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      ) : question.type === "open_answer" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer... (code is welcome, e.g. inside a ```language fence)"
          rows={6}
          style={{ fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace" }}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />
      )}
    </div>
  );
}
