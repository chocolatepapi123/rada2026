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

// Location-based search queries covering your regions, with the neighborhood label to store
const MAPS_SEARCH_QUERIES: { query: string; neighborhood: string }[] = [
  // Nairobi County Hubs
  { query: "lounges clubs nightlife Westlands Nairobi", neighborhood: "Westlands" },
  { query: "restaurants cafes dining Kilimani Nairobi", neighborhood: "Kilimani" },
  { query: "hangouts spaces Karen Nairobi", neighborhood: "Karen" },
  { query: "spots restaurants CBD Nairobi", neighborhood: "Nairobi CBD" },

  // Thika Road Corridor
  { query: "restaurants lounges Roysambu Kasarani Nairobi", neighborhood: "Thika Road" },
  { query: "cafes hangouts Juja Ruiru Thika Road", neighborhood: "Thika Road" },

  // Thika Town
  { query: "restaurants lounges Thika Town", neighborhood: "Thika Town" },

  // Mombasa Road Corridor
  { query: "spots restaurants South B South C Mombasa Road", neighborhood: "Mombasa Road" },
  { query: "hangouts Syokimau Kitengela Mombasa Road", neighborhood: "Mombasa Road" },
];

// Map Google Maps categories onto RADA's category names
function mapCategory(categories: string[]): string {
  const text = categories.join(" ").toLowerCase();

  if (/\b(night ?club|bar|pub|lounge|cocktail|night life)\b/.test(text)) return "Clubs and lounges";
  if (/(hotel|resort|lodge|villa|guest house|boutique stay)/.test(text)) return "Hotels and luxury stays";
  if (/(cafe|café|coffee|bakery|tea house|dessert)/.test(text)) return "Cafes and bakeries";
  if (/(park|trail|nature|outdoor|hiking|garden|campsite|forest)/.test(text)) return "Nature trails and outdoor";
  if (/(gaming|arcade|video game|esports|internet cafe|computer)/.test(text)) return "Tech and gaming";
  if (/(sport|gym|go.?kart|trampoline|climbing|swimming|stadium|golf|fitness)/.test(text)) return "Action and sports";
  if (/(art gallery|museum|cultural|studio|shopping mall|theater|theatre|cinema|lifestyle)/.test(text)) return "Creative and leisure";
  return "Restaurants and dining"; // default fallback
}

async function runMapsScraperAndSeed() {
  console.log("🗺️ Initializing Apify Google Maps Scraper for RADA...");

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

  for (const { query, neighborhood } of MAPS_SEARCH_QUERIES) {
    console.log(`📍 Querying Google Maps via Apify: "${query}"...`);
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

        batch.push({
          name,
          category: mapCategory(place.categories || []),
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

    // Insert per query so partial progress is saved if a later run hits limits
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
