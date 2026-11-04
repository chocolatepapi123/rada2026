-- Admin control over promotions (paid boosts) and offers (the promos businesses post).
-- Admins can edit, take down (remove) and delete any of them, including approved / live ones.
-- All functions are SECURITY DEFINER and check public._require_admin() first.

-- ---------------------------------------------------------------------------
-- Boosts (public.promotions)
-- ---------------------------------------------------------------------------

-- Edit any promotion in any status. NULL = leave unchanged; '' clears category / zone / note.
create or replace function public.admin_update_promotion(
  p_id uuid,
  p_target_title text default null,
  p_category text default null,
  p_zone text default null,
  p_start date default null,
  p_end date default null,
  p_status text default null,
  p_amount_kes integer default null,
  p_slot_order integer default null,
  p_note text default null
) returns public.promotions
language plpgsql security definer set search_path = public as $$
declare cur public.promotions; v public.promotions; s date; e date;
begin
  perform public._require_admin();
  select * into cur from promotions where id = p_id for update;
  if not found then raise exception 'Promotion not found'; end if;
  if p_status is not null and p_status not in
     ('draft','requested','approved','pending_payment','scheduled','active','paused','completed','refunded','rejected') then
    raise exception 'Invalid status';
  end if;
  if p_amount_kes is not null and p_amount_kes <= 0 then raise exception 'Amount must be above 0'; end if;
  if p_slot_order is not null and p_slot_order < 1 then raise exception 'Order starts at 1'; end if;
  s := coalesce(p_start, cur.start_date);
  e := coalesce(p_end, cur.end_date);
  if e < s then raise exception 'End date must be on or after the start date'; end if;

  update promotions set
    target_title = case when p_target_title is null then target_title else left(nullif(btrim(p_target_title), ''), 120) end,
    category     = case when p_category is null then category else left(nullif(btrim(p_category), ''), 60) end,
    zone         = case when p_zone is null then zone else left(nullif(btrim(p_zone), ''), 60) end,
    start_date   = s,
    end_date     = e,
    status       = coalesce(p_status, status),
    amount_kes   = coalesce(p_amount_kes, amount_kes),
    slot_order   = case when p_status in ('paused','completed','refunded','rejected') then null
                        else coalesce(p_slot_order, slot_order) end,
    admin_note   = case when p_note is null then admin_note else nullif(btrim(p_note), '') end,
    updated_at   = now()
  where id = p_id returning * into v;
  return v;
end $$;

-- Take a promotion off the app without losing the record (can be switched back on with admin_update_promotion).
create or replace function public.admin_remove_promotion(p_id uuid, p_note text default null)
returns public.promotions
language plpgsql security definer set search_path = public as $$
declare v public.promotions;
begin
  perform public._require_admin();
  update promotions
     set status = 'paused', slot_order = null,
         admin_note = coalesce(nullif(btrim(p_note), ''), 'Removed by admin'), updated_at = now()
   where id = p_id returning * into v;
  if not found then raise exception 'Promotion not found'; end if;
  return v;
end $$;

-- Delete a promotion for good. A promotion with a confirmed payment needs p_force = true; the payment record is kept
-- (just unlinked) so finance history is never lost.
create or replace function public.admin_delete_promotion(p_id uuid, p_force boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
declare paid int;
begin
  perform public._require_admin();
  if not exists (select 1 from promotions where id = p_id) then raise exception 'Promotion not found'; end if;
  select count(*) into paid from payments where promotion_id = p_id and status = 'succeeded';
  if paid > 0 and not coalesce(p_force, false) then
    raise exception 'PAID: this promotion has a confirmed payment. Remove it instead, or delete anyway.';
  end if;
  update payments set promotion_id = null where promotion_id = p_id;
  update manual_payment_claims set promotion_id = null where promotion_id = p_id;
  delete from promotions where id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Offers (public.rada_listings, kind = 'offer')
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_offers(p_search text default null, p_limit integer default 100)
returns table(
  id uuid, owner_id uuid, owner_label text, business_name text, title text, description text,
  status text, data jsonb, created_at timestamptz, boosted boolean
)
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public._require_admin();
  return query
    select l.id, l.owner_id,
           coalesce(pr.username, pr.display_name, pr.full_name, pr.email, l.owner_id::text),
           l.data->>'businessName', l.title, l.description, l.status, l.data, l.created_at,
           exists (select 1 from promotions p where p.target_type = 'listing' and p.target_id = l.id::text
                    and p.status in ('approved','pending_payment','scheduled','active'))
      from rada_listings l
      left join profiles pr on pr.id = l.owner_id
     where l.kind = 'offer'
       and (q is null or l.title ilike '%' || q || '%' or coalesce(l.data->>'businessName','') ilike '%' || q || '%')
     order by l.created_at desc nulls last
     limit least(greatest(coalesce(p_limit, 100), 1), 300);
end $$;

-- Edit an offer. p_patch is merged into the offer JSON (so every field the app stores can be changed);
-- title / description columns follow the patch. p_status: 'published' or 'draft' (draft = hidden from the app).
create or replace function public.admin_update_offer(p_id uuid, p_patch jsonb default '{}'::jsonb, p_status text default null)
returns public.rada_listings
language plpgsql security definer set search_path = public as $$
declare v public.rada_listings;
begin
  perform public._require_admin();
  if p_status is not null and p_status not in ('published','draft') then raise exception 'Invalid status'; end if;
  update rada_listings l set
    data        = coalesce(l.data, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb),
    title       = coalesce(nullif(btrim(p_patch->>'title'), ''), l.title),
    description = case when p_patch ? 'description' then p_patch->>'description' else l.description end,
    status      = coalesce(p_status, l.status),
    updated_at  = now()
  where l.id = p_id and l.kind = 'offer' returning * into v;
  if not found then raise exception 'Offer not found'; end if;
  return v;
end $$;

-- Take an offer off the app (hidden, not deleted) and pause any live boost on it.
create or replace function public.admin_remove_offer(p_id uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  update rada_listings set status = 'draft', updated_at = now() where id = p_id and kind = 'offer';
  if not found then raise exception 'Offer not found'; end if;
  update promotions set status = 'paused', slot_order = null,
         admin_note = coalesce(nullif(btrim(p_note), ''), 'Offer removed by admin'), updated_at = now()
   where target_type = 'listing' and target_id = p_id::text and status in ('approved','pending_payment','scheduled','active');
end $$;

-- Delete an offer for good (saves and redemptions go with it). Boosts aimed at it are paused, not deleted.
create or replace function public.admin_delete_offer(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  update promotions set status = 'paused', slot_order = null, admin_note = 'Offer deleted by admin', updated_at = now()
   where target_type = 'listing' and target_id = p_id::text and status in ('approved','pending_payment','scheduled','active');
  delete from rada_listings where id = p_id and kind = 'offer';
  if not found then raise exception 'Offer not found'; end if;
end $$;

-- Lock down: only signed-in users can call these (and each one re-checks admin).
revoke all on function public.admin_update_promotion(uuid,text,text,text,date,date,text,integer,integer,text) from public, anon;
revoke all on function public.admin_remove_promotion(uuid,text) from public, anon;
revoke all on function public.admin_delete_promotion(uuid,boolean) from public, anon;
revoke all on function public.admin_list_offers(text,integer) from public, anon;
revoke all on function public.admin_update_offer(uuid,jsonb,text) from public, anon;
revoke all on function public.admin_remove_offer(uuid,text) from public, anon;
revoke all on function public.admin_delete_offer(uuid) from public, anon;
grant execute on function public.admin_update_promotion(uuid,text,text,text,date,date,text,integer,integer,text) to authenticated;
grant execute on function public.admin_remove_promotion(uuid,text) to authenticated;
grant execute on function public.admin_delete_promotion(uuid,boolean) to authenticated;
grant execute on function public.admin_list_offers(text,integer) to authenticated;
grant execute on function public.admin_update_offer(uuid,jsonb,text) to authenticated;
grant execute on function public.admin_remove_offer(uuid,text) to authenticated;
grant execute on function public.admin_delete_offer(uuid) to authenticated;
