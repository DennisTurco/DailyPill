from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.question import QuestionRead

MAX_QUIZ_QUESTIONS = 5


class QuizStartRequest(BaseModel):
    topic_id: int
    question_count: int = Field(default=MAX_QUIZ_QUESTIONS, ge=1, le=MAX_QUIZ_QUESTIONS)


class QuizStartResponse(BaseModel):
    session_id: int
    topic_id: int
    questions: list[QuestionRead]
    ai_available: bool


class AnswerSubmit(BaseModel):
    question_id: int
    given_answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerSubmit]


class UserAnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question_id: int
    given_answer: str
    is_correct: bool | None
    score_awarded: float
    ai_feedback: str | None
    answered_at: datetime


class QuizSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic_id: int
    started_at: datetime
    completed_at: datetime | None
    ai_review_summary: str | None
    answers: list[UserAnswerRead] = []


class QuizFinishResponse(BaseModel):
    session: QuizSessionRead
    total_score: float
    max_score: float


class QuizChatMessage(BaseModel):
    role: str
    content: str


class QuizChatRequest(BaseModel):
    message: str
    history: list[QuizChatMessage] = []


class QuizChatResponse(BaseModel):
    reply: str
