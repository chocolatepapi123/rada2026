import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.ts';

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

/** Best-effort area name from a Google-style address ("Street, Area, City, Country"). */
export function neighborhoodFromAddress(address?: string | null): string {
  const parts = String(address || '').split(',').map(p => p.trim()).filter(Boolean)
    .filter(p => !/^(nairobi|kenya|\d[\d\s-]*|.*\bcounty\b|\d{5}.*)$/i.test(p));
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Safely parses any openingHours format (string, array of { day, hours }, etc.) into a clean string.
 * Prevents React child render crashes when openingHours is an object or array of objects.
 */
export function formatOpeningHours(rawHours: any): string {
  if (!rawHours) return '';
  if (typeof rawHours === 'string') return rawHours.trim();
  if (Array.isArray(rawHours)) {
    if (rawHours.length === 0) return '';
    // If array of { day, hours } objects from Google Places scraper or database
    if (typeof rawHours[0] === 'object' && rawHours[0] !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      const todayEntry = rawHours.find((h: any) => h && String(h.day).toLowerCase() === today.toLowerCase());
      if (todayEntry && todayEntry.hours) {
        return `Today: ${todayEntry.hours}`;
      }
      const firstValid = rawHours.find((h: any) => h && h.hours);
      if (firstValid && firstValid.hours) {
        return `${firstValid.hours} (Daily)`;
      }
      return '';
    }
    // If array of strings
    if (typeof rawHours[0] === 'string') {
      return rawHours.filter(Boolean).join(' • ');
    }
  }
  if (typeof rawHours === 'object' && rawHours !== null) {
    if (rawHours.hours) return String(rawHours.hours);
  }
  return '';
}

/**
 * Builds spot details ONLY from facts that actually exist on the scraped / imported row
 * (Google category label, opening hours, hotel star class, Wi-Fi / breakfast / accessibility
 * flags, website, rating). Nothing is invented: no made-up dishes, equipment, consoles, prices,
 * schedules, tags or vibes. Fields a merchant fills in after claiming the spot are passed through
 * untouched when present on the row.
 */
const MERCHANT_FIELDS = [
  'equipmentProvided', 'equipmentNeeded', 'whatToBring', 'skillLevel', 'gameConsoles', 'availableGames',
  'craftActivities', 'workshopDetails', 'featuredDishes', 'cuisineTypes', 'workFriendlyTags',
  'atmosphereTags', 'bookingOptions', 'nightlifeOptions', 'bottleServiceOptions', 'roomTypes',
  'amenitiesList', 'weekendGetawayDetails', 'dayPassDetails', 'pricePerHour', 'timeSlots',
  'activitySchedule', 'meetingPoint', 'distanceDuration', 'difficulty',
];
const toSnake = (k: string) => k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);

export function enrichSpotDetails(category: string, title: string = '', raw: any = {}) {
  const c = category.toLowerCase();
  const base: Record<string, any> = {};

  // 1. Anything a merchant/admin really entered on the row.
  for (const k of MERCHANT_FIELDS) {
    const v = raw[k] ?? raw[toSnake(k)];
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) base[k] = v;
  }

  // 2. Real Google category label (e.g. "Hiking area", "Night club", "Bar & grill").
  const label = String(raw.categoryName || raw.category || '').trim();
  const isFood = /restaurants|cafes|date_spots|clubs/.test(c) || ['restaurants', 'cafes', 'nightlife'].includes(c);
  if (label) {
    if (isFood) base.diningTypes = label;
    else base.activityType = label;
  }

  // 3. Real amenity / accessibility flags from the scrape.
  const info = raw.additionalInfo || raw.additional_info || {};
  const truthy = (group: string): string[] =>
    (Array.isArray(info[group]) ? info[group] : [])
      .flatMap((o: any) => Object.entries(o || {}).filter(([, v]) => v === true).map(([k]) => k));
  const amenities = truthy('Amenities');
  const access = truthy('Accessibility');
  if (amenities.length && !base.amenitiesList) base.amenitiesList = amenities;
  if (access.length) base.accessibility = access;
  if (amenities.some(a => /wi-?fi/i.test(a)) && !base.workFriendlyTags && /cafes|restaurants/.test(c)) {
    base.workFriendlyTags = ['Free Wi-Fi'];
  }

  // 4. Hotel class, only when the scrape actually gives a star rating.
  const stars = String(raw.hotelStars || '').match(/^(\d)-star/i);
  if (stars) base.hotelStars = `${stars[1]}-star`;

  // 5. Website and hours, only if real.
  if (raw.website) base.website = raw.website;
  const hours = formatOpeningHours(raw.openingHours || raw.opening_hours);
  if (hours) base.openingHours = hours;

  return base;
}

export function unclaimedRowToSpot(r: any) {
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((g: any) => typeof g === 'string' && g) : [];
  const cover = r.thumbnail || gallery[0] || '';
  const img = cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  const category = mapUnclaimedCategory(r.category, r.name);
  const extraDetails = enrichSpotDetails(category, r.name, r);

  return {
    id: `unclaimed-${r.id}`,
    title: r.name || 'Untitled Spot',
    category,
    subcategory: r.category || undefined,
    neighborhood: neighborhoodFromAddress(r.address),
    address: r.address || '',
    description: r.description || r.category || '',
    lat: r.latitude ?? -1.2921,
    lng: r.longitude ?? 36.8219,
    price: undefined,
    img,
    images: gallery.length ? gallery : [img],
    hasRealPhoto: Boolean(cover),
    phone: r.phone || undefined,
    createdAt: r.created_at || undefined,
    is_claimed: false,
    status: 'approved',
    isUnclaimedImport: true,
    reviews: [],
    ...extraDetails,
  };
}

// ---- Shared, cached loader so Home, Spots and View All all see the SAME full list ----
let cache: any[] | null = null;
let inflight: Promise<any[]> | null = null;
const listeners = new Set<(rows: any[]) => void>();

const PAGE = 1000;
const MAX_ROWS = 10000;

export async function loadUnclaimedSpots(force = false): Promise<any[]> {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows: any[] = [];
    let failed = false;
    try {
      if (supabase && isSupabaseConfigured) {
        // PostgREST caps a single response (usually 1000 rows), so page through the table.
        for (let from = 0; from < MAX_ROWS; from += PAGE) {
          const { data, error } = await supabase
            .from('unclaimedspots')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE - 1);
          if (error) {
            console.warn('unclaimedspots fetch error:', error.message);
            failed = true;
            break;
          }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < PAGE) break;
        }
      }

      // If Supabase returned rows, convert them
      if (rows.length > 0) {
        cache = rows.map(unclaimedRowToSpot);
        listeners.forEach(l => l(cache!));
      } else {
        // Fallback: load scraped places json if available
        try {
          const scrapedMod = await import('../../scraped_places.json');
          const rawPlaces = (scrapedMod.default || scrapedMod) as any[];
          if (Array.isArray(rawPlaces) && rawPlaces.length > 0) {
            cache = rawPlaces.map((p, idx) => {
              const category = mapUnclaimedCategory(p.categoryName || (p.categories && p.categories[0]), p.title);
              const extraDetails = enrichSpotDetails(category, p.title, p);
              const lat = p.location?.lat ?? -1.2921;
              const lng = p.location?.lng ?? 36.8219;
              const address = p.address || 'Nairobi, Kenya';
              const img = p.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
              return {
                id: `unclaimed-scraped-${idx + 1}`,
                title: p.title || 'Untitled Spot',
                category,
                subcategory: p.categoryName || undefined,
                neighborhood: p.neighborhood || neighborhoodFromAddress(address) || 'Nairobi',
                address,
                description: p.description || p.categoryName || '',
                lat,
                lng,
                rating: p.totalScore ? String(p.totalScore) : undefined,
                reviewsCount: p.reviewsCount || undefined,
                img,
                images: [img],
                hasRealPhoto: Boolean(p.imageUrl),
                phone: p.phone || undefined,
                is_claimed: false,
                status: 'approved',
                isUnclaimedImport: true,
                reviews: [],
                ...extraDetails,
              };
            });
            listeners.forEach(l => l(cache!));
          }
        } catch (scrapedErr) {
          console.warn('Fallback scraped places import error:', scrapedErr);
        }
      }
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
