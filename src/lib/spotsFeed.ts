import { useEffect, useState } from 'react';
import { supabase } from './supabase.ts';

/** The 10 RADA spot categories. Category filters match ONLY against these. */
export const RADA_CATEGORIES = [
  'restaurants_dining',
  'nature',
  'creative_leisure',
  'tech_gaming',
  'action_sports',
  'date_spots',
  'clubs_lounges',
  'cafes_bakeries',
  'hotels_luxury',
  'vacation_escapes',
] as const;
export type RadaCategory = (typeof RADA_CATEGORIES)[number];

/** Legacy / alias values -> canonical RADA category. */
const ALIASES: Record<string, RadaCategory> = {
  restaurants: 'restaurants_dining', dining: 'restaurants_dining', restaurants_dining: 'restaurants_dining',
  nature: 'nature', connect_with_nature: 'nature', outdoors: 'nature',
  creative_leisure: 'creative_leisure', creative_arts: 'creative_leisure', creative: 'creative_leisure', social_activities: 'creative_leisure',
  tech_gaming: 'tech_gaming', tech: 'tech_gaming', gaming: 'tech_gaming',
  action_sports: 'action_sports', outdoor_fitness: 'action_sports', sports: 'action_sports', action: 'action_sports',
  date_spots: 'date_spots', date: 'date_spots',
  clubs_lounges: 'clubs_lounges', nightlife: 'clubs_lounges', clubs: 'clubs_lounges', lounges: 'clubs_lounges', bars: 'clubs_lounges',
  cafes_bakeries: 'cafes_bakeries', cafes: 'cafes_bakeries', bakeries: 'cafes_bakeries',
  hotels_luxury: 'hotels_luxury', hotels: 'hotels_luxury', luxury: 'hotels_luxury', stays: 'hotels_luxury',
  vacation_escapes: 'vacation_escapes', vacation: 'vacation_escapes', escapes: 'vacation_escapes',
};

export function toCanonicalCategory(raw?: string | null): RadaCategory | null {
  return ALIASES[(raw || '').toLowerCase().trim()] ?? null;
}

/** True when the key means "no filter / everything" (used by View All for the trending list). */
export function isAllKey(key?: string | null): boolean {
  const k = (key || '').toLowerCase().trim();
  return !k || k === 'all' || k === 'spots' || k === 'trending';
}

/** Strict category match: the spot's own category must resolve to the requested RADA category. */
export function spotInCategory(spot: { category?: string | null }, key?: string | null): boolean {
  if (isAllKey(key)) return true;
  const want = toCanonicalCategory(key);
  if (!want) return false;
  return toCanonicalCategory(spot.category) === want;
}

/** Maps a Google-style label from `unclaimedspots.category` to a RADA category. Label first, name only as fallback. */
export function mapUnclaimedCategory(raw?: string | null, name?: string | null): string {
  const c = (raw || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const test = (re: RegExp) => re.test(c);

  if (test(/night ?club|lounge|\bbar\b|^bar|\bpub\b|liquor|casino|disco|karaoke|hookah|shisha/)) return 'clubs_lounges';
  if (test(/cafe|café|coffee|bakery|dessert|ice cream|tea house|patisserie|juice/)) return 'cafes_bakeries';
  if (test(/resort|campground|camp\b|safari|getaway|vacation|beach|retreat|eco ?lodge|cottage/)) return 'vacation_escapes';
  if (test(/hotel|lodging|guest ?house|accommodation|apartment|villa|hostel|\binn\b|motel|extended stay|serviced/)) return 'hotels_luxury';
  if (test(/restaurant|food|grill|diner|eatery|pizza|burger|steak|barbecue|bbq|nyama|kitchen|bistro|takeaway|meal/)) return 'restaurants_dining';
  if (test(/game|gaming|arcade|virtual reality|\bvr\b|esports|escape room/)) return 'tech_gaming';
  if (test(/sport|fitness|gym|kart|bowling|paintball|archery|swimming|golf|stadium|climbing|racing|trampoline/)) return 'action_sports';
  if (test(/art |art$|gallery|museum|pottery|craft|studio|paint|cultural|theatre|theater|cinema|workshop|library/)) return 'creative_leisure';
  if (test(/park|forest|garden|hiking|trail|wildlife|national|woods|nature|tourist|attraction|tour|travel agency|outdoor|cycling|waterfall|nature reserve|sanctuary/)) return 'nature';
  if (test(/rooftop|romantic|wine bar/)) return 'date_spots';

  // Label gave no signal: fall back to the venue name.
  if (/lounge|liquor|nightclub|night club|\bclub\b|\bpub\b/.test(n)) return 'clubs_lounges';
  if (/cafe|café|coffee|bakery/.test(n)) return 'cafes_bakeries';
  if (/hotel|suites|lodge|apartments/.test(n)) return 'hotels_luxury';
  if (/restaurant|grill|kitchen|bistro|eatery|pizza|burger/.test(n)) return 'restaurants_dining';
  return 'activities';
}

export function unclaimedRowToSpot(r: any) {
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((g: any) => typeof g === 'string' && g) : [];
  const cover = r.thumbnail || gallery[0] || '';
  const img = cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  return {
    id: `unclaimed-${r.id}`,
    title: r.name || 'Untitled Spot',
    category: mapUnclaimedCategory(r.category, r.name),
    subcategory: r.category || undefined,
    neighborhood: 'Nairobi',
    address: r.address || '',
    description: r.description || r.category || '',
    lat: r.latitude ?? -1.2921,
    lng: r.longitude ?? 36.8219,
    price: 'Mid',
    img,
    images: gallery.length ? gallery : [img],
    hasRealPhoto: Boolean(cover),
    phone: r.phone || undefined,
    createdAt: r.created_at || undefined,
    is_claimed: false,
    status: 'approved',
    isUnclaimedImport: true,
    reviews: [],
  };
}

// ---- Shared, cached loader so Home, Spots and View All all see the SAME full list ----
let cache: any[] | null = null;
let inflight: Promise<any[]> | null = null;
const listeners = new Set<(rows: any[]) => void>();

const PAGE = 1000;
const MAX_ROWS = 10000;

export async function loadUnclaimedSpots(force = false): Promise<any[]> {
  if (!supabase) return cache ?? [];
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows: any[] = [];
    try {
      // PostgREST caps a single response (usually 1000 rows), so page through the table.
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const { data, error } = await supabase
          .from('unclaimedspots')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) {
          console.warn('unclaimedspots fetch error:', error.message);
          break;
        }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
      }
      cache = rows.map(unclaimedRowToSpot);
      listeners.forEach(l => l(cache!));
    } finally {
      inflight = null;
    }
    return cache ?? [];
  })();
  return inflight;
}

/** React hook: all real spots from Supabase `unclaimedspots`, already mapped to SpotItem shape. */
export function useUnclaimedSpots(): { spots: any[]; loading: boolean; refresh: () => Promise<void> } {
  const [spots, setSpots] = useState<any[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const l = (rows: any[]) => { setSpots(rows); setLoading(false); };
    listeners.add(l);
    loadUnclaimedSpots().then(rows => { setSpots(rows); setLoading(false); });
    return () => { listeners.delete(l); };
  }, []);

  return { spots, loading, refresh: async () => { await loadUnclaimedSpots(true); } };
}

/** Merge merchant/user-created spots with real imported ones, de-duplicated by id and title. */
export function mergeSpots(local: any[], unclaimed: any[]): any[] {
  const ids = new Set(local.map(s => String(s.id)));
  const titles = new Set(local.map(s => (s.title || '').trim().toLowerCase()));
  const extra = unclaimed.filter(u => !ids.has(String(u.id)) && !titles.has((u.title || '').trim().toLowerCase()));
  return [...local, ...extra];
}

/** Trending order: spots with real photos first, newest first within each group. */
export function sortTrending<T extends { hasRealPhoto?: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(Boolean(b.hasRealPhoto)) - Number(Boolean(a.hasRealPhoto)));
}
