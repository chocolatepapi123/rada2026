// Free daily forecast from Open-Meteo (no API key). One request per area, cached for 3h.
// Covers today + 15 days, so events further out simply show no weather.

export const NAIROBI = { lat: -1.2921, lng: 36.8219 };

export type DayForecast = { code: number; tmax: number; tmin: number; rain: number };
export type Forecast = Record<string, DayForecast>; // keyed by local YYYY-MM-DD

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

const TTL = 3 * 60 * 60 * 1000;
const mem = new Map<string, { at: number; data: Forecast }>();
const inflight = new Map<string, Promise<Forecast | null>>();

const hasCoords = (lat?: number | null, lng?: number | null) =>
  typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) && (lat !== 0 || lng !== 0);

async function load(la: number, lng: number): Promise<Forecast | null> {
  // ~11km buckets so every Nairobi event shares one request
  const k = `${la.toFixed(1)},${lng.toFixed(1)}`;
  const hit = mem.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  try {
    const raw = localStorage.getItem('rada.wx.' + k);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Date.now() - p.at < TTL) { mem.set(k, p); return p.data as Forecast; }
    }
  } catch { /* storage unavailable */ }

  const pending = inflight.get(k);
  if (pending) return pending;

  const req = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${la.toFixed(2)}&longitude=${lng.toFixed(2)}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&forecast_days=16`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      const j = await res.json();
      const d = j?.daily;
      if (!d?.time) return null;
      const data: Forecast = {};
      (d.time as string[]).forEach((day, i) => {
        data[day] = {
          code: d.weather_code?.[i] ?? 0,
          tmax: d.temperature_2m_max?.[i] ?? 0,
          tmin: d.temperature_2m_min?.[i] ?? 0,
          rain: d.precipitation_probability_max?.[i] ?? 0,
        };
      });
      const entry = { at: Date.now(), data };
      mem.set(k, entry);
      try { localStorage.setItem('rada.wx.' + k, JSON.stringify(entry)); } catch { /* ignore */ }
      return data;
    } catch {
      return null; // offline / blocked: just show nothing
    } finally {
      clearTimeout(timer);
      inflight.delete(k);
    }
  })();
  inflight.set(k, req);
  return req;
}

export function getForecast(lat?: number | null, lng?: number | null): Promise<Forecast | null> {
  return hasCoords(lat, lng) ? load(lat as number, lng as number) : load(NAIROBI.lat, NAIROBI.lng);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Turn an event/calendar date into a local YYYY-MM-DD key (or null if it can't be read). */
export function toDateKey(input?: string | Date | null): string | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const t = input.trim().toLowerCase();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // plain calendar date
    if (t === 'today' || t === 'tomorrow') {
      const x = new Date();
      if (t === 'tomorrow') x.setDate(x.getDate() + 1);
      return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    }
  }
  // Timestamps like 2026-11-07T21:00:00Z are converted to the phone's local day (Nairobi), not the UTC day.
  let d = input instanceof Date ? input : new Date(input);
  const hasMonth = typeof input === 'string' && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(input);
  if (typeof input === 'string' && !hasMonth && isNaN(d.getTime())) return null; // e.g. "Every Friday"
  if (typeof input === 'string' && hasMonth && !/\b(19|20)\d{2}\b/.test(input) && (isNaN(d.getTime()) || d.getFullYear() < 2010)) {
    // "Fri, Nov 7" style: no year in the text, so JS would guess 2001. Use this year, or next if it already passed.
    const now = new Date();
    d = new Date(`${input} ${now.getFullYear()}`);
    if (!isNaN(d.getTime()) && d.getTime() < now.getTime() - 60 * 864e5) d = new Date(`${input} ${now.getFullYear() + 1}`);
  }
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Clear sky', kind: 'clear' };
  if (code === 1 || code === 2) return { label: 'Partly cloudy', kind: 'partly' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Foggy', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', kind: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', kind: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', kind: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', kind: 'storm' };
  return { label: 'Cloudy', kind: 'cloudy' };
}
