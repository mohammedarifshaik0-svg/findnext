update public.subscriptions
set status = 'expired', updated_at = now()
where status = 'active'
  and (
    period_starts_at is null
    or period_ends_at is null
    or period_ends_at <= period_starts_at
  );

alter table public.subscriptions
  add constraint subscriptions_active_period_check
  check (
    status <> 'active'
    or (
      period_starts_at is not null
      and period_ends_at is not null
      and period_ends_at > period_starts_at
    )
  );
