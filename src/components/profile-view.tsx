"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
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

export function ProfileView({ userId }: ProfileViewProps) {
  const [resumeText, setResumeText] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [stories, setStories] = useState<StarStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
        setStories(((data.star_stories as StarStory[]) || []).map((story) => ({ ...story, id: story.id || crypto.randomUUID() })));
      }

      setLoading(false);
    }

    loadProfile();
  }, [userId]);

  function updateStory(index: number, patch: Partial<StarStory>) {
    setStories((prev) => prev.map((story, i) => (i === index ? { ...story, ...patch } : story)));
  }

  function addStory() {
    setStories((prev) => [...prev, { ...EMPTY_STORY, id: crypto.randomUUID() }]);
  }

  function deleteStory(index: number) {
    setStories((prev) => prev.filter((_, i) => i !== index));
  }

  async function regenerateStories() {
    const response = await fetch("/api/parse-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: resumeText }),
    });

    if (!response.ok) {
      setStatus("Failed to regenerate STAR stories.");
      return;
    }

    const payload = (await response.json()) as { star_stories: StarStory[] };
    setStories((payload.star_stories || []).map((story) => ({ ...story, id: story.id || crypto.randomUUID() })));
    setStatus("STAR stories regenerated from resume text.");
  }

  async function saveProfile() {
    setSaving(true);
    setStatus(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        resume_text: resumeText,
        star_stories: stories,
        extra_context: extraContext,
      })
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Profile saved.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-app-muted">Loading profile...</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Profile</h1>
            <button
              type="button"
              onClick={regenerateStories}
              className="rounded border border-app-border px-3 py-1 text-xs text-app-muted"
            >
              Regenerate STAR stories
            </button>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm">Resume text</span>
            <textarea
              rows={10}
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block space-y-2">
            <span className="text-sm">Additional context</span>
            <textarea
              rows={4}
              value={extraContext}
              onChange={(event) => setExtraContext(event.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm"
            />
          </label>
        </section>

        <section className="rounded-xl border border-app-border bg-app-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">STAR Stories</h2>
            <button
              type="button"
              onClick={addStory}
              className="rounded border border-app-border px-3 py-1 text-xs text-app-muted"
            >
              Add story
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {stories.map((story, index) => (
              <article key={story.id || `profile-story-${index}`} className="rounded-lg border border-app-border bg-app-panel-2 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Story {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => deleteStory(index)}
                    className="text-xs text-red-300"
                  >
                    Delete
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    placeholder="Title"
                    value={story.title}
                    onChange={(event) => updateStory(index, { title: event.target.value })}
                    className="rounded border border-app-border bg-app-panel px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Behavioral Question"
                    value={story.question}
                    onChange={(event) => updateStory(index, { question: event.target.value })}
                    className="rounded border border-app-border bg-app-panel px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {([
                    ["situation", "Situation"],
                    ["task", "Task"],
                    ["action", "Action"],
                    ["result", "Result"],
                  ] as const).map(([field, label]) => (
                    <textarea
                      key={field}
                      rows={2}
                      placeholder={label}
                      value={story[field]}
                      onChange={(event) => updateStory(index, { [field]: event.target.value })}
                      className="w-full rounded border border-app-border bg-app-panel px-2 py-1.5 text-sm"
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {status ? <p className="text-sm text-app-muted">{status}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
