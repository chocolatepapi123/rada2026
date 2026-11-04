// Puts an establishment photo (outside or inside the venue) first in each spot's gallery when the current
// first photo is food, a menu, people or something else. Run by .github/workflows/reorder-photos.yml
//
// Every spot it looks at is written to public.spot_photo_order_log, with its old gallery, so
// (a) re-runs skip spots already done and (b) any change can be reverted.
//
// Needs the secrets SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and one AI key:
// GEMINI_API_KEY (PROVIDER=gemini, the default, works on Google's free tier) or ANTHROPIC_API_KEY (PROVIDER=anthropic, paid).

const env = (k, d = '') => String(process.env[k] ?? d).trim();
const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const PROVIDER = env('PROVIDER', 'gemini').toLowerCase(); // 'gemini' (free tier) or 'anthropic' (paid)
const AI_KEY = PROVIDER === 'anthropic' ? env('ANTHROPIC_API_KEY') : env('GEMINI_API_KEY');
const MODEL = env('MODEL') || (PROVIDER === 'anthropic' ? 'claude-haiku-5-5' : 'gemini-flash-lite-latest');
const GAP_MS = Math.max(0, parseInt(env('REQUEST_GAP_MS', PROVIDER === 'gemini' ? '7000' : '0'), 10) || 0); // pause between calls so the free per-minute limit is not hit
const DRY_RUN = env('DRY_RUN', 'true') !== 'false';
const MAX_SPOTS = Math.max(1, parseInt(env('MAX_SPOTS', '50'), 10) || 50);
const CATEGORIES = env('CATEGORIES').split(',').map(s => s.trim()).filter(Boolean);
const CONCURRENCY = PROVIDER === 'gemini' ? 1 : 4;
const MAX_IMAGES = 8;
const STORAGE_MARK = '/storage/v1/object/public/';

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }
if (!['gemini', 'anthropic'].includes(PROVIDER)) fail('PROVIDER must be gemini or anthropic');
const missing = [['SUPABASE_URL', SB_URL], ['SUPABASE_SERVICE_ROLE_KEY', SB_KEY], [PROVIDER === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY', AI_KEY]].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) fail('Empty in GitHub secrets: ' + missing.join(', '));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const why = e => e?.cause?.code || e?.cause?.message || e?.message || String(e);

async function withRetry(label, fn, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      if (e.noRetry) break;
      console.warn(`  ${label} failed (try ${i}/${tries}): ${why(e)}`);
      if (i < tries) await sleep(i * 4000);
    }
  }
  throw last;
}

const sb = (path, init = {}) => withRetry('Supabase', async () => {
  const r = await fetch(SB_URL + '/rest/v1/' + path, {
    ...init,
    signal: AbortSignal.timeout(60000),
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (r.status >= 500) throw new Error('Supabase ' + r.status);
  return r;
});

async function loadDoneIds() {
  const done = new Set();
  for (let from = 0; ; from += 1000) {
    const r = await sb('spot_photo_order_log?select=spot_id', { headers: { Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error('Could not read spot_photo_order_log: ' + (await r.text()));
    const rows = await r.json();
    rows.forEach(x => done.add(x.spot_id));
    if (rows.length < 1000) break;
  }
  return done;
}

async function loadCandidates(done) {
  const out = [];
  let filter = '';
  if (CATEGORIES.length) filter = '&category=in.(' + encodeURIComponent(CATEGORIES.map(c => `"${c}"`).join(',')) + ')';
  for (let from = 0; out.length < MAX_SPOTS; from += 500) {
    const r = await sb(`unclaimedspots?select=id,name,category,thumbnail,gallery&gallery=not.is.null&order=created_at.asc,id.asc${filter}`, { headers: { Range: `${from}-${from + 499}` } });
    if (!r.ok) throw new Error('Could not read spots: ' + (await r.text()));
    const rows = await r.json();
    for (const s of rows) {
      if (done.has(s.id) || !Array.isArray(s.gallery) || s.gallery.length < 2) continue;
      out.push(s);
      if (out.length >= MAX_SPOTS) break;
    }
    if (rows.length < 500) break;
  }
  return out;
}

const LABELS = ['exterior', 'interior', 'food', 'people', 'other'];

function promptFor(s, n) {
  return `These ${n} photos are from the Google Maps listing of "${s.name}", a ${s.category} spot in Nairobi, Kenya. Label every photo with exactly one of:
- exterior: the outside of the building, entrance, signage, street view
- interior: inside the venue (seating, bar, decor, dance floor) or its outdoor/rooftop/garden setting
- food: dishes, plates, drinks, desserts, cakes, close-ups of products
- people: mainly people, a crowd, a selfie
- other: menu, logo, poster, map, screenshot, price list, or too blurry to tell
Reply with ONLY JSON, no other text, in this shape: {"labels":["food","exterior"]} with exactly ${n} labels in photo order.`;
}

class QuotaDone extends Error {}
let stopAll = false;
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

async function askAnthropic(urls, prompt) {
  const content = [];
  urls.forEach((u, i) => {
    content.push({ type: 'text', text: `Photo ${i + 1}:` });
    content.push({ type: 'image', source: { type: 'url', url: u } });
  });
  content.push({ type: 'text', text: prompt });
  const data = await withRetry('Claude', async () => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content }] }),
    });
    if (r.status === 429 || r.status >= 500) throw new Error('Claude API ' + r.status);
    if (!r.ok) { const e = new Error('Claude API ' + r.status + ': ' + (await r.text()).slice(0, 200)); e.noRetry = true; throw e; }
    return r.json();
  });
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

async function askGemini(urls, prompt) {
  const parts = [];
  for (let i = 0; i < urls.length; i++) {
    const r = await fetch(urls[i], { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw Object.assign(new Error('photo download ' + r.status), { noRetry: true });
    const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    parts.push({ text: `Photo ${i + 1}:` }, { inline_data: { mime_type: mime, data: Buffer.from(await r.arrayBuffer()).toString('base64') } });
  }
  parts.push({ text: prompt });
  const data = await withRetry('Gemini', async () => {
    await pace();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: { 'x-goog-api-key': AI_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json' } }),
    });
    if (r.status === 429) {
      const t = await r.text();
      if (/per ?day|daily/i.test(t)) throw Object.assign(new QuotaDone('Daily free quota is used up. Run again tomorrow; it carries on where it stopped.'), { noRetry: true });
      await sleep(25000);
      throw new Error('Gemini API 429 (per-minute limit, waiting)');
    }
    if (r.status >= 500) throw new Error('Gemini API ' + r.status);
    if (!r.ok) throw Object.assign(new Error('Gemini API ' + r.status + ': ' + (await r.text()).slice(0, 200)), { noRetry: true });
    return r.json();
  });
  return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

async function classify(s, urls) {
  const prompt = promptFor(s, urls.length);
  const text = PROVIDER === 'anthropic' ? await askAnthropic(urls, prompt) : await askGemini(urls, prompt);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('no JSON in reply'), { noRetry: true });
  const labels = (JSON.parse(m[0]).labels || []).map(x => String(x).toLowerCase().trim());
  if (labels.length !== urls.length || labels.some(l => !LABELS.includes(l))) throw Object.assign(new Error('unexpected labels: ' + labels.join(',')), { noRetry: true });
  return labels;
}

// Decide the new order. Only moves a photo when the current first photo is NOT an establishment photo.
function decide(gallery, urls, labels) {
  if (urls[0] !== gallery[0]) return { action: 'skipped: first photo not checkable', gallery };
  if (labels[0] === 'exterior' || labels[0] === 'interior') return { action: 'kept', gallery };
  let pick = labels.indexOf('exterior');
  if (pick < 0) pick = labels.indexOf('interior');
  if (pick < 0) return { action: 'no establishment photo', gallery };
  const url = urls[pick];
  return { action: 'moved', gallery: [url, ...gallery.filter(u => u !== url)], pick: pick + 1, was: labels[0] };
}

async function handle(s, stats) {
  const urls = s.gallery.filter(u => typeof u === 'string' && u.includes(STORAGE_MARK)).slice(0, MAX_IMAGES);
  if (urls.length < 2) { stats.skipped++; return; }
  let labels;
  try { labels = await classify(s, urls); }
  catch (e) {
    if (e instanceof QuotaDone) { stopAll = true; console.warn('⏸ ' + e.message); return; }
    stats.errors++; console.warn(`✖ ${s.name}: ${why(e)}`); return;
  }
  const d = decide(s.gallery, urls, labels);
  if (d.action === 'moved') {
    stats.moved++;
    console.log(`↑ ${s.name} [${s.category}]: photo ${d.pick} (${labels[d.pick - 1]}) replaces ${d.was} as the first photo`);
  } else if (d.action === 'kept') stats.kept++;
  else if (d.action === 'no establishment photo') { stats.none++; console.log(`· ${s.name}: first photo is ${labels[0]} and no venue photo exists in the gallery`); }
  else stats.skipped++;
  if (DRY_RUN) return;
  const log = await sb('spot_photo_order_log', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ spot_id: s.id, name: s.name, old_thumbnail: s.thumbnail, old_gallery: s.gallery, new_gallery: d.gallery, labels, action: d.action, model: `${PROVIDER}:${MODEL}` }),
  });
  if (!log.ok) { stats.errors++; console.warn(`✖ ${s.name}: could not write the log row, left unchanged`); return; }
  if (d.action === 'moved') {
    const up = await sb(`unclaimedspots?id=eq.${s.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ thumbnail: d.gallery[0], gallery: d.gallery }) });
    if (!up.ok) { stats.errors++; console.warn(`✖ ${s.name}: update failed: ${(await up.text()).slice(0, 150)}`); }
  }
}

async function main() {
  console.log(`${PROVIDER}:${MODEL} | ${DRY_RUN ? 'DRY RUN (nothing is written)' : 'LIVE'} | up to ${MAX_SPOTS} spots | ${CATEGORIES.length ? CATEGORIES.join(', ') : 'all categories'}`);
  const done = await loadDoneIds();
  const spots = await loadCandidates(done);
  console.log(`${done.size} spots already checked earlier; checking ${spots.length} now`);
  const stats = { moved: 0, kept: 0, none: 0, skipped: 0, errors: 0 };
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < spots.length && !stopAll) { const s = spots[next++]; await handle(s, stats); }
  }));
  console.log(stopAll ? '\nStopped early (daily free quota). Spots not reached are picked up next run.' : '\nDone.');
  console.table([{ checked: spots.length, ...stats }]);
  if (DRY_RUN) console.log('Dry run: nothing was changed. Turn dry_run off to apply.');
  if (stats.errors) process.exitCode = 1;
}

main().catch(e => fail(why(e)));
