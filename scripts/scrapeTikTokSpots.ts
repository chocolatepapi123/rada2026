import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });

const OFFSET = parseInt(process.env.QUERY_OFFSET || '0', 10);
const LIMIT = parseInt(process.env.QUERY_LIMIT || '1000', 10);

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

// [name to search, area hint, default category]
const SPOTS: [string, string, string][] = [
  // Places 1
  ['Wiilo Fine Pastries Tapas', 'Nairobi', C.cafe],
  ['The Cake Room Broadwalk Mall', 'Westlands', C.cafe],
  ['Bubble Mug', 'Nairobi', C.cafe],
  ['Feelinpoa Coffee', 'Thika Road', C.cafe],
  ['Zarafa Lounge', 'Kilimani', C.club],
  ['The Daily Cafe', 'Nairobi', C.cafe],
  ['Lavy Restaurant Legend Valley Business Park', 'Lavington', C.food],
  // Places 2
  ['Maison Cafe Patisserie Bistro', 'Nairobi', C.cafe],
  ['Smallworld Country', 'Nairobi', C.nature],
  ['Coffee Lab Karen', 'Karen', C.cafe],
  ['The Canteen Lavington', 'Lavington', C.food],
  ['Twin 1/2 Coffee', 'Nairobi', C.cafe],
  ['Daar by Izzi', 'Nairobi', C.food],
  // Places 3
  ['Sana Restaurant Gigiri', 'Gigiri', C.food],
  ['Cafe Naimora', 'Nairobi', C.cafe],
  ['Nestea', 'Nairobi', C.cafe],
  ['Okia One Three Six', 'Nairobi', C.date],
  ['Baladi Restaurant', 'Nairobi', C.food],
  ['Trunk & Tandoor Novotel Westlands', 'Westlands', C.date],
  ['Ayeyo Restaurant', 'Nairobi', C.food],
  ['Gogol Pizza', 'Nairobi', C.food],
  ['Acai Love Kileleshwa', 'Kileleshwa', C.cafe],
  // Places 4
  ["Rex's Ice Cream Lavington Corner Mall", 'Lavington', C.cafe],
  ['Kiyoyo Boba CBD', 'Nairobi CBD', C.cafe],
  ['Friends Coffee Redhill', 'Redhill', C.cafe],
  ['Lerruat Log Resort Bisil', 'Kajiado', C.hotel],
  ['The Sage Delicacy', 'Nairobi', C.food],
  ['Sironka Kiserian', 'Kiserian', C.nature],
  ['Kaffe Brix Parklands', 'Parklands', C.date],
  // Places 5
  ['Kahani Indian Kitchen Bar', 'Gigiri', C.food],
  ['Bambino 9 West Building Westlands', 'Westlands', C.date],
  ['Bang Bang Thai Kitchen Village Market', 'Gigiri', C.food],
  ['Ara Latin Fusion Restaurant Astrol Square', 'Redhill', C.food],
  ['Enchante Bistro Gigiri', 'Gigiri', C.food],
  ['Chekafe Lavington', 'Lavington', C.cafe],
  ['ATL Restaurant Nairobi', 'Nairobi', C.food],
  ['Yamas Coffee Kitchen Bar Westgate', 'Westlands', C.cafe],
  ['SilverOak Cafe Spring Valley', 'Spring Valley', C.cafe],
  ['Cocoa Cafe Alia Towers Kilimani', 'Kilimani', C.cafe],
  ['Canopy UN Crescent Gigiri', 'Gigiri', C.cafe],
  // Places 6
  ['Knead Restaurant Hyatt Place Kabete', 'Westlands', C.food],
  ['Yunion Brunch Cafe Bar GTC', 'Westlands', C.food],
  ['Gaia Coffee and Bakery Westgate', 'Westlands', C.cafe],
  ['Kalamaia Restaurant Bar James Gichuru', 'Lavington', C.food],
  ['The Summer Lounge Sarit Centre', 'Westlands', C.club],
  ['Dawn Culinary The Promenade General Mathenge', 'Westlands', C.food],
  ['Slate Restaurant Nairobi', 'Nairobi', C.date],
  ['Papparoti Kenya', 'Nairobi', C.cafe],
  ['Glam Rooftop Westlands', 'Westlands', C.club],
  ['Ginkgo Restaurant Nairobi', 'Nairobi', C.date],
  ['Pynk Bite Nairobi CBD', 'Nairobi CBD', C.food],
  // Places 7 and 8
  ['Soho Nairobi club', 'Nairobi', C.club],
  ['Koda Nairobi club', 'Nairobi', C.club],
  ['Muze Nairobi club', 'Nairobi', C.club],
  ['Splatter Room Kenya Meriada Gardens', 'Lavington', C.creative],
  ['Game Center Juja City Mall', 'Juja', C.tech],
  ['Smash & Play Rhapta Promenade Mall', 'Westlands', C.action],
  ['Playza Prestige Plaza Ngong Road', 'Ngong Road', C.tech],
  ['VR Arena Our Mall Magadi Road', 'Magadi Road', C.tech],
  ['Unseen Nairobi', 'Nairobi', C.club],
  ['Quizcapital Nairobi', 'Nairobi', C.creative],
  ['The Craft Cafe Nairobi', 'Nairobi', C.creative],
  ['Kuzi Pottery Nairobi', 'Nairobi', C.creative],
  ['The Chocolate Room Nairobi', 'Nairobi', C.cafe],
  ['Orange Desserts Nairobi', 'Nairobi', C.cafe],
  ['ViVa Gardens Gatundu', 'Gatundu', C.nature],
  ['Afro Sayari Chester House', 'Nairobi', C.action],
  ['The Yard Mini Golf Village Market', 'Gigiri', C.action],
  ['Jeevanjee Gardens Nairobi', 'Nairobi CBD', C.nature],
  ['The Living Rooms Ngara', 'Ngara', C.club],
  ['The Rift Ngara Nairobi', 'Ngara', C.club],
  ['Organic Farmers Market Marula Green', 'Nairobi', C.nature],
];

const KIDS = /\b(kids?|children|toddler|playschool|daycare|nursery|baby|babies|junior)\b/i;
const BAD_IMG = /instagram|cdninstagram|fbcdn|facebook\.com/i;
const STOP = new Set(['the', 'and', 'cafe', 'coffee', 'restaurant', 'bar', 'lounge', 'nairobi', 'kenya', 'club', 'by', 'at']);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function matches(query: string, title: string): boolean {
  const t = norm(title);
  const toks = norm(query).split(' ').filter(w => w.length >= 3 && !STOP.has(w));
  const key = toks[0] || norm(query).split(' ')[0];
  return t.includes(key);
}

function mapCategory(types: string, fallback: string): string {
  const t = types.toLowerCase();
  if (/night ?club|lounge|cocktail bar|\bbar\b|pub|disco/.test(t)) return C.club;
  if (/hotel|resort|lodge|guest house/.test(t)) return C.hotel;
  if (/video game|gaming|arcade|esports/.test(t)) return C.tech;
  if (/bowling|go.?kart|paintball|swimming|golf|climbing|laser|skating|sport/.test(t)) return C.action;
  if (/park|nature|hiking|garden|trail|market/.test(t)) return C.nature;
  if (/cafe|coffee|bakery|pastry|tea house|ice cream|dessert|chocolate/.test(t)) return C.cafe;
  if (/art gallery|museum|pottery|ceramic|studio|craft|entertainment/.test(t)) return C.creative;
  if (/restaurant|grill|eatery|steak|pizza|diner/.test(t)) return fallback === C.date ? C.date : C.food;
  return fallback;
}

async function fetchAll(table: string, cols: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  if (!process.env.APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN missing');
  console.log('🎵 RADA: adding TikTok-sourced spots...');

  const existing = await fetchAll('unclaimedspots', 'google_place_id,status');
  const seen = new Set<string>(existing.map(s => s.google_place_id).filter(Boolean));
  const status = existing.find(s => s.status)?.status ?? undefined;
  try {
    (await fetchAll('unclaimedspots_removed_20261023', 'google_place_id')).forEach(
      r => r.google_place_id && seen.add(r.google_place_id)
    );
  } catch {}

  const added: string[] = [];
  const already: string[] = [];
  const missed: string[] = [];

  for (const [q, hood, cat] of SPOTS.slice(OFFSET, OFFSET + LIMIT)) {
    console.log(`📍 ${q}`);
    try {
      const run = await apify.actor('compass/crawler-google-places').call({
        searchStringsArray: [`${q} Nairobi Kenya`.replace(/Nairobi Nairobi/i, 'Nairobi')],
        maxCrawledPlacesPerSearch: 3,
        language: 'en',
        countryCode: 'ke',
        maxImages: 6,
        scrapeContacts: false,
      });
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      const p: any = (items as any[]).find(i => i.title && i.placeId && !i.permanentlyClosed && matches(q, i.title));
      if (!p) { missed.push(q); console.log('   ✖ no match'); continue; }
      if (seen.has(p.placeId)) { already.push(p.title); console.log(`   = already have ${p.title}`); continue; }

      const types = [p.categoryName, ...(p.categories || [])].filter(Boolean).join(' ');
      if (KIDS.test(p.title) || KIDS.test(types)) { missed.push(`${q} (kids venue, skipped)`); continue; }
      const imgs: string[] = (p.imageUrls || []).filter((u: string) => u && !BAD_IMG.test(u));
      if (imgs.length < 2) { missed.push(`${q} (under 2 photos)`); continue; }

      const row = {
        name: p.title,
        category: mapCategory(types, cat),
        address: p.address || `${hood}, Kenya`,
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
        opening_hours: Array.isArray(p.openingHours) && p.openingHours.length ? p.openingHours : null,
      };
      const { error } = await supabase.from('unclaimedspots').insert(row);
      if (error) { console.error('   ❌ insert:', error.message); missed.push(`${q} (insert failed)`); }
      else { seen.add(p.placeId); added.push(`${p.title} → ${row.category}`); console.log(`   ✅ ${p.title}`); }
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error(`   ❌ ${msg}`);
      missed.push(`${q} (error)`);
      if (/402|limit|credit|payment/i.test(msg)) { console.error('🛑 Apify credit exhausted. Stopping.'); break; }
    }
  }

  console.log(`\n🎉 Added ${added.length}`);
  added.forEach(a => console.log('  +', a));
  console.log(`\nAlready in table: ${already.length}`);
  console.log(`\nNeed manual check (${missed.length}):`);
  missed.forEach(m => console.log('  ?', m));
}

main().catch(e => { console.error(e); process.exit(1); });
