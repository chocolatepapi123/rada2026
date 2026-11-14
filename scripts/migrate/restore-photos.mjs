// Phase 14: bring back the spot photos deleted in phase 13, straight into Cloudflare R2.
// For each spot in photo_manifest with status 'deleted', search Google Maps with the free gosom scraper
// (same Docker image as seed-spots.mjs, no Apify), match the spot by google_place_id, download its photos,
// upload them to R2, add them to unclaimedspots.gallery and mark the manifest rows 'restored'.
// Run by .github/workflows/restore-photos.yml. Resumable: spots already restored are skipped.
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//        R2_BUCKET, R2_PUBLIC_URL (e.g. https://pub-xxxx.r2.dev, no trailing slash).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const env = (k, d = '') => (process.env[k] ?? d).toString().trim();
const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const R2_ACCOUNT = env('R2_ACCOUNT_ID');
const R2_KEY = env('R2_ACCESS_KEY_ID');
const R2_SECRET = env('R2_SECRET_ACCESS_KEY');
const R2_BUCKET = env('R2_BUCKET');
const R2_PUBLIC = env('R2_PUBLIC_URL').replace(/\/$/, '');
const DRY_RUN = env('DRY_RUN', 'false') === 'true';
const MAX_SPOTS = Math.max(1, parseInt(env('MAX_SPOTS', '100'), 10) || 100);
const BATCH_SIZE = Math.max(1, parseInt(env('BATCH_SIZE', '20'), 10) || 20);
const MAX_PER_SPOT = Math.max(1, parseInt(env('MAX_PER_SPOT', '4'), 10) || 4);
const WIDTH = Math.max(200, parseInt(env('PHOTO_WIDTH', '1000'), 10) || 1000);
const IMAGE = env('GOSOM_IMAGE', 'gosom/google-maps-scraper');

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }
const missing = [['SUPABASE_URL', SB_URL], ['SUPABASE_SERVICE_ROLE_KEY', SB_KEY], ['R2_ACCOUNT_ID', R2_ACCOUNT], ['R2_ACCESS_KEY_ID', R2_KEY],
  ['R2_SECRET_ACCESS_KEY', R2_SECRET], ['R2_BUCKET', R2_BUCKET], ['R2_PUBLIC_URL', R2_PUBLIC]].filter(([, v]) => !v).map(([k]) => k);
if (missing.length && !DRY_RUN) fail('Empty in GitHub secrets: ' + missing.join(', '));
if (missing.some(m => m.startsWith('SUPABASE'))) fail('Missing Supabase secrets');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
const s3 = DRY_RUN ? null : new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET } });

async function sb(p, init = {}) {
  let last;
  for (let a = 1; a <= 4; a++) {
    try {
      return await fetch(SB_URL + '/rest/v1/' + p, { ...init, signal: AbortSignal.timeout(60000), headers: { ...H, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    } catch (e) { last = e; await sleep(a * 3000); }
  }
  throw new Error('Supabase unreachable: ' + (last?.cause?.code || last?.message));
}
async function fetchAll(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await sb(query, { headers: { Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`Read failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// ── photo extraction (same rules as seed-spots.mjs) ─────────────────────────
const PHOTO_HOST = /^https?:\/\/[^/]*googleusercontent\.com\//i;
function* walk(x, p = '') {
  if (Array.isArray(x)) { for (const v of x) yield* walk(v, p + '[]'); }
  else if (x && typeof x === 'object') { for (const [k, v] of Object.entries(x)) yield* walk(v, p ? `${p}.${k}` : k); }
  else if (typeof x === 'string') {
    const s = x.trim();
    if (s[0] === '[' || s[0] === '{') { try { yield* walk(JSON.parse(s), p); return; } catch { /* plain string */ } }
    yield [p, x];
  }
}
const baseOf = (u) => u.split('=')[0];
function photoUrls(p) {
  const urls = []; const seen = new Set();
  const add = (u) => { if (typeof u === 'string' && PHOTO_HOST.test(u) && !seen.has(baseOf(u))) { seen.add(baseOf(u)); urls.push(u); } };
  add(p.thumbnail);
  for (const [pth, s] of walk(p)) {
    if (/profile/i.test(pth) || pth === 'thumbnail' || !/image/i.test(pth)) continue;
    add(s);
  }
  return urls;
}
function readResults(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).size) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  try { const j = JSON.parse(text); return Array.isArray(j) ? j : [j]; } catch { /* one JSON object per line */ }
  return text.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
// One Docker run for a whole list of queries. Results are matched back by place_id.
function gosom(queries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gosom-'));
  fs.chmodSync(dir, 0o777);
  fs.writeFileSync(path.join(dir, 'q.txt'), queries.join('\n') + '\n');
  const args = ['run', '--rm', '-v', `${dir}:/out`, IMAGE, '-input', '/out/q.txt', '-results', '/out/r.json', '-json',
    '-depth', '1', '-lang', 'en', '-extra-reviews', '-exit-on-inactivity', '3m'];
  const r = spawnSync('docker', args, { encoding: 'utf8', timeout: 40 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const rows = readResults(path.join(dir, 'r.json'));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* runner is thrown away anyway */ }
  if (!rows.length) console.warn('  gosom returned nothing: ' + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-3).join(' / '));
  return rows;
}
const clean = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();

async function download(u) {
  try {
    const r = await fetch(baseOf(u) + '=w' + WIDTH, { signal: AbortSignal.timeout(25000) });
    if (!r.ok || !/^image\//i.test(r.headers.get('content-type') || '')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 4000 ? buf : null;
  } catch { return null; }
}

async function main() {
  const rows = await fetchAll('photo_manifest?select=spot_id,google_place_id,name,address,gallery_pos,path&status=eq.deleted&restored_at=is.null&order=spot_id');
  const bySpot = new Map();
  for (const r of rows) {
    if (!bySpot.has(r.spot_id)) bySpot.set(r.spot_id, { id: r.spot_id, placeId: r.google_place_id, name: r.name, address: r.address, deleted: 0, minPos: 99 });
    const s = bySpot.get(r.spot_id); s.deleted++; s.minPos = Math.min(s.minPos, r.gallery_pos ?? 99);
  }
  const all = [...bySpot.values()];
  const todo = all.slice(0, MAX_SPOTS);
  console.log(`Spots waiting for photos: ${all.length}. This run: ${todo.length}. ${DRY_RUN ? 'DRY RUN (no uploads, no database changes)' : 'LIVE'}`);
  if (!todo.length) { finish(0, 0, 0, 0); return; }

  const pull = spawnSync('docker', ['pull', IMAGE], { encoding: 'utf8' });
  if (pull.status !== 0) fail('Could not pull the scraper image: ' + (pull.stderr || 'docker not available').trim().split('\n').slice(-2).join(' '));

  let restored = 0, notFound = 0, uploaded = 0;
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    console.log(`▶ batch ${i / BATCH_SIZE + 1}: searching ${batch.length} spots`);
    const found = new Map(); // placeId -> photo urls
    const collect = (items) => { for (const p of items) { const id = p.place_id; if (id && !found.has(id)) found.set(id, photoUrls(p)); } };
    collect(gosom(batch.map(s => `${clean(s.name)} ${clean(s.address)}`)));
    const retry = batch.filter(s => !found.has(s.placeId));
    if (retry.length) collect(gosom(retry.map(s => `${clean(s.name)} Nairobi Kenya`)));

    const ids = batch.map(s => s.id).join(',');
    const gr = await sb(`unclaimedspots?select=id,gallery&id=in.(${ids})`);
    const galleries = new Map((gr.ok ? await gr.json() : []).map(g => [g.id, Array.isArray(g.gallery) ? g.gallery : []]));

    for (const s of batch) {
      const urls = found.get(s.placeId);
      if (!urls || !urls.length) { notFound++; console.log(`  ✖ not found / no photos: ${s.name}`); continue; }
      const need = Math.min(MAX_PER_SPOT, Math.max(2, s.deleted));
      // The first Google photo is almost always the thumbnail we kept, so skip it when we can.
      const pool = (s.minPos >= 1 && urls.length > need) ? urls.slice(1) : urls;
      if (DRY_RUN) { console.log(`  ✔ ${s.name}: ${pool.length} photos available, would add ${Math.min(need, pool.length)}`); restored++; continue; }

      const newUrls = []; const newRows = [];
      for (const u of pool) {
        if (newUrls.length >= need) break;
        const buf = await download(u);
        if (!buf) continue;
        const key = `spots/${s.id}/g-${crypto.createHash('sha1').update(baseOf(u)).digest('hex').slice(0, 10)}.jpg`;
        try {
          await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }));
        } catch (e) { console.warn(`  upload failed for ${s.name}: ${e.message}`); continue; }
        uploaded++;
        newUrls.push(`${R2_PUBLIC}/${key}`);
        newRows.push({ path: key, spot_id: s.id, google_place_id: s.placeId, name: s.name, address: s.address, gallery_pos: 100 + newRows.length, is_thumbnail: false, size_bytes: buf.length, status: 'restored', restored_at: new Date().toISOString() });
      }
      if (!newUrls.length) { notFound++; console.log(`  ✖ photos would not download: ${s.name}`); continue; }

      const gallery = [...(galleries.get(s.id) || []), ...newUrls];
      const u1 = await sb(`unclaimedspots?id=eq.${s.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gallery }) });
      if (!u1.ok) { console.warn(`  ✖ gallery update failed for ${s.name}: ${u1.status}`); continue; }
      await sb('photo_manifest', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(newRows) });
      await sb(`photo_manifest?spot_id=eq.${s.id}&status=eq.deleted`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'restored', restored_at: new Date().toISOString() }) });
      restored++;
      console.log(`  ✔ ${s.name}: +${newUrls.length} photos`);
    }
    await sleep(5000);
  }
  finish(all.length, restored, notFound, uploaded);
}

function finish(waiting, restored, notFound, uploaded) {
  const remaining = Math.max(0, waiting - restored);
  console.log(`Done. Restored ${restored}, not found ${notFound}, files uploaded ${uploaded}, spots still waiting ${remaining}.`);
  const md = ['### Restore photos to R2', '', '| | |', '|---|---|', `| Mode | ${DRY_RUN ? 'DRY RUN' : 'LIVE'} |`, `| Spots restored this run | ${restored} |`, `| Not found / failed | ${notFound} |`, `| Files uploaded | ${uploaded} |`, `| Spots still waiting | ${remaining} |`].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `remaining=${remaining}\nrestored=${restored}\n`);
}

main().catch(e => fail(e.message));
