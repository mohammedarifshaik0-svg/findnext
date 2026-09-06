create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', headline text not null default '', professional_summary text not null default '',
  email text not null default '', phone text not null default '', city text not null default '', country text not null default '', pronouns text not null default '',
  portfolio_slug text not null unique, theme text not null default 'studio', accent text not null default 'indigo', is_public boolean not null default false,
  trial_started_at timestamptz, trial_ends_at timestamptz, consent_profile_storage boolean not null default true,
  consent_talent_discovery boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.experiences (
  id text primary key, profile_id uuid not null references public.profiles(id) on delete cascade,
  company text not null default '', role text not null default '', location text not null default '', start_date text not null default '', end_date text not null default '',
  is_current boolean not null default false, description text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.education (
  id text primary key, profile_id uuid not null references public.profiles(id) on delete cascade,
  institution text not null default '', qualification text not null default '', field text not null default '', start_date text not null default '', end_date text not null default '',
  grade text not null default '', description text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profile_items (
  id text primary key, profile_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('skill','project','achievement','certification','language','link')),
  title text not null default '', subtitle text not null default '', description text not null default '', url text not null default '', level text not null default '',
  issued_at text not null default '', sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null, original_name text not null, content_type text not null, size_bytes bigint not null,
  parse_status text not null default 'uploaded' check (parse_status in ('uploaded','processing','review','complete','failed')),
  is_primary boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profile_revisions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete cascade, change_type text not null, snapshot_json jsonb not null,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial','live','premium')),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  period_starts_at timestamptz, period_ends_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index experiences_profile_order_idx on public.experiences(profile_id, sort_order);
create index education_profile_order_idx on public.education(profile_id, sort_order);
create index profile_items_profile_type_order_idx on public.profile_items(profile_id, item_type, sort_order);
create index resumes_profile_created_idx on public.resumes(profile_id, created_at desc);
create index profile_revisions_profile_created_idx on public.profile_revisions(profile_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.education enable row level security;
alter table public.profile_items enable row level security;
alter table public.resumes enable row level security;
alter table public.profile_revisions enable row level security;
alter table public.subscriptions enable row level security;

create policy "owners manage profile" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "live profiles are public" on public.profiles for select to anon, authenticated using (is_public and (trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = id and s.status = 'active' and s.plan in ('live','premium') and (s.period_ends_at is null or s.period_ends_at > now()))));

create policy "owners manage experiences" on public.experiences for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "live experiences are public" on public.experiences for select to anon, authenticated using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','premium') and (s.period_ends_at is null or s.period_ends_at > now())))));
create policy "owners manage education" on public.education for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "live education is public" on public.education for select to anon, authenticated using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','premium') and (s.period_ends_at is null or s.period_ends_at > now())))));
create policy "owners manage profile items" on public.profile_items for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "live profile items are public" on public.profile_items for select to anon, authenticated using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','premium') and (s.period_ends_at is null or s.period_ends_at > now())))));

create policy "owners manage resumes" on public.resumes for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "owners manage revisions" on public.profile_revisions for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id and (select auth.uid()) = changed_by);
create policy "owners manage subscriptions" on public.subscriptions for all to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "live subscription state is readable" on public.subscriptions for select to anon using (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public));

grant select, insert, update, delete on public.profiles, public.experiences, public.education, public.profile_items, public.resumes, public.profile_revisions, public.subscriptions to authenticated;
grant select on public.profiles, public.experiences, public.education, public.profile_items, public.subscriptions to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "users upload own resumes" on storage.objects for insert to authenticated with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users read own resumes" on storage.objects for select to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own resumes" on storage.objects for update to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own resumes" on storage.objects for delete to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
