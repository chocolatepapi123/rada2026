-- Rada Discover: a real Like, and a "pull up" that opens the chat with the person's own line.

create table if not exists public.ask_likes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  ask_id     uuid not null references public.asks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ask_id)
);
alter table public.ask_likes enable row level security;
-- No policies on purpose: every read and write goes through the functions below.

-- Like an ask. It also leaves your deck (same as passing), and the poster only ever sees a count.
create or replace function public.like_ask(p_ask uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare owner uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select user_id into owner from public.asks where id = p_ask;
  if not found then return; end if;
  if owner = auth.uid() then raise exception 'You cannot like your own post.'; end if;
  insert into public.ask_likes (user_id, ask_id) values (auth.uid(), p_ask) on conflict do nothing;
  insert into public.ask_passes (user_id, ask_id) values (auth.uid(), p_ask) on conflict do nothing;
end $$;

-- Like counts on my own posts.
create or replace function public.my_ask_likes()
returns table (ask_id uuid, likes integer)
language sql stable security definer set search_path to 'public'
as $$
  select a.id, count(l.user_id)::int
  from public.asks a left join public.ask_likes l on l.ask_id = a.id
  where a.user_id = auth.uid()
  group by a.id;
$$;

-- When the poster lets someone in, the chat opens with that person's own line as the first message.
create or replace function public.accept_ask_reply(p_reply uuid)
returns text
language plpgsql security definer set search_path to 'public'
as $$
declare uid uuid := auth.uid(); r ask_replies%rowtype; a asks%rowtype; cid text; note text; rh text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into r from ask_replies where id = p_reply;
  if not found then raise exception 'Reply not found'; end if;
  select * into a from asks where id = r.ask_id;
  if a.user_id <> uid then raise exception 'Only the person who posted can accept.'; end if;
  if exists (select 1 from user_blocks b where (b.blocker_id = uid and b.blocked_id = r.user_id) or (b.blocker_id = r.user_id and b.blocked_id = uid)) then raise exception 'You cannot chat with this person.'; end if;
  cid := 'ask-' || replace(r.id::text, '-', '');
  insert into conversations (id, type, created_by) values (cid, 'direct', uid) on conflict (id) do nothing;
  insert into conversation_members (conversation_id, user_id, user_handle, user_avatar)
    select cid, p.id, '@' || p.username, p.avatar_url from profiles p where p.id in (uid, r.user_id) on conflict do nothing;
  note := 'Pulled up on: "' || left(a.body, 80) || '"';
  if a.plan_title is not null then note := note || '. Plan: ' || a.plan_title || '. You can split the bill here once you go.'; end if;
  insert into messages (conversation_id, client_id, sender_id, sender_handle, kind, content)
    values (cid, 'sys-ask-' || r.id::text, null, null, 'system', note) on conflict do nothing;
  select '@' || username into rh from profiles where id = r.user_id;
  insert into messages (conversation_id, client_id, sender_id, sender_handle, kind, content)
    values (cid, 'pullup-' || r.id::text, r.user_id, rh, 'text', r.message) on conflict do nothing;
  update ask_replies set status = 'accepted' where id = p_reply;
  return cid;
end $$;

revoke execute on function public.like_ask(uuid), public.my_ask_likes() from public, anon;
grant execute on function public.like_ask(uuid), public.my_ask_likes() to authenticated;
