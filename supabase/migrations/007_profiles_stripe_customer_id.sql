-- Link a Stripe Customer to each profile so subscription webhooks can map
-- back to a user. Written by the webhook handler (service role) only.

alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Partial index keeps the index small (most users won't be Pro). Used by
-- the customer.subscription.deleted webhook to look up the profile.
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Block users from writing this column. Service role bypasses RLS and
-- column grants, so the webhook handler can still update it.
revoke update (stripe_customer_id) on public.profiles from authenticated;
revoke update (stripe_customer_id) on public.profiles from anon;
