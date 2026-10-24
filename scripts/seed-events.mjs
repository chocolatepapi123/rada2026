// Usage: node scripts/seed-events.mjs [google|facebook|luma|all] [maxItems] [--dry]
// Writes to external_events. Env: APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";

const source = process.argv[2] || "google";
const maxItems = Number(process.argv[3] || 20);
const dry = process.argv.includes("--dry");
const { APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!APIFY_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing APIFY_TOKEN, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Input field names are best guesses and untested. If a run returns 0 items or
// an input error, check the actor's Input tab on Apify and edit here.
const ACTORS = {
  google: {
    id: "johnvc/google-events-api---access-google-events-data",
    input: { query: "events in Nairobi", country: "ke", gl: "ke", hl: "en", language: "en", maxResults: maxItems, maxItems },
    maxCost: 0.5,
  },
  facebook: {
    id: "scrapegeist/facebook-organizer-events-scraper",
    input: { searchQueries: ["Nairobi nightlife", "Nairobi party"], query: "Nairobi", location: "Nairobi, Kenya", maxItems, maxResults: maxItems },
    maxCost: 0.5,
  },
  luma: {
    id: "haketa/luma-event-scraper",
    input: { location: "Nairobi", city: "Nairobi", query: "Nairobi", maxItems, maxResults: maxItems },
    maxCost: 0.5,
  },
};

const pick = (o, keys) => {
  for (const k of keys) {
    const v = k.split(".").reduce((a, p) => (a == null ? a : a[p]), o);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(typeof v === "number" && v < 1e12 ? v * 1000 : v);
  return isNaN(d) ? null : d.toISOString();
};
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const CATS = [
  ["nightlife", /club|party|nightlife|dj|afro ?beat|amapiano|rave|ladies night|rooftop|lounge/i],
  ["concerts", /concert|live music|festival|gig|tour|band|jazz|album/i],
  ["food", /food|brunch|dinner|tasting|wine|beer|bbq|nyama|restaurant|market/i],
  ["sports", /sport|run|marathon|match|football|rugby|golf|fitness|yoga/i],
  ["business", /business|networking|summit|conference|startup|tech|founder|investor/i],
  ["arts", /art|exhibition|theatre|theater|comedy|film|poetry|gallery/i],
  ["education", /workshop|class|training|course|masterclass|seminar/i],
  ["family", /kids|family|children/i],
  ["faith", /church|worship|gospel|prayer/i],
  ["community", /community|meetup|charity|volunteer/i],
];
const guessCat = (t) => CATS.find(([, re]) => re.test(t))?.[0] ?? "community";

function normalize(src, r) {
  const title = pick(r, ["title", "name", "event_name", "event.name"]);
  const startsAt = toDate(pick(r, ["startDate", "start_date", "startsAt", "start_time", "startTime", "start_at", "date.start_date", "event.start_at", "timestamp", "date"]));
  const venue = pick(r, ["venue.name", "venue_name", "venue", "location.name", "place.name", "geo_address.name"]);
  const address = pick(r, ["address", "venue.address", "location.address", "place.address", "geo_address.address", "full_address"]);
  const link = pick(r, ["ticket_info.0.link", "ticketUrl", "ticket_url", "ticketsUrl", "link", "url", "event.url"]);
  if (!title || !startsAt || !link) return null; // source_url is required and unique
  const text = `${title} ${pick(r, ["description"]) || ""}`;
  const dateOnly = !/T\d\d:\d\d/.test(String(pick(r, ["startDate", "start_date", "start_time", "startTime", "start_at"]) || "T00:00"));
  return {
    source: src,
    source_url: String(link),
    title: String(title).slice(0, 300),
    description: pick(r, ["description", "details", "event.description"]),
    start_at: startsAt,
    end_at: toDate(pick(r, ["endDate", "end_date", "endsAt", "end_time", "endTime", "end_at", "event.end_at"])),
    has_time: !dateOnly,
    venue: typeof venue === "string" ? venue : null,
    address: typeof address === "string" ? address : Array.isArray(address) ? address.join(", ") : null,
    host: pick(r, ["organizer.name", "organizerName", "organizer", "host.name", "hosts.0.name"]),
    image_url: pick(r, ["image", "image_url", "imageUrl", "thumbnail", "coverUrl", "cover_url", "event.cover_url"]),
    lat: Number(pick(r, ["lat", "latitude", "coordinates.latitude", "geo_latitude"])) || null,
    lng: Number(pick(r, ["lng", "longitude", "coordinates.longitude", "geo_longitude"])) || null,
    country: "KE",
    rada_category: guessCat(text),
    tags: [],
  };
}

async function runActor(name) {
  const a = ACTORS[name];
  const url = `https://api.apify.com/v2/acts/${a.id.replace("/", "~")}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&maxTotalChargeUsd=${a.maxCost}&timeout=300`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.input) });
  if (!res.ok) throw new Error(`${name}: Apify ${res.status} ${(await res.text()).slice(0, 400)}`);
  const items = await res.json();
  console.log(`${name}: ${items.length} raw items`);
  if (items[0]) console.log(`${name} sample keys:`, Object.keys(items[0]).join(", "));
  return items;
}

async function loadSpots() {
  const { data, error } = await supabase.from("unclaimedspots").select("name, google_place_id").not("google_place_id", "is", null).limit(10000);
  if (error) { console.warn("Spot matching skipped:", error.message); return []; }
  return data.map((s) => ({ id: s.google_place_id, key: norm(s.name) })).filter((s) => s.key.length > 3);
}
const matchSpot = (spots, venue) => {
  const v = norm(venue);
  if (v.length < 4) return null;
  return spots.find((s) => s.key === v || s.key.includes(v) || v.includes(s.key))?.id ?? null;
};

const names = source === "all" ? Object.keys(ACTORS) : [source];
if (names.some((n) => !ACTORS[n])) throw new Error("Source must be google, facebook, luma or all");
const spots = await loadSpots();

for (const name of names) {
  try {
    const raw = await runActor(name);
    const rows = raw.map((r) => normalize(name, r)).filter(Boolean)
      .filter((e) => new Date(e.start_at) > new Date(Date.now() - 864e5))
      .map((e) => ({ ...e, place_id: matchSpot(spots, e.venue), scraped_at: new Date().toISOString() }));
    const matched = rows.filter((r) => r.place_id).length;
    console.log(`${name}: ${rows.length} usable events, ${matched} matched to spots`);
    if (dry) { console.log(JSON.stringify(rows.slice(0, 2), null, 2)); continue; }
    if (!rows.length) continue;
    const { error } = await supabase.from("external_events").upsert(rows, { onConflict: "source_url" });
    if (error) throw error;
    console.log(`${name}: upserted ${rows.length}`);
  } catch (e) {
    console.error(`${name} failed:`, e.message || e);
    process.exitCode = 1;
  }
}
