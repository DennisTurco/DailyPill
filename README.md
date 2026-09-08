# DailyPill

DailyPill is a desktop app that keeps your knowledge fresh with short daily quizzes.
It runs in the background (Electron + system tray), pops open at times you schedule
per topic, and uses a local Ollama model to review free-text answers and write a
friendly end-of-quiz recap.

## Architecture

- `backend/` — Python + FastAPI + SQLAlchemy 2.x + Alembic. Owns all data (topics,
  questions, quiz sessions, answers) and the Ollama integration. Runs as its own
  process, exposing a plain HTTP API on `http://localhost:8420`.
- `frontend/` — Electron + React + TypeScript (Vite). The Electron main process owns
  the system tray icon, the per-topic schedule checker (polls `/schedules` every
  minute and pops the window when a slot fires), auto-launch at OS login, and (in
  production builds) spawning the Python backend as a child process. The renderer is
  a plain React SPA talking to the backend over `fetch`.
- `topics/*.yaml` — seed data. Imported into the database on first backend startup
  (idempotent, matched by topic name / question text) via
  `backend/app/services/seed_loader.py`. Difficulty strings (`easy`/`medium`/`hard`)
  map to the 1-5 integer `difficulty` column (2/3/5); `content` becomes the topic
  `description`; each `manual_questions` entry becomes a `multiple_choice` question
  with `correct_answer` resolved from the `answer` index into `options`.

## Data model

See `backend/app/models/` — `Topic` + `TopicSchedule` (day-of-week/time rows),
`Question` (typed, difficulty 1-5, soft-deletable), `QuizSession` + `UserAnswer`
(every answer recorded, objective types graded immediately, open-answer types graded
by Ollama at quiz-finish time). Nothing is ever hard-deleted from normal app flows —
topics and questions use `is_deleted` / `deleted_at`.

## Run in dev

**Backend** (terminal 1):

```powershell
cd backend
py -3 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m uvicorn app.main:app --port 8420 --reload
```

**Frontend + Electron** (terminal 2):

```powershell
cd frontend
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and, once it's up, compiles and launches the
Electron main process pointed at `http://localhost:5173`.

## Build

```powershell
cd frontend
npm run build           # renderer + electron main/preload compiled to dist/ and dist-electron/
npm run build:electron  # also packages via electron-builder (needs the backend bundled into resources/backend for a real installer — not wired up in this scaffold)
```

## Ollama

Set `OLLAMA_BASE_URL` / `OLLAMA_MODEL` in `.env`. If Ollama isn't running, AI-generate
requests return a clear 503 and the end-of-quiz recap falls back to a placeholder
message instead of crashing the app.

## Known gaps / TODOs

- Ollama integration is implemented behind `backend/app/services/ollama_service.py`
  but untested against a real local Ollama server in this environment.
- Auto-launch-at-login (`frontend/electron/main.ts`, via the `auto-launch` package)
  is wired up but not verified against a real Windows login session; per-OS
  packaging may need extra care (see `electron-builder` docs) to fully register it.
- `electron-builder` config is minimal — building a real installer needs the
  Python backend (and a portable Python or PyInstaller-built exe) bundled into
  `resources/backend` so `electron/main.ts`'s `spawnBackend()` can find it in
  production; in dev the backend is just run separately via `uvicorn`.
- System tray icon uses an empty placeholder image (`nativeImage.createEmpty()`);
  swap in a real `.ico`/`.png` asset before shipping.
