-- Audits signed Razorpay deliveries without retaining full webhook payloads.
create table public.razorpay_webhook_events (
  event_id text primary key,
  event_type text not null check (event_type in ('payment.captured','payment.failed')),
  payment_id text not null,
  mode text not null check (mode in ('test','live')),
  status text not null default 'received' check (status in ('received','processed','failed')),
  delivery_count integer not null default 1 check (delivery_count > 0),
  received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error_category text
);

create index razorpay_webhook_events_payment_idx
  on public.razorpay_webhook_events(payment_id, received_at desc);

alter table public.razorpay_webhook_events enable row level security;
revoke all on public.razorpay_webhook_events from public, anon, authenticated;
grant select, insert, update on public.razorpay_webhook_events to service_role;
