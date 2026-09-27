alter table public.ai_writing_requests
  add column if not exists failure_category text,
  add column if not exists completed_at timestamptz;

alter table public.ai_writing_requests
  drop constraint if exists ai_writing_requests_failure_category_check;
alter table public.ai_writing_requests
  add constraint ai_writing_requests_failure_category_check
  check (failure_category is null or failure_category in ('gateway_authentication','gateway_credit','rate_limit','timeout','provider_response','quality_guard','generation'));

create or replace function public.vxl_ai_reserve(account_id uuid,request_id uuid,input_field text,input_text text,input_model text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  existing public.ai_writing_requests%rowtype;
  usage jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai:'||account_id::text,0));
  update public.ai_writing_requests set status='failed',failure_category='timeout'
    where profile_id=account_id and status='pending' and expires_at<=now();
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
  if (select count(*) from public.ai_writing_requests where profile_id=account_id and created_at>now()-interval '1 hour')>=20 then
    return jsonb_build_object('error','Please take a break and try again in an hour.');
  end if;
  if (select count(*) from public.ai_writing_requests where profile_id=account_id and status in ('pending','complete') and created_at>now()-interval '1 hour')>=12 then
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

create or replace function public.vxl_ai_finish(account_id uuid,request_id uuid,output_text text,token_usage jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.ai_writing_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai:'||account_id::text,0));
  select * into r from public.ai_writing_requests where id=request_id and profile_id=account_id for update;
  if r.id is null then raise exception 'Request unavailable'; end if;
  if r.status='complete' then return jsonb_build_object('id',r.id,'field',r.field,'source_text',r.source_text,'result_text',r.result_text,'status','complete'); end if;
  if r.status<>'pending' or r.expires_at<now() then raise exception 'Request expired'; end if;
  if length(trim(output_text))<1 or length(output_text)>(case r.field when 'headline' then 180 else 4000 end) then raise exception 'Invalid result'; end if;
  update public.ai_writing_requests set result_text=output_text,token_usage=vxl_ai_finish.token_usage,status='complete',completed_at=now(),failure_category=null where id=request_id;
  insert into public.subscription_usage_events(profile_id,entitlement,occurred_at,metadata)
    values(account_id,'ai_improvements',r.created_at,jsonb_build_object('requestId',request_id,'model',r.model));
  return jsonb_build_object('id',r.id,'field',r.field,'source_text',r.source_text,'result_text',output_text,'status','complete');
end;
$$;

create or replace function public.vxl_ai_fail(account_id uuid,request_id uuid,input_failure_category text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare updated_id uuid;
begin
  if input_failure_category not in ('gateway_authentication','gateway_credit','rate_limit','timeout','provider_response','quality_guard','generation') then
    input_failure_category := 'generation';
  end if;
  update public.ai_writing_requests
    set status='failed',failure_category=input_failure_category,completed_at=now()
    where id=request_id and profile_id=account_id and status='pending'
    returning id into updated_id;
  return jsonb_build_object('updated',updated_id is not null);
end;
$$;

revoke all on function public.vxl_ai_fail(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.vxl_ai_fail(uuid,uuid,text) to service_role;
revoke all on function public.vxl_ai_reserve(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.vxl_ai_finish(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.vxl_ai_reserve(uuid,uuid,text,text,text) to service_role;
grant execute on function public.vxl_ai_finish(uuid,uuid,text,jsonb) to service_role;
