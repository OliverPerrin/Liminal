"use client";

import { useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownMessageProps = {
  content: string;
};

function normalizeAssistantContent(raw: string): string {
  let text = raw;

  // Strip zero-width characters that often appear in copied/generated math and break parsing.
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure stage markers become markdown headers.
  text = text.replace(/^STAGE\s+(\d+)\s+-\s+(.+)$/gm, "## STAGE $1 - $2");

  // Repair a common malformed fraction token produced by LLMs.
  text = text.replace(/\\frac\{([^{}]+)\}\\partial\s*([a-zA-Z])/g, "\\frac{$1}{\\partial $2}");
  text = text.replace(/\\frac\{([^{}]+)\}\\([a-zA-Z]+)/g, "\\frac{$1}{\\$2}");
  text = text.replace(/\\frac\{([^{}]+)\}\s*\{?\\partial\s*([a-zA-Z0-9_{}^]+)\}?/g, "\\frac{$1}{\\partial $2}");

  // Convert common unicode derivative notation into KaTeX-friendly inline math.
  text = text.replace(/∂([A-Za-z][A-Za-z0-9]*)\s*\/\s*∂([A-Za-z][A-Za-z0-9]*)/g, (_m, top, bottom) => {
    return `$\\frac{\\partial ${top}}{\\partial ${bottom}}$`;
  });

  // If a line mixes plain/unicode math before TeX, keep the TeX segment to avoid duplicate malformed output.
  text = text
    .split("\n")
    .map((line) => {
      const firstTex = line.indexOf("\\");
      if (firstTex <= 0) {
        return line;
      }

      const prefix = line.slice(0, firstTex);
      const hasPlainMathPrefix = /[∂σ∇θλμρτϕψωαβγ]|[A-Za-z]\/[A-Za-z]|[=+\-]/.test(prefix);
      if (!hasPlainMathPrefix) {
        return line;
      }

      return line.slice(firstTex);
    })
    .join("\n");

  // Remove common plain-text prefixes accidentally glued before TeX commands.
  text = text.replace(/[A-Za-z0-9_]+(?=\\frac)/g, "");
  text = text.replace(/[A-Za-z0-9_]+(?=\\partial)/g, "");

  // Wrap standalone equation lines in block math if they include TeX commands.
  text = text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("$") || trimmed.startsWith("```") || trimmed.startsWith("<")) {
        return line;
      }

      const looksLikeEquation =
        /\\(frac|partial|sigma|cdot|odot|hat|bar|mathbf|mathbb|sum|prod|nabla|alpha|beta|gamma|theta|lambda|mu|nu|pi|rho|tau|phi|psi|omega)/.test(
          trimmed,
        ) && /[=+\-]/.test(trimmed);

      return looksLikeEquation ? `$$\n${trimmed}\n$$` : line;
    })
    .join("\n");

  return text;
}

function sanitizeMermaidCode(input: string): string {
  let code = input;

  // Keep only the diagram definition from the first flowchart declaration onward.
  const flowchartIndex = code.search(/flowchart\s+(LR|RL|TB|BT|TD)/i);
  if (flowchartIndex >= 0) {
    code = code.slice(flowchartIndex);
  }

  // Keep likely mermaid syntax lines only and drop prose contamination.
  const candidateLines = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return /^(flowchart|graph|subgraph|end|classDef|class|style|linkStyle|%%|[A-Za-z0-9_]+\s*(\[|\(|\{|-->|-.->|==>|---))/i.test(
        line,
      );
    });

  if (candidateLines.length > 0) {
    code = candidateLines.join("\n");
  }

  // Quote node labels to avoid parser failures with unicode/symbol-heavy labels.
  code = code.replace(/([A-Za-z][A-Za-z0-9_]*)\[([^\]\n]+)\]/g, (_m, id, label) => {
    const safe = label.replace(/\\"/g, '"').replace(/"/g, "").trim();
    return `${id}["${safe}"]`;
  });

  // Fix accidentally doubled quoted labels like ["\"text\""]
  code = code.replace(/\["\\?"([^\]]+?)\\?""\]/g, (_m, label) => `["${label}"]`);

  // Normalize unicode subscripts commonly emitted by LLMs.
  const subMap: Record<string, string> = {
    "₀": "0",
    "₁": "1",
    "₂": "2",
    "₃": "3",
    "₄": "4",
    "₅": "5",
    "₆": "6",
    "₇": "7",
    "₈": "8",
    "₉": "9",
  };
  code = code.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => subMap[char] ?? char);

  // Remove characters Mermaid commonly rejects in labels.
  code = code.replace(/[“”]/g, '"');
  code = code.replace(/[’]/g, "'");

  // Mermaid expects semicolon-safe/line-safe declarations; normalize accidental sentence endings.
  code = code.replace(/\.+$/gm, "");

  return code;
}

type MermaidDiagramProps = {
  code: string;
};

function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/[:]/g, "-");

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
            background: "#0b1220",
            primaryColor: "#111827",
            primaryTextColor: "#e5e7eb",
            primaryBorderColor: "#334155",
            lineColor: "#93c5fd",
            tertiaryColor: "#0f172a",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          },
          securityLevel: "loose",
          flowchart: {
            curve: "basis",
            htmlLabels: true,
          },
        });

        const rendered = await mermaid.render(`mermaid-${id}`, sanitizedCode);
        if (/Syntax error in text|Parse error/i.test(rendered.svg)) {
          throw new Error("Invalid Mermaid syntax from model output");
        }
        if (!mounted) {
          return;
        }

        setSvg(rendered.svg);
        setError(null);
      } catch (renderError) {
        if (!mounted) {
          return;
        }

        const message =
          renderError instanceof Error ? renderError.message : "Failed to render mermaid diagram.";
        setError(message);
      }
    }

    void render();

    return () => {
      mounted = false;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
        Diagram unavailable for this response. Ask: "Regenerate Stage 2 with a valid mermaid flowchart only."
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-app-border bg-app-panel-2 p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const svgSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "svg",
    "g",
    "path",
    "circle",
    "rect",
    "text",
    "line",
    "polyline",
    "polygon",
    "ellipse",
    "defs",
    "marker",
  ],
  attributes: {
    ...defaultSchema.attributes,
    svg: [
      ...(defaultSchema.attributes?.svg || []),
      "viewBox",
      "width",
      "height",
      "fill",
      "stroke",
      "stroke-width",
      "xmlns",
    ],
    g: ["fill", "stroke", "stroke-width", "transform"],
    path: ["d", "fill", "stroke", "stroke-width", "marker-end", "stroke-dasharray"],
    circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
    rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width"],
    text: ["x", "y", "fill", "font-size", "font-weight", "text-anchor"],
    line: ["x1", "y1", "x2", "y2", "fill", "stroke", "stroke-width"],
    polyline: ["points", "fill", "stroke", "stroke-width"],
    polygon: ["points", "fill", "stroke", "stroke-width"],
    ellipse: ["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"],
    defs: [],
    marker: ["id", "markerWidth", "markerHeight", "refX", "refY", "orient"],
  },
};

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const normalizedContent = useMemo(() => normalizeAssistantContent(content), [content]);

  return (
    <div className="prose prose-invert max-w-none prose-pre:bg-transparent prose-code:text-app-fg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw, [rehypeSanitize, svgSchema]]}
        components={{
          code(props) {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1];
            const code = String(children).replace(/\n$/, "");

            if (language === "mermaid") {
              return <MermaidDiagram code={code} />;
            }

            if (!language) {
              return <code className="rounded bg-app-panel-2 px-1 py-0.5">{children}</code>;
            }

            return (
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                  border: "1px solid #23314d",
                  background: "#0b1220",
                }}
              >
                {code}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
