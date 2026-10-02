// Client side of the Electron code runner (see electron/codeRunner.ts).

export interface CodeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  error?: string;
}

export interface CodeFence {
  /** Language tag as written after the opening fence (may be empty). */
  language: string;
  code: string;
  /** Character offsets of the whole fence (opening line through closing line) in the source text. */
  start: number;
  end: number;
  /** Offsets of the code between the fence lines. */
  codeStart: number;
  codeEnd: number;
  closed: boolean;
}

const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^\n]*$/;

/** Finds ```lang fenced blocks; an unclosed fence runs to the end (the user is still typing it). */
export function parseFences(text: string): CodeFence[] {
  const fences: CodeFence[] = [];
  const lines = text.split("\n");
  let offset = 0;
  let open: { marker: string; language: string; start: number; codeStart: number } | null = null;

  for (const line of lines) {
    const lineEnd = offset + line.length;
    if (!open) {
      const match = OPENING_FENCE.exec(line);
      if (match) open = { marker: match[1], language: match[2], start: offset, codeStart: Math.min(lineEnd + 1, text.length) };
    } else {
      const trimmed = line.trim();
      if (trimmed.startsWith(open.marker[0].repeat(open.marker.length)) && /^(`+|~+)$/.test(trimmed)) {
        const codeEnd = Math.max(open.codeStart, offset - 1);
        fences.push({
          language: open.language,
          code: text.slice(open.codeStart, codeEnd),
          start: open.start,
          end: lineEnd,
          codeStart: open.codeStart,
          codeEnd,
          closed: true,
        });
        open = null;
      }
    }
    offset = lineEnd + 1;
  }

  if (open) {
    fences.push({
      language: open.language,
      code: text.slice(open.codeStart),
      start: open.start,
      end: text.length,
      codeStart: open.codeStart,
      codeEnd: text.length,
      closed: false,
    });
  }
  return fences;
}

const RUN_ALIASES: Record<string, string> = {
  python: "python", py: "python", python3: "python",
  javascript: "javascript", js: "javascript", node: "javascript", mjs: "javascript",
  typescript: "typescript", ts: "typescript",
  csharp: "csharp", cs: "csharp", "c#": "csharp",
};

export function runnableLanguage(tag: string): string | null {
  return RUN_ALIASES[tag.trim().toLowerCase()] ?? null;
}

export function runCode(language: string, code: string): Promise<CodeRunResult> {
  if (!window.dailyPill?.runCode) {
    return Promise.resolve({ stdout: "", stderr: "", exitCode: null, timedOut: false, durationMs: 0, error: "Running code is only available in the desktop app." });
  }
  return window.dailyPill.runCode(language, code);
}
