import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Toast, ToastMessage } from "../components/Toast";
import { MarkdownContent } from "../components/MarkdownContent";
import { VoiceAnswerButton } from "../components/VoiceAnswerButton";
import { MicrophoneSelect } from "../components/MicrophoneSelect";
import { difficultyLabel, formatElapsed } from "../lib/format";
import { Confidence, Question, QuizChatMessage, QuizFinishResponse, QuizStartResponse, Setting, Topic, TranscriptionStatus, UserAnswer } from "../lib/types";
import { getSettingValue } from "../settings";
import { getTutorStyle } from "../lib/tutorStyles";

type Stage = "select" | "in_progress" | "finished";

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [session, setSession] = useState<QuizStartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<Record<number, Confidence>>({});
  const [hints, setHints] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizFinishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [voiceReady, setVoiceReady] = useState(false);
  const [isPractice, setIsPractice] = useState(false);

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

  // Passing questionIds starts a practice retry of those questions; it isn't counted as a quiz session.
  async function startQuiz(id: number, questionIds?: number[]) {
    setError(null);
    setLoading(true);
    try {
      const questionCount = Number(getSettingValue(settings, "QuestionCount") ?? 5);
      const response = await api.post<QuizStartResponse>("/quiz/start", {
        topic_id: id,
        question_count: questionCount,
        question_ids: questionIds,
      });
      setSession(response);
      setAnswers({});
      setConfidence({});
      setHints({});
      setResult(null);
      setIsPractice(!!questionIds?.length);
      setStage("in_progress");
      window.scrollTo(0, 0);
      // Checked per quiz: the Whisper model may still be downloading when the app starts.
      api
        .get<TranscriptionStatus>("/ai/transcription-status")
        .then((s) => setVoiceReady(s.ready))
        .catch(() => setVoiceReady(false));
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
          confidence: confidence[q.id] ?? null,
          hint_used: q.id in hints,
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

  function getIconAndColorByAnswer(a: UserAnswer): React.JSX.Element | undefined {
    if (a.is_correct == null)
        return undefined;
    if (isPartial(a))
        return <i className="fa-solid fa-circle-half-stroke" style={{color: "var(--warning)"}}/>
    return a.is_correct
        ? <i className="fa-solid fa-circle-check" style={{color: "var(--success)"}}/>
        : <i className="fa-solid fa-circle-xmark" style={{color: "var(--danger)"}}/>
  }

  if (error) return <div className="error">{error}</div>;

  if (stage === "select") {
    return (
      <div>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <h1><i className="fa-solid fa-circle-play"/> Quiz</h1>
        <p className="page-subtitle">Pick a topic to start a quiz.</p>
        <div className="topic-grid">
          {topics.filter((t) => !t.is_informational).map((t) => (
            <button
              key={t.id}
              className={`topic-card ${loading && topicId === t.id ? "loading" : ""}`}
              disabled={loading}
              onClick={() => {
                setTopicId(t.id);
                startQuiz(t.id);
              }}
            >
              <span className="topic-card-title">{t.name}</span>
              {t.description && <span className="topic-card-description">{t.description}</span>}
              <span className="topic-card-footer">
                {t.category ? <span className="badge">{t.category}</span> : <span />}
                <span className="topic-card-start">
                  {loading && topicId === t.id ? "Starting..." : "Start"} <i className="fa-solid fa-arrow-right" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (stage === "in_progress" && session) {
    return (
      <div>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1><i className="fa-solid fa-circle-play"/> {isPractice ? "Practice round" : "Quiz in progress"}</h1>
          <span className="badge badge-lg"><i className="fa-regular fa-clock" /> {formatElapsed(elapsedSeconds)}</span>
        </div>
        {isPractice && (
          <p className="page-subtitle">Retrying questions you've already seen. Your new answers replace the previous ones in your accuracy stats.</p>
        )}
        {voiceReady && (
          <div className="card">
            <label htmlFor="quiz-microphone"><i className="fa-solid fa-microphone" /> Microphone for voice answers</label>
            <MicrophoneSelect id="quiz-microphone" />
          </div>
        )}
        {session.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i}
            total={session.questions.length}
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
            voiceReady={voiceReady}
            confidence={confidence[q.id] ?? null}
            onConfidenceChange={(value) => setConfidence((prev) => ({ ...prev, [q.id]: value }))}
            sessionId={session.session_id}
            hintsAvailable={session.ai_available}
            hint={hints[q.id] ?? null}
            onHint={(hint) => setHints((prev) => ({ ...prev, [q.id]: hint }))}
          />
        ))}
        <button disabled={loading} onClick={submitQuiz}>
          {loading ? "Submitting..." : "Submit answers"}
        </button>
      </div>
    );
  }

  if (stage === "finished" && result) {
    const tutorStyle = getTutorStyle(getSettingValue(settings, "TutorStyle"));
    const questionById = new Map((session?.questions ?? []).map((q) => [q.id, q]));
    const allQuestionIds = (session?.questions ?? []).map((q) => q.id);
    // "Weak" = not solidly known: wrong, ungraded (no feedback was possible), only partially right, a lucky guess, or needed a hint.
    const weakQuestionIds = result.session.answers
      .filter((a) => a.is_correct !== true || isPartial(a) || a.confidence === "guess" || a.hint_used)
      .map((a) => a.question_id);
    const retry = (ids: number[]) => startQuiz(result.session.topic_id, ids);

    return (
      <div>
        <h1><i className="fa-solid fa-square-poll-vertical"/> {result.session.is_practice ? "Practice results" : "Results"}</h1>
        <div className="card">
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {formatScore(result.total_score)} / {result.max_score}
          </div>
          {result.session.is_practice && (
            <div style={{ color: "var(--text-muted)" }}>Practice round — your latest answers now count toward accuracy.</div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            {weakQuestionIds.length > 0 && (
              <button
                disabled={loading}
                onClick={() => retry(weakQuestionIds)}
                title="Wrong answers, lucky guesses and answers that needed a hint"
              >
                <i className="fa-solid fa-rotate-right" /> Retry weak answers ({weakQuestionIds.length})
              </button>
            )}
            <button className="secondary" disabled={loading} onClick={() => retry(allQuestionIds)}>
              <i className="fa-solid fa-repeat" /> Retry whole quiz
            </button>
          </div>
        </div>
        {result.session.ai_review_summary && (
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h3><i className="fa-solid fa-robot"/> AI recap</h3>
              <span className="badge" title={`Tutor style: ${tutorStyle.description} Change it in Settings.`}>
                <i className={tutorStyle.icon} /> {tutorStyle.label}
              </span>
            </div>
            <MarkdownContent text={result.session.ai_review_summary} />
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
                {question && (
                  <div style={{ fontWeight: 600 }}>
                    {getIconAndColorByAnswer(a)} <MarkdownContent text={question.text} />
                  </div>
                )}
                <div style={{ marginLeft: 16, marginTop: 4 }}>
                  <div className={a.is_correct === null ? "" : isPartial(a) ? "warning" : a.is_correct ? "success" : "error"}>
                    {a.is_correct === null
                      ? "Pending review"
                      : isPartial(a)
                        ? `Partially correct (${Math.round(answerCredit(a) * 100)}%)`
                        : a.is_correct ? "Correct" : "Incorrect"} — you answered:
                  </div>
                  {question?.type === "open_answer" ? (
                    <MarkdownContent text={a.given_answer || "*(no answer given)*"} />
                  ) : (
                    <div>{a.given_answer}</div>
                  )}
                  <AnswerInsight answer={a} />
                  {(a.is_correct === false || isPartial(a)) && question && (
                    <>
                      <div className="success" style={{ marginTop: 6 }}>
                        Correct answer:
                      </div>
                      <MarkdownContent text={question.correct_answer} />
                      {question.explanation && <MarkdownContent text={question.explanation} />}
                    </>
                  )}
                  {a.ai_feedback && <div style={{ color: "var(--text-muted)" }}>{a.ai_feedback}</div>}
                  {a.language_feedback && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ color: "var(--warning)", fontWeight: 600 }}>
                        <i className="fa-solid fa-spell-check" /> Language notes (don't affect the score)
                      </div>
                      <div style={{ whiteSpace: "pre-line", color: "var(--text-muted)" }}>{a.language_feedback}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <QuizChat
          sessionId={result.session.id}
          voiceReady={voiceReady}
          voicePrompt={(session?.questions ?? []).map((q) => q.text).join("\n")}
        />
        <button onClick={() => setStage("select")}>Take another quiz</button>
      </div>
    );
  }

  return <div>Loading...</div>;
}

function QuizChat({ sessionId, voiceReady, voicePrompt }: { sessionId: number; voiceReady: boolean; voicePrompt: string }) {
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
        {voiceReady && (
          <VoiceAnswerButton
            prompt={voicePrompt}
            label="Ask by voice"
            onTranscript={(text) => setInput((prev) => (prev.trim() ? `${prev.trimEnd()}\n${text}` : text))}
          />
        )}
        <button disabled={loading || !input.trim()} onClick={send} style={{ marginTop: 8 }}>
          <i className="fa-solid fa-paper-plane"/> Send
        </button>
    </div>
  );
}

const CONFIDENCE_OPTIONS: { value: Confidence; label: string; icon: string }[] = [
  { value: "sure", label: "Sure", icon: "fa-solid fa-circle-check" },
  { value: "unsure", label: "Unsure", icon: "fa-solid fa-circle-question" },
  { value: "guess", label: "Guessing", icon: "fa-solid fa-dice" },
];

/** Correctness credit from 0 to 1, before the hint penalty (score_awarded is halved when a hint was used). */
function answerCredit(a: UserAnswer): number {
  return a.hint_used ? Math.min(1, a.score_awarded * 2) : a.score_awarded;
}

/** Graded open answers can earn partial credit: right in part, but missing or blurring some key idea. */
function isPartial(a: UserAnswer): boolean {
  if (a.is_correct === null) return false;
  const credit = answerCredit(a);
  return credit > 0 && credit < 1;
}

function formatScore(score: number): string {
  return String(Math.round(score * 100) / 100);
}

const CONFIDENCE_LABELS: Record<Confidence, string> = { sure: "Sure", unsure: "Unsure", guess: "Guessed" };

/** Badges for how the answer was given, plus a nudge when confidence and correctness disagree. */
function AnswerInsight({ answer }: { answer: UserAnswer }) {
  const luckyGuess = answer.is_correct === true && answer.confidence === "guess";
  const misconception = answer.is_correct === false && answer.confidence === "sure";
  if (!answer.confidence && !answer.hint_used) return null;

  return (
    <div style={{ margin: "6px 0" }}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {answer.confidence && <span className="badge">{CONFIDENCE_LABELS[answer.confidence]}</span>}
        {answer.hint_used && (
          <span className="badge">
            <i className="fa-solid fa-lightbulb" /> Used a hint{answer.score_awarded > 0 ? " — half credit" : ""}
          </span>
        )}
      </div>
      {luckyGuess && (
        <div style={{ color: "var(--warning)", marginTop: 4 }}>
          <i className="fa-solid fa-dice" /> Right, but it was a guess — worth reviewing until you know why.
        </div>
      )}
      {misconception && (
        <div style={{ color: "var(--warning)", marginTop: 4 }}>
          <i className="fa-solid fa-triangle-exclamation" /> You were sure about this one — likely a misconception worth fixing.
        </div>
      )}
    </div>
  );
}

function HintBox({
  sessionId,
  questionId,
  hint,
  onHint,
}: {
  sessionId: number;
  questionId: number;
  hint: string | null;
  onHint: (hint: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestHint() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ hint: string }>(`/quiz/${sessionId}/hint`, { question_id: questionId });
      onHint(response.hint);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (hint) {
    return (
      <div className="hint-box">
        <div className="hint-box-title">
          <i className="fa-solid fa-lightbulb" /> Hint <span className="text-muted">(a correct answer now earns half credit)</span>
        </div>
        <MarkdownContent text={hint} />
      </div>
    );
  }

  return (
    <div className="row" style={{ marginTop: 8 }}>
      <button className="btn-ghost btn-sm" disabled={loading} onClick={requestHint} title="A correct answer after a hint earns half credit">
        <i className="fa-solid fa-lightbulb" /> {loading ? "Thinking..." : "Get a hint"}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
  voiceReady,
  index,
  total,
  confidence,
  onConfidenceChange,
  sessionId,
  hintsAvailable,
  hint,
  onHint,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  voiceReady: boolean;
  index: number;
  total: number;
  confidence: Confidence | null;
  onConfidenceChange: (value: Confidence) => void;
  sessionId: number;
  hintsAvailable: boolean;
  hint: string | null;
  onHint: (hint: string) => void;
}) {
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="question-number">Question {index + 1} of {total}</span>
        <span className={`badge badge-difficulty-${question.difficulty}`}>{difficultyLabel(question.difficulty)}</span>
      </div>
      <div className="question-text">
        <MarkdownContent text={question.text} />
      </div>
      {question.type === "multiple_choice" && question.options ? (
        <div className="choice-list">
          {question.options.map((opt) => (
            <label key={opt} className={`choice ${value === opt ? "selected" : ""}`}>
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
                style={{ width: "auto" }}
              />
              <MarkdownContent text={opt} />
            </label>
          ))}
        </div>
      ) : question.type === "open_answer" ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer... (code is welcome, e.g. inside a ```language fence)"
            rows={6}
            style={{ fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace" }}
          />
          {voiceReady && (
            <VoiceAnswerButton
              prompt={question.text}
              onTranscript={(text) => onChange(value.trim() ? `${value.trimEnd()}\n${text}` : text)}
            />
          )}
        </>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer" />
      )}
      {hintsAvailable && <HintBox sessionId={sessionId} questionId={question.id} hint={hint} onHint={onHint} />}
      <div className="confidence-picker">
        <span className="text-muted">How sure are you?</span>
        {CONFIDENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn-sm ${confidence === opt.value ? "active" : "secondary"}`}
            aria-pressed={confidence === opt.value}
            onClick={() => onConfidenceChange(opt.value)}
          >
            <i className={opt.icon} /> {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
