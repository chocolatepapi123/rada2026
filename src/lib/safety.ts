import { supabase, isSupabaseConfigured } from './supabase';

export type ReportReason =
  | 'harassment'
  | 'fake_profile'
  | 'unsafe_meetup'
  | 'inappropriate_content'
  | 'underage'
  | 'spam'
  | 'other';

export type ReportContext = 'profile' | 'chat' | 'outing' | 'status' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string; hint: string }[] = [
  { id: 'harassment', label: 'Harassment or threats', hint: 'Abusive, threatening or unwanted messages' },
  { id: 'unsafe_meetup', label: 'Made me feel unsafe', hint: 'Pressure to meet privately, or behaviour at an outing' },
  { id: 'fake_profile', label: 'Fake profile or scam', hint: 'Pretending to be someone else, asking for money' },
  { id: 'inappropriate_content', label: 'Inappropriate content', hint: 'Sexual, violent or hateful photos or text' },
  { id: 'underage', label: 'Might be under 18', hint: 'RADA is for adults only' },
  { id: 'spam', label: 'Spam', hint: 'Ads or repeated unwanted messages' },
  { id: 'other', label: 'Something else', hint: 'Tell us more below' },
];

export interface SafetyResult {
  ok: boolean;
  error?: string;
}

const BLOCKED_KEY = 'rada_blocked_ids';
const BLOCKED_EVENT = 'rada-blocked-changed';

function readCache(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(BLOCKED_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeCache(ids: string[]) {
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(Array.from(new Set(ids))));
    window.dispatchEvent(new Event(BLOCKED_EVENT));
  } catch {
    /* storage unavailable: the server copy is still the source of truth */
  }
}

/** Ids this device currently knows are blocked (fast, synchronous). */
export function getCachedBlockedIds(): string[] {
  return readCache();
}

/** Lets a component re-render when the blocked list changes. Returns an unsubscribe function. */
export function onBlockedChanged(cb: () => void): () => void {
  window.addEventListener(BLOCKED_EVENT, cb);
  return () => window.removeEventListener(BLOCKED_EVENT, cb);
}

export async function fetchBlockedIds(): Promise<string[]> {
  if (!isSupabaseConfigured) return readCache();
  const { data, error } = await supabase.from('user_blocks').select('blocked_id');
  if (error) return readCache();
  const ids = (data || []).map((r: any) => String(r.blocked_id));
  writeCache(ids);
  return ids;
}

export async function blockUser(blockedId: string): Promise<SafetyResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Blocking needs an internet connection.' };
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { ok: false, error: 'Please sign in first.' };
  if (sess.session.user.id === blockedId) return { ok: false, error: 'You cannot block yourself.' };
  const { error } = await supabase.from('user_blocks').upsert({ blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) return { ok: false, error: 'Could not block this person. Try again.' };
  writeCache([...readCache(), blockedId]);
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<SafetyResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Unblocking needs an internet connection.' };
  const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', blockedId);
  if (error) return { ok: false, error: 'Could not unblock. Try again.' };
  writeCache(readCache().filter((id) => id !== blockedId));
  return { ok: true };
}

export async function reportUser(input: {
  reportedId: string;
  reason: ReportReason;
  details?: string;
  context?: ReportContext;
  contextId?: string;
}): Promise<SafetyResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Reporting needs an internet connection.' };
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { ok: false, error: 'Please sign in to report someone.' };
  if (sess.session.user.id === input.reportedId) return { ok: false, error: 'You cannot report yourself.' };
  const { error } = await supabase.from('user_reports').insert({
    reported_id: input.reportedId,
    reason: input.reason,
    details: (input.details || '').trim().slice(0, 1000) || null,
    context: input.context || 'profile',
    context_id: input.contextId || null,
  });
  if (error) return { ok: false, error: 'Could not send the report. Try again.' };
  return { ok: true };
}
