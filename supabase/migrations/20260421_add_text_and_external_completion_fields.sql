alter table public.student_submissions
add column if not exists text_response text,
add column if not exists completion_marked_at timestamptz;

-- Backfill completion timestamps for any legacy rows already marked completed.
update public.student_submissions
set completion_marked_at = coalesce(completion_marked_at, created_at, now())
where status = 'completed'
  and completion_marked_at is null;
