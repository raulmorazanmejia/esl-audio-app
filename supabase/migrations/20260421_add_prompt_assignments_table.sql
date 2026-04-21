create table if not exists public.prompt_assignments (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  class_name text not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique(prompt_id, class_name)
);

create index if not exists prompt_assignments_class_name_idx
  on public.prompt_assignments (class_name);

create index if not exists prompt_assignments_prompt_id_idx
  on public.prompt_assignments (prompt_id);

insert into public.prompt_assignments (prompt_id, class_name, is_visible, created_at)
select
  p.id,
  btrim(p.class_name) as class_name,
  coalesce(p.is_active, false) as is_visible,
  coalesce(p.created_at, now()) as created_at
from public.prompts p
where p.class_name is not null
  and btrim(p.class_name) <> ''
on conflict (prompt_id, class_name) do update
set is_visible = excluded.is_visible;

comment on table public.prompt_assignments is 'Class-specific prompt assignment links. prompts.class_name is legacy compatibility only.';
