"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, UploadCloud } from "lucide-react";
import type { StarStory } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type OnboardingViewProps = {
  userId: string;
};

type ParseResumeResponse = {
  resume_text: string;
  star_stories: StarStory[];
};

function getReadableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string };
    if (e.message) {
      const extras = [e.details, e.hint].filter(Boolean).join(" | ");
      return extras ? `${e.message} (${extras})` : e.message;
    }
  }
  return fallback;
}

const EMPTY_STORY: StarStory = {
  id: "",
  title: "",
  question: "",
  situation: "",
  task: "",
  action: "",
  result: "",
};

const STEPS = [
  { n: 1, label: "Upload resume" },
  { n: 2, label: "Review stories" },
  { n: 3, label: "Add context" },
];

type StoryCardProps = {
  story: StarStory;
  index: number;
  onUpdate: (index: number, patch: Partial<StarStory>) => void;
  onRemove: (index: number) => void;
};

function StoryCard({ story, index, onUpdate, onRemove }: StoryCardProps) {
  const [expanded, setExpanded] = useState(index < 2);

  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-panel-2">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent/15 text-[11px] font-bold text-app-accent">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-app-fg">
            {story.title || `Story ${index + 1}`}
          </p>
          {story.question && (
            <p className="truncate text-[11px] text-app-muted/70">{story.question}</p>
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
            onClick={() => onRemove(index)}
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
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/70">
                Title
              </label>
              <input
                placeholder="e.g. Reduced training time by 40%"
                value={story.title}
                onChange={(e) => onUpdate(index, { title: e.target.value })}
                className="w-full rounded-lg border border-app-border bg-app-panel px-3 py-2 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/70">
                Behavioral Question
              </label>
              <input
                placeholder="Tell me about a time you…"
                value={story.question}
                onChange={(e) => onUpdate(index, { question: e.target.value })}
                className="w-full rounded-lg border border-app-border bg-app-panel px-3 py-2 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {(
              [
                ["situation", "Situation", "The context and background"],
                ["task", "Task", "What you needed to accomplish"],
                ["action", "Action", "What you specifically did"],
                ["result", "Result", "The measurable outcome"],
              ] as const
            ).map(([field, label, placeholder]) => (
              <div key={field}>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-app-muted/70">
                  {label}
                </label>
                <textarea
                  rows={2}
                  placeholder={placeholder}
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

export function OnboardingView({ userId }: OnboardingViewProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [resumeText, setResumeText] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [stories, setStories] = useState<StarStory[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const canProceedToStep2 = resumeText.trim().length > 0 || stories.length > 0;
  const canSave = useMemo(() => resumeText.trim().length > 0, [resumeText]);

  function updateStory(index: number, patch: Partial<StarStory>) {
    setStories((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStory() {
    setStories((prev) => [...prev, { ...EMPTY_STORY, id: crypto.randomUUID() }]);
  }

  function removeStory(index: number) {
    setStories((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setResumeFile(file);
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

      const res = await fetch("/api/parse-resume", { method: "POST", body: formData });
      if (!res.ok) {
        const details = await res.text();
        throw new Error(details || "Failed to parse resume");
      }

      const payload = (await res.json()) as ParseResumeResponse;
      const parsedStories = (payload.star_stories || []).map((s) => ({
        ...s,
        id: s.id || crypto.randomUUID(),
      }));

      setResumeText(payload.resume_text || "");
      setStories(parsedStories);

      if (parsedStories.length === 0) {
        setWarning("Resume extracted but no STAR stories generated. Add them manually below.");
      }

      const supabase = getSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(`${userId}/resume.pdf`, resumeFile, { upsert: true });

      if (uploadError) {
        const msg = uploadError.message || "";
        if (msg.toLowerCase().includes("bucket not found")) {
          setWarning((p) => {
            const note = "Resume PDF storage is not configured. Text was extracted successfully.";
            return p ? `${p} ${note}` : note;
          });
        } else {
          throw uploadError;
        }
      }

      setStep(2);
    } catch (e) {
      setError(getReadableError(e, "Resume parse failed"));
    } finally {
      setParsing(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);

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

      if (profileError) throw profileError;
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError(getReadableError(e, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                  step === s.n
                    ? "bg-app-accent text-white"
                    : step > s.n
                    ? "bg-app-accent/25 text-app-accent"
                    : "bg-app-panel-2 text-app-muted/50",
                )}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={cn(
                  "text-[13px] font-medium transition-colors",
                  step === s.n ? "text-app-fg" : "text-app-muted/50",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-10 transition-colors",
                  step > s.n ? "bg-app-accent/30" : "bg-app-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-app-fg">Upload your resume</h1>
            <p className="mt-1.5 text-[14px] text-app-muted">
              We&apos;ll extract your experience and generate personalized STAR stories for behavioral interviews.
            </p>
          </div>

          {/* Drag-and-drop zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragOver
                ? "border-app-accent/60 bg-app-accent/5"
                : resumeFile
                ? "border-app-accent/40 bg-app-accent/5"
                : "border-app-border hover:border-app-border/80",
            )}
          >
            <UploadCloud
              className={cn("h-10 w-10", resumeFile ? "text-app-accent" : "text-app-muted/40")}
            />
            {resumeFile ? (
              <>
                <p className="text-[14px] font-semibold text-app-fg">{resumeFile.name}</p>
                <p className="text-[13px] text-app-muted/60">
                  {(resumeFile.size / 1024).toFixed(0)} KB · PDF
                </p>
                <button
                  type="button"
                  onClick={() => setResumeFile(null)}
                  className="text-[12px] text-red-400/70 hover:text-red-300"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[14px] font-medium text-app-fg/80">
                    Drop your PDF here, or{" "}
                    <label className="cursor-pointer text-app-accent underline underline-offset-2">
                      browse
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </p>
                  <p className="mt-1 text-[12px] text-app-muted/50">PDF only · max 10 MB</p>
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-[13px] text-red-300">
              {error}
            </p>
          )}
          {warning && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-[13px] text-amber-300">
              {warning}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleParseResume}
              disabled={parsing || !resumeFile}
              className="flex items-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow shadow-app-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {parsing ? "Extracting…" : "Extract + Generate STAR Stories"}
            </button>
            {canProceedToStep2 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-app-border px-4 py-2.5 text-[14px] text-app-muted transition-colors hover:text-app-fg"
              >
                Skip to review
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Review stories ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-app-fg">Review your STAR stories</h1>
              <p className="mt-1.5 text-[14px] text-app-muted">
                These stories power the behavioral interview prep in every session. Edit, add, or remove as needed.
              </p>
            </div>
            <button
              type="button"
              onClick={addStory}
              className="shrink-0 rounded-lg border border-app-border px-3 py-1.5 text-[13px] text-app-muted transition-colors hover:border-app-border/80 hover:text-app-fg"
            >
              + Add story
            </button>
          </div>

          {stories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-app-border px-6 py-10 text-center text-[13px] text-app-muted/60">
              No STAR stories yet. Click "+ Add story" to create one manually.
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map((story, index) => (
                <StoryCard
                  key={story.id || `story-${index}`}
                  story={story}
                  index={index}
                  onUpdate={updateStory}
                  onRemove={removeStory}
                />
              ))}
            </div>
          )}

          {/* Resume text — collapsible */}
          <details className="group rounded-xl border border-app-border bg-app-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium text-app-fg/80 hover:text-app-fg">
              <span>Resume text (extracted)</span>
              <ChevronDown className="h-4 w-4 text-app-muted/60 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-app-border px-4 pb-4 pt-3">
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-[13px] text-app-fg/80 focus:border-app-accent/50 focus:outline-none"
              />
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-app-border px-4 py-2.5 text-[14px] text-app-muted transition-colors hover:text-app-fg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-app-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:opacity-90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Extra context + save ──────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-app-fg">Anything else to know?</h1>
            <p className="mt-1.5 text-[14px] text-app-muted">
              Add any context about your background, target roles, or areas to focus on. This goes into every
              session alongside your resume.
            </p>
          </div>

          <textarea
            rows={6}
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="e.g. I'm targeting large language model research roles at FAANG. I have a strong background in RL and want to focus on RLHF, DPO, and training infrastructure topics."
            className="w-full resize-none rounded-xl border border-app-border bg-app-panel px-4 py-3 text-[14px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-2 focus:ring-app-accent/15"
          />

          <div className="rounded-xl border border-app-border bg-app-panel-2 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-app-muted/60">
              Your profile will include
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-[13px] text-app-fg/80">
                <div className="h-1.5 w-1.5 rounded-full bg-app-accent" />
                Resume text ({resumeText.length > 0 ? `${resumeText.split(/\s+/).length} words` : "empty"})
              </div>
              <div className="flex items-center gap-2 text-[13px] text-app-fg/80">
                <div className="h-1.5 w-1.5 rounded-full bg-app-accent" />
                {stories.length} STAR {stories.length === 1 ? "story" : "stories"}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-app-fg/80">
                <div
                  className={cn("h-1.5 w-1.5 rounded-full", extraContext.trim() ? "bg-app-accent" : "bg-app-border")}
                />
                Extra context ({extraContext.trim() ? "added" : "none"})
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-[13px] text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-app-border px-4 py-2.5 text-[14px] text-app-muted transition-colors hover:text-app-fg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={!canSave || saving}
              className="flex items-center gap-2 rounded-lg bg-app-accent px-6 py-2.5 text-[14px] font-semibold text-white shadow shadow-app-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save and start studying"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
