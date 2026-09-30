export type TutorStyle = "friendly" | "professional" | "strict" | "socratic" | "interviewer";

export interface TutorStyleOption {
  value: TutorStyle;
  label: string;
  icon: string;
  description: string;
}

// Mirrors DailyPill.Common.Enums.TutorStyle on the backend.
export const TUTOR_STYLES: TutorStyleOption[] = [
  { value: "friendly", label: "Friendly", icon: "fa-solid fa-face-smile", description: "Warm and encouraging, celebrates what you got right." },
  { value: "professional", label: "Professional", icon: "fa-solid fa-briefcase", description: "Neutral and precise, like a senior colleague." },
  { value: "strict", label: "Strict", icon: "fa-solid fa-ruler", description: "Direct and demanding, points out every weakness." },
  { value: "socratic", label: "Socratic", icon: "fa-solid fa-lightbulb", description: "Guides you with hints and questions instead of giving the answer away." },
  { value: "interviewer", label: "Interviewer", icon: "fa-solid fa-user-tie", description: "Talks like a technical interviewer and asks follow-up questions." },
];

/** The style for a stored setting value; unknown or missing values fall back to Friendly, like the backend. */
export function getTutorStyle(value: string | null): TutorStyleOption {
  return TUTOR_STYLES.find((s) => s.value === value?.toLowerCase()) ?? TUTOR_STYLES[0];
}
