create table public.care_support_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reference text not null unique,
  request_type text not null check (request_type in ('priority_support', 'managed_update')),
  category text not null check (category in ('portfolio', 'custom_domain', 'technical', 'account', 'billing', 'other')),
  subject text not null check (char_length(subject) between 4 and 160),
  message text not null check (char_length(message) between 20 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  cycle_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((request_type = 'managed_update') = (cycle_started_at is not null))
);

create index care_support_profile_created_idx
  on public.care_support_requests(profile_id, created_at desc);

create unique index care_managed_update_cycle_idx
  on public.care_support_requests(profile_id, cycle_started_at)
  where request_type = 'managed_update';

alter table public.care_support_requests enable row level security;
revoke all on public.care_support_requests from public, anon, authenticated;
grant select on public.care_support_requests to authenticated;
grant select, insert, update, delete on public.care_support_requests to service_role;

create policy "care members read their support requests"
  on public.care_support_requests for select
  to authenticated
  using ((select auth.uid()) = profile_id);

comment on table public.care_support_requests is
  'Care plan priority support and managed-update requests. Writes are server-owned; members can read only their own history.';
