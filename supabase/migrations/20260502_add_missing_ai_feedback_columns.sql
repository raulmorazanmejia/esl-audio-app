alter table public.student_submissions
add column if not exists ai_grammar_feedback text,
add column if not exists ai_strengths jsonb,
add column if not exists ai_improvements jsonb,
add column if not exists ai_picture_accuracy jsonb,
add column if not exists ai_score_reason text,
add column if not exists ai_model_answer text;
