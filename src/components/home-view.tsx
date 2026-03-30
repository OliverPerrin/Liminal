"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PanelRightClose, PanelRightOpen, Search, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { MarkdownMessage } from "@/components/markdown-message";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { TOPIC_TAXONOMY } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { SessionMessage, SessionRecord } from "@/lib/types";

type HomeViewProps = {
  userId: string;
};

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

  useEffect(() => {
    setExpandedDomains(
      TOPIC_TAXONOMY.reduce<Record<string, boolean>>((acc, domain) => {
        acc[domain.name] = true;
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
      .order("created_at", { ascending: false });

    setSessions((data || []) as SessionRecord[]);
  }, [userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredDomains = useMemo(() => {
    if (!query.trim()) {
      return TOPIC_TAXONOMY;
    }

    const normalized = query.toLowerCase();
    return TOPIC_TAXONOMY.map((domain) => ({
      ...domain,
      sections: domain.sections
        .map((section) => ({
          ...section,
          topics: section.topics.filter((topic) => topic.toLowerCase().includes(normalized)),
        }))
        .filter((section) => section.topics.length > 0),
    })).filter((domain) => domain.sections.length > 0);
  }, [query]);

  async function streamSession(topic: string, nextMessages: SessionMessage[], existingSessionId?: string) {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No active access token");
    }

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
      const errorPayload = await response.json().catch(() => null) as
        | { error?: string; details?: string }
        | null;
      const message = errorPayload?.error || "Session request failed";
      const details = errorPayload?.details;
      throw new Error(details ? `${message}: ${details}` : message);
    }

    const serverSessionId = response.headers.get("x-session-id");
    if (serverSessionId) {
      setSessionId(serverSessionId);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "", createdAt: new Date().toISOString() }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      assistantText += chunk;

      setMessages((prev) => {
        if (!prev.length) {
          return prev;
        }

        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: assistantText,
        };
        return copy;
      });
    }

    await loadSessions();
  }

  async function sendMessage(rawTopic: string, rawMessage: string, resetSession: boolean) {
    if (isStreaming) {
      return;
    }

    const topic = rawTopic.trim();
    const userMessage = rawMessage.trim();
    if (!topic || !userMessage) {
      return;
    }

    setChatError(null);
    setIsStreaming(true);

    try {
      const currentSessionId = resetSession ? undefined : sessionId ?? undefined;
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
    setActiveTopic(topic);
    void sendMessage(topic, `Start a structured session on ${topic}.`, true);
  }

  function openSession(sessionRecord: SessionRecord) {
    setSessionId(sessionRecord.id);
    setActiveTopic(sessionRecord.topic);
    setTopicDraft(sessionRecord.topic);
    setMessages((sessionRecord.messages as SessionMessage[]) || []);
  }

  async function deleteSession(sessionRecord: SessionRecord) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionRecord.id)
      .eq("user_id", userId);

    if (error) {
      setChatError(error.message);
      return;
    }

    if (sessionId === sessionRecord.id) {
      setSessionId(null);
      setMessages([]);
      setActiveTopic(null);
    }

    await loadSessions();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div
        className={cn(
          "mx-auto grid w-full max-w-[1700px] flex-1 grid-cols-1 gap-4 px-3 py-3",
          historyOpen
            ? "lg:grid-cols-[320px_minmax(0,1fr)_320px]"
            : "lg:grid-cols-[320px_minmax(0,1fr)_52px]",
        )}
      >
        <aside className="rounded-xl border border-app-border bg-app-panel p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-app-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
              className="w-full rounded-lg border border-app-border bg-app-panel-2 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="mt-4 space-y-2 overflow-y-auto pr-1">
            {filteredDomains.map((domain) => (
              <div key={domain.name} className="rounded-lg border border-app-border bg-app-panel-2/40">
                <button
                  type="button"
                  onClick={() => setExpandedDomains((prev) => ({ ...prev, [domain.name]: !prev[domain.name] }))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
                >
                  {expandedDomains[domain.name] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {domain.name}
                </button>

                {expandedDomains[domain.name] ? (
                  <div className="space-y-2 px-3 pb-3">
                    {domain.sections.map((section) => (
                      <div key={`${domain.name}-${section.title}`}>
                        <p className="mb-1 text-xs uppercase tracking-wide text-app-muted">{section.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {section.topics.map((topic) => (
                            <button
                              type="button"
                              key={topic}
                              onClick={() => startTopic(topic)}
                              className="rounded-md border border-app-border px-2 py-1 text-xs text-app-muted hover:border-app-accent hover:text-app-fg"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 h-[calc(100vh-7rem)] flex-col rounded-xl border border-app-border bg-app-panel">
          <div className="border-b border-app-border px-4 py-3">
            <h1 className="text-sm font-semibold">{activeTopic || "Start a session"}</h1>
            <p className="text-xs text-app-muted">Structured six-stage ML interview prep.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatError ? (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                {chatError}
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-app-border bg-app-panel-2 p-4 text-sm text-app-muted">
                Select a topic from the left panel or type a custom topic below.
              </div>
            ) : null}

            {messages.map((message, index) => (
              <article
                key={`${message.createdAt}-${index}`}
                className={cn(
                  "rounded-lg border p-3",
                  message.role === "assistant"
                    ? "border-app-border bg-app-panel-2"
                    : "border-sky-400/30 bg-sky-500/10",
                )}
              >
                <p className="mb-2 text-[11px] uppercase tracking-wide text-app-muted">{message.role}</p>
                <MarkdownMessage content={message.content || "..."} />
              </article>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const topic = (topicDraft || activeTopic || "Custom Topic").trim();
              const shouldReset = !sessionId || (activeTopic ? topic !== activeTopic : false);
              void sendMessage(
                topic,
                messageInput,
                shouldReset,
              );
            }}
            className="sticky bottom-0 z-10 grid gap-2 border-t border-app-border bg-app-panel/95 p-3 backdrop-blur md:grid-cols-[220px_minmax(0,1fr)_auto]"
          >
            <input
              value={topicDraft}
              onChange={(event) => setTopicDraft(event.target.value)}
              placeholder="Topic"
              className="rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm"
            />
            <input
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Type a free topic request or ask a follow-up"
              className="rounded-lg border border-app-border bg-app-panel-2 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isStreaming ? "Streaming..." : "Send"}
            </button>
          </form>
        </main>

        <aside className={cn("rounded-xl border border-app-border bg-app-panel", historyOpen ? "p-3" : "p-2") }>
          <div className="mb-3 flex items-center justify-between">
            {historyOpen ? <h2 className="text-sm font-semibold">Session History</h2> : <span />}
            <button
              type="button"
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="rounded border border-app-border p-1 text-app-muted"
            >
              {historyOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>

          {historyOpen ? (
            <div className="space-y-2 overflow-y-auto">
              {sessions.map((sessionRecord) => (
                <div
                  key={sessionRecord.id}
                  className={cn(
                    "rounded-lg border border-app-border bg-app-panel-2 p-2",
                    sessionRecord.id === sessionId && "border-app-accent",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openSession(sessionRecord)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm">{sessionRecord.topic}</p>
                      <p className="mt-1 text-[11px] text-app-muted">
                        {new Date(sessionRecord.created_at).toLocaleString()}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteSession(sessionRecord)}
                      className="rounded border border-app-border p-1 text-app-muted hover:border-red-400/50 hover:text-red-300"
                      aria-label="Delete session"
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
