"use client";

import { useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type NodeShape = "rect" | "diamond" | "circle";
type NodeColor = "green" | "teal" | "indigo" | "purple" | "amber" | "orange" | "muted";

interface DiagramNode {
  id: string;
  label: string;
  shape?: NodeShape;
  color?: NodeColor;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramSpec {
  type?: string;
  title?: string;
  direction?: "TB" | "LR";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// ── Color map ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<NodeColor, { fill: string; border: string; text: string }> = {
  green:  { fill: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.5)",  text: "#10b981" },
  teal:   { fill: "rgba(45,212,191,0.12)",  border: "rgba(45,212,191,0.5)",  text: "#2dd4bf" },
  indigo: { fill: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.5)", text: "#818cf8" },
  purple: { fill: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.5)", text: "#c084fc" },
  amber:  { fill: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.5)",  text: "#f59e0b" },
  orange: { fill: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.5)",  text: "#fb923c" },
  muted:  { fill: "rgba(120,120,160,0.10)", border: "rgba(120,120,160,0.4)", text: "#7878a0" },
};

// ── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 124;
const NODE_H = 52;
const DIAMOND_SIZE = 56;
const CIRCLE_R = 28;
const COL_GAP = 56;
const ROW_GAP = 80;
const PAD = 32;
const TITLE_H = 28;

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spec: DiagramNode;
}

function layoutDiagram(spec: DiagramSpec): {
  nodes: LayoutNode[];
  edges: DiagramEdge[];
  svgW: number;
  svgH: number;
} {
  const dir = spec.direction ?? "TB";
  const titleOffset = spec.title ? TITLE_H + 8 : 0;

  // Build adjacency for rank assignment (topological ordering by BFS/Kahn)
  const nodeIds = spec.nodes.map((n) => n.id);
  const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));

  for (const e of spec.edges) {
    adj.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // Kahn's algorithm → assign layer rank
  const rank = new Map<string, number>();
  const queue: string[] = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  queue.forEach((id) => rank.set(id, 0));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curRank = rank.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      rank.set(next, Math.max(rank.get(next) ?? 0, curRank + 1));
      const newIn = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newIn);
      if (newIn === 0) queue.push(next);
    }
  }

  // Assign unranked nodes (cycles / disconnected) a rank at the end
  nodeIds.forEach((id) => {
    if (!rank.has(id)) rank.set(id, 0);
  });

  // Group nodes by rank
  const maxRank = Math.max(...Array.from(rank.values()));
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  nodeIds.forEach((id) => layers[rank.get(id)!].push(id));

  // Compute node sizes
  function nodeSize(n: DiagramNode): { w: number; h: number } {
    if (n.shape === "circle") return { w: CIRCLE_R * 2, h: CIRCLE_R * 2 };
    if (n.shape === "diamond") return { w: DIAMOND_SIZE, h: DIAMOND_SIZE };
    return { w: NODE_W, h: NODE_H };
  }

  // Lay out in TB or LR
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();

  if (dir === "TB") {
    let y = PAD + titleOffset;
    for (const layer of layers) {
      const totalW = layer.reduce((sum, id) => {
        const n = spec.nodes.find((nd) => nd.id === id)!;
        return sum + nodeSize(n).w;
      }, 0) + (layer.length - 1) * COL_GAP;
      let x = PAD + (totalW < 1 ? 0 : 0); // left-aligned then centered below
      // center the layer
      const layerH = Math.max(...layer.map((id) => nodeSize(spec.nodes.find((n) => n.id === id)!).h));
      const layerTotalW = layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).w, 0) + (layer.length - 1) * COL_GAP;
      x = PAD;
      // We'll center later by adding svgW offset
      let cx = 0;
      layer.forEach((id) => {
        const sz = nodeSize(spec.nodes.find((n) => n.id === id)!);
        positions.set(id, { x: cx, y, w: sz.w, h: sz.h });
        cx += sz.w + COL_GAP;
      });
      // Store layer info for centering
      y += layerH + ROW_GAP;
      // tag the layer total width for centering pass
      layer.forEach((id) => {
        const p = positions.get(id)!;
        (p as { x: number; y: number; w: number; h: number; _layerW?: number })._layerW = layerTotalW;
      });
    }
    // Center each layer horizontally
    const maxLayerW = Math.max(...layers.map((layer) => {
      return layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).w, 0) + (layer.length - 1) * COL_GAP;
    }));
    const svgW = maxLayerW + PAD * 2;
    const svgH = y - ROW_GAP + PAD;

    layers.forEach((layer) => {
      const layerTotalW = layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).w, 0) + (layer.length - 1) * COL_GAP;
      const startX = (svgW - layerTotalW) / 2;
      let cx = startX;
      layer.forEach((id) => {
        const p = positions.get(id)!;
        const sz = nodeSize(spec.nodes.find((n) => n.id === id)!);
        p.x = cx;
        cx += sz.w + COL_GAP;
      });
    });

    const layoutNodes: LayoutNode[] = spec.nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: 0, y: 0, w: NODE_W, h: NODE_H };
      return { id: n.id, x: p.x, y: p.y, w: p.w, h: p.h, spec: n };
    });
    return { nodes: layoutNodes, edges: spec.edges, svgW, svgH };
  } else {
    // LR layout
    let x = PAD;
    for (const layer of layers) {
      const layerW = Math.max(...layer.map((id) => nodeSize(spec.nodes.find((n) => n.id === id)!).w));
      const totalH = layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).h, 0) + (layer.length - 1) * COL_GAP;
      let cy = 0;
      layer.forEach((id) => {
        const sz = nodeSize(spec.nodes.find((n) => n.id === id)!);
        positions.set(id, { x, y: cy, w: sz.w, h: sz.h });
        cy += sz.h + COL_GAP;
      });
      x += layerW + ROW_GAP;
      // center vertically
      layer.forEach((id) => {
        const p = positions.get(id)!;
        (p as { x: number; y: number; w: number; h: number; _layerH?: number })._layerH = totalH;
      });
    }
    const maxLayerH = Math.max(...layers.map((layer) => {
      return layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).h, 0) + (layer.length - 1) * COL_GAP;
    }));
    const svgH = maxLayerH + PAD * 2 + titleOffset;
    const svgW = x - ROW_GAP + PAD;

    layers.forEach((layer) => {
      const totalH = layer.reduce((sum, id) => sum + nodeSize(spec.nodes.find((n) => n.id === id)!).h, 0) + (layer.length - 1) * COL_GAP;
      const startY = (svgH - titleOffset - totalH) / 2 + titleOffset;
      let cy = startY;
      layer.forEach((id) => {
        const p = positions.get(id)!;
        const sz = nodeSize(spec.nodes.find((n) => n.id === id)!);
        p.y = cy;
        cy += sz.h + COL_GAP;
      });
    });

    const layoutNodes: LayoutNode[] = spec.nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: 0, y: titleOffset, w: NODE_W, h: NODE_H };
      return { id: n.id, x: p.x, y: p.y, w: p.w, h: p.h, spec: n };
    });
    return { nodes: layoutNodes, edges: spec.edges, svgW, svgH };
  }
}

// ── Edge path ────────────────────────────────────────────────────────────────

function edgePath(from: LayoutNode, to: LayoutNode, dir: "TB" | "LR"): string {
  let x1: number, y1: number, x2: number, y2: number;
  let cx1: number, cy1: number, cx2: number, cy2: number;

  if (dir === "TB") {
    x1 = from.x + from.w / 2; y1 = from.y + from.h;
    x2 = to.x + to.w / 2;     y2 = to.y;
    const mid = (y1 + y2) / 2;
    cx1 = x1; cy1 = mid;
    cx2 = x2; cy2 = mid;
  } else {
    x1 = from.x + from.w; y1 = from.y + from.h / 2;
    x2 = to.x;             y2 = to.y + to.h / 2;
    const mid = (x1 + x2) / 2;
    cx1 = mid; cy1 = y1;
    cx2 = mid; cy2 = y2;
  }
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// ── Node SVG ─────────────────────────────────────────────────────────────────

function NodeShape({
  node,
  colors,
}: {
  node: LayoutNode;
  colors: { fill: string; border: string; text: string };
}) {
  const { x, y, w, h, spec } = node;
  const shape = spec.shape ?? "rect";
  const lines = spec.label.split("\\n");

  const textEl = (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + h / 2 + (i - (lines.length - 1) / 2) * 15}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontFamily="var(--font-geist-mono, monospace)"
          fill={colors.text}
        >
          {line}
        </text>
      ))}
    </>
  );

  if (shape === "circle") {
    return (
      <>
        <circle
          cx={x + w / 2}
          cy={y + h / 2}
          r={w / 2}
          fill={colors.fill}
          stroke={colors.border}
          strokeWidth="1.5"
        />
        {textEl}
      </>
    );
  }

  if (shape === "diamond") {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const hw = w / 2;
    const hh = h / 2;
    return (
      <>
        <polygon
          points={`${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`}
          fill={colors.fill}
          stroke={colors.border}
          strokeWidth="1.5"
        />
        {textEl}
      </>
    );
  }

  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill={colors.fill}
        stroke={colors.border}
        strokeWidth="1.5"
      />
      {textEl}
    </>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function DiagramRenderer({ code }: { code: string }) {
  const result = useMemo(() => {
    try {
      const spec: DiagramSpec = JSON.parse(code.trim());
      if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges)) {
        throw new Error("Invalid diagram spec");
      }
      return { ok: true as const, spec };
    } catch {
      return { ok: false as const };
    }
  }, [code]);

  if (!result.ok) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-app-border bg-[#0c0d11] p-4 text-[12px] text-app-muted/70">
        <code>{code}</code>
      </pre>
    );
  }

  const { spec } = result;
  const dir = spec.direction ?? "TB";
  const { nodes, edges, svgW, svgH } = layoutDiagram(spec);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const titleOffset = spec.title ? TITLE_H + 8 : 0;

  return (
    <div className="diagram-container my-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxHeight: "520px", minHeight: "180px" }}
        aria-label={spec.title ?? "Diagram"}
      >
        {/* Background */}
        <rect x="0" y="0" width={svgW} height={svgH} fill="#0c0d11" rx="10" />

        {/* Title */}
        {spec.title && (
          <text
            x={svgW / 2}
            y={PAD / 2 + 4}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-geist-mono, monospace)"
            fill="#7878a0"
            letterSpacing="0.1em"
          >
            {spec.title.toUpperCase()}
          </text>
        )}

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (!from || !to) return null;
          const d = edgePath(from, to, dir);
          const midX = (from.x + from.w / 2 + to.x + to.w / 2) / 2;
          const midY = (from.y + from.h / 2 + to.y + to.h / 2) / 2;
          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke="rgba(120,120,160,0.4)"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
              {e.label && (
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--font-geist-mono, monospace)"
                  fill="#7878a0"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(120,120,160,0.5)" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map((node) => {
          const colorKey: NodeColor = node.spec.color as NodeColor ?? "muted";
          const colors = COLOR_MAP[colorKey] ?? COLOR_MAP.muted;
          return (
            <NodeShape key={node.id} node={node} colors={colors} />
          );
        })}
      </svg>
    </div>
  );
}
