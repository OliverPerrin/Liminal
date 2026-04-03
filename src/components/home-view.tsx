"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { MarkdownMessage } from "@/components/markdown-message";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { TOPIC_TAXONOMY } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { SessionMessage, SessionRecord } from "@/lib/types";

type HomeViewProps = {
  userId: string;
};

type TopicMastery = {
  lastStudied: string;
  count: number;
};

/* -------------------------------------------------------------------------- */
/*  Stage configuration                                                        */
/* -------------------------------------------------------------------------- */

const STAGE_CONFIG = [
  { n: 1, short: "Overview",    label: "Big Picture",          color: "#f59e0b" },
  { n: 2, short: "Intuition",   label: "Intuition + Visual",   color: "#2dd4bf" },
  { n: 3, short: "Math",        label: "The Math",             color: "#818cf8" },
  { n: 4, short: "Code",        label: "Implementation",       color: "#38bdf8" },
  { n: 5, short: "Questions",   label: "Interview Questions",  color: "#fb923c" },
  { n: 6, short: "Retrieval",   label: "Retrieval Check",      color: "#c084fc" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function detectCurrentStage(messages: SessionMessage[]): number {
  let maxStage = 0;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const matches = Array.from(msg.content.matchAll(/##\s*STAGE\s+(\d+)/gi));
    for (const m of matches) {
      const n = parseInt(m[1]);
      if (!isNaN(n) && n > maxStage) maxStage = n;
    }
  }
  return maxStage;
}

function detectContinuePrompt(messages: SessionMessage[], isStreaming: boolean): boolean {
  if (isStreaming || messages.length === 0) return false;
  const last = messages[messages.length - 1];
  if (last.role !== "assistant") return false;
  return /ready to continue/i.test(last.content);
}

function masteryColor(count: number): string {
  if (count >= 5) return "#34d399"; // green
  if (count >= 3) return "#f59e0b"; // amber
  return "#10b981";                  // violet (just started)
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getDomainForTopic(topic: string): string | null {
  for (const domain of TOPIC_TAXONOMY) {
    for (const section of domain.sections) {
      if (section.topics.includes(topic)) return domain.name;
    }
  }
  return null;
}

const DOMAIN_COLORS: Record<string, string> = {
  "Classical ML": "#f59e0b",
  "Deep Learning": "#818cf8",
  "Reinforcement Learning": "#34d399",
  "Training Engineering": "#38bdf8",
  "Systems and MLOps": "#fb923c",
};

/* -------------------------------------------------------------------------- */
/*  Stage progress bar                                                         */
/* -------------------------------------------------------------------------- */

function StageProgressBar({ currentStage }: { currentStage: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {STAGE_CONFIG.map((stage, i) => {
        const isDone = stage.n < currentStage;
        const isCurrent = stage.n === currentStage;
        const isFuture = stage.n > currentStage;

        return (
          <div key={stage.n} className="flex items-center gap-1">
            <div
              title={`Stage ${stage.n}: ${stage.label}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200"
              style={
                isCurrent
                  ? {
                      background: `${stage.color}1a`,
                      color: stage.color,
                      border: `1px solid ${stage.color}50`,
                      boxShadow: `0 0 8px ${stage.color}60`,
                    }
                  : isDone
                  ? {
                      background: "transparent",
                      color: "#4a4b62",
                      border: "1px solid #2b2c40",
                    }
                  : {
                      background: "transparent",
                      color: "#2e2f44",
                      border: "1px dashed #1e1f2d",
                    }
              }
            >
              {isDone ? (
                <svg
                  viewBox="0 0 10 10"
                  className="h-2.5 w-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                </svg>
              ) : (
                <span
                  className="h-4 w-4 shrink-0 rounded-full text-center text-[10px] leading-4 font-bold"
                  style={
                    isCurrent
                      ? { background: stage.color, color: "#0e0f14" }
                      : { background: "transparent" }
                  }
                >
                  {stage.n}
                </span>
              )}
              <span className={cn("hidden transition-all", isCurrent ? "sm:inline" : "")}>
                {stage.short}
              </span>
            </div>
            {i < 5 && (
              <div
                className="h-px w-3 shrink-0 transition-colors"
                style={{ background: isDone ? "#2b2c40" : "#1a1b28" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ onTopicClick }: { onTopicClick: (t: string) => void }) {
  const suggestions = [
    "Attention Mechanisms (scaled dot-product, multi-head, cross-attention, FlashAttention)",
    "Transformers (encoder, decoder, encoder-decoder)",
    "PPO (Proximal Policy Optimization)",
    "Backpropagation and Computational Graphs",
    "LoRA and PEFT",
  ];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center" style={{ animation: "fadeIn 0.4s ease" }}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-app-border bg-app-panel-2">
        <BookOpen className="h-6 w-6 text-app-accent" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-app-fg">Start a session</h2>
      <p className="mb-8 max-w-sm text-sm leading-6 text-app-muted">
        Pick a topic from the sidebar for a structured 6-stage session, or type any ML topic below.
      </p>

      {/* Stage preview pills */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {STAGE_CONFIG.map((stage) => (
          <div
            key={stage.n}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{
              background: `${stage.color}12`,
              color: stage.color,
              border: `1px solid ${stage.color}30`,
            }}
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: stage.color, color: "#0e0f14" }}
            >
              {stage.n}
            </span>
            {stage.short}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md space-y-2">
        <p className="mb-3 text-left text-[11px] font-semibold uppercase tracking-widest text-app-muted/60">
          Popular topics
        </p>
        {suggestions.map((topic) => {
          const domain = getDomainForTopic(topic);
          const color = domain ? DOMAIN_COLORS[domain] : "#10b981";
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onTopicClick(topic)}
              className="flex w-full items-center gap-3 rounded-lg border border-app-border bg-app-panel px-3 py-2.5 text-left text-sm transition-all hover:border-app-accent/40 hover:bg-app-panel-2 hover:shadow-[0_0_12px_rgba(16,185,129,0.06)]"
            >
              <div
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="truncate text-app-fg/80">{topic}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function HomeView({ userId }: HomeViewProps) {
  const [query, setQuery] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [chatError, setChatError] = useState<string | null>(null);
  const [mastery, setMastery] = useState<Record<string, TopicMastery>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animatedKeys = useRef<Set<string>>(new Set());

  const currentStage = useMemo(() => detectCurrentStage(messages), [messages]);
  const showContinue = useMemo(
    () => detectContinuePrompt(messages, isStreaming),
    [messages, isStreaming],
  );

  // Load mastery from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("liminalml-mastery");
      if (stored) setMastery(JSON.parse(stored) as Record<string, TopicMastery>);
    } catch {}
  }, []);

  function markTopicStudied(topic: string) {
    setMastery((prev) => {
      const next: Record<string, TopicMastery> = {
        ...prev,
        [topic]: {
          lastStudied: new Date().toISOString(),
          count: (prev[topic]?.count ?? 0) + 1,
        },
      };
      try {
        localStorage.setItem("liminalml-mastery", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Auto-scroll — scroll the container directly so the page itself never moves
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [messageInput]);

  // Expand all domains initially
  useEffect(() => {
    setExpandedDomains(
      TOPIC_TAXONOMY.reduce<Record<string, boolean>>((acc, d) => {
        acc[d.name] = true;
        return acc;
      }, {}),
    );
  }, []);

  const loadSessions = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("sessions")
      .select("id,user_id,topic,messages,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    setSessions((data || []) as SessionRecord[]);
  }, [userId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const filteredDomains = useMemo(() => {
    if (!query.trim()) return TOPIC_TAXONOMY;
    const normalized = query.toLowerCase();
    return TOPIC_TAXONOMY.map((domain) => ({
      ...domain,
      sections: domain.sections
        .map((section) => ({
          ...section,
          topics: section.topics.filter((t) => t.toLowerCase().includes(normalized)),
        }))
        .filter((s) => s.topics.length > 0),
    })).filter((d) => d.sections.length > 0);
  }, [query]);

  async function streamSession(
    topic: string,
    nextMessages: SessionMessage[],
    existingSessionId?: string,
  ) {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) throw new Error("No active access token");

    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        topic,
        user_id: userId,
        session_id: existingSessionId ?? sessionId ?? undefined,
        messages: nextMessages,
      }),
    });

    if (!response.ok || !response.body) {
      const errorPayload = (await response.json().catch(() => null)) as
        | { error?: string; details?: string }
        | null;
      const message = errorPayload?.error ?? "Session request failed";
      const details = errorPayload?.details;
      throw new Error(details ? `${message}: ${details}` : message);
    }

    const serverSessionId = response.headers.get("x-session-id");
    if (serverSessionId) setSessionId(serverSessionId);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      assistantText += chunk;
      setMessages((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantText };
        return copy;
      });
    }

    await loadSessions();
  }

  async function sendMessage(
    rawTopic: string,
    rawMessage: string,
    resetSession: boolean,
  ) {
    if (isStreaming) return;

    const topic = rawTopic.trim();
    const userMessage = rawMessage.trim();
    if (!topic || !userMessage) return;

    setChatError(null);
    setIsStreaming(true);

    try {
      const currentSessionId = resetSession ? undefined : (sessionId ?? undefined);
      if (resetSession) {
        setMessages([]);
        setSessionId(null);
      }

      const newMessage: SessionMessage = {
        role: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
      };

      const baseMessages = resetSession ? [newMessage] : [...messages, newMessage];
      setMessages(baseMessages);
      setActiveTopic(topic);
      setTopicDraft(topic);
      markTopicStudied(topic);

      await streamSession(topic, baseMessages, currentSessionId);
      setMessageInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run session";
      setChatError(message);
    } finally {
      setIsStreaming(false);
    }
  }

  function startTopic(topic: string) {
    setTopicDraft(topic);
    void sendMessage(topic, `Start a structured session on: ${topic}`, true);
  }

  function handleContinue() {
    const topic = (topicDraft || activeTopic || "Custom Topic").trim();
    void sendMessage(topic, "continue", false);
  }

  function handleQuickReview() {
    const topic = (topicDraft || activeTopic || "this topic").trim();
    void sendMessage(
      topic,
      `Please give me a revision card for ${topic}.`,
      false,
    );
  }

  function openSession(record: SessionRecord) {
    setSessionId(record.id);
    setActiveTopic(record.topic);
    setTopicDraft(record.topic);
    setMessages((record.messages as SessionMessage[]) || []);
  }

  async function deleteSession(record: SessionRecord) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", record.id)
      .eq("user_id", userId);

    if (error) {
      setChatError(error.message);
      return;
    }

    if (sessionId === record.id) {
      setSessionId(null);
      setMessages([]);
      setActiveTopic(null);
    }

    await loadSessions();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const topic = (topicDraft || activeTopic || messageInput.trim().slice(0, 60)).trim() || "Custom Topic";
      const shouldReset = !sessionId || (activeTopic ? topic !== activeTopic : false);
      void sendMessage(topic, messageInput, shouldReset);
    }
  }

  const studiedTopicsCount = Object.keys(mastery).length;
  const domainAccentColor = activeTopic
    ? (DOMAIN_COLORS[getDomainForTopic(activeTopic) ?? ""] ?? "#10b981")
    : "#10b981";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader studiedCount={studiedTopicsCount} />

      {/* Three-column shell — each column is an independent scroll context */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Topic Browser ─────────────────────────────────────────────────── */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-app-border bg-app-panel lg:flex">
          <div className="shrink-0 border-b border-app-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-app-muted/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics…"
                className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 pl-8 text-[13px] text-app-fg placeholder:text-app-muted/50 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredDomains.map((domain) => {
              const domainColor = DOMAIN_COLORS[domain.name] ?? "#10b981";
              return (
                <div key={domain.name} className="mb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDomains((prev) => ({
                        ...prev,
                        [domain.name]: !prev[domain.name],
                      }))
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-app-panel-2"
                  >
                    {expandedDomains[domain.name] ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-app-muted/60" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-app-muted/60" />
                    )}
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: domainColor }}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                      {domain.name}
                    </span>
                  </button>

                  {expandedDomains[domain.name] && (
                    <div className="ml-3 space-y-2 py-1">
                      {domain.sections.map((section) => (
                        <div key={`${domain.name}-${section.title}`}>
                          {section.title && domain.sections.length > 1 && (
                            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-app-muted/50">
                              {section.title}
                            </p>
                          )}
                          <div className="space-y-px">
                            {section.topics.map((topic) => {
                              const m = mastery[topic];
                              const isActive = activeTopic === topic;
                              return (
                                <button
                                  type="button"
                                  key={topic}
                                  onClick={() => startTopic(topic)}
                                  title={
                                    m
                                      ? `${m.count} session${m.count !== 1 ? "s" : ""} · last studied ${timeAgo(m.lastStudied)}`
                                      : undefined
                                  }
                                  className={cn(
                                    "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
                                    isActive
                                      ? "bg-app-accent/12 text-app-accent"
                                      : "text-app-muted hover:bg-app-panel-2 hover:text-app-fg",
                                  )}
                                >
                                  <span className="flex-1 truncate leading-5">{topic}</span>
                                  {m && (
                                    <div
                                      className="h-1.5 w-1.5 shrink-0 rounded-full opacity-80"
                                      style={{ background: masteryColor(m.count) }}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {studiedTopicsCount > 0 && (
            <div className="shrink-0 border-t border-app-border px-3 py-2.5">
              <p className="text-[11px] text-app-muted/60">
                <span className="font-semibold text-app-muted">{studiedTopicsCount}</span>{" "}
                topic{studiedTopicsCount !== 1 ? "s" : ""} studied
              </p>
            </div>
          )}
        </aside>

        {/* ── Main chat ─────────────────────────────────────────────────────── */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg">
          {/* Chat header — shrink-0 so it never gets compressed */}
          <div
            className="flex shrink-0 items-center gap-3 border-b border-app-border bg-app-panel px-5 py-3"
            style={activeTopic ? { borderLeft: `2px solid ${domainAccentColor}60` } : undefined}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[13px] font-semibold text-app-fg">
                  {activeTopic ?? "New Session"}
                </h1>
                {currentStage > 0 && (() => {
                  const stage = STAGE_CONFIG.find((s) => s.n === currentStage);
                  return stage ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `${stage.color}18`,
                        color: stage.color,
                        border: `1px solid ${stage.color}30`,
                      }}
                    >
                      {stage.short}
                    </span>
                  ) : null;
                })()}
                {isStreaming && (
                  <div className="flex items-center gap-1 text-[11px] text-app-accent/80">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="hidden sm:inline">Generating</span>
                  </div>
                )}
              </div>
            </div>
            {currentStage > 0 && (
              <StageProgressBar currentStage={currentStage} />
            )}
            {activeTopic && messages.length > 0 && !isStreaming && (
              <Link
                href={`/practice?topic=${encodeURIComponent(activeTopic)}${sessionId ? `&session_id=${sessionId}` : ""}`}
                title="Practice coding for this topic"
                className="ml-1 flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-app-muted/70 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
              >
                <Code className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Practice</span>
              </Link>
            )}
            {messages.length > 0 && !isStreaming && (
              <button
                type="button"
                title="New session on same topic"
                onClick={() => activeTopic && startTopic(activeTopic)}
                className="shrink-0 rounded-md p-1.5 text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
              {chatError && (
                <div className="mb-5 rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {chatError}
                </div>
              )}

              {messages.length === 0 && !isStreaming ? (
                <EmptyState onTopicClick={startTopic} />
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => {
                    const msgKey = `${message.createdAt}-${index}`;
                    const isNew = !animatedKeys.current.has(msgKey);
                    if (isNew) animatedKeys.current.add(msgKey);
                    return (
                    <div
                      key={msgKey}
                      className={cn(
                        isNew ? "message-enter" : "",
                        message.role === "user" ? "flex justify-end" : "",
                      )}
                    >
                      {message.role === "user" ? (
                        <div className="max-w-2xl rounded-2xl rounded-br-sm bg-app-panel-2 px-4 py-3 text-[0.9375rem] leading-7 text-app-fg/90 ring-1 ring-app-border shadow-sm">
                          {message.content}
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <MarkdownMessage content={message.content || "…"} />
                        </div>
                      )}
                    </div>
                  ); })}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex items-center gap-1.5 px-1 py-2">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-app-accent/60" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Continue / quick review suggestion area — shrink-0 so it never gets compressed */}
          {(showContinue || (currentStage >= 2 && !isStreaming && messages.length > 0)) && (
            <div className="shrink-0 border-t border-app-border/50 bg-app-panel/50 px-4 py-2.5">
              <div className="mx-auto flex max-w-4xl items-center gap-2 sm:px-4">
                {showContinue && (() => {
                  const nextStage = STAGE_CONFIG.find((s) => s.n === currentStage + 1);
                  const color = nextStage?.color ?? "#10b981";
                  return (
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="group flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all"
                      style={{
                        background: `${color}12`,
                        color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      <span>Continue</span>
                      {currentStage < 6 && (
                        <span
                          className="transition-transform group-hover:translate-x-0.5"
                          style={{ color: `${color}80` }}
                        >
                          → Stage {currentStage + 1}
                        </span>
                      )}
                    </button>
                  );
                })()}
                {currentStage >= 2 && !isStreaming && activeTopic && (
                  <button
                    type="button"
                    onClick={handleQuickReview}
                    className="flex items-center gap-1.5 rounded-full border border-app-border px-3 py-1.5 text-[13px] text-app-muted transition-colors hover:border-app-border/80 hover:text-app-fg"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Revision card</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input — shrink-0 so it stays pinned to the bottom */}
          <div className="shrink-0 border-t border-app-border bg-app-panel px-3 py-3 sm:px-4">
            <div className="mx-auto max-w-4xl">
              <div className="relative rounded-xl transition-shadow focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    showContinue
                      ? "Type 'continue' or ask a question…"
                      : activeTopic
                      ? `Ask about ${activeTopic}…`
                      : "Type a topic or question to start a session…"
                  }
                  rows={1}
                  className="w-full resize-none rounded-xl border border-app-border bg-app-bg px-4 py-2.5 pr-10 text-[13px] text-app-fg placeholder:text-app-muted/40 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/20"
                />
                <button
                  type="button"
                  disabled={isStreaming || !messageInput.trim()}
                  onClick={() => {
                    const topic = (topicDraft || activeTopic || messageInput.trim().slice(0, 60)).trim() || "Custom Topic";
                    const shouldReset =
                      !sessionId || (activeTopic ? topic !== activeTopic : false);
                    void sendMessage(topic, messageInput, shouldReset);
                  }}
                  className="absolute bottom-2.5 right-2.5 rounded-lg p-1 text-app-muted transition-colors hover:text-app-accent disabled:opacity-30"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-app-muted/40">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </main>

        {/* ── History sidebar ───────────────────────────────────────────────── */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-l border-app-border bg-app-panel lg:flex",
            historyOpen ? "w-[260px]" : "w-11 items-center",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-app-border p-2",
              historyOpen ? "justify-between" : "justify-center",
            )}
          >
            {historyOpen && (
              <span className="px-1 text-[11px] font-semibold uppercase tracking-widest text-app-muted/70">
                History
              </span>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen((p) => !p)}
              className="rounded-md p-1.5 text-app-muted/60 transition-colors hover:bg-app-panel-2 hover:text-app-fg"
            >
              {historyOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </button>
          </div>

          {historyOpen && (
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="px-2 py-6 text-center text-[12px] text-app-muted/40">
                  No sessions yet
                </p>
              ) : (
                <div className="space-y-px">
                  {sessions.map((record) => {
                    const domain = getDomainForTopic(record.topic);
                    const color = domain ? DOMAIN_COLORS[domain] : "#10b981";
                    const msgCount = (record.messages as SessionMessage[])?.length ?? 0;
                    const stage = detectCurrentStage(
                      (record.messages as SessionMessage[]) || [],
                    );
                    const isActive = record.id === sessionId;

                    return (
                      <div
                        key={record.id}
                        className={cn(
                          "group rounded-lg p-2 transition-colors hover:bg-app-panel-2",
                          isActive && "bg-app-accent/8",
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSession(record)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: color }}
                              />
                              <p
                                className={cn(
                                  "truncate text-[13px] leading-5",
                                  isActive ? "text-app-accent" : "text-app-fg/80",
                                )}
                              >
                                {record.topic}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center gap-2 pl-3">
                              <p className="flex items-center gap-1 text-[11px] text-app-muted/50">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(record.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              {stage > 0 && (
                                <p className="text-[11px] text-app-muted/40">
                                  Stage {stage}/6
                                </p>
                              )}
                              {msgCount > 0 && (
                                <p className="text-[11px] text-app-muted/40">
                                  {Math.ceil(msgCount / 2)} turns
                                </p>
                              )}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteSession(record)}
                            className="shrink-0 rounded p-1 text-app-muted/30 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
