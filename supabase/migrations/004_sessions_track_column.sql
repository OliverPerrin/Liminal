-- Add a `track` column to sessions so ML and SWE sessions can be distinguished.
-- Default 'ml' preserves behavior for existing rows.

alter table public.sessions
  add column if not exists track text not null default 'ml';

-- Constrain to the known track ids.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_track_check'
  ) then
    alter table public.sessions
      add constraint sessions_track_check check (track in ('ml', 'swe'));
  end if;
end$$;

create index if not exists sessions_user_id_track_created_at_idx
  on public.sessions (user_id, track, created_at desc);
