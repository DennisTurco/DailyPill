import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function CodeBlock(props: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = preRef.current?.textContent ?? "";
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="secondary copy-code-button"
        onClick={copy}
        style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px", fontSize: 11 }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre ref={preRef} {...props} />
    </div>
  );
}

export function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: CodeBlock }}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
