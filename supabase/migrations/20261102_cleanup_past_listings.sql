-- Already applied to the live project on Nov 2, 2026. Kept here so the repo matches the database.
-- Removes events 24h after they end, showtimes 24h after they start, and stale coming-soon films.
-- Runs daily at 01:30 Nairobi time (22:30 UTC) through pg_cron.
create or replace function public.cleanup_past_listings()
returns jsonb language plpgsql security definer set search_path = public as $$
declare ev int; sh int; mv int;
begin
  delete from public.external_events where coalesce(end_at, start_at) < now() - interval '24 hours';
  get diagnostics ev = row_count;
  delete from public.cinema_showtimes
   where coalesce(starts_at, (show_date::text || 'T23:59:00+03:00')::timestamptz) < now() - interval '24 hours';
  get diagnostics sh = row_count;
  delete from public.cinema_movies m
   where m.status = 'coming_soon' and m.release_date < (now() at time zone 'Africa/Nairobi')::date - 1
     and not exists (select 1 from public.cinema_showtimes s where s.movie_id = m.id);
  get diagnostics mv = row_count;
  return jsonb_build_object('events', ev, 'showtimes', sh, 'movies', mv, 'at', now());
end $$;
revoke all on function public.cleanup_past_listings() from public, anon, authenticated;
select cron.schedule('rada-cleanup-past-listings', '30 22 * * *', $$select public.cleanup_past_listings()$$);
