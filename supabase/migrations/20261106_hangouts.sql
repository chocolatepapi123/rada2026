-- Hangouts: photos / short videos a person posts on their own profile.
-- No likes, no comments. Other people can only take hangout-specific actions (join next time, plan it, save the spot).
-- A hangout is either a draft (only the owner sees it) or published (anyone signed in can see it).
-- Run once in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.hangouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  caption      text check (caption is null or char_length(caption) <= 280),
  spot_id      text,                      -- RADA spot this hangout was at (optional)
  spot_title   text,
  area         text,                      -- e.g. Kilimani
  happened_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists hangouts_user_idx on public.hangouts (user_id, status, coalesce(published_at, created_at) desc);

create table if not exists public.hangout_media (
  id         uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references public.hangouts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('photo', 'video')),
  url        text not null,
  path       text not null,               -- storage path, so files can be deleted with the hangout
  position   integer not null default 0,
  duration   numeric,                     -- seconds, videos only
  created_at timestamptz not null default now()
);
create index if not exists hangout_media_idx on public.hangout_media (hangout_id, position);

-- What other people can do on a hangout. One row per person per action.
--   join_next : "I'd come along next time" (the owner sees who asked)
-- ("plan a date here", "save the spot" and "say hi" reuse existing features, so they need no table.)
create table if not exists public.hangout_actions (
  id         uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references public.hangouts(id) on delete cascade,
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  action     text not null check (action in ('join_next')),
  created_at timestamptz not null default now(),
  unique (hangout_id, from_user, action)
);
create index if not exists hangout_actions_to_idx on public.hangout_actions (to_user, created_at desc);

-- keep updated_at fresh
create or replace function public._hangouts_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'draft' then new.published_at := null; end if;
  return new;
end $$;
drop trigger if exists hangouts_touch on public.hangouts;
create trigger hangouts_touch before insert or update on public.hangouts
  for each row execute function public._hangouts_touch();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.hangouts        enable row level security;
alter table public.hangout_media   enable row level security;
alter table public.hangout_actions enable row level security;

drop policy if exists hangouts_read   on public.hangouts;
drop policy if exists hangouts_insert on public.hangouts;
drop policy if exists hangouts_update on public.hangouts;
drop policy if exists hangouts_delete on public.hangouts;
create policy hangouts_read   on public.hangouts for select to authenticated using (status = 'published' or user_id = auth.uid());
create policy hangouts_insert on public.hangouts for insert to authenticated with check (user_id = auth.uid());
create policy hangouts_update on public.hangouts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy hangouts_delete on public.hangouts for delete to authenticated using (user_id = auth.uid());

drop policy if exists hangout_media_read   on public.hangout_media;
drop policy if exists hangout_media_insert on public.hangout_media;
drop policy if exists hangout_media_update on public.hangout_media;
drop policy if exists hangout_media_delete on public.hangout_media;
-- media is visible when its hangout is (published, or yours)
create policy hangout_media_read on public.hangout_media for select to authenticated using (
  exists (select 1 from public.hangouts h where h.id = hangout_id and (h.status = 'published' or h.user_id = auth.uid()))
);
create policy hangout_media_insert on public.hangout_media for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.hangouts h where h.id = hangout_id and h.user_id = auth.uid())
);
create policy hangout_media_update on public.hangout_media for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy hangout_media_delete on public.hangout_media for delete to authenticated using (user_id = auth.uid());

drop policy if exists hangout_actions_read   on public.hangout_actions;
drop policy if exists hangout_actions_insert on public.hangout_actions;
drop policy if exists hangout_actions_delete on public.hangout_actions;
create policy hangout_actions_read on public.hangout_actions for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy hangout_actions_insert on public.hangout_actions for insert to authenticated with check (
  from_user = auth.uid()
  and from_user <> to_user
  and exists (select 1 from public.hangouts h where h.id = hangout_id and h.user_id = to_user and h.status = 'published')
);
create policy hangout_actions_delete on public.hangout_actions for delete to authenticated using (from_user = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket for the photos and videos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hangout-media', 'hangout-media', true, 52428800,   -- 50 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hangout_media_files_read   on storage.objects;
drop policy if exists hangout_media_files_insert on storage.objects;
drop policy if exists hangout_media_files_delete on storage.objects;
create policy hangout_media_files_read   on storage.objects for select using (bucket_id = 'hangout-media');
create policy hangout_media_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hangout-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy hangout_media_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'hangout-media' and (storage.foldername(name))[1] = auth.uid()::text);
