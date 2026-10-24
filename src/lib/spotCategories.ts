import type { LucideIcon } from 'lucide-react';
import {
  UtensilsCrossed, Hotel, Music, Coffee, Heart, Trees, Dumbbell, Pizza, Palmtree,
  Beer, Palette, Gamepad2, Flower2, Flame, Sunset, Users, Cake,
} from 'lucide-react';

/**
 * Single source of truth for the 17 RADA spot categories.
 * `label` MUST match the exact string stored in Supabase (`category` / `extra_categories`).
 * `color` is the one place to tweak a category's accent (tuned to match each category's name): it flows to pills, cards,
 * detail headers, map markers and filter buttons via getSpotCategoryAccent().
 */
export interface SpotCategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  /** Readable text colour when `color` is used as a solid background. */
  textOn: string;
}

export const SPOT_CATEGORIES: SpotCategoryDef[] = [
  { id: 'restaurants',        label: 'Restaurants',            icon: UtensilsCrossed, color: '#EA6A24', textOn: '#FFFFFF' },
  { id: 'hotels_stays',       label: 'Hotels & Stays',         icon: Hotel,           color: '#B8923A', textOn: '#FFFFFF' },
  { id: 'clubs_lounges',      label: 'Clubs & Lounges',        icon: Music,           color: '#9333EA', textOn: '#FFFFFF' },
  { id: 'cafes_bakeries',     label: 'Cafes & Bakeries',       icon: Coffee,          color: '#8A5A3B', textOn: '#FFFFFF' },
  { id: 'date_spots',         label: 'Date Spots',             icon: Heart,           color: '#E0245E', textOn: '#FFFFFF' },
  { id: 'outdoors_nature',    label: 'Outdoors & Nature',      icon: Trees,           color: '#2E9E5B', textOn: '#FFFFFF' },
  { id: 'sports_adventure',   label: 'Sports & Adventure',     icon: Dumbbell,        color: '#D92D20', textOn: '#FFFFFF' },
  { id: 'fast_food',          label: 'Fast Food',              icon: Pizza,           color: '#E9A800', textOn: '#1A1512' },
  { id: 'getaways_resorts',   label: 'Getaways & Resorts',     icon: Palmtree,        color: '#0891B2', textOn: '#FFFFFF' },
  { id: 'bars_chill',         label: 'Bars & Chill Spots',     icon: Beer,            color: '#1FA5A0', textOn: '#FFFFFF' },
  { id: 'arts_culture',       label: 'Arts & Culture',         icon: Palette,         color: '#D6338A', textOn: '#FFFFFF' },
  { id: 'gaming_arcades',     label: 'Gaming & Arcades',       icon: Gamepad2,        color: '#2563EB', textOn: '#FFFFFF' },
  { id: 'garden_hangouts',    label: 'Garden Hangouts',        icon: Flower2,         color: '#6FA83A', textOn: '#FFFFFF' },
  { id: 'nyama_choma',        label: 'Nyama Choma & Grills',   icon: Flame,           color: '#A8381C', textOn: '#FFFFFF' },
  { id: 'rooftops',           label: 'Rooftops',               icon: Sunset,          color: '#6D7BF2', textOn: '#FFFFFF' },
  { id: 'hangouts_leisure',   label: 'Hangouts & Leisure',     icon: Users,           color: '#D9822B', textOn: '#FFFFFF' },
  { id: 'desserts',           label: 'Desserts & Ice Cream',   icon: Cake,            color: '#EC6FA8', textOn: '#FFFFFF' },
];

export const FALLBACK_CATEGORY: SpotCategoryDef = {
  id: 'other', label: 'Spot', icon: UtensilsCrossed, color: '#E0533C', textOn: '#FFFFFF',
};

const byId = new Map(SPOT_CATEGORIES.map(c => [c.id, c]));

/** "Hotels & Stays" -> "hotelsandstays" ; "hotels_stays" -> "hotelsstays" (aliases below cover both). */
const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const LOOKUP = new Map<string, string>();
const add = (id: string, ...keys: string[]) => keys.forEach(k => LOOKUP.set(norm(k), id));

for (const c of SPOT_CATEGORIES) add(c.id, c.id, c.label);

// Legacy 10-category slugs + friendly aliases -> new categories
add('restaurants', 'restaurants_dining', 'restaurants and dining', 'dining');
add('hotels_stays', 'hotels', 'hotels_luxury', 'luxury', 'stays', 'hotels and stays');
add('clubs_lounges', 'nightlife', 'clubs', 'lounges', 'clubs and lounges');
add('cafes_bakeries', 'cafes', 'bakeries', 'cafes and bakeries');
add('date_spots', 'date', 'dates');
add('outdoors_nature', 'nature', 'outdoors', 'connect_with_nature', 'outdoors and nature');
add('sports_adventure', 'action_sports', 'sports', 'action', 'outdoor_fitness', 'sports and adventure');
add('fast_food', 'fastfood');
add('getaways_resorts', 'vacation_escapes', 'vacation', 'escapes', 'resorts', 'getaways');
add('bars_chill', 'bars', 'bars and chill spots', 'chill spots');
add('arts_culture', 'creative_leisure', 'creative_arts', 'creative', 'arts', 'arts and culture');
add('gaming_arcades', 'tech_gaming', 'gaming', 'arcades', 'arcade', 'tech');
add('garden_hangouts', 'garden', 'gardens');
add('nyama_choma', 'nyama', 'grills', 'nyama choma and grills');
add('rooftops', 'rooftop');
add('hangouts_leisure', 'hangouts', 'leisure', 'social_activities', 'hangouts and leisure');
add('desserts', 'desserts_ice_cream', 'ice cream', 'icecream', 'desserts and ice cream');

/** Resolves a DB label, slug or legacy alias to a category id. */
export function resolveSpotCategory(raw?: string | null): string | null {
  return LOOKUP.get(norm(raw)) ?? null;
}

export function getCategoryDef(raw?: string | null): SpotCategoryDef {
  const id = resolveSpotCategory(raw);
  return (id && byId.get(id)) || FALLBACK_CATEGORY;
}

/** Exact DB label for a category (what to store / query in Supabase), or null if unknown. */
export function categoryLabelOf(raw?: string | null): string | null {
  const id = resolveSpotCategory(raw);
  return id ? byId.get(id)!.label : null;
}

/** Handles real arrays, JSON strings and Postgres array literals like {"A","B"}. */
export function parseExtraCategories(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('[')) { try { return (JSON.parse(t) as any[]).map(String); } catch { /* fall through */ } }
    if (t.startsWith('{')) return t.slice(1, -1).split(',').map(x => x.replace(/^"|"$/g, '').trim()).filter(Boolean);
  }
  return [];
}

/** Every category id a spot belongs to: primary `category` first, then `extra_categories`. */
export function getSpotCategoryIds(spot: any): string[] {
  const ids: string[] = [];
  const push = (raw: unknown) => { const id = resolveSpotCategory(String(raw ?? '')); if (id && !ids.includes(id)) ids.push(id); };
  push(spot?.category);
  parseExtraCategories(spot?.extra_categories ?? spot?.extraCategories).forEach(push);
  return ids;
}

export function isAllKey(key?: string | null): boolean {
  const k = (key || '').toLowerCase().trim();
  return !k || k === 'all' || k === 'spots' || k === 'trending';
}

/** True when the spot's category OR any extra_categories entry matches the requested category. */
export function spotInCategory(spot: any, key?: string | null): boolean {
  if (isAllKey(key)) return true;
  const want = resolveSpotCategory(key);
  if (!want) return false;
  return getSpotCategoryIds(spot).includes(want);
}
