import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Runs a code block from a quiz answer with a toolchain already installed on the user's machine.
// Lives in the main process (reached via IPC) rather than behind the HTTP API, so no web page
// that can reach localhost is able to trigger code execution.

export type RunnableLanguage = "python" | "javascript" | "typescript" | "csharp";

export interface CodeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  /** Set when the language cannot be run at all (e.g. the toolchain is missing). */
  error?: string;
}

interface Runner {
  fileName: string;
  timeoutMs: number;
  /** Keep one working directory across runs so build caches (e.g. `dotnet run`) stay warm. */
  reuseDir?: boolean;
  /** Candidate commands, tried in order; the first that answers its version check wins. */
  candidates: { command: string; versionArgs: string[]; runArgs: (file: string) => string[]; env?: NodeJS.ProcessEnv }[];
  missingMessage: string;
}

const MAX_OUTPUT_CHARS = 64_000;

const RUNNERS: Record<RunnableLanguage, Runner> = {
  python: {
    fileName: "main.py",
    timeoutMs: 10_000,
    candidates: ["python", "py", "python3"].map((command) => ({
      command,
      versionArgs: ["--version"],
      runArgs: (file: string) => ["-X", "utf8", "-u", file],
      env: { PYTHONIOENCODING: "utf-8" },
    })),
    missingMessage: "Python was not found on PATH. Install it from python.org to run Python blocks.",
  },
  javascript: {
    fileName: "main.mjs",
    timeoutMs: 10_000,
    // Electron's own binary doubles as Node, so JavaScript always works without extra installs.
    candidates: [
      { command: "node", versionArgs: ["--version"], runArgs: (file) => [file] },
      { command: process.execPath, versionArgs: [], runArgs: (file) => [file], env: { ELECTRON_RUN_AS_NODE: "1" } },
    ],
    missingMessage: "No JavaScript runtime available.",
  },
  typescript: {
    fileName: "main.ts",
    timeoutMs: 10_000,
    candidates: [
      { command: "node", versionArgs: ["--version"], runArgs: (file) => ["--experimental-strip-types", "--no-warnings", file] },
    ],
    missingMessage: "Running TypeScript needs Node.js 22.6+ on PATH (it strips the types natively).",
  },
  csharp: {
    fileName: "Program.cs",
    // The first `dotnet run` of a file-based app restores and builds, which takes a while.
    timeoutMs: 90_000,
    reuseDir: true,
    candidates: [
      {
        command: "dotnet",
        versionArgs: ["--version"],
        runArgs: (file) => ["run", file],
        env: { DOTNET_NOLOGO: "1", DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1" },
      },
    ],
    missingMessage: "Running C# needs the .NET 10 SDK on PATH (`dotnet run file.cs`).",
  },
};

const LANGUAGE_ALIASES: Record<string, RunnableLanguage> = {
  python: "python", py: "python", python3: "python",
  javascript: "javascript", js: "javascript", node: "javascript", mjs: "javascript",
  typescript: "typescript", ts: "typescript",
  csharp: "csharp", cs: "csharp", "c#": "csharp",
};

export function normalizeLanguage(language: string): RunnableLanguage | null {
  return LANGUAGE_ALIASES[language.trim().toLowerCase()] ?? null;
}

const resolvedCommands = new Map<RunnableLanguage, Runner["candidates"][number] | null>();

function resolveCommand(language: RunnableLanguage): Runner["candidates"][number] | null {
  if (resolvedCommands.has(language)) return resolvedCommands.get(language)!;
  let found: Runner["candidates"][number] | null = null;
  for (const candidate of RUNNERS[language].candidates) {
    if (candidate.versionArgs.length === 0) {
      found = candidate;
      break;
    }
    // On Windows a bare `python` may be the Microsoft Store stub, which exits non-zero.
    const probe = spawnSync(candidate.command, candidate.versionArgs, {
      timeout: 5_000,
      windowsHide: true,
      env: { ...process.env, ...candidate.env },
    });
    if (!probe.error && probe.status === 0) {
      found = candidate;
      break;
    }
  }
  resolvedCommands.set(language, found);
  return found;
}

function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
}

export async function runCode(rawLanguage: string, code: string): Promise<CodeRunResult> {
  const language = normalizeLanguage(rawLanguage);
  const empty: CodeRunResult = { stdout: "", stderr: "", exitCode: null, timedOut: false, durationMs: 0 };
  if (!language) return { ...empty, error: `Running "${rawLanguage}" code is not supported.` };

  const runner = RUNNERS[language];
  const command = resolveCommand(language);
  if (!command) return { ...empty, error: runner.missingMessage };

  const workDir = runner.reuseDir
    ? path.join(os.tmpdir(), `dailypill-run-${language}`)
    : fs.mkdtempSync(path.join(os.tmpdir(), "dailypill-run-"));
  fs.mkdirSync(workDir, { recursive: true });
  const file = path.join(workDir, runner.fileName);
  fs.writeFileSync(file, code, "utf8");

  const started = Date.now();
  try {
    return await new Promise<CodeRunResult>((resolve) => {
      const child = spawn(command.command, command.runArgs(file), {
        cwd: workDir,
        env: { ...process.env, ...command.env },
        windowsHide: true,
        detached: process.platform !== "win32",
      });
      child.stdin.end();

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const append = (current: string, chunk: Buffer) =>
        current.length >= MAX_OUTPUT_CHARS ? current : (current + chunk.toString("utf8")).slice(0, MAX_OUTPUT_CHARS);
      child.stdout.on("data", (chunk: Buffer) => (stdout = append(stdout, chunk)));
      child.stderr.on("data", (chunk: Buffer) => (stderr = append(stderr, chunk)));

      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child.pid);
      }, runner.timeoutMs);

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({ ...empty, error: err.message, durationMs: Date.now() - started });
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode, timedOut, durationMs: Date.now() - started });
      });
    });
  } finally {
    if (!runner.reuseDir) fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
}
