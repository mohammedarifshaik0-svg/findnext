create table public.email_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  email_to text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_delivery_jobs_due_idx
  on public.email_delivery_jobs (next_attempt_at, created_at)
  where status in ('queued', 'failed');

alter table public.email_delivery_jobs enable row level security;
revoke all on public.email_delivery_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.email_delivery_jobs to service_role;

