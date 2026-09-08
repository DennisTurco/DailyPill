# DailyPill Backend

FastAPI + SQLAlchemy 2.x + Alembic + SQLite (default) / Postgres (optional).

See the [repo root README](../README.md) for the full setup guide (prerequisites,
Ollama model setup, running the whole app, troubleshooting). This file covers the
backend specifically.

## Setup

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m alembic upgrade head
```

## Run (dev)

```powershell
.venv\Scripts\python -m uvicorn app.main:app --port 8420 --reload
```

On startup the app creates tables (if missing, via `Base.metadata.create_all` as a
safety net on top of the Alembic migration) and imports `../topics/*.yaml` as seed
topics/questions/info-facts (idempotent — matched by topic name + question/fact
text, safe to restart repeatedly).

## Tests

```powershell
.venv\Scripts\python -m pytest -q
```

## Migrations

After changing a model in `app/models/`, generate a new revision and apply it:

```powershell
.venv\Scripts\python -m alembic revision --autogenerate -m "describe the change"
.venv\Scripts\python -m alembic upgrade head
```

## Postgres profile

Set `USE_POSTGRES=true` in `.env` (root of the repo) plus the existing `POSTGRES_*`
vars, or set `DATABASE_URL` directly for any other SQLAlchemy-compatible URL.

## Ollama

Configure `OLLAMA_BASE_URL` / `OLLAMA_MODEL` in `.env` — **`OLLAMA_MODEL` must match
a tag `ollama list` actually shows** (e.g. `llama3.1:8b`, not just `llama3.1`), or
requests fail with a 404 that gets surfaced as "model not available." All AI calls
are isolated in `app/services/ollama_service.py` (question/info-fact generation,
open-answer/code grading, end-of-quiz recap, quiz chat); if Ollama is unreachable or
missing the model, the API returns a clear 503 (for `/ai/generate-questions`,
`/ai/generate-info-facts`, `/quiz/{id}/chat`) or degrades gracefully with a
placeholder message (for the end-of-quiz recap and open-answer grading) instead of
crashing.

## Seed data format (`../topics/*.yaml`)

Each file is one topic. Frontmatter: `name`, `category`, `difficulty`
(`easy`/`medium`/`hard`, used as the *default* per-question difficulty — 2/3/5 — a
question can override it with its own `difficulty: 1-5`), `ai_generate: true`,
`content` (becomes the topic's description), and optionally `is_informational: true`
to make it an info-facts-only topic instead of a quiz topic.

- Quiz topics use `manual_questions:` — each entry needs `type`
  (`multiple_choice`/`completion`/`single_word`/`open_answer`), `difficulty` (1-5),
  `text`, an `answer`, and a required `explanation`. `multiple_choice` needs an
  `options:` list of exactly 4 strings with `answer:` as the 0-based correct index
  (options are shuffled at quiz time, so index position doesn't bias the quiz).
  Code-writing `open_answer` questions use a YAML block scalar (`answer: |`) with a
  fenced code block inside, e.g. ` ```python ... ``` `, so it renders with syntax
  highlighting in the app.
- Informational topics use `manual_facts:` — each entry needs `title`,
  `description`, and an optional `link`.
