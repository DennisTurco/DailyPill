import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.question import Question, QuestionType
from app.models.quiz import QuizSession, UserAnswer
from app.schemas.question import QuestionRead
from app.schemas.quiz import (
    QuizChatRequest,
    QuizChatResponse,
    QuizFinishResponse,
    QuizSessionRead,
    QuizStartRequest,
    QuizStartResponse,
    QuizSubmitRequest,
)
from app.services.ollama_service import OllamaUnavailableError, ollama_service

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _normalize(text: str) -> str:
    return " ".join(text.strip().lower().split())


def _grade_objective(question: Question, given_answer: str) -> bool:
    if question.type == QuestionType.MULTIPLE_CHOICE:
        return _normalize(given_answer) == _normalize(question.correct_answer)
    return _normalize(given_answer) == _normalize(question.correct_answer)


def _shuffle_options(question: QuestionRead) -> QuestionRead:
    if question.options and len(question.options) > 1:
        shuffled = question.options.copy()
        random.shuffle(shuffled)
        return question.model_copy(update={"options": shuffled})
    return question


def _build_results(answers: list[UserAnswer]) -> list[dict]:
    return [
        {
            "text": a.question.text if a.question else "",
            "given_answer": a.given_answer,
            "correct_answer": a.question.correct_answer if a.question else "",
            "is_correct": a.is_correct,
        }
        for a in answers
    ]


@router.post("/start", response_model=QuizStartResponse)
def start_quiz(payload: QuizStartRequest, db: Session = Depends(get_db)):
    ai_available = ollama_service.is_available()

    candidates = (
        db.query(Question)
        .filter(Question.topic_id == payload.topic_id, Question.is_deleted.is_(False))
        .all()
    )
    if not ai_available:
        candidates = [c for c in candidates if c.type != QuestionType.OPEN_ANSWER]
    if not candidates:
        raise HTTPException(status_code=404, detail="No questions available for this topic")

    random.shuffle(candidates)
    selected = candidates[: payload.question_count]

    session = QuizSession(topic_id=payload.topic_id)
    db.add(session)
    db.commit()
    db.refresh(session)

    questions = [_shuffle_options(QuestionRead.model_validate(q)) for q in selected]
    return QuizStartResponse(
        session_id=session.id, topic_id=payload.topic_id, questions=questions, ai_available=ai_available
    )


@router.post("/{session_id}/submit", response_model=QuizSessionRead)
def submit_answers(session_id: int, payload: QuizSubmitRequest, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    for answer in payload.answers:
        question = db.query(Question).filter(Question.id == answer.question_id).first()
        if not question:
            continue

        is_open = question.type in (QuestionType.OPEN_ANSWER,)
        is_correct = None if is_open else _grade_objective(question, answer.given_answer)
        score = 1.0 if is_correct else 0.0

        db.add(
            UserAnswer(
                quiz_session_id=session_id,
                question_id=question.id,
                given_answer=answer.given_answer,
                is_correct=is_correct,
                score_awarded=score,
            )
        )

    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/finish", response_model=QuizFinishResponse)
def finish_quiz(session_id: int, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    answers = db.query(UserAnswer).filter(UserAnswer.quiz_session_id == session_id).all()
    topic_name = session.topic.name if session.topic else "Unknown"

    for answer in answers:
        question = answer.question
        if question and question.type == QuestionType.OPEN_ANSWER and answer.is_correct is None:
            if not answer.given_answer.strip():
                answer.is_correct = False
                answer.score_awarded = 0.0
                answer.ai_feedback = "No answer given."
                continue
            try:
                review = ollama_service.review_open_answer(
                    question.text, question.correct_answer, answer.given_answer
                )
                answer.is_correct = bool(review.get("is_correct"))
                answer.score_awarded = 1.0 if answer.is_correct else 0.0
                answer.ai_feedback = review.get("feedback")
            except OllamaUnavailableError:
                answer.ai_feedback = "AI review unavailable (Ollama unreachable); please self-grade."

    db.commit()

    results = _build_results(answers)
    try:
        recap = ollama_service.generate_quiz_recap(topic_name, results)
    except OllamaUnavailableError:
        recap = "AI recap unavailable: could not reach Ollama."

    session.completed_at = datetime.utcnow()
    session.ai_review_summary = recap
    db.commit()
    db.refresh(session)

    graded = [a for a in answers if a.is_correct is not None]
    total_score = sum(a.score_awarded for a in graded)
    return QuizFinishResponse(session=session, total_score=total_score, max_score=float(len(graded)))


@router.post("/{session_id}/chat", response_model=QuizChatResponse)
def chat_about_quiz(session_id: int, payload: QuizChatRequest, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    answers = db.query(UserAnswer).filter(UserAnswer.quiz_session_id == session_id).all()
    topic_name = session.topic.name if session.topic else "Unknown"
    results = _build_results(answers)

    try:
        reply = ollama_service.chat_about_quiz(
            topic_name, results, [h.model_dump() for h in payload.history], payload.message
        )
    except OllamaUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return QuizChatResponse(reply=reply)


@router.get("/history", response_model=list[QuizSessionRead])
def quiz_history(topic_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(QuizSession)
    if topic_id is not None:
        query = query.filter(QuizSession.topic_id == topic_id)
    return query.order_by(QuizSession.started_at.desc()).all()


@router.get("/{session_id}", response_model=QuizSessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    return session
