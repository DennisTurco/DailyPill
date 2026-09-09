# DailyPill

DailyPill is a desktop app that keeps your knowledge fresh with short daily quizzes
and once-a-day "info facts" popups. It runs in the background (Electron + system
tray), pops open a quiz at times you schedule per topic, and uses a **local Ollama
model** to review free-text/code answers, write an end-of-quiz recap, let you chat
about the quiz afterward, and generate new questions/facts on demand.

The dataset ships with 5 quiz topics (~434 questions total: Advanced C#, TypeScript,
SQL, Python, Algorithms & data structures) plus a SOLID Principles topic used as
informational-only "info facts".

## Prerequisites

Install these **before** touching the project:

| Tool | Version used in dev | Check with |
|---|---|---|
| [Node.js](https://nodejs.org/) | 24.x (18+ should work) | `node --version` |
| [.NET SDK](https://dotnet.microsoft.com/) | 10.x | `dotnet --version` |
| [Ollama](https://ollama.com/) | any recent build | `ollama --version` |

Ollama is **optional but strongly recommended** — without it, AI features (question
generation, open-answer/code grading, quiz recap, quiz chat, info-fact generation)
degrade gracefully (503 / placeholder text) instead of crashing, but you'll want it
running for the app to actually feel like DailyPill. If Ollama is installed but not
running, the backend tries to launch it automatically (`ollama serve`) at startup,
and downloads the configured model automatically if it isn't already pulled.

### Pull an Ollama model — this is the step people miss

```bash
ollama pull llama3.1:8b
ollama list   # confirm the exact tag that got pulled
```

`OLLAMA_MODEL` in `.env` (see below) **must match one of the tags `ollama list`
prints, exactly, including the `:8b`/`:3b`/etc. suffix**. Requesting `llama3.1`
when only `llama3.1:8b` is installed fails with a **404** from Ollama's
`/api/generate` — a confusing error that looks like "Ollama isn't running" but
actually means "Ollama is running, it just doesn't have that exact tag." If you
pull a different model, update `OLLAMA_MODEL` to match.

## First-time setup

Clone the repo, then from the repo root:

```powershell
# 1. Backend: restore NuGet packages
dotnet restore

# 2. Frontend: npm dependencies (also downloads the Electron binary — first run is slow)
cd frontend
npm install
cd ..
```

Create `.env` in the repo root copying data from `.env.example` file and adjust if needed:

- `OLLAMA_BASE_URL` / `OLLAMA_MODEL` — see the Ollama section above.
- `API_PORT` — defaults to `8420`; both the backend and the Electron renderer read
  this, so change it in one place if you need a different port.

The database is a local SQLite file at `DailyPill.Api/data/dailypill.db`, created
automatically on first backend start (EF Core migrations run at startup via
`Database.Migrate()`).

On first backend startup, `topics/*.yaml` is imported automatically (idempotent —
matched by topic name / question text, safe to restart repeatedly) via
`DailyPill.Infrastructure/Services/SeedLoaderService.cs`. No manual seeding step needed.

## Run in dev

**Option A — two terminals:**

```powershell
# terminal 1
dotnet run --project DailyPill.Api

# terminal 2
cd frontend
npm run dev
```

`npm run dev` starts the Vite dev server and, once it's up, compiles and launches
the Electron main process pointed at `http://localhost:5173`.

**Option B — VS Code, one shortcut:** open the repo in VS Code and press
**Ctrl+Shift+B** (or run the "Run DailyPill (backend + frontend)" task). This runs
both of the above in dedicated terminal panels via `.vscode/tasks.json` — requires
`npm install` to already exist (steps above), it doesn't create it for you.

The Electron window starts **hidden** in the system tray (this is intentional — the
app is meant to run quietly in the background). Click the tray icon, or use its
right-click menu ("Open dashboard" / "Start quiz now"), to bring up the window.

## Verify your setup

```powershell
dotnet test                             # should print "7 passed" (or similar)

cd frontend
npm run typecheck                       # should exit clean
npm run build                           # should exit clean, producing dist/ + dist-electron/
```

## Architecture

- `DailyPill.Api/` — ASP.NET Core Web API host (controllers + `Program.cs`). Exposes
  a plain HTTP API on `http://localhost:8420` with the exact same routes/JSON shape
  the frontend already expects.
- `DailyPill.Common/` — framework-agnostic POCOs: EF Core entity models, DTOs
  (as `record`s), enums, service interfaces, and shared exceptions. No EF Core or
  ASP.NET Core dependency, mirroring the `GestioPro.Common` split.
- `DailyPill.Infrastructure/` — EF Core `AppDbContext` + migrations + all service
  implementations (topics/questions/quiz/progress/info-facts/schedules, the Ollama
  integration, GPU detection, and the YAML seed loader).
- `DailyPill.InfrastructureTests/` — xUnit tests against an EF Core InMemory
  database, mirroring the original test coverage (soft-delete filtering, weighted
  random question pull, full quiz lifecycle without a real Ollama, progress
  aggregation, daily info-fact idempotency).
- `frontend/` — Electron + React + TypeScript (Vite). The Electron main process owns
  the system tray icon, the per-topic quiz-schedule checker and the once-a-day
  info-fact checker (both poll the backend every minute), a **snooze** that pauses
  both for 30 minutes, a dedicated small popup window for the daily info fact
  (independent of the main window — it doesn't force the full app open), auto-launch
  at OS login, and (in production builds) spawning the published backend executable
  as a child process. The renderer is a plain React SPA talking to the backend over
  `fetch`, with markdown + syntax-highlighted code rendering (via `react-markdown` /
  `rehype-highlight`) in the AI quiz chat and answer explanations.
- `topics/*.yaml` — seed data for both quiz questions and info facts. A topic can be
  `is_informational: true` (its `manual_facts:` list feeds the daily popup instead of
  a quiz) or a normal quiz topic (`manual_questions:`). See any existing file for the
  exact shape — every question/fact needs an `explanation:`/description, and
  code-writing `open_answer` questions use a YAML block scalar with a fenced code
  block as the reference answer.

## Data model

See `DailyPill.Common/Models/` — `Topic` (+ `is_informational` flag) + `TopicSchedule`
(day-of-week/time rows), `Question` (typed, difficulty 1-5, soft-deletable),
`InfoFact` (title/description/optional link, soft-deletable, `last_shown_at` used to
pick one fact per calendar day idempotently), `QuizSession` + `UserAnswer` (every
answer recorded, objective types graded immediately, open-answer types graded by
Ollama at quiz-finish time). Nothing is ever hard-deleted from normal app flows —
soft-deletable models use `is_deleted` / `deleted_at`.

## Build

```powershell
cd frontend
npm run build           # renderer + electron main/preload compiled to dist/ and dist-electron/
npm run build:backend   # publishes DailyPill.Api as a self-contained single-file exe into backend-dist/win-x64
npm run build:electron  # runs both of the above, then packages via electron-builder
                         # (bundles the published backend + topics/*.yaml + .env into the app's resources)
```

## Troubleshooting

- **AI features return "Model 'X' is not available"** — see the Ollama section
  above; the model tag in `.env` doesn't match what `ollama list` actually shows.
- **`EBUSY: resource busy or locked` from Vite, or a stale-looking blank/crashed
  window** — a leftover `node`/`electron` process from a previous `npm run dev` is
  holding a lock on `frontend/node_modules/.vite`. Stop all running `npm run dev`
  terminals, then if it persists: `rm -rf frontend/node_modules/.vite` and restart.
- **Backend won't start / "address already in use"** — another backend instance (or
  a leftover process from a previous run) is already bound to port 8420; check for
  a stray `DailyPill.Api`/`dotnet` process before starting a new one.
- **`DailyPill.Api/data/dailypill.db` won't delete** — some process still has it open
  (another backend instance, or occasionally a third-party tool like a SQLite viewer
  extension); close it before deleting. You don't need to delete it for normal use —
  seeding is idempotent and safe to run against an existing database.

## Known gaps / TODOs

- Auto-launch-at-login (`frontend/electron/main.ts`, via the `auto-launch` package)
  is wired up but not verified against a real Windows login session; per-OS
  packaging may need extra care (see `electron-builder` docs) to fully register it.
- `npm run build:backend` targets `win-x64` only; add other RIDs to the script if
  you need to package for macOS/Linux.
