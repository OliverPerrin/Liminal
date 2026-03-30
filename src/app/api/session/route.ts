import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { assertEnv } from "@/lib/runtime-env";
import type { SessionMessage } from "@/lib/types";

export const runtime = "edge";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

const requestSchema = z.object({
  topic: z.string().min(1),
  user_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
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

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const content = (payload as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n")
    .trim();
}

function shouldPolishResponse(text: string): boolean {
  return /STAGE\s+2|STAGE\s+3/i.test(text);
}

async function polishAssistantResponse(params: {
  text: string;
  topic: string;
  apiKey: string;
  model: string;
  anthropicVersion: string;
}): Promise<string> {
  const { text, topic, apiKey, model, anthropicVersion } = params;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: 5000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Rewrite the following assistant answer for topic "${topic}" with strict formatting only. Preserve technical meaning exactly.

Rules:
1. Keep stage headers as markdown headers: ## STAGE X - ...
2. For STAGE 2, include exactly one valid Mermaid block:
\`\`\`mermaid
flowchart LR
...
\`\`\`
No prose inside the mermaid block.
3. For STAGE 3 equations, use valid LaTeX only (no unicode math clutter), with block equations in $$...$$.
4. Remove malformed or duplicate equation fragments.
5. Output only rewritten markdown.

Original answer:
${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return text;
    }

    const payload = await response.json();
    const polished = extractAnthropicText(payload);
    return polished || text;
  } catch {
    return text;
  }
}

function parseSseEventsWithBuffer(buffer: string): {
  textDelta: string;
  remainder: string;
} {
  let text = "";
  let remainder = buffer;

  while (true) {
    const separatorIndex = remainder.indexOf("\n\n");
    if (separatorIndex < 0) {
      break;
    }

    const rawEvent = remainder.slice(0, separatorIndex);
    remainder = remainder.slice(separatorIndex + 2);

    const eventLines = rawEvent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"));

    if (eventLines.length === 0) {
      continue;
    }

    const data = eventLines
      .map((line) => line.replace(/^data:\s*/, ""))
      .join("\n")
      .trim();

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

  return { textDelta: text, remainder };
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
    const anthropicModel =
      process.env.ANTHROPIC_SESSION_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      DEFAULT_ANTHROPIC_MODEL;
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
        max_tokens: 8000,
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
    const decoder = new TextDecoder();
    let assistantText = "";
    let lastPersistAt = 0;
    let sseRemainder = "";

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

          const chunk = decoder.decode(value, { stream: true });
          const parsedChunk = parseSseEventsWithBuffer(`${sseRemainder}${chunk}`);
          sseRemainder = parsedChunk.remainder;
          const textDelta = parsedChunk.textDelta;

          if (textDelta) {
            assistantText += textDelta;

            const now = Date.now();
            if (now - lastPersistAt > 1200) {
              await persistAssistantMessage(assistantText);
              lastPersistAt = now;
            }
          }
        }

        // Flush decoder + parse any trailing buffered SSE event data.
        const flushChunk = decoder.decode();
        const parsedFinal = parseSseEventsWithBuffer(`${sseRemainder}${flushChunk}`);
        if (parsedFinal.textDelta) {
          assistantText += parsedFinal.textDelta;
        }

        let finalText = assistantText;
        if (shouldPolishResponse(finalText)) {
          finalText = await polishAssistantResponse({
            text: finalText,
            topic: requestData.topic,
            apiKey: anthropicApiKey,
            model: anthropicModel,
            anthropicVersion,
          });
        }

        controller.enqueue(encoder.encode(finalText));

        await persistAssistantMessage(finalText);

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
