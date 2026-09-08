from pydantic import BaseModel


class TopicProgress(BaseModel):
    topic_id: int
    topic_name: str
    question_count: int
    total_answers: int
    correct_answers: int
    accuracy: float
    average_score: float


class DifficultyProgress(BaseModel):
    difficulty: int
    total_answers: int
    correct_answers: int
    accuracy: float


class ProgressSummary(BaseModel):
    total_quiz_sessions: int
    total_answers: int
    overall_accuracy: float
    current_streak_days: int
    by_topic: list[TopicProgress]
    by_difficulty: list[DifficultyProgress]
    weakest_topics: list[TopicProgress]
