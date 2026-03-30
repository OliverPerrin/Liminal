import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { assertEnv } from "@/lib/runtime-env";
import type { SessionMessage } from "@/lib/types";

export const runtime = "edge";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

const requestSchema = z.object({
  topic: z.string().min(1),
  user_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
});

type ProfileRecord = {
  resume_text: string | null;
  star_stories: unknown;
  extra_context: string | null;
};

function parseSseChunk(chunk: string): string {
  let text = "";
  const lines = chunk.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      continue;
    }

    const data = trimmed.replace(/^data:\s*/, "");
    if (!data || data === "[DONE]") {
      continue;
    }

    try {
      const event = JSON.parse(data) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };

      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        text += event.delta.text || "";
      }
    } catch {
      continue;
    }
  }

  return text;
}

export async function POST(request: Request) {
  try {
    assertEnv([
      "SUPABASE_SERVICE_ROLE_KEY",
      "ANTHROPIC_API_KEY",
    ]);

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const requestData = parsed.data;

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const anthropicVersion =
      process.env.ANTHROPIC_API_VERSION || DEFAULT_ANTHROPIC_VERSION;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRole || !anthropicApiKey) {
      return Response.json(
        {
          error:
            "Missing required server environment variables (SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/ANTHROPIC_API_KEY)",
        },
        { status: 500 },
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user || user.id !== requestData.user_id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("resume_text,star_stories,extra_context")
      .eq("user_id", userId)
      .single<ProfileRecord>();

    const systemPrompt = buildSystemPrompt({
      resumeText: profile?.resume_text ?? "",
      starStories: profile?.star_stories ?? [],
      extraContext: profile?.extra_context ?? "",
    });

    let activeSessionId = requestData.session_id;
    if (!activeSessionId) {
      const { data: inserted, error: insertError } = await adminClient
        .from("sessions")
        .insert({
          user_id: userId,
          topic: requestData.topic,
          messages: requestData.messages,
        })
        .select("id")
        .single();

      if (insertError || !inserted?.id) {
        return Response.json({ error: "Failed to create session" }, { status: 500 });
      }

      activeSessionId = inserted.id;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 4000,
        system: systemPrompt,
        stream: true,
        messages: requestData.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      return Response.json({ error: "Anthropic stream failed", details }, { status: 500 });
    }

    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    let assistantText = "";
    let lastPersistAt = 0;

    const stream = new ReadableStream({
      async start(controller) {
        async function persistAssistantMessage(partial: string) {
          const updatedMessages: SessionMessage[] = [
            ...requestData.messages,
            {
              role: "assistant",
              content: partial,
              createdAt: new Date().toISOString(),
            },
          ];

          await adminClient
            .from("sessions")
            .update({
              topic: requestData.topic,
              messages: updatedMessages,
            })
            .eq("id", activeSessionId)
            .eq("user_id", userId);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = new TextDecoder().decode(value, { stream: true });
          const textDelta = parseSseChunk(chunk);

          if (textDelta) {
            assistantText += textDelta;
            controller.enqueue(encoder.encode(textDelta));

            const now = Date.now();
            if (now - lastPersistAt > 1200) {
              await persistAssistantMessage(assistantText);
              lastPersistAt = now;
            }
          }
        }

        await persistAssistantMessage(assistantText);

        controller.close();
      },
    });

    if (!activeSessionId) {
      return Response.json({ error: "Session ID missing" }, { status: 500 });
    }

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache",
        "x-session-id": activeSessionId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
