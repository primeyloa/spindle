import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { ComponentProps } from "react";

// ── Inline code component ──────────────────────────────────────────────

function InlineCode(props: ComponentProps<"code">) {
  const { className, children, ...rest } = props;
  return (
    <code
      className={className ?? "inline-code"}
      {...rest}
    >
      {children}
    </code>
  );
}

// ── Code block component with copy button ──────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [code]);

  const langLabel = language || "text";

  return (
    <div className="code-block group">
      <div className="code-block-header">
        <span className="code-block-lang">{langLabel}</span>
        <button
          className="code-block-copy"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="code-block-pre">
        <code className={`language-${langLabel}`}>{code}</code>
      </pre>
    </div>
  );
}

// ── Markdown component map ─────────────────────────────────────────────

const components = {
  code({ className, children, ...props }: ComponentProps<"code">) {
    const match = /language-(\w+)/.exec(className ?? "");
    const codeString = String(children).replace(/\n$/, "");
    if (match) {
      return <CodeBlock language={match[1]} code={codeString} />;
    }
    // Inline code
    return <InlineCode className={className} {...props}>{children}</InlineCode>;
  },
  pre({ children }: { children?: React.ReactNode }) {
    // We handle <pre> inside <code> above, so skip the default <pre> rendering
    return <>{children}</>;
  },
  a({ href, children, ...props }: ComponentProps<"a">) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="markdown-link"
        {...props}
      >
        {children}
      </a>
    );
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="markdown-table">{children}</table>
      </div>
    );
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return <blockquote className="markdown-blockquote">{children}</blockquote>;
  },
};

// ── Main Component ─────────────────────────────────────────────────────

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export default function MarkdownContent({ content, isStreaming }: MarkdownContentProps) {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
      {isStreaming && (
        <span className="streaming-cursor" />
      )}
    </div>
  );
}