from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.topic import Topic, TopicSchedule
from app.schemas.topic import TopicCreate, TopicRead, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicRead])
def list_topics(db: Session = Depends(get_db)):
    return db.query(Topic).filter(Topic.is_deleted.is_(False)).order_by(Topic.name).all()


@router.post("", response_model=TopicRead, status_code=201)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    topic = Topic(
        name=payload.name,
        category=payload.category,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
        is_informational=payload.is_informational,
    )
    db.add(topic)
    db.flush()
    for s in payload.schedules:
        db.add(TopicSchedule(topic_id=topic.id, **s.model_dump()))
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.is_deleted.is_(False)).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.put("/{topic_id}", response_model=TopicRead)
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.is_deleted.is_(False)).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    update_data = payload.model_dump(exclude_unset=True, exclude={"schedules"})
    for key, value in update_data.items():
        setattr(topic, key, value)

    if payload.schedules is not None:
        db.query(TopicSchedule).filter(TopicSchedule.topic_id == topic_id).delete()
        for s in payload.schedules:
            db.add(TopicSchedule(topic_id=topic_id, **s.model_dump()))

    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.is_deleted.is_(False)).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.is_deleted = True
    topic.deleted_at = datetime.utcnow()
    db.commit()
