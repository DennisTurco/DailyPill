from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.topic import Topic, TopicSchedule

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("")
def resolved_schedules(db: Session = Depends(get_db)):
    rows = (
        db.query(TopicSchedule, Topic)
        .join(Topic, TopicSchedule.topic_id == Topic.id)
        .filter(TopicSchedule.is_active.is_(True), Topic.is_deleted.is_(False))
        .all()
    )
    return [
        {
            "topic_id": topic.id,
            "topic_name": topic.name,
            "day_of_week": schedule.day_of_week,
            "time_of_day": schedule.time_of_day.strftime("%H:%M"),
        }
        for schedule, topic in rows
    ]
