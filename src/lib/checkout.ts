import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Initiates the Stripe Checkout flow for a Pro upgrade. On success, navigates
 * the browser to the Stripe-hosted checkout page (no return). Throws on auth
 * or network errors so callers can surface the message.
 */
export async function startProCheckout(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sign in to upgrade.");
  }

  const res = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to start checkout");
  }

  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}
