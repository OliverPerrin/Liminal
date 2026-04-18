import type { TrackId } from "@/lib/topics";

export type StageCard = {
  n: number;
  color: string;
  short: string;
  title: string;
  desc: string;
};

export const ML_STAGES: StageCard[] = [
  {
    n: 1,
    color: "#f59e0b",
    short: "Overview",
    title: "Big Picture",
    desc: "2–3 sentences on what the concept solves and where it appears in real production systems. No jargon, no math — just the mental frame.",
  },
  {
    n: 2,
    color: "#2dd4bf",
    short: "Intuition",
    title: "Intuition + Visual",
    desc: "Core idea in plain language, then a structured diagram with tensor dimensions and data flow annotated. Mandatory for all DL architectures.",
  },
  {
    n: 3,
    color: "#818cf8",
    short: "Math",
    title: "The Math",
    desc: "Full step-by-step derivation with every term motivated. Not just what each symbol is, but what breaks if you remove it.",
  },
  {
    n: 4,
    color: "#38bdf8",
    short: "Code",
    title: "Implementation",
    desc: "Production-quality PyTorch with type annotations, every non-obvious line commented, and an explicit test snippet at the end.",
  },
  {
    n: 5,
    color: "#fb923c",
    short: "Questions",
    title: "Interview Questions",
    desc: "5 graded questions: conceptual, implementation, applied, systems-level (latency/memory/scale), and failure modes. Ordered from warm-up to hard.",
  },
  {
    n: 6,
    color: "#c084fc",
    short: "Retrieval",
    title: "Retrieval Check",
    desc: "Conversational drill. The AI asks, waits for your answer, then tells you precisely what was right, wrong, or missing — no score, just a senior engineer interviewing you.",
  },
];

export const SWE_STAGES: StageCard[] = [
  {
    n: 1,
    color: "#f59e0b",
    short: "Overview",
    title: "Big Picture",
    desc: "2–3 sentences on what the concept is, where it shows up in real production systems, and why an interviewer cares.",
  },
  {
    n: 2,
    color: "#2dd4bf",
    short: "Intuition",
    title: "Intuition + Visual",
    desc: "Core idea in plain language, then a structured diagram showing request flow, components, or state transitions with every edge annotated.",
  },
  {
    n: 3,
    color: "#818cf8",
    short: "Internals",
    title: "Internals & Complexity",
    desc: "Under the hood: data structures, time and space complexity, edge cases, failure modes, and the exact tradeoffs a senior engineer would weigh.",
  },
  {
    n: 4,
    color: "#38bdf8",
    short: "Code",
    title: "Implementation",
    desc: "Clean, idiomatic reference implementation with type signatures, the non-obvious lines explained, and a short test driving it.",
  },
  {
    n: 5,
    color: "#fb923c",
    short: "Questions",
    title: "Interview Questions",
    desc: "5 graded questions: conceptual, coding, applied/design, systems-level (scale, latency, cost), and failure modes — ordered warm-up to hard.",
  },
  {
    n: 6,
    color: "#c084fc",
    short: "Retrieval",
    title: "Retrieval Check",
    desc: "Conversational drill. The AI asks a targeted follow-up, waits for your answer, then calls out exactly what was right, wrong, or missing.",
  },
];

export function getStages(track: TrackId): StageCard[] {
  return track === "swe" ? SWE_STAGES : ML_STAGES;
}
