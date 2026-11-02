-- NOT yet applied. Needs one step from you first, because the seed-cinemas function is switched off until it has a key.
--
-- 1. Supabase dashboard -> Edge Functions -> Secrets -> add  SEED_CINEMAS_KEY  = a long random value (16+ characters).
-- 2. Replace PASTE_THE_SAME_KEY_HERE below with that same value, then run this file once in the SQL editor.
--
-- Result: movies and showtimes refresh twice a day.
-- 22:45 UTC = 01:45 Nairobi, right after the 01:30 cleanup. 10:45 UTC = 13:45 Nairobi.

select vault.create_secret('PASTE_THE_SAME_KEY_HERE', 'seed_cinemas_key');

select cron.schedule(
  'rada-sync-cinemas',
  '45 10,22 * * *',
  $$
  select net.http_get(
    url := 'https://yobauhydhkptiuwvrntm.supabase.co/functions/v1/seed-cinemas?key='
           || (select decrypted_secret from vault.decrypted_secrets where name = 'seed_cinemas_key'),
    timeout_milliseconds := 150000
  );
  $$
);
