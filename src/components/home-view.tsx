"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Send,
  Trash2,
} from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [messageInput]);

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
    if (!query.trim()) return TOPIC_TAXONOMY;

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
      const errorPayload = (await response.json().catch(() => null)) as
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

  async function sendMessage(rawTopic: string, rawMessage: string, resetSession: boolean) {
    if (isStreaming) return;

    const topic = rawTopic.trim();
    const userMessage = rawMessage.trim();
    if (!topic || !userMessage) return;

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const topic = (topicDraft || activeTopic || "Custom Topic").trim();
      const shouldReset = !sessionId || (activeTopic ? topic !== activeTopic : false);
      void sendMessage(topic, messageInput, shouldReset);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <div
        className={cn(
          "mx-auto grid w-full max-w-[1800px] flex-1 gap-0 overflow-hidden lg:gap-px",
          historyOpen
            ? "lg:grid-cols-[300px_minmax(0,1fr)_280px]"
            : "lg:grid-cols-[300px_minmax(0,1fr)_48px]",
        )}
      >
        {/* Topic Browser */}
        <aside className="hidden overflow-hidden border-r border-app-border bg-app-panel lg:flex lg:flex-col">
          <div className="border-b border-app-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-app-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 pl-8 text-sm text-app-fg placeholder:text-app-muted/60 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/25"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredDomains.map((domain) => (
              <div key={domain.name} className="mb-1">
                <button
                  type="button"
                  onClick={() => setExpandedDomains((prev) => ({ ...prev, [domain.name]: !prev[domain.name] }))}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-app-muted hover:bg-app-panel-2 hover:text-app-fg"
                >
                  {expandedDomains[domain.name] ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {domain.name}
                </button>

                {expandedDomains[domain.name] && (
                  <div className="ml-2 space-y-2 py-1">
                    {domain.sections.map((section) => (
                      <div key={`${domain.name}-${section.title}`}>
                        {section.title && (
                          <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-app-muted/60">
                            {section.title}
                          </p>
                        )}
                        <div className="space-y-px">
                          {section.topics.map((topic) => (
                            <button
                              type="button"
                              key={topic}
                              onClick={() => startTopic(topic)}
                              className={cn(
                                "w-full rounded-md px-2 py-1 text-left text-[13px] text-app-muted transition-colors hover:bg-app-accent/10 hover:text-app-fg",
                                activeTopic === topic && "bg-app-accent/10 text-app-accent",
                              )}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex min-h-0 flex-col bg-app-bg">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-app-border bg-app-panel px-5 py-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-app-fg">
                {activeTopic || "New Session"}
              </h1>
              <p className="text-xs text-app-muted">Structured six-stage ML interview prep</p>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-1.5 text-xs text-app-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
              {chatError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {chatError}
                </div>
              )}

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-app-accent/10 p-4">
                    <Search className="h-6 w-6 text-app-accent" />
                  </div>
                  <h2 className="mb-2 text-lg font-medium text-app-fg">Start a session</h2>
                  <p className="max-w-md text-sm text-app-muted">
                    Pick a topic from the sidebar or type a custom topic below to begin a structured learning session.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={cn(
                      "rounded-xl",
                      message.role === "user"
                        ? "ml-auto max-w-2xl rounded-br-sm bg-app-accent/10 px-4 py-3"
                        : "",
                    )}
                  >
                    {message.role === "user" && (
                      <p className="text-[15px] leading-relaxed text-app-fg">{message.content}</p>
                    )}
                    {message.role === "assistant" && (
                      <div className="min-w-0">
                        <MarkdownMessage content={message.content || "..."} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-app-border bg-app-panel p-3 sm:p-4">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-end gap-2">
                <input
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  placeholder="Topic"
                  className="hidden w-44 shrink-0 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-fg placeholder:text-app-muted/60 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/25 sm:block"
                />
                <div className="relative min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or type 'continue'..."
                    rows={1}
                    className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2 pr-10 text-sm text-app-fg placeholder:text-app-muted/60 focus:border-app-accent/50 focus:outline-none focus:ring-1 focus:ring-app-accent/25"
                  />
                  <button
                    type="button"
                    disabled={isStreaming || !messageInput.trim()}
                    onClick={() => {
                      const topic = (topicDraft || activeTopic || "Custom Topic").trim();
                      const shouldReset = !sessionId || (activeTopic ? topic !== activeTopic : false);
                      void sendMessage(topic, messageInput, shouldReset);
                    }}
                    className="absolute bottom-2 right-2 rounded-md p-1 text-app-muted transition-colors hover:text-app-accent disabled:opacity-30"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-app-muted/50 sm:hidden">
                Shift+Enter for new line
              </p>
            </div>
          </div>
        </main>

        {/* Session History Sidebar */}
        <aside
          className={cn(
            "hidden border-l border-app-border bg-app-panel lg:flex lg:flex-col",
            !historyOpen && "items-center",
          )}
        >
          <div className="flex items-center justify-between border-b border-app-border p-2">
            {historyOpen && (
              <span className="px-1 text-xs font-semibold uppercase tracking-wider text-app-muted">
                History
              </span>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="rounded-md p-1.5 text-app-muted transition-colors hover:bg-app-panel-2 hover:text-app-fg"
            >
              {historyOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>

          {historyOpen && (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {sessions.map((sessionRecord) => (
                  <div
                    key={sessionRecord.id}
                    className={cn(
                      "group rounded-lg p-2 transition-colors hover:bg-app-panel-2",
                      sessionRecord.id === sessionId && "bg-app-accent/10",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSession(sessionRecord)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={cn(
                            "truncate text-[13px]",
                            sessionRecord.id === sessionId ? "text-app-accent" : "text-app-fg",
                          )}
                        >
                          {sessionRecord.topic}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-app-muted/60">
                          <Clock className="h-3 w-3" />
                          {new Date(sessionRecord.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteSession(sessionRecord)}
                        className="shrink-0 rounded p-1 text-app-muted/40 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-app-muted/50">
                    No sessions yet
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
