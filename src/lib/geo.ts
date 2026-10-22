import { useCallback, useEffect, useState } from 'react';

export interface LatLng { lat: number; lng: number }

/** Approximate centres of common neighborhoods, used when the user picks an area instead of GPS. */
export const NEIGHBORHOOD_COORDS: Record<string, LatLng> = {
  'CBD': { lat: -1.2864, lng: 36.8172 },
  'Westlands': { lat: -1.2676, lng: 36.8108 },
  'Parklands': { lat: -1.2630, lng: 36.8160 },
  'Kilimani': { lat: -1.2900, lng: 36.7870 },
  'Kileleshwa': { lat: -1.2790, lng: 36.7830 },
  'Lavington': { lat: -1.2800, lng: 36.7690 },
  'Karen': { lat: -1.3190, lng: 36.7120 },
  'Langata': { lat: -1.3470, lng: 36.7460 },
  'Gigiri': { lat: -1.2330, lng: 36.8040 },
  'Runda': { lat: -1.2160, lng: 36.8060 },
  'Muthaiga': { lat: -1.2560, lng: 36.8330 },
  'South B': { lat: -1.3070, lng: 36.8362 },
  'South C': { lat: -1.3200, lng: 36.8270 },
  'Upper Hill': { lat: -1.2990, lng: 36.8130 },
  'Eastleigh': { lat: -1.2740, lng: 36.8520 },
  'Thika Road': { lat: -1.2300, lng: 36.8760 },
  'Kasarani': { lat: -1.2210, lng: 36.8970 },
  'Ngong Road': { lat: -1.3000, lng: 36.7700 },
  'Rongai': { lat: -1.3960, lng: 36.7600 },
  'Ruaka': { lat: -1.2057, lng: 36.7745 },
};

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km?: number | null): string {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.max(50, Math.round(km * 10) * 100)} m away`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

function coordsOf(spot: any): LatLng | null {
  if (spot?.hasCoords === false) return null;
  const lat = Number(spot?.lat ?? spot?.latitude);
  const lng = Number(spot?.lng ?? spot?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Closest first. Spots without real coordinates keep their original order after the located ones.
 * Adds `distanceKm` to each located spot.
 */
export function sortByProximity<T extends Record<string, any>>(
  spots: T[],
  origin: LatLng | null
): Array<T & { distanceKm?: number }> {
  if (!origin) return spots;
  const located: Array<T & { distanceKm: number }> = [];
  const unlocated: T[] = [];
  for (const s of spots) {
    const c = coordsOf(s);
    if (c) located.push({ ...s, distanceKm: distanceKm(origin, c) });
    else unlocated.push(s);
  }
  located.sort((a, b) => a.distanceKm - b.distanceKm);
  return [...located, ...unlocated];
}

const PREF_KEY = 'rada_home_location_pref';

export type LocationStatus = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

/**
 * pref = 'gps' (device location) or a neighborhood name from NEIGHBORHOOD_COORDS.
 * origin is the point the feed is sorted around (null until GPS resolves / if blocked).
 */
export function useLocationPreference() {
  const [pref, setPrefState] = useState<string>(() => {
    try { return localStorage.getItem(PREF_KEY) || 'gps'; } catch { return 'gps'; }
  });
  const [gps, setGps] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (pref === 'gps') requestGps();
  }, [pref, requestGps]);

  const setPref = useCallback((next: string) => {
    setPrefState(next);
    try { localStorage.setItem(PREF_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  const origin: LatLng | null = pref === 'gps' ? gps : NEIGHBORHOOD_COORDS[pref] ?? null;

  return { pref, setPref, origin, status, requestGps };
}
