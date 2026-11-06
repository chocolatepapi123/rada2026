-- Welcome gift: every NEW account gets 30 days of Elite (creator and merchant).
-- Run once in the Supabase SQL editor. Safe to run again. Existing accounts are not touched.
-- If anything in here fails, the sign-up still succeeds (the trigger swallows its own errors).

create or replace function public._grant_welcome_elite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.subscriptions (user_id, kind, plan, status, origin, trial_started_at, trial_ends_at, updated_at)
    select new.id, k, 'elite', 'trialing', 'admin', now(), now() + interval '30 days', now()
      from unnest(array['creator', 'merchant']) as k
    on conflict do nothing;
  exception when others then
    -- never block a sign-up because of the gift
    null;
  end;
  return new;
end;
$$;

drop trigger if exists grant_welcome_elite on public.profiles;
create trigger grant_welcome_elite
  after insert on public.profiles
  for each row execute function public._grant_welcome_elite();
