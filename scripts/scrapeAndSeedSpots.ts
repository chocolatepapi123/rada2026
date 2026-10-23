import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config();

// Strip stray spaces, newlines and quotes from pasted secrets
const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = clean(process.env.VITE_SUPABASE_URL) || clean(process.env.SUPABASE_URL);
const supabaseKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_KEY);
const apifyToken = clean(process.env.APIFY_API_TOKEN);

if (!supabaseUrl || !supabaseKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("Supabase URL (set VITE_SUPABASE_URL or SUPABASE_URL)");
  if (!supabaseKey) missing.push("Supabase service role key (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY)");
  throw new Error(
    `Missing required environment variables:\n - ${missing.join("\n - ")}\n` +
    `Check your GitHub repository secrets and the env: block in .github/workflows/seed-spots.yml.`
  );
}

try {
  const u = new URL(supabaseUrl);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
} catch {
  throw new Error(
    `The Supabase URL secret is not a valid http(s) URL (it starts with "${supabaseUrl.slice(0, 12)}"). ` +
    `Expected something like https://<project-ref>.supabase.co`
  );
}

if (!apifyToken) {
  throw new Error("Missing required environment variable: APIFY_API_TOKEN.");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const apify = new ApifyClient({ token: apifyToken });

const TABLE = 'unclaimedspots';

type SearchJob = { query: string; neighborhood: string; dateSpots?: boolean };

// Ordered so the smaller categories run first (partial progress is saved after every query)
const MAPS_SEARCH_QUERIES: SearchJob[] = [
  // ---------- TECH AND GAMING ----------
  { query: "gaming lounge arcade PlayStation Westlands Nairobi", neighborhood: "Westlands" },
  { query: "gaming arcade esports Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "gaming arcade VR Karen Nairobi", neighborhood: "Karen" },
  { query: "gaming arcade CBD Nairobi", neighborhood: "Nairobi CBD" },
  { query: "gaming arcade esports Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "gaming arcade Juja Ruiru Thika Road", neighborhood: "Thika Road" },
  { query: "gaming arcade Thika Town", neighborhood: "Thika Town" },
  { query: "gaming arcade South B South C Nairobi", neighborhood: "Mombasa Road" },
  { query: "gaming arcade Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },

  // ---------- ACTION AND SPORTS ----------
  { query: "trampoline park climbing Westlands Nairobi", neighborhood: "Westlands" },
  { query: "go karting paintball adventure Karen Nairobi", neighborhood: "Karen" },
  { query: "bowling skating sports activities Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "sports adventure activities CBD Nairobi", neighborhood: "Nairobi CBD" },
  { query: "go karting trampoline sports Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "sports adventure activities Juja Ruiru Thika Road", neighborhood: "Thika Road" },
  { query: "sports adventure activities Thika Town", neighborhood: "Thika Town" },
  { query: "go karting quad biking sports Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },
  { query: "sports trampoline activities South B South C Nairobi", neighborhood: "Mombasa Road" },

  // ---------- CREATIVE AND LEISURE ----------
  { query: "art gallery creative studio Westlands Nairobi", neighborhood: "Westlands" },
  { query: "pottery painting craft studio Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "art gallery museum cultural centre Karen Nairobi", neighborhood: "Karen" },
  { query: "art gallery museum cultural centre CBD Nairobi", neighborhood: "Nairobi CBD" },
  { query: "cinema bowling leisure Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "art creative leisure Thika Town", neighborhood: "Thika Town" },
  { query: "art creative leisure Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },

  // ---------- DATE SPOTS (romantic places) ----------
  { query: "romantic date spots Westlands Nairobi", neighborhood: "Westlands", dateSpots: true },
  { query: "romantic rooftop dinner Kilimani Nairobi", neighborhood: "Kilimani", dateSpots: true },
  { query: "romantic date spots Karen Nairobi", neighborhood: "Karen", dateSpots: true },
  { query: "romantic rooftop restaurant CBD Nairobi", neighborhood: "Nairobi CBD", dateSpots: true },
  { query: "romantic date spots Roysambu Kasarani Nairobi", neighborhood: "Thika Road", dateSpots: true },
  { query: "romantic date spots Thika Town", neighborhood: "Thika Town", dateSpots: true },
  { query: "romantic date spots Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road", dateSpots: true },

  // ---------- NATURE TRAILS AND OUTDOOR ----------
  { query: "parks nature trails Karen Nairobi", neighborhood: "Karen" },
  { query: "parks gardens nature Westlands Nairobi", neighborhood: "Westlands" },
  { query: "parks nature trails Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "parks gardens outdoor Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "nature outdoor Juja Ruiru Thika Road", neighborhood: "Thika Road" },
  { query: "waterfalls nature parks Thika Town", neighborhood: "Thika Town" },
  { query: "parks nature outdoor Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },

  // ---------- CAFES AND BAKERIES ----------
  { query: "cafes coffee bakery Westlands Nairobi", neighborhood: "Westlands" },
  { query: "cafes coffee bakery Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "cafes coffee bakery Karen Nairobi", neighborhood: "Karen" },
  { query: "cafes coffee bakery CBD Nairobi", neighborhood: "Nairobi CBD" },
  { query: "cafes coffee bakery Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "cafes coffee bakery Thika Town", neighborhood: "Thika Town" },
  { query: "cafes coffee bakery Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },

  // ---------- HOTELS AND LUXURY STAYS ----------
  { query: "luxury hotels boutique stays Westlands Nairobi", neighborhood: "Westlands" },
  { query: "luxury hotels boutique stays Karen Nairobi", neighborhood: "Karen" },
  { query: "hotels apartments stays Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "hotels stays Roysambu Kasarani Juja Thika Road", neighborhood: "Thika Road" },
  { query: "hotels resorts Thika Town", neighborhood: "Thika Town" },
  { query: "hotels resorts Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },

  // ---------- CLUBS / RESTAURANTS (original generic queries; duplicates are skipped) ----------
  { query: "lounges clubs nightlife Westlands Nairobi", neighborhood: "Westlands" },
  { query: "restaurants cafes dining Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "hangouts spaces Karen Nairobi", neighborhood: "Karen" },
  { query: "spots restaurants CBD Nairobi", neighborhood: "Nairobi CBD" },
  { query: "restaurants lounges Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "cafes hangouts Juja Ruiru Thika Road", neighborhood: "Thika Road" },
  { query: "restaurants lounges Thika Town", neighborhood: "Thika Town" },
  { query: "spots restaurants South B South C Mombasa Road", neighborhood: "Mombasa Road" },
  { query: "hangouts Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },
];

// Map Google Maps categories onto RADA's category names
function mapCategory(categories: string[]): string {
  const text = categories.join(" ").toLowerCase();

  if (/\b(night ?club|bar|pub|lounge|cocktail|night life)\b/.test(text)) return "Clubs and lounges";
  if (/(hotel|resort|lodge|villa|guest house|boutique stay|serviced apartment|bed & breakfast)/.test(text)) return "Hotels and luxury stays";
  if (/(cafe|café|coffee|bakery|tea house|dessert|patisserie)/.test(text)) return "Cafes and bakeries";
  if (/(gaming|arcade|video game|esports|internet cafe|computer|playstation|virtual reality|\bvr\b)/.test(text)) return "Tech and gaming";
  if (/(sport|gym|go.?kart|trampoline|climbing|swimming|stadium|golf|fitness|paintball|quad|adventure|racing|bowling|skating|laser|archery|horse|amusement)/.test(text)) return "Action and sports";
  if (/(park|trail|nature|outdoor|hiking|garden|campsite|forest|waterfall|falls)/.test(text)) return "Nature trails and outdoor";
  if (/(art gallery|art studio|museum|cultural|studio|shopping mall|theater|theatre|cinema|lifestyle|pottery|craft|workshop|painting)/.test(text)) return "Creative and leisure";
  return "Restaurants and dining"; // default fallback
}

// Romantic-date queries: relabel food/drink/leisure places as "Date spots"
const DATE_ELIGIBLE = new Set([
  "Restaurants and dining",
  "Clubs and lounges",
  "Cafes and bakeries",
  "Creative and leisure",
]);

async function runMapsScraperAndSeed() {
  console.log(`🗺️ Initializing Apify Google Maps Scraper for RADA (${MAPS_SEARCH_QUERIES.length} queries)...`);

  // 1. Fetch existing spots to prevent duplicates
  const { data: existingSpots, error: fetchError } = await supabase
    .from(TABLE)
    .select('name, address, google_place_id');

  if (fetchError) {
    throw new Error(`Error fetching existing database records: ${fetchError.message}`);
  }

  const existingKeys = new Set<string>();
  for (const s of existingSpots || []) {
    existingKeys.add(`${s.name?.toLowerCase().trim()}_${s.address?.toLowerCase().trim()}`);
    if (s.google_place_id) existingKeys.add(`pid_${s.google_place_id}`);
  }

  let totalInserted = 0;
  let queryNumber = 0;

  for (const { query, neighborhood, dateSpots } of MAPS_SEARCH_QUERIES) {
    queryNumber++;
    console.log(`📍 [${queryNumber}/${MAPS_SEARCH_QUERIES.length}] Querying Google Maps via Apify: "${query}"...`);
    const batch: any[] = [];

    try {
      const run = await apify.actor("compass/crawler-google-places").call({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: 15,
        maxImages: 6,
        language: "en",
        deeperCityScrape: false,
      });

      const { items } = await apify.dataset(run.defaultDatasetId).listItems();

      for (const place of items as any[]) {
        const name = place.title;
        const address = place.address || place.city || "Nairobi, Kenya";
        const imageList: string[] = place.imageUrls || place.images || [];

        // CONSTRAINT CHECK: Must have at least 2 photos
        if (!name || imageList.length < 2) continue;

        // DUPLICATE CHECK
        const nameKey = `${name.toLowerCase().trim()}_${address.toLowerCase().trim()}`;
        const pidKey = place.placeId ? `pid_${place.placeId}` : null;
        if (existingKeys.has(nameKey) || (pidKey && existingKeys.has(pidKey))) {
          console.log(`⚠️ Skipping duplicate spot: ${name} (${address})`);
          continue;
        }

        let category = mapCategory(place.categories || []);
        if (dateSpots && DATE_ELIGIBLE.has(category)) category = "Date spots";

        batch.push({
          name,
          category,
          address,
          latitude: place.location?.lat ?? null,
          longitude: place.location?.lng ?? null,
          thumbnail: place.imageUrl || imageList[0],
          gallery: imageList.slice(0, 4), // up to 4 image URLs (jsonb array)
          phone: place.phone || null,
          website: place.website || null,
          rating: place.totalScore ?? 0,
          reviews_count: place.reviewsCount ?? 0,
          is_claimed: false,
          status: 'unclaimed',
          neighborhood,
          google_place_id: place.placeId || null,
          opening_hours: place.openingHours || [],
        });

        existingKeys.add(nameKey);
        if (pidKey) existingKeys.add(pidKey);
      }
    } catch (err) {
      console.error(`❌ Error executing maps scraping for query "${query}":`, err);
      continue;
    }

    if (batch.length === 0) {
      console.log("ℹ️ No new unique spots for this query.");
      continue;
    }

    // Insert per query so partial progress is saved if a later query hits limits
    console.log(`💾 Inserting ${batch.length} new spots...`);
    const { error: insertError } = await supabase.from(TABLE).insert(batch);

    if (insertError) {
      console.error(`❌ Insert failed for "${query}": ${insertError.message}`);
      process.exitCode = 1;
    } else {
      totalInserted += batch.length;
    }
  }

  console.log(`🎉 Done. Inserted ${totalInserted} new spots into ${TABLE}.`);
}

runMapsScraperAndSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
