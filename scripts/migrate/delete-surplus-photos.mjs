// Phase 13: free Supabase storage by deleting every non-thumbnail spot photo listed in photo_manifest
// (status 'to_delete'), then trim each spot's gallery to the photos that are still there.
// Run by .github/workflows/delete-surplus-photos.yml. Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Safe by default: DRY_RUN=true only prints. A real delete needs DRY_RUN=false AND CONFIRM=DELETE.
import fs from 'node:fs';

const env = (k, d = '') => (process.env[k] ?? d).toString().trim();
const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = env('BUCKET', 'rada-media');
const DRY_RUN = env('DRY_RUN', 'true') !== 'false';
const CONFIRM = env('CONFIRM');
const LIMIT = Math.max(0, parseInt(env('LIMIT', '0'), 10) || 0);
const BATCH = 100;

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }
if (!SB_URL || !SB_KEY) fail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (Repository secrets)');
const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function call(url, init = {}) {
  let last;
  for (let a = 1; a <= 4; a++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(60000), headers: { ...H, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    } catch (e) { last = e; console.warn(`  request failed (try ${a}/4): ${e.cause?.code || e.message}`); await sleep(a * 3000); }
  }
  throw new Error('Supabase unreachable: ' + (last?.cause?.code || last?.message));
}

async function fetchAll(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await call(`${SB_URL}/rest/v1/${query}`, { headers: { Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`Read failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const mb = (n) => (n / 1048576).toFixed(0);

async function main() {
  const del = await fetchAll('photo_manifest?select=path,spot_id,size_bytes&status=eq.to_delete&order=path');
  const keep = await fetchAll('photo_manifest?select=spot_id,path,gallery_pos&status=eq.keep&order=path');
  const keepBySpot = new Map();
  for (const k of keep) { if (!keepBySpot.has(k.spot_id)) keepBySpot.set(k.spot_id, []); keepBySpot.get(k.spot_id).push(k); }
  for (const arr of keepBySpot.values()) arr.sort((a, b) => a.gallery_pos - b.gallery_pos);

  const noKeep = [...new Set(del.map(d => d.spot_id))].filter(id => !keepBySpot.has(id));
  if (noKeep.length) fail(`${noKeep.length} spot(s) would be left with no photo at all (e.g. ${noKeep[0]}). Nothing deleted.`);

  const todo = LIMIT ? del.slice(0, LIMIT) : del;
  const bytes = todo.reduce((s, d) => s + Number(d.size_bytes || 0), 0);
  const spots = [...new Set(todo.map(d => d.spot_id))];
  console.log(`To delete: ${todo.length} files (~${mb(bytes)} MB) across ${spots.length} spots. Photos kept: ${keep.length}.`);

  const lines = ['### Delete surplus photos', '', `| | |`, '|---|---|', `| Mode | ${DRY_RUN ? 'DRY RUN (nothing deleted)' : 'LIVE'} |`, `| Files to delete | ${todo.length} |`, `| Size | ~${mb(bytes)} MB |`, `| Spots affected | ${spots.length} |`, `| Photos kept | ${keep.length} |`];
  const summary = () => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n'); };

  if (DRY_RUN) {
    console.log('Dry run only. To delete for real: dry_run=false and confirm=DELETE.');
    lines.push('', 'Dry run only. Nothing was changed.');
    summary();
    return;
  }
  if (CONFIRM !== 'DELETE') fail('Type DELETE in the confirm box to run a real delete.');

  let deleted = 0;
  const errors = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    const paths = todo.slice(i, i + BATCH).map(d => d.path);
    const r = await call(`${SB_URL}/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) });
    if (!r.ok) { errors.push(`delete batch ${i / BATCH + 1}: ${r.status} ${(await r.text()).slice(0, 200)}`); console.error('✖ ' + errors.at(-1)); break; }
    const list = `(${paths.map(p => `"${p}"`).join(',')})`;
    const m = await call(`${SB_URL}/rest/v1/photo_manifest?path=in.${list}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted', deleted_at: new Date().toISOString() }) });
    if (!m.ok) { errors.push(`manifest update failed: ${m.status}`); break; }
    deleted += paths.length;
    if ((i / BATCH) % 10 === 0) console.log(`  deleted ${deleted}/${todo.length}`);
  }
  console.log(`✔ Deleted ${deleted} files`);

  // Trim galleries so the app never points at a photo that no longer exists.
  const deletedSpots = new Set(todo.slice(0, deleted).map(d => d.spot_id));
  const ids = [...deletedSpots];
  let fixed = 0;
  const pub = (p) => `${SB_URL}/storage/v1/object/public/${BUCKET}/${p}`;
  const queue = [...ids];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      const kept = keepBySpot.get(id) || [];
      if (!kept.length) continue;
      const body = { gallery: kept.map(k => pub(k.path)) };
      if (kept[0].gallery_pos !== 0) body.thumbnail = pub(kept[0].path);
      const r = await call(`${SB_URL}/rest/v1/unclaimedspots?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      if (r.ok) fixed++; else errors.push(`gallery ${id}: ${r.status}`);
    }
  }));
  console.log(`✔ Galleries trimmed for ${fixed}/${ids.length} spots`);

  lines.push('', `**Deleted ${deleted} files. Galleries trimmed: ${fixed}/${ids.length}.**`);
  if (errors.length) lines.push('', 'Errors:', '```', ...errors.slice(0, 10), '```');
  summary();
  if (errors.length) process.exitCode = 1;
}

main().catch(e => fail(e.message));
