import { ReactNode, useEffect, useState } from "react";
import { api } from "../lib/api";
import { difficultyLabel } from "../lib/format";
import { Accuracy } from "../components/Accuracy";
import { AccuracyTrendChart } from "../components/AccuracyTrendChart";
import { ProgressSummary, ProgressTrend } from "../lib/types";

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
