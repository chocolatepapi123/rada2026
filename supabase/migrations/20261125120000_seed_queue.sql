-- Campus-area spot seeder: queue, run log, skip list, kill switch.
-- Additive only. Touches no existing table except one row in feature_switches.

create table if not exists public.seed_anchors (
  id            uuid primary key default gen_random_uuid(),
  institution   text not null,
  area          text not null default '',
  county        text,
  inst_type     text,
  kind          text not null default 'institution' check (kind in ('institution','zone')),
  radius_m      integer not null default 1500,
  lat           double precision,
  lng           double precision,
  place_id      text,
  resolved_name text,
  resolve_status text not null default 'pending'
    check (resolve_status in ('pending','resolved','unresolved')),
  seed_status   text not null default 'pending'
    check (seed_status in ('pending','running','done','failed')),
  spots_added   integer not null default 0,
  note          text,
  updated_at    timestamptz not null default now(),
  unique (institution, area)
);

create table if not exists public.seed_runs (
  id                  bigint generated always as identity primary key,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  anchors_done        integer not null default 0,
  spots_added         integer not null default 0,
  searches            integer not null default 0,
  photos_downloaded   integer not null default 0,
  photos_face_rejected integer not null default 0,
  photos_other_rejected integer not null default 0,
  note                text
);

create table if not exists public.seed_skipped (
  place_id   text primary key,
  reason     text,
  created_at timestamptz not null default now()
);

alter table public.seed_anchors enable row level security;
alter table public.seed_runs    enable row level security;
alter table public.seed_skipped enable row level security;

-- Service role only (the seeder). No policies on purpose.
revoke all on public.seed_anchors from anon, authenticated;
revoke all on public.seed_runs    from anon, authenticated;
revoke all on public.seed_skipped from anon, authenticated;

create index if not exists seed_anchors_pick_idx
  on public.seed_anchors (seed_status, resolve_status);

-- Kill switch. false = chain stops. Starting a run with action=start sets it true.
insert into public.feature_switches (key, enabled, note)
values ('seeder_enabled', false, 'Campus seeder: true = runs keep chaining; false = stop')
on conflict (key) do nothing;
