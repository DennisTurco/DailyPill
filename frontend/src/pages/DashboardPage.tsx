import { ReactNode, useEffect, useState } from "react";
import { api } from "../lib/api";
import { difficultyLabel } from "../lib/format";
import { ProgressSummary } from "../lib/types";

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProgressSummary>("/progress")
      .then(setProgress)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!progress) return <div>Loading...</div>;

  function getIconAndColorByAccuracy(count: number, accuracyPercentage: number): React.JSX.Element | undefined {
    if (count == 0) return undefined;
    else if (accuracyPercentage >= 80) return <i className="fa-solid fa-circle-check" style={{color: "green"}}/>
    else if (accuracyPercentage >= 70) return <i className="fa-solid fa-circle-check" style={{color: "#84e084"}}/>
    else if (accuracyPercentage > 50) return <i className="fa-solid fa-circle-exclamation" style={{color: "yellow"}}/>
    return <i className="fa-solid fa-circle-xmark" style={{color: "red"}}/>
  }

  return (
    <div>
      <h1><i className="fa-solid fa-gauge-simple-high"/> Dashboard</h1>

      <div className="card row" style={{ justifyContent: "space-between" }}>
        <Stat label={<><i className="fa-solid fa-circle-play"/> Quiz sessions</>} value={progress.total_quiz_sessions} />
        <Stat label={<><i className="fa-solid fa-reply"/> Answers given</>} value={progress.total_answers} />
        <Stat label={<><i className="fa-solid fa-check-double"/> Overall accuracy</>} value={`${Math.round(progress.overall_accuracy * 100)}%`} />
        <Stat label={<><i className="fa-solid fa-fire"/> Current streak</>} value={`${progress.current_streak_days} days`} />
      </div>

      <div className="card">
        <h3><i className="fa-solid fa-layer-group"/> By topic</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Questions</th>
              <th>Answers</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {progress.by_topic.map((t) => (
              <tr key={t.topic_id}>
                <td>{t.topic_name}</td>
                <td>{t.question_count}</td>
                <td>{t.total_answers}</td>
                <td>{Math.round(t.accuracy * 100)}% {getIconAndColorByAccuracy(t.total_answers, t.accuracy * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3><i className="fa-solid fa-person-hiking"/> By difficulty</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Difficulty</th>
              <th>Answers</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {progress.by_difficulty.map((d) => (
              <tr key={d.difficulty}>
                <td>{difficultyLabel(d.difficulty)}</td>
                <td>{d.total_answers}</td>
                <td>{Math.round(d.accuracy * 100)}% {getIconAndColorByAccuracy(d.total_answers, d.accuracy * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {progress.weakest_topics.length > 0 && (
        <div className="card">
          <h3>Weakest topics</h3>
          <ul>
            {progress.weakest_topics.map((t) => (
              <li key={t.topic_id}>
                {t.topic_name} — {Math.round(t.accuracy * 100)}% accuracy {getIconAndColorByAccuracy(t.total_answers, t.accuracy * 100)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: ReactNode; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9aa0b4" }}>{label}</div>
    </div>
  );
}
