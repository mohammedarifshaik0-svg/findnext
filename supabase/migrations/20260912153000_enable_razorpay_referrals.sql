-- Apply referral rewards inside the same locked transaction as a live Razorpay capture.
-- Test purchases and duplicate webhook deliveries can never issue a reward.
create or replace function public.vxl_capture_purchase(purchase_id uuid, payment_id text, expected_mode text, email_subject text, email_html text, email_text text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  purchase public.payment_purchases%rowtype;
  membership public.subscriptions%rowtype;
  access_end timestamptz;
  access_start timestamptz;
  recipient text;
  referrer_id uuid;
begin
  select * into purchase from public.payment_purchases where id=purchase_id for update;
  if purchase.id is null or purchase.mode <> expected_mode or purchase.razorpay_order_id is null then
    raise exception 'purchase_mismatch';
  end if;
  if purchase.status='captured' then
    if purchase.razorpay_payment_id <> payment_id then raise exception 'payment_mismatch'; end if;
    return jsonb_build_object('status','captured','test',purchase.mode='test','periodEndsAt',purchase.period_ends_at);
  end if;
  -- Serialize different purchases belonging to one account, including first purchase.
  perform 1 from public.profiles where id=purchase.profile_id for update;
  if purchase.mode='live' then
    select * into membership from public.subscriptions where profile_id=purchase.profile_id for update;
    access_start := case when membership.status='active' and membership.plan=purchase.plan and membership.period_ends_at>now()
      then membership.period_starts_at else now() end;
    -- Preserve remaining paid access when a customer extends or changes plan.
    access_end := greatest(now(), case when membership.status='active' then membership.period_ends_at else now() end)
      + case when purchase.billing_cycle='annual' then interval '365 days' else interval '28 days' end;
    insert into public.subscriptions(profile_id,plan,status,period_starts_at,period_ends_at)
      values(purchase.profile_id,purchase.plan,'active',access_start,access_end)
      on conflict(profile_id) do update set plan=excluded.plan,status='active',period_starts_at=excluded.period_starts_at,
        period_ends_at=excluded.period_ends_at,updated_at=now();
    select email into recipient from public.profiles where id=purchase.profile_id;
    insert into public.email_delivery_jobs(dedupe_key,email_to,subject,html_body,text_body)
      values('purchase-'||purchase.id,recipient,email_subject,email_html,email_text) on conflict(dedupe_key) do nothing;

    -- Lock and redeem one pending referral. The captured-purchase early return above
    -- makes retries idempotent, and this branch is unreachable for test purchases.
    select attribution.referrer_profile_id into referrer_id
      from public.referral_attributions attribution
      where attribution.referred_profile_id=purchase.profile_id and attribution.status='pending'
      for update;
    if referrer_id is not null then
      update public.referral_attributions set status='rewarded',rewarded_at=now()
        where referred_profile_id=purchase.profile_id and status='pending';
      insert into public.subscriptions(profile_id,plan,status,period_starts_at,period_ends_at)
        values(referrer_id,'live','active',now(),now()+interval '30 days')
        on conflict(profile_id) do update set
          plan=case when public.subscriptions.plan='trial' then 'live' else public.subscriptions.plan end,
          status='active',
          period_ends_at=greatest(now(),coalesce(public.subscriptions.period_ends_at,now()))+interval '30 days',
          updated_at=now();
    end if;
  end if;
  update public.payment_purchases set status='captured',razorpay_payment_id=payment_id,
    activated_at=case when mode='live' then now() end,period_ends_at=access_end where id=purchase.id;
  return jsonb_build_object('status','captured','test',purchase.mode='test','periodEndsAt',access_end);
end;
$$;
revoke all on function public.vxl_capture_purchase(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.vxl_capture_purchase(uuid,text,text,text,text,text) to service_role;
