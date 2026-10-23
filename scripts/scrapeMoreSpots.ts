import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });
const supabase = createClient(supabaseUrl, supabaseKey);

const OFFSET = parseInt(process.env.QUERY_OFFSET || '0', 10);
const LIMIT = parseInt(process.env.QUERY_LIMIT || '1000', 10);
const PER_QUERY = parseInt(process.env.PER_QUERY || '20', 10);

const C = {
  food: 'Restaurants and dining',
  club: 'Clubs and lounges',
  hotel: 'Hotels and luxury stays',
  nature: 'Nature trails and outdoor',
  cafe: 'Cafes and bakeries',
  date: 'Date spots',
  creative: 'Creative and leisure',
  tech: 'Tech and gaming',
  action: 'Action and sports',
};

// [neighborhood label, search text, default category]
const AREAS: [string, string][] = [
  ['Kilimani', 'Kilimani Nairobi'],
  ['Kileleshwa', 'Kileleshwa Nairobi'],
  ['Westlands', 'Westlands Nairobi'],
  ['Lavington', 'Lavington Nairobi'],
  ['Riverside', 'Riverside Drive Nairobi'],
  ['Upper Hill', 'Upper Hill Nairobi'],
  ['Kawangware Road', 'Yaya Centre Chaka Valley Arcade Nairobi'],
  ['Valley Arcade', 'Valley Arcade Lavington Nairobi'],
  ['Kawangware', 'Kawangware Nairobi'],
  ['Roysambu', 'Roysambu Nairobi'],
  ['Garden City', 'Garden City Mall Thika Road Nairobi'],
  ['Allsopps', 'Allsopps Thika Road Ruaraka Nairobi'],
  ['Homeland', 'Homeland Thika Road Nairobi'],
  ['Mushroom Road', 'Mushroom Road Thika Road Nairobi'],
  ['Kasarani', 'Kasarani Nairobi'],
  ['Juja', 'Juja Kenya'],
  ['Juja', 'Juja Destination Cocktails Juja Kenya'],
  ['Juja', 'JKUAT Juja Kwa Jose Kenya'],
  ['Kenyatta University', 'Kenyatta University KU Kwa Symo Kahawa Nairobi'],
  ['Buruburu', 'Buruburu Nairobi'],
  ['Kitengela', 'Kitengela Kenya'],
  ['Syokimau', 'Syokimau Mombasa Road'],
  ['Mombasa Road', 'Mombasa Road Nairobi'],
  ['Athi River', 'Athi River Kenya'],
  ['South C', 'South C Nairobi'],
  ['Embakasi', 'Embakasi Nairobi'],
  ['Karen', 'Karen Nairobi'],
  ['Runda', 'Runda Gigiri Nairobi'],
];

const TYPES: [string, string][] = [
  ['restaurants', C.food],
  ['nightclubs lounges bars', C.club],
  ['cafes coffee', C.cafe],
  ['hotels', C.hotel],
  ['hangout fun spots', C.creative],
];

// Specific named venues the user asked for
const NAMED: [string, string, string][] = [
  ['Masshouse Nairobi', 'Westlands', C.club],
  ['Al Capone Nairobi', 'Nairobi', C.club],
  ['Al Fakhr Nairobi', 'Nairobi', C.food],
  ['Juja Destination Cocktails', 'Juja', C.club],
  ['KU Kwa Symo Kahawa', 'Kenyatta University', C.club],
  ['Juja Kwa Jose', 'Juja', C.club],
];

type Q = { q: string; hood: string; cat: string };
const QUERIES: Q[] = [
  ...NAMED.map(([q, hood, cat]) => ({ q, hood, cat })),
  ...AREAS.flatMap(([hood, text]) =>
    TYPES.map(([t, cat]) => ({ q: `${t} ${text}`, hood, cat }))
  ),
];

const KIDS = /\b(kids?|children|toddler|playschool|daycare|nursery|baby|babies|junior)\b/i;
const BAD_IMG = /instagram|cdninstagram|fbcdn|facebook\.com/i;

function mapCategory(types: string, fallback: string): string {
  const t = types.toLowerCase();
  if (/night ?club|lounge|cocktail bar|\bbar\b|pub|disco/.test(t)) return C.club;
  if (/hotel|resort|lodge|guest house|boutique|villa/.test(t)) return C.hotel;
  if (/video game|gaming|internet cafe|computer|esports|arcade/.test(t)) return C.tech;
  if (/gym|sport|go.?kart|paintball|swimming|golf|climbing|quad|stadium|fitness/.test(t)) return C.action;
  if (/park|nature|hiking|garden|forest|trail|campground|game reserve/.test(t)) return C.nature;
  if (/cafe|coffee|bakery|pastry|tea house|ice cream|dessert/.test(t)) return C.cafe;
  if (/art gallery|museum|cinema|theater|theatre|event venue|entertainment|bowling|karaoke|spa|studio/.test(t)) return C.creative;
  if (/restaurant|grill|eatery|steak|pizza|burger|nyama|diner|food/.test(t)) return C.food;
  return fallback;
}

async function fetchAll(table: string, cols: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  console.log('🗺️ RADA: scraping more spots...');
  if (!process.env.APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN missing');

  const existing = await fetchAll('unclaimedspots', 'name,address,google_place_id,status');
  const seenPlace = new Set<string>(existing.map(s => s.google_place_id).filter(Boolean));
  const seenName = new Set<string>(
    existing.map(s => `${(s.name || '').toLowerCase().trim()}_${(s.address || '').toLowerCase().trim()}`)
  );
  const seenNameOnly = new Set<string>(existing.map(s => (s.name || '').toLowerCase().trim()));
  const status = existing.find(s => s.status)?.status ?? undefined;

  // don't re-add spots that were deleted earlier
  try {
    const removed = await fetchAll('unclaimedspots_removed_20261023', 'google_place_id');
    removed.forEach(r => r.google_place_id && seenPlace.add(r.google_place_id));
  } catch {
    console.log('ℹ️ no removed-spots table found, skipping');
  }

  console.log(`Existing: ${existing.length}. Total queries: ${QUERIES.length}. Running ${OFFSET}..${OFFSET + LIMIT}`);

  let inserted = 0;
  for (const { q, hood, cat } of QUERIES.slice(OFFSET, OFFSET + LIMIT)) {
    console.log(`📍 ${q}`);
    try {
      const run = await apify.actor('compass/crawler-google-places').call({
        searchStringsArray: [q],
        maxCrawledPlacesPerSearch: PER_QUERY,
        language: 'en',
        countryCode: 'ke',
        maxImages: 6,
        scrapeContacts: false,
      });
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      const rows: any[] = [];

      for (const p of items as any[]) {
        const name = p.title;
        if (!name || !p.placeId || p.permanentlyClosed || p.temporarilyClosed) continue;
        const types = [p.categoryName, ...(p.categories || [])].filter(Boolean).join(' ');
        if (KIDS.test(name) || KIDS.test(types)) continue;

        const imgs: string[] = (p.imageUrls || []).filter((u: string) => u && !BAD_IMG.test(u));
        if (imgs.length < 2) continue;

        const address = p.address || '';
        const key = `${name.toLowerCase().trim()}_${address.toLowerCase().trim()}`;
        if (seenPlace.has(p.placeId) || seenName.has(key)) continue;
        if (seenNameOnly.has(name.toLowerCase().trim()) && !address) continue;

        const hours = Array.isArray(p.openingHours) && p.openingHours.length ? p.openingHours : null;
        rows.push({
          name,
          category: mapCategory(types, cat),
          address: address || `${hood}, Kenya`,
          latitude: p.location?.lat ?? null,
          longitude: p.location?.lng ?? null,
          thumbnail: imgs[0],
          gallery: imgs.slice(0, 6),
          phone: p.phone || p.phoneUnformatted || null,
          website: p.website && !BAD_IMG.test(p.website) ? p.website : null,
          rating: p.totalScore ?? null,
          reviews_count: p.reviewsCount ?? null,
          is_claimed: false,
          ...(status ? { status } : {}),
          neighborhood: p.neighborhood || hood,
          google_place_id: p.placeId,
          opening_hours: hours,
        });
        seenPlace.add(p.placeId);
        seenName.add(key);
      }

      if (rows.length) {
        const { error } = await supabase.from('unclaimedspots').insert(rows);
        if (error) console.error('❌ insert failed:', error.message);
        else {
          inserted += rows.length;
          console.log(`   ✅ +${rows.length} (total new: ${inserted})`);
        }
      } else console.log('   – nothing new');
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error(`❌ ${q}: ${msg}`);
      if (/402|limit|credit|payment/i.test(msg)) {
        console.error('🛑 Apify credit exhausted. Stopping.');
        break;
      }
    }
  }
  console.log(`🎉 Done. Inserted ${inserted} new spots.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
