-- Phase 2 foundation. This migration is intentionally additive: Phase 1 rows,
-- publishing, and public snapshots continue to work without these tables.

create table public.portfolio_showcases (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('project')),
  source_id text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 1 and 80),
  title text not null default '' check (length(title) <= 180),
  summary text not null default '' check (length(summary) <= 1000),
  challenge text not null default '' check (length(challenge) <= 4000),
  approach text not null default '' check (length(approach) <= 4000),
  outcome text not null default '' check (length(outcome) <= 4000),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 12),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 10),
  is_enabled boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, id),
  unique (profile_id, source_type, source_id),
  unique (profile_id, slug)
);

create index portfolio_showcases_profile_order_idx on public.portfolio_showcases(profile_id, sort_order, id);
alter table public.portfolio_showcases enable row level security;
create policy "owners manage portfolio showcases" on public.portfolio_showcases
  for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
grant select, insert, update, delete on public.portfolio_showcases to authenticated;
revoke all on public.portfolio_showcases from anon;

create table public.custom_sections (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  description text not null default '' check (length(description) <= 1000),
  layout text not null default 'cards' check (layout in ('cards', 'list', 'timeline')),
  is_visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, id)
);

create index custom_sections_profile_order_idx on public.custom_sections(profile_id, sort_order, id);
alter table public.custom_sections enable row level security;
create policy "owners manage custom sections" on public.custom_sections
  for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
grant select, insert, update, delete on public.custom_sections to authenticated;
revoke all on public.custom_sections from anon;

create table public.custom_section_items (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  section_id text not null,
  title text not null default '' check (length(title) <= 180),
  subtitle text not null default '' check (length(subtitle) <= 180),
  description text not null default '' check (length(description) <= 4000),
  url text not null default '' check (length(url) <= 500),
  date_label text not null default '' check (length(date_label) <= 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, section_id) references public.custom_sections(profile_id, id) on delete cascade
);

create index custom_section_items_section_order_idx on public.custom_section_items(profile_id, section_id, sort_order, id);
alter table public.custom_section_items enable row level security;
create policy "owners manage custom section items" on public.custom_section_items
  for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
grant select, insert, update, delete on public.custom_section_items to authenticated;
revoke all on public.custom_section_items from anon;

-- Keep Phase 1's publishing RPC unchanged. This trigger adds Phase 2 content to
-- the same frozen snapshot immediately before it is written.
create or replace function private.vxl_phase2_attach_content_to_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.snapshot_json := new.snapshot_json || jsonb_build_object(
    'showcases', coalesce((
      select jsonb_agg(to_jsonb(s) - array['profile_id', 'created_at', 'updated_at'] order by s.sort_order, s.id)
      from public.portfolio_showcases s
      where s.profile_id = new.profile_id and s.is_enabled
    ), '[]'::jsonb),
    'customSections', coalesce((
      select jsonb_agg(
        (to_jsonb(section_row) - array['profile_id', 'created_at', 'updated_at']) ||
        jsonb_build_object('items', coalesce((
          select jsonb_agg(to_jsonb(item_row) - array['profile_id', 'section_id', 'created_at', 'updated_at'] order by item_row.sort_order, item_row.id)
          from public.custom_section_items item_row
          where item_row.profile_id = new.profile_id and item_row.section_id = section_row.id
        ), '[]'::jsonb))
        order by section_row.sort_order, section_row.id
      )
      from public.custom_sections section_row
      where section_row.profile_id = new.profile_id and section_row.is_visible
    ), '[]'::jsonb)
  );
  return new;
end;
$$;

drop trigger if exists vxl_phase2_attach_content on public.published_portfolios;
create trigger vxl_phase2_attach_content
before insert or update of snapshot_json on public.published_portfolios
for each row execute function private.vxl_phase2_attach_content_to_snapshot();

-- Version restoration remains complete once Phase 2 is enabled: restoring a
-- published revision also restores the showcase records captured with it.
create or replace function private.vxl_phase2_restore_content_from_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.change_type <> 'draft_restored' then
    return new;
  end if;

  if jsonb_typeof(new.snapshot_json->'showcases') = 'array' then
    delete from public.portfolio_showcases where profile_id = new.profile_id;
    insert into public.portfolio_showcases (
      id, profile_id, source_type, source_id, slug, title, summary, challenge, approach, outcome,
      links, media, is_enabled, sort_order
    )
    select
      coalesce(value->>'id', 'showcase_' || gen_random_uuid()::text), new.profile_id, 'project',
      coalesce(value->>'source_id', ''), coalesce(value->>'slug', 'project-' || ordinality::text),
      coalesce(value->>'title', ''), coalesce(value->>'summary', ''), coalesce(value->>'challenge', ''),
      coalesce(value->>'approach', ''), coalesce(value->>'outcome', ''), coalesce(value->'links', '[]'::jsonb),
      coalesce(value->'media', '[]'::jsonb), coalesce((value->>'is_enabled')::boolean, true), ordinality - 1
    from jsonb_array_elements(new.snapshot_json->'showcases') with ordinality as restored(value, ordinality)
    where coalesce(value->>'source_id', '') <> '';
  end if;

  if jsonb_typeof(new.snapshot_json->'customSections') = 'array' then
    delete from public.custom_sections where profile_id = new.profile_id;
    insert into public.custom_sections (id, profile_id, title, description, layout, is_visible, sort_order)
    select
      coalesce(section_value->>'id', 'custom_section_' || gen_random_uuid()::text), new.profile_id,
      coalesce(section_value->>'title', ''), coalesce(section_value->>'description', ''),
      case when section_value->>'layout' in ('cards', 'list', 'timeline') then section_value->>'layout' else 'cards' end,
      coalesce((section_value->>'is_visible')::boolean, true), section_ordinality - 1
    from jsonb_array_elements(new.snapshot_json->'customSections') with ordinality as sections(section_value, section_ordinality)
    where coalesce(section_value->>'title', '') <> '';

    insert into public.custom_section_items (id, profile_id, section_id, title, subtitle, description, url, date_label, sort_order)
    select
      coalesce(item_value->>'id', 'custom_item_' || gen_random_uuid()::text), new.profile_id,
      section_value->>'id', coalesce(item_value->>'title', ''), coalesce(item_value->>'subtitle', ''),
      coalesce(item_value->>'description', ''), coalesce(item_value->>'url', ''), coalesce(item_value->>'date_label', ''),
      item_ordinality - 1
    from jsonb_array_elements(new.snapshot_json->'customSections') as section_rows(section_value)
    cross join lateral jsonb_array_elements(coalesce(section_value->'items', '[]'::jsonb)) with ordinality as items(item_value, item_ordinality)
    where coalesce(section_value->>'id', '') <> '' and coalesce(item_value->>'title', '') <> '';
  end if;

  return new;
end;
$$;

drop trigger if exists vxl_phase2_restore_content on public.profile_revisions;
create trigger vxl_phase2_restore_content
after insert on public.profile_revisions
for each row execute function private.vxl_phase2_restore_content_from_revision();
