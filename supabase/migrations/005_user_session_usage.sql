-- Track per-user monthly session counts for enforcing usage limits.

create table if not exists public.user_session_usage (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  month_year   text        not null,
  session_count integer    not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, month_year)
);

create index if not exists user_session_usage_user_id_month_year_idx
  on public.user_session_usage (user_id, month_year);

drop trigger if exists user_session_usage_set_updated_at on public.user_session_usage;
create trigger user_session_usage_set_updated_at
before update on public.user_session_usage
for each row execute function public.set_updated_at();

alter table public.user_session_usage enable row level security;

create policy "session_usage_select_own"
on public.user_session_usage for select
using (auth.uid() = user_id);

create policy "session_usage_insert_own"
on public.user_session_usage for insert
with check (auth.uid() = user_id);

create policy "session_usage_update_own"
on public.user_session_usage for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Atomic check-and-increment. Runs as the function owner (postgres) so it can
-- lock and update the row regardless of the caller's RLS context.
-- Returns one row: (allowed, used, limit_val).
create or replace function public.check_and_increment_session_usage(
  p_user_id   uuid,
  p_month_year text,
  p_limit     integer
)
returns table (allowed boolean, used integer, limit_val integer)
language plpgsql
security definer
as $$
declare
  v_current integer;
begin
  -- Ensure a row exists for this user/month before locking.
  insert into public.user_session_usage (user_id, month_year, session_count)
  values (p_user_id, p_month_year, 0)
  on conflict (user_id, month_year) do nothing;

  -- Lock the row to prevent concurrent increments.
  select session_count into v_current
  from public.user_session_usage
  where user_id = p_user_id and month_year = p_month_year
  for update;

  if v_current >= p_limit then
    return query select false, v_current, p_limit;
  else
    update public.user_session_usage
    set session_count = session_count + 1,
        updated_at    = now()
    where user_id = p_user_id and month_year = p_month_year;

    return query select true, v_current + 1, p_limit;
  end if;
end;
$$;
