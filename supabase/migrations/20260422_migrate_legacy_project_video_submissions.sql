do $$
declare
  created_class_prompts_count integer := 0;
  created_fallback_prompt_count integer := 0;
  migrated_submission_count integer := 0;
begin
  create temp table tmp_legacy_video_rows on commit drop as
  select
    l.id as legacy_id,
    l.student_id,
    l.student_name,
    l.student_code,
    l.class_name,
    l.video_path,
    l.video_url,
    l.created_at,
    coalesce(nullif(btrim(l.class_name), ''), nullif(btrim(s.class_name), '')) as resolved_class_name
  from public.project_video_submissions l
  left join public.students s
    on s.id = l.student_id
    or (nullif(btrim(l.student_code), '') is not null and s.student_code = l.student_code);

  create temp table tmp_legacy_classes on commit drop as
  select distinct resolved_class_name as class_name
  from tmp_legacy_video_rows
  where resolved_class_name is not null;

  insert into public.prompts (
    prompt_text,
    assignment_type,
    class_name,
    is_active,
    created_at
  )
  select
    format('Legacy video submission (%s)', c.class_name),
    'video_response',
    null,
    false,
    now()
  from tmp_legacy_classes c
  where not exists (
    select 1
    from public.prompt_assignments pa
    join public.prompts p
      on p.id = pa.prompt_id
    where pa.class_name = c.class_name
      and p.assignment_type = 'video_response'
  );

  get diagnostics created_class_prompts_count = row_count;

  create temp table tmp_class_prompt_map on commit drop as
  select
    c.class_name,
    (
      select p.id
      from public.prompt_assignments pa
      join public.prompts p
        on p.id = pa.prompt_id
      where pa.class_name = c.class_name
        and p.assignment_type = 'video_response'
      order by pa.is_visible desc, p.created_at desc, p.id desc
      limit 1
    ) as prompt_id
  from tmp_legacy_classes c;

  insert into public.prompt_assignments (prompt_id, class_name, is_visible, created_at)
  select
    m.prompt_id,
    m.class_name,
    true,
    now()
  from tmp_class_prompt_map m
  where m.prompt_id is not null
  on conflict (prompt_id, class_name)
  do update
  set is_visible = true;

  if exists (
    select 1
    from tmp_legacy_video_rows
    where resolved_class_name is null
  ) then
    insert into public.prompts (
      prompt_text,
      assignment_type,
      class_name,
      is_active,
      created_at
    )
    select
      'Legacy video submission (unassigned class)',
      'video_response',
      null,
      false,
      now()
    where not exists (
      select 1
      from public.prompts p
      where p.prompt_text = 'Legacy video submission (unassigned class)'
        and p.assignment_type = 'video_response'
    );

    get diagnostics created_fallback_prompt_count = row_count;
  end if;

  insert into public.student_submissions (
    student_name,
    student_code,
    prompt_id,
    response_mode,
    prompt_text,
    video_path,
    video_url,
    status,
    created_at
  )
  select
    l.student_name,
    l.student_code,
    coalesce(
      cm.prompt_id,
      (
        select p.id
        from public.prompts p
        where p.prompt_text = 'Legacy video submission (unassigned class)'
          and p.assignment_type = 'video_response'
        order by p.created_at desc, p.id desc
        limit 1
      )
    ) as target_prompt_id,
    'video',
    coalesce(
      p.prompt_text,
      'Legacy video submission (unassigned class)'
    ) as target_prompt_text,
    l.video_path,
    l.video_url,
    'submitted',
    coalesce(l.created_at, now())
  from tmp_legacy_video_rows l
  left join tmp_class_prompt_map cm
    on cm.class_name = l.resolved_class_name
  left join public.prompts p
    on p.id = cm.prompt_id
  where l.video_path is not null
    and l.video_url is not null
    and coalesce(
      cm.prompt_id,
      (
        select p2.id
        from public.prompts p2
        where p2.prompt_text = 'Legacy video submission (unassigned class)'
          and p2.assignment_type = 'video_response'
        order by p2.created_at desc, p2.id desc
        limit 1
      )
    ) is not null
    and not exists (
      select 1
      from public.student_submissions s
      where s.response_mode = 'video'
        and s.student_code = l.student_code
        and coalesce(s.video_path, '') = coalesce(l.video_path, '')
    );

  get diagnostics migrated_submission_count = row_count;

  raise notice 'Legacy project video migration complete. Created class prompts: %, created fallback prompts: %, migrated submissions: %',
    created_class_prompts_count,
    created_fallback_prompt_count,
    migrated_submission_count;
end
$$;
