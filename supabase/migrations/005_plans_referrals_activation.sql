alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('trial','live','flex','care'));

create table public.referral_codes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check (code = upper(code) and length(code) between 6 and 24),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referral_attributions (
  referred_profile_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','rewarded','cancelled')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referred_profile_id <> referrer_profile_id)
);

create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('live','flex','care')),
  billing_cycle text not null check (billing_cycle in ('28_days','annual')),
  amount_paise integer not null,
  email text not null,
  referral_code text not null default '',
  status text not null default 'requested' check (status in ('requested','instructions_sent','payment_review','approved','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paise = case
    when plan = 'live' and billing_cycle = '28_days' then 5000
    when plan = 'flex' and billing_cycle = '28_days' then 10000
    when plan = 'care' and billing_cycle = '28_days' then 25000
    when plan = 'live' and billing_cycle = 'annual' then 49900
    when plan = 'flex' and billing_cycle = 'annual' then 99900
    when plan = 'care' and billing_cycle = 'annual' then 249900
  end)
);

create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  plan text not null check (plan in ('live','flex','care')),
  duration_days integer not null check (duration_days in (28,365)),
  intended_profile_id uuid references public.profiles(id) on delete set null,
  plan_request_id uuid references public.plan_requests(id) on delete set null,
  expires_at timestamptz not null,
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index referral_attributions_referrer_idx on public.referral_attributions(referrer_profile_id, status);
create index plan_requests_profile_created_idx on public.plan_requests(profile_id, created_at desc);
create index activation_codes_request_idx on public.activation_codes(plan_request_id);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.plan_requests enable row level security;
alter table public.activation_codes enable row level security;

create policy "owners read referral code" on public.referral_codes for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "owners create referral code" on public.referral_codes for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy "participants read referral attribution" on public.referral_attributions for select to authenticated
  using ((select auth.uid()) in (referred_profile_id, referrer_profile_id));
create policy "owners read plan requests" on public.plan_requests for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "owners create plan requests" on public.plan_requests for insert to authenticated
  with check ((select auth.uid()) = profile_id);

grant select, insert on public.referral_codes to authenticated;
grant select on public.referral_attributions to authenticated;
grant select, insert on public.plan_requests to authenticated;
revoke all on public.activation_codes from anon, authenticated;

create or replace function public.apply_referral_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  owner_id uuid;
  normalized text := upper(trim(input_code));
begin
  if account_id is null then raise exception 'Sign in to apply a referral code.'; end if;
  select r.profile_id into owner_id
    from public.referral_codes r
    where r.code = normalized and r.is_active;
  if owner_id is null then raise exception 'That referral code is not valid.'; end if;
  if owner_id = account_id then raise exception 'You cannot use your own referral code.'; end if;
  insert into public.referral_attributions (referred_profile_id, referrer_profile_id, referral_code)
    values (account_id, owner_id, normalized)
    on conflict (referred_profile_id) do nothing;
  return found;
end;
$$;

create or replace function public.redeem_activation_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  normalized text := regexp_replace(upper(trim(input_code)), '[^A-Z0-9]', '', 'g');
  token public.activation_codes%rowtype;
  starts_at timestamptz := now();
  ends_at timestamptz;
  referrer_id uuid;
begin
  if account_id is null then raise exception 'Sign in to redeem an activation code.'; end if;
  select * into token from public.activation_codes a
    where a.code_hash = extensions.digest(normalized, 'sha256')
      and a.redeemed_at is null and a.expires_at > now()
    for update;
  if token.id is null then raise exception 'This activation code is invalid, expired, or already used.'; end if;
  if token.intended_profile_id is not null and token.intended_profile_id <> account_id then
    raise exception 'This activation code belongs to a different account.';
  end if;

  select greatest(now(), coalesce(s.period_ends_at, now())) into starts_at
    from public.subscriptions s where s.profile_id = account_id;
  starts_at := coalesce(starts_at, now());
  ends_at := starts_at + make_interval(days => token.duration_days);

  insert into public.subscriptions (profile_id, plan, status, period_starts_at, period_ends_at)
    values (account_id, token.plan, 'active', now(), ends_at)
    on conflict (profile_id) do update set
      plan = excluded.plan, status = 'active', period_starts_at = excluded.period_starts_at,
      period_ends_at = excluded.period_ends_at, updated_at = now();
  update public.activation_codes set redeemed_by = account_id, redeemed_at = now() where id = token.id;
  if token.plan_request_id is not null then
    update public.plan_requests set status = 'approved', updated_at = now() where id = token.plan_request_id;
  end if;

  select a.referrer_profile_id into referrer_id from public.referral_attributions a
    where a.referred_profile_id = account_id and a.status = 'pending' for update;
  if referrer_id is not null then
    update public.referral_attributions set status = 'rewarded', rewarded_at = now()
      where referred_profile_id = account_id and status = 'pending';
    insert into public.subscriptions (profile_id, plan, status, period_starts_at, period_ends_at)
      values (referrer_id, 'live', 'active', now(), now() + interval '30 days')
      on conflict (profile_id) do update set
        plan = case when public.subscriptions.plan = 'trial' then 'live' else public.subscriptions.plan end,
        status = 'active',
        period_ends_at = greatest(now(), coalesce(public.subscriptions.period_ends_at, now())) + interval '30 days',
        updated_at = now();
  end if;

  return jsonb_build_object('plan', token.plan, 'periodEndsAt', ends_at);
end;
$$;

revoke all on function public.apply_referral_code(text) from public, anon;
grant execute on function public.apply_referral_code(text) to authenticated;
revoke all on function public.redeem_activation_code(text) from public, anon;
grant execute on function public.redeem_activation_code(text) to authenticated;

drop policy if exists "live profiles are public" on public.profiles;
create policy "live profiles are public" on public.profiles for select to anon, authenticated using
  (is_public and (trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = id and s.status = 'active' and s.plan in ('live','flex','care') and s.period_ends_at > now())));
drop policy if exists "live experiences are public" on public.experiences;
create policy "live experiences are public" on public.experiences for select to anon, authenticated using
  (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','flex','care') and s.period_ends_at > now()))));
drop policy if exists "live education is public" on public.education;
create policy "live education is public" on public.education for select to anon, authenticated using
  (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','flex','care') and s.period_ends_at > now()))));
drop policy if exists "live profile items are public" on public.profile_items;
create policy "live profile items are public" on public.profile_items for select to anon, authenticated using
  (exists (select 1 from public.profiles p where p.id = profile_id and p.is_public and (p.trial_ends_at > now() or exists (select 1 from public.subscriptions s where s.profile_id = p.id and s.status = 'active' and s.plan in ('live','flex','care') and s.period_ends_at > now()))));
