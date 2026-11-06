// Hangouts: photos / short videos on a person's profile. No likes or comments.
// Drafts are private to the owner; published hangouts are visible to everyone signed in.
// Other people can only do hangout-specific things: join next time, plan it, save the spot, say hi.
import { supabase, isSupabaseConfigured } from './supabase';

export type HangoutMediaKind = 'photo' | 'video';
export type HangoutStatus = 'draft' | 'published';

export interface HangoutMedia {
  id: string;
  kind: HangoutMediaKind;
  url: string;
  path: string;
  position: number;
  duration?: number | null;
}

export interface Hangout {
  id: string;
  userId: string;
  status: HangoutStatus;
  caption: string;
  spotId?: string | null;
  spotTitle?: string | null;
  area?: string | null;
  happenedOn?: string | null; // YYYY-MM-DD
  createdAt: string;
  publishedAt?: string | null;
  media: HangoutMedia[];
}

export interface HangoutDraftInput {
  caption?: string;
  spotId?: string | null;
  spotTitle?: string | null;
  area?: string | null;
  happenedOn?: string | null;
}

export const HANGOUT_LIMITS = {
  maxMedia: 8,
  maxPhotoMb: 12,
  maxVideoMb: 50,
  maxVideoSeconds: 60,
  maxCaption: 280,
};

const BUCKET = 'hangout-media';
const ready = () => Boolean(isSupabaseConfigured && supabase);

const rowToHangout = (r: any): Hangout => ({
  id: r.id,
  userId: r.user_id,
  status: r.status,
  caption: r.caption || '',
  spotId: r.spot_id,
  spotTitle: r.spot_title,
  area: r.area,
  happenedOn: r.happened_on,
  createdAt: r.created_at,
  publishedAt: r.published_at,
  media: ((r.hangout_media || []) as any[])
    .map((m) => ({ id: m.id, kind: m.kind, url: m.url, path: m.path, position: m.position ?? 0, duration: m.duration }))
    .sort((a, b) => a.position - b.position),
});

/**
 * A person's hangouts, newest first. Drafts only come back for the owner (the database enforces it too).
 * `drafts: 'only'` is for the "My drafts" list.
 */
export async function listHangouts(
  userId: string,
  opts: { drafts?: 'include' | 'only' | 'exclude' } = {}
): Promise<Hangout[]> {
  if (!ready() || !userId) return [];
  const mode = opts.drafts || 'exclude';
  let q = supabase
    .from('hangouts')
    .select('*, hangout_media(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (mode === 'only') q = q.eq('status', 'draft');
  else if (mode === 'exclude') q = q.eq('status', 'published');
  const { data, error } = await q;
  if (error) { console.warn('listHangouts failed:', error.message); return []; }
  return (data || []).map(rowToHangout);
}

export async function createHangout(
  userId: string,
  input: HangoutDraftInput & { status?: HangoutStatus }
): Promise<{ hangout: Hangout | null; error: string | null }> {
  if (!ready()) return { hangout: null, error: 'Not connected' };
  const { data, error } = await supabase
    .from('hangouts')
    .insert({
      user_id: userId,
      status: input.status || 'draft',
      caption: (input.caption || '').trim().slice(0, HANGOUT_LIMITS.maxCaption) || null,
      spot_id: input.spotId ?? null,
      spot_title: input.spotTitle ?? null,
      area: input.area ?? null,
      happened_on: input.happenedOn ?? null,
    })
    .select('*, hangout_media(*)')
    .single();
  if (error) return { hangout: null, error: error.message };
  return { hangout: rowToHangout(data), error: null };
}

export async function updateHangout(id: string, input: HangoutDraftInput): Promise<string | null> {
  if (!ready()) return 'Not connected';
  const patch: Record<string, unknown> = {};
  if (input.caption !== undefined) patch.caption = input.caption.trim().slice(0, HANGOUT_LIMITS.maxCaption) || null;
  if (input.spotId !== undefined) patch.spot_id = input.spotId;
  if (input.spotTitle !== undefined) patch.spot_title = input.spotTitle;
  if (input.area !== undefined) patch.area = input.area;
  if (input.happenedOn !== undefined) patch.happened_on = input.happenedOn;
  const { error } = await supabase.from('hangouts').update(patch).eq('id', id);
  return error ? error.message : null;
}

/** Publish a draft. A hangout needs at least one photo or video. */
export async function publishHangout(id: string): Promise<string | null> {
  if (!ready()) return 'Not connected';
  const { count } = await supabase.from('hangout_media').select('id', { count: 'exact', head: true }).eq('hangout_id', id);
  if (!count) return 'Add at least one photo or video first.';
  const { error } = await supabase.from('hangouts').update({ status: 'published' }).eq('id', id);
  return error ? error.message : null;
}

/** Take a published hangout back to drafts (hides it from the profile without deleting it). */
export async function unpublishHangout(id: string): Promise<string | null> {
  if (!ready()) return 'Not connected';
  const { error } = await supabase.from('hangouts').update({ status: 'draft' }).eq('id', id);
  return error ? error.message : null;
}

export async function deleteHangout(h: Hangout): Promise<string | null> {
  if (!ready()) return 'Not connected';
  const paths = h.media.map((m) => m.path).filter(Boolean);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from('hangouts').delete().eq('id', h.id);
  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** Shrink a photo before uploading (long side 1600px, JPEG). Falls back to the original file. */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.84));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function videoSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(isFinite(v.duration) ? v.duration : 0); };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

/** Check a picked file against the limits. Returns a friendly message, or null when it is fine. */
export async function checkHangoutFile(file: File): Promise<string | null> {
  const isVideo = file.type.startsWith('video/');
  const isPhoto = file.type.startsWith('image/');
  if (!isVideo && !isPhoto) return 'Only photos and videos can be added.';
  const mb = file.size / 1048576;
  if (isPhoto && mb > HANGOUT_LIMITS.maxPhotoMb) return `That photo is too big (max ${HANGOUT_LIMITS.maxPhotoMb} MB).`;
  if (isVideo && mb > HANGOUT_LIMITS.maxVideoMb) return `That video is too big (max ${HANGOUT_LIMITS.maxVideoMb} MB).`;
  if (isVideo) {
    const s = await videoSeconds(file);
    if (s > HANGOUT_LIMITS.maxVideoSeconds + 0.5) return `Videos can be up to ${HANGOUT_LIMITS.maxVideoSeconds} seconds.`;
  }
  return null;
}

/** Upload one photo/video and attach it to a hangout. */
export async function addHangoutMedia(
  userId: string,
  hangoutId: string,
  file: File,
  position: number
): Promise<{ media: HangoutMedia | null; error: string | null }> {
  if (!ready()) return { media: null, error: 'Not connected' };
  const problem = await checkHangoutFile(file);
  if (problem) return { media: null, error: problem };

  const isVideo = file.type.startsWith('video/');
  const body: Blob = isVideo ? file : await shrinkPhoto(file);
  const type = isVideo ? (file.type || 'video/mp4') : (body.type || 'image/jpeg');
  const ext = isVideo ? (type.includes('quicktime') ? 'mov' : type.includes('webm') ? 'webm' : 'mp4')
                      : (type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg');
  const path = `${userId}/${hangoutId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await supabase.storage.from(BUCKET).upload(path, body, { contentType: type, cacheControl: '31536000', upsert: false });
  if (up.error) return { media: null, error: up.error.message };
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const duration = isVideo ? Math.round(await videoSeconds(file)) : null;

  const { data, error } = await supabase
    .from('hangout_media')
    .insert({ hangout_id: hangoutId, user_id: userId, kind: isVideo ? 'video' : 'photo', url, path, position, duration })
    .select('*')
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { media: null, error: error.message };
  }
  return { media: { id: data.id, kind: data.kind, url, path, position, duration }, error: null };
}

export async function removeHangoutMedia(m: HangoutMedia): Promise<string | null> {
  if (!ready()) return 'Not connected';
  await supabase.storage.from(BUCKET).remove([m.path]);
  const { error } = await supabase.from('hangout_media').delete().eq('id', m.id);
  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
// Actions other people can take on a hangout
// ---------------------------------------------------------------------------

/** "I'd come along next time". Tapping again takes it back. Returns the new state. */
export async function toggleJoinNext(
  hangout: Pick<Hangout, 'id' | 'userId'>,
  myId: string
): Promise<{ joined: boolean; error: string | null }> {
  if (!ready()) return { joined: false, error: 'Not connected' };
  const { data: existing } = await supabase
    .from('hangout_actions')
    .select('id')
    .eq('hangout_id', hangout.id)
    .eq('from_user', myId)
    .eq('action', 'join_next')
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from('hangout_actions').delete().eq('id', existing.id);
    return { joined: false, error: error ? error.message : null };
  }
  const { error } = await supabase
    .from('hangout_actions')
    .insert({ hangout_id: hangout.id, from_user: myId, to_user: hangout.userId, action: 'join_next' });
  return { joined: !error, error: error ? error.message : null };
}

/** Which of these hangouts I already asked to join (so the button shows the right state). */
export async function myJoinedHangoutIds(myId: string, hangoutIds: string[]): Promise<Set<string>> {
  if (!ready() || !myId || hangoutIds.length === 0) return new Set();
  const { data } = await supabase
    .from('hangout_actions')
    .select('hangout_id')
    .eq('from_user', myId)
    .eq('action', 'join_next')
    .in('hangout_id', hangoutIds);
  return new Set((data || []).map((r: any) => r.hangout_id as string));
}

/** Owner only: who asked to join each of my hangouts. */
export async function fetchJoinRequestsForMe(myId: string): Promise<{ hangoutId: string; fromUser: string; createdAt: string }[]> {
  if (!ready() || !myId) return [];
  const { data } = await supabase
    .from('hangout_actions')
    .select('hangout_id, from_user, created_at')
    .eq('to_user', myId)
    .eq('action', 'join_next')
    .order('created_at', { ascending: false })
    .limit(100);
  return (data || []).map((r: any) => ({ hangoutId: r.hangout_id, fromUser: r.from_user, createdAt: r.created_at }));
}
