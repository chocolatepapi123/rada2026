/**
 * Analytics events. Fire-and-forget: tracking must never break the app.
 * Server side: public.track_event(...) finds the owner, rate-limits per session and swallows errors.
 */
import { getDemoPersona } from './demoMode';
import { demoMyAnalytics } from './demoPersonas';
import { supabase, isSupabaseConfigured } from './supabase';

export type TrackEvent =
  | 'view' | 'call' | 'whatsapp' | 'website' | 'directions' | 'save' | 'share' | 'rsvp'
  | 'offer_view' | 'offer_redeem' | 'promo_impression' | 'promo_click' | 'search';

export type TrackTarget = 'business' | 'spot' | 'listing' | 'outing' | 'event' | 'profile';

const SESSION_KEY = 'rada_session_id';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).slice(0, 36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// One view per target per session, so re-renders and re-opens don't inflate counts.
const seenViews = new Set<string>();
// Impressions: once per promo per session.
const seenImpressions = new Set<string>();

export function track(
  event: TrackEvent,
  targetType: TrackTarget,
  targetId: string | number | null | undefined,
  promoId?: string | null
): void {
  if (!isSupabaseConfigured || targetId === null || targetId === undefined || targetId === '') return;
  const id = String(targetId);
  if (event === 'view') {
    const k = `${targetType}:${id}`;
    if (seenViews.has(k)) return;
    seenViews.add(k);
  }
  if (event === 'promo_impression' && promoId) {
    if (seenImpressions.has(promoId)) return;
    seenImpressions.add(promoId);
  }
  try {
    void supabase
      .rpc('track_event', {
        p_event: event,
        p_target_type: targetType,
        p_target_id: id,
        p_promo: promoId ?? null,
        p_session: sessionId(),
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* ignore */
  }
}

export interface MyAnalytics {
  plan?: string;
  level: 'none' | 'free' | 'pro' | 'elite';
  days?: number;
  totals?: Partial<Record<TrackEvent, number>>;
  targets?: { target_type: TrackTarget; target_id: string; counts: Partial<Record<TrackEvent, number>> }[];
  daily?: { day: string; views: number; actions: number }[];
}

export async function fetchMyAnalytics(days = 30): Promise<MyAnalytics> {
  if (getDemoPersona()) return demoMyAnalytics(days);
  if (!isSupabaseConfigured) return { level: 'none' };
  const { data, error } = await supabase.rpc('get_my_analytics', { p_days: days });
  if (error) throw new Error(error.message);
  return (data as MyAnalytics) || { level: 'none' };
}
