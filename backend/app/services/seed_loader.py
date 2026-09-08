from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from app.config import settings
from app.models.info_fact import InfoFact
from app.models.question import Question, QuestionType
from app.models.topic import Topic

DIFFICULTY_MAP = {"easy": 2, "medium": 3, "hard": 5}


def load_seed_yaml_files(db: Session, seed_dir: Path | None = None) -> int:
    seed_dir = seed_dir or settings.TOPICS_SEED_DIR
    if not seed_dir.exists():
        return 0

    created = 0
    for yaml_path in sorted(seed_dir.glob("*.yaml")):
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not data or not data.get("name"):
            continue

        topic = db.query(Topic).filter(Topic.name == data["name"], Topic.is_deleted.is_(False)).first()
        if not topic:
            topic = Topic(
                name=data["name"],
                category=data.get("category"),
                description=data.get("content"),
                is_informational=bool(data.get("is_informational", False)),
            )
            db.add(topic)
            db.flush()
            created += 1

        for q in data.get("manual_questions") or []:
            existing = (
                db.query(Question)
                .filter(Question.topic_id == topic.id, Question.text == q["text"])
                .first()
            )
            if existing:
                continue
            default_difficulty = DIFFICULTY_MAP.get(str(data.get("difficulty", "medium")).lower(), 3)
            difficulty = int(q["difficulty"]) if q.get("difficulty") is not None else default_difficulty
            options = q.get("options")
            answer_index = q.get("answer")
            correct_answer = str(options[answer_index]) if options is not None and answer_index is not None else str(q.get("answer", ""))
            db.add(
                Question(
                    topic_id=topic.id,
                    type=QuestionType(q.get("type", "multiple_choice")),
                    text=q["text"],
                    options=options,
                    correct_answer=correct_answer,
                    difficulty=difficulty,
                    explanation=q.get("explanation"),
                )
            )

        for f in data.get("manual_facts") or []:
            existing_fact = (
                db.query(InfoFact)
                .filter(InfoFact.topic_id == topic.id, InfoFact.title == f["title"])
                .first()
            )
            if existing_fact:
                continue
            db.add(
                InfoFact(
                    topic_id=topic.id,
                    title=f["title"],
                    description=f["description"],
                    link=f.get("link"),
                )
            )

    db.commit()
    return created
