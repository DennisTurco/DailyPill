from datetime import datetime, time

from pydantic import BaseModel, ConfigDict


class TopicScheduleBase(BaseModel):
    day_of_week: int
    time_of_day: time
    is_active: bool = True


class TopicScheduleCreate(TopicScheduleBase):
    pass


class TopicScheduleRead(TopicScheduleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic_id: int


class TopicBase(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_informational: bool = False


class TopicCreate(TopicBase):
    schedules: list[TopicScheduleCreate] = []


class TopicUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_informational: bool | None = None
    schedules: list[TopicScheduleCreate] | None = None


class TopicRead(TopicBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    is_deleted: bool
    schedules: list[TopicScheduleRead] = []
