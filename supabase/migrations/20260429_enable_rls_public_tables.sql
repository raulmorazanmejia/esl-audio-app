alter table public.prompts enable row level security;
alter table public.prompt_assignments enable row level security;
alter table public.students enable row level security;
alter table public.student_submissions enable row level security;

create policy if not exists "Public read prompts"
on public.prompts for select
to anon, authenticated
using (true);

create policy if not exists "Authenticated manage prompts"
on public.prompts for all
to authenticated
using (true)
with check (true);

create policy if not exists "Public read prompt assignments"
on public.prompt_assignments for select
to anon, authenticated
using (true);

create policy if not exists "Authenticated manage prompt assignments"
on public.prompt_assignments for all
to authenticated
using (true)
with check (true);

create policy if not exists "Public read students for code lookup"
on public.students for select
to anon, authenticated
using (true);

create policy if not exists "Authenticated manage students"
on public.students for all
to authenticated
using (true)
with check (true);

create policy if not exists "Authenticated manage submissions"
on public.student_submissions for all
to authenticated
using (true)
with check (true);
