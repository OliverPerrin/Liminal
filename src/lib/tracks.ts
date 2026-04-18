import type { TrackId } from "@/lib/topics";

export type TrackMeta = {
  id: TrackId;
  label: string;
  shortLabel: string;
  tagline: string;
  roles: string[];
  accent: string;
};

export const TRACKS: Record<TrackId, TrackMeta> = {
  ml: {
    id: "ml",
    label: "ML / Research",
    shortLabel: "ML",
    tagline: "Research Engineer, MLE, Research Scientist, Applied Scientist",
    roles: ["Research Engineer", "MLE", "Research Scientist", "Applied Scientist"],
    accent: "#10b981",
  },
  swe: {
    id: "swe",
    label: "Software Engineering",
    shortLabel: "SWE",
    tagline: "Frontend, Backend, Fullstack, System Design, UI/UX",
    roles: ["Frontend", "Backend", "Fullstack", "System Design", "UI/UX"],
    accent: "#38bdf8",
  },
};

export const TRACK_ORDER: TrackId[] = ["ml", "swe"];

export const DOMAIN_COLORS: Record<string, string> = {
  // ML
  "Classical ML": "#f59e0b",
  "Deep Learning": "#818cf8",
  "Reinforcement Learning": "#2dd4bf",
  "Training Engineering": "#38bdf8",
  "Systems and MLOps": "#fb923c",
  // SWE
  "Frontend": "#2dd4bf",
  "Backend": "#818cf8",
  "System Design": "#fb923c",
  "UI / UX": "#c084fc",
  "CS Fundamentals": "#10b981",
};

export function getDomainColor(name: string): string {
  return DOMAIN_COLORS[name] ?? "#10b981";
}

export function isTrackId(value: unknown): value is TrackId {
  return value === "ml" || value === "swe";
}
