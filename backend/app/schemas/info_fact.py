from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InfoFactBase(BaseModel):
    topic_id: int
    title: str
    description: str
    link: str | None = None


class InfoFactCreate(InfoFactBase):
    pass


class InfoFactUpdate(BaseModel):
    topic_id: int | None = None
    title: str | None = None
    description: str | None = None
    link: str | None = None


class InfoFactRead(InfoFactBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    last_shown_at: datetime | None
    is_deleted: bool


class AIGeneratedInfoFact(BaseModel):
    title: str
    description: str
    link: str | None = None


class AIGenerateInfoFactsRequest(BaseModel):
    topic_id: int
    prompt: str
    count: int = 5


class AIGenerateInfoFactsResponse(BaseModel):
    facts: list[AIGeneratedInfoFact]
