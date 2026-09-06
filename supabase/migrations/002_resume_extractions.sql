create table if not exists public.resume_extractions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  parser_version text not null,
  status text not null check (status in ('complete','failed')),
  extracted_text text not null default '',
  extracted_json jsonb not null default '{}'::jsonb,
  parse_error text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists resume_extractions_profile_created_idx
  on public.resume_extractions(profile_id, created_at desc);

alter table public.resume_extractions enable row level security;

create policy "owners read resume extractions"
  on public.resume_extractions for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "owners insert resume extractions"
  on public.resume_extractions for insert to authenticated
  with check ((select auth.uid()) = profile_id);

grant select, insert on public.resume_extractions to authenticated;
