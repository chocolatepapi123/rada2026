-- RADA social features: bill split, trust after outings, friends who went, interest groups.
-- Run once in the Supabase SQL editor. Safe to run again. Nothing existing is changed or deleted.
-- RADA never holds money here: guests pay the host's own M-Pesa number, then the host confirms.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Friends = people with an accepted match request between us.
create or replace function public.my_friend_ids()
returns setof uuid
language sql stable security definer set search_path to 'public'
as $$
  select case when r.from_user = auth.uid() then r.to_user else r.from_user end
  from public.match_requests r
  where r.status = 'accepted' and auth.uid() in (r.from_user, r.to_user);
$$;

create or replace function public._in_conversation(p_conv text)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.conversation_members m
                 where m.conversation_id::text = p_conv and m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 1) Bill split (group chat)
-- ---------------------------------------------------------------------------
create table if not exists public.bill_splits (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  host_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 80),
  total_kes       integer not null check (total_kes between 1 and 500000),
  host_phone      text not null check (host_phone ~ '^254[17][0-9]{8}$'),
  status          text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at      timestamptz not null default now()
);
create index if not exists bill_splits_conv_idx on public.bill_splits (conversation_id, created_at desc);

create table if not exists public.bill_shares (
  id           uuid primary key default gen_random_uuid(),
  split_id     uuid not null references public.bill_splits(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_handle  text,
  share_kes    integer not null check (share_kes >= 0),
  status       text not null default 'owed' check (status in ('owed', 'claimed', 'confirmed')),
  mpesa_code   text check (mpesa_code is null or mpesa_code ~ '^[A-Z0-9]{8,12}$'),
  claimed_at   timestamptz,
  confirmed_at timestamptz,
  unique (split_id, user_id)
);
create index if not exists bill_shares_user_idx on public.bill_shares (user_id, status);

alter table public.bill_splits enable row level security;
alter table public.bill_shares enable row level security;

drop policy if exists bill_splits_read on public.bill_splits;
create policy bill_splits_read on public.bill_splits for select to authenticated
  using (public._in_conversation(conversation_id));

drop policy if exists bill_shares_read on public.bill_shares;
create policy bill_shares_read on public.bill_shares for select to authenticated
  using (exists (select 1 from public.bill_splits s
                 where s.id = bill_shares.split_id and public._in_conversation(s.conversation_id)));
-- No insert/update/delete policies: every change goes through the functions below.

-- Host starts a split. Everyone in the chat (host included) pays an equal share; any KES left over goes to the host.
create or replace function public.create_bill_split(p_conversation text, p_title text, p_total integer, p_phone text, p_include_host boolean default true)
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare ph text; sid uuid; n integer; each_kes integer; rest integer; m record; amt integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public._in_conversation(p_conversation) then raise exception 'You are not in this chat'; end if;
  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if ph like '0%' then ph := '254' || substr(ph, 2);
  elsif length(ph) = 9 and ph ~ '^[17]' then ph := '254' || ph; end if;
  if ph !~ '^254[17][0-9]{8}$' then raise exception 'Enter a valid Safaricom number, like 0712345678'; end if;
  if p_total is null or p_total < 1 then raise exception 'Enter the total bill'; end if;
  if exists (select 1 from public.bill_splits where conversation_id = p_conversation and status = 'open' and created_at > now() - interval '2 hours') then
    raise exception 'There is already an open bill in this chat. Close it first.';
  end if;

  select count(*) into n from public.conversation_members where conversation_id::text = p_conversation;
  if n < 2 then raise exception 'You need at least one other person in the chat'; end if;
  each_kes := p_total / n;
  rest := p_total - each_kes * n;

  insert into public.bill_splits (conversation_id, host_id, title, total_kes, host_phone)
  values (p_conversation, auth.uid(), left(coalesce(nullif(trim(p_title), ''), 'Bill'), 80), p_total, ph)
  returning id into sid;

  for m in select user_id, user_handle from public.conversation_members where conversation_id::text = p_conversation loop
    amt := each_kes + case when m.user_id = auth.uid() then rest else 0 end;
    insert into public.bill_shares (split_id, user_id, user_handle, share_kes, status, confirmed_at)
    values (sid, m.user_id, m.user_handle, amt,
            case when m.user_id = auth.uid() then 'confirmed' else 'owed' end,
            case when m.user_id = auth.uid() then now() else null end);
  end loop;
  return sid;
end $$;

-- A guest says "I paid", with the M-Pesa message code so the host can match it.
create or replace function public.claim_bill_share(p_split uuid, p_code text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare c text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if c !~ '^[A-Z0-9]{8,12}$' then raise exception 'Enter the M-Pesa code from your confirmation message'; end if;
  update public.bill_shares s set status = 'claimed', mpesa_code = c, claimed_at = now()
   where s.split_id = p_split and s.user_id = auth.uid() and s.status in ('owed', 'claimed')
     and exists (select 1 from public.bill_splits b where b.id = s.split_id and b.status = 'open');
  if not found then raise exception 'This share cannot be changed'; end if;
end $$;

-- Only the host can confirm that the money arrived.
create or replace function public.confirm_bill_share(p_share uuid, p_received boolean default true)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare sp public.bill_splits;
begin
  select b.* into sp from public.bill_shares s join public.bill_splits b on b.id = s.split_id where s.id = p_share;
  if not found or sp.host_id <> auth.uid() then raise exception 'Only the host can do this'; end if;
  if p_received then
    update public.bill_shares set status = 'confirmed', confirmed_at = now() where id = p_share;
  else
    update public.bill_shares set status = 'owed', mpesa_code = null, claimed_at = null where id = p_share;
  end if;
  if not exists (select 1 from public.bill_shares where split_id = sp.id and status <> 'confirmed') then
    update public.bill_splits set status = 'closed' where id = sp.id;
  end if;
end $$;

create or replace function public.close_bill_split(p_split uuid, p_cancel boolean default false)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  update public.bill_splits set status = case when p_cancel then 'cancelled' else 'closed' end
   where id = p_split and host_id = auth.uid() and status = 'open';
  if not found then raise exception 'Only the host can close this bill'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Trust after an outing: "Showed up" and "Felt safe"
-- ---------------------------------------------------------------------------
create table if not exists public.outing_feedback (
  id          uuid primary key default gen_random_uuid(),
  outing_id   text not null,
  from_user   uuid not null references auth.users(id) on delete cascade,
  about_user  uuid not null references auth.users(id) on delete cascade,
  showed_up   boolean not null,
  felt_safe   boolean not null,
  created_at  timestamptz not null default now(),
  unique (outing_id, from_user, about_user),
  check (from_user <> about_user)
);
create index if not exists outing_feedback_about_idx on public.outing_feedback (about_user);
alter table public.outing_feedback enable row level security;
-- Answers are private: you can read only what you gave. Others only ever see the totals from trust_stats().
drop policy if exists outing_feedback_mine on public.outing_feedback;
create policy outing_feedback_mine on public.outing_feedback for select to authenticated using (from_user = auth.uid());

-- p_answers: [{"about":"<uuid>","showed_up":true,"felt_safe":true}, ...]
-- You must have been at the same outing (host, or an approved/joined guest) as the person you answer about.
create or replace function public.submit_outing_feedback(p_outing text, p_answers jsonb)
returns integer
language plpgsql security definer set search_path to 'public'
as $$
declare a jsonb; n integer := 0; me uuid := auth.uid(); host uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select o.host_id into host from public.outings o where o.id::text = p_outing;
  if not found then raise exception 'Outing not found'; end if;
  if me <> host and not exists (select 1 from public.outing_attendees t
       where t.outing_id::text = p_outing and t.user_id = me and t.status in ('joined', 'approved')) then
    raise exception 'You were not on this outing';
  end if;
  for a in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if (a->>'about')::uuid = me then continue; end if;
    if (a->>'about')::uuid <> host and not exists (select 1 from public.outing_attendees t
         where t.outing_id::text = p_outing and t.user_id = (a->>'about')::uuid and t.status in ('joined', 'approved')) then
      continue;
    end if;
    insert into public.outing_feedback (outing_id, from_user, about_user, showed_up, felt_safe)
    values (p_outing, me, (a->>'about')::uuid, coalesce((a->>'showed_up')::boolean, true), coalesce((a->>'felt_safe')::boolean, true))
    on conflict (outing_id, from_user, about_user) do update set showed_up = excluded.showed_up, felt_safe = excluded.felt_safe;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Public totals. A number is shown only once at least 5 different people have answered.
create or replace function public.trust_stats(p_users uuid[])
returns table (user_id uuid, answers integer, showed_up_pct integer, felt_safe_pct integer, trusted boolean)
language sql stable security definer set search_path to 'public'
as $$
  select f.about_user,
         count(*)::int,
         case when count(distinct f.from_user) >= 5 then round(100.0 * avg((f.showed_up)::int))::int end,
         case when count(distinct f.from_user) >= 5 then round(100.0 * avg((f.felt_safe)::int))::int end,
         (count(distinct f.from_user) >= 5 and count(distinct f.outing_id) >= 3
          and avg((f.showed_up)::int) >= 0.9 and avg((f.felt_safe)::int) >= 0.95)
  from public.outing_feedback f
  where f.about_user = any(p_users)
  group by f.about_user;
$$;

-- ---------------------------------------------------------------------------
-- 3) Friends who went (with a switch to hide your own activity)
-- ---------------------------------------------------------------------------
create table if not exists public.user_privacy (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  share_activity boolean not null default true,
  updated_at     timestamptz not null default now()
);
alter table public.user_privacy enable row level security;
drop policy if exists user_privacy_own on public.user_privacy;
create policy user_privacy_own on public.user_privacy for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.spot_visits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  spot_id    text not null,
  spot_title text,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, spot_id, visited_on)
);
create index if not exists spot_visits_spot_idx on public.spot_visits (spot_id, visited_on desc);
alter table public.spot_visits enable row level security;
drop policy if exists spot_visits_own on public.spot_visits;
create policy spot_visits_own on public.spot_visits for select to authenticated using (user_id = auth.uid());

-- Called after an outing the person was really on.
create or replace function public.record_spot_visit(p_spot text, p_title text, p_outing text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null or coalesce(p_spot, '') = '' then return; end if;
  if p_outing is not null and not exists (
       select 1 from public.outing_attendees t where t.outing_id::text = p_outing and t.user_id = auth.uid() and t.status in ('joined', 'approved')
       union all select 1 from public.outings o where o.id::text = p_outing and o.host_id = auth.uid()) then
    return;
  end if;
  insert into public.spot_visits (user_id, spot_id, spot_title) values (auth.uid(), p_spot, left(p_title, 120))
  on conflict do nothing;
end $$;

-- Friends (who have not hidden their activity) that went to a spot in the last 90 days. Handles only.
create or replace function public.friends_who_went(p_spot text)
returns table (user_id uuid, handle text, avatar text)
language sql stable security definer set search_path to 'public'
as $$
  select distinct on (v.user_id) v.user_id, m.user_handle, m.user_avatar
  from public.spot_visits v
  join public.my_friend_ids() f(id) on f.id = v.user_id
  left join public.user_privacy p on p.user_id = v.user_id
  left join lateral (select user_handle, user_avatar from public.conversation_members c
                     where c.user_id = v.user_id and c.user_handle is not null limit 1) m on true
  where v.spot_id = p_spot and v.visited_on > current_date - 90 and coalesce(p.share_activity, true);
$$;

-- Friends going to an event/outing (uses the existing rada_going table), also respecting the switch.
create or replace function public.friends_going(p_event_ids text[])
returns table (event_id text, user_id uuid, handle text, avatar text)
language sql stable security definer set search_path to 'public'
as $$
  select g.event_id::text, g.user_id, m.user_handle, m.user_avatar
  from public.rada_going g
  join public.my_friend_ids() f(id) on f.id = g.user_id
  left join public.user_privacy p on p.user_id = g.user_id
  left join lateral (select user_handle, user_avatar from public.conversation_members c
                     where c.user_id = g.user_id and c.user_handle is not null limit 1) m on true
  where g.event_id::text = any(p_event_ids) and coalesce(p.share_activity, true);
$$;

-- ---------------------------------------------------------------------------
-- 4) Interest groups
-- ---------------------------------------------------------------------------
create table if not exists public.interest_groups (
  id          text primary key,
  name        text not null,
  emoji       text not null,
  blurb       text not null,
  sort        integer not null default 0
);
create table if not exists public.interest_group_members (
  group_id  text not null references public.interest_groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.interest_group_meetups (
  id          uuid primary key default gen_random_uuid(),
  group_id    text not null references public.interest_groups(id) on delete cascade,
  host_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 80),
  place       text not null check (char_length(place) between 2 and 120),
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists igm_group_idx on public.interest_group_meetups (group_id, starts_at);

alter table public.interest_groups enable row level security;
alter table public.interest_group_members enable row level security;
alter table public.interest_group_meetups enable row level security;
drop policy if exists ig_read on public.interest_groups;
create policy ig_read on public.interest_groups for select to authenticated using (true);
drop policy if exists igm_mine on public.interest_group_members;
create policy igm_mine on public.interest_group_members for select to authenticated using (user_id = auth.uid());
drop policy if exists igmeet_read on public.interest_group_meetups;
create policy igmeet_read on public.interest_group_meetups for select to authenticated using (true);

insert into public.interest_groups (id, name, emoji, blurb, sort) values
  ('hiking',      'Hiking',               '🥾', 'Trails and viewpoints around Nairobi, every weekend.', 1),
  ('board-games', 'Board games',          '🎲', 'Card and board game nights with new faces.', 2),
  ('football',    'Football watch party', '⚽', 'Watch the big matches together.', 3),
  ('run-club',    'Run club',             '🏃', 'Easy group runs. All paces welcome.', 4),
  ('photo-walk',  'Photography walks',    '📷', 'Walk, shoot, and swap tips.', 5)
on conflict (id) do nothing;

create or replace function public.join_interest_group(p_group text, p_join boolean default true)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_join then
    insert into public.interest_group_members (group_id, user_id) values (p_group, auth.uid()) on conflict do nothing;
  else
    delete from public.interest_group_members where group_id = p_group and user_id = auth.uid();
  end if;
end $$;

-- Any member can post a meetup, at most 3 upcoming per person.
create or replace function public.create_group_meetup(p_group text, p_title text, p_place text, p_starts timestamptz)
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare mid uuid;
begin
  if not exists (select 1 from public.interest_group_members where group_id = p_group and user_id = auth.uid()) then
    raise exception 'Join the group first';
  end if;
  if p_starts < now() then raise exception 'Pick a time in the future'; end if;
  if (select count(*) from public.interest_group_meetups where host_id = auth.uid() and starts_at > now()) >= 3 then
    raise exception 'You already have 3 upcoming meetups';
  end if;
  insert into public.interest_group_meetups (group_id, host_id, title, place, starts_at)
  values (p_group, auth.uid(), trim(p_title), trim(p_place), p_starts) returning id into mid;
  return mid;
end $$;

-- One call for the Groups screen: member counts, whether I joined, next meetup.
create or replace function public.interest_groups_overview()
returns table (id text, name text, emoji text, blurb text, members integer, joined boolean,
               next_title text, next_place text, next_starts timestamptz, next_id uuid)
language sql stable security definer set search_path to 'public'
as $$
  select g.id, g.name, g.emoji, g.blurb,
         (select count(*)::int from public.interest_group_members m where m.group_id = g.id),
         exists (select 1 from public.interest_group_members m where m.group_id = g.id and m.user_id = auth.uid()),
         nm.title, nm.place, nm.starts_at, nm.id
  from public.interest_groups g
  left join lateral (select t.id, t.title, t.place, t.starts_at from public.interest_group_meetups t
                     where t.group_id = g.id and t.starts_at > now() order by t.starts_at limit 1) nm on true
  order by g.sort;
$$;

revoke execute on function
  public.my_friend_ids(), public.create_bill_split(text, text, integer, text, boolean),
  public.claim_bill_share(uuid, text), public.confirm_bill_share(uuid, boolean), public.close_bill_split(uuid, boolean),
  public.submit_outing_feedback(text, jsonb), public.trust_stats(uuid[]),
  public.record_spot_visit(text, text, text), public.friends_who_went(text), public.friends_going(text[]),
  public.join_interest_group(text, boolean), public.create_group_meetup(text, text, text, timestamptz),
  public.interest_groups_overview(), public._in_conversation(text)
from public, anon;
grant execute on function
  public.my_friend_ids(), public.create_bill_split(text, text, integer, text, boolean),
  public.claim_bill_share(uuid, text), public.confirm_bill_share(uuid, boolean), public.close_bill_split(uuid, boolean),
  public.submit_outing_feedback(text, jsonb), public.trust_stats(uuid[]),
  public.record_spot_visit(text, text, text), public.friends_who_went(text), public.friends_going(text[]),
  public.join_interest_group(text, boolean), public.create_group_meetup(text, text, text, timestamptz),
  public.interest_groups_overview(), public._in_conversation(text)
to authenticated;
