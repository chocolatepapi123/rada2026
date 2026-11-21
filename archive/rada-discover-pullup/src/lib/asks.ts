/** Asks: a one-line reason to meet. All changes go through database functions. */
import { supabase } from './supabase';
import { isCloudReady } from './socialsCloud';
import { readVideoSeconds } from './hostVideos';
import { isDemoMode } from './demoMode';
import { demoAcceptReply, demoCloseAsk, demoCreateAsk, demoDeclineReply, demoFetchAsks, demoFetchReplies, demoPassAsk, demoReplyToAsk, demoSearchPlans } from '../data/demoAsks';

export interface Ask {
  id: string; body: string; area: string;
  media_url: string | null; media_type: 'image' | 'video' | null;
  created_at: string; expires_at: string; user_id: string; handle: string | null; avatar: string | null;
  verified: boolean; trusted: boolean; mine: boolean; replies: number; replied: boolean;
  plan_kind: 'event' | 'spot' | null; plan_ref: string | null; plan_title: string | null;
}
export interface PlanHit { kind: 'event' | 'spot'; ref: string; title: string; subtitle: string | null }
export type PlanLink = { kind: 'event' | 'spot'; ref: string; title: string };
export interface AskReply { id: string; user_id: string; handle: string | null; avatar: string | null; verified: boolean; message: string; status: 'pending' | 'accepted' | 'declined'; created_at: string }

const clean = (m?: string) => String(m || 'Something went wrong. Please try again.').replace(/^.*?:\s*/, '').trim();
const AREA_KEY = 'rada_asks_area';
export const getMyArea = (): string => { try { return localStorage.getItem(AREA_KEY) || ''; } catch { return ''; } };
export const setMyArea = (a: string) => { try { localStorage.setItem(AREA_KEY, a); } catch { /* private mode */ } };

export const MAX_MEDIA_MB = 25;
export const MAX_VIDEO_SECONDS = 30;

/** Shrinks a photo to at most 1280px (JPEG) so it loads fast on mobile data. */
async function shrinkImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read this photo.')); i.src = url; });
    const k = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process this photo.'))), 'image/jpeg', 0.8));
  } finally { URL.revokeObjectURL(url); }
}

/** Uploads a photo or short video for an ask. Throws a readable message. */
export async function uploadAskMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  if (isDemoMode()) return { url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' }; // Demo Mode: stays on this device
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id; if (!uid) throw new Error('Sign in first.');
  const isVideo = file.type.startsWith('video/'); const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) throw new Error('Choose a photo or a short video.');
  if (isVideo && file.size > MAX_MEDIA_MB * 1024 * 1024) throw new Error(`That video is too big. Keep it under ${MAX_MEDIA_MB} MB.`);
  let body: Blob = file; let ext = 'mp4'; let type = file.type;
  if (isVideo) {
    const secs = await readVideoSeconds(file);
    if (secs > MAX_VIDEO_SECONDS + 1) throw new Error(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds.`);
    ext = file.type.includes('quicktime') ? 'mov' : file.type.includes('webm') ? 'webm' : 'mp4';
  } else { body = await shrinkImage(file); ext = 'jpg'; type = 'image/jpeg'; }
  if (body.size > MAX_MEDIA_MB * 1024 * 1024) throw new Error(`That file is too big. Keep it under ${MAX_MEDIA_MB} MB.`);
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('ask-media').upload(path, body, { contentType: type, upsert: false });
  if (error) throw new Error('Upload failed. Check your connection and try again.');
  return { url: supabase.storage.from('ask-media').getPublicUrl(path).data.publicUrl, type: isVideo ? 'video' : 'image' };
}

/** Returns null when the request was cancelled or failed, so callers can keep what is already on screen. */
export async function fetchAsks(area: string, signal?: AbortSignal): Promise<Ask[] | null> {
  if (isDemoMode()) return demoFetchAsks(area);
  if (!isCloudReady()) return [];
  let q = supabase.rpc('asks_feed', { p_area: area || null });
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (signal?.aborted) return null;
  return error ? null : ((data as Ask[]) || []);
}
export async function createAsk(body: string, area: string, expiresAt: Date, media?: { url: string; type: 'image' | 'video' } | null, plan?: PlanLink | null, clientKey?: string): Promise<string | null> {
  if (!media?.url) return 'Add a photo or video to post your rada.';
  if (body.trim().length < 5) return 'Say a little more, at least a few words.';
  if (area.trim().length < 2) return 'Type where this is happening.';
  if (expiresAt.getTime() < Date.now() + 5 * 60000) return 'Pick an expiry at least 5 minutes from now.';
  if (isDemoMode()) { await demoCreateAsk(body, area, expiresAt, media, plan); return null; }
  const { error } = await supabase.rpc('create_ask', { p_body: body, p_area: area.trim(), p_expires_at: expiresAt.toISOString(), p_media_url: media?.url ?? null, p_media_type: media?.type ?? null, p_plan_kind: plan?.kind ?? null, p_plan_ref: plan?.ref ?? null, p_plan_title: plan?.title ?? null, p_client_key: clientKey ?? null });
  return error ? clean(error.message) : null;
}
/** Searches events and spots a person can link to their ask. */
export async function searchPlans(q: string): Promise<PlanHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  if (isDemoMode()) return demoSearchPlans(term);
  const { data, error } = await supabase.rpc('ask_plan_search', { p_q: term });
  return error ? [] : ((data as PlanHit[]) || []);
}
export async function passAsk(id: string): Promise<void> { if (isDemoMode()) return demoPassAsk(id); await supabase.rpc('pass_ask', { p_ask: id }); }
/** Like an ask. It leaves the deck like a pass, and the poster only sees a count. */
export async function likeAsk(id: string): Promise<string | null> {
  if (isDemoMode()) { await demoPassAsk(id); return null; }
  const { error } = await supabase.rpc('like_ask', { p_ask: id });
  return error ? clean(error.message) : null;
}
/** Like counts on my own posts, by ask id. */
export async function fetchMyLikes(): Promise<Record<string, number>> {
  if (isDemoMode() || !isCloudReady()) return {};
  const { data } = await supabase.rpc('my_ask_likes');
  const out: Record<string, number> = {};
  ((data as { ask_id: string; likes: number }[]) || []).forEach((r) => { out[r.ask_id] = r.likes; });
  return out;
}
/** Same rules the server enforces, so people get a friendly message before sending. */
export function pullUpLineProblem(text: string): string | null {
  const m = text.trim();
  if (m.length < 1) return 'Write a short line.';
  if (m.length > 140) return 'Keep it under 140 characters.';
  if (/(https?:\/\/|www\.)/i.test(m) || /(\+?\d[\s-]?){9,}/.test(m)) return 'No phone numbers or links. You can chat in RADA once they let you in.';
  return null;
}
export async function closeAsk(id: string): Promise<string | null> {
  if (isDemoMode()) { await demoCloseAsk(id); return null; }
  const { error } = await supabase.rpc('close_ask', { p_ask: id });
  return error ? clean(error.message) : null;
}
export async function replyToAsk(id: string, message: string): Promise<string | null> {
  if (isDemoMode()) { await demoReplyToAsk(id); return null; }
  const { error } = await supabase.rpc('reply_to_ask', { p_ask: id, p_message: message });
  return error ? clean(error.message) : null;
}
export async function fetchReplies(id: string): Promise<AskReply[]> {
  if (isDemoMode()) return demoFetchReplies(id);
  const { data } = await supabase.rpc('ask_replies_for', { p_ask: id });
  return (data as AskReply[]) || [];
}
export async function acceptReply(replyId: string): Promise<{ chatId: string | null; error: string | null }> {
  if (isDemoMode()) return demoAcceptReply(replyId);
  const { data, error } = await supabase.rpc('accept_ask_reply', { p_reply: replyId });
  return error ? { chatId: null, error: clean(error.message) } : { chatId: data as string, error: null };
}
export async function declineReply(replyId: string): Promise<string | null> {
  if (isDemoMode()) { await demoDeclineReply(replyId); return null; }
  const { error } = await supabase.rpc('decline_ask_reply', { p_reply: replyId });
  return error ? clean(error.message) : null;
}
export async function blockUser(userId: string): Promise<string | null> {
  if (isDemoMode()) return null;
  const { data: u } = await supabase.auth.getUser(); if (!u.user) return 'Sign in first.';
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: u.user.id, blocked_id: userId });
  return error && !/duplicate/i.test(error.message) ? clean(error.message) : null;
}
export async function reportAsk(ask: Ask, reason: string): Promise<string | null> {
  if (isDemoMode()) return null;
  const { data: u } = await supabase.auth.getUser(); if (!u.user) return 'Sign in first.';
  const { error } = await supabase.from('user_reports').insert({ reporter_id: u.user.id, reported_id: ask.user_id, context: 'other', context_id: `ask:${ask.id}`, reason, details: ask.body.slice(0, 300) });
  return error ? clean(error.message) : null;
}
/** One id per posting attempt, so a retry after a dropped connection never creates a second ask. */
export const newAttemptKey = (): string => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

/** Draft survives a closed sheet, a dropped connection or a failed post. */
const DRAFT_KEY = 'rada_ask_draft';
export interface AskDraft { body: string; area: string; plan: PlanLink | null }
export const loadDraft = (): AskDraft | null => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? (JSON.parse(r) as AskDraft) : null; } catch { return null; } };
export const saveDraft = (d: AskDraft) => { try { if (!d.body.trim() && !d.plan) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode */ } };
export const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } };

export const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m left`;
  const h = Math.round(m / 60);
  return h >= 24 ? `${Math.round(h / 24)}d left` : `${h}h left`;
};
