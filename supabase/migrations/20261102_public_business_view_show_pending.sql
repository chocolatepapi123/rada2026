-- Everyone can see approved AND pending businesses (pending ones get no verified badge in the app).
-- Rejected businesses stay hidden from everyone except their owner and admins (they read the table directly).
-- The view runs as its owner so the table itself can stay locked; it never exposes email, admin notes or billing.
create or replace view public.rada_businesses_public as
select id, owner_id, name, slug, category, verification_status, phone, city, area,
       subscription_status, subscription_plan, created_at, updated_at,
       (((coalesce(data, '{}'::jsonb) - 'email') - 'verificationNote') - 'subscriptionAmount') - 'subscriptionRenewsAt' as data
from public.rada_businesses
where coalesce(verification_status, 'pending') in ('approved', 'pending');

alter view public.rada_businesses_public set (security_invoker = false);
grant select on public.rada_businesses_public to anon, authenticated;
