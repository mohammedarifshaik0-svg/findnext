create table public.operation_rate_limits (
  account_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (account_id, action)
);
alter table public.operation_rate_limits enable row level security;
revoke all on public.operation_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.operation_rate_limits to service_role;

create function public.vxl_operation_allowed(account_id uuid, operation text, max_attempts integer, window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  if max_attempts < 1 or window_seconds < 1 then raise exception 'Invalid limit'; end if;
  insert into public.operation_rate_limits as limits (account_id,action)
  values(vxl_operation_allowed.account_id,operation)
  on conflict on constraint operation_rate_limits_pkey do update set
    attempts = case when limits.window_started_at <= now()-make_interval(secs=>window_seconds) then 1 else limits.attempts+1 end,
    window_started_at = case when limits.window_started_at <= now()-make_interval(secs=>window_seconds) then now() else limits.window_started_at end
  returning attempts into n;
  return n<=max_attempts;
end;
$$;
revoke all on function public.vxl_operation_allowed(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.vxl_operation_allowed(uuid,text,integer,integer) to service_role;
