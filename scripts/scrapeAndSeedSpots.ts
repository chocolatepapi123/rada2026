import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const apifyToken = process.env.APIFY_API_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("Supabase URL (set VITE_SUPABASE_URL or SUPABASE_URL)");
  if (!supabaseKey) missing.push("Supabase service role key (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY)");
  throw new Error(
    `Missing required environment variables:\n - ${missing.join("\n - ")}\n` +
    `Check your GitHub repository secrets (Settings > Secrets and variables > Actions) ` +
    `and the env: block in .github/workflows/seed-spots.yml.`
  );
}

if (!apifyToken) {
  throw new Error("Missing required environment variable: APIFY_API_TOKEN (add it as a GitHub secret and export it in the workflow env: block).");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const apify = new ApifyClient({ token: apifyToken });

// Precise location-based search queries covering your exact regions
const MAPS_SEARCH_QUERIES = [
  // Nairobi County Hubs
  "lounges clubs nightlife Westlands Nairobi",
  "restaurants cafes dining Kilimani Nairobi",
  "hangouts spaces Karen Nairobi",
  "spots restaurants CBD Nairobi",

  // Thika Road Corridor
  "restaurants lounges Roysambu Kasarani Nairobi",
  "cafes hangouts Juja Ruiru Thika Road",

  // Thika Town
  "restaurants lounges Thika Town",

  // Mombasa Road Corridor
  "spots restaurants South B South C Mombasa Road",
  "hangouts Syokimau Kitengela Mombasa Road"
];

async function runMapsScraperAndSeed() {
  console.log("🗺️ Initializing Apify Google Maps Scraper for RADA...");

  // 1. Fetch existing spots from Supabase to completely prevent duplicates
  const { data: existingSpots, error: fetchError } = await supabase
    .from('spots')
    .select('title, location');

  if (fetchError) {
    throw new Error(`Error fetching existing database records: ${fetchError.message}`);
  }

  const existingSet = new Set(
    (existingSpots || []).map(s => `${s.title?.toLowerCase().trim()}_${s.location?.toLowerCase().trim()}`)
  );

  const newSpotsBatch: any[] = [];

  for (const query of MAPS_SEARCH_QUERIES) {
    console.log(`📍 Querying Google Maps via Apify: "${query}"...`);

    try {
      // Calling the official Apify Google Maps Scraper Actor
      const run = await apify.actor("compass/crawler-google-places").call({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: 15,
        language: "en",
        deeperCityScrape: false,
      });

      const { items } = await apify.dataset(run.defaultDatasetId).listItems();

      for (const place of items as any[]) {
        const title = place.title;
        const address = place.address || place.city || "Nairobi, Kenya";
        const imageList = place.imageUrls || place.images || [];

        // CONSTRAINT CHECK: Must have at least 2 photos (skipping low-media listings)
        if (!title || imageList.length < 2) continue;

        // DUPLICATE CHECK: Verify against existing Supabase database entries
        const duplicateKey = `${title.toLowerCase().trim()}_${address.toLowerCase().trim()}`;
        if (existingSet.has(duplicateKey)) {
          console.log(`⚠️ Skipping duplicate spot: ${title} (${address})`);
          continue;
        }

        // AUTO-ARRANGE CATEGORY mapping based on Google Maps types/categories
        let category = "dining"; // default fallback
        const categoriesText = (place.categories || []).join(" ").toLowerCase();

        if (
          categoriesText.includes("night club") ||
          categoriesText.includes("bar") ||
          categoriesText.includes("pub") ||
          categoriesText.includes("lounge") ||
          categoriesText.includes("night life")
        ) {
          category = "nightlife";
        } else if (
          categoriesText.includes("park") ||
          categoriesText.includes("outdoors") ||
          categoriesText.includes("nature preserve") ||
          categoriesText.includes("resort") ||
          categoriesText.includes("hiking")
        ) {
          category = "outdoors";
        } else if (
          categoriesText.includes("shopping mall") ||
          categoriesText.includes("art gallery") ||
          categoriesText.includes("cultural center") ||
          categoriesText.includes("lifestyle")
        ) {
          category = "lifestyle_hangouts";
        }

        const spotObject = {
          title: title,
          description: place.description || `${title} is a premier destination located in ${address}. Offering a phenomenal local vibe, great ambiance, and excellent service.`,
          category: category,
          location: address,
          price_range: place.price || "$$",
          photos: imageList.slice(0, 4), // Secure up to 4 high-res image URLs
          amenities: place.amenities || ["Outdoor Seating", "Secure Parking", "WiFi"],
          instagram_handle: place.website && place.website.includes("instagram.com") ? place.website : null
        };

        newSpotsBatch.push(spotObject);
        existingSet.add(duplicateKey); // Add to local set to prevent batch duplication
      }
    } catch (err) {
      console.error(`❌ Error executing maps scraping for query "${query}":`, err);
    }
  }

  if (newSpotsBatch.length === 0) {
    console.log("ℹ️ No new unique map spots found to insert.");
    return;
  }

  console.log(`💾 Inserting ${newSpotsBatch.length} verified unique locations into Supabase...`);

  const { error: insertError } = await supabase
    .from('spots')
    .insert(newSpotsBatch);

  if (insertError) {
    throw new Error(`Supabase bulk insert failed: ${insertError.message}`);
  }

  console.log("🎉 Successfully populated RADA with fresh Maps data across Nairobi, Thika Rd, Thika, and Mombasa Rd!");
}

runMapsScraperAndSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
