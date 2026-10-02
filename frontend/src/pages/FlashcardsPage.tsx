import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { MarkdownContent } from "../components/MarkdownContent";
import { difficultyLabel } from "../lib/format";
import { Question, Topic } from "../lib/types";

type Rating = "knew" | "almost" | "missed";

const RATINGS: { value: Rating; label: string; icon: string; key: string; className: string }[] = [
  { value: "missed", label: "Didn't know", icon: "fa-solid fa-xmark", key: "1", className: "danger" },
  { value: "almost", label: "Almost", icon: "fa-solid fa-circle-half-stroke", key: "2", className: "secondary" },
  { value: "knew", label: "Knew it", icon: "fa-solid fa-check", key: "3", className: "" },
];

const DECK_SIZES = [10, 20, 50, 0];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Quick self-graded review: read the question, recall the answer, flip, rate yourself. Cards you didn't know
 * come back at the end of the deck. Ratings aren't stored in your stats (they're self-reported), but the
 * cards you missed can be turned into a graded practice quiz.
 */
export default function FlashcardsPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [deckSize, setDeckSize] = useState(20);
  const [queue, setQueue] = useState<Question[]>([]);
  const [deckTotal, setDeckTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // The first rating of each card is what the summary reports; re-queued cards don't overwrite it.
  const [firstRating, setFirstRating] = useState<Record<number, Rating>>({});
  const [cards, setCards] = useState<Map<number, Question>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Topic[]>("/topics").then(setTopics).catch((err) => setError(String(err)));
  }, []);

  function startDeck(deck: Question[]) {
    setQueue(deck);
    setDeckTotal(deck.length);
    setCards(new Map(deck.map((q) => [q.id, q])));
    setFirstRating({});
    setFlipped(false);
  }

  async function start(t: Topic) {
    setLoading(true);
    setError(null);
    try {
      const questions = (await api.get<Question[]>(`/questions?topic_id=${t.id}`)).filter((q) => !q.is_deleted);
      if (questions.length === 0) {
        setError(`"${t.name}" has no questions yet.`);
        return;
      }
      const deck = shuffle(questions);
      setTopic(t);
      startDeck(deckSize > 0 ? deck.slice(0, deckSize) : deck);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const current = queue[0];

  const rate = useCallback(
    (rating: Rating) => {
      if (!current) return;
      setFirstRating((prev) => (current.id in prev ? prev : { ...prev, [current.id]: rating }));
      setQueue((prev) => (rating === "missed" ? [...prev.slice(1), prev[0]] : prev.slice(1)));
      setFlipped(false);
    },
    [current],
  );

  useEffect(() => {
    if (!current) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      const rating = RATINGS.find((r) => r.key === e.key);
      if (rating && flipped) rate(rating.value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, rate]);

  if (!topic) {
    return (
      <div>
        <h1><i className="fa-solid fa-clone" /> Flashcards</h1>
        <p className="page-subtitle">
          Quick self-check: recall the answer, flip the card, rate yourself. Ratings don't affect your stats.
        </p>
        {error && <div className="error">{error}</div>}
        <div className="row" style={{ marginBottom: 16 }}>
          <label htmlFor="deck-size" style={{ margin: 0 }}>Cards per deck</label>
          <select id="deck-size" value={deckSize} onChange={(e) => setDeckSize(Number(e.target.value))} style={{ width: "auto" }}>
            {DECK_SIZES.map((n) => (
              <option key={n} value={n}>{n === 0 ? "All" : n}</option>
            ))}
          </select>
        </div>
        <div className="topic-grid">
          {topics.filter((t) => !t.is_informational).map((t) => (
            <button key={t.id} className="topic-card" disabled={loading} onClick={() => start(t)}>
              <span className="topic-card-title">{t.name}</span>
              {t.description && <span className="topic-card-description">{t.description}</span>}
              <span className="topic-card-footer">
                {t.category ? <span className="badge">{t.category}</span> : <span />}
                <span className="topic-card-start">Study <i className="fa-solid fa-arrow-right" /></span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!current) {
    const counts = { knew: 0, almost: 0, missed: 0 };
    Object.values(firstRating).forEach((r) => counts[r]++);
    const weakIds = Object.entries(firstRating).filter(([, r]) => r !== "knew").map(([id]) => Number(id));
    const weakCards = weakIds.map((id) => cards.get(id)).filter((q): q is Question => !!q);

    return (
      <div>
        <h1><i className="fa-solid fa-clone" /> Deck complete</h1>
        <p className="page-subtitle">{topic.name} · {deckTotal} cards</p>
        <div className="stat-grid">
          <div className="stat-tile"><div className="stat-tile-icon"><i className="fa-solid fa-check" /></div><div><div className="stat-tile-value">{counts.knew}</div><div className="stat-tile-label">Knew it first time</div></div></div>
          <div className="stat-tile"><div className="stat-tile-icon"><i className="fa-solid fa-circle-half-stroke" /></div><div><div className="stat-tile-value">{counts.almost}</div><div className="stat-tile-label">Almost</div></div></div>
          <div className="stat-tile"><div className="stat-tile-icon"><i className="fa-solid fa-xmark" /></div><div><div className="stat-tile-value">{counts.missed}</div><div className="stat-tile-label">Didn't know</div></div></div>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {weakCards.length > 0 && (
            <>
              <button onClick={() => startDeck(shuffle(weakCards))}>
                <i className="fa-solid fa-rotate-right" /> Review the {weakCards.length} weak cards again
              </button>
              <button
                className="secondary"
                onClick={() => navigate(`/quiz?topicId=${topic.id}&questionIds=${weakIds.join(",")}`)}
                title="Answer them properly in a graded practice round"
              >
                <i className="fa-solid fa-circle-play" /> Practice them as a quiz
              </button>
            </>
          )}
          <button className="secondary" onClick={() => start(topic)}>
            <i className="fa-solid fa-shuffle" /> New deck
          </button>
          <button className="secondary" onClick={() => setTopic(null)}>Choose another topic</button>
        </div>
      </div>
    );
  }

  const done = Object.keys(firstRating).length;
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1><i className="fa-solid fa-clone" /> {topic.name}</h1>
        <span className="badge badge-lg">{done} / {deckTotal}</span>
      </div>
      <div className="flashcard-progress"><span style={{ width: `${(done / deckTotal) * 100}%` }} /></div>

      <div
        className={`card flashcard ${flipped ? "flipped" : ""}`}
        onClick={(e) => {
          if (!(e.target instanceof HTMLElement && e.target.closest("a, button"))) setFlipped((f) => !f);
        }}
      >
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="question-number">{flipped ? "Answer" : "Question"}</span>
          <span className={`badge badge-difficulty-${current.difficulty}`}>{difficultyLabel(current.difficulty)}</span>
          {current.id in firstRating && <span className="badge"><i className="fa-solid fa-rotate-right" /> Again</span>}
        </div>
        <div className="question-text">
          <MarkdownContent text={current.text} />
        </div>
        {current.type === "multiple_choice" && current.options && !flipped && (
          <ul className="flashcard-options">
            {current.options.map((opt) => <li key={opt}><MarkdownContent text={opt} /></li>)}
          </ul>
        )}
        {flipped ? (
          <div className="flashcard-answer">
            <MarkdownContent text={current.correct_answer} />
            {current.explanation && (
              <div className="text-muted" style={{ marginTop: 8 }}>
                <MarkdownContent text={current.explanation} />
              </div>
            )}
          </div>
        ) : (
          <div className="flashcard-hint text-muted">Think of the answer, then click the card or press Space to flip</div>
        )}
      </div>

      {flipped ? (
        <div className="row flashcard-ratings">
          {RATINGS.map((r) => (
            <button key={r.value} className={r.className} onClick={() => rate(r.value)}>
              <i className={r.icon} /> {r.label} <kbd>{r.key}</kbd>
            </button>
          ))}
        </div>
      ) : (
        <div className="row flashcard-ratings">
          <button onClick={() => setFlipped(true)}>
            <i className="fa-solid fa-rotate" /> Show answer <kbd>Space</kbd>
          </button>
        </div>
      )}
      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setQueue([])}>
        End deck
      </button>
    </div>
  );
}
