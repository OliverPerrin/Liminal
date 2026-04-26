import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { assertEnv } from "@/lib/runtime-env";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase service-role env vars");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.warn("[stripe.webhook] checkout.session.completed missing metadata.user_id", {
      session_id: session.id,
    });
    return;
  }

  const customerId = customerIdFrom(session.customer);
  const admin = getAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      is_pro: true,
      stripe_customer_id: customerId,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to mark profile pro: ${error.message}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const admin = getAdminClient();
  const userIdFromMetadata = subscription.metadata?.user_id;

  if (userIdFromMetadata) {
    const { error } = await admin
      .from("profiles")
      .update({ is_pro: false })
      .eq("user_id", userIdFromMetadata);

    if (error) {
      throw new Error(`Failed to revoke pro by user_id: ${error.message}`);
    }
    return;
  }

  // Fall back to looking up the profile by stripe_customer_id.
  const customerId = customerIdFrom(subscription.customer);
  if (!customerId) {
    console.warn("[stripe.webhook] subscription.deleted with no user_id or customer", {
      subscription_id: subscription.id,
    });
    return;
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_pro: false })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Failed to revoke pro by customer_id: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    assertEnv(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]);

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // Read the raw body — JSON-parsing first invalidates the signature.
    const rawBody = await request.text();

    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signature verification failed";
      return Response.json({ error: message }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Ignore unrelated events. Returning 200 prevents Stripe retries.
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    // Anything thrown here returns 500, so Stripe will retry.
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    console.error("[stripe.webhook]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
