# DailyPill Backend

FastAPI + SQLAlchemy 2.x + Alembic + SQLite (default) / Postgres (optional).

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

On startup the app creates tables (if missing) and imports `../topics/*.yaml` as seed
topics/questions (idempotent — matched by topic name + question text).

## Tests

```powershell
.venv\Scripts\python -m pytest -q
```

## Postgres profile

Set `USE_POSTGRES=true` in `.env` (root of the repo) plus the existing `POSTGRES_*`
vars, or set `DATABASE_URL` directly for any other SQLAlchemy-compatible URL.

## Ollama

Configure `OLLAMA_BASE_URL` / `OLLAMA_MODEL` in `.env`. All AI calls are isolated in
`app/services/ollama_service.py`; if Ollama is unreachable the API returns a 503 (for
`/ai/generate-questions`) or degrades gracefully with a placeholder message (for the
end-of-quiz recap) instead of crashing.
