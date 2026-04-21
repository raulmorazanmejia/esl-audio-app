alter table public.prompts
add column if not exists response_mode text not null default 'audio';

update public.prompts
set response_mode = 'audio'
where response_mode is null;

alter table public.prompts
add constraint prompts_response_mode_check
check (response_mode in ('audio', 'video', 'text', 'multiple_choice', 'guided_speaking'));

alter table public.student_submissions
add column if not exists prompt_id uuid references public.prompts(id) on delete set null,
add column if not exists response_mode text,
add column if not exists video_path text,
add column if not exists video_url text;

update public.student_submissions s
set prompt_id = p.id
from public.prompts p
where s.prompt_id is null
  and s.prompt_text is not null
  and p.prompt_text = s.prompt_text;

update public.student_submissions
set response_mode = case when video_url is not null then 'video' else 'audio' end
where response_mode is null;

alter table public.student_submissions
alter column response_mode set default 'audio';

update public.student_submissions
set response_mode = 'audio'
where response_mode is null;

alter table public.student_submissions
alter column response_mode set not null;

alter table public.student_submissions
add constraint student_submissions_response_mode_check
check (response_mode in ('audio', 'video', 'text', 'multiple_choice', 'guided_speaking'));

create index if not exists student_submissions_prompt_id_idx
  on public.student_submissions (prompt_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('student-response-videos', 'student-response-videos', true)
on conflict (id) do nothing;

create policy if not exists "Public read student-response-videos"
on storage.objects for select
to public
using (bucket_id = 'student-response-videos');

create policy if not exists "Public upload student-response-videos"
on storage.objects for insert
to public
with check (bucket_id = 'student-response-videos');

create policy if not exists "Public update student-response-videos"
on storage.objects for update
to public
using (bucket_id = 'student-response-videos')
with check (bucket_id = 'student-response-videos');

create policy if not exists "Authenticated delete student-response-videos"
on storage.objects for delete
to authenticated
using (bucket_id = 'student-response-videos');
