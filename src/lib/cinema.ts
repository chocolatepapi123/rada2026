import type { CinemaMovie } from '../types';
import { supabase } from './supabase.ts';

/**
 * "Cinema Showings" come from the Supabase table `cinema_showings`, which the admin
 * maintains from the Admin dashboard > Cinema tab. No third-party movie API is used.
 */

export interface CinemaRow {
  id: string;
  title: string;
  cinema: string;
  genre?: string | null;
  format?: string | null;
  showtimes?: string | null;
  poster_url?: string | null;
  booking_url?: string | null;
  release_date?: string | null;
  is_active: boolean;
  created_at?: string;
}

export const CINEMA_UPDATED_EVENT = 'rada-cinema-updated';

function rowToMovie(r: CinemaRow): CinemaMovie {
  return {
    id: r.id,
    title: r.title,
    genre: r.genre || '',
    date: r.release_date || '',
    format: r.format || 'Now Showing',
    img: r.poster_url || '',
    url: r.booking_url || '',
    bookingUrl: r.booking_url || '',
    location: r.cinema,
    locationName: r.cinema,
    times: r.showtimes || 'See cinema for showtimes',
  };
}

/** Active movies for the public Home feed. */
export async function fetchCinemaShowings(): Promise<CinemaMovie[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cinema_showings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToMovie);
  } catch (err) {
    console.warn('[RADA] Cinema showings unavailable', err);
    return [];
  }
}

// ---------- Admin ----------
export async function fetchAllCinemaRows(): Promise<CinemaRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('cinema_showings').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('[RADA] cinema admin fetch failed', error.message); return []; }
  return (data || []) as CinemaRow[];
}

export type CinemaInput = Omit<CinemaRow, 'id' | 'created_at' | 'is_active'>;

function notify() {
  try { window.dispatchEvent(new Event(CINEMA_UPDATED_EVENT)); } catch { /* ignore */ }
}

export async function addCinemaRow(input: CinemaInput): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const { error } = await supabase.from('cinema_showings').insert({ ...input, is_active: true });
  if (error) return error.message;
  notify();
  return null;
}

export async function setCinemaActive(id: string, active: boolean): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const { error } = await supabase.from('cinema_showings').update({ is_active: active }).eq('id', id);
  if (error) return error.message;
  notify();
  return null;
}

export async function deleteCinemaRow(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const { error } = await supabase.from('cinema_showings').delete().eq('id', id);
  if (error) return error.message;
  notify();
  return null;
}

/** Uploads a poster to storage (falls back to a data URL if no bucket accepts it). */
export async function uploadCinemaPoster(file: File): Promise<string> {
  const name = `cinema/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop() || 'jpg'}`;
  if (supabase?.storage) {
    for (const bucket of ['rada-media', 'spot-photos', 'public']) {
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(name, file, { upsert: true, contentType: file.type || 'image/jpeg' });
        if (!error && data?.path) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(name);
          if (pub?.publicUrl) return pub.publicUrl;
        }
      } catch { /* try next bucket */ }
    }
  }
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}
