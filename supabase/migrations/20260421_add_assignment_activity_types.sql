alter table public.prompts
add column if not exists assignment_type text,
add column if not exists external_url text;

update public.prompts
set assignment_type = case
  when response_mode = 'video' then 'video_response'
  else 'audio_response'
end
where assignment_type is null;

alter table public.prompts
alter column assignment_type set default 'audio_response';

update public.prompts
set assignment_type = 'audio_response'
where assignment_type is null;

alter table public.prompts
alter column assignment_type set not null;

alter table public.prompts
drop constraint if exists prompts_assignment_type_check;

alter table public.prompts
add constraint prompts_assignment_type_check
check (assignment_type in ('audio_response', 'video_response', 'text_response', 'external_link', 'guided_speaking', 'multiple_choice'));
