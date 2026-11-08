-- Only creators and merchants on a live plan (trial or paid, Pro or Elite) can sell tickets.
create or replace function public.can_sell_tickets(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    public.is_rada_admin()
    or exists (select 1 from public.subscriptions s
      where s.user_id = p_user and s.kind in ('creator','merchant')
        and s.plan in ('pro','elite') and public._sub_live(s))
  )
$$;
grant execute on function public.can_sell_tickets(uuid) to authenticated;

create or replace function public.my_payout_phone() returns text
language sql stable security definer set search_path = public as $$
  select phone from public.payout_accounts where user_id = auth.uid()
$$;
grant execute on function public.my_payout_phone() to authenticated;

-- ticket_create_type now starts with:
--   if not public.can_sell_tickets(uid) then raise exception '...' using hint = 'plan_needed'; end if;
