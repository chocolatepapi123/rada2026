// RADA – live loader for public.external_events (Mookh, Ticketsasa, Tikiti scrapes).
import { supabase, isSupabaseConfigured } from './supabase';
import type { EventItem } from '../types.ts';
import { mapExternalRow, compareByStart, isUpcoming, type ExternalEventRow } from '../utils/eventUtils.ts';

/** RADA is a Nairobi hub: only show Kenyan events. Set to false to include UG / TZ / RW listings. */
export const ONLY_KENYA = true;

const COLUMNS =
  'id,source,source_url,title,category,rada_category,start_at,end_at,has_time,venue,host,image_url,' +
  'price_min,currency,country,tiers,description,address,lat,lng,gallery,tags,place_id';

/**
 * Loads upcoming events straight from Supabase.
 * Returns null on failure so callers can keep what they already have instead of showing an empty feed.
 */
export async function fetchExternalEvents(): Promise<EventItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // include events that started up to 12h ago so "happening now" ones are not cut off
    const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    let q = supabase
      .from('external_events')
      .select(COLUMNS)
      .gte('start_at', cutoff)
      .order('start_at', { ascending: true })
      .limit(1000);
    if (ONLY_KENYA) q = q.or('country.eq.KE,country.is.null');
    const { data, error } = await q;
    if (error) {
      console.warn('external_events load failed:', error.message);
      return null;
    }
    const now = new Date();
    return ((data || []) as unknown as ExternalEventRow[])
      .map(mapExternalRow)
      .filter(e => isUpcoming(e, now))
      .sort(compareByStart);
  } catch (e) {
    console.warn('external_events load error:', e);
    return null;
  }
}
