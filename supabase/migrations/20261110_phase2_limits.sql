-- RADA Phase 2: fair-use caps and plan limits, enforced in Postgres.
-- Most of this is already live (it was applied by hand earlier); this file puts it in the repo and
-- adds ONE fix: a host could create an outing within the cap and then raise max_attendees afterwards.
-- Run once in the Supabase SQL editor. Safe to run again. Nothing is deleted. Existing data is never touched.
-- Admin (hello.rada.app@gmail.com) and server jobs (no signed-in user) are exempt.

-- Normal users (free forever): 12 live hangouts
create or replace function public.rada_enforce_hangout_limits() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_used int;
begin
  if auth.uid() is null or public.is_rada_admin() then return new; end if;
  if new.status is distinct from 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' then return new; end if;
  select count(*) into v_used from public.hangouts
   where user_id = new.user_id and status = 'published' and id <> new.id;
  if v_used >= 12 then
    raise exception 'You have 12 live hangouts. Take one down or delete an old one to post a new one.' using hint = 'hangout_limit';
  end if;
  return new;
end $$;

-- 30 second hangout videos
create or replace function public.rada_enforce_hangout_video() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or public.is_rada_admin() then return new; end if;
  if new.kind = 'video' and coalesce(new.duration, 0) > 30.5 then
    raise exception 'Hangout videos can be up to 30 seconds.' using hint = 'video_length';
  end if;
  return new;
end $$;

-- 10 match requests a day (Nairobi day)
create or replace function public.rada_enforce_match_limit() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_used int;
begin
  if public.is_rada_admin() then return new; end if;
  select count(*) into v_used from public.match_requests
   where from_user = new.from_user and created_at >= public._nairobi_day_start();
  if v_used >= 10 then
    raise exception 'You have sent 10 requests today. Come back tomorrow.' using hint = 'match_daily_limit';
  end if;
  return new;
end $$;

-- 20 "join next time" taps a day
create or replace function public.rada_enforce_join_next_limit() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_used int;
begin
  if public.is_rada_admin() then return new; end if;
  select count(*) into v_used from public.hangout_actions
   where from_user = new.from_user and action = 'join_next' and created_at >= public._nairobi_day_start();
  if v_used >= 20 then
    raise exception 'That is 20 "join next time" taps today. Try again tomorrow.' using hint = 'join_next_daily_limit';
  end if;
  return new;
end $$;

-- Creators: 4 / 10 / unlimited outings a month, 10 / 30 / unlimited people. Checked on create AND on edit.
create or replace function public.rada_enforce_outing_limits() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_plan text; v_limit int; v_cap int; v_used int;
begin
  if auth.uid() is null or public.is_rada_admin() or new.host_id is null then return new; end if;
  v_plan := public.user_effective_plan(new.host_id);
  v_cap  := case v_plan when 'free' then 10 when 'pro' then 30 else null end;

  if v_cap is not null and coalesce(new.max_attendees, 0) > v_cap then
    -- On edit, only block when the number is being RAISED, so old outings stay editable after a downgrade.
    if tg_op = 'INSERT' or coalesce(old.max_attendees, 0) < new.max_attendees then
      raise exception 'Your % plan allows up to % attendees per outing.', v_plan, v_cap using hint = 'attendee_cap';
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_limit := case v_plan when 'free' then 4 when 'pro' then 10 else null end;
    if v_limit is not null then
      select count(*) into v_used from public.outings
       where host_id = new.host_id and created_at >= public._nairobi_month_start();
      if v_used >= v_limit then
        raise exception 'You have reached your % outings for this month on the % plan.', v_limit, v_plan using hint = 'outing_limit';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists rada_enforce_outing_limits_trg on public.outings;
create trigger rada_enforce_outing_limits_trg before insert on public.outings
  for each row execute function public.rada_enforce_outing_limits();

drop trigger if exists rada_enforce_outing_attendees_upd_trg on public.outings;
create trigger rada_enforce_outing_attendees_upd_trg before update of max_attendees on public.outings
  for each row execute function public.rada_enforce_outing_limits();

-- Merchants: spots 1/5/unlimited, offers 2/10/unlimited, events per month 2/10/unlimited.
-- Applies when a listing is created or published again. Listings already live are never removed.
-- (Function already live; left as is.)
