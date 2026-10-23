import { useEffect, useState } from 'react';

export interface LatLng { lat: number; lng: number }

/** Nairobi CBD, used when the person is outside Nairobi so "Near You" still works. */
export const NAIROBI_CBD: LatLng = { lat: -1.2864, lng: 36.8172 };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km?: number | null): string {
  if (km == null || !isFinite(km)) return '';
  return km < 1 ? `${Math.max(50, Math.round(km * 10) * 100)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Real coordinates only: the feed fills missing ones with a city-centre default, flagged by hasCoords=false. */
export function hasRealCoords(s: any): boolean {
  if (s?.hasCoords === false) return false;
  return Number.isFinite(Number(s?.lat)) && Number.isFinite(Number(s?.lng)) && !(s.lat === 0 && s.lng === 0);
}

/* ------------------------------------------------------------------ */
/* Premium score (0-100ish): rating, reviews, photos, verification    */
/* ------------------------------------------------------------------ */
const STOCK_IMG = /unsplash\.com\/photo-1517248135467/;
const PREMIUM_WORDS = /rooftop|fine dining|luxury|infinity|boutique|spa|suites?|villa|resort|skyline|penthouse|lounge|chef/i;

export function premiumScore(s: any): number {
  let score = 0;

  const rating = Number(s.baseRating ?? s.rating);
  if (isFinite(rating) && rating > 0) score += (Math.max(0, rating - 3.5) / 1.5) * 40;

  const reviewN = Number(s.reviewCount ?? s.reviewsCount ?? s.reviews?.length ?? 0);
  score += Math.min(Math.log10(1 + reviewN) / Math.log10(201), 1) * 15;

  const photos = new Set<string>();
  [s.img, ...(s.images || []), ...(s.photos || [])].forEach((p: any) => {
    if (typeof p === 'string' && p && !STOCK_IMG.test(p)) photos.add(p);
  });
  if (photos.size > 0 || s.hasRealPhoto) score += 10;
  score += (Math.min(photos.size, 8) / 8) * 15;

  const verified = s.verified || s.is_verified || s.isVerified || s.is_claimed === true || s.claimedByBusinessId || s.businessId;
  if (verified) score += 12;

  if (s.price === 'High') score += 6;
  else if (s.price === 'Mid') score += 3;

  if ((s.description || '').length > 60) score += 3;
  if (s.specialOffers?.length) score += 2;
  if (s.website || s.instagram) score += 2;
  if (PREMIUM_WORDS.test(`${s.title || ''} ${s.description || ''} ${(s.tags || []).join(' ')}`)) score += 4;

  return Math.round(score * 10) / 10;
}

export function sortPremium<T>(list: T[]): T[] {
  return list
    .map((s, i) => ({ s, i, p: (s as any).premiumScore ?? premiumScore(s) }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map(x => x.s);
}

export interface RankOptions {
  nearYou?: boolean;
  origin?: LatLng | null;
  radiusKm?: number | null; // null/0 = no radius cut-off
}

/**
 * Default: premium-first. With nearYou + origin: only spots with real coordinates within radius,
 * nearest first (premium score breaks ties). Adds `premiumScore` and (when near) `distanceKm`.
 */
export function rankSpots<T extends Record<string, any>>(list: T[], opts: RankOptions = {}): (T & { premiumScore: number; distanceKm?: number })[] {
  const scored = list.map(s => ({ ...s, premiumScore: premiumScore(s) }));
  if (opts.nearYou && opts.origin) {
    const o = opts.origin;
    return scored
      .filter(hasRealCoords)
      .map(s => ({ ...s, distanceKm: haversineKm(o, { lat: Number(s.lat), lng: Number(s.lng) }) }))
      .filter(s => !opts.radiusKm || s.distanceKm <= opts.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm || b.premiumScore - a.premiumScore);
  }
  return sortPremium(scored);
}

/* ------------------------------------------------------------------ */
/* Near You: shared geolocation state (Home + Spots stay in sync)      */
/* ------------------------------------------------------------------ */
export type NearStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'error';

interface NearState {
  active: boolean;
  status: NearStatus;
  coords: LatLng | null;
  at: number;
  radiusKm: number | null;
  outsideNairobi: boolean;
}

const FRESH_MS = 5 * 60 * 1000;
let state: NearState = { active: false, status: 'idle', coords: null, at: 0, radiusKm: 10, outsideNairobi: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<NearState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

function locate() {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    set({ active: false, status: 'unsupported' });
    return;
  }
  set({ status: 'locating', active: true });
  navigator.geolocation.getCurrentPosition(
    pos => {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const outside = haversineKm(here, NAIROBI_CBD) > 80;
      set({ coords: outside ? NAIROBI_CBD : here, outsideNairobi: outside, at: Date.now(), status: 'ready', active: true });
    },
    err => set({ active: false, status: err.code === 1 ? 'denied' : 'error' }),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
  );
}

export function useNearYou() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  return {
    active: state.active && !!state.coords,
    pending: state.status === 'locating',
    status: state.status,
    origin: state.coords,
    outsideNairobi: state.outsideNairobi,
    radiusKm: state.radiusKm,
    setRadiusKm: (km: number | null) => set({ radiusKm: km }),
    toggle: () => {
      if (state.active) { set({ active: false }); return; }
      if (state.coords && Date.now() - state.at < FRESH_MS) { set({ active: true, status: 'ready' }); return; }
      locate();
    },
    clear: () => set({ active: false }),
  };
}
