import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import ai, info_facts, progress, questions, quiz, schedules, topics
from app.services.gpu_service import detect_nvidia_gpu
from app.services.ollama_service import ollama_service
from app.services.seed_loader import load_seed_yaml_files

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        load_seed_yaml_files(db)
    finally:
        db.close()
    gpu_available = detect_nvidia_gpu()
    logger.info("NVIDIA GPU detected: %s", gpu_available)
    ollama_service.bootstrap()
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topics.router)
app.include_router(questions.router)
app.include_router(quiz.router)
app.include_router(progress.router)
app.include_router(ai.router)
app.include_router(schedules.router)
app.include_router(info_facts.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
