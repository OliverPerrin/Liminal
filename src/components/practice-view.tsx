"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Code, X } from "lucide-react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/app-header";
import { MarkdownMessage } from "@/components/markdown-message";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { SessionMessage } from "@/lib/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Stage config ────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  label: "Big Picture" },
  2: { color: "#2dd4bf", bg: "rgba(45,212,191,0.08)",  label: "Intuition + Visual" },
  3: { color: "#818cf8", bg: "rgba(129,140,248,0.08)", label: "The Math" },
  4: { color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  label: "Implementation" },
  5: { color: "#fb923c", bg: "rgba(251,146,60,0.08)",  label: "Interview Questions" },
  6: { color: "#c084fc", bg: "rgba(192,132,252,0.08)", label: "Retrieval Check" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

type Language = "python" | "pytorch" | "numpy";

const LANG_LABELS: Record<Language, string> = {
  python:  "Python",
  pytorch: "PyTorch",
  numpy:   "NumPy",
};

function getDefaultCode(topic: string, lang: Language): string {
  const header = `# Implement ${topic || "the concept"} from scratch\n# Use your session notes on the left as reference\n\n`;
  if (lang === "pytorch") {
    return `${header}import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\n`;
  }
  if (lang === "numpy") {
    return `${header}import numpy as np\n\n`;
  }
  return header;
}

// Group assistant messages by stage number
function groupByStage(messages: SessionMessage[]): Map<number, SessionMessage[]> {
  const groups = new Map<number, SessionMessage[]>();
  let currentStage = 0;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const stageMatch = msg.content.match(/STAGE\s+(\d+)/i);
    if (stageMatch) {
      currentStage = parseInt(stageMatch[1]);
    }
    if (currentStage === 0) currentStage = 1;
    const arr = groups.get(currentStage) ?? [];
    arr.push(msg);
    groups.set(currentStage, arr);
  }

  return groups;
}

// ── Component ────────────────────────────────────────────────────────────────

type PracticeViewProps = {
  userId: string;
  topic: string;
  sessionId: string | null;
  initialMessages: SessionMessage[];
};

export function PracticeView({ userId, topic, sessionId, initialMessages }: PracticeViewProps) {
  const [language, setLanguage] = useState<Language>("pytorch");
  const [code, setCode] = useState(() => getDefaultCode(topic, "pytorch"));
  const [feedback, setFeedback] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // Collapsible state for each stage — all collapsed except last
  const stageGroups = groupByStage(initialMessages);
  const stageNums = Array.from(stageGroups.keys()).sort((a, b) => a - b);
  const lastStage = stageNums[stageNums.length - 1] ?? 0;
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>(
    Object.fromEntries(stageNums.map((n) => [n, n === lastStage]))
  );

  const abortRef = useRef<AbortController | null>(null);

  function toggleStage(n: number) {
    setExpandedStages((prev) => ({ ...prev, [n]: !prev[n] }));
  }

  function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    setCode(getDefaultCode(topic, lang));
  }

  function handleClear() {
    setCode(getDefaultCode(topic, language));
    setFeedback("");
    setFeedbackVisible(false);
  }

  const handleFeedback = useCallback(async () => {
    if (isStreaming) return;
    if (!code.trim() || code.trim() === getDefaultCode(topic, language).trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setFeedback("");
    setFeedbackVisible(true);
    setIsStreaming(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("/api/code-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, code, language, user_id: userId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setFeedback("Error fetching feedback. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const data = dataLine.replace(/^data:\s*/, "").trim();
          if (!data || data === "[DONE]") continue;
          try {
            const event = JSON.parse(data) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              setFeedback((prev) => prev + (event.delta?.text ?? ""));
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setFeedback("Error fetching feedback. Please try again.");
      }
    } finally {
      setIsStreaming(false);
    }
  }, [code, isStreaming, language, topic, userId]);

  return (
    <div className="flex h-screen flex-col bg-app-bg text-app-fg overflow-hidden">
      <AppHeader />

      {/* Sub-header breadcrumb */}
      <div className="shrink-0 border-b border-app-border bg-app-panel/80 px-4 py-2.5">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3">
          <Link
            href={sessionId ? `/home?session_id=${sessionId}` : "/home"}
            className="flex items-center gap-1.5 text-[13px] text-app-muted transition-colors hover:text-app-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to session
          </Link>
          <span className="text-app-border">/</span>
          <div className="flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-app-accent" />
            <span className="text-[13px] font-semibold text-app-fg">
              Practice
              {topic && <span className="text-app-muted font-normal"> — {topic}</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left panel: Session notes ── */}
        <div className="flex w-[38%] min-w-0 shrink-0 flex-col border-r border-app-border overflow-hidden">
          <div className="shrink-0 border-b border-app-border px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-app-muted/70">
              Session Notes
            </p>
            {topic && stageNums.length === 0 && (
              <p className="mt-1 truncate text-[11px] text-app-muted/50" title={topic}>
                {topic}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {stageNums.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="mb-2 text-3xl">⌨️</div>
                <h3 className="text-base font-semibold text-app-fg">
                  Practice by implementing from scratch
                </h3>
                <ul className="space-y-2 text-left text-[13px] text-app-muted">
                  <li className="flex gap-2">
                    <span className="text-app-accent">→</span>
                    Write PyTorch or NumPy code from memory — no peeking at docs
                  </li>
                  <li className="flex gap-2">
                    <span className="text-app-accent">→</span>
                    Submit your code and get AI feedback on correctness, style, and edge cases
                  </li>
                  <li className="flex gap-2">
                    <span className="text-app-accent">→</span>
                    Use your session notes on the left as hints when you&apos;re stuck
                  </li>
                </ul>
                <p className="text-[12px] text-app-muted/70">
                  Complete a study session first to unlock session notes for this topic.
                </p>
                <Link
                  href="/home"
                  className="mt-1 rounded-lg bg-app-panel-2 px-4 py-2 text-[13px] font-medium text-app-muted transition-colors hover:text-app-fg"
                >
                  Go to Study →
                </Link>
              </div>
            ) : (
              stageNums.map((stageNum) => {
                const config = STAGE_CONFIG[stageNum];
                const msgs = stageGroups.get(stageNum) ?? [];
                const isOpen = expandedStages[stageNum] ?? false;
                return (
                  <div
                    key={stageNum}
                    className="rounded-lg border border-app-border overflow-hidden"
                    style={{ borderLeftWidth: "3px", borderLeftColor: config?.color ?? "#252535" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStage(stageNum)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-app-panel-2/50"
                      style={{ background: config?.bg ?? "transparent" }}
                    >
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                        style={{
                          background: config?.color ?? "#7878a0",
                          color: "#0e0f14",
                        }}
                      >
                        {stageNum}
                      </span>
                      <span
                        className="flex-1 text-[12px] font-semibold uppercase tracking-wide"
                        style={{ color: config?.color ?? "#7878a0" }}
                      >
                        {config?.label ?? `Stage ${stageNum}`}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-app-muted/60" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-app-muted/60" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-app-border bg-app-bg px-3 py-3">
                        {msgs.map((msg, i) => (
                          <MarkdownMessage key={i} content={msg.content} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {sessionId && (
            <div className="shrink-0 border-t border-app-border p-3">
              <Link
                href={`/home?session_id=${sessionId}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-app-panel-2 py-2 text-[13px] font-medium text-app-muted transition-colors hover:text-app-fg"
              >
                Open Session →
              </Link>
            </div>
          )}
        </div>

        {/* ── Right panel: Code editor ── */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* Language picker */}
          <div className="shrink-0 flex items-center gap-1 border-b border-app-border bg-app-panel px-4 py-2">
            {(["python", "pytorch", "numpy"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={cn(
                  "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                  language === lang
                    ? "bg-app-accent/15 text-app-accent"
                    : "text-app-muted hover:bg-app-panel-2 hover:text-app-fg"
                )}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val ?? "")}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                lineNumbers: "on",
                wordWrap: "on",
                renderLineHighlight: "gutter",
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            />
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 flex items-center gap-2 border-t border-app-border bg-app-panel px-4 py-2.5">
            <button
              type="button"
              onClick={handleFeedback}
              disabled={isStreaming}
              className="flex items-center gap-2 rounded-lg bg-app-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {isStreaming ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Reviewing…
                </>
              ) : (
                "▶ Get AI Feedback"
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-3 py-2 text-[13px] text-app-muted transition-colors hover:bg-app-panel-2 hover:text-app-fg"
            >
              Clear
            </button>
          </div>

          {/* Feedback panel */}
          {feedbackVisible && (
            <div className="shrink-0 max-h-[40%] overflow-y-auto border-t border-app-border bg-app-panel/80">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-panel px-4 py-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-app-accent">
                  Feedback
                </span>
                <button
                  type="button"
                  onClick={() => setFeedbackVisible(false)}
                  className="rounded p-0.5 text-app-muted/60 transition-colors hover:text-app-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                {feedback ? (
                  <MarkdownMessage content={feedback} />
                ) : (
                  <div className="flex items-center gap-2 py-4 text-[13px] text-app-muted">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
