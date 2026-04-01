"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { StarStory } from "@/lib/types";

type ProfileViewProps = {
  userId: string;
};

const EMPTY_STORY: StarStory = {
  id: "",
  title: "",
  question: "",
  situation: "",
  task: "",
  action: "",
  result: "",
};

type StoryCardProps = {
  story: StarStory;
  index: number;
  onUpdate: (index: number, patch: Partial<StarStory>) => void;
  onDelete: (index: number) => void;
};

function StoryCard({ story, index, onUpdate, onDelete }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-panel-2 transition-colors hover:border-[#3a3b52]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent/15 text-[11px] font-bold text-app-accent">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-app-fg">
            {story.title || `Story ${index + 1}`}
          </p>
          {story.question && (
            <p className="mt-0.5 truncate text-[11px] text-app-muted/70">{story.question}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="rounded p-1 text-app-muted/60 transition-colors hover:text-app-fg"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="text-[11px] text-red-400/70 transition-colors hover:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-app-border px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/60">
                Title
              </label>
              <input
                value={story.title}
                onChange={(e) => onUpdate(index, { title: e.target.value })}
                placeholder="Short descriptive title"
                className="w-full rounded-lg border border-app-border bg-app-panel px-3 py-2 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/60">
                Behavioral Question
              </label>
              <input
                value={story.question}
                onChange={(e) => onUpdate(index, { question: e.target.value })}
                placeholder="Tell me about a time you…"
                className="w-full rounded-lg border border-app-border bg-app-panel px-3 py-2 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {(
              [
                ["situation", "Situation"],
                ["task", "Task"],
                ["action", "Action"],
                ["result", "Result"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/60">
                  {label}
                </label>
                <textarea
                  rows={3}
                  value={story[field]}
                  onChange={(e) => onUpdate(index, { [field]: e.target.value })}
                  className="w-full resize-none rounded-lg border border-app-border bg-app-panel px-3 py-2 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileView({ userId }: ProfileViewProps) {
  const [resumeText, setResumeText] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [stories, setStories] = useState<StarStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("profiles")
        .select("resume_text,star_stories,extra_context")
        .eq("user_id", userId)
        .single();

      if (data) {
        setResumeText(data.resume_text || "");
        setExtraContext(data.extra_context || "");
        setStories(
          ((data.star_stories as StarStory[]) || []).map((s) => ({
            ...s,
            id: s.id || crypto.randomUUID(),
          })),
        );
      }
      setLoading(false);
    }

    void loadProfile();
  }, [userId]);

  function updateStory(index: number, patch: Partial<StarStory>) {
    setStories((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStory() {
    setStories((prev) => [...prev, { ...EMPTY_STORY, id: crypto.randomUUID() }]);
  }

  function deleteStory(index: number) {
    setStories((prev) => prev.filter((_, i) => i !== index));
  }

  async function regenerateStories() {
    if (!resumeText.trim()) {
      setStatus({ type: "error", message: "Add resume text before regenerating." });
      return;
    }

    setRegenerating(true);
    setStatus(null);

    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText }),
      });

      if (!res.ok) throw new Error("Regeneration failed");

      const payload = (await res.json()) as { star_stories: StarStory[] };
      setStories(
        (payload.star_stories || []).map((s) => ({ ...s, id: s.id || crypto.randomUUID() })),
      );
      setStatus({ type: "success", message: `${payload.star_stories.length} STAR stories regenerated.` });
    } catch {
      setStatus({ type: "error", message: "Failed to regenerate STAR stories." });
    } finally {
      setRegenerating(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setStatus(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ resume_text: resumeText, star_stories: stories, extra_context: extraContext })
      .eq("user_id", userId);

    setSaving(false);
    setStatus(
      error
        ? { type: "error", message: error.message }
        : { type: "success", message: "Profile saved." },
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-[14px] text-app-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-app-fg">Profile</h1>
            <p className="mt-1 text-[13px] text-app-muted">
              Your resume and STAR stories are injected into every session.
            </p>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-app-accent px-4 py-2 text-[13px] font-semibold text-white shadow shadow-app-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {status && (
          <div
            className={cn(
              "mb-5 rounded-lg border px-4 py-3 text-[13px]",
              status.type === "success"
                ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
                : "border-red-500/25 bg-red-500/8 text-red-300",
            )}
          >
            {status.message}
          </div>
        )}

        <div className="space-y-5">
          {/* Resume text */}
          <section className="rounded-xl border border-app-border bg-app-panel p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-app-fg">Resume text</h2>
            <textarea
              rows={10}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full resize-none rounded-lg border border-app-border bg-app-panel-2 px-3 py-2.5 text-[13px] text-app-fg/80 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
            />
            <p className="mt-2 text-[11px] text-app-muted/50">
              {resumeText.split(/\s+/).filter(Boolean).length} words
            </p>
          </section>

          {/* STAR stories */}
          <section className="rounded-xl border border-app-border bg-app-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-app-fg">STAR Stories</h2>
                <p className="mt-0.5 text-[12px] text-app-muted/60">
                  {stories.length} {stories.length === 1 ? "story" : "stories"} · used in behavioral prep
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={regenerateStories}
                  disabled={regenerating || !resumeText.trim()}
                  className="flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-[12px] text-app-muted transition-colors hover:border-app-border/80 hover:text-app-fg disabled:opacity-40"
                >
                  {regenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={addStory}
                  className="rounded-lg border border-app-border px-3 py-1.5 text-[12px] text-app-muted transition-colors hover:border-app-border/80 hover:text-app-fg"
                >
                  + Add
                </button>
              </div>
            </div>

            {stories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-app-border px-6 py-10 text-center text-[13px] text-app-muted/50">
                No STAR stories yet. Click &quot;+ Add&quot; or &quot;Regenerate&quot; from resume text.
              </div>
            ) : (
              <div className="space-y-3">
                {stories.map((story, index) => (
                  <StoryCard
                    key={story.id || `profile-story-${index}`}
                    story={story}
                    index={index}
                    onUpdate={updateStory}
                    onDelete={deleteStory}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Extra context */}
          <section className="rounded-xl border border-app-border bg-app-panel p-5">
            <h2 className="mb-1.5 text-[14px] font-semibold text-app-fg">Additional context</h2>
            <p className="mb-3 text-[12px] text-app-muted/60">
              Target roles, focus areas, or anything else the AI should know about you.
            </p>
            <textarea
              rows={5}
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. I'm targeting LLM research roles. Strong RL background. Want to focus on training infrastructure and RLHF."
              className="w-full resize-none rounded-lg border border-app-border bg-app-panel-2 px-3 py-2.5 text-[13px] text-app-fg/80 placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
            />
          </section>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow shadow-app-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
