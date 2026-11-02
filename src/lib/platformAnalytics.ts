/**
 * Platform analytics for the whole app (signups, searches, saves, shares, outings, reviews, messages).
 * Separate from tracking.ts, which counts views and taps on one business for its owner.
 *
 * Server side: public.log_platform_event(...) only accepts the events listed below, caps 300 per
 * session per hour, never stores a person against a search, and keeps 180 days.
 * Admins read the totals in Admin → Health (admin_platform_analytics).
 */
import { supabase, isSupabaseConfigured } from './supabase';

export type PlatformEvent =
  | 'app_open' | 'signup' | 'login' | 'search' | 'save' | 'share'
  | 'outing_join' | 'outing_host' | 'review' | 'message_sent';

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

let openedThisSession = false;

export function logPlatformEvent(event: PlatformEvent, term?: string): void {
  if (!isSupabaseConfigured) return;
  if (event === 'app_open') {
    if (openedThisSession) return;
    openedThisSession = true;
  }
  try {
    void supabase
      .rpc('log_platform_event', { p_event: event, p_session: sessionId(), p_term: term ?? null })
      .then(() => undefined, () => undefined);
  } catch {
    /* ignore */
  }
}

// ---- Admin read side -------------------------------------------------------

export interface PlatformAnalytics {
  days: number;
  totals: Partial<Record<PlatformEvent, number>>;
  sessions_by_day: { day: string; sessions: number }[];
  signups_by_day: { day: string; signups: number }[];
  top_searches: { term: string; n: number }[];
  snapshot: {
    profiles: number;
    businesses_total: number;
    businesses_approved: number;
    messages: number;
    conversations: number;
  };
}

export interface ClientErrorGroup {
  fingerprint: string;
  kind: string;
  message: string;
  count: number;
  sessions: number;
  last_seen: string;
  url: string | null;
  stack: string | null;
  app_version: string | null;
  user_agent: string | null;
}

export async function fetchPlatformAnalytics(days = 14): Promise<PlatformAnalytics> {
  const { data, error } = await supabase.rpc('admin_platform_analytics', { p_days: days });
  if (error) throw new Error(error.message);
  return data as PlatformAnalytics;
}

export async function fetchRecentErrors(days = 7, limit = 50): Promise<ClientErrorGroup[]> {
  const { data, error } = await supabase.rpc('admin_recent_errors', { p_days: days, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data as ClientErrorGroup[]) || [];
}

export async function clearErrors(fingerprint?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_clear_errors', { p_fingerprint: fingerprint ?? null });
  if (error) throw new Error(error.message);
}
