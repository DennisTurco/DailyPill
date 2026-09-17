# DailyPill — Technical Documentation

High-level overview of the project's architecture, local development setup, and the full
release/installer checklist. See [README.md](README.md) for the short version (features,
quick start).

## What it is

DailyPill is a daily-quiz habit-building app, distributed as a **Windows desktop app** (Electron):
it schedules short quizzes on user-defined topics, runs in the background via a tray icon, and
uses a **locally-running AI (Ollama)** to generate questions, review open answers, and give
feedback — no data ever leaves the machine, no server-side backend to operate.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Desktop shell | Electron |
| Backend | ASP.NET Core Web API (.NET, C#) |
| ORM | Entity Framework Core (code-first, migrations) |
| Database | SQLite (local file, no server — see `DailyPill.Api/data/dailypill.db`) |
| Local AI | Ollama (HTTP, `localhost:11434` by default) |
| Installer | Inno Setup |

Unlike GestioPro (its sibling project, used as the structural template for this backend), there's
no auth, no remote database, no email — everything runs on the end user's own machine.

## Repository structure

```
DailyPill/
├─ DailyPill.Api/              ASP.NET Core Web API — Controllers, Program.cs, appsettings
├─ DailyPill.Common/           DTOs, Models (EF entities), Enums, Interfaces, Helpers
├─ DailyPill.Infrastructure/   AppDbContext, Migrations, Service implementations
├─ DailyPill.InfrastructureTests/  xUnit tests for the Services (in-memory DB)
├─ topics/*.yaml               Seed data (topics + questions/facts), loaded at startup
├─ frontend/
│  ├─ src/pages/                One React page per section (Dashboard, Quiz, Topics, ...)
│  ├─ src/lib/api.ts             HTTP client towards the backend (fetch)
│  └─ electron/main.ts           Electron main process (window, tray, backend startup, schedules)
├─ installer/DailyPill.iss     Inno Setup script that generates the setup.exe
├─ publish_backend.ps1         Step 1 of the release checklist (see below)
└─ build_electron.ps1          Step 2 of the release checklist (see below)
```

## Prerequisites

| Tool | Version used in dev | Check with |
|---|---|---|
| [Node.js](https://nodejs.org/) | 24.x (18+ should work) | `node --version` |
| [.NET SDK](https://dotnet.microsoft.com/) | 10.x | `dotnet --version` |
| [Ollama](https://ollama.com/) | any recent build | `ollama --version` |

Ollama is **optional but strongly recommended** — without it, AI features (question
generation, open-answer/code grading, quiz recap, quiz chat, info-fact generation) degrade
gracefully (503 / placeholder text) instead of crashing, but you'll want it running for the
app to actually feel like DailyPill. If Ollama is installed but not running, the backend tries
to launch it automatically (`ollama serve`) at startup, and downloads the configured model
automatically if it isn't already pulled.

### Pull an Ollama model — this is the step people miss

```bash
ollama pull llama3.1:8b
ollama list   # confirm the exact tag that got pulled
```

`OLLAMA_MODEL` in `.env` (see below) **must match one of the tags `ollama list` prints,
exactly, including the `:8b`/`:3b`/etc. suffix**. Requesting `llama3.1` when only
`llama3.1:8b` is installed fails with a **404** from Ollama's `/api/generate` — a confusing
error that looks like "Ollama isn't running" but actually means "Ollama is running, it just
doesn't have that exact tag." If you pull a different model, update `OLLAMA_MODEL` to match.

## Local development

### First-time setup

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

On first backend startup, `topics/*.yaml` is imported automatically (idempotent — matched
by topic name / question text, safe to restart repeatedly) via
`DailyPill.Infrastructure/Services/SeedLoaderService.cs`. No manual seeding step needed.

### Database migrations (EF Core)

The schema lives in `DailyPill.Infrastructure/Migrations/`. **You don't need to run
anything manually to apply them** — `Program.cs` calls `Database.Migrate()` on every
backend startup, which brings a fresh or older database up to the latest schema
automatically (including creating `DailyPill.Api/data/dailypill.db` from scratch on
first run).

You only need the EF Core CLI tooling when **changing the schema** (adding/editing an
entity in `DailyPill.Common/Models/`, or a mapping in
`DailyPill.Infrastructure/Data/AppDbContext.cs`):

```powershell
# one-time: install the EF Core CLI tool (skip if you already have it)
dotnet tool install --global dotnet-ef

# after changing a model or AppDbContext.OnModelCreating:
dotnet ef migrations add <DescriptiveName> --project DailyPill.Infrastructure --startup-project DailyPill.Api -o Migrations
```

Both `--project` (where the `DbContext` and migrations live) and `--startup-project`
(the runnable app EF uses to read configuration, e.g. the connection string) are
required — always run these commands from the repo root, not from inside a
project folder.

Other commands you'll occasionally need:

```powershell
# apply pending migrations immediately without starting the app (handy for scripts/CI)
dotnet ef database update --project DailyPill.Infrastructure --startup-project DailyPill.Api

# undo the most recently added (not-yet-shared) migration, e.g. after fixing a typo
dotnet ef migrations remove --project DailyPill.Infrastructure --startup-project DailyPill.Api

# list every migration and which ones are already applied to the local database
dotnet ef migrations list --project DailyPill.Infrastructure --startup-project DailyPill.Api
```

A few conventions worth keeping:
- Never hand-edit a migration file that's already been committed/shared — add a new
  migration instead, the same way you would with any other database migration tool.
- `migrations remove` only works on the latest, not-yet-applied-elsewhere migration;
  if you already applied it (`dotnet ef database update`) and need to revert, migrate
  back to the previous one first (`dotnet ef database update <PreviousMigrationName>`),
  then remove it.
- If you want a completely fresh local database (e.g. to test seeding from scratch),
  just delete `DailyPill.Api/data/dailypill.db*` — `Database.Migrate()` recreates it
  from the full migration history on the next backend start, and the YAML seed loader
  repopulates it.

### Run in dev

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

**Option C — VS Code, with backend debugging:** open the Run and Debug panel (`Ctrl+Shift+D`),
pick **"Run DailyPill (backend + desktop)"** from the dropdown, and press `F5`. This
launches the backend under the C# debugger (breakpoints, step-through, etc. — requires
the `ms-dotnettools.csharp` extension, recommended automatically via `.vscode/extensions.json`)
alongside the frontend, both defined in `.vscode/launch.json`.

The Electron window starts **hidden** in the system tray (this is intentional — the
app is meant to run quietly in the background). Click the tray icon, or use its
right-click menu ("Open dashboard" / "Start quiz now"), to bring up the window.

### Verify your setup

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
  integration, GPU detection, import/export, and the YAML seed loader).
- `DailyPill.InfrastructureTests/` — xUnit tests against an EF Core InMemory
  database, mirroring the original test coverage (soft-delete filtering, weighted
  random question pull, full quiz lifecycle without a real Ollama, progress
  aggregation, daily info-fact idempotency).
- `frontend/` — Electron + React + TypeScript (Vite). The Electron main process owns
  the system tray icon, the per-topic quiz-schedule checker and the once-a-day
  info-fact checker (both poll the backend every minute), a **snooze** that pauses
  both for 30 minutes, a small confirmation popup window for a scheduled quiz and a
  dedicated one for the daily info fact (both independent of the main window — neither
  forces the full app open), auto-launch at OS login, and (in production builds)
  spawning the published backend executable as a child process. The renderer is a
  plain React SPA talking to the backend over `fetch`, with markdown + syntax-highlighted
  code rendering (via `react-markdown` / `rehype-highlight`) in the AI quiz chat and
  answer explanations.
- `topics/*.yaml` — seed data for both quiz questions and info facts, and the same
  format used by the Import/Export-to-YAML feature in Settings. A topic can be
  `is_informational: true` (its `manual_facts:` list feeds the daily popup instead of
  a quiz) or a normal quiz topic (`manual_questions:`). See any existing file for the
  exact shape — every question/fact needs an `explanation:`/description, and
  code-writing `open_answer` questions use a YAML block scalar with a fenced code
  block as the reference answer.

**Soft delete**: nothing is ever hard-deleted from normal app flows (`Topic`, `Question`,
`InfoFact` all carry `IsDeleted`/`DeletedAt`). Deleting a topic cascades to soft-deleting its
questions, facts, and context documents (`TopicService.DeleteAsync`).

**Local AI (`OllamaService`)**: talks to Ollama over HTTP (`/api/generate`, `/api/tags`,
`/api/pull`). `Bootstrap()` runs fire-and-forget at startup: tries to launch `ollama serve` if
it isn't already running, polls until reachable, then ensures the configured model is pulled
(with pull progress surfaced to the UI via `/ai/status` and the app's status bar). GPU
acceleration (`GpuService`, via `nvidia-smi`) is auto-detected once at startup and, when
available, passed to Ollama as `num_gpu`.

**Seeding**: `SeedLoaderService` loads every `topics/*.yaml` file at startup (idempotent — skips
topics/questions/facts that already exist by name/text) and is also the shared entry point used
by the manual **Import from YAML** feature (`ImportExportService`, Settings page) — the seeding
path additionally swallows "already exists" as a normal skip rather than surfacing it as an error,
since re-running the app must never fail just because the seed data is already there.

**Autostart**: uses the `auto-launch` npm package (not Electron's own
`app.setLoginItemSettings`) to register a Windows startup entry — `HKCU\Software\Microsoft\
Windows\CurrentVersion\Run`, value name **`DailyPill`** (the raw app name passed to
`AutoLaunch`, unlike GestioPro's Electron-native registration which uses the
`electron.app.<name>` naming convention — this matters for the installer's uninstall cleanup,
see `installer/DailyPill.iss`).

## Data model

See `DailyPill.Common/Models/` — `Topic` (+ `is_informational` flag) + `TopicSchedule`
(day-of-week/time rows), `Question` (typed, difficulty 1-5, soft-deletable),
`InfoFact` (title/description/optional link, soft-deletable, `last_shown_at` used to
pick one fact per calendar day idempotently), `QuizSession` + `UserAnswer` (every
answer recorded, objective types graded immediately, open-answer types graded by
Ollama at quiz-finish time). Nothing is ever hard-deleted from normal app flows —
soft-deletable models use `is_deleted` / `deleted_at`.

## Release checklist

Full path from "I changed some backend/frontend code" to "here's the new installer.exe", in
order. Every command below is meant to be run from the repo root in PowerShell, unless stated
otherwise.

### 0. Applying new EF Core migrations (only if you changed any `DailyPill.Common/Models/*.cs`)

See **Database migrations (EF Core)** above for the full migration workflow. Since
DailyPill's database is a local SQLite file created fresh on each install (no shared production
database to migrate), there's no separate "apply to production" step like GestioPro's Supabase
one — migrations just need to be committed; `Database.Migrate()` in `Program.cs` applies them
automatically the next time the packaged app starts.

### 1. Bump the version

Edit `installer/DailyPill.iss`, near the top:
```
#define AppVersion   "1.0.0"
```
This single value drives the installer's `AppVersion`, window title, output filename
(`DailyPill_Setup_<version>.exe`), and uninstall entry — nothing else in the repo needs to change
for a version bump (`frontend/package.json`'s `"version"` is unrelated npm package metadata, not
the app's release version).

### 2. Publish the backend

```
./publish_backend.ps1
```
Runs `npm run build:backend` inside `frontend/`, i.e.:
```
dotnet publish DailyPill.Api -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o backend-dist/win-x64
```
`--self-contained true` bundles the matching .NET runtime into the published output, so the
installed app needs **nothing preinstalled** on the end user's PC (the equivalent GestioPro
gotcha applies here too: Electron spawns the backend with `stdio: 'ignore'`, so a missing runtime
would silently fail with no visible error). Don't switch this back to `false`. The script warns
(and asks for confirmation) if the repo-root `.env` is missing, since that file is bundled
straight into the package — copy `.env.example` first if you haven't already.

### 3. Build the Electron app

```
./build_electron.ps1
```
i.e. `cd frontend && npm run build:electron` → Vite build + electron-builder in `dir` mode
(`win.target: "dir"` in `frontend/package.json`), producing `frontend/release/win-unpacked/`
(the full Electron app, backend + `topics/*.yaml` + `.env` included under `resources/`). The
script warns (and asks for confirmation) if `backend-dist/win-x64/DailyPill.Api.exe` doesn't
exist yet, i.e. if you skipped step 2.

**Known gotcha (hit and fixed during initial setup)**: the very first `electron-builder` run on a
machine downloads `winCodeSign` (macOS code-signing tools, needed even for an unsigned Windows
`dir` build) and fails extracting it —
```
ERROR: Cannot create symbolic link : Il privilegio richiesto non appartiene al client.
```
— because creating symlinks on Windows needs either an elevated (Administrator) process or
**Developer Mode** enabled. Turn on Developer Mode once (Settings → Privacy & security → For
developers → Developer Mode) and every future build on that machine works without this.

**Known gotcha**: if a debugger (Visual Studio / VS Code) is currently attached to a running
`DailyPill.Api`, `dotnet publish`/`dotnet build` fails with `MSB3027`/`MSB3021` ("file is locked
by ... .NET Core Debugger ...") because it can't overwrite the locked DLLs. Stop the debug
session first.

### 4. Compile the installer

```
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\DailyPill.iss
```
(or open [installer/DailyPill.iss](installer/DailyPill.iss) in the Inno Setup Compiler GUI and
press Ctrl+F9). Output: `installer/Output/DailyPill_Setup_<version>.exe`.

### 5. Test the installer

Before distributing it: install on a clean-ish machine (or reinstall locally), check the app
starts, the tray icon is present, a quiz can be started and a scheduled reminder pops up the
confirmation window correctly, and autostart is registered
(`HKCU\Software\Microsoft\Windows\CurrentVersion\Run\DailyPill`, pointing at the install dir).
Then uninstall and confirm that registry value is gone too, and that both `DailyPill.exe` and
`DailyPill.Api.exe` are no longer running (the installer's `[UninstallRun]` force-kills both).

## Troubleshooting

- **AI features return "Model 'X' is not available"** — see **Pull an Ollama model** above;
  the model tag in `.env` doesn't match what `ollama list` actually shows.
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
