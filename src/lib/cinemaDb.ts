import { supabase, isSupabaseConfigured } from './supabase.ts';
import type { CinemaMovie, CinemaShowtime, CinemaVenueLink } from '../types.ts';

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; data: CinemaMovie[] } | null = null;

const localISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Supabase returns at most 1000 rows per request, so page through. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const to12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/**
 * Movies seeded by scripts/seed-cinemas.ts (Anga, Century Cinemax, Unseen, KenyaBuzz).
 * Returns [] when Supabase isn't configured or the tables are empty, so callers can fall back.
 */
export async function fetchSeededCinema(force = false): Promise<CinemaMovie[]> {
  if (!isSupabaseConfigured) return [];
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  try {
    const today = localISO();
    const [movies, shows] = await Promise.all([
      fetchAll<any>((a, b) => supabase.from('cinema_movies').select('*').order('title').range(a, b)),
      fetchAll<any>((a, b) =>
        supabase.from('cinema_showtimes').select('*').gte('show_date', today)
          .order('show_date').order('show_time').range(a, b)),
    ]);

    const byMovie = new Map<string, CinemaShowtime[]>();
    for (const s of shows) {
      const st: CinemaShowtime = {
        id: s.id, venue: s.venue, venueKey: s.venue_key, date: s.show_date, time: hhmm(s.show_time),
        startsAt: s.starts_at, format: s.format, screen: s.screen, priceKes: s.price_kes, bookingUrl: s.booking_url,
      };
      (byMovie.get(s.movie_id) ?? byMovie.set(s.movie_id, []).get(s.movie_id)!).push(st);
    }

    const data: CinemaMovie[] = movies.map((m: any) => {
      const venues: CinemaVenueLink[] = Array.isArray(m.venues) ? m.venues : [];
      const showtimes = byMovie.get(m.id) ?? [];
      const names = venues.map(v => v.venue);
      const first = showtimes[0];
      return {
        id: m.id,
        title: m.title,
        genre: m.genre ?? undefined,
        date: m.release_date ?? today,
        format: m.format ?? '2D',
        img: m.poster_url ?? m.backdrop_url ?? '',
        url: m.movie_url,
        bookingUrl: m.booking_url,
        location: names.join(', '),
        locationName: names.length > 1 ? `${names.length} cinemas` : names[0],
        times: first && first.time ? `${first.date} ${to12(first.time)}` : undefined,
        provider: m.provider,
        synopsis: m.synopsis ?? undefined,
        rating: m.rating ?? undefined,
        runtimeMin: m.runtime_min ?? undefined,
        language: m.language ?? undefined,
        trailerUrl: m.trailer_url ?? undefined,
        status: m.status,
        venues,
        showtimes,
      } as CinemaMovie;
    });

    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('[RADA] seeded cinema load failed', e);
    return cache?.data ?? [];
  }
}

export { to12 as formatShowTime };
