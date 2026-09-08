import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.question import Question, QuestionType
from app.models.quiz import UserAnswer
from app.schemas.question import QuestionCreate, QuestionRead, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["questions"])


def _shuffle_options(question: QuestionRead) -> QuestionRead:
    if question.options and len(question.options) > 1:
        shuffled = question.options.copy()
        random.shuffle(shuffled)
        return question.model_copy(update={"options": shuffled})
    return question


@router.get("", response_model=list[QuestionRead])
def list_questions(
    topic_id: int | None = None,
    difficulty: int | None = None,
    type: QuestionType | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Question).filter(Question.is_deleted.is_(False))
    if topic_id is not None:
        query = query.filter(Question.topic_id == topic_id)
    if difficulty is not None:
        query = query.filter(Question.difficulty == difficulty)
    if type is not None:
        query = query.filter(Question.type == type)
    return query.order_by(Question.id).all()


@router.post("", response_model=QuestionRead, status_code=201)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    question = Question(**payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/random", response_model=list[QuestionRead])
def get_random_questions(
    topic_id: int = Query(...),
    count: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    candidates = (
        db.query(Question)
        .filter(Question.topic_id == topic_id, Question.is_deleted.is_(False))
        .all()
    )
    if not candidates:
        return []

    wrong_counts: dict[int, int] = {}
    for question_id, in (
        db.query(UserAnswer.question_id)
        .filter(UserAnswer.question_id.in_([c.id for c in candidates]), UserAnswer.is_correct.is_(False))
        .all()
    ):
        wrong_counts[question_id] = wrong_counts.get(question_id, 0) + 1

    def weight(q: Question) -> float:
        return 1.0 + 2.0 * wrong_counts.get(q.id, 0)

    weights = [weight(c) for c in candidates]
    chosen: list[Question] = []
    pool = list(candidates)
    pool_weights = list(weights)
    while pool and len(chosen) < count:
        picked = random.choices(pool, weights=pool_weights, k=1)[0]
        idx = pool.index(picked)
        chosen.append(pool.pop(idx))
        pool_weights.pop(idx)
    return [_shuffle_options(QuestionRead.model_validate(q)) for q in chosen]


@router.get("/{question_id}", response_model=QuestionRead)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id, Question.is_deleted.is_(False)).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/{question_id}", response_model=QuestionRead)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id, Question.is_deleted.is_(False)).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(question, key, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id, Question.is_deleted.is_(False)).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    question.is_deleted = True
    question.deleted_at = datetime.utcnow()
    db.commit()
