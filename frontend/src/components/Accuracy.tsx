import { accuracyTone } from "../lib/format";

/** Accuracy as a colored percentage with a small bar; "—" when there's nothing to measure yet. */
export function Accuracy({ accuracy, answers }: { accuracy: number; answers: number }) {
  if (answers === 0) return <span className="text-muted">—</span>;
  const percentage = Math.round(accuracy * 100);
  return (
    <span className={`accuracy accuracy-${accuracyTone(percentage)}`}>
      <span className="accuracy-bar">
        <span style={{ width: `${percentage}%` }} />
      </span>
      {percentage}%
    </span>
  );
}
