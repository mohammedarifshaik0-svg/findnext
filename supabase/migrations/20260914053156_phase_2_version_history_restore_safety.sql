-- Showcase uploads are immutable evidence for published versions. Their
-- metadata must outlive a draft Showcase being removed or replaced, otherwise
-- restoring a historical revision would leave its signed asset routes broken.
alter table public.showcase_assets
  drop constraint if exists showcase_assets_profile_id_showcase_id_fkey;

alter table public.showcase_assets
  add constraint showcase_assets_showcase_id_length_check
  check (length(showcase_id) between 1 and 100);

create or replace function public.restore_my_portfolio_revision(revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  revision public.profile_revisions%rowtype;
  snapshot jsonb;
  membership public.subscriptions%rowtype;
  cutoff timestamptz;
  latest_revision_id uuid;
begin
  if account_id is null then
    raise exception 'Sign in to restore a version.';
  end if;

  select * into revision
  from public.profile_revisions
  where id = revision_id
    and profile_id = account_id
    and change_type = 'portfolio_published';
  if revision.id is null then
    raise exception 'That version is unavailable.';
  end if;

  select * into membership
  from public.subscriptions
  where profile_id = account_id;

  if membership.profile_id is null
    or membership.status is distinct from 'active'
    or membership.period_ends_at is null
    or membership.period_ends_at <= now()
  then
    raise exception 'Version restoration requires an active VXL plan.';
  end if;

  if membership.plan in ('trial', 'live') then
    select id into latest_revision_id
    from public.profile_revisions
    where profile_id = account_id and change_type = 'portfolio_published'
    order by created_at desc, id desc
    limit 1;
    if latest_revision_id is distinct from revision.id then
      raise exception 'Your plan includes restoration of your latest published version.';
    end if;
  elsif membership.plan = 'flex' then
    cutoff := now() - interval '90 days';
    if revision.created_at < cutoff then
      raise exception 'This version is outside your 90-day Flex history.';
    end if;
  elsif membership.plan = 'care' then
    cutoff := now() - interval '1 year';
    if revision.created_at < cutoff then
      raise exception 'This version is outside your one-year Care history.';
    end if;
  else
    raise exception 'Version restoration requires an active VXL plan.';
  end if;

  snapshot := revision.snapshot_json;
  if jsonb_typeof(snapshot->'profile') <> 'object' then
    raise exception 'This version cannot be restored.';
  end if;

  update public.profiles p set
    full_name = coalesce(snapshot->'profile'->>'full_name', p.full_name),
    headline = coalesce(snapshot->'profile'->>'headline', p.headline),
    professional_summary = coalesce(snapshot->'profile'->>'professional_summary', p.professional_summary),
    email = coalesce(snapshot->'profile'->>'email', p.email),
    phone = coalesce(snapshot->'profile'->>'phone', p.phone),
    city = coalesce(snapshot->'profile'->>'city', p.city),
    country = coalesce(snapshot->'profile'->>'country', p.country),
    pronouns = coalesce(snapshot->'profile'->>'pronouns', p.pronouns),
    portfolio_slug = coalesce(snapshot->'profile'->>'portfolio_slug', p.portfolio_slug),
    theme = coalesce(snapshot->'profile'->>'theme', p.theme),
    accent = coalesce(snapshot->'profile'->>'accent', p.accent),
    text_tone = coalesce(snapshot->'profile'->>'text_tone', p.text_tone),
    effect_intensity = coalesce((snapshot->'profile'->>'effect_intensity')::integer, p.effect_intensity),
    photo_path = case when snapshot->'profile' ? 'photo_path' then snapshot->'profile'->>'photo_path' else p.photo_path end,
    consent_profile_storage = coalesce((snapshot->'profile'->>'consent_profile_storage')::boolean, p.consent_profile_storage),
    consent_talent_discovery = coalesce((snapshot->'profile'->>'consent_talent_discovery')::boolean, p.consent_talent_discovery),
    updated_at = now()
  where p.id = account_id;

  delete from public.experiences where profile_id = account_id;
  insert into public.experiences (id, profile_id, company, role, location, start_date, end_date, is_current, description, sort_order)
  select coalesce(x->>'id', 'exp_' || gen_random_uuid()::text), account_id,
    coalesce(x->>'company', ''), coalesce(x->>'role', ''), coalesce(x->>'location', ''),
    coalesce(x->>'start_date', ''), coalesce(x->>'end_date', ''), coalesce((x->>'is_current')::boolean, false),
    coalesce(x->>'description', ''), n - 1
  from jsonb_array_elements(coalesce(snapshot->'experiences', '[]'::jsonb)) with ordinality as t(x, n);

  delete from public.education where profile_id = account_id;
  insert into public.education (id, profile_id, institution, qualification, field, start_date, end_date, grade, description, sort_order)
  select coalesce(x->>'id', 'edu_' || gen_random_uuid()::text), account_id,
    coalesce(x->>'institution', ''), coalesce(x->>'qualification', ''), coalesce(x->>'field', ''),
    coalesce(x->>'start_date', ''), coalesce(x->>'end_date', ''), coalesce(x->>'grade', ''),
    coalesce(x->>'description', ''), n - 1
  from jsonb_array_elements(coalesce(snapshot->'education', '[]'::jsonb)) with ordinality as t(x, n);

  delete from public.profile_items where profile_id = account_id;
  insert into public.profile_items (id, profile_id, item_type, title, subtitle, description, url, level, issued_at, sort_order)
  select coalesce(x->>'id', 'itm_' || gen_random_uuid()::text), account_id, x->>'item_type',
    coalesce(x->>'title', ''), coalesce(x->>'subtitle', ''), coalesce(x->>'description', ''),
    coalesce(x->>'url', ''), coalesce(x->>'level', ''), coalesce(x->>'issued_at', ''), n - 1
  from jsonb_array_elements(coalesce(snapshot->'items', '[]'::jsonb)) with ordinality as t(x, n)
  where x->>'item_type' in ('skill', 'project', 'achievement', 'certification', 'language', 'link');

  insert into public.profile_revisions (profile_id, changed_by, change_type, snapshot_json)
  values (account_id, account_id, 'draft_restored', snapshot);

  return jsonb_build_object('restored', true, 'restoredAt', now(), 'revisionId', revision.id);
end;
$$;

revoke all on function public.restore_my_portfolio_revision(uuid) from public, anon;
grant execute on function public.restore_my_portfolio_revision(uuid) to authenticated;
