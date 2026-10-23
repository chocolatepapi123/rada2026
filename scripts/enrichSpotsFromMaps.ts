import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import * as dotenv from 'dotenv';

dotenv.config();

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = clean(process.env.VITE_SUPABASE_URL) || clean(process.env.SUPABASE_URL);
const supabaseKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_KEY);
const apifyToken = clean(process.env.APIFY_API_TOKEN);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or service role key (check GitHub secrets and the workflow env: block).");
}
if (!apifyToken) {
  throw new Error("Missing APIFY_API_TOKEN.");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const apify = new ApifyClient({ token: apifyToken });

const TABLE = 'unclaimedspots';
const BATCH_SIZE = 40;

const isWeakAddress = (a?: string | null) =>
  !a ||
  !a.trim() ||
  /^[^,]+,\s*nairobi,\s*kenya$/i.test(a.trim()) || // e.g. "Kasarani, Nairobi, Kenya"
  /^nairobi,\s*kenya$/i.test(a.trim());

const needsEnrichment = (r: any) =>
  isWeakAddress(r.address) ||
  !r.phone ||
  !r.neighborhood ||
  !r.opening_hours ||
  (Array.isArray(r.opening_hours) && r.opening_hours.length === 0);

async function run() {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, name, address, phone, website, neighborhood, opening_hours, google_place_id');

  if (error) throw new Error(`Error reading ${TABLE}: ${error.message}`);

  const targets = (rows || []).filter((r) => r.google_place_id && needsEnrichment(r));
  console.log(`🔎 ${rows?.length ?? 0} spots total, ${targets.length} need enrichment.`);

  let updated = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    console.log(`📍 Fetching Google Maps details for spots ${i + 1}-${i + chunk.length} of ${targets.length}...`);

    let items: any[] = [];
    try {
      const actorRun = await apify.actor("compass/crawler-google-places").call({
        placeIds: chunk.map((r) => r.google_place_id),
        language: "en",
        maxImages: 0, // photos are not touched, saves credit
      });
      ({ items } = (await apify.dataset(actorRun.defaultDatasetId).listItems()) as any);
    } catch (err) {
      console.error("❌ Apify batch failed (credit or limit?). Stopping, progress so far is saved:", err);
      process.exitCode = 1;
      break;
    }

    const byPlaceId = new Map<string, any>();
    for (const p of items) if (p.placeId) byPlaceId.set(p.placeId, p);

    for (const row of chunk) {
      const p = byPlaceId.get(row.google_place_id);
      if (!p) continue;

      const patch: Record<string, any> = {};

      if (p.address) patch.address = p.address;
      if (p.neighborhood && !row.neighborhood) patch.neighborhood = p.neighborhood;
      if (p.phone && !row.phone) patch.phone = p.phone;
      if (p.website && !row.website) patch.website = p.website;
      if (Array.isArray(p.openingHours) && p.openingHours.length > 0) patch.opening_hours = p.openingHours;
      if (typeof p.totalScore === 'number') patch.rating = p.totalScore;
      if (typeof p.reviewsCount === 'number') patch.reviews_count = p.reviewsCount;
      if (p.location?.lat != null && p.location?.lng != null) {
        patch.latitude = p.location.lat;
        patch.longitude = p.location.lng;
      }

      if (Object.keys(patch).length === 0) continue;

      const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', row.id);
      if (upErr) {
        console.error(`❌ Update failed for ${row.name}: ${upErr.message}`);
        process.exitCode = 1;
      } else {
        updated++;
      }
    }
  }

  console.log(`🎉 Done. Updated ${updated} spots in ${TABLE}.`);
}

run().catch((err) => {
  console.error("❌ Enrichment failed:", err);
  process.exit(1);
});
