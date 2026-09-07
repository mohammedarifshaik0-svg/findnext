alter table public.profiles
  add column if not exists effect_intensity smallint not null default 65;

alter table public.profiles drop constraint if exists profiles_effect_intensity_check;
alter table public.profiles add constraint profiles_effect_intensity_check
  check (effect_intensity between 0 and 100);

alter table public.activation_codes
  add column if not exists delivery_status text not null default 'not_sent',
  add column if not exists email_sent_at timestamptz;

alter table public.activation_codes drop constraint if exists activation_codes_delivery_status_check;
alter table public.activation_codes add constraint activation_codes_delivery_status_check
  check (delivery_status in ('not_sent', 'drafted', 'sent', 'failed'));

create unique index if not exists activation_codes_one_per_request_idx
  on public.activation_codes(plan_request_id)
  where plan_request_id is not null;

create or replace function public.issue_activation_code(input_request_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  issued_code text;
begin
  issued_code := private.issue_activation_code(input_request_id);
  update public.activation_codes
    set delivery_status = 'drafted'
    where plan_request_id = input_request_id;
  return issued_code;
end;
$$;

revoke all on function public.issue_activation_code(uuid) from public, anon, authenticated;
grant execute on function public.issue_activation_code(uuid) to service_role;
