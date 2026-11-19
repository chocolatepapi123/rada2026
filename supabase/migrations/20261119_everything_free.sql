-- RADA: everything is free. Lifts the server-side plan limits so the app and the database agree.
-- Run once in the Supabase SQL editor. Safe to run again. Nothing is deleted and no data is touched.
-- Admin and server jobs stay exempt, as before. The fair-use caps (12 live hangouts, 10 match requests a day,
-- 20 "join next time" taps a day, 30 second videos) are NOT plan limits and are left as they are.

-- 1) Outings: no monthly cap and no attendee cap for anyone.
create or replace function public.rada_enforce_outing_limits() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  return new;
end $$;

-- 2) Every signed-in user can create tickets.
create or replace function public.can_sell_tickets(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null
$$;
grant execute on function public.can_sell_tickets(uuid) to authenticated;

-- 3) Everyone counts as the top plan, so every other limit that reads the plan (video allowance,
--    broadcasts, team seats, badges) opens up too. The block copies the function's real argument
--    names and return type, so it works whatever they are. If the function does not exist it does nothing.
do $$
declare r record;
begin
  for r in
    select p.oid, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as res
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'user_effective_plan'
  loop
    execute format(
      'create or replace function public.user_effective_plan(%s) returns %s language sql stable security definer set search_path = public as %L',
      r.args, r.res, 'select ''elite''::text'
    );
  end loop;
exception when others then
  raise notice 'user_effective_plan was not changed: %', sqlerrm;
end $$;
