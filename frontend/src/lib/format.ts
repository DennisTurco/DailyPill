const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Very easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Very hard",
};

export function difficultyLabel(difficulty: number): string {
  return DIFFICULTY_LABELS[difficulty] ?? `Level ${difficulty}`;
}

export function formatElapsed(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple choice",
  completion: "Completion",
  single_word: "Single word",
  open_answer: "Open answer",
};

export function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}

export type AccuracyTone = "good" | "ok" | "bad";

export function accuracyTone(accuracyPercentage: number): AccuracyTone {
  if (accuracyPercentage >= 70) return "good";
  if (accuracyPercentage > 50) return "ok";
  return "bad";
}
