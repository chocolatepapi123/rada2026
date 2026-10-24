import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.ts';

import {
  SPOT_CATEGORIES, resolveSpotCategory, categoryLabelOf, getSpotCategoryIds,
  parseExtraCategories, isAllKey, spotInCategory,
} from './spotCategories.ts';
import { sortPremium } from './spotRanking.ts';

/** The 17 RADA spot categories (ids). Matching uses `category` AND `extra_categories`. */
export const RADA_CATEGORIES = SPOT_CATEGORIES.map(c => c.id);
export type RadaCategory = string;
export const toCanonicalCategory = resolveSpotCategory;
export { isAllKey, spotInCategory, getSpotCategoryIds, categoryLabelOf };

/**
 * Server-side fetch of one category, including spots that only list it in extra_categories.
 * `label` must be the exact DB string, e.g. 'Hotels & Stays'. Pass any category id/label and it is resolved.
 */
export async function fetchSpotsByCategory(categoryKey: string, table = 'unclaimedspots'): Promise<any[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  const label = categoryLabelOf(categoryKey);
  if (!label) return [];
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .or(`category.eq.${label},extra_categories.cs.{"${label}"}`);
  if (error) { console.warn('fetchSpotsByCategory error:', error.message); return []; }
  // Re-check after mapping so rows the club guard moved elsewhere don't come back from the server query.
  return table === 'unclaimedspots'
    ? (data || []).map(unclaimedRowToSpot).filter(sp => spotInCategory(sp, categoryKey))
    : (data || []);
}

/** Maps a Google-style label from `unclaimedspots.category` to a RADA category. Label first, name only as fallback. */
export function mapUnclaimedCategory(raw?: string | null, name?: string | null): string {
  const c = (raw || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const test = (re: RegExp) => re.test(c);

  // Gaming / cafe labels first so "Gaming lounge" or "Cafe & lounge" never fall into Clubs & Lounges.
  if (test(/game|gaming|arcade|virtual reality|\bvr\b|esports|escape room|snooker|pool hall|billiard/)) return 'tech_gaming';
  if (test(/cafe|café|coffee|bakery|dessert|ice cream|tea house|patisserie|juice/)) return 'cafes_bakeries';
  if (test(/night ?club|disco|casino|karaoke|hookah|shisha|\blounge\b/)) return 'clubs_lounges';
  if (test(/\bbar\b|^bar|\bpub\b|liquor|wine bar|cocktail/)) return 'bars_chill';
  if (test(/resort|campground|camp\b|safari|getaway|vacation|beach|retreat|eco ?lodge|cottage/)) return 'vacation_escapes';
  if (test(/hotel|lodging|guest ?house|accommodation|apartment|villa|hostel|\binn\b|motel|extended stay|serviced/)) return 'hotels_luxury';
  if (test(/restaurant|food|grill|diner|eatery|pizza|burger|steak|barbecue|bbq|nyama|kitchen|bistro|takeaway|meal/)) return 'restaurants_dining';
  if (test(/sport|fitness|gym|kart|bowling|paintball|archery|swimming|golf|stadium|climbing|racing|trampoline/)) return 'action_sports';
  if (test(/art |art$|gallery|museum|pottery|craft|studio|paint|cultural|theatre|theater|cinema|workshop|library/)) return 'creative_leisure';
  if (test(/park|forest|garden|hiking|trail|wildlife|national|woods|nature|tourist|attraction|tour|travel agency|outdoor|cycling|waterfall|nature reserve|sanctuary/)) return 'nature';
  if (test(/rooftop|romantic|wine bar/)) return 'date_spots';

  // Label gave no signal: fall back to the venue name.
  if (/liquor|\bpub\b/.test(n)) return 'bars_chill';
  if (/lounge|nightclub|night club|\bclub\b|\bklub\b/.test(n)) return 'clubs_lounges';
  if (/cafe|café|coffee|bakery/.test(n)) return 'cafes_bakeries';
  if (/hotel|suites|lodge|apartments/.test(n)) return 'hotels_luxury';
  if (/restaurant|grill|kitchen|bistro|eatery|pizza|burger/.test(n)) return 'restaurants_dining';
  return 'activities';
}

/**
 * Strict Clubs & Lounges: keeps nightclubs and nightlife lounges, and moves venues that merely have
 * "lounge" in the name (gaming, cafe, grill/restaurant, hotel, arts) to the category they belong to.
 * A clear club word in the name or Google label ("club", "klub", "nightclub", "disco") always wins.
 * Only acts on the name + the original Google label; anything unclear stays where the DB put it.
 */
const CLUB_WORDS = /night ?club|\bclub\b|\bklub\b|disco|nightlife/i;
const NOT_CLUB_RULES: Array<[RegExp, string]> = [
  [/gaming|arcade|playstation|\bps[45]\b|esports?|\bvr\b|snooker|billiard|pool hall|game (zone|room|hub|station|cent(re|er))/i, 'Gaming & Arcades'],
  [/caf[eé]|coffee|bakery|patisserie/i, 'Cafes & Bakeries'],
  [/hotel|resort|\blodge\b|suites|apartments|guest ?house/i, 'Hotels & Stays'],
  [/restaurant|\bgrill\b|kitchen|eatery|bistro|tapas|diner|steakhouse|nyama/i, 'Restaurants'],
  [/pottery|\bclay\b|gallery|museum|art studio|theat(re|er)/i, 'Arts & Culture'],
  [/chill ?spot|\bpub\b|liquor|sports bar/i, 'Bars & Chill Spots'],
];
export function refineClubCategory(label: string, name?: string | null, googleLabel?: string | null): string {
  if (label !== 'Clubs & Lounges') return label;
  const text = `${name || ''} ${googleLabel || ''}`;
  if (CLUB_WORDS.test(text)) return label;
  for (const [re, target] of NOT_CLUB_RULES) if (re.test(text)) return target;
  return label;
}

/**
 * Strict Outdoors & Nature: parks, forests, waterfalls, trails, gardens-as-nature, wildlife.
 * Hotels, resorts, lodges, villas and retreats belong in Hotels & Stays / Getaways & Resorts, and a
 * Getaways or Hotels venue is never cross-listed under Outdoors & Nature.
 */
const STAY_WORDS = /hotel|suites|apartments|guest ?house|residence/i;
const GETAWAY_WORDS = /resort|\blodge\b|villa|cottage|retreat|getaway|cabins?|glamp|homestay|\bbnb\b/i;
export function refineOutdoorsCategory(label: string, name?: string | null): string {
  if (label !== 'Outdoors & Nature') return label;
  const n = name || '';
  if (STAY_WORDS.test(n)) return 'Hotels & Stays';
  if (GETAWAY_WORDS.test(n)) return 'Getaways & Resorts';
  return label;
}

/** All strict-category guards in one call. */
export function refineCategory(label: string, name?: string | null, googleLabel?: string | null): string {
  return refineOutdoorsCategory(refineClubCategory(label, name, googleLabel), name);
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
  const isFood = /restaurants|cafes|date.spots|clubs|bars|nyama|fast food|desserts|rooftops|garden/.test(c) || ['restaurants', 'cafes', 'nightlife'].includes(c);
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

/** DB category (already one of the 17 labels) -> exact label; legacy/Google labels are inferred. */
function resolveRowCategory(rawCategory?: string | null, name?: string | null): string {
  return (
    categoryLabelOf(rawCategory) ||
    categoryLabelOf(mapUnclaimedCategory(rawCategory, name)) ||
    'Hangouts & Leisure'
  );
}

export function unclaimedRowToSpot(r: any) {
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((g: any) => typeof g === 'string' && g) : [];
  const cover = r.thumbnail || gallery[0] || '';
  const img = cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  const category = refineCategory(resolveRowCategory(r.category, r.name), r.name, r.category);
  const extraCategories = parseExtraCategories(r.extra_categories)
    .map(c => categoryLabelOf(c))
    .map(c => (c ? refineCategory(c, r.name, r.category) : c))
    // Strict Outdoors & Nature: never an extra category on stays/getaways
    .filter(c => !(c === 'Outdoors & Nature' && (category === 'Getaways & Resorts' || category === 'Hotels & Stays')))
    .filter((c): c is string => !!c && c !== category);
  const extraDetails = enrichSpotDetails(category, r.name, r);

  const lat = Number(r.latitude ?? r.lat);
  const lng = Number(r.longitude ?? r.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const ratingNum = Number(r.rating ?? r.total_score ?? r.totalScore ?? r.score);

  return {
    id: `unclaimed-${r.id}`,
    title: r.name || 'Untitled Spot',
    category,
    extra_categories: extraCategories,
    subcategory: r.category || undefined,
    neighborhood: neighborhoodFromAddress(r.address),
    address: r.address || '',
    description: r.description || r.category || '',
    lat: hasCoords ? lat : -1.2921,
    lng: hasCoords ? lng : 36.8219,
    hasCoords,
    rating: isFinite(ratingNum) && ratingNum > 0 ? String(ratingNum) : undefined,
    reviewsCount: Number(r.reviews_count ?? r.reviewsCount ?? 0) || undefined,
    verified: Boolean(r.verified ?? r.is_verified),
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
              const category = refineCategory(
                resolveRowCategory(mapUnclaimedCategory(p.categoryName || (p.categories && p.categories[0]), p.title), p.title),
                p.title,
                p.categoryName,
              );
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

/** Evicts a spot from in-memory unclaimed spots feed and notifies all listeners. */
export function evictUnclaimedSpot(id: string | number, title?: string) {
  const sid = String(id);
  const cleanSid = sid.replace(/^unclaimed-/, '');
  const tLower = title ? title.trim().toLowerCase() : '';

  if (cache) {
    cache = cache.filter(s => {
      const sId = String(s.id);
      const sCleanId = sId.replace(/^unclaimed-/, '');
      if (sId === sid || sCleanId === cleanSid || sCleanId === sid || sId === cleanSid) return false;
      if (tLower && (s.title || '').trim().toLowerCase() === tLower) return false;
      return true;
    });
    listeners.forEach(l => l(cache!));
  }
}

/** Merge merchant/user-created spots with real imported ones, de-duplicated by id and title. */
export function mergeSpots(local: any[], unclaimed: any[]): any[] {
  const ids = new Set(local.map(s => String(s.id)));
  const titles = new Set(local.map(s => (s.title || '').trim().toLowerCase()));
  const extra = unclaimed.filter(u => !ids.has(String(u.id)) && !titles.has((u.title || '').trim().toLowerCase()));
  return [...local, ...extra];
}

/** Trending order: premium first (rating, reviews, real photos, verification). Stable for ties. */
export function sortTrending<T>(list: T[]): T[] {
  return sortPremium(list);
}
