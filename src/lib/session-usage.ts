import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_MONTHLY_SESSION_LIMIT = 20;

export type SessionUsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
};

/**
 * Atomically checks whether the user has remaining sessions for the current
 * calendar month and, if so, increments the counter.
 *
 * Pass the service-role adminClient so the underlying Postgres function can
 * lock and update the row without RLS interference.
 *
 * Pro users (isPro=true) skip the limit entirely and the counter is not
 * incremented. The monthly cap is read from NEXT_PUBLIC_MONTHLY_SESSION_LIMIT
 * (default 20). When unlimited, `limit` is returned as -1.
 */
export async function checkAndIncrementSessionUsage(
  userId: string,
  client: SupabaseClient,
  isPro: boolean = false,
): Promise<SessionUsageResult> {
  if (isPro) {
    return { allowed: true, used: 0, limit: -1 };
  }

  const limit =
    parseInt(process.env.NEXT_PUBLIC_MONTHLY_SESSION_LIMIT ?? "", 10) ||
    DEFAULT_MONTHLY_SESSION_LIMIT;

  const now = new Date();
  const monthYear = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await client.rpc("check_and_increment_session_usage", {
    p_user_id: userId,
    p_month_year: monthYear,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Session usage check failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("Session usage check returned no data");
  }

  return {
    allowed: Boolean(row.allowed),
    used: row.used as number,
    limit: row.limit_val as number,
  };
}

/**
 * Reads the current month's session count for a user without incrementing.
 * Safe to call from the browser client (uses RLS select policy).
 */
export async function getSessionUsage(
  userId: string,
  client: SupabaseClient,
): Promise<{ used: number; limit: number }> {
  const limit =
    parseInt(process.env.NEXT_PUBLIC_MONTHLY_SESSION_LIMIT ?? "", 10) ||
    DEFAULT_MONTHLY_SESSION_LIMIT;

  const now = new Date();
  const monthYear = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data } = await client
    .from("user_session_usage")
    .select("session_count")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .maybeSingle();

  return { used: data?.session_count ?? 0, limit };
}
