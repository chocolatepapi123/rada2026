/** Asks: a one-line reason to meet. All changes go through database functions. */
import { supabase } from './supabase';
import { isCloudReady } from './socialsCloud';
import { readVideoSeconds } from './hostVideos';

export interface Ask {
  id: string; body: string; scope: 'area' | 'anywhere'; area: string | null;
  media_url: string | null; media_type: 'image' | 'video' | null;
  created_at: string; expires_at: string; user_id: string; handle: string | null; avatar: string | null;
  verified: boolean; trusted: boolean; mine: boolean; replies: number; replied: boolean;
}
export interface AskReply { id: string; user_id: string; handle: string | null; avatar: string | null; verified: boolean; message: string; status: 'pending' | 'accepted' | 'declined'; created_at: string }

const clean = (m?: string) => String(m || 'Something went wrong. Please try again.').replace(/^.*?:\s*/, '').trim();
const AREA_KEY = 'rada_asks_area';
export const getMyArea = (): string => { try { return localStorage.getItem(AREA_KEY) || ''; } catch { return ''; } };
export const setMyArea = (a: string) => { try { localStorage.setItem(AREA_KEY, a); } catch { /* private mode */ } };

export const MAX_MEDIA_MB = 25;
export const MAX_VIDEO_SECONDS = 30;

/** Shrinks a photo to at most 1600px (JPEG) so it loads fast on mobile data. */
async function shrinkImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read this photo.')); i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process this photo.'))), 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}

/** Uploads a photo or short video for an ask. Throws a readable message. */
export async function uploadAskMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
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

export async function fetchAsks(area: string): Promise<Ask[]> {
  if (!isCloudReady()) return [];
  const { data, error } = await supabase.rpc('asks_feed', { p_area: area || null });
  return error ? [] : ((data as Ask[]) || []);
}
export async function createAsk(body: string, scope: 'area' | 'anywhere', area: string, hours: number, media?: { url: string; type: 'image' | 'video' } | null): Promise<string | null> {
  if (body.trim().length < 5) return 'Say a little more, at least a few words.';
  if (scope === 'area' && !area.trim()) return 'Pick the area for this ask.';
  const { error } = await supabase.rpc('create_ask', { p_body: body, p_scope: scope, p_area: scope === 'area' ? area : null, p_hours: hours, p_media_url: media?.url ?? null, p_media_type: media?.type ?? null });
  return error ? clean(error.message) : null;
}
export async function closeAsk(id: string): Promise<string | null> {
  const { error } = await supabase.rpc('close_ask', { p_ask: id });
  return error ? clean(error.message) : null;
}
export async function replyToAsk(id: string, message: string): Promise<string | null> {
  const { error } = await supabase.rpc('reply_to_ask', { p_ask: id, p_message: message });
  return error ? clean(error.message) : null;
}
export async function fetchReplies(id: string): Promise<AskReply[]> {
  const { data } = await supabase.rpc('ask_replies_for', { p_ask: id });
  return (data as AskReply[]) || [];
}
export async function acceptReply(replyId: string): Promise<{ chatId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('accept_ask_reply', { p_reply: replyId });
  return error ? { chatId: null, error: clean(error.message) } : { chatId: data as string, error: null };
}
export async function declineReply(replyId: string): Promise<string | null> {
  const { error } = await supabase.rpc('decline_ask_reply', { p_reply: replyId });
  return error ? clean(error.message) : null;
}
export async function blockUser(userId: string): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser(); if (!u.user) return 'Sign in first.';
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: u.user.id, blocked_id: userId });
  return error && !/duplicate/i.test(error.message) ? clean(error.message) : null;
}
export async function reportAsk(ask: Ask, reason: string): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser(); if (!u.user) return 'Sign in first.';
  const { error } = await supabase.from('user_reports').insert({ reporter_id: u.user.id, reported_id: ask.user_id, context: 'other', context_id: `ask:${ask.id}`, reason, details: ask.body.slice(0, 300) });
  return error ? clean(error.message) : null;
}
export const timeLeft = (iso: string) => {
  const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3.6e6));
  return h >= 24 ? `${Math.round(h / 24)}d left` : `${h}h left`;
};
