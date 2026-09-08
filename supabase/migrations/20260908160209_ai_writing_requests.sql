create table public.ai_writing_requests (
  id uuid primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  field text not null check (field in ('headline','summary')),
  source_text text not null check (length(source_text) between 10 and 4000),
  result_text text,
  model text not null,
  token_usage jsonb,
  status text not null default 'pending' check (status in ('pending','complete','failed')),
  created_at timestamptz not null default now(),
  cycle_start timestamptz not null,
  expires_at timestamptz not null default now() + interval '2 minutes'
);
create index ai_writing_profile_time_idx on public.ai_writing_requests(profile_id,created_at desc);
alter table public.ai_writing_requests enable row level security;
revoke all on public.ai_writing_requests from anon,authenticated;
grant select,insert,update,delete on public.ai_writing_requests to service_role;

-- Only the server may call these functions, after validating the user's session.
create function public.vxl_ai_usage(account_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  p public.profiles%rowtype;
  s public.subscriptions%rowtype;
  starts timestamptz;
  ends timestamptz;
  cap integer := 0;
  used integer;
begin
  select * into p from public.profiles where id=account_id;
  if p.id is null then return jsonb_build_object('used',0,'allowance',0,'remaining',0,'resetsAt',null); end if;
  select * into s from public.subscriptions where profile_id=account_id and status='active' and period_ends_at>now() and plan in ('live','flex','care');
  if s.id is not null and s.period_starts_at is not null then
    cap := case s.plan when 'live' then 3 when 'flex' then 30 when 'care' then 60 end;
    starts := s.period_starts_at + greatest(0,floor(extract(epoch from (now()-s.period_starts_at))/2419200))*interval '28 days';
    ends := least(s.period_ends_at, starts+interval '28 days');
  elsif p.trial_started_at is null or p.trial_ends_at>now() then
    cap := 5;
    starts := p.created_at;
    ends := p.trial_ends_at;
  else
    starts := p.created_at;
  end if;
  select coalesce(sum(units),0)::integer into used from public.subscription_usage_events
    where profile_id=account_id and entitlement='ai_improvements' and occurred_at>=starts
    and (ends is null or occurred_at<ends);
  return jsonb_build_object('used',used,'allowance',cap,'remaining',greatest(0,cap-used),'resetsAt',ends,'cycleStart',starts);
end;
$$;

create function public.vxl_ai_reserve(account_id uuid,request_id uuid,input_field text,input_text text,input_model text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  existing public.ai_writing_requests%rowtype;
  usage jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai:'||account_id::text,0));
  select * into existing from public.ai_writing_requests where id=request_id;
  if existing.id is not null then
    if existing.profile_id<>account_id or existing.field<>input_field or existing.source_text<>input_text then
      return jsonb_build_object('error','This request ID is already in use.');
    elsif existing.status='complete' then
      return jsonb_build_object('id',existing.id,'field',existing.field,'source_text',existing.source_text,'result_text',existing.result_text,'status','complete');
    else return jsonb_build_object('error','This request has already started. Check your saved suggestions before trying again.'); end if;
  end if;
  if exists(select 1 from public.ai_writing_requests where profile_id=account_id and status='pending' and expires_at>now()) then
    return jsonb_build_object('error','An improvement is already running. Please wait.');
  end if;
  if (select count(*) from public.ai_writing_requests where profile_id=account_id and created_at>now()-interval '1 hour')>=12 then
    return jsonb_build_object('error','Please take a break and try again in an hour.');
  end if;
  usage := public.vxl_ai_usage(account_id);
  if (usage->>'remaining')::integer<=0 then
    return jsonb_build_object('error','No AI improvements remain. Choose a plan or wait for your next cycle.');
  end if;
  insert into public.ai_writing_requests(id,profile_id,field,source_text,model,cycle_start)
    values(request_id,account_id,input_field,input_text,input_model,(usage->>'cycleStart')::timestamptz);
  return jsonb_build_object('status','pending');
end;
$$;

create function public.vxl_ai_finish(account_id uuid,request_id uuid,output_text text,token_usage jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.ai_writing_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai:'||account_id::text,0));
  select * into r from public.ai_writing_requests where id=request_id and profile_id=account_id for update;
  if r.id is null then raise exception 'Request unavailable'; end if;
  if r.status='complete' then return jsonb_build_object('id',r.id,'field',r.field,'source_text',r.source_text,'result_text',r.result_text,'status','complete'); end if;
  if r.status<>'pending' or r.expires_at<now() then raise exception 'Request expired'; end if;
  if length(trim(output_text))<1 or length(output_text)>(case r.field when 'headline' then 180 else 4000 end) then raise exception 'Invalid result'; end if;
  update public.ai_writing_requests set result_text=output_text,token_usage=vxl_ai_finish.token_usage,status='complete' where id=request_id;
  insert into public.subscription_usage_events(profile_id,entitlement,occurred_at,metadata)
    values(account_id,'ai_improvements',r.created_at,jsonb_build_object('requestId',request_id,'model',r.model));
  return jsonb_build_object('id',r.id,'field',r.field,'source_text',r.source_text,'result_text',output_text,'status','complete');
end;
$$;

revoke all on function public.vxl_ai_usage(uuid) from public,anon,authenticated;
revoke all on function public.vxl_ai_reserve(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.vxl_ai_finish(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.vxl_ai_usage(uuid) to service_role;
grant execute on function public.vxl_ai_reserve(uuid,uuid,text,text,text) to service_role;
grant execute on function public.vxl_ai_finish(uuid,uuid,text,jsonb) to service_role;
