alter table public.prompts
add column if not exists prompt_image_path text,
add column if not exists prompt_image_url text;

insert into storage.buckets (id, name, public)
values ('prompt-images', 'prompt-images', true)
on conflict (id) do nothing;

create policy if not exists "Public read prompt-images"
on storage.objects for select
to public
using (bucket_id = 'prompt-images');

create policy if not exists "Authenticated upload prompt-images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'prompt-images');

create policy if not exists "Authenticated update prompt-images"
on storage.objects for update
to authenticated
using (bucket_id = 'prompt-images')
with check (bucket_id = 'prompt-images');

create policy if not exists "Authenticated delete prompt-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'prompt-images');
