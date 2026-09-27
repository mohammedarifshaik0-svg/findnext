create table public.portfolio_engagement_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'showcase_view',
    'resume_download',
    'contact_click',
    'external_link_click',
    'evidence_open'
  )),
  target_key text not null default '',
  target_label text,
  visitor_hash text not null,
  occurred_at timestamptz not null default now(),
  event_day date not null default current_date,
  referrer_domain text,
  device_class text not null check (device_class in ('mobile','desktop','tablet','other')),
  unique (profile_id, visitor_hash, event_type, target_key, event_day)
);

create index portfolio_engagement_profile_time_idx
  on public.portfolio_engagement_events(profile_id, occurred_at desc);

alter table public.portfolio_engagement_events enable row level security;
revoke all on public.portfolio_engagement_events from anon, authenticated;
grant select, insert, delete on public.portfolio_engagement_events to service_role;

comment on table public.portfolio_engagement_events is
  'Privacy-safe, daily-deduplicated engagement signals for published portfolios. Raw IP addresses are never stored.';
