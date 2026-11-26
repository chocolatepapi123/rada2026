// Loads spots from the static R2 file + a small delta from Supabase.
// Returns objects with the SAME field names as the unclaimedspots table
// (id, name, category, extra_categories, neighborhood, latitude, longitude,
//  thumbnail, rating, reviews_count, is_claimed), so existing UI code keeps working.
// Heavy fields (gallery, opening_hours, phone, website, social_links, ...) are NOT included:
// fetch them per spot when the user taps it.
const CDN = "https://pub-5cf88b08d4e7451da444e4a3a9cf2b54.r2.dev"; // change to your custom domain later
const KEY = "spots:v1";

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

const full = (s) => ({
  id: s.id, name: s.n, category: s.c, extra_categories: s.x || [], neighborhood: s.h,
  latitude: s.lat, longitude: s.lng, thumbnail: s.t, rating: s.r, reviews_count: s.rc, is_claimed: s.cl,
});

export async function loadSpots(supabase) {
  let cache = read();

  if (!cache || Date.now() - cache.fetchedAt > 5 * 60_000) {
    try {
      const res = await fetch(`${CDN}/spots.json`);
      if (res.ok) {
        const d = await res.json();
        if (!cache || d.version >= cache.version) {
          cache = { version: d.version, byId: Object.fromEntries(d.spots.map((s) => [s.id, s])), fetchedAt: Date.now() };
        } else cache.fetchedAt = Date.now();
        write(cache);
      }
    } catch { /* offline: use whatever is cached */ }
  }
  if (!cache) throw new Error("spots unavailable");

  try {
    let since = cache.version, more = true;
    while (more) {
      const { data, error } = await supabase.rpc("spots_changed_since", { since });
      if (error || !data?.length) break;
      for (const r of data) {
        cache.byId[r.id] = { id: r.id, n: r.n, c: r.c, x: r.x, h: r.h, lat: r.lat, lng: r.lng, t: r.t, r: r.r, rc: r.rc, cl: r.cl };
        since = Math.max(since, r.v);
      }
      more = data.length === 500;
    }
    cache.version = since;
    write(cache);
  } catch {}

  return Object.values(cache.byId).map(full);
}

// Per-spot details, call when a spot is opened:
export async function loadSpotDetails(supabase, id) {
  const { data } = await supabase
    .from("unclaimedspots")
    .select("gallery,opening_hours,phone,website,social_links,address,equipment_needed,what_to_carry")
    .eq("id", id).single();
  return data;
}
