from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.question import QuestionType


class QuestionBase(BaseModel):
    topic_id: int
    type: QuestionType
    text: str
    options: list[str] | None = None
    correct_answer: str
    difficulty: int = 3
    explanation: str | None = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("difficulty must be between 1 and 5")
        return v


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    topic_id: int | None = None
    type: QuestionType | None = None
    text: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    difficulty: int | None = None
    explanation: str | None = None


class QuestionRead(QuestionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    is_deleted: bool


class AIGeneratedQuestion(BaseModel):
    type: QuestionType
    text: str
    options: list[str] | None = None
    correct_answer: str
    difficulty: int = 3
    explanation: str | None = None


class AIGenerateRequest(BaseModel):
    topic_id: int
    prompt: str
    count: int = 5
    difficulty: int | None = None


class AIGenerateResponse(BaseModel):
    questions: list[AIGeneratedQuestion]
    dropped: int = 0
