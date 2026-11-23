// Builds one small gzipped JSON of every spot (list-card fields only) and uploads it to R2 as spots.json.
// The PWA loads THIS file for browsing, so spot lists cost Supabase no egress. Runs after each seed run.
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the R2_* variables.
import zlib from 'node:zlib';
import { put, r2Missing, publicUrl } from './lib/r2.mjs';

const env = (k) => (process.env[k] ?? '').toString().trim();
const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const missing = [...(SB_URL ? [] : ['SUPABASE_URL']), ...(KEY ? [] : ['SUPABASE_SERVICE_ROLE_KEY']), ...r2Missing()];
if (missing.length) { console.error('✖ Missing: ' + missing.join(', ')); process.exit(1); }

const FIELDS = 'id,name,category,extra_categories,neighborhood,latitude,longitude,thumbnail,rating,reviews_count,status';
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${SB_URL}/rest/v1/unclaimedspots?select=${FIELDS}&order=id`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: `${from}-${from + 999}` },
  });
  if (!r.ok) { console.error('✖ Supabase read failed: ' + (await r.text())); process.exit(1); }
  const page = await r.json();
  rows.push(...page);
  if (page.length < 1000) break;
}
if (rows.length < 100) { console.error(`✖ Only ${rows.length} spots came back; not overwriting spots.json.`); process.exit(1); }

const json = JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, spots: rows });
const gz = zlib.gzipSync(json, { level: 9 });
await put('data/spots.json', gz, 'application/json', { ContentEncoding: 'gzip', CacheControl: 'public, max-age=900' });
console.log(`✔ Exported ${rows.length} spots: ${(json.length / 1024).toFixed(0)} KB raw, ${(gz.length / 1024).toFixed(0)} KB gzipped -> ${publicUrl('data/spots.json')}`);
