from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.question import Question
from app.models.quiz import QuizSession, UserAnswer
from app.models.topic import Topic
from app.schemas.progress import DifficultyProgress, ProgressSummary, TopicProgress

router = APIRouter(prefix="/progress", tags=["progress"])


def _topic_progress(db: Session) -> list[TopicProgress]:
    topics = db.query(Topic).filter(Topic.is_deleted.is_(False)).all()
    result = []
    for topic in topics:
        answers = (
            db.query(UserAnswer)
            .join(Question, UserAnswer.question_id == Question.id)
            .filter(Question.topic_id == topic.id)
            .all()
        )
        question_count = (
            db.query(Question)
            .filter(Question.topic_id == topic.id, Question.is_deleted.is_(False))
            .count()
        )
        graded = [a for a in answers if a.is_correct is not None]
        total = len(graded)
        correct = sum(1 for a in graded if a.is_correct)
        result.append(
            TopicProgress(
                topic_id=topic.id,
                topic_name=topic.name,
                question_count=question_count,
                total_answers=total,
                correct_answers=correct,
                accuracy=(correct / total) if total else 0.0,
                average_score=(sum(a.score_awarded for a in graded) / total) if total else 0.0,
            )
        )
    return result


def _difficulty_progress(db: Session) -> list[DifficultyProgress]:
    result = []
    for difficulty in range(1, 6):
        answers = (
            db.query(UserAnswer)
            .join(Question, UserAnswer.question_id == Question.id)
            .filter(Question.difficulty == difficulty)
            .all()
        )
        graded = [a for a in answers if a.is_correct is not None]
        total = len(graded)
        correct = sum(1 for a in graded if a.is_correct)
        result.append(
            DifficultyProgress(
                difficulty=difficulty,
                total_answers=total,
                correct_answers=correct,
                accuracy=(correct / total) if total else 0.0,
            )
        )
    return result


def _current_streak_days(db: Session) -> int:
    sessions = (
        db.query(QuizSession)
        .filter(QuizSession.completed_at.isnot(None))
        .order_by(QuizSession.completed_at.desc())
        .all()
    )
    days = sorted({s.completed_at.date() for s in sessions}, reverse=True)
    if not days:
        return 0

    streak = 0
    expected = datetime.utcnow().date()
    for day in days:
        if day == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break
    return streak


@router.get("", response_model=ProgressSummary)
def get_progress(db: Session = Depends(get_db)):
    by_topic = _topic_progress(db)
    by_difficulty = _difficulty_progress(db)
    total_answers = sum(t.total_answers for t in by_topic)
    total_correct = sum(t.correct_answers for t in by_topic)
    weakest = sorted([t for t in by_topic if t.total_answers > 0], key=lambda t: t.accuracy)[:3]

    return ProgressSummary(
        total_quiz_sessions=db.query(QuizSession).count(),
        total_answers=total_answers,
        overall_accuracy=(total_correct / total_answers) if total_answers else 0.0,
        current_streak_days=_current_streak_days(db),
        by_topic=by_topic,
        by_difficulty=by_difficulty,
        weakest_topics=weakest,
    )
