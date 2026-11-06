-- One admin account only: hello.rada.app@gmail.com
-- Run this once in the Supabase SQL editor (the GitHub flow does not run migrations).
-- Safe to run again.

-- 1) Everyone except the official email loses the admin role.
update public.profiles
   set role = 'user'
 where role = 'admin'
   and lower(coalesce(email, '')) <> 'hello.rada.app@gmail.com';

-- 2) Nobody else can be given the admin role again, whoever tries it.
create or replace function public._only_official_admin()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' and lower(coalesce(new.email, '')) <> 'hello.rada.app@gmail.com' then
    new.role := 'user';
  end if;
  return new;
end;
$$;

drop trigger if exists only_official_admin on public.profiles;
create trigger only_official_admin
  before insert or update on public.profiles
  for each row execute function public._only_official_admin();

-- 3) Every admin_* function calls this first. It now checks the signed-in email directly.
drop function if exists public._require_admin();
create function public._require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'hello.rada.app@gmail.com' then
    raise exception 'Admin only' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public._require_admin() from public, anon;
grant execute on function public._require_admin() to authenticated;
