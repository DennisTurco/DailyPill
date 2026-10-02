import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { difficultyLabel } from "../lib/format";
import { Accuracy } from "../components/Accuracy";
import { AccuracyTrendChart } from "../components/AccuracyTrendChart";
import { MarkdownContent } from "../components/MarkdownContent";
import { Calibration, Confidence, Misconception, ProgressSummary, ProgressTrend } from "../lib/types";

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [trend, setTrend] = useState<ProgressTrend | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProgressTrend>("/progress/trend?weeks=12")
      .then(setTrend)
      .catch((err) => setError(String(err)));
    api
      .get<ProgressSummary>("/progress")
      .then(setProgress)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!progress) return <div>Loading...</div>;

  return (
    <div>
      <h1><i className="fa-solid fa-gauge-simple-high"/> Dashboard</h1>
      <p className="page-subtitle">Your progress across all topics.</p>

      <div className="stat-grid">
        <Stat icon="fa-solid fa-circle-play" label="Quiz sessions" value={progress.total_quiz_sessions} />
        <Stat icon="fa-solid fa-reply" label="Questions answered" value={progress.total_answers} />
        <Stat icon="fa-solid fa-check-double" label="Overall accuracy" value={`${Math.round(progress.overall_accuracy * 100)}%`} />
        <Stat
          icon="fa-solid fa-fire"
          label="Current streak"
          value={`${progress.current_streak_days} ${progress.current_streak_days === 1 ? "day" : "days"}`}
        />
      </div>

      {trend && <AccuracyTrendChart trend={trend} />}

      {(progress.misconceptions.length > 0 || progress.calibration.some((c) => c.total_answers > 0)) && (
        <div className="dashboard-grid">
          <MisconceptionsCard misconceptions={progress.misconceptions} />
          <CalibrationCard calibration={progress.calibration} />
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card">
          <h3><i className="fa-solid fa-layer-group"/> By topic</h3>
          <div className="scroll-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Questions</th>
                  <th>Answered</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {progress.by_topic.map((t) => (
                  <tr key={t.topic_id}>
                    <td>{t.topic_name}</td>
                    <td>{t.question_count}</td>
                    <td>{t.total_answers}</td>
                    <td><Accuracy accuracy={t.accuracy} answers={t.total_answers} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* The difficulty table is short, so the weakest topics sit under it instead of in a full-width row. */}
        <div className="dashboard-column">
          <div className="card">
            <h3><i className="fa-solid fa-person-hiking"/> By difficulty</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Difficulty</th>
                  <th>Answered</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {progress.by_difficulty.map((d) => (
                  <tr key={d.difficulty}>
                    <td>{difficultyLabel(d.difficulty)}</td>
                    <td>{d.total_answers}</td>
                    <td><Accuracy accuracy={d.accuracy} answers={d.total_answers} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {progress.weakest_topics.length > 0 && (
            <div className="card">
              <h3><i className="fa-solid fa-bullseye"/> Weakest topics</h3>
              <ol className="rank-list">
                {progress.weakest_topics.map((t, i) => (
                  <li key={t.topic_id}>
                    <span className="rank-list-index">{i + 1}</span>
                    <span className="rank-list-name">{t.topic_name}</span>
                    <Accuracy accuracy={t.accuracy} answers={t.total_answers} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: ReactNode; value: string | number }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon">
        <i className={icon} />
      </div>
      <div>
        <div className="stat-tile-value">{value}</div>
        <div className="stat-tile-label">{label}</div>
      </div>
    </div>
  );
}

const CONFIDENCE_ROWS: Record<Confidence, { label: string; icon: string }> = {
  sure: { label: "Sure", icon: "fa-solid fa-circle-check" },
  unsure: { label: "Unsure", icon: "fa-solid fa-circle-question" },
  guess: { label: "Guessing", icon: "fa-solid fa-dice" },
};

// Below this many answers a confidence level says too little to comment on.
const MIN_CALIBRATION_ANSWERS = 5;

function calibrationVerdict(calibration: Calibration[]): string | null {
  const sure = calibration.find((c) => c.confidence === "sure");
  const guess = calibration.find((c) => c.confidence === "guess");
  if (sure && sure.total_answers >= MIN_CALIBRATION_ANSWERS && sure.accuracy < 0.75) {
    return "When you feel sure you're wrong fairly often: slow down on the questions that seem obvious.";
  }
  if (guess && guess.total_answers >= MIN_CALIBRATION_ANSWERS && guess.accuracy > 0.6) {
    return "Your guesses are mostly right: you know more than you think.";
  }
  if (sure && sure.total_answers >= MIN_CALIBRATION_ANSWERS && sure.accuracy >= 0.9) {
    return "Well calibrated: when you're sure, you're almost always right.";
  }
  return null;
}

/** How well self-reported confidence predicts being right, over every attempt. */
function CalibrationCard({ calibration }: { calibration: Calibration[] }) {
  const verdict = calibrationVerdict(calibration);
  return (
    <div className="card">
      <h3><i className="fa-solid fa-scale-balanced" /> Confidence calibration</h3>
      <p className="text-muted" style={{ marginTop: 0 }}>How often you were right, by how sure you said you were.</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>You said</th>
            <th>Answers</th>
            <th>Right</th>
          </tr>
        </thead>
        <tbody>
          {calibration.map((c) => (
            <tr key={c.confidence}>
              <td><i className={CONFIDENCE_ROWS[c.confidence].icon} /> {CONFIDENCE_ROWS[c.confidence].label}</td>
              <td>{c.total_answers}</td>
              <td><Accuracy accuracy={c.accuracy} answers={c.total_answers} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {verdict && <p style={{ marginBottom: 0 }}>{verdict}</p>}
    </div>
  );
}

/** Wrong answers given with confidence: beliefs that need correcting, grouped so each topic can be practiced. */
function MisconceptionsCard({ misconceptions }: { misconceptions: Misconception[] }) {
  const navigate = useNavigate();
  const byTopic = new Map<number, { name: string; items: Misconception[] }>();
  for (const m of misconceptions) {
    const group = byTopic.get(m.topic_id) ?? { name: m.topic_name, items: [] };
    group.items.push(m);
    byTopic.set(m.topic_id, group);
  }

  return (
    <div className="card">
      <h3><i className="fa-solid fa-masks-theater" /> Misconceptions</h3>
      {misconceptions.length === 0 ? (
        <p className="text-muted" style={{ margin: 0 }}>
          No wrong answers you were sure about. Keep marking how sure you are: it's how these get spotted.
        </p>
      ) : (
        <>
          <p className="text-muted" style={{ marginTop: 0 }}>
            You were sure, but wrong. These come back first in your next quizzes until you get them right.
          </p>
          {[...byTopic.entries()].map(([topicId, group]) => (
            <div key={topicId} className="misconception-group">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{group.name}</strong>
                <button
                  className="btn-sm"
                  onClick={() => navigate(`/quiz?topicId=${topicId}&questionIds=${group.items.map((m) => m.question_id).join(",")}`)}
                >
                  <i className="fa-solid fa-rotate-right" /> Practice ({group.items.length})
                </button>
              </div>
              <ul className="misconception-list">
                {group.items.map((m) => (
                  <li key={m.question_id}><MarkdownContent text={m.question_text} /></li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
