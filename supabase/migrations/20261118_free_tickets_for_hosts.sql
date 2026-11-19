-- OPTIONAL. Run this only if you want every signed-in host to create FREE tickets without a Pro/Elite plan.
-- The app now shows free tickets only (paid tickets are hidden in the screens). This lets the server accept them.
-- Note: this does not stop a modified app from creating a paid ticket type. Paid sales still depend on the
-- admin "Paid tickets" switch, which stays off.
create or replace function public.can_sell_tickets(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null
$$;
grant execute on function public.can_sell_tickets(uuid) to authenticated;
