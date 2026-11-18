// RADA – live loader for public.external_events (Mookh, Ticketsasa, Tikiti scrapes).
import { supabase, isSupabaseConfigured } from './supabase';
import type { EventItem } from '../types.ts';
import { mapExternalRow, isUpcoming, type ExternalEventRow } from '../utils/eventUtils.ts';
import { FEATURED_EVENTS, mergeFeaturedEvents } from './featuredEvents.ts';

/** Kenyan listings only. */
export const ONLY_KENYA = true;

const COLUMNS =
  'id,source,source_url,title,category,rada_category,start_at,end_at,has_time,venue,host,image_url,' +
  'price_min,currency,country,tiers,description,address,lat,lng,gallery,tags,place_id';

/**
 * Loads live Kenyan events and adds four organiser-poster-backed featured events.
 * Curated cards remain available if Supabase is not configured or temporarily unavailable.
 */
export async function fetchExternalEvents(): Promise<EventItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return FEATURED_EVENTS.filter(event => isUpcoming(event, new Date()));
  const now = new Date();
  try {
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
      return FEATURED_EVENTS.filter(event => isUpcoming(event, now));
    }
    const live = ((data || []) as unknown as ExternalEventRow[])
      .map(mapExternalRow)
      .filter(event => isUpcoming(event, now));
    return mergeFeaturedEvents(live).filter(event => isUpcoming(event, now));
  } catch (error) {
    console.warn('external_events load error:', error);
    return FEATURED_EVENTS.filter(event => isUpcoming(event, new Date()));
  }
}
