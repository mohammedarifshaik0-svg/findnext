drop policy if exists "owners manage subscriptions" on public.subscriptions;

create policy "owners read subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = profile_id);

revoke insert, update, delete on public.subscriptions from authenticated;

create or replace function public.start_my_trial()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  trial_end timestamptz;
begin
  if account_id is null then
    raise exception 'Sign in to publish.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = account_id
      and p.is_public
      and p.consent_profile_storage
      and length(trim(p.full_name)) > 0
      and length(trim(p.headline)) > 0
      and length(trim(p.professional_summary)) >= 40
      and length(trim(p.email)) > 0
      and length(trim(p.city)) > 0
      and length(trim(p.country)) > 0
      and length(trim(p.portfolio_slug)) >= 3
      and exists (select 1 from public.education e where e.profile_id = account_id)
      and (select count(*) from public.profile_items i where i.profile_id = account_id and i.item_type = 'skill' and length(trim(i.title)) > 0) >= 3
  ) then
    raise exception 'Complete every publishing check before starting the trial.';
  end if;

  select p.trial_ends_at into trial_end from public.profiles p where p.id = account_id;
  if trial_end is null then
    trial_end := now() + interval '7 days';
    update public.profiles
      set trial_started_at = now(), trial_ends_at = trial_end, updated_at = now()
      where id = account_id and trial_started_at is null;

    insert into public.subscriptions (profile_id, plan, status, period_starts_at, period_ends_at)
      values (account_id, 'trial', 'active', now(), trial_end)
      on conflict (profile_id) do update
      set plan = 'trial', status = 'active', period_starts_at = excluded.period_starts_at,
          period_ends_at = excluded.period_ends_at, updated_at = now();
  end if;

  return trial_end;
end;
$$;

revoke all on function public.start_my_trial() from public, anon;
grant execute on function public.start_my_trial() to authenticated;
