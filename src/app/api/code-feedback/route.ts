import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { assertEnv } from "@/lib/runtime-env";

export const runtime = "edge";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 1200;

const requestSchema = z.object({
  topic: z.string().min(1),
  code: z.string().min(1),
  language: z.enum(["python", "pytorch", "numpy"]),
  user_id: z.string().uuid(),
});

function buildReviewPrompt(topic: string, language: string): string {
  const langLabel =
    language === "pytorch" ? "PyTorch" : language === "numpy" ? "NumPy" : "Python";

  return `You are a rigorous ML engineer and researcher reviewing a candidate's from-scratch implementation of ${topic} in ${langLabel}.

Review their code and structure your response exactly as:

## Correctness
Identify any mathematical errors, wrong tensor shapes, missing operations, or algorithmic bugs.
Be specific: quote the relevant line(s) and explain precisely what's wrong and why.
If the implementation is correct, say so clearly — don't fabricate issues.

## Implementation Quality
Flag anti-patterns, missing best practices, or ${langLabel}-specific issues (e.g., wrong use of .detach(), in-place ops on tensors that require grad, device mismatches, missing .zero_grad(), numerical stability issues).

## What's Right
Acknowledge at least 2 specific things they got correct. Be precise, not generic ("you used scaled_dot_product_attention correctly" not "good job").

## One Deep Question
Ask one focused question about a specific design choice in their code that probes whether they understand *why* they made that choice — not just that they made it. Make it the kind of question a senior researcher would ask in a code review.

Calibrate to a senior researcher peer-reviewing code. No hand-holding. No generic praise. No filler.`;
}

export async function POST(request: Request) {
  try {
    assertEnv(["SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]);

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const { topic, code, language, user_id } = parsed.data;

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel =
      process.env.ANTHROPIC_SESSION_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      DEFAULT_ANTHROPIC_MODEL;
    const anthropicVersion =
      process.env.ANTHROPIC_API_VERSION || DEFAULT_ANTHROPIC_VERSION;

    if (!supabaseUrl || !supabaseAnonKey || !anthropicApiKey) {
      return Response.json({ error: "Missing server environment variables" }, { status: 500 });
    }

    // Verify auth
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user || user.id !== user_id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const langLabel =
      language === "pytorch" ? "PyTorch" : language === "numpy" ? "NumPy" : "Python";

    const userMessage = `Here is my ${langLabel} implementation of ${topic}:\n\n\`\`\`python\n${code}\n\`\`\``;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": anthropicVersion,
        "x-api-key": anthropicApiKey,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: buildReviewPrompt(topic, language),
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      return Response.json(
        { error: `Anthropic API error: ${anthropicResponse.status}` },
        { status: 502 },
      );
    }

    return new Response(anthropicResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
