import { createClient } from "@supabase/supabase-js";
import { assertEnv } from "@/lib/runtime-env";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function getSiteUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const origin = request.headers.get("origin");
  if (origin) return origin;

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    assertEnv(["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"]);

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: "Supabase env not configured" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeClient();
    const siteUrl = getSiteUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      // Propagate user_id to the created subscription so subscription.deleted
      // events can be mapped back without an extra DB lookup.
      subscription_data: {
        metadata: { user_id: user.id },
      },
      success_url: `${siteUrl}/pro/success`,
      cancel_url: `${siteUrl}/profile`,
    });

    if (!session.url) {
      return Response.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
