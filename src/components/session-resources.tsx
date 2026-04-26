import { ExternalLink } from "lucide-react";
import { getDomainForTopic, type TrackId } from "@/lib/topics";
import resourcesData from "../../data/resources.json";

type Resource = {
  title: string;
  url: string;
  type: string;
  _affiliate_note?: string;
};

const RESOURCES = resourcesData as Record<string, Resource[]>;

const TYPE_LABELS: Record<string, string> = {
  free_course: "Free course",
  paid_course: "Course",
  free_book: "Free book",
  paid_book: "Book",
  documentation: "Docs",
  video: "Video series",
  blog: "Blog",
  free_resource: "Resource",
};

function pickResources(topic: string, track: TrackId): Resource[] {
  const domain = getDomainForTopic(topic)?.domain;
  if (domain && RESOURCES[domain]?.length) {
    return RESOURCES[domain].slice(0, 3);
  }
  const fallbackKey = track === "swe" ? "default_swe" : "default_ml";
  return (RESOURCES[fallbackKey] ?? []).slice(0, 3);
}

type SessionResourcesProps = {
  topic: string;
  track: TrackId;
};

export function SessionResources({ topic, track }: SessionResourcesProps) {
  const resources = pickResources(topic, track);
  if (resources.length === 0) return null;

  return (
    <div className="rounded-xl border border-app-border/70 bg-app-panel/40 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-app-muted/70">
        Want to go deeper?
      </p>
      <ul className="mt-3 space-y-1">
        {resources.map((resource) => (
          <li key={resource.url}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-app-panel-2/60"
            >
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-muted/50 transition-colors group-hover:text-app-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-5 text-app-fg/85 group-hover:text-app-fg">
                  {resource.title}
                </p>
                <p className="text-[11px] text-app-muted/50">
                  {TYPE_LABELS[resource.type] ?? resource.type}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
