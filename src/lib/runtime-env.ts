type EnvIssue = {
  key: string;
  hint?: string;
};

function optionalHintForKey(key: string): string | undefined {
  if (key === "SUPABASE_URL" && process.env.SUPABSE_URL) {
    return "Found SUPABSE_URL. Did you mean SUPABASE_URL?";
  }

  if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
    return "Found NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY. Use NEXT_PUBLIC_SUPABASE_ANON_KEY for this app.";
  }

  return undefined;
}

export function assertEnv(keys: string[]): void {
  const issues: EnvIssue[] = [];

  for (const key of keys) {
    if (!process.env[key]) {
      issues.push({ key, hint: optionalHintForKey(key) });
    }
  }

  if (issues.length === 0) {
    return;
  }

  const details = issues
    .map((issue) => `- ${issue.key}${issue.hint ? ` (${issue.hint})` : ""}`)
    .join("\n");

  throw new Error(`Missing required environment variables:\n${details}`);
}
