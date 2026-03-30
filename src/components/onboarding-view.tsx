"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StarStory } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type OnboardingViewProps = {
  userId: string;
};

type ParseResumeResponse = {
  resume_text: string;
  star_stories: StarStory[];
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

export function OnboardingView({ userId }: OnboardingViewProps) {
  const router = useRouter();
  const [resumeText, setResumeText] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [stories, setStories] = useState<StarStory[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canSave = useMemo(() => resumeText.trim().length > 0 && stories.length > 0, [resumeText, stories]);

  function updateStory(index: number, patch: Partial<StarStory>) {
    setStories((prev) => prev.map((story, i) => (i === index ? { ...story, ...patch } : story)));
  }

  function addStory() {
    setStories((prev) => [...prev, { ...EMPTY_STORY, id: crypto.randomUUID() }]);
  }

  function removeStory(index: number) {
    setStories((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleParseResume() {
    if (!resumeFile) {
      setError("Please upload a PDF resume first.");
      return;
    }

    setError(null);
    setWarning(null);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);

      const parseResponse = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!parseResponse.ok) {
        const details = await parseResponse.text();
        throw new Error(details || "Failed to parse resume");
      }

      const payload = (await parseResponse.json()) as ParseResumeResponse;
      const parsedStories = (payload.star_stories || []).map((story) => ({
        ...story,
        id: story.id || crypto.randomUUID(),
      }));

      setResumeText(payload.resume_text || "");
      setStories(parsedStories);

      if (parsedStories.length === 0) {
        setWarning(
          "Resume text was extracted, but no STAR stories were generated. Add stories manually or run generation again.",
        );
      }

      const supabase = getSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(`${userId}/resume.pdf`, resumeFile, { upsert: true });

      if (uploadError) {
        const message = uploadError.message || "";
        if (message.toLowerCase().includes("bucket not found")) {
          const storageWarning =
            "Resume storage bucket 'resumes' is missing. PDF file was not saved to storage.";

          setWarning((prev) => (prev ? `${prev} ${storageWarning}` : storageWarning));
        } else {
          throw uploadError;
        }
      }
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Resume parse failed";
      setError(message);
    } finally {
      setParsing(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    setWarning(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          resume_text: resumeText,
          star_stories: stories,
          extra_context: extraContext,
        },
        { onConflict: "user_id" },
      );

      if (profileError) {
        throw profileError;
      }

      router.push("/home");
      router.refresh();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save profile";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="rounded-xl border border-app-border bg-app-panel p-6">
        <h1 className="text-xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-app-muted">
          Upload a resume PDF, generate STAR stories, then fine-tune your context before starting sessions.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Resume PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleParseResume}
              disabled={parsing || !resumeFile}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {parsing ? "Parsing..." : "Extract + Generate STAR Stories"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-app-border bg-app-panel p-6">
        <h2 className="text-lg font-semibold">Resume Text</h2>
        <textarea
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
          rows={10}
          className="mt-3 w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
        />
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
          {stories.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm text-app-muted">
              No STAR stories yet. Click "Extract + Generate STAR Stories" or add one manually.
            </p>
          ) : null}

          {stories.map((story, index) => (
            <article key={story.id || `story-${index}`} className="rounded-lg border border-app-border bg-app-panel-2 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">Story {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeStory(index)}
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
      </section>

      <section className="rounded-xl border border-app-border bg-app-panel p-6">
        <h2 className="text-lg font-semibold">Additional Context</h2>
        <textarea
          rows={4}
          value={extraContext}
          onChange={(event) => setExtraContext(event.target.value)}
          placeholder="Anything else you want the AI to know about you?"
          className="mt-3 w-full rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm"
        />

        {warning ? <p className="mt-3 text-sm text-amber-300">{warning}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={!canSave || saving}
          className="mt-5 rounded-lg bg-app-accent px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile and Continue"}
        </button>
      </section>
    </main>
  );
}
