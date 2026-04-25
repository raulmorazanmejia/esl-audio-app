create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy if not exists "Public read app settings"
on public.app_settings for select
to public
using (true);

create policy if not exists "Authenticated write app settings"
on public.app_settings for all
to authenticated
using (true)
with check (true);

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_app_settings_updated_at();

insert into storage.buckets (id, name, public)
values ('app-assets', 'app-assets', true)
on conflict (id) do nothing;

create policy if not exists "Public read app-assets"
on storage.objects for select
to public
using (bucket_id = 'app-assets');

create policy if not exists "Authenticated upload app-assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'app-assets');

create policy if not exists "Authenticated update app-assets"
on storage.objects for update
to authenticated
using (bucket_id = 'app-assets')
with check (bucket_id = 'app-assets');

create policy if not exists "Authenticated delete app-assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'app-assets');
