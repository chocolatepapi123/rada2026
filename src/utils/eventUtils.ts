// RADA – helpers for live events coming from public.external_events.
// Everything here is pure (no React, no Supabase) so it can be used by any component.
import type { EventItem, TicketTier } from '../types.ts';

export const EVENT_TZ = 'Africa/Nairobi';

/* ------------------------------------------------------------------ */
/* Row -> EventItem                                                    */
/* ------------------------------------------------------------------ */

export interface ExternalEventRow {
  id: string;
  source: string;
  source_url: string;
  title: string;
  category: string | null;
  rada_category: string | null;
  start_at: string;
  end_at: string | null;
  has_time: boolean | null;
  venue: string | null;
  host: string | null;
  image_url: string | null;
  price_min: number | string | null;
  currency: string | null;
  country: string | null;
  tiers: any;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  gallery: string[] | null;
  tags: string[] | null;
  place_id: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  mookh: 'Mookh',
  ticketsasa: 'Ticketsasa',
  tikiti: 'Tikiti'
};

export function getSourceLabel(source?: string | null): string {
  if (!source) return '';
  return SOURCE_LABELS[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1);
}

const dtf = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

function nairobiParts(d: Date) {
  const out: Record<string, string> = {};
  for (const p of dtf.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** "Sat, 24 Oct 2026" – the same format the calendar utils already understand. */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = nairobiParts(d);
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "09:00 PM" (Nairobi time). */
export function formatEventClock(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = nairobiParts(d);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

function formatMoney(value: number, currency: string): string {
  if (value === 0) return 'Free';
  return `${currency} ${Math.round(value).toLocaleString('en-US')}`;
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function mapTiers(raw: any, fallbackCurrency: string): TicketTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(t => t && typeof t.name === 'string')
    .map(t => {
      const currency = (t.currency || fallbackCurrency || 'KES') as string;
      const value = typeof t.price === 'number' ? t.price : t.price != null && t.price !== '' ? Number(t.price) : null;
      const priceValue = value != null && !isNaN(value) ? value : null;
      const status = typeof t.status === 'string' ? t.status.toLowerCase() : 'available';
      const perks: string[] = [];
      if (status === 'upcoming') perks.push('Opens soon');
      else if (status !== 'available') perks.push(titleCase(status));
      if (typeof t.left === 'number') perks.push(`${t.left} left`);
      if (t.note) perks.push(String(t.note));
      return {
        name: t.name as string,
        price: priceValue == null ? 'See site' : formatMoney(priceValue, currency),
        perks: perks.length ? perks.join(' · ') : undefined,
        priceValue,
        currency,
        status
      } as TicketTier;
    });
}

/** Maps the scraped category onto the legacy EventItem category union used by older components. */
const TECH_RE = /\b(tech|gaming|game|gamer|esports?|hackathon|developer|startup|ai|coding|code|robotics|fintech|blockchain|web3)\b/i;

function legacyCategory(radaCategory: string | null, title: string): EventItem['category'] {
  switch ((radaCategory || '').toLowerCase()) {
    case 'nightlife': return 'nightlife';
    case 'concerts': return 'concerts';
    case 'sports': return 'sports';
    case 'cinemas': return 'cinemas';
    case 'business':
    case 'online': return 'tech';
    default:
      return TECH_RE.test(title) ? 'tech' : 'art';
  }
}

/** Accepts "2026-10-30 18:00:00+00" (raw Postgres) as well as proper ISO strings. */
function normalizeIso(v: string | null): string | null {
  if (!v) return null;
  let out = v.trim().replace(' ', 'T');
  if (/[+-]\d\d$/.test(out)) out += ':00';
  return out;
}

export function mapExternalRow(row: ExternalEventRow): EventItem {
  const currency = row.currency || 'KES';
  const startIso = normalizeIso(row.start_at) as string;
  const hasTime = row.has_time !== false;
  const endIso = normalizeIso(row.end_at);

  let time: string | undefined;
  if (hasTime) {
    time = formatEventClock(startIso);
    if (endIso && formatEventDate(endIso) === formatEventDate(startIso)) {
      time = `${time} - ${formatEventClock(endIso)}`;
    }
  }

  const gallery = Array.isArray(row.gallery) ? row.gallery.filter(Boolean) : [];
  const images = Array.from(new Set([row.image_url, ...gallery].filter(Boolean) as string[]));
  const hasCoords = typeof row.lat === 'number' && typeof row.lng === 'number';
  const priceMin = row.price_min == null ? null : Number(row.price_min);

  return {
    id: row.id,
    title: row.title,
    category: legacyCategory(row.rada_category, row.title),
    genre: row.category || undefined,
    date: formatEventDate(startIso),
    time,
    location: row.venue || row.address || 'Venue on ticket page',
    lat: hasCoords ? (row.lat as number) : Number.NaN,
    lng: hasCoords ? (row.lng as number) : Number.NaN,
    img: row.image_url || images[0] || '',
    images: images.length ? images : undefined,
    goingCount: 0,
    url: row.source_url,
    artists: [],
    tiers: mapTiers(row.tiers, currency),
    description: row.description || undefined,
    startAt: startIso,
    endAt: endIso || undefined,
    source: row.source,
    host: row.host || undefined,
    address: row.address || undefined,
    currency,
    country: row.country || undefined,
    radaCategory: row.rada_category || undefined,
    placeId: row.place_id || undefined,
    priceMin: priceMin != null && !isNaN(priceMin) ? priceMin : null,
    tags: Array.isArray(row.tags) ? row.tags : []
  };
}

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

/** Cheapest known, still-purchasable price for an event (null = unknown). */
export function getEventMinPrice(e: EventItem): number | null {
  const prices = (e.tiers || [])
    .filter(t => t.status !== 'sold_out' && t.status !== 'soldout' && typeof t.priceValue === 'number')
    .map(t => t.priceValue as number);
  if (prices.length) return Math.min(...prices);
  if (typeof e.priceMin === 'number') return e.priceMin;
  return null;
}

/** Label for badges: "Free", "From KES 500", "KES 500" or "See ticket page". */
export function getEventPriceLabel(e: EventItem): string {
  const min = getEventMinPrice(e);
  const currency = e.currency || 'KES';
  if (min == null) {
    // legacy / merchant-created events keep their own string prices
    if (e.tiers && e.tiers.length > 0 && e.tiers[0].price) {
      return e.tiers.length > 1 ? `From ${e.tiers[0].price}` : e.tiers[0].price;
    }
    return 'See ticket page';
  }
  if (min === 0) return 'Free';
  const priced = (e.tiers || []).filter(t => typeof t.priceValue === 'number');
  const distinct = new Set(priced.map(t => t.priceValue)).size;
  return distinct > 1 ? `From ${formatMoney(min, currency)}` : formatMoney(min, currency);
}

export type EventPriceFilter = 'all' | 'free' | 'under1k' | '1k-3k' | '3k+';

export const EVENT_PRICE_FILTERS: { id: EventPriceFilter; label: string }[] = [
  { id: 'all', label: 'Any price' },
  { id: 'free', label: 'Free' },
  { id: 'under1k', label: 'Under 1,000' },
  { id: '1k-3k', label: '1,000 – 3,000' },
  { id: '3k+', label: '3,000+' }
];

export function matchesPriceFilter(e: EventItem, f: string): boolean {
  if (f === 'all') return true;
  const min = getEventMinPrice(e);
  if (min == null) return false;
  if (f === 'free') return min === 0;
  // numeric buckets are KES; other currencies are never forced into them
  if ((e.currency || 'KES') !== 'KES') return false;
  if (f === 'under1k') return min > 0 && min < 1000;
  if (f === '1k-3k') return min >= 1000 && min <= 3000;
  if (f === '3k+') return min > 3000;
  return true;
}

/* ------------------------------------------------------------------ */
/* Dates (all calculated in Nairobi time)                              */
/* ------------------------------------------------------------------ */

const dayFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Whole-day number (days since epoch) for the Nairobi calendar date of `d`. */
export function nairobiDayNumber(d: Date): number {
  const p: Record<string, string> = {};
  for (const x of dayFmt.formatToParts(d)) p[x.type] = x.value;
  return Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86400000);
}

function nairobiWeekday(d: Date): number {
  const w = dayFmt.formatToParts(d).find(x => x.type === 'weekday')?.value || 'Sun';
  return Math.max(0, WEEKDAYS.indexOf(w));
}

export type EventDateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';

export const EVENT_DATE_FILTERS: { id: EventDateFilter; label: string }[] = [
  { id: 'all', label: 'Any date' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'Next 7 days' },
  { id: 'month', label: 'This month' }
];

function dateRange(filter: string, now: Date): [number, number] | null {
  const today = nairobiDayNumber(now);
  const wd = nairobiWeekday(now);
  switch (filter) {
    case 'today': return [today, today];
    case 'tomorrow': return [today + 1, today + 1];
    case 'week': return [today, today + 6];
    case 'weekend': {
      if (wd === 0) return [today - 1, today];
      if (wd === 6) return [today, today + 1];
      const sat = today + (6 - wd);
      return [sat, sat + 1];
    }
    case 'month': {
      const p: Record<string, string> = {};
      for (const x of dayFmt.formatToParts(now)) p[x.type] = x.value;
      const y = Number(p.year), m = Number(p.month);
      const last = Math.floor(Date.UTC(y, m, 0) / 86400000);
      return [today, last];
    }
    default: return null;
  }
}

function eventDayBounds(e: EventItem): [number, number] | null {
  if (!e.startAt) return null;
  const s = new Date(e.startAt);
  if (isNaN(s.getTime())) return null;
  const first = nairobiDayNumber(s);
  let last = first;
  if (e.endAt) {
    const en = new Date(e.endAt);
    if (!isNaN(en.getTime())) last = Math.max(first, nairobiDayNumber(en));
  }
  return [first, last];
}

export function matchesDateFilter(e: EventItem, filter: string, now: Date = new Date()): boolean {
  if (filter === 'all') return true;
  const range = dateRange(filter, now);
  const bounds = eventDayBounds(e);
  if (!range || !bounds) return false;
  return bounds[0] <= range[1] && bounds[1] >= range[0];
}

export function isHappeningToday(e: EventItem, now: Date = new Date()): boolean {
  return matchesDateFilter(e, 'today', now);
}

/** True while the event is still upcoming or in progress. */
export function isUpcoming(e: EventItem, now: Date = new Date()): boolean {
  if (!e.startAt) return true;
  const end = e.endAt ? new Date(e.endAt).getTime() : new Date(e.startAt).getTime() + 6 * 3600 * 1000;
  return end >= now.getTime();
}

export function compareByStart(a: EventItem, b: EventItem): number {
  const ta = a.startAt ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
  const tb = b.startAt ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;
  return ta - tb;
}

/* ------------------------------------------------------------------ */
/* Categories + search                                                 */
/* ------------------------------------------------------------------ */

export type EventCategoryFilter =
  | 'all' | 'nightlife' | 'music' | 'arts' | 'food' | 'sports' | 'tech' | 'community' | 'learn' | 'cinema';

export const EVENT_CATEGORY_FILTERS: { id: EventCategoryFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'nightlife', label: 'Parties & Nightlife', emoji: '🪩' },
  { id: 'music', label: 'Live Music', emoji: '🎤' },
  { id: 'arts', label: 'Arts & Culture', emoji: '🎨' },
  { id: 'food', label: 'Food & Drink', emoji: '🍽️' },
  { id: 'sports', label: 'Sports & Fitness', emoji: '⚽' },
  { id: 'tech', label: 'Tech & Business', emoji: '💼' },
  { id: 'community', label: 'Community & Family', emoji: '🤝' },
  { id: 'learn', label: 'Workshops & Learning', emoji: '📚' },
  { id: 'cinema', label: 'Cinema', emoji: '🎬' }
];

export function eventMatchesCategory(e: EventItem, f: string): boolean {
  if (f === 'all') return true;
  const rc = (e.radaCategory || '').toLowerCase();
  if (!rc) {
    // merchant-created events only have the legacy category
    switch (f) {
      case 'nightlife': return e.category === 'nightlife';
      case 'music': return e.category === 'concerts';
      case 'arts': return e.category === 'art';
      case 'sports': return e.category === 'sports';
      case 'tech': return e.category === 'tech';
      case 'cinema': return e.category === 'cinemas';
      default: return false;
    }
  }
  const isTech = TECH_RE.test(e.title);
  switch (f) {
    case 'nightlife': return rc === 'nightlife';
    case 'music': return rc === 'concerts';
    case 'arts': return rc === 'arts' || rc === 'fashion';
    case 'food': return rc === 'food';
    case 'sports': return rc === 'sports';
    case 'tech': return rc === 'business' || rc === 'online' || (isTech && rc !== 'nightlife' && rc !== 'concerts');
    case 'community': return ['community', 'faith', 'family', 'charity', 'outdoors'].includes(rc);
    case 'learn': return rc === 'education';
    case 'cinema': return rc === 'cinemas';
    default: return true;
  }
}

export function eventMatchesSearch(e: EventItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    e.title, e.location, e.address, e.host, e.genre, e.description, e.date,
    ...(e.tags || []),
    ...(e.tiers || []).map(t => t.name),
    ...(e.artists || []).map(a => a.name)
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every(word => hay.includes(word));
}

export interface EventFilterState {
  query: string;
  category: string;
  price: string;
  date: string;
}

export function filterEvents(events: EventItem[], f: EventFilterState, now: Date = new Date()): EventItem[] {
  return events.filter(e =>
    isUpcoming(e, now) &&
    eventMatchesCategory(e, f.category) &&
    matchesPriceFilter(e, f.price) &&
    matchesDateFilter(e, f.date, now) &&
    eventMatchesSearch(e, f.query)
  );
}

export type EventSort = 'date' | 'price';

export function sortEvents(events: EventItem[], by: EventSort): EventItem[] {
  const copy = [...events];
  if (by === 'price') {
    return copy.sort((a, b) => {
      const pa = getEventMinPrice(a), pb = getEventMinPrice(b);
      if (pa == null && pb == null) return compareByStart(a, b);
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pa - pb || compareByStart(a, b);
    });
  }
  return copy.sort(compareByStart);
}

/* ------------------------------------------------------------------ */
/* Map / venue helpers (rows have no lat/lng yet → geocode on demand)  */
/* ------------------------------------------------------------------ */

export function hasEventCoords(e: Pick<EventItem, 'lat' | 'lng'>): boolean {
  return Number.isFinite(e.lat) && Number.isFinite(e.lng);
}

export function eventVenueQuery(e: EventItem): string {
  const base = e.address || e.location;
  return /kenya|uganda|tanzania|rwanda/i.test(base) ? base : `${base}, Nairobi, Kenya`;
}

export function eventGoogleMapsUrl(e: EventItem): string {
  const q = encodeURIComponent(eventVenueQuery(e));
  return `https://www.google.com/maps/search/?api=1&query=${q}${e.placeId ? `&query_place_id=${encodeURIComponent(e.placeId)}` : ''}`;
}

const GEO_CACHE_KEY = 'rada_geocode_cache_v1';

function readGeoCache(): Record<string, { lat: number; lng: number } | null> {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}') || {}; } catch { return {}; }
}

/** Resolves coordinates: stored lat/lng first, then a cached/OpenStreetMap lookup of the venue. */
export async function resolveEventCoords(e: EventItem): Promise<{ lat: number; lng: number } | null> {
  if (hasEventCoords(e)) return { lat: e.lat, lng: e.lng };
  const query = eventVenueQuery(e);
  const cache = readGeoCache();
  if (query in cache) return cache[query];
  const tryQuery = async (q: string) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('geocode failed');
    const json = await res.json();
    if (Array.isArray(json) && json[0]) return { lat: Number(json[0].lat), lng: Number(json[0].lon) };
    return null;
  };
  try {
    let hit = await tryQuery(query);
    if (!hit && e.location && e.location !== e.address) {
      hit = await tryQuery(/kenya/i.test(e.location) ? e.location : `${e.location}, Nairobi, Kenya`);
    }
    cache[query] = hit;
    try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch { /* storage full */ }
    return hit;
  } catch {
    return null; // network error – do not cache so we retry next time
  }
}

/* ------------------------------------------------------------------ */
/* Calendar helpers (real "today", per-day matching)                   */
/* ------------------------------------------------------------------ */

/** Today's Nairobi calendar date: month is 0-based like Date. */
export function getTodayParts(now: Date = new Date()): { year: number; month: number; day: number } {
  const p: Record<string, string> = {};
  for (const x of dayFmt.formatToParts(now)) p[x.type] = x.value;
  return { year: Number(p.year), month: Number(p.month) - 1, day: Number(p.day) };
}

export function isRealToday(year: number, month0: number, day: number, now: Date = new Date()): boolean {
  const t = getTodayParts(now);
  return t.year === year && t.month === month0 && t.day === day;
}

/**
 * Does a live event fall on this calendar day (multi-day events count on every day)?
 * Returns null when the event has no startAt (merchant-created events) so callers can fall back to string matching.
 */
export function eventOccursOnDay(e: EventItem, year: number, month0: number, day: number): boolean | null {
  const bounds = eventDayBounds(e);
  if (!bounds) return null;
  const target = Math.floor(Date.UTC(year, month0, day) / 86400000);
  return bounds[0] <= target && target <= bounds[1];
}
