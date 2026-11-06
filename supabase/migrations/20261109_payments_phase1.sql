-- RADA Phase 1: prices, yearly billing, clean downgrade on expiry, payment table hardening.
-- Run once in the Supabase SQL editor. Safe to run again. Nothing is deleted.

-- 1) allow yearly billing
alter table public.payment_plans drop constraint if exists payment_plans_billing_period_check;
alter table public.payment_plans add constraint payment_plans_billing_period_check
  check (billing_period in ('weekly','monthly','yearly'));

-- 2) prices (KES). Yearly = 2 months free. Weekly is switched off.
update public.payment_plans set active = false where billing_period = 'weekly';

insert into public.payment_plans (kind, plan, billing_period, period_days, amount_kes, active)
select v.kind, v.plan, v.bp, v.days, v.amt, true
from (values
  ('creator','pro','monthly',30,600),    ('creator','pro','yearly',365,6000),
  ('creator','elite','monthly',30,1800), ('creator','elite','yearly',365,18000),
  ('merchant','pro','monthly',30,2000),  ('merchant','pro','yearly',365,20000),
  ('merchant','elite','monthly',30,6500),('merchant','elite','yearly',365,65000)
) as v(kind, plan, bp, days, amt)
where not exists (select 1 from public.payment_plans p
                  where p.kind = v.kind and p.plan = v.plan and p.billing_period = v.bp);

update public.payment_plans p set amount_kes = v.amt, period_days = v.days, active = true
from (values
  ('creator','pro','monthly',30,600),    ('creator','pro','yearly',365,6000),
  ('creator','elite','monthly',30,1800), ('creator','elite','yearly',365,18000),
  ('merchant','pro','monthly',30,2000),  ('merchant','pro','yearly',365,20000),
  ('merchant','elite','monthly',30,6500),('merchant','elite','yearly',365,65000)
) as v(kind, plan, bp, days, amt)
where p.kind = v.kind and p.plan = v.plan and p.billing_period = v.bp;

-- 3) payments accept 'yearly' (STK push and manual pay both go through this function)
create or replace function public.create_pending_payment(p_user uuid, p_kind text, p_plan text, p_phone text,
  p_period text default 'monthly', p_promotion_id uuid default null)
returns payments
language plpgsql security definer set search_path to 'public'
as $function$
declare pp public.payment_plans; pr public.promotions; sub public.subscriptions; pay public.payments; ph text;
begin
  if p_kind not in ('creator','merchant','promotion') then raise exception 'Invalid plan'; end if;

  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if ph like '0%' then ph := '254' || substr(ph, 2);
  elsif length(ph) = 9 and ph ~ '^[17]' then ph := '254' || ph; end if;
  if ph !~ '^254[17][0-9]{8}$' then raise exception 'Enter a valid Safaricom number, like 0712345678'; end if;

  if p_kind = 'promotion' then
    if p_promotion_id is null then raise exception 'Choose a promotion to pay for'; end if;
    select * into pr from public.promotions where id = p_promotion_id and owner_id = p_user for update;
    if not found then raise exception 'Promotion not found'; end if;
    if pr.status in ('scheduled','active','completed') then raise exception 'This promotion is already paid'; end if;
    if pr.status = 'requested' then raise exception 'This promotion is waiting for approval. You can pay once it is approved.'; end if;
    if pr.status not in ('approved','pending_payment') then raise exception 'This promotion cannot be paid for'; end if;
    if exists (select 1 from public.payments where promotion_id = pr.id and status = 'pending' and created_at >= now() - interval '3 minutes') then
      raise exception 'A payment is already waiting for your M-Pesa PIN. Check your phone.';
    end if;
  else
    if p_plan not in ('pro','elite') then raise exception 'Invalid plan'; end if;
    if p_period not in ('weekly','monthly','yearly') then raise exception 'Invalid billing period'; end if;
    select * into pp from public.payment_plans where kind = p_kind and plan = p_plan and billing_period = p_period and active;
    if not found then raise exception 'This plan is not available to buy yet'; end if;
    if p_kind = 'merchant' and not exists (select 1 from public.rada_businesses where owner_id = p_user) then
      raise exception 'Create your business first';
    end if;
    select * into sub from public.subscriptions where user_id = p_user and kind = p_kind;
    if found and public._sub_live(sub) and sub.plan = 'elite' and p_plan = 'pro' then
      raise exception 'You already have a higher plan';
    end if;
  end if;

  update public.payments set status = 'expired', completed_at = now()
   where user_id = p_user and status = 'pending' and created_at < now() - interval '3 minutes';
  if exists (select 1 from public.payments where user_id = p_user and kind = p_kind and status = 'pending') then
    raise exception 'A payment is already waiting for your M-Pesa PIN. Check your phone.';
  end if;
  if (select count(*) from public.payments where user_id = p_user and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many payment attempts. Try again in a while.';
  end if;

  if p_kind = 'promotion' then
    insert into public.payments (user_id, kind, plan, period_days, amount_kes, method, phone, promotion_id)
    values (p_user, 'promotion', 'promo', greatest(pr.end_date - pr.start_date + 1, 1), pr.amount_kes, 'mpesa', ph, pr.id)
    returning * into pay;
  else
    insert into public.payments (user_id, kind, plan, period_days, amount_kes, method, phone)
    values (p_user, p_kind, p_plan, pp.period_days, pp.amount_kes, 'mpesa', ph)
    returning * into pay;
  end if;
  return pay;
end $function$;

revoke all on function public.create_pending_payment(uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- 4) reminder wording
do $$
declare d text;
begin
  select pg_get_functiondef('public.run_subscription_reminders()'::regprocedure) into d;
  execute replace(d, 'Pay with M-Pesa weekly or monthly to keep it.', 'Pay with M-Pesa, monthly or yearly, to keep it.');
end $$;

-- 5) clean downgrade: when a plan or trial runs out, the business row stops showing Pro/Elite.
--    Data is never touched. (Creator limits already read effective_plan.)
create or replace function public.rada_sweep_expired_subscriptions()
returns integer
language plpgsql security definer set search_path to 'public'
as $$
declare r record; n int := 0;
begin
  for r in
    select s.user_id from public.subscriptions s
     join public.rada_businesses b on b.owner_id = s.user_id
    where s.kind = 'merchant' and s.plan <> 'free' and s.status in ('trialing','active')
      and not public._sub_live(s)
      and (b.subscription_plan is not null or b.subscription_status in ('trialing','active'))
  loop
    perform public._sync_legacy_business_sub(r.user_id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.rada_sweep_expired_subscriptions() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('rada-sweep-expired-subs') where exists (select 1 from cron.job where jobname = 'rada-sweep-expired-subs');
  perform cron.schedule('rada-sweep-expired-subs', '*/30 * * * *', 'select public.rada_sweep_expired_subscriptions()');
end $$;

select public.rada_sweep_expired_subscriptions();

-- 6) lock down payment tables (row-level security already blocks writes; this removes the spare rights)
revoke truncate, references, trigger on public.payments, public.payment_plans, public.subscriptions,
  public.manual_payment_claims, public.manual_pay_config, public.promotions from anon, authenticated;
revoke insert, update, delete on public.payments, public.payment_plans, public.manual_payment_claims from anon, authenticated;
revoke insert, update, delete on public.manual_pay_config from anon;
revoke select on public.payments, public.manual_payment_claims from anon;
