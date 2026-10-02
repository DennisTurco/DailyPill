import { useEffect, useMemo, useRef, useState } from "react";
import { EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completeAnyWord, completionKeymap, CompletionContext } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { tags } from "@lezer/highlight";
import { CodeFence, CodeRunResult, parseFences, runCode, runnableLanguage } from "../lib/codeRunner";

const INSERT_LANGUAGES = [
  { tag: "python", label: "Python" },
  { tag: "csharp", label: "C#" },
  { tag: "typescript", label: "TypeScript" },
  { tag: "javascript", label: "JavaScript" },
  { tag: "sql", label: "SQL" },
  { tag: "bash", label: "Bash" },
  { tag: "", label: "Plain" },
];

// Token colours live in index.css (--syntax-*), so both app themes restyle the editor.
const highlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.operatorKeyword], class: "tk-keyword" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], class: "tk-string" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], class: "tk-number" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], class: "tk-comment" },
  { tag: [tags.typeName, tags.className, tags.namespace], class: "tk-type" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.variableName)], class: "tk-function" },
  { tag: [tags.propertyName, tags.attributeName], class: "tk-property" },
  { tag: [tags.meta, tags.annotation, tags.processingInstruction, tags.labelName], class: "tk-meta" },
  { tag: [tags.operator, tags.punctuation, tags.bracket], class: "tk-punct" },
  { tag: tags.heading, class: "tk-heading" },
  { tag: tags.strong, class: "tk-strong" },
  { tag: tags.emphasis, class: "tk-emphasis" },
  { tag: [tags.link, tags.url], class: "tk-link" },
  { tag: tags.monospace, class: "tk-inline-code" },
  { tag: tags.invalid, class: "tk-invalid" },
]);

function fenceAt(fences: CodeFence[], position: number): CodeFence | undefined {
  return fences.find((f) => position >= f.codeStart && position <= f.codeEnd);
}

/** Word completion only inside code blocks, so it stays out of the way while writing prose. */
function codeWordCompletion(context: CompletionContext) {
  const fences = parseFences(context.state.doc.toString());
  return fenceAt(fences, context.pos) ? completeAnyWord(context) : null;
}

export function CodeAnswerEditor({
  value,
  onChange,
  placeholder,
  defaultLanguage,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultLanguage?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // The editor is created once; these refs let its callbacks see the latest props.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const runAtCursorRef = useRef<(pos: number) => boolean>(() => false);

  const [insertLanguage, setInsertLanguage] = useState(() => {
    const tag = defaultLanguage ? runnableLanguage(defaultLanguage) ?? defaultLanguage.toLowerCase() : "python";
    return INSERT_LANGUAGES.some((lang) => lang.tag === tag) ? tag : "python";
  });
  const [results, setResults] = useState<Record<number, CodeRunResult | "running">>({});
  const fences = useMemo(() => parseFences(value), [value]);

  async function run(index: number, fence: CodeFence) {
    setResults((prev) => ({ ...prev, [index]: "running" }));
    const result = await runCode(fence.language, fence.code);
    setResults((prev) => ({ ...prev, [index]: result }));
  }

  runAtCursorRef.current = (pos) => {
    const fence = fenceAt(fences, pos);
    if (!fence || !runnableLanguage(fence.language)) return false;
    void run(fences.indexOf(fence), fence);
    return true;
  };

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          indentUnit.of("    "),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ override: [codeWordCompletion] }),
          markdown({ codeLanguages: languages }),
          syntaxHighlighting(highlightStyle),
          EditorView.lineWrapping,
          placeholderExt(placeholder ?? ""),
          Prec.highest(keymap.of([{ key: "Mod-Enter", run: (v) => runAtCursorRef.current(v.state.selection.main.head) }])),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          EditorView.contentAttributes.of({ spellcheck: "false", "aria-label": "Your answer" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up changes made outside the editor (e.g. a voice transcript appended to the answer).
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  function insertCodeBlock() {
    const view = viewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;
    const selected = doc.sliceString(from, to);
    const before = from > 0 && doc.sliceString(from - 1, from) !== "\n" ? "\n" : "";
    const after = to < doc.length && doc.sliceString(to, to + 1) !== "\n" ? "\n" : "";
    const opening = `${before}\`\`\`${insertLanguage}\n`;
    view.dispatch({
      changes: { from, to, insert: `${opening}${selected}\n\`\`\`${after}` },
      selection: { anchor: from + opening.length + selected.length },
      scrollIntoView: true,
    });
    view.focus();
  }

  const runnable = fences.map((fence, index) => ({ fence, index })).filter(({ fence }) => runnableLanguage(fence.language) && fence.code.trim());

  return (
    <div className="code-answer">
      <div className="code-answer-toolbar">
        <select value={insertLanguage} onChange={(e) => setInsertLanguage(e.target.value)} aria-label="Code block language">
          {INSERT_LANGUAGES.map((lang) => (
            <option key={lang.tag} value={lang.tag}>{lang.label}</option>
          ))}
        </select>
        <button type="button" className="secondary btn-sm" onClick={insertCodeBlock}>
          <i className="fa-solid fa-code" /> Insert code block
        </button>
        {runnable.length > 0 && <span className="text-muted code-answer-shortcut">Ctrl+Enter runs the block under the cursor</span>}
      </div>
      <div className="code-editor" ref={hostRef} />
      {runnable.map(({ fence, index }) => (
        <CodeRunPanel key={index} fence={fence} result={results[index]} onRun={() => run(index, fence)} />
      ))}
    </div>
  );
}

function CodeRunPanel({ fence, result, onRun }: { fence: CodeFence; result?: CodeRunResult | "running"; onRun: () => void }) {
  const running = result === "running";
  const done = result && result !== "running" ? result : null;
  const firstLine = fence.code.split("\n").find((l) => l.trim()) ?? "";

  return (
    <div className="code-run">
      <div className="code-run-header">
        <button type="button" className="btn-sm" onClick={onRun} disabled={running}>
          <i className={running ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-play"} /> {running ? "Running..." : "Run"}
        </button>
        <span className="badge">{fence.language}</span>
        <code className="code-run-preview">{firstLine.trim()}</code>
        {done && !done.error && (
          <span className={`code-run-status ${done.exitCode === 0 && !done.timedOut ? "ok" : "fail"}`}>
            {done.timedOut ? "timed out" : `exit ${done.exitCode}`} · {done.durationMs} ms
          </span>
        )}
      </div>
      {done && (
        <pre className="code-run-output">
          {done.error ? (
            <span className="code-run-stderr">{done.error}</span>
          ) : (
            <>
              {done.stdout}
              {done.stderr && <span className="code-run-stderr">{done.stderr}</span>}
              {!done.stdout && !done.stderr && <span className="text-muted">(no output)</span>}
            </>
          )}
        </pre>
      )}
    </div>
  );
}
