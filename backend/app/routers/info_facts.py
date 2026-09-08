import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.info_fact import InfoFact
from app.schemas.info_fact import InfoFactCreate, InfoFactRead, InfoFactUpdate

router = APIRouter(prefix="/info-facts", tags=["info-facts"])


@router.get("", response_model=list[InfoFactRead])
def list_info_facts(topic_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(InfoFact).filter(InfoFact.is_deleted.is_(False))
    if topic_id is not None:
        query = query.filter(InfoFact.topic_id == topic_id)
    return query.order_by(InfoFact.id).all()


@router.post("", response_model=InfoFactRead, status_code=201)
def create_info_fact(payload: InfoFactCreate, db: Session = Depends(get_db)):
    fact = InfoFact(**payload.model_dump())
    db.add(fact)
    db.commit()
    db.refresh(fact)
    return fact


@router.get("/daily", response_model=InfoFactRead)
def get_daily_info_fact(db: Session = Depends(get_db)):
    candidates = db.query(InfoFact).filter(InfoFact.is_deleted.is_(False)).all()
    if not candidates:
        raise HTTPException(status_code=404, detail="No info facts available")

    today = datetime.utcnow().date()
    already_shown_today = next(
        (fact for fact in candidates if fact.last_shown_at is not None and fact.last_shown_at.date() == today),
        None,
    )
    if already_shown_today:
        return already_shown_today

    def weight(fact: InfoFact) -> float:
        if fact.last_shown_at is None:
            return 10.0
        days_since = (datetime.utcnow() - fact.last_shown_at).days
        return 1.0 + float(days_since)

    weights = [weight(c) for c in candidates]
    chosen = random.choices(candidates, weights=weights, k=1)[0]
    chosen.last_shown_at = datetime.utcnow()
    db.commit()
    db.refresh(chosen)
    return chosen


@router.get("/{fact_id}", response_model=InfoFactRead)
def get_info_fact(fact_id: int, db: Session = Depends(get_db)):
    fact = db.query(InfoFact).filter(InfoFact.id == fact_id, InfoFact.is_deleted.is_(False)).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Info fact not found")
    return fact


@router.put("/{fact_id}", response_model=InfoFactRead)
def update_info_fact(fact_id: int, payload: InfoFactUpdate, db: Session = Depends(get_db)):
    fact = db.query(InfoFact).filter(InfoFact.id == fact_id, InfoFact.is_deleted.is_(False)).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Info fact not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(fact, key, value)
    db.commit()
    db.refresh(fact)
    return fact


@router.delete("/{fact_id}", status_code=204)
def delete_info_fact(fact_id: int, db: Session = Depends(get_db)):
    fact = db.query(InfoFact).filter(InfoFact.id == fact_id, InfoFact.is_deleted.is_(False)).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Info fact not found")
    fact.is_deleted = True
    fact.deleted_at = datetime.utcnow()
    db.commit()
