create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  student_name text not null,
  student_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists students_class_name_idx on public.students (class_name);
