alter table public.prompts
add column if not exists class_name text;

create index if not exists prompts_class_name_idx
  on public.prompts (class_name);
