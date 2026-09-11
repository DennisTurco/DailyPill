import { ReactNode, useState } from "react";

interface Step {
  icon: string;
  title: string;
  body: ReactNode;
}

const STEPS: Step[] = [
  {
    icon: "fa-solid fa-capsules",
    title: "Welcome to DailyPill",
    body: (
      <>
        DailyPill turns learning into a daily habit: it schedules short quizzes on the topics you care
        about and uses a locally-running AI (Ollama) to generate questions, review open answers, and give
        you feedback — no data ever leaves your machine.
      </>
    ),
  },
  {
    icon: "fa-solid fa-layer-group",
    title: "Topics & Questions",
    body: (
      <>
        Start in <strong>Topics</strong>: create a subject, optionally attach a <code>.md</code> context
        document so the AI has real material to draw from, and set a weekly schedule. Then head to{" "}
        <strong>Questions</strong> to add questions manually or let the AI generate them for you.
      </>
    ),
  },
  {
    icon: "fa-solid fa-circle-play",
    title: "Taking a quiz",
    body: (
      <>
        Jump into <strong>Quiz</strong> anytime to practice a topic on demand, or let a scheduled reminder
        pop up automatically — you'll get a quick confirmation prompt before it starts. How many questions
        each quiz includes is configurable in <strong>Settings</strong>.
      </>
    ),
  },
  {
    icon: "fa-solid fa-tablets",
    title: "Info facts",
    body: (
      <>
        Mark a topic as "informational only" to skip quizzing and instead surface bite-sized facts — one
        pops up automatically each day, and you can browse the full list under <strong>Info facts</strong>.
      </>
    ),
  },
  {
    icon: "fa-solid fa-gauge-simple-high",
    title: "Track your progress",
    body: (
      <>
        The <strong>Dashboard</strong> shows your quiz history, accuracy by topic and difficulty, your
        current streak, and the topics you're weakest on — so you know exactly where to focus next.
      </>
    ),
  },
  {
    icon: "fa-solid fa-gear",
    title: "Make it yours",
    body: (
      <>
        <strong>Settings</strong> shows whether Ollama is reachable and whether it's using your GPU. You
        can also switch between dark/light mode and drag or collapse the sidebar to your liking — both
        from the bottom of the sidebar itself.
      </>
    ),
  },
];

export function OnboardingWizard({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="modal-overlay" onClick={onFinish}>
      <div
        className="card modal-panel onboarding-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="secondary onboarding-skip" onClick={onFinish}>
          Skip
        </button>

        <div className="onboarding-icon">
          <i className={step.icon} />
        </div>
        <h3 style={{ textAlign: "center" }}>{step.title}</h3>
        <p style={{ color: "var(--text-muted)", textAlign: "center" }}>{step.body}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === index ? "active" : ""}`} />
          ))}
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
          <button
            className="secondary"
            onClick={() => setIndex((i) => i - 1)}
            style={{ visibility: isFirst ? "hidden" : "visible" }}
          >
            Back
          </button>
          {isLast ? (
            <button onClick={onFinish}>Get started</button>
          ) : (
            <button onClick={() => setIndex((i) => i + 1)}>Next</button>
          )}
        </div>
      </div>
    </div>
  );
}
