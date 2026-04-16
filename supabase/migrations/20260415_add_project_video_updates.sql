create table if not exists public.class_video_settings (
  class_name text primary key,
  project_video_updates_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_video_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  student_code text not null,
  class_name text not null,
  video_path text not null,
  video_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_video_submissions_student_code_idx
  on public.project_video_submissions (student_code, created_at desc);

create index if not exists project_video_submissions_class_name_idx
  on public.project_video_submissions (class_name, created_at desc);

insert into storage.buckets (id, name, public)
values ('project-update-videos', 'project-update-videos', true)
on conflict (id) do nothing;

create policy if not exists "Public read project-update-videos"
on storage.objects for select
to public
using (bucket_id = 'project-update-videos');

create policy if not exists "Public upload project-update-videos"
on storage.objects for insert
to public
with check (bucket_id = 'project-update-videos');

create policy if not exists "Public update project-update-videos"
on storage.objects for update
to public
using (bucket_id = 'project-update-videos')
with check (bucket_id = 'project-update-videos');

create policy if not exists "Authenticated delete project-update-videos"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-update-videos');
