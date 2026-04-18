"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ML_TAXONOMY, SWE_TAXONOMY, type TopicDomain, type TrackId } from "@/lib/topics";
import { DOMAIN_COLORS, TRACKS, TRACK_ORDER } from "@/lib/tracks";
import { cn } from "@/lib/utils";

function filterTaxonomy(taxonomy: TopicDomain[], query: string): TopicDomain[] {
  const q = query.trim().toLowerCase();
  if (!q) return taxonomy;
  return taxonomy
    .map((domain) => ({
      ...domain,
      sections: domain.sections
        .map((section) => ({
          ...section,
          topics: section.topics.filter((t) => t.toLowerCase().includes(q)),
        }))
        .filter((s) => s.topics.length > 0),
    }))
    .filter((d) => d.sections.length > 0);
}

export function TopicCatalog() {
  const [track, setTrack] = useState<TrackId>("ml");
  const [query, setQuery] = useState("");

  const taxonomy = track === "swe" ? SWE_TAXONOMY : ML_TAXONOMY;
  const filtered = useMemo(() => filterTaxonomy(taxonomy, query), [taxonomy, query]);
  const totalTopics = useMemo(
    () => taxonomy.flatMap((d) => d.sections.flatMap((s) => s.topics)).length,
    [taxonomy],
  );
  const domainCount = taxonomy.length;

  return (
    <div>
      <div className="mb-10 text-center">
        <h2 className="mb-3 text-2xl font-bold text-app-fg">
          {totalTopics} topics across {domainCount} domains
        </h2>
        <p className="text-app-muted">
          {track === "swe"
            ? "Frontend, backend, system design, UI/UX, and CS fundamentals — calibrated for senior SWE loops."
            : "Classical models to LLM internals to RL theory — calibrated for RE / MLE / RS / AS loops."}
        </p>
      </div>

      <div className="mx-auto mb-8 flex max-w-xl flex-col items-center gap-3 sm:flex-row">
        <div
          role="tablist"
          aria-label="Choose a track"
          className="flex gap-1 rounded-xl border border-app-border bg-app-panel p-1 shadow-sm"
        >
          {TRACK_ORDER.map((id) => {
            const meta = TRACKS[id];
            const isActive = track === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTrack(id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40",
                  isActive
                    ? "bg-app-panel-2 text-app-fg shadow-sm"
                    : "text-app-muted hover:text-app-fg",
                )}
                title={meta.tagline}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-app-muted/60"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${track === "swe" ? "SWE" : "ML"} topics…`}
            className="w-full rounded-xl border border-app-border bg-app-panel px-3 py-2 pl-9 text-[13px] text-app-fg placeholder:text-app-muted/50 focus:border-app-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-app-muted">
          No topics match &ldquo;{query}&rdquo; in the {TRACKS[track].label} track.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((domain) => {
            const color = DOMAIN_COLORS[domain.name] ?? "#10b981";
            const topicCount = domain.sections.flatMap((s) => s.topics).length;
            return (
              <div
                key={domain.name}
                className="rounded-xl border border-app-border bg-app-panel p-5 transition-colors hover:[border-color:var(--card-hover-border)]"
                style={{ borderTop: `2px solid ${color}33` }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <h3 className="text-[13px] font-semibold text-app-fg">{domain.name}</h3>
                  <span className="ml-auto rounded-full bg-app-panel-2 px-2 py-0.5 text-[11px] text-app-muted">
                    {topicCount}
                  </span>
                </div>
                {domain.sections.map((section) => (
                  <div key={`${domain.name}-${section.title}`} className="mb-3 last:mb-0">
                    {section.title && domain.sections.length > 1 && (
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-app-muted/50">
                        {section.title}
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {section.topics.map((topic) => (
                        <li key={topic} className="text-[12px] leading-5 text-app-muted/80">
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
