-- Allow users to delete their own sessions.

drop policy if exists "sessions_delete_own" on public.sessions;

create policy "sessions_delete_own"
on public.sessions
for delete
using (auth.uid() = user_id);
