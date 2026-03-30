-- Create resumes storage bucket and per-user RLS policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- User can read only files in their own folder: <uid>/resume.pdf
drop policy if exists "resumes_select_own" on storage.objects;
create policy "resumes_select_own"
on storage.objects
for select
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- User can upload only to their own folder.
drop policy if exists "resumes_insert_own" on storage.objects;
create policy "resumes_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- User can update/overwrite only their own files.
drop policy if exists "resumes_update_own" on storage.objects;
create policy "resumes_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- User can delete only their own files.
drop policy if exists "resumes_delete_own" on storage.objects;
create policy "resumes_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);
