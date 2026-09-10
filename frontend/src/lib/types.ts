export type QuestionType = "multiple_choice" | "completion" | "single_word" | "open_answer";

export interface TopicSchedule {
  id: number;
  topic_id: number;
  day_of_week: number;
  time_of_day: string;
  is_active: boolean;
}

export interface TopicContextDocument {
    id: number;
    topic_id: number;
    filename: string;
}

export interface Topic {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_informational: boolean;
  created_at: string;
  is_deleted: boolean;
  documents?: TopicContextDocument[];
  schedules: TopicSchedule[];
}

export interface Question {
  id: number;
  topic_id: number;
  type: QuestionType;
  text: string;
  options: string[] | null;
  correct_answer: string;
  difficulty: number;
  explanation: string | null;
  created_at: string;
  is_deleted: boolean;
}

export interface UserAnswer {
  id: number;
  question_id: number;
  given_answer: string;
  is_correct: boolean | null;
  score_awarded: number;
  ai_feedback: string | null;
  answered_at: string;
}

export interface QuizSession {
  id: number;
  topic_id: number;
  started_at: string;
  completed_at: string | null;
  ai_review_summary: string | null;
  answers: UserAnswer[];
}

export interface QuizStartResponse {
  session_id: number;
  topic_id: number;
  questions: Question[];
  ai_available: boolean;
}

export interface QuizFinishResponse {
  session: QuizSession;
  total_score: number;
  max_score: number;
}

export interface QuizChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TopicProgress {
  topic_id: number;
  topic_name: string;
  question_count: number;
  total_answers: number;
  correct_answers: number;
  accuracy: number;
  average_score: number;
}

export interface DifficultyProgress {
  difficulty: number;
  total_answers: number;
  correct_answers: number;
  accuracy: number;
}

export interface ProgressSummary {
  total_quiz_sessions: number;
  total_answers: number;
  overall_accuracy: number;
  current_streak_days: number;
  by_topic: TopicProgress[];
  by_difficulty: DifficultyProgress[];
  weakest_topics: TopicProgress[];
}

export interface InfoFact {
  id: number;
  topic_id: number;
  title: string;
  description: string;
  link: string | null;
  created_at: string;
  last_shown_at: string | null;
  is_deleted: boolean;
}

export interface AIGeneratedInfoFact {
  title: string;
  description: string;
  link: string | null;
}

export interface AIGeneratedQuestion {
  type: QuestionType;
  text: string;
  options: string[] | null;
  correct_answer: string;
  difficulty: number;
  explanation: string | null;
}
