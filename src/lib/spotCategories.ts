import type { LucideIcon } from 'lucide-react';
import {
  UtensilsCrossed, Hotel, Music, Coffee, Heart, Trees, Dumbbell, Pizza, Palmtree,
  Beer, Palette, Gamepad2, Flower2, Flame, Sunset, Users, Cake,
} from 'lucide-react';

/**
 * Single source of truth for the 17 RADA spot categories.
 * `label` MUST match the exact string stored in Supabase (`category` / `extra_categories`).
 * `color` is the one place to tweak a category's accent: it flows to pills, cards,
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
  { id: 'restaurants',        label: 'Restaurants',            icon: UtensilsCrossed, color: '#E0533C', textOn: '#FFFFFF' },
  { id: 'hotels_stays',       label: 'Hotels & Stays',         icon: Hotel,           color: '#1D4ED8', textOn: '#FFFFFF' },
  { id: 'clubs_lounges',      label: 'Clubs & Lounges',        icon: Music,           color: '#A855F7', textOn: '#FFFFFF' },
  { id: 'cafes_bakeries',     label: 'Cafes & Bakeries',       icon: Coffee,          color: '#8B5E3C', textOn: '#FFFFFF' },
  { id: 'date_spots',         label: 'Date Spots',             icon: Heart,           color: '#E11D48', textOn: '#FFFFFF' },
  { id: 'outdoors_nature',    label: 'Outdoors & Nature',      icon: Trees,           color: '#15803D', textOn: '#FFFFFF' },
  { id: 'sports_adventure',   label: 'Sports & Adventure',     icon: Dumbbell,        color: '#F97316', textOn: '#FFFFFF' },
  { id: 'fast_food',          label: 'Fast Food',              icon: Pizza,           color: '#EAB308', textOn: '#1F1300' },
  { id: 'getaways_resorts',   label: 'Getaways & Resorts',     icon: Palmtree,        color: '#14B8A6', textOn: '#04201C' },
  { id: 'bars_chill',         label: 'Bars & Chill Spots',     icon: Beer,            color: '#6366F1', textOn: '#FFFFFF' },
  { id: 'arts_culture',       label: 'Arts & Culture',         icon: Palette,         color: '#D946EF', textOn: '#FFFFFF' },
  { id: 'gaming_arcades',     label: 'Gaming & Arcades',       icon: Gamepad2,        color: '#06B6D4', textOn: '#032126' },
  { id: 'garden_hangouts',    label: 'Garden Hangouts',        icon: Flower2,         color: '#84CC16', textOn: '#142003' },
  { id: 'nyama_choma',        label: 'Nyama Choma & Grills',   icon: Flame,           color: '#B91C1C', textOn: '#FFFFFF' },
  { id: 'rooftops',           label: 'Rooftops',               icon: Sunset,          color: '#0EA5E9', textOn: '#021A26' },
  { id: 'hangouts_leisure',   label: 'Hangouts & Leisure',     icon: Users,           color: '#F59E0B', textOn: '#1F1300' },
  { id: 'desserts',           label: 'Desserts & Ice Cream',   icon: Cake,            color: '#F472B6', textOn: '#2A0617' },
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
