// Seeds RADA `unclaimedspots` from Google Maps using the free open-source gosom scraper (Docker). No Apify.
// Run by .github/workflows/seed-spots.yml (GitHub runners already have Docker).
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side only, never in the app).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const env = (k, d = '') => (process.env[k] ?? d).toString().trim();
const list = (s) => s.split(',').map(x => x.trim()).filter(Boolean);

// Workflow form values (area1/area2 dropdowns, cat_* checkboxes, target) arrive as JSON in INPUTS.
let INPUTS = {};
try { INPUTS = JSON.parse(env('INPUTS', '{}')); } catch { /* ignore */ }
const CAT_KEYS = {
  cat_clubs: 'Clubs & Lounges', cat_restaurants: 'Restaurants', cat_dates: 'Date Spots',
  cat_cafes: 'Cafes & Bakeries', cat_bars: 'Bars & Chill Spots', cat_rooftops: 'Rooftops',
  cat_nyama: 'Nyama Choma & Grills', cat_hotels: 'Hotels & Stays', cat_outdoors: 'Outdoors & Nature',
  cat_desserts: 'Desserts & Ice Cream', cat_fastfood: 'Fast Food', cat_arts: 'Arts & Culture',
  cat_gaming: 'Gaming & Arcades', cat_sports: 'Sports & Adventure', cat_gardens: 'Garden Hangouts',
  cat_getaways: 'Getaways & Resorts', cat_hangouts: 'Hangouts & Leisure',
};
// Places: "search text|neighborhood label|lat,lng" separated by ';' (or plain names separated by ',').
// The search text goes to Google Maps; the label is what the spot is filed under in the app.
// The optional lat,lng pins the search to that point (within RADIUS_M metres) so results don't drift to other areas.
const COORD = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
const rawAreas = env('AREAS', 'Kilimani');
const AREAS = (/[;|]/.test(rawAreas) ? rawAreas.split(';') : rawAreas.split(','))
  .map(x => x.trim()).filter(x => x && x !== '(none)')
  .map(x => {
    const [q, l, g] = x.split('|').map(y => y.trim());
    if (g && !COORD.test(g)) fail(`Bad coordinates "${g}" for ${q}. Use lat,lng like -1.2640,36.8040`);
    return { query: q, label: l || q, geo: g ? g.replace(/\s+/g, '') : '' };
  });
// ADD_COUNT > 0: add up to that many NEW spots per place per category, ignoring what the area already has.
const ADD_COUNT = Math.max(0, parseInt(env('ADD_COUNT', '0'), 10) || 0);
const CATEGORIES = env('CATEGORIES')
  ? list(env('CATEGORIES'))
  : Object.entries(CAT_KEYS).filter(([k]) => INPUTS[k] === true || INPUTS[k] === 'true').map(([, v]) => v);
// TARGET = how many spots each area should have PER CATEGORY once the run finishes.
// The run only adds the shortfall, so re-running never overshoots.
const TARGET = Math.max(1, parseInt(env('TARGET', '30'), 10) || 30);
const CITY = env('CITY', 'Nairobi');
const DRY_RUN = env('DRY_RUN', 'true') === 'true';
let MIN_RATING = Number(env('MIN_RATING', '4'));
let MIN_REVIEWS = Number(env('MIN_REVIEWS', '20'));
let MIN_PHOTOS = Number(env('MIN_PHOTOS', '3')); // Home rail needs 3+ photos for imported spots
// RELAX_FALLBACK (default on): if an area is still short of its target after the normal search
// ladder, the seeder makes one last pass with extra search terms and relaxed thresholds so
// "at least 15 spots per place" is actually reached instead of quietly finishing short.
const RELAX_FALLBACK = env('RELAX_FALLBACK', 'true') !== 'false';
const MAX_PHOTOS = Math.max(MIN_PHOTOS, parseInt(env('MAX_PHOTOS', '5'), 10) || 5); // photos kept per spot
const DEPTH = Math.max(1, parseInt(env('DEPTH', '2'), 10) || 2);                    // result pages scrolled per search (~15 places each)
// STRICT=true: if a place is still short after the first search, keep searching deeper (up to MAX_DEPTH) until it has enough.
const STRICT = env('STRICT', 'false') === 'true';
const MAX_DEPTH = Math.max(DEPTH, parseInt(env('MAX_DEPTH', '6'), 10) || 6);
const RADIUS_M = Math.max(100, parseInt(env('RADIUS_M', '3000'), 10) || 3000);       // only used when a place has coordinates
const IMAGE = env('GOSOM_IMAGE', 'gosom/google-maps-scraper');

const SB_URL = env('SUPABASE_URL').replace(/\/$/, '');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

// RADA category -> Google Maps search terms. Names must match the app's existing categories.
const TERMS = {
  'Clubs & Lounges': ['night club', 'lounge'],
  'Restaurants': ['restaurant'],
  'Date Spots': ['romantic dinner', 'rooftop restaurant'],
  'Cafes & Bakeries': ['cafe', 'bakery'],
  'Bars & Chill Spots': ['bar', 'pub'],
  'Rooftops': ['rooftop bar'],
  'Nyama Choma & Grills': ['nyama choma'],
  'Hotels & Stays': ['hotel'],
  'Outdoors & Nature': ['park', 'nature trail'],
  'Desserts & Ice Cream': ['ice cream', 'dessert'],
  'Fast Food': ['fast food'],
  'Arts & Culture': ['art gallery', 'museum'],
  'Gaming & Arcades': ['arcade', 'gaming zone'],
  'Sports & Adventure': ['sports club', 'adventure activities'],
  'Garden Hangouts': ['garden restaurant'],
  'Getaways & Resorts': ['resort'],
  'Hangouts & Leisure': ['hangout spot'],
};

// Terms used ONLY by the relaxed fallback pass, so a place that is short after the normal search
// still has a chance to reach the target. Never used by the first pass.
const EXTRA_TERMS = {
  'Clubs & Lounges': ['cocktail bar', 'live music venue'],
  'Restaurants': ['family restaurant', 'grill restaurant', 'eatery'],
  'Date Spots': ['fine dining', 'wine bar', 'sunset restaurant'],
  'Cafes & Bakeries': ['coffee shop', 'pastry shop'],
  'Bars & Chill Spots': ['sports bar', 'wine and cocktails'],
  'Rooftops': ['rooftop lounge', 'rooftop cafe'],
  'Nyama Choma & Grills': ['barbecue restaurant', 'grill'],
  'Hotels & Stays': ['boutique hotel', 'guest house'],
  'Outdoors & Nature': ['garden', 'viewpoint', 'park'],
  'Desserts & Ice Cream': ['cake shop', 'yogurt shop'],
  'Fast Food': ['burger restaurant', 'chicken restaurant'],
  'Arts & Culture': ['art center', 'cultural center'],
  'Gaming & Arcades': ['bowling alley', 'pool hall'],
  'Sports & Adventure': ['gym', 'swimming pool'],
  'Garden Hangouts': ['outdoor restaurant', 'garden cafe'],
  'Getaways & Resorts': ['lodge', 'country club'],
  'Hangouts & Leisure': ['entertainment venue', 'picnic spot'],
};

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }
const missing = [['SUPABASE_URL', SB_URL], ['SUPABASE_SERVICE_ROLE_KEY', SB_KEY]].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) fail('Empty in GitHub secrets: ' + missing.join(', ') + ' (check exact name, and that it is a Repository secret with a value)');
if (!CATEGORIES.length) fail('Tick at least one category');
if (AREAS.length < 1 || AREAS.length > 8) fail('Give 1–8 places per run (got ' + AREAS.length + ')');
const unknown = CATEGORIES.filter(c => !TERMS[c]);
if (unknown.length) fail('Unknown categories: ' + unknown.join(', ') + '\nValid: ' + Object.keys(TERMS).join(' | '));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

// Photos people attached to reviews live under user_reviews[].Images[] (profile pictures are skipped).
function reviewPhotos(p) {
  const out = [];
  for (const [pth, s] of walk(p)) {
    if (/profile/i.test(pth) || pth === 'thumbnail' || !/image/i.test(pth)) continue;
    if (PHOTO_HOST.test(s)) out.push(s);
  }
  return out;
}

const baseOf = (u) => u.split('=')[0];

function norm(p, cat) {
  const urls = [];
  const seenBase = new Set();
  for (const u of [p.thumbnail, ...reviewPhotos(p)]) {
    if (typeof u !== 'string' || !PHOTO_HOST.test(u) || seenBase.has(baseOf(u))) continue;
    seenBase.add(baseOf(u));
    urls.push(u);
  }
  const num = (v) => (v === '' || v == null ? NaN : Number(v));
  let hours = p.open_hours;
  if (typeof hours === 'string') { try { hours = JSON.parse(hours); } catch { hours = null; } }
  if (hours && !Array.isArray(hours) && typeof hours === 'object') {
    hours = Object.entries(hours).map(([day, v]) => ({ day, hours: Array.isArray(v) ? v.join(', ') : String(v) }));
  }
  return {
    cat,
    placeId: p.place_id || '',
    title: p.title,
    address: p.address,
    lat: num(p.latitude),
    lng: num(p.longitude ?? p.longtitude),
    rating: num(p.review_rating),
    reviews: num(p.review_count),
    phone: p.phone || null,
    website: p.web_site || null,
    hours: Array.isArray(hours) ? hours : [],
    closed: /closed/i.test(String(p.status || '')),
    photoUrls: urls,
  };
}

function readResults(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).size) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  try { const j = JSON.parse(text); return Array.isArray(j) ? j : [j]; } catch { /* one JSON object per line */ }
  return text.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// One search = one Docker run, so we always know which category the results belong to.
function gosomSearch(query, geo, depth = DEPTH) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gosom-'));
  fs.chmodSync(dir, 0o777);
  fs.writeFileSync(path.join(dir, 'q.txt'), query + '\n');
  const args = ['run', '--rm', '-v', `${dir}:/out`, IMAGE, '-input', '/out/q.txt', '-results', '/out/r.json', '-json',
    '-depth', String(depth), '-lang', 'en', '-extra-reviews', '-exit-on-inactivity', '3m'];
  if (geo) args.push('-geo', geo, '-radius', String(RADIUS_M));
  const r = spawnSync('docker', args, { encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const rows = readResults(path.join(dir, 'r.json'));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* root-owned files; the runner is thrown away anyway */ }
  if (!rows.length) {
    const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-4).join(' / ');
    throw new Error(`nothing came back for "${query}" (exit ${r.status ?? r.signal}). Google may be blocking this runner. ${tail}`);
  }
  return rows;
}

async function scrapeArea(spec, cats, depth = DEPTH, termsFor = null) {
  const items = [];
  const problems = [];
  for (const cat of cats) {
    for (const term of (termsFor ? termsFor(cat) : TERMS[cat])) {
      const query = `${term} in ${spec.query}, ${CITY}, Kenya`;
      console.log(`▶ search (depth ${depth}): ${query}${spec.geo ? ` (pinned to ${spec.geo}, ${RADIUS_M} m)` : ''}`);
      try {
        const rows = gosomSearch(query, spec.geo, depth);
        console.log(`  ${rows.length} places`);
        rows.forEach(p => items.push(norm(p, cat)));
      } catch (e) { console.warn('  ✖ ' + e.message); problems.push(e.message); }
    }
  }
  if (!items.length) throw new Error(problems[0] || 'no results');
  return items;
}

// Ask Google for a bigger copy of each photo; keep the original link if the bigger one doesn't load.
async function imageOk(u) {
  try {
    const r = await fetch(u, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(15000) });
    return r.ok && /^image\//i.test(r.headers.get('content-type') || '');
  } catch { return false; }
}
async function bestUrl(u) {
  const big = baseOf(u) + '=w1200';
  if (await imageOk(big)) return big;
  return (await imageOk(u)) ? u : null;
}
async function workingPhotos(urls) {
  const out = [];
  for (const u of urls) {
    if (out.length >= MAX_PHOTOS) break;
    const good = await bestUrl(u);
    if (good) out.push(good);
  }
  return out;
}

// Network blips happen on long runs, so each Supabase call gets 4 tries before the area is marked failed.
const sb = async (path, init = {}) => {
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fetch(SB_URL + '/rest/v1/' + path, {
        ...init,
        signal: AbortSignal.timeout(60000),
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });
    } catch (e) {
      last = e;
      const why = e.cause?.code || e.cause?.message || e.message;
      console.warn(`  Supabase request failed (try ${attempt}/4): ${why}`);
      if (attempt < 4) await new Promise(r => setTimeout(r, attempt * 4000));
    }
  }
  throw new Error('Supabase unreachable after 4 tries: ' + (last.cause?.code || last.cause?.message || last.message));
};

async function existingIds(ids) {
  const found = new Set();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const r = await sb(`unclaimedspots?select=google_place_id&google_place_id=in.(${chunk.join(',')})`);
    if (!r.ok) throw new Error('Supabase lookup failed: ' + (await r.text()));
    (await r.json()).forEach(x => found.add(x.google_place_id));
  }
  return found;
}

function toRow(p, area, category, photos) {
  return {
    name: p.title,
    category,
    extra_categories: [],
    address: p.address,
    latitude: p.lat,
    longitude: p.lng,
    thumbnail: photos[0],
    gallery: photos,
    phone: p.phone,
    website: p.website,
    rating: p.rating,
    reviews_count: Number.isFinite(p.reviews) ? p.reviews : 0,
    is_claimed: false,
    status: 'unclaimed',
    opening_hours: p.hours,
    social_links: {},
    neighborhood: area,
    google_place_id: p.placeId,
  };
}

async function countIn(area, category) {
  const q = `unclaimedspots?select=id&neighborhood=eq.${encodeURIComponent(area)}&category=eq.${encodeURIComponent(category)}`;
  const r = await sb(q, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  if (!r.ok) throw new Error('Supabase count failed: ' + (await r.text()));
  return parseInt((r.headers.get('content-range') || '*/0').split('/')[1], 10) || 0;
}

async function main() {
  console.log(`Places: ${AREAS.map(a => a.query === a.label ? a.label : `${a.query} -> ${a.label}`).join(' + ')} | Categories: ${CATEGORIES.join(', ')} | ${ADD_COUNT ? `add up to ${ADD_COUNT} new per place per category` : `target ${TARGET} per area per category`} | ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  const toInsert = [];
  const report = [];
  const pull = spawnSync('docker', ['pull', IMAGE], { encoding: 'utf8' });
  if (pull.status !== 0) fail('Could not pull the scraper image: ' + ((pull.stderr || pull.stdout || 'docker not available').trim().split('\n').slice(-2).join(' ')));

  const errors = [];
  const picked = new Set(); // place IDs already chosen for an earlier area this run
  for (const spec of AREAS) {
   const area = spec.label;
   const where = spec.query === spec.label ? spec.label : `${spec.query} -> ${spec.label}`;
   try {
    // How many each category still needs to reach TARGET.
    const need = {};
    for (const cat of CATEGORIES) {
      const have = await countIn(area, cat);
      need[cat] = ADD_COUNT ? ADD_COUNT : Math.max(0, TARGET - have);
      console.log(`${where} / ${cat}: have ${have}, need ${need[cat]}`);
    }
    const cats = CATEGORIES.filter(c => need[c] > 0);
    for (const cat of CATEGORIES.filter(c => need[c] === 0)) {
      report.push({ area: where, category: cat, qualified: 0, alreadyInDb: 0, new: 0, note: 'target reached' });
    }
    if (!cats.length) continue;

    // First pass uses DEPTH. In STRICT mode, short categories get deeper and deeper searches until filled or MAX_DEPTH is reached.
    const ladder = [DEPTH];
    if (STRICT) {
      for (let d = DEPTH + 2; d < MAX_DEPTH; d += 2) ladder.push(d);
      if (MAX_DEPTH > DEPTH) ladder.push(MAX_DEPTH);
    }
    const fresh = Object.fromEntries(cats.map(c => [c, []]));
    const stats = Object.fromEntries(cats.map(c => [c, { qualified: 0, inDb: 0 }]));
    const seenQ = new Set();

    const relaxedTerms = (c) => [...new Set([...TERMS[c], ...(EXTRA_TERMS[c] || [])])];
    const passes = [{ relax: false, depths: ladder, terms: null }];
    if (RELAX_FALLBACK) passes.push({ relax: true, depths: [DEPTH, MAX_DEPTH], terms: relaxedTerms });
    const baseThresholds = { MIN_RATING, MIN_REVIEWS, MIN_PHOTOS };

    try {
    for (const pass of passes) {
      if (!cats.some(c => fresh[c].length < need[c])) break;
      if (pass.relax) {
        MIN_RATING = Math.max(3.5, Math.round((baseThresholds.MIN_RATING - 0.5) * 10) / 10);
        MIN_REVIEWS = Math.max(5, Math.floor(baseThresholds.MIN_REVIEWS / 2));
        MIN_PHOTOS = 3; // the app's home rail needs 3+, never fewer
        console.log(`${where}: relaxed pass (${MIN_RATING}★ / ${MIN_REVIEWS} reviews / ${MIN_PHOTOS} photos, extra search terms) for ${cats.filter(c => fresh[c].length < need[c]).map(c => `${c} (${need[c] - fresh[c].length} more)`).join(', ')}`);
      }
      for (const depth of pass.depths) {
      const open = cats.filter(c => fresh[c].length < need[c]);
      if (!open.length) break;
      if (depth !== pass.depths[0]) console.log(`${where}: still short on ${open.map(c => `${c} (${need[c] - fresh[c].length} more)`).join(', ')}; searching deeper (depth ${depth})`);
      let items;
      try { items = await scrapeArea(spec, open, depth, pass.terms); }
      catch (e) {
        if (depth === pass.depths[0] && !pass.relax) throw e;
        console.warn(`  search failed: ${e.message}`);
        break;
      }
      const byCat = Object.fromEntries(open.map(c => [c, []]));

      for (const p of items) {
        const cat = p.cat;
        if (!cat || !p.placeId || seenQ.has(p.placeId)) continue;
        const ok = p.title && p.address && Number.isFinite(p.lat) && Number.isFinite(p.lng)
          && !p.closed
          && p.rating >= MIN_RATING && p.reviews >= MIN_REVIEWS
          && p.photoUrls.length >= MIN_PHOTOS;
        if (!ok) continue;
        seenQ.add(p.placeId);
        byCat[cat].push(p);
      }

      const existing = await existingIds(Object.values(byCat).flat().map(p => p.placeId));
      for (const cat of open) {
        stats[cat].qualified += byCat[cat].length;
        stats[cat].inDb += byCat[cat].filter(p => existing.has(p.placeId)).length;
        const ranked = byCat[cat]
          .filter(p => !existing.has(p.placeId) && !picked.has(p.placeId))
          .sort((a, b) => b.rating * Math.log10(b.reviews + 1) - a.rating * Math.log10(a.reviews + 1));
        let brokenPhotos = 0;
        for (const p of ranked) {
          if (fresh[cat].length >= need[cat]) break;   // never goes over the number you asked for
          const photos = await workingPhotos(p.photoUrls); // only checked for spots we'd actually add
          if (photos.length < MIN_PHOTOS) { brokenPhotos++; continue; }
          picked.add(p.placeId);
          const row = toRow(p, area, cat, photos);
          fresh[cat].push(row);
          toInsert.push(row);
        }
        if (brokenPhotos) console.log(`${where} / ${cat}: skipped ${brokenPhotos} whose photos did not load`);
      }
      }
    }
    } finally {
      // Always restore the configured thresholds, whatever happened in the relaxed pass.
      MIN_RATING = baseThresholds.MIN_RATING;
      MIN_REVIEWS = baseThresholds.MIN_REVIEWS;
      MIN_PHOTOS = baseThresholds.MIN_PHOTOS;
    }

    for (const cat of cats) {
      const short = need[cat] - fresh[cat].length;
      if (short > 0) console.warn(`⚠ ${where} / ${cat}: found ${fresh[cat].length} of ${need[cat]} (${short} short). ${STRICT ? 'Searched as deep as MAX_DEPTH allows; ' : 'Turn on strict mode, or '}lower min_reviews, or add a nearby area.`);
      report.push({ area: where, category: cat, qualified: stats[cat].qualified, alreadyInDb: stats[cat].inDb, new: fresh[cat].length, note: short > 0 ? `SHORT by ${short}` : '' });
    }
   } catch (e) {
    console.error(`✖ ${where} failed: ${e.message}`);
    errors.push(`${where}: ${e.message}`);
   }
  }

  console.table(report);
  console.log(`Total new spots: ${toInsert.length}`);
  if (DRY_RUN) {
    console.log('Preview of what a live run would add (check the addresses are really in the right place):');
    for (const r of toInsert) console.log(`  [${r.category}] ${r.name} | ${r.address} | ${r.rating} stars | ${r.gallery.length} photos | filed under ${r.neighborhood}`);
  }

  if (!DRY_RUN && toInsert.length) {
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const chunk = toInsert.slice(i, i + 50);
      const r = await sb('unclaimedspots', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(chunk) });
      if (r.ok) { inserted += chunk.length; continue; }
      for (const row of chunk) { // fall back row-by-row so one duplicate doesn't sink the batch
        const rr = await sb('unclaimedspots', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
        if (rr.ok) inserted++; else console.warn('skip', row.name, rr.status);
      }
    }
    console.log(`✔ Inserted ${inserted}`);
    fs.mkdirSync('seed-runs', { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(`seed-runs/${stamp}-${AREAS.map(a => a.label).join('+').replace(/\s+/g, '').slice(0, 60)}.json`, JSON.stringify({
      ranAt: new Date().toISOString(), areas: AREAS.map(a => `${a.query}|${a.label}${a.geo ? '|' + a.geo : ''}`), categories: CATEGORIES, target: TARGET, summary: report,
      spots: toInsert.map(r => ({ google_place_id: r.google_place_id, name: r.name, category: r.category, neighborhood: r.neighborhood })),
    }, null, 2));
  }

  if (errors.length) { console.error('Some areas failed:\n' + errors.join('\n')); process.exitCode = 1; }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['### Seed run ' + (DRY_RUN ? '(dry run)' : ''), '', '| Area | Category | Qualified | Already in DB | New | Note |', '|---|---|---|---|---|---|',
      ...report.map(r => `| ${r.area} | ${r.category} | ${r.qualified} | ${r.alreadyInDb} | ${r.new} | ${r.note || ''} |`), '', `**Total new: ${toInsert.length}**`, ...(DRY_RUN ? ['', '```', ...toInsert.map(r => `[${r.category}] ${r.name} | ${r.address} | ${r.rating} stars | ${r.gallery.length} photos | ${r.neighborhood}`), '```'] : [])].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }
}

main().catch(e => fail(e.message));
