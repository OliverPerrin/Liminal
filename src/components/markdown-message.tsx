"use client";

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

  // Ensure stage markers become markdown headers.
  text = text.replace(/^STAGE\s+(\d+)\s+-\s+(.+)$/gm, "## STAGE $1 - $2");

  // Fix common duplicated artifact pattern: plainText\latexPlainText.
  text = text.replace(
    /[^\s\\]{1,40}(\\[a-zA-Z]+(?:\{[^{}\n]{1,120}\}|\[[^\]\n]{1,120}\}|_[^\s]+|\^[^\s]+){1,6})[^\s\\]{1,40}/g,
    (_match, latex) => `$${latex}$`,
  );

  // Wrap standalone LaTeX command sequences so KaTeX can render them.
  text = text.replace(
    /(^|[^$`])(\\(?:frac|partial|sigma|cdot|odot|hat|bar|mathbf|mathbb|sum|prod|nabla|alpha|beta|gamma|theta|lambda|mu|nu|pi|rho|tau|phi|psi|omega)(?:\{[^{}\n]*\}|\[[^\]\n]*\]|_[^\s]+|\^[^\s]+){1,8})(?=[^$`]|$)/g,
    (_match, prefix, latex) => `${prefix}$${latex}$`,
  );

  return text;
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
  const normalizedContent = normalizeAssistantContent(content);

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
                {String(children).replace(/\n$/, "")}
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
