from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.topic import Topic
from app.schemas.info_fact import AIGeneratedInfoFact, AIGenerateInfoFactsRequest, AIGenerateInfoFactsResponse
from app.schemas.question import AIGeneratedQuestion, AIGenerateRequest, AIGenerateResponse
from app.services.ollama_service import OllamaUnavailableError, ollama_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
def ai_status():
    return {"available": ollama_service.is_available(), "model": ollama_service.model, "base_url": ollama_service.base_url}


@router.post("/generate-questions", response_model=AIGenerateResponse)
def generate_questions(payload: AIGenerateRequest, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == payload.topic_id, Topic.is_deleted.is_(False)).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    try:
        raw_questions = ollama_service.generate_questions(
            topic.name, payload.prompt, payload.count, payload.difficulty
        )
    except OllamaUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    questions: list[AIGeneratedQuestion] = []
    for q in raw_questions:
        try:
            questions.append(AIGeneratedQuestion(**q))
        except Exception:
            continue

    return AIGenerateResponse(questions=questions)


@router.post("/generate-info-facts", response_model=AIGenerateInfoFactsResponse)
def generate_info_facts(payload: AIGenerateInfoFactsRequest, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == payload.topic_id, Topic.is_deleted.is_(False)).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    try:
        raw_facts = ollama_service.generate_info_facts(topic.name, payload.prompt, payload.count)
    except OllamaUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    facts: list[AIGeneratedInfoFact] = []
    for f in raw_facts:
        try:
            facts.append(AIGeneratedInfoFact(**f))
        except Exception:
            continue

    return AIGenerateInfoFactsResponse(facts=facts)
