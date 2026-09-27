create table public.showcase_assets (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  showcase_id text not null,
  storage_path text not null unique,
  asset_type text not null check (asset_type in ('image', 'document')),
  original_name text not null check (length(original_name) between 1 and 180),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 8388608),
  detached_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (profile_id, showcase_id) references public.portfolio_showcases(profile_id, id) on delete cascade
);

create index showcase_assets_profile_created_idx on public.showcase_assets(profile_id, created_at desc);
create index showcase_assets_showcase_created_idx on public.showcase_assets(showcase_id, created_at);
alter table public.showcase_assets enable row level security;
create policy "owners read showcase assets" on public.showcase_assets
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "owners create showcase assets" on public.showcase_assets
  for insert to authenticated with check ((select auth.uid()) = profile_id);
grant select, insert on public.showcase_assets to authenticated;
revoke update, delete on public.showcase_assets from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'showcase-assets', 'showcase-assets', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own showcase assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'showcase-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users read own showcase assets"
on storage.objects for select to authenticated
using (bucket_id = 'showcase-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own showcase assets"
on storage.objects for delete to authenticated
using (bucket_id = 'showcase-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
