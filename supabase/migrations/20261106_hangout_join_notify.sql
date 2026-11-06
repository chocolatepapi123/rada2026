-- 6E: tell the hangout owner when someone taps "Join next time".
-- Adds one row to the in-app notifications inbox (the bell). Safe to run more than once.
create or replace function public._hangout_join_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who   text;
  spot  text;
begin
  if new.action <> 'join_next' then return new; end if;
  select coalesce(nullif(username, ''), 'Someone') into who from public.profiles where id = new.from_user;
  select coalesce(nullif(spot_title, ''), 'your hangout') into spot from public.hangouts where id = new.hangout_id;
  -- don't repeat if they toggled on/off within a day
  if exists (
    select 1 from public.notifications
    where user_id = new.to_user and type = 'hangout_join'
      and data->>'hangout_id' = new.hangout_id::text and data->>'from_user' = new.from_user::text
      and created_at > now() - interval '1 day'
  ) then return new; end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.to_user, 'hangout_join',
    'Someone wants to join next time',
    case when who = 'Someone' then 'Someone' else '@' || ltrim(who, '@') end || ' would come along next time to ' || spot || '.',
    jsonb_build_object('hangout_id', new.hangout_id, 'from_user', new.from_user)
  );
  return new;
end $$;

drop trigger if exists hangout_join_notify on public.hangout_actions;
create trigger hangout_join_notify after insert on public.hangout_actions
  for each row execute function public._hangout_join_notify();
