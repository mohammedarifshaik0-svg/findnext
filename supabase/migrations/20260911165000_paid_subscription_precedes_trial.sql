-- Paid access must take precedence over trial state on every publish.
-- This prevents a first publish from replacing an already active paid subscription.

create or replace function public.publish_my_portfolio()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  draft public.profiles%rowtype;
  membership public.subscriptions%rowtype;
  previous public.published_portfolios%rowtype;
  portfolio_snapshot jsonb;
  trial_end timestamptz;
  cycle_start timestamptz;
  cycle_end timestamptz;
  used_count integer := 0;
  allowance integer;
  next_version integer;
  usage_recorded boolean := false;
begin
  if account_id is null then
    raise exception 'Sign in to publish.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('publish:' || account_id::text, 0));

  select * into draft
  from public.profiles
  where id = account_id
  for update;

  if draft.id is null then
    raise exception 'Save your portfolio draft before publishing.';
  end if;

  if not draft.consent_profile_storage
    or length(trim(draft.full_name)) = 0
    or length(trim(draft.headline)) = 0
    or length(trim(draft.professional_summary)) < 40
    or length(trim(draft.email)) = 0
    or length(trim(draft.city)) = 0
    or length(trim(draft.country)) = 0
    or length(trim(draft.portfolio_slug)) < 3
    or not exists (select 1 from public.education e where e.profile_id = account_id)
    or (select count(*) from public.profile_items i where i.profile_id = account_id and i.item_type = 'skill' and length(trim(i.title)) > 0) < 3
  then
    raise exception 'Complete every publishing check before publishing.';
  end if;

  portfolio_snapshot := jsonb_build_object(
    'profile', to_jsonb(draft) - array['created_at', 'updated_at', 'is_public', 'trial_started_at', 'trial_ends_at'],
    'experiences', coalesce((
      select jsonb_agg(to_jsonb(e) - array['profile_id', 'created_at', 'updated_at'] order by e.sort_order, e.id)
      from public.experiences e where e.profile_id = account_id
    ), '[]'::jsonb),
    'education', coalesce((
      select jsonb_agg(to_jsonb(e) - array['profile_id', 'created_at', 'updated_at'] order by e.sort_order, e.id)
      from public.education e where e.profile_id = account_id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) - array['profile_id', 'created_at', 'updated_at'] order by i.sort_order, i.id)
      from public.profile_items i where i.profile_id = account_id
    ), '[]'::jsonb),
    'resume', (
      select jsonb_build_object(
        'storage_path', r.storage_path,
        'original_name', r.original_name,
        'content_type', r.content_type
      )
      from public.resumes r
      where r.profile_id = account_id and r.is_primary
      order by r.created_at desc
      limit 1
    )
  );

  select * into previous
  from public.published_portfolios
  where profile_id = account_id
  for update;

  if previous.profile_id is not null
    and previous.snapshot_json = portfolio_snapshot
    and previous.is_public
  then
    update public.profiles set is_public = true, updated_at = now() where id = account_id;
    return jsonb_build_object(
      'published', true,
      'unchanged', true,
      'version', previous.version_number,
      'publishedAt', previous.published_at,
      'used', null,
      'limit', null,
      'remaining', null
    );
  end if;

  select * into membership
  from public.subscriptions s
  where s.profile_id = account_id
    and s.status = 'active'
    and s.plan in ('live', 'flex', 'care')
    and s.period_ends_at > now()
  for update;

  if membership.id is not null then
    cycle_start := coalesce(membership.period_starts_at, now())
      + (floor(extract(epoch from (now() - coalesce(membership.period_starts_at, now()))) / 2419200) * interval '28 days');
    cycle_end := least(membership.period_ends_at, cycle_start + interval '28 days');
    allowance := case when membership.plan = 'live' then 2 else null end;

    select coalesce(sum(units), 0)::integer into used_count
    from public.subscription_usage_events
    where profile_id = account_id
      and entitlement = 'published_updates'
      and occurred_at >= cycle_start
      and occurred_at < cycle_end;

    if allowance is not null and used_count >= allowance then
      raise exception 'You have used both Live publishing updates for this cycle. Your draft is saved safely.';
    end if;

    insert into public.subscription_usage_events (profile_id, entitlement, metadata)
    values (account_id, 'published_updates', jsonb_build_object(
      'previousVersion', coalesce(previous.version_number, 0),
      'slug', draft.portfolio_slug
    ));
    usage_recorded := true;
  elsif draft.trial_started_at is null then
    trial_end := now() + interval '7 days';
    update public.profiles
      set trial_started_at = now(), trial_ends_at = trial_end
      where id = account_id;
    insert into public.subscriptions (profile_id, plan, status, period_starts_at, period_ends_at)
      values (account_id, 'trial', 'active', now(), trial_end)
      on conflict (profile_id) do update set
        plan = 'trial', status = 'active', period_starts_at = excluded.period_starts_at,
        period_ends_at = excluded.period_ends_at, updated_at = now();
  elsif draft.trial_ends_at > now() then
    trial_end := draft.trial_ends_at;
  else
    raise exception 'Your trial has ended. Choose Live, Flex, or Care to publish this draft.';
  end if;

  next_version := coalesce(previous.version_number, 0) + 1;

  insert into public.published_portfolios (
    profile_id, slug, snapshot_json, is_public, version_number, published_at, updated_at
  ) values (
    account_id, draft.portfolio_slug, portfolio_snapshot, true, next_version, now(), now()
  )
  on conflict (profile_id) do update set
    slug = excluded.slug,
    snapshot_json = excluded.snapshot_json,
    is_public = true,
    version_number = excluded.version_number,
    published_at = excluded.published_at,
    updated_at = now();

  update public.profiles set is_public = true, updated_at = now() where id = account_id;

  insert into public.profile_revisions (profile_id, changed_by, change_type, snapshot_json)
  values (account_id, account_id, 'portfolio_published', portfolio_snapshot);

  return jsonb_build_object(
    'published', true,
    'unchanged', false,
    'version', next_version,
    'publishedAt', now(),
    'used', case when usage_recorded then used_count + 1 else null end,
    'limit', allowance,
    'remaining', case when allowance is null then null else greatest(allowance - used_count - 1, 0) end,
    'cycleEndsAt', cycle_end,
    'trialEndsAt', trial_end
  );
end;
$$;

revoke all on function public.publish_my_portfolio() from public, anon;
grant execute on function public.publish_my_portfolio() to authenticated;

