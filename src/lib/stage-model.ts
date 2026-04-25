import type { SessionMessage } from "@/lib/types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const SONNET_MODEL = "claude-sonnet-4-6";

/**
 * Maps session stage (1–6) to the Claude model that generates it.
 * Stages 1–4 are explanatory and run on Haiku to cut cost; Stages 5–6
 * (interview questions and retrieval check) keep Sonnet for reasoning quality.
 */
export const STAGE_MODEL_MAP: Record<number, string> = {
  1: HAIKU_MODEL,
  2: HAIKU_MODEL,
  3: HAIKU_MODEL,
  4: HAIKU_MODEL,
  5: SONNET_MODEL,
  6: SONNET_MODEL,
};

const CONTINUE_PATTERN =
  /^(continue|next|go|go on|proceed|keep going|y|yes|ok|okay|sure|move on)\.?$/i;
const STAGE_HEADER_PATTERN = /##\s*STAGE\s+(\d+)/gi;

/**
 * Predicts which stage the next assistant turn will produce. The system
 * prompt enforces one stage per turn:
 *   - No assistant messages yet → Stage 1
 *   - Last user message is "continue" / "next" / etc. → next stage
 *   - Anything else (a question, refinement) → same stage as last turn
 */
function predictTargetStage(messages: SessionMessage[]): number {
  if (messages.length === 0) return 1;

  let lastStage = 0;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const matches = msg.content.matchAll(STAGE_HEADER_PATTERN);
    for (const m of matches) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > lastStage) lastStage = n;
    }
  }

  if (lastStage === 0) return 1;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return lastStage;

  const isContinue = CONTINUE_PATTERN.test(lastUser.content.trim());
  return isContinue ? Math.min(lastStage + 1, 6) : lastStage;
}

/**
 * Picks the Claude model for the next session turn.
 * Set FORCE_ALL_STAGES_SONNET=true to bypass routing and use Sonnet
 * everywhere (useful when A/B-testing quality regressions).
 */
export function pickSessionModel(messages: SessionMessage[]): string {
  if (process.env.FORCE_ALL_STAGES_SONNET === "true") {
    return SONNET_MODEL;
  }

  const stage = predictTargetStage(messages);
  return STAGE_MODEL_MAP[stage] ?? SONNET_MODEL;
}
