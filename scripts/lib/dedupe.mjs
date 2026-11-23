// Duplicate guard on top of the google_place_id check. Catches the same business listed twice
// under different place IDs (renamed, moved pin, duplicate Google listing) by name + distance.
const STOP = new Set(['the', 'and', 'restaurant', 'restaurants', 'cafe', 'coffee', 'bar', 'grill', 'kitchen', 'hotel', 'lounge', 'club', 'bistro', 'eatery', 'ltd', 'limited', 'nairobi', 'kenya']);
const CELL = 0.003; // ~330 m grid cells
const FUZZY_M = 150;  // similar names closer than this are the same place
const EXACT_M = 250;  // identical names closer than this are the same place

export function nameTokens(name) {
  const all = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const kept = all.filter((t) => !STOP.has(t));
  return new Set(kept.length ? kept : all);
}

function similar(a, b) {
  if (!a.size || !b.size) return { same: false, exact: false };
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = a.size + b.size - inter;
  const exact = inter === a.size && inter === b.size;
  if (exact) return { same: true, exact: true };
  const smaller = a.size <= b.size ? a : b;
  const larger = smaller === a ? b : a;
  const subset = [...smaller].every((t) => larger.has(t)) && larger.size <= smaller.size + 2;
  return { same: inter / union >= 0.6 || subset, exact: false };
}

function metres(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function createDedupe(sb) {
  const grid = new Map();
  const cell = (lat, lng) => `${Math.floor(lat / CELL)},${Math.floor(lng / CELL)}`;
  const add = ({ name, lat, lng }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const k = cell(lat, lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push({ tokens: nameTokens(name), lat, lng });
  };
  return {
    add,
    size: () => [...grid.values()].reduce((n, a) => n + a.length, 0),
    // Loads every spot already in the database (name + location only).
    async load() {
      for (let from = 0; ; from += 1000) {
        const r = await sb('unclaimedspots?select=name,latitude,longitude&order=id', { headers: { Range: `${from}-${from + 999}` } });
        if (!r.ok) throw new Error('Supabase dedupe load failed: ' + (await r.text()));
        const rows = await r.json();
        rows.forEach((x) => add({ name: x.name, lat: x.latitude, lng: x.longitude }));
        if (rows.length < 1000) break;
      }
    },
    isDuplicate({ title, name, lat, lng }) {
      const tokens = nameTokens(title ?? name);
      const la = Math.floor(lat / CELL), ln = Math.floor(lng / CELL);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        for (const s of grid.get(`${la + i},${ln + j}`) || []) {
          const { same, exact } = similar(tokens, s.tokens);
          if (!same) continue;
          const d = metres(lat, lng, s.lat, s.lng);
          if (d <= (exact ? EXACT_M : FUZZY_M)) return true;
        }
      }
      return false;
    },
  };
}
