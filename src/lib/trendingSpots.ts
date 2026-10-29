// Shared by the Home "Trending Spots" rail and its "View All" page,
// so both always show the exact same spots in the same order.
import { distanceKm } from './geo.ts';
import { resolveSpotBudget } from './spotBudget.ts';

export const TRENDING_MAX = 30;
const NAIROBI_CENTRE = { lat: -1.2864, lng: 36.8172 };

const goodImg = (u: any) =>
  typeof u === 'string' && /^https?:\/\//i.test(u) && !/placehold|unsplash\.com\/photo-1517248135467/i.test(u);

/** Only spots that look good on Home: a real photo, complete info and solid ratings. */
export const isHomeSpot = (sp: any): boolean => {
  if (!goodImg(sp.img)) return false;
  if (!sp.isUnclaimedImport) return true;
  const photos = Array.isArray(sp.images) ? sp.images.filter(goodImg).length : 0;
  const rating = Number(sp.baseRating ?? sp.rating);
  const reviews = Number(sp.reviewsCount ?? sp.reviewCount ?? 0);
  return sp.hasRealPhoto && photos >= 3 && rating >= 4 && reviews >= 20 && !!String(sp.address || '').trim();
};

const tapsOf = (sp: any) =>
  Number(sp.taps ?? sp.tapCount ?? sp.tap_count ?? sp.clicks ?? sp.views ?? sp.viewCount ?? 0) || 0;

const exclusivity = (sp: any) => {
  const rating = Number(sp.baseRating ?? sp.rating) || 0;
  const reviews = Number(sp.reviewsCount ?? sp.reviewCount ?? 0) || 0;
  const budget = resolveSpotBudget(sp);
  const photos = Array.isArray(sp.images) ? sp.images.length : 0;
  return (budget === 'High' ? 4 : budget === 'Mid' ? 1.5 : 0)
    + rating * 1.5
    + Math.log10(reviews + 1)
    + (sp.verified || sp.isVerified ? 1.5 : 0)
    + Math.min(photos, 6) * 0.2;
};

/**
 * Max 30 spots near the user, nearest -> farthest.
 * Picks by taps first; while there are no taps, the most exclusive nearby spots win.
 */
export function pickTrendingSpots<T = any>(
  spots: T[],
  origin?: { lat: number; lng: number } | null,
): T[] {
  const o = origin || NAIROBI_CENTRE;
  const withDist = (spots as any[])
    .filter(isHomeSpot)
    .filter(sp => Number.isFinite(Number(sp.lat)) && Number.isFinite(Number(sp.lng)) && sp.hasCoords !== false)
    .map(sp => ({ sp, d: distanceKm(o, { lat: Number(sp.lat), lng: Number(sp.lng) }), taps: tapsOf(sp), ex: exclusivity(sp) }));

  const pool = withDist.sort((a, b) => a.d - b.d).slice(0, 100);
  const picked = [...pool].sort((a, b) => b.taps - a.taps || b.ex - a.ex).slice(0, TRENDING_MAX);
  return picked.sort((a, b) => a.d - b.d).map(x => x.sp) as T[];
}
