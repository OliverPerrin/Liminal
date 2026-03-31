"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownMessageProps = {
  content: string;
};

/**
 * Light cleanup of LLM output to help remark-math and rehype-katex parse correctly.
 * Only applies safe, non-destructive transforms.
 */
function normalizeAssistantContent(raw: string): string {
  let text = raw;

  // Strip zero-width characters that break math parsing.
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure stage markers become markdown headers if Claude forgot the ##.
  text = text.replace(/^STAGE\s+(\d+)\s*[-–—]\s*(.+)$/gm, "## STAGE $1 — $2");

  // Repair common malformed \frac where the denominator brace is missing.
  // e.g. \frac{x}\partial y → \frac{x}{\partial y}
  text = text.replace(
    /\\frac\{([^{}]+)\}\\partial\s*([a-zA-Z][a-zA-Z0-9_]*)/g,
    "\\frac{$1}{\\partial $2}",
  );

  // Convert unicode derivative notation ∂L/∂w → inline LaTeX.
  text = text.replace(
    /∂([A-Za-z][A-Za-z0-9_]*)\s*\/\s*∂([A-Za-z][A-Za-z0-9_]*)/g,
    (_m, top, bottom) => `$\\frac{\\partial ${top}}{\\partial ${bottom}}$`,
  );

  // Wrap bare equation lines (containing TeX commands + operators) in $$ blocks.
  text = text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("$") ||
        trimmed.startsWith("```") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("<") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("|")
      ) {
        return line;
      }

      const hasTexCommand =
        /\\(frac|partial|sigma|cdot|odot|hat|bar|mathbf|mathbb|sum|prod|nabla|sqrt|log|exp|text|left|right|begin|end|alpha|beta|gamma|delta|theta|lambda|mu|nu|pi|rho|tau|phi|psi|omega)/.test(
          trimmed,
        );
      const hasOperator = /[=+]/.test(trimmed);

      return hasTexCommand && hasOperator ? `$$\n${trimmed}\n$$` : line;
    })
    .join("\n");

  return text;
}

function sanitizeMermaidCode(input: string): string {
  let code = input;

  // Find the diagram declaration and keep from there onward.
  const diagramStart = code.search(/(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|erDiagram)\s/i);
  if (diagramStart >= 0) {
    code = code.slice(diagramStart);
  }

  // Quote bare node labels to avoid parser failures.
  code = code.replace(/([A-Za-z][A-Za-z0-9_]*)\[([^\]\n]+)\]/g, (_m, id, label) => {
    const safe = label.replace(/"/g, "").trim();
    return `${id}["${safe}"]`;
  });

  // Normalize unicode subscripts.
  const subMap: Record<string, string> = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  };
  code = code.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => subMap[c] ?? c);

  // Normalize curly quotes.
  code = code.replace(/[""]/g, '"');
  code = code.replace(/['']/g, "'");

  // Remove trailing periods on lines (Mermaid rejects them).
  code = code.replace(/\.+$/gm, "");

  return code;
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const id = useId().replace(/[:]/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function render() {
      try {
        const sanitizedCode = sanitizeMermaidCode(code);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            background: "#0d1117",
            primaryColor: "#1a2332",
            primaryTextColor: "#e6edf3",
            primaryBorderColor: "#30363d",
            lineColor: "#58a6ff",
            secondaryColor: "#161b22",
            tertiaryColor: "#0d1117",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize: "14px",
          },
          securityLevel: "loose",
          flowchart: { curve: "basis", htmlLabels: true, padding: 16 },
        });

        const rendered = await mermaid.render(`mermaid-${id}`, sanitizedCode);
        if (!mounted) return;
        setSvg(rendered.svg);
      } catch {
        if (!mounted) return;
        setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void render();
    return () => { mounted = false; };
  }, [code, id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-app-border bg-[#0d1117] p-6 text-sm text-app-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-app-muted border-t-app-accent" />
        Rendering diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/80">
        Diagram could not be rendered. Try asking to regenerate Stage 2 with a simpler Mermaid flowchart.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="not-prose overflow-x-auto rounded-lg border border-app-border bg-[#0d1117] p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="not-prose group relative rounded-lg border border-app-border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-app-border px-4 py-1.5">
        <span className="text-xs text-app-muted">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-app-muted opacity-0 transition-opacity hover:text-app-fg group-hover:opacity-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          borderRadius: "0 0 0.5rem 0.5rem",
          background: "transparent",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const normalizedContent = useMemo(() => normalizeAssistantContent(content), [content]);

  return (
    <div className="markdown-body prose prose-invert max-w-none prose-headings:text-app-fg prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-app-border prose-h2:pb-2 prose-h2:text-base prose-h2:font-semibold prose-p:leading-relaxed prose-p:text-[15px] prose-strong:text-app-fg prose-pre:bg-transparent prose-pre:p-0 prose-code:text-sky-300 prose-li:text-[15px] prose-li:leading-relaxed prose-ol:my-2 prose-ul:my-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1];
            const code = String(children).replace(/\n$/, "");

            // Inline code (no language, no newlines)
            if (!language && !code.includes("\n")) {
              return (
                <code className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[13px] text-sky-300">
                  {children}
                </code>
              );
            }

            if (language === "mermaid") {
              return <MermaidDiagram code={code} />;
            }

            return <CodeBlock language={language || "text"} code={code} />;
          },
          table(props) {
            return (
              <div className="not-prose overflow-x-auto rounded-lg border border-app-border">
                <table className="min-w-full text-sm" {...props} />
              </div>
            );
          },
          th(props) {
            return <th className="border-b border-app-border bg-app-panel-2 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-app-muted" {...props} />;
          },
          td(props) {
            return <td className="border-b border-app-border/50 px-4 py-2 text-sm" {...props} />;
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
