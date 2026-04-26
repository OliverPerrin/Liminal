-- Add a Pro flag to user profiles. Users can read their own value (covered
-- by the existing profiles_select_own policy); only the service role may
-- write it.

alter table public.profiles
  add column if not exists is_pro boolean not null default false;

-- The existing profiles_update_own policy permits row-level updates for the
-- owner. Block the authenticated role from writing is_pro at the column
-- level so users can't self-promote. The service role bypasses RLS and
-- column grants, so backend code can still update this field.
revoke update (is_pro) on public.profiles from authenticated;
revoke update (is_pro) on public.profiles from anon;
