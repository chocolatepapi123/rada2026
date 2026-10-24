/**
 * scripts/seedSpots.ts  (run: npm run seed:spots  ->  tsx scripts/seedSpots.ts)
 *
 * Seeds the `unclaimedspots` table from Google Maps via Apify (compass/crawler-google-places).
 *
 * Phases (in this order, so the priorities always run first):
 *   1. PRIORITY  Ice cream / dessert spots and Nyama Choma & Grills across every area.
 *   2. CHAINS    Hash Grill + Pizza Inn: finds missing branches AND replaces the shared Instagram photos
 *                on existing branches with each branch's own Google Maps photos. Photos that appear on
 *                more than one branch are dropped, so branches never share pictures.
 *   3. GENERAL   Every other category (smaller categories first; the job order rotates daily so each
 *                night covers different ground).
 *
 * Safe to stop at any time: rows are written in small batches, existing places (google_place_id) are
 * skipped, and the run stops cleanly when the time budget or your Apify credit runs out.
 *
 * Env: APIFY_TOKEN, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Optional: SEED_MODE=all|priority|chains|general, SEED_BUDGET_MIN=300, SEED_CONCURRENCY=2,
 *           COPY_TO_BUCKET=true, MEDIA_BUCKET=rada-media, DRY_RUN=false
 */
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';
import { appendFileSync } from 'node:fs';

// ───────────────────────────── config ─────────────────────────────
const env = (k: string, d = '') => (process.env[k] ?? d).trim();
const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];

const APIFY_TOKEN = env('APIFY_TOKEN') || env('APIFY_API_TOKEN');
const SUPABASE_URL = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const MODE = (arg('mode') || env('SEED_MODE', 'all')) as 'all' | 'priority' | 'chains' | 'general';
const BUDGET_MIN = Number(arg('budget-min') || env('SEED_BUDGET_MIN', '300'));
const CONCURRENCY = Math.max(1, Number(env('SEED_CONCURRENCY', '2')));
const COPY_TO_BUCKET = env('COPY_TO_BUCKET', 'true') !== 'false';
const BUCKET = env('MEDIA_BUCKET', 'rada-media');
const DRY_RUN = env('DRY_RUN', 'false') === 'true' || process.argv.includes('--dry-run');

const ACTOR = 'compass/crawler-google-places';
const TABLE = 'unclaimedspots';
const MIN_PHOTOS = 2;           // inclusion rule: at least 2 photos, no rating/review filter
const BATCH = 10;               // insert size, so partial progress is saved
const RUN_WAIT_SECS = 900;

if (!APIFY_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: need APIFY_TOKEN, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const apify = new ApifyClient({ token: APIFY_TOKEN });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const deadline = Date.now() + BUDGET_MIN * 60_000;

// ───────────────────────────── locations ─────────────────────────────
const LOCATIONS = [
  'Westlands, Nairobi, Kenya', 'Kilimani, Nairobi, Kenya', 'Kileleshwa, Nairobi, Kenya',
  'Lavington, Nairobi, Kenya', 'Karen, Nairobi, Kenya', 'Langata, Nairobi, Kenya',
  'Runda, Nairobi, Kenya', 'Gigiri, Nairobi, Kenya', 'Nairobi CBD, Kenya', 'Upper Hill, Nairobi, Kenya',
  'South B, Nairobi, Kenya', 'South C, Nairobi, Kenya', 'Parklands, Nairobi, Kenya',
  'Kasarani, Nairobi, Kenya', 'Roysambu, Nairobi, Kenya', 'Thika Road, Nairobi, Kenya',
  'Buruburu, Nairobi, Kenya', 'Donholm, Nairobi, Kenya', 'Embakasi, Nairobi, Kenya',
  'Mombasa Road, Nairobi, Kenya', 'Syokimau, Kenya', 'Athi River, Kenya', 'Kitengela, Kenya',
  'Ngong Road, Nairobi, Kenya', 'Ngong, Kenya', 'Rongai, Kenya',
  'Ruaka, Kenya', 'Kiambu Town, Kenya', 'Limuru, Kenya', 'Kikuyu, Kenya', 'Tigoni, Kenya',
  'Ruiru, Kenya', 'Juja, Kenya', 'Thika Town, Kenya',
];

// ───────────────────────────── jobs ─────────────────────────────
interface Job {
  id: string;
  category: string;          // exact RADA category label
  searches: string[];
  accept?: RegExp;           // Google label / name must match (keeps results on-topic)
  maxPlaces: number;         // per search term
  maxImages: number;
  locations: string[];
}

const ICE_CREAM_RE = /ice ?cream|gelato|frozen yogh?urt|froyo|creamery|dessert|sundae|waffle|crepe|sorbet|milkshake/i;
const NYAMA_RE = /nyama|choma|grill|barbecue|bbq|butcher|steak|meat|roast|braai|smokehouse|kebab/i;

const PRIORITY_JOBS: Job[] = [
  {
    id: 'ice-cream', category: 'Desserts & Ice Cream', accept: ICE_CREAM_RE, maxPlaces: 40, maxImages: 6,
    searches: ['ice cream', 'gelato', 'frozen yogurt', 'ice cream parlour', 'dessert shop'], locations: LOCATIONS,
  },
  {
    id: 'nyama-choma', category: 'Nyama Choma & Grills', accept: NYAMA_RE, maxPlaces: 40, maxImages: 6,
    searches: ['nyama choma', 'grill restaurant', 'butchery and grill', 'bbq grill'], locations: LOCATIONS,
  },
];

interface Chain {
  name: string;
  nameRe: RegExp;
  category: string;
  searches: string[];
  locations: string[];
}
const CHAIN_LOCATIONS = ['Nairobi, Kenya', 'Thika, Kenya', 'Kiambu, Kenya', 'Kitengela, Kenya', 'Ngong, Kenya', 'Ruiru, Kenya'];
const CHAINS: Chain[] = [
  { name: 'Hash Grill', nameRe: /hash\s*grill/i, category: 'Nyama Choma & Grills', searches: ['Hash Grill'], locations: CHAIN_LOCATIONS },
  { name: 'Pizza Inn', nameRe: /pizza\s*inn/i, category: 'Fast Food', searches: ['Pizza Inn'], locations: CHAIN_LOCATIONS },
];

const G = (id: string, category: string, searches: string[], maxPlaces = 25, extra: Partial<Job> = {}): Job =>
  ({ id, category, searches, maxPlaces, maxImages: 4, locations: LOCATIONS, ...extra });

// Smaller categories first.
const GENERAL_JOBS: Job[] = [
  G('gaming', 'Gaming & Arcades', ['gaming lounge', 'arcade', 'esports', 'playstation lounge', 'virtual reality']),
  G('sports', 'Sports & Adventure', ['go karting', 'quad biking', 'paintball', 'trampoline park', 'rock climbing', 'horse riding']),
  G('arts', 'Arts & Culture', ['art gallery', 'museum', 'cultural centre', 'theatre']),
  G('date', 'Date Spots', ['romantic dinner', 'fine dining', 'wine bar']),
  G('outdoors', 'Outdoors & Nature', ['park', 'forest', 'waterfall', 'nature trail', 'botanical garden']),
  G('garden', 'Garden Hangouts', ['garden restaurant', 'garden cafe']),
  G('hangouts', 'Hangouts & Leisure', ['bowling alley', 'karaoke', 'recreation centre']),
  G('rooftops', 'Rooftops', ['rooftop bar', 'rooftop restaurant']),
  G('cafes', 'Cafes & Bakeries', ['cafe', 'coffee shop', 'bakery']),
  G('bars', 'Bars & Chill Spots', ['bar', 'pub', 'cocktail bar']),
  G('clubs', 'Clubs & Lounges', ['night club', 'nightclub']),
  G('fastfood', 'Fast Food', ['fast food', 'burger', 'pizza', 'fried chicken']),
  G('restaurants', 'Restaurants', ['restaurant', 'african restaurant', 'italian restaurant', 'seafood restaurant', 'indian restaurant']),
  G('getaways', 'Getaways & Resorts', ['resort', 'weekend getaway', 'eco lodge']),
  G('hotels', 'Hotels & Stays', ['boutique hotel', 'luxury hotel', 'serviced apartments']),
];

// ───────────────────────────── helpers ─────────────────────────────
class OutOfCredit extends Error {}
const log = (...a: any[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const timeLeft = () => deadline - Date.now() > 60_000;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const stats = { runs: 0, places: 0, inserted: 0, refreshed: 0, skipped: 0, noPhotos: 0, errors: 0 };

/** Same image regardless of the size suffix Google adds. */
const imageKey = (u: string) => u.split('=')[0].split('?')[0];
const bigger = (u: string) =>
  /googleusercontent\.com/.test(u) ? u.replace(/=[wsh]\d+(-[a-z0-9]+)*$/i, '=w1200-h900-k-no') : u;

function placeImages(p: any, limit = 8): string[] {
  const all: string[] = [p.imageUrl, ...(Array.isArray(p.imageUrls) ? p.imageUrls : [])]
    .filter((u): u is string => typeof u === 'string' && u.startsWith('http'));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of all) {
    const k = imageKey(u);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(bigger(u));
    if (out.length >= limit) break;
  }
  return out;
}

const KENYA_BOX = { latMin: -3.0, latMax: 0.6, lngMin: 36.2, lngMax: 37.6 };
const inBox = (lat?: number, lng?: number) =>
  typeof lat === 'number' && typeof lng === 'number' &&
  lat >= KENYA_BOX.latMin && lat <= KENYA_BOX.latMax && lng >= KENYA_BOX.lngMin && lng <= KENYA_BOX.lngMax;

const KIDS_RE = /daycare|day care|nursery|preschool|kindergarten|\bschool\b|children'?s|\bkids?\b/i;
const KIDS_OK_CATEGORIES = new Set(['Gaming & Arcades', 'Sports & Adventure']);

/** Same strict-category rules as lib/spotsFeed.ts, so seeded rows land in the right place from day one. */
function strictCategory(label: string, name: string): string {
  let out = label;
  if (out === 'Clubs & Lounges' && !/night ?club|\bclub\b|\bklub\b|disco|nightlife/i.test(name)) {
    const rules: Array<[RegExp, string]> = [
      [/gaming|arcade|playstation|\bps[45]\b|esports?|\bvr\b|snooker|billiard|pool hall|game (zone|room|hub|station|cent(re|er))/i, 'Gaming & Arcades'],
      [/caf[eé]|coffee|bakery|patisserie/i, 'Cafes & Bakeries'],
      [/hotel|resort|\blodge\b|suites|apartments|guest ?house/i, 'Hotels & Stays'],
      [/restaurant|\bgrill\b|kitchen|eatery|bistro|tapas|diner|steakhouse|nyama/i, 'Restaurants'],
      [/pottery|\bclay\b|gallery|museum|art studio|theat(re|er)/i, 'Arts & Culture'],
      [/chill ?spot|\bpub\b|liquor|sports bar/i, 'Bars & Chill Spots'],
    ];
    for (const [re, to] of rules) if (re.test(name)) { out = to; break; }
  }
  if (out === 'Outdoors & Nature') {
    if (/hotel|suites|apartments|guest ?house|residence/i.test(name)) out = 'Hotels & Stays';
    else if (/resort|\blodge\b|villa|cottage|retreat|getaway|cabins?|glamp|homestay|\bbnb\b/i.test(name)) out = 'Getaways & Resorts';
  }
  return out;
}

function neighborhoodOf(p: any): string | null {
  if (p.neighborhood) return String(p.neighborhood);
  if (p.city) return String(p.city);
  const parts = String(p.address || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length && timeLeft()) { const x = items[i++]; await fn(x); }
  }));
}

// ───────────────────────────── apify ─────────────────────────────
async function runActor(input: Record<string, unknown>): Promise<any[]> {
  try {
    stats.runs++;
    const run = await apify.actor(ACTOR).call(input, { waitSecs: RUN_WAIT_SECS });
    if (run.status !== 'SUCCEEDED') {
      log(`run ${run.id} ended ${run.status}; keeping whatever it produced`);
      if (run.status === 'RUNNING' || run.status === 'READY') await apify.run(run.id).abort().catch(() => {});
    }
    const { items } = await apify.dataset(run.defaultDatasetId).listItems({ limit: 5000 });
    return items as any[];
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/usage|limit|credit|insufficient|payment|402|403|exceed/i.test(msg)) throw new OutOfCredit(msg);
    stats.errors++;
    log('actor error:', msg.slice(0, 200));
    return [];
  }
}

const baseInput = (maxImages: number) => ({
  language: 'en',
  countryCode: 'ke',
  skipClosedPlaces: true,
  maxImages,
  scrapePlaceDetailPage: false,
  includeWebResults: false,
  scrapeReviewsPersonalData: false,
});

// ───────────────────────────── supabase ─────────────────────────────
interface Existing { id: string; name: string; google_place_id: string | null; category: string | null }

async function loadExisting(): Promise<Existing[]> {
  const out: Existing[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(TABLE).select('id,name,google_place_id,category').range(from, from + 999);
    if (error) throw new Error(`load existing: ${error.message}`);
    out.push(...(data as Existing[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function copyToBucket(urls: string[], folder: string): Promise<string[]> {
  if (!COPY_TO_BUCKET || DRY_RUN) return urls;
  const out: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i], { signal: AbortSignal.timeout(20_000) });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('image/')) throw new Error(`bad image ${res.status} ${type}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const path = `${folder}/maps-${i}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true });
      if (error) throw error;
      out.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    } catch {
      out.push(urls[i]); // fall back to the Google URL rather than losing the photo
    }
  }
  return out;
}

const folderFor = (name: string, placeId: string) => `spots/${slug(name)}-${placeId.slice(-8).toLowerCase()}`;

async function insertRows(rows: any[]) {
  if (DRY_RUN) { stats.inserted += rows.length; log(`[dry-run] would insert ${rows.length}`); return; }
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(TABLE).insert(batch);
    if (!error) { stats.inserted += batch.length; continue; }
    // A duplicate in the batch fails the whole batch; retry one by one and ignore duplicates.
    for (const row of batch) {
      const r = await supabase.from(TABLE).insert(row);
      if (!r.error) stats.inserted++;
      else if (r.error.code !== '23505') { stats.errors++; log('insert error:', r.error.message); }
    }
  }
}

async function toRow(p: any, category: string, images: string[]) {
  const media = await copyToBucket(images, folderFor(p.title, p.placeId));
  return {
    name: p.title,
    category,
    extra_categories: [] as string[],
    address: p.address || null,
    latitude: p.location?.lat ?? null,
    longitude: p.location?.lng ?? null,
    thumbnail: media[0],
    gallery: media,
    phone: p.phone || null,
    website: p.website || null,
    rating: typeof p.totalScore === 'number' ? p.totalScore : 0,
    reviews_count: typeof p.reviewsCount === 'number' ? p.reviewsCount : 0,
    is_claimed: false,
    status: 'unclaimed',
    opening_hours: Array.isArray(p.openingHours) ? p.openingHours : [],
    social_links: {},
    neighborhood: neighborhoodOf(p),
    google_place_id: p.placeId,
  };
}

/** Shared filter for scraped places. Returns the photos to use, or null to skip. */
function vet(p: any, category: string, accept?: RegExp): string[] | null {
  if (!p?.title || !p?.placeId) return null;
  if (p.permanentlyClosed || p.temporarilyClosed) return null;
  if (!inBox(p.location?.lat, p.location?.lng)) return null;
  const label = [p.categoryName, ...(p.categories || []), p.title].join(' ');
  if (accept && !accept.test(label)) return null;
  if (!KIDS_OK_CATEGORIES.has(category) && KIDS_RE.test(label)) return null;
  const imgs = placeImages(p);
  if (imgs.length < MIN_PHOTOS) { stats.noPhotos++; return null; }
  return imgs;
}

// ───────────────────────────── phase: jobs (priority + general) ─────────────────────────────
async function runJobs(jobs: Job[], known: Map<string, string>, seen: Set<string>) {
  const tasks = jobs.flatMap(job => job.locations.map(loc => ({ job, loc })));
  await pool(tasks, CONCURRENCY, async ({ job, loc }) => {
    if (!timeLeft()) return;
    const items = await runActor({
      ...baseInput(job.maxImages),
      searchStringsArray: job.searches,
      locationQuery: loc,
      maxCrawledPlacesPerSearch: job.maxPlaces,
    });
    const rows: any[] = [];
    for (const p of items) {
      stats.places++;
      if (!p?.placeId || known.has(p.placeId) || seen.has(p.placeId)) { stats.skipped++; continue; }
      const imgs = vet(p, job.category, job.accept);
      if (!imgs) continue;
      seen.add(p.placeId);
      rows.push(await toRow(p, strictCategory(job.category, p.title), imgs));
    }
    await insertRows(rows);
    log(`${job.id} @ ${loc}: ${items.length} found, ${rows.length} new (total inserted ${stats.inserted})`);
  });
}

// ───────────────────────────── phase: chains ─────────────────────────────
async function runChains(existing: Existing[], known: Map<string, string>, seen: Set<string>) {
  for (const chain of CHAINS) {
    if (!timeLeft()) return;
    log(`chain: ${chain.name}`);
    const candidates = new Map<string, any>(); // placeId -> scraped place (Google Maps photos)

    // a) discover branches (adds ones we don't have yet)
    await pool(chain.locations, CONCURRENCY, async loc => {
      const items = await runActor({
        ...baseInput(8),
        searchStringsArray: chain.searches,
        locationQuery: loc,
        maxCrawledPlacesPerSearch: 60,
        searchMatching: 'only_includes',
      });
      for (const p of items) if (p?.placeId && chain.nameRe.test(p.title || '')) candidates.set(p.placeId, p);
    });

    // b) re-fetch branches we already have, by place id, to get fresh per-branch Maps photos
    const mine = existing.filter(e => chain.nameRe.test(e.name) && /^(ChIJ|GhIJ)/.test(e.google_place_id || ''));
    const pids = mine.map(e => e.google_place_id!).filter(id => !candidates.has(id));
    for (let i = 0; i < pids.length && timeLeft(); i += 20) {
      const items = await runActor({ ...baseInput(8), placeIds: pids.slice(i, i + 20) });
      for (const p of items) if (p?.placeId) candidates.set(p.placeId, p);
    }

    // c) drop any photo that shows up on more than one branch, so branches never share pictures
    const freq = new Map<string, number>();
    for (const p of candidates.values())
      for (const u of placeImages(p, 20)) freq.set(imageKey(u), (freq.get(imageKey(u)) || 0) + 1);

    const newRows: any[] = [];
    for (const p of candidates.values()) {
      if (!inBox(p.location?.lat, p.location?.lng) || p.permanentlyClosed || p.temporarilyClosed) continue;
      const imgs = placeImages(p, 20).filter(u => freq.get(imageKey(u)) === 1).slice(0, 8);
      const id = known.get(p.placeId);
      if (imgs.length < MIN_PHOTOS) {
        stats.noPhotos++;
        log(`  ${p.title}: only ${imgs.length} branch-specific photo(s), left unchanged`);
        continue;
      }
      if (id) {
        if (DRY_RUN) { stats.refreshed++; continue; }
        const media = await copyToBucket(imgs, folderFor(p.title, p.placeId));
        const { error } = await supabase.from(TABLE).update({
          thumbnail: media[0],
          gallery: media,
          rating: typeof p.totalScore === 'number' ? p.totalScore : undefined,
          reviews_count: typeof p.reviewsCount === 'number' ? p.reviewsCount : undefined,
          opening_hours: Array.isArray(p.openingHours) && p.openingHours.length ? p.openingHours : undefined,
          phone: p.phone || undefined,
        }).eq('id', id);
        if (error) { stats.errors++; log('  update error:', error.message); } else stats.refreshed++;
      } else if (!seen.has(p.placeId)) {
        seen.add(p.placeId);
        newRows.push(await toRow(p, chain.category, imgs));
      }
    }
    await insertRows(newRows);
    log(`chain ${chain.name}: ${candidates.size} branches seen, ${newRows.length} new, photos refreshed so far ${stats.refreshed}`);
  }
}

// ───────────────────────────── main ─────────────────────────────
async function main() {
  log(`mode=${MODE} budget=${BUDGET_MIN}min concurrency=${CONCURRENCY} bucketCopy=${COPY_TO_BUCKET} dryRun=${DRY_RUN}`);
  const existing = await loadExisting();
  const known = new Map<string, string>();
  for (const e of existing) if (e.google_place_id) known.set(e.google_place_id, e.id);
  const seen = new Set<string>();
  log(`${existing.length} spots already in ${TABLE}`);

  try {
    if (MODE === 'all' || MODE === 'priority') await runJobs(PRIORITY_JOBS, known, seen);
    if (MODE === 'all' || MODE === 'chains') await runChains(existing, known, seen);
    if (MODE === 'all' || MODE === 'general') {
      const day = Math.floor(Date.now() / 86_400_000);
      const k = day % GENERAL_JOBS.length;
      await runJobs([...GENERAL_JOBS.slice(k), ...GENERAL_JOBS.slice(0, k)], known, seen);
    }
  } catch (e) {
    if (e instanceof OutOfCredit) log('Apify credit/limit reached, stopping cleanly. Progress is saved.');
    else throw e;
  }

  const summary = `Seed finished: ${stats.inserted} inserted, ${stats.refreshed} branch photo sets refreshed, ` +
    `${stats.places} places scanned in ${stats.runs} Apify runs, ${stats.skipped} already known, ` +
    `${stats.noPhotos} skipped for <${MIN_PHOTOS} photos, ${stats.errors} errors.`;
  log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Spot seeding\n${summary}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
