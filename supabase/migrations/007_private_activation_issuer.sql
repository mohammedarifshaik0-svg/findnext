create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.issue_activation_code(input_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested public.plan_requests%rowtype;
  secret_part text := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  normalized_code text := 'FN' || secret_part;
begin
  select * into requested from public.plan_requests p
    where p.id = input_request_id and p.status <> 'declined'
    for update;
  if requested.id is null then raise exception 'Plan request not found or declined.'; end if;
  if exists (select 1 from public.activation_codes a where a.plan_request_id = input_request_id) then
    raise exception 'An activation code has already been issued for this request.';
  end if;

  insert into public.activation_codes (
    code_hash, plan, duration_days, intended_profile_id, plan_request_id, expires_at
  ) values (
    extensions.digest(normalized_code, 'sha256'),
    requested.plan,
    case when requested.billing_cycle = 'annual' then 365 else 28 end,
    requested.profile_id,
    requested.id,
    now() + interval '14 days'
  );
  update public.plan_requests set status = 'instructions_sent', updated_at = now()
    where id = input_request_id;
  return 'FN-' || secret_part;
end;
$$;

revoke all on function private.issue_activation_code(uuid) from public, anon, authenticated;
grant execute on function private.issue_activation_code(uuid) to service_role;
