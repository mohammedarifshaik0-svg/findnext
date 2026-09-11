begin;
do $test$
declare
  account uuid;
  purchase uuid := gen_random_uuid();
  before_subscription jsonb;
  result jsonb;
  first_end timestamptz;
  second_end timestamptz;
begin
  select id into account from public.profiles order by created_at limit 1;
  if account is null then raise exception 'Test requires existing profile'; end if;
  select to_jsonb(s) into before_subscription from public.subscriptions s where profile_id=account;
  insert into public.payment_purchases(id,profile_id,mode,plan,billing_cycle,amount_paise,razorpay_order_id)
    values(purchase,account,'test','live','28_days',9900,'order_synthetic_'||purchase);
  result := public.vxl_capture_purchase(purchase,'pay_synthetic_'||purchase,'test','test','test','test');
  if (select to_jsonb(s) from public.subscriptions s where profile_id=account) is distinct from before_subscription then raise exception 'Test mode changed subscription'; end if;
  if exists(select 1 from public.email_delivery_jobs where dedupe_key='purchase-'||purchase) then raise exception 'Test mode queued live email'; end if;
  result := public.vxl_capture_purchase(purchase,'pay_synthetic_'||purchase,'test','test','test','test');
  purchase := gen_random_uuid();
  insert into public.payment_purchases(id,profile_id,mode,plan,billing_cycle,amount_paise,razorpay_order_id)
    values(purchase,account,'live','flex','annual',199900,'order_synthetic_'||purchase);
  result := public.vxl_capture_purchase(purchase,'pay_synthetic_'||purchase,'live','test','test','test');
  select period_ends_at into first_end from public.subscriptions where profile_id=account;
  result := public.vxl_capture_purchase(purchase,'pay_synthetic_'||purchase,'live','test','test','test');
  select period_ends_at into second_end from public.subscriptions where profile_id=account;
  if first_end is distinct from second_end then raise exception 'Duplicate extended access'; end if;
  if (select count(*) from public.email_delivery_jobs where dedupe_key='purchase-'||purchase) <> 1 then raise exception 'Email not deduplicated'; end if;
  if has_function_privilege('authenticated','public.vxl_capture_purchase(uuid,text,text,text,text,text)','EXECUTE') then raise exception 'Unsafe function grant'; end if;
  if has_table_privilege('authenticated','public.payment_purchases','INSERT') then raise exception 'Unsafe table grant'; end if;
end;
$test$;
rollback;
