"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/* -------------------------------------------------------------------------- */
/*  LaTeX normalisation                                                       */
/* -------------------------------------------------------------------------- */

/** LaTeX environments that must be wrapped in $$ when found bare. */
const LATEX_ENVS =
  /\\begin\{(align|aligned|equation|gather|gathered|cases|pmatrix|bmatrix|vmatrix|matrix|split|array|alignat|multline)\*?\}/;

/** TeX commands that indicate a line is math, not prose. */
const TEX_CMD =
  /\\(frac|partial|sigma|cdot|odot|hat|bar|mathbf|mathbb|sum|prod|nabla|sqrt|log|exp|text|left|right|alpha|beta|gamma|delta|theta|lambda|mu|nu|pi|rho|tau|phi|psi|omega|quad|int|lim|inf|sup|det|vec|dot|ddot|tilde|overline|underline|forall|exists|subset|cup|cap|times|div|pm|leq|geq|neq|approx|equiv|sim|mathcal|operatorname|displaystyle|binom|ldots|cdots|mathbb|mathcal)\b/;

/**
 * Normalise LLM output so remark-math / rehype-katex can parse it.
 *
 * Key fixes:
 *  - Wraps bare \begin{align}…\end{align} blocks in $$
 *  - Wraps bare single-line LaTeX equations in $$
 *  - Skips lines that already contain $ delimiters (mixed prose + inline math)
 *  - Repairs common malformed \frac, unicode derivative notation
 */
function normalizeAssistantContent(raw: string): string {
  let text = raw;

  // Strip zero-width characters that break math parsing.
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure stage markers become markdown headers.
  text = text.replace(/^STAGE\s+(\d+)\s*[-–—]\s*(.+)$/gm, "## STAGE $1 — $2");

  // Repair malformed \frac where the denominator brace is missing.
  text = text.replace(
    /\\frac\{([^{}]+)\}\\partial\s*([a-zA-Z][a-zA-Z0-9_]*)/g,
    "\\frac{$1}{\\partial $2}",
  );

  // Convert unicode derivative notation ∂L/∂w → inline LaTeX.
  text = text.replace(
    /∂([A-Za-z][A-Za-z0-9_]*)\s*\/\s*∂([A-Za-z][A-Za-z0-9_]*)/g,
    (_m, top, bottom) => `$\\frac{\\partial ${top}}{\\partial ${bottom}}$`,
  );

  /* ---- Line-by-line pass: wrap bare LaTeX in $$ delimiters ---- */

  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let inMathBlock = false;
  let envBuffer: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track fenced code blocks.
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Track $$ math blocks (only bare $$ on its own line toggles).
    if (trimmed === "$$") {
      inMathBlock = !inMathBlock;
      result.push(line);
      continue;
    }
    if (inMathBlock) {
      result.push(line);
      continue;
    }

    // --- Accumulate \begin{env}…\end{env} blocks ---
    if (envBuffer !== null) {
      envBuffer.push(line);
      if (/\\end\{/.test(trimmed)) {
        result.push("$$");
        result.push(...envBuffer);
        result.push("$$");
        envBuffer = null;
      }
      continue;
    }

    // Skip lines already delimited with $$
    if (trimmed.startsWith("$$") || trimmed.endsWith("$$")) {
      result.push(line);
      continue;
    }

    // Detect bare \begin{env} not already wrapped in $$
    if (LATEX_ENVS.test(trimmed)) {
      // Check if previous non-empty line is $$
      const alreadyWrapped = (() => {
        for (let j = result.length - 1; j >= 0; j--) {
          const prev = result[j].trim();
          if (prev === "") continue;
          return prev === "$$";
        }
        return false;
      })();
      if (alreadyWrapped) {
        result.push(line);
        continue;
      }
      // Single-line environment (e.g. \begin{cases}…\end{cases} on one line)
      if (/\\end\{/.test(trimmed)) {
        result.push("$$");
        result.push(line);
        result.push("$$");
        continue;
      }
      envBuffer = [line];
      continue;
    }

    // Skip lines that shouldn't be touched.
    if (
      !trimmed ||
      trimmed.includes("$") || // Already has math delimiters
      trimmed.startsWith("#") ||
      trimmed.startsWith("<") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("*") ||
      /^\d+[.)]/.test(trimmed) // Numbered list items
    ) {
      result.push(line);
      continue;
    }

    // Detect bare LaTeX equation lines (TeX commands + operator, no prose).
    if (TEX_CMD.test(trimmed) && /[=+<>≤≥≈]/.test(trimmed)) {
      result.push("$$");
      result.push(trimmed);
      result.push("$$");
    } else {
      result.push(line);
    }
  }

  // Flush any unclosed environment buffer.
  if (envBuffer !== null) {
    result.push("$$");
    result.push(...envBuffer);
    result.push("$$");
  }

  return result.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Mermaid helpers                                                           */
/* -------------------------------------------------------------------------- */

function sanitizeMermaidCode(input: string): string {
  let code = input;

  // Find the diagram declaration and keep from there onward.
  const diagramStart = code.search(
    /(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|erDiagram)\s/i,
  );
  if (diagramStart >= 0) {
    code = code.slice(diagramStart);
  }

  // Quote bare node labels to avoid parser failures.
  code = code.replace(/([A-Za-z][A-Za-z0-9_]*)\[([^\]\n]+)\]/g, (_m, id, label) => {
    const safe = label.replace(/"/g, "").trim();
    return `${id}["${safe}"]`;
  });

  // Clean special characters inside quoted labels that break Mermaid.
  code = code.replace(/"([^"]+)"/g, (_m, label: string) => {
    let safe = label;
    safe = safe.replace(/[{}#&\\$]/g, " ");
    safe = safe.replace(/\s+/g, " ").trim();
    return `"${safe}"`;
  });

  // Clean edge labels (between | … |).
  code = code.replace(/\|([^|]+)\|/g, (_m, label: string) => {
    let safe = label;
    safe = safe.replace(/[{}#&\\"$]/g, " ");
    safe = safe.replace(/\s+/g, " ").trim();
    return `|${safe}|`;
  });

  // Normalize unicode subscripts.
  const subMap: Record<string, string> = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  };
  code = code.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => subMap[c] ?? c);

  // Normalize curly quotes.
  code = code.replace(/[\u201C\u201D]/g, '"');
  code = code.replace(/[\u2018\u2019]/g, "'");

  // Remove trailing periods on lines (Mermaid rejects them).
  code = code.replace(/\.+$/gm, "");

  // Remove ::: class assignments.
  code = code.replace(/:::\w+/g, "");

  return code;
}

/** Aggressively simplify Mermaid code for a retry after initial parse failure. */
function simplifyMermaidCode(code: string): string {
  let s = code;

  // Flatten subgraph blocks (keep connections, drop structure).
  s = s.replace(/^\s*subgraph\s+.*$/gm, "");
  s = s.replace(/^\s*end\s*$/gm, "");

  // Remove style / class directives.
  s = s.replace(/^\s*(style|classDef|class|linkStyle|click)\s+.*$/gm, "");

  // Strip HTML tags from labels.
  s = s.replace(/<[^>]+>/g, "");

  // Truncate long quoted labels.
  s = s.replace(/"([^"]{35,})"/g, (_m, label: string) => `"${label.substring(0, 30)}..."`);

  // Remove empty lines.
  s = s
    .split("\n")
    .filter((l) => l.trim() !== "")
    .join("\n");

  return s;
}

/** Remove stray DOM elements that Mermaid injects into document.body on parse errors. */
function cleanupMermaidArtifacts(idPrefix: string) {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(`[id^="d${idPrefix}"], [id^="${idPrefix}"]`)
    .forEach((el) => el.remove());
  const body = document.body;
  for (let i = body.childNodes.length - 1; i >= 0; i--) {
    const node = body.childNodes[i];
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      /Syntax error in text|mermaid version/i.test(node.textContent)
    ) {
      node.remove();
    }
    if (
      node instanceof HTMLElement &&
      (node.id.startsWith("d") || node.id.startsWith("mermaid")) &&
      node.style.position === "absolute"
    ) {
      node.remove();
    }
  }
}

let mermaidCounter = 0;

const MERMAID_INIT = {
  startOnLoad: false,
  theme: "base" as const,
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
  securityLevel: "loose" as const,
  flowchart: { curve: "basis" as const, htmlLabels: true, padding: 16 },
};

function makeResponsiveSvg(svg: string): string {
  let s = svg;
  s = s.replace(/(<svg[^>]*?)\s+height="[^"]*"/i, "$1");
  s = s.replace(/(<svg[^>]*?)\s+width="[^"]*"/i, '$1 width="100%"');
  return s;
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const idPrefix = useRef(`mmd-${++mermaidCounter}`).current;

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(async () => {
      if (!mounted) return;

      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(offscreen);

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize(MERMAID_INIT);

        const sanitized = sanitizeMermaidCode(code);

        // Attempt 1: sanitized code
        try {
          const id1 = `${idPrefix}-${Date.now()}`;
          const r1 = await mermaid.render(id1, sanitized, offscreen);
          if (!mounted) return;
          setSvg(makeResponsiveSvg(r1.svg));
          return;
        } catch {
          cleanupMermaidArtifacts(idPrefix);
          offscreen.innerHTML = "";
        }

        // Attempt 2: aggressively simplified
        const simplified = simplifyMermaidCode(sanitized);
        try {
          const id2 = `${idPrefix}-r-${Date.now()}`;
          const r2 = await mermaid.render(id2, simplified, offscreen);
          if (!mounted) return;
          setSvg(makeResponsiveSvg(r2.svg));
          return;
        } catch {
          cleanupMermaidArtifacts(idPrefix);
        }

        // Both attempts failed — show source code as fallback
        if (mounted) setFailed(true);
      } catch {
        if (mounted) setFailed(true);
      } finally {
        offscreen.remove();
        cleanupMermaidArtifacts(idPrefix);
        if (mounted) setLoading(false);
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanupMermaidArtifacts(idPrefix);
    };
  }, [code, idPrefix]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-app-border bg-[#0d1117] p-6 text-sm text-app-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-app-muted border-t-app-accent" />
        Rendering diagram...
      </div>
    );
  }

  // Fallback: show the Mermaid source as a syntax-highlighted code block
  if (failed) {
    return <CodeBlock language="mermaid" code={code} />;
  }

  return (
    <div
      className="not-prose mermaid-container overflow-x-auto rounded-lg border border-app-border bg-[#0d1117] p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Code block                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Exported component                                                        */
/* -------------------------------------------------------------------------- */

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
            return (
              <th
                className="border-b border-app-border bg-app-panel-2 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-app-muted"
                {...props}
              />
            );
          },
          td(props) {
            return (
              <td
                className="border-b border-app-border/50 px-4 py-2 text-sm"
                {...props}
              />
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
