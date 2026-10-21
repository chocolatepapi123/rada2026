import type { CinemaMovie } from '../types';

/**
 * Live "Cinema Showings" feed.
 *
 * Titles, posters and genres come from TMDB's now-playing list for Kenya
 * (set VITE_TMDB_API_KEY, a free key from themoviedb.org). Every movie gets:
 *  - url:        its TMDB page (direct movie link, always resolves)
 *  - bookingUrl: a ticket link built from the title. By default this is a search
 *                for tickets in Nairobi; set VITE_CINEMA_BOOKING_URL to your
 *                cinema's own URL pattern, using {title} and {id} as placeholders,
 *                e.g. https://example-cinema.co.ke/movies?search={title}
 *
 * Results are cached for 6 hours so reopening the app does not refetch.
 */

const TMDB_KEY = (import.meta.env.VITE_TMDB_API_KEY as string | undefined) || '';
const BOOKING_TEMPLATE = (import.meta.env.VITE_CINEMA_BOOKING_URL as string | undefined) || '';
const CACHE_KEY = 'rada_cinema_cache_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export function buildBookingUrl(title: string, id: number | string): string {
  const q = encodeURIComponent(title);
  if (BOOKING_TEMPLATE) {
    return BOOKING_TEMPLATE.replace('{title}', q).replace('{id}', String(id));
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} tickets showtimes Nairobi`)}`;
}

interface Cached { at: number; movies: CinemaMovie[] }

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

export async function fetchCinemaShowings(): Promise<CinemaMovie[]> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < CACHE_TTL_MS && cached.movies.length > 0) {
    return cached.movies;
  }
  if (!TMDB_KEY) return cached?.movies ?? [];

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?region=KE&language=en-US&page=1&api_key=${encodeURIComponent(TMDB_KEY)}`
    );
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    const data = await res.json();
    const movies: CinemaMovie[] = (data.results || [])
      .filter((m: any) => m && m.poster_path)
      .slice(0, 12)
      .map((m: any): CinemaMovie => ({
        id: m.id,
        title: m.title,
        genre: (m.genre_ids || []).slice(0, 2).map((g: number) => GENRES[g]).filter(Boolean).join(' / '),
        img: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        date: m.release_date || '',
        format: m.vote_average ? `★ ${Number(m.vote_average).toFixed(1)}` : 'Now Showing',
        url: `https://www.themoviedb.org/movie/${m.id}`,
        bookingUrl: buildBookingUrl(m.title, m.id)
      }));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), movies }));
    } catch { /* storage full or blocked: ignore */ }
    return movies;
  } catch (err) {
    console.warn('[RADA] Cinema showings unavailable', err);
    return cached?.movies ?? [];
  }
}
