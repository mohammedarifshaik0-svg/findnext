create table public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  domain text not null unique check (
    domain = lower(domain)
    and length(domain) between 4 and 253
    and position('..' in domain) = 0
    and domain ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$'
  ),
  portfolio_slug text not null check (length(portfolio_slug) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'verification_required', 'active', 'error')),
  vercel_verified boolean not null default false,
  dns_configured boolean not null default false,
  verification jsonb not null default '[]'::jsonb check (jsonb_typeof(verification) = 'array' and jsonb_array_length(verification) <= 10),
  dns_records jsonb not null default '[]'::jsonb check (jsonb_typeof(dns_records) = 'array' and jsonb_array_length(dns_records) <= 20),
  last_error text check (last_error is null or length(last_error) <= 500),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_domains_status_domain_idx on public.custom_domains(status, domain);
alter table public.custom_domains enable row level security;

create policy "owners read custom domains" on public.custom_domains
  for select to authenticated
  using ((select auth.uid()) = profile_id);

revoke all on public.custom_domains from anon, authenticated;
grant select on public.custom_domains to authenticated;
grant select, insert, update, delete on public.custom_domains to service_role;

create or replace function public.vxl_resolve_custom_domain(requested_domain text)
returns table (portfolio_slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select domains.portfolio_slug
  from public.custom_domains as domains
  join public.subscriptions as membership on membership.profile_id = domains.profile_id
  where domains.domain = lower(trim(trailing '.' from requested_domain))
    and domains.status = 'active'
    and membership.status = 'active'
    and membership.plan in ('flex', 'care')
    and membership.period_ends_at > now()
  limit 1;
$$;

revoke all on function public.vxl_resolve_custom_domain(text) from public, anon, authenticated;
grant execute on function public.vxl_resolve_custom_domain(text) to anon;

create or replace function private.vxl_phase2_sync_custom_domain_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.custom_domains
    set portfolio_slug = new.portfolio_slug, updated_at = now()
    where profile_id = new.id;
  return new;
end;
$$;

revoke all on function private.vxl_phase2_sync_custom_domain_slug() from public, anon, authenticated;
drop trigger if exists vxl_phase2_sync_custom_domain_slug on public.profiles;
create trigger vxl_phase2_sync_custom_domain_slug
after update of portfolio_slug on public.profiles
for each row
when (old.portfolio_slug is distinct from new.portfolio_slug)
execute function private.vxl_phase2_sync_custom_domain_slug();
