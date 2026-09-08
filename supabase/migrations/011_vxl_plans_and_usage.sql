alter table public.plan_requests drop constraint if exists plan_requests_amount_paise_check;
alter table public.plan_requests add constraint plan_requests_amount_paise_check check (amount_paise = any (case
  when plan = 'live' and billing_cycle = '28_days' then array[5000,9900]
  when plan = 'flex' and billing_cycle = '28_days' then array[10000,19900]
  when plan = 'care' and billing_cycle = '28_days' then array[25000,49900]
  when plan = 'live' and billing_cycle = 'annual' then array[49900,99900]
  when plan = 'flex' and billing_cycle = 'annual' then array[99900,199900]
  when plan = 'care' and billing_cycle = 'annual' then array[249900,499900]
end));

create table public.subscription_usage_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entitlement text not null check (entitlement in ('published_updates','resume_reimports','ai_improvements')),
  units smallint not null default 1 check (units > 0 and units <= 100),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index subscription_usage_events_profile_time_idx
  on public.subscription_usage_events(profile_id, occurred_at desc);

alter table public.subscription_usage_events enable row level security;
create policy "owners read their plan usage" on public.subscription_usage_events
  for select to authenticated using ((select auth.uid()) = profile_id);
grant select on public.subscription_usage_events to authenticated;
revoke insert, update, delete on public.subscription_usage_events from anon, authenticated;

create or replace function public.consume_my_entitlement(input_entitlement text, input_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  membership public.subscriptions%rowtype;
  cycle_start timestamptz;
  cycle_end timestamptz;
  used_count integer;
  allowance integer;
begin
  if account_id is null then raise exception 'Sign in to continue.'; end if;
  if input_entitlement not in ('published_updates','resume_reimports','ai_improvements') then raise exception 'Unknown plan allowance.'; end if;
  perform pg_advisory_xact_lock(hashtext(account_id::text || input_entitlement));
  select * into membership from public.subscriptions where profile_id = account_id and status = 'active' and period_ends_at > now();
  if membership.id is null or membership.plan = 'trial' then raise exception 'A paid VXL plan is required for another résumé import.'; end if;
  cycle_start := membership.period_starts_at + (floor(extract(epoch from (now() - membership.period_starts_at)) / 2419200) * interval '28 days');
  cycle_end := least(membership.period_ends_at, cycle_start + interval '28 days');
  allowance := case
    when input_entitlement = 'published_updates' and membership.plan = 'live' then 2
    when input_entitlement = 'published_updates' then null
    when input_entitlement = 'resume_reimports' and membership.plan = 'live' then 1
    when input_entitlement = 'resume_reimports' and membership.plan = 'flex' then 5
    when input_entitlement = 'resume_reimports' and membership.plan = 'care' then 10
    when input_entitlement = 'ai_improvements' and membership.plan = 'live' then 3
    when input_entitlement = 'ai_improvements' and membership.plan = 'flex' then 30
    when input_entitlement = 'ai_improvements' and membership.plan = 'care' then 60
  end;
  select coalesce(sum(units),0)::integer into used_count from public.subscription_usage_events
    where profile_id = account_id and entitlement = input_entitlement and occurred_at >= cycle_start and occurred_at < cycle_end;
  if allowance is not null and used_count >= allowance then
    raise exception 'You have used all % allowances for this cycle. Your saved profile is safe.', replace(input_entitlement, '_', ' ');
  end if;
  insert into public.subscription_usage_events(profile_id, entitlement, metadata)
    values(account_id, input_entitlement, coalesce(input_metadata, '{}'::jsonb));
  return jsonb_build_object('used', used_count + 1, 'limit', allowance, 'cycleEndsAt', cycle_end);
end;
$$;
revoke all on function public.consume_my_entitlement(text,jsonb) from public, anon;
grant execute on function public.consume_my_entitlement(text,jsonb) to authenticated;
