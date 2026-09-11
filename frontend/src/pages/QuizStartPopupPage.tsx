import { useSearchParams } from "react-router-dom";

export default function QuizStartPopupPage() {
  const [searchParams] = useSearchParams();
  const topicId = Number(searchParams.get("topicId"));
  const topicName = searchParams.get("topicName") ?? "this topic";

  function start() {
    window.dailyPill?.startScheduledQuiz(topicId);
  }

  function dismiss() {
    window.dailyPill?.closeWindow();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 14px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            background: "linear-gradient(135deg, rgba(124, 156, 255, 0.18), rgba(176, 124, 255, 0.14))",
            color: "var(--accent-1)",
          }}
        >
          <i className="fa-solid fa-circle-play" />
        </div>
        <h3 style={{ marginTop: 0 }}>Time for your daily quiz</h3>
        <p style={{ color: "var(--text-muted)" }}>
          It's time to practice <strong style={{ color: "var(--text-primary)" }}>{topicName}</strong>. Start
          now?
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
          <button className="secondary" onClick={dismiss}>
            Not now
          </button>
          <button onClick={start}>
            <i className="fa-solid fa-circle-play" /> Start quiz
          </button>
        </div>
      </div>
    </div>
  );
}
