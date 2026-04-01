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
/*  Stage configuration                                                        */
/* -------------------------------------------------------------------------- */

const STAGE_CONFIG: Record<
  number,
  { border: string; bg: string; text: string; short: string }
> = {
  1: { border: "#f59e0b", bg: "rgba(245,158,11,0.07)", text: "#f59e0b", short: "Big Picture" },
  2: { border: "#2dd4bf", bg: "rgba(45,212,191,0.07)", text: "#2dd4bf", short: "Intuition + Visual" },
  3: { border: "#818cf8", bg: "rgba(129,140,248,0.07)", text: "#818cf8", short: "The Math" },
  4: { border: "#38bdf8", bg: "rgba(56,189,248,0.07)", text: "#38bdf8", short: "Implementation" },
  5: { border: "#fb923c", bg: "rgba(251,146,60,0.07)", text: "#fb923c", short: "Interview Questions" },
  6: { border: "#c084fc", bg: "rgba(192,132,252,0.07)", text: "#c084fc", short: "Retrieval Check" },
};

/* -------------------------------------------------------------------------- */
/*  LaTeX normalisation                                                        */
/* -------------------------------------------------------------------------- */

const LATEX_ENVS =
  /\\begin\{(align|aligned|equation|gather|gathered|cases|pmatrix|bmatrix|vmatrix|matrix|split|array|alignat|multline)\*?\}/;

const TEX_CMD =
  /\\(frac|partial|sigma|cdot|odot|hat|bar|mathbf|mathbb|sum|prod|nabla|sqrt|log|exp|text|left|right|alpha|beta|gamma|delta|theta|lambda|mu|nu|pi|rho|tau|phi|psi|omega|quad|int|lim|inf|sup|det|vec|dot|ddot|tilde|overline|underline|forall|exists|subset|cup|cap|times|div|pm|leq|geq|neq|approx|equiv|sim|mathcal|operatorname|displaystyle|binom|ldots|cdots|mathbb|mathcal)\b/;

function normalizeAssistantContent(raw: string): string {
  let text = raw;

  // Strip zero-width characters that break math parsing.
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure stage markers become markdown headers with em-dash.
  text = text.replace(/^#+\s*STAGE\s+(\d+)\s*[-–—]\s*(.+)$/gim, "## STAGE $1 — $2");
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

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    if (trimmed === "$$") {
      inMathBlock = !inMathBlock;
      result.push(line);
      continue;
    }
    if (inMathBlock) {
      result.push(line);
      continue;
    }

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

    if (trimmed.startsWith("$$") || trimmed.endsWith("$$")) {
      result.push(line);
      continue;
    }

    // Only apply block-math wrapping if the line isn't already inside inline $...$ delimiters.
    // A line like `where $M = \begin{cases}...\end{cases}$` is already valid inline math.
    if (LATEX_ENVS.test(trimmed) && !trimmed.includes("$")) {
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
      if (/\\end\{/.test(trimmed)) {
        result.push("$$");
        result.push(line);
        result.push("$$");
        continue;
      }
      envBuffer = [line];
      continue;
    }

    if (
      !trimmed ||
      trimmed.includes("$") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("<") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("*") ||
      /^\d+[.)]/.test(trimmed)
    ) {
      result.push(line);
      continue;
    }

    if (TEX_CMD.test(trimmed) && /[=+<>≤≥≈]/.test(trimmed)) {
      result.push("$$");
      result.push(trimmed);
      result.push("$$");
    } else {
      result.push(line);
    }
  }

  if (envBuffer !== null) {
    result.push("$$");
    result.push(...envBuffer);
    result.push("$$");
  }

  return result.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Mermaid helpers                                                            */
/* -------------------------------------------------------------------------- */

function sanitizeMermaidCode(input: string): string {
  let code = input;

  const diagramStart = code.search(
    /(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|erDiagram)\s/i,
  );
  if (diagramStart >= 0) {
    code = code.slice(diagramStart);
  }

  // Quote bare node labels. The inner group matches either:
  //   • an already-quoted string: "..." (may contain [ ] inside)
  //   • an unquoted label: anything up to the closing ]
  // This prevents the regex from splitting on ] inside quoted labels like ["Query [B T D]"].
  code = code.replace(
    /([A-Za-z][A-Za-z0-9_]*)\[("(?:[^"\\]|\\.)*"|[^\]\n]+)\]/g,
    (_m, id, label) => {
      if (label.startsWith('"')) return `${id}[${label}]`; // already quoted, leave as-is
      const safe = label.replace(/"/g, "").trim();
      return `${id}["${safe}"]`;
    },
  );

  // Clean special characters inside quoted labels (but keep [ ] — they're dimension annotations).
  code = code.replace(/"([^"]+)"/g, (_m, label: string) => {
    let safe = label;
    safe = safe.replace(/[{}#&\\$<>()]/g, " ");
    safe = safe.replace(/\s+/g, " ").trim();
    return `"${safe}"`;
  });

  // Clean edge labels.
  code = code.replace(/\|([^|]+)\|/g, (_m, label: string) => {
    let safe = label;
    safe = safe.replace(/[{}#&\\"$<>()]/g, " ");
    safe = safe.replace(/\s+/g, " ").trim();
    return `|${safe}|`;
  });

  // Normalize unicode subscripts.
  const subMap: Record<string, string> = {
    "₀": "0","₁": "1","₂": "2","₃": "3","₄": "4",
    "₅": "5","₆": "6","₇": "7","₈": "8","₉": "9",
  };
  code = code.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => subMap[c] ?? c);

  // Normalize curly quotes.
  code = code.replace(/[\u201C\u201D]/g, '"');
  code = code.replace(/[\u2018\u2019]/g, "'");

  // Remove trailing periods.
  code = code.replace(/\.+$/gm, "");

  // Remove ::: class assignments.
  code = code.replace(/:::\w+/g, "");

  return code;
}

function simplifyMermaidCode(code: string): string {
  let s = code;
  s = s.replace(/^\s*subgraph\s+.*$/gm, "");
  s = s.replace(/^\s*end\s*$/gm, "");
  s = s.replace(/^\s*(style|classDef|class|linkStyle|click)\s+.*$/gm, "");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/"([^"]{35,})"/g, (_m, label: string) => `"${label.substring(0, 30)}"`);
  s = s.split("\n").filter((l) => l.trim() !== "").join("\n");
  return s;
}

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
    background: "#111119",
    primaryColor: "#1b1b26",
    primaryTextColor: "#f0f0f8",
    primaryBorderColor: "#252535",
    lineColor: "#10b981",
    secondaryColor: "#111119",
    tertiaryColor: "#09090f",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    edgeLabelBackground: "#1b1b26",
    clusterBkg: "#1b1b26",
    clusterBorder: "#252535",
  },
  securityLevel: "loose" as const,
  flowchart: { curve: "basis" as const, htmlLabels: true, padding: 20 },
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
        "position:absolute;left:-9999px;top:-9999px;width:1200px;height:1px;overflow:hidden;";
      document.body.appendChild(offscreen);

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize(MERMAID_INIT);

        const sanitized = sanitizeMermaidCode(code);

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

        if (mounted) setFailed(true);
      } catch {
        if (mounted) setFailed(true);
      } finally {
        offscreen.remove();
        cleanupMermaidArtifacts(idPrefix);
        if (mounted) setLoading(false);
      }
    }, 400);

    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanupMermaidArtifacts(idPrefix);
    };
  }, [code, idPrefix]);

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-app-border bg-[#111119] p-6 text-sm text-app-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
        Rendering diagram…
      </div>
    );
  }

  if (failed) {
    return <CodeBlock language="mermaid" code={code} />;
  }

  return (
    <div
      className="not-prose mermaid-container overflow-x-auto rounded-lg border border-app-border bg-[#111119] p-5"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Code block                                                                 */
/* -------------------------------------------------------------------------- */

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayLang = language === "text" ? "plain" : language;

  return (
    <div className="not-prose group relative my-4 overflow-hidden rounded-lg border border-app-border bg-[#0c0d11]">
      <div className="flex items-center justify-between border-b border-[#1e1e2f] bg-[#111119] px-4 py-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-app-muted">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-app-muted/60 transition-all hover:bg-app-panel-2 hover:text-app-fg"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language === "mermaid" ? "text" : language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1.125rem 1.25rem",
          borderRadius: 0,
          background: "transparent",
          fontSize: "0.8125rem",
          lineHeight: "1.65",
        }}
        showLineNumbers={code.split("\n").length > 8}
        lineNumberStyle={{ color: "#383848", fontSize: "0.75rem", minWidth: "2.5rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stage header component                                                     */
/* -------------------------------------------------------------------------- */

function StageHeader({ stageNum, title }: { stageNum: number; title: string }) {
  const config = STAGE_CONFIG[stageNum];
  if (!config) {
    return (
      <h2 className="mb-3 mt-7 text-base font-semibold text-app-fg">
        STAGE {stageNum} — {title}
      </h2>
    );
  }

  return (
    <div
      className="not-prose my-6 flex items-center gap-3 rounded-r-lg py-3 pl-4 pr-5"
      style={{
        borderLeft: `3px solid ${config.border}`,
        background: config.bg,
      }}
    >
      <span
        className="shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
        style={{ background: config.border, color: "#0e0f14" }}
      >
        {stageNum}
      </span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: config.text }}>
        {config.short}
      </span>
      {title && title.toLowerCase() !== config.short.toLowerCase() && (
        <>
          <span className="text-app-border">·</span>
          <span className="text-sm font-medium text-app-fg/80">{title}</span>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Revision card detection                                                    */
/* -------------------------------------------------------------------------- */

function isRevisionCardHeader(text: string): boolean {
  return /^revision card:/i.test(text.trim());
}

/* -------------------------------------------------------------------------- */
/*  Exported component                                                         */
/* -------------------------------------------------------------------------- */

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const normalizedContent = useMemo(() => normalizeAssistantContent(content), [content]);

  return (
    <div className="markdown-body prose prose-invert max-w-none prose-headings:text-app-fg prose-h2:mt-0 prose-h2:mb-0 prose-h2:border-none prose-h2:pb-0 prose-h3:text-[0.9375rem] prose-h3:font-semibold prose-h3:text-app-fg/90 prose-p:leading-7 prose-p:text-[0.9375rem] prose-strong:text-app-fg prose-pre:bg-transparent prose-pre:p-0 prose-code:text-emerald-300 prose-li:text-[0.9375rem] prose-li:leading-7 prose-ol:my-3 prose-ul:my-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h2(props) {
            const text = String(props.children ?? "");
            // Match "STAGE N — Title" or "STAGE N: Title"
            const stageMatch = text.match(/^STAGE\s+(\d+)\s*[—–:-]\s*(.*)$/i);
            if (stageMatch) {
              return (
                <StageHeader
                  stageNum={parseInt(stageMatch[1])}
                  title={stageMatch[2].trim()}
                />
              );
            }
            // Revision card header
            if (isRevisionCardHeader(text)) {
              return (
                <div className="not-prose mb-4 mt-2 flex items-center gap-2.5">
                  <div className="h-px flex-1 bg-app-border" />
                  <span className="rounded-full border border-app-accent/30 bg-app-accent/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-app-accent">
                    Revision Card
                  </span>
                  <div className="h-px flex-1 bg-app-border" />
                </div>
              );
            }
            return (
              <h2 className="mb-3 mt-7 border-b border-app-border pb-2 text-base font-semibold text-app-fg">
                {props.children}
              </h2>
            );
          },
          h3(props) {
            return (
              <h3 className="mb-2 mt-5 text-[0.9375rem] font-semibold text-app-fg/90">
                {props.children}
              </h3>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1];
            const code = String(children).replace(/\n$/, "");

            if (!language && !code.includes("\n")) {
              return (
                <code className="rounded-md bg-[#1b1b26] px-1.5 py-0.5 font-mono text-[13px] text-emerald-300">
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
              <div className="not-prose my-4 overflow-x-auto rounded-lg border border-app-border">
                <table className="min-w-full text-[0.875rem]" {...props} />
              </div>
            );
          },
          thead(props) {
            return <thead className="bg-app-panel-2" {...props} />;
          },
          th(props) {
            return (
              <th
                className="border-b border-app-border px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted"
                {...props}
              />
            );
          },
          td(props) {
            return (
              <td
                className="border-b border-app-border/40 px-4 py-2.5 text-[0.875rem] text-app-fg/90"
                {...props}
              />
            );
          },
          tr(props) {
            return <tr className="transition-colors hover:bg-app-panel-2/40" {...props} />;
          },
          blockquote(props) {
            return (
              <blockquote
                className="my-3 rounded-r-lg border-l-[3px] border-app-accent/50 bg-app-accent/5 py-2 pl-4 pr-3 text-[0.9375rem] text-app-muted"
                {...props}
              />
            );
          },
          a(props) {
            return (
              <a
                {...props}
                className="text-app-accent underline decoration-app-accent/40 underline-offset-2 hover:decoration-app-accent"
                target="_blank"
                rel="noopener noreferrer"
              />
            );
          },
          hr() {
            return <hr className="my-6 border-app-border" />;
          },
          ul(props) {
            return <ul className="my-3 list-disc space-y-1 pl-5" {...props} />;
          },
          ol(props) {
            return <ol className="my-3 list-decimal space-y-1 pl-5" {...props} />;
          },
          li(props) {
            return <li className="text-[0.9375rem] leading-7 text-app-fg/90" {...props} />;
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
