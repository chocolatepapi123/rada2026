// Seeds RADA `unclaimedspots` from Google Maps (via Apify). Run by .github/workflows/seed-spots.yml
// Needs: APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side only, never in the app).
import fs from 'node:fs';

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
const AREAS = list(env('AREAS', 'Kilimani')).filter(a => a !== '(none)');
const CATEGORIES = env('CATEGORIES')
  ? list(env('CATEGORIES'))
  : Object.entries(CAT_KEYS).filter(([k]) => INPUTS[k] === true || INPUTS[k] === 'true').map(([, v]) => v);
// TARGET = how many spots each area should have PER CATEGORY once the run finishes.
// The run only adds the shortfall, so re-running never overshoots.
const TARGET = Math.max(1, parseInt(env('TARGET', '30'), 10) || 30);
const CITY = env('CITY', 'Nairobi');
const DRY_RUN = env('DRY_RUN', 'true') === 'true';
const MIN_RATING = Number(env('MIN_RATING', '4'));
const MIN_REVIEWS = Number(env('MIN_REVIEWS', '20'));
const MIN_PHOTOS = Number(env('MIN_PHOTOS', '3')); // Home rail needs 3+ photos for imported spots

const APIFY_TOKEN = env('APIFY_TOKEN');
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

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }
const missing = [['APIFY_TOKEN', APIFY_TOKEN], ['SUPABASE_URL', SB_URL], ['SUPABASE_SERVICE_ROLE_KEY', SB_KEY]].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) fail('Empty in GitHub secrets: ' + missing.join(', ') + ' (check exact name, and that it is a Repository secret with a value)');
if (!CATEGORIES.length) fail('Tick at least one category');
if (AREAS.length < 1 || AREAS.length > 2) fail('Give 1–2 areas per run (got ' + AREAS.length + ')');
const unknown = CATEGORIES.filter(c => !TERMS[c]);
if (unknown.length) fail('Unknown categories: ' + unknown.join(', ') + '\nValid: ' + Object.keys(TERMS).join(' | '));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function apify(path, init = {}) {
  const res = await fetch('https://api.apify.com/v2' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + APIFY_TOKEN, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function scrapeArea(area, cats, perSearch) {
  const terms = cats.flatMap(c => TERMS[c]);
  const input = {
    searchStringsArray: terms,
    locationQuery: `${area}, ${CITY}, Kenya`,
    maxCrawledPlacesPerSearch: Math.min(perSearch * 3, 150), // buffer: some get filtered out or already exist
    language: 'en',
    skipClosedPlaces: true,
    maxImages: 6,
    maxReviews: 0,
  };
  const run = (await apify('/acts/compass~crawler-google-places/runs', { method: 'POST', body: JSON.stringify(input) })).data;
  console.log(`▶ ${area}: Apify run ${run.id}`);
  let status = run.status;
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    status = (await apify(`/actor-runs/${run.id}?waitForFinish=60`)).data.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`Apify run ${run.id} ended ${status}`);
  const res = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&format=json`, {
    headers: { Authorization: 'Bearer ' + APIFY_TOKEN },
  });
  if (!res.ok) throw new Error('Dataset fetch failed ' + res.status);
  return res.json();
}

const sb = (path, init = {}) => fetch(SB_URL + '/rest/v1/' + path, {
  ...init,
  headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
});

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

const goodUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

function toRow(p, area, category) {
  const photos = [...new Set([p.imageUrl, ...(p.imageUrls || [])].filter(goodUrl))];
  return {
    name: p.title,
    category,
    extra_categories: [],
    address: p.address,
    latitude: p.location?.lat,
    longitude: p.location?.lng,
    thumbnail: photos[0],
    gallery: photos,
    phone: p.phone || null,
    website: p.website || null,
    rating: p.totalScore,
    reviews_count: p.reviewsCount ?? 0,
    is_claimed: false,
    status: 'unclaimed',
    opening_hours: Array.isArray(p.openingHours) ? p.openingHours : [],
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

const bucketOf = (searchString, cats = CATEGORIES) => cats.find(c => TERMS[c].some(t => t.toLowerCase() === String(searchString || '').toLowerCase()));

async function main() {
  console.log(`Areas: ${AREAS.join(' + ')} | Categories: ${CATEGORIES.join(', ')} | target ${TARGET} per area per category | ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  const toInsert = [];
  const report = [];

  for (const area of AREAS) {
    // How many each category still needs to reach TARGET.
    const need = {};
    for (const cat of CATEGORIES) {
      const have = await countIn(area, cat);
      need[cat] = Math.max(0, TARGET - have);
      console.log(`${area} / ${cat}: have ${have}, need ${need[cat]}`);
    }
    const cats = CATEGORIES.filter(c => need[c] > 0);
    for (const cat of CATEGORIES.filter(c => need[c] === 0)) {
      report.push({ area, category: cat, qualified: 0, alreadyInDb: 0, new: 0, note: 'target reached' });
    }
    if (!cats.length) continue;

    const items = await scrapeArea(area, cats, Math.max(...cats.map(c => need[c])));
    const seen = new Set();
    const byCat = Object.fromEntries(cats.map(c => [c, []]));

    for (const p of items) {
      const cat = bucketOf(p.searchString, cats);
      if (!cat || !p.placeId || seen.has(p.placeId)) continue;
      const photos = [...new Set([p.imageUrl, ...(p.imageUrls || [])].filter(goodUrl))];
      const ok = p.title && p.address && p.location?.lat != null && p.location?.lng != null
        && !p.permanentlyClosed && !p.temporarilyClosed
        && Number(p.totalScore) >= MIN_RATING && Number(p.reviewsCount) >= MIN_REVIEWS
        && photos.length >= MIN_PHOTOS;
      if (!ok) continue;
      seen.add(p.placeId);
      byCat[cat].push(p);
    }

    const existing = await existingIds([...seen]);
    for (const cat of cats) {
      const fresh = byCat[cat]
        .filter(p => !existing.has(p.placeId))
        .sort((a, b) => b.totalScore * Math.log10(b.reviewsCount + 1) - a.totalScore * Math.log10(a.reviewsCount + 1))
        .slice(0, need[cat]);
      fresh.forEach(p => toInsert.push(toRow(p, area, cat)));
      report.push({ area, category: cat, qualified: byCat[cat].length, alreadyInDb: byCat[cat].length - byCat[cat].filter(p => !existing.has(p.placeId)).length, new: fresh.length });
    }
  }

  console.table(report);
  console.log(`Total new spots: ${toInsert.length}`);

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
    fs.writeFileSync(`seed-runs/${stamp}-${AREAS.join('+').replace(/\s+/g, '')}.json`, JSON.stringify({
      ranAt: new Date().toISOString(), areas: AREAS, categories: CATEGORIES, target: TARGET, summary: report,
      spots: toInsert.map(r => ({ google_place_id: r.google_place_id, name: r.name, category: r.category, neighborhood: r.neighborhood })),
    }, null, 2));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['### Seed run ' + (DRY_RUN ? '(dry run)' : ''), '', '| Area | Category | Qualified | Already in DB | New |', '|---|---|---|---|---|',
      ...report.map(r => `| ${r.area} | ${r.category} | ${r.qualified} | ${r.alreadyInDb} | ${r.new} |`), '', `**Total new: ${toInsert.length}**`].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }
}

main().catch(e => fail(e.message));
