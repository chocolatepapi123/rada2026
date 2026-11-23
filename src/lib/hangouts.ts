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

// Limits that depend on the person's plan come from the database (table plan_limits), so changing a
// number there changes the app with no new build. Until they load, the free-plan values are used.
export interface MyHangoutLimits {
  plan: string;
  liveLimit: number | null; // null = unlimited
  liveUsed: number;
  videoSeconds: number;
}
let myVideoSeconds = 30;
export const getHangoutVideoSeconds = () => myVideoSeconds;

export async function loadMyHangoutLimits(): Promise<MyHangoutLimits | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc('my_plan_limits');
    if (error || !data) return null;
    const vs = Number(data.hangout_video_seconds?.limit);
    if (Number.isFinite(vs) && vs > 0) myVideoSeconds = Math.min(vs, HANGOUT_LIMITS.maxVideoSeconds);
    return {
      plan: String(data.plan || 'free'),
      liveLimit: data.hangouts_live?.limit ?? null,
      liveUsed: Number(data.hangouts_live?.used || 0),
      videoSeconds: myVideoSeconds,
    };
  } catch { return null; }
}

const BUCKET = 'hangout-media';
const LOCAL_HANGOUTS_KEY = 'rada_hangouts_local_v1';
const ready = () => Boolean(isSupabaseConfigured && supabase);

function readLocalHangouts(): Hangout[] {
  try {
    const raw = localStorage.getItem(LOCAL_HANGOUTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalHangouts(items: Hangout[]): void {
  try {
    localStorage.setItem(LOCAL_HANGOUTS_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

function seedDemoHangoutsFor(userId: string): Hangout[] {
  if (!userId.startsWith('demo-') && !userId.startsWith('showcase-')) return [];
  const d1 = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
  const d2 = new Date(Date.now() - 65 * 86400000).toISOString().slice(0, 10);
  return [
    {
      id: `local-ho-${userId}-1`,
      userId,
      status: 'published',
      caption: 'Sundowners and Afrobeats above Westlands. Best golden hour energy.',
      spotTitle: 'Skyline Rooftop Lounge',
      area: 'Westlands, Nairobi',
      happenedOn: d1,
      createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      publishedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      media: [
        {
          id: `local-hm-${userId}-1`,
          kind: 'photo',
          url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
          path: 'local/1.jpg',
          position: 0,
        },
      ],
    },
    {
      id: `local-ho-${userId}-2`,
      userId,
      status: 'published',
      caption: 'Morning hike through Karura and hot chai after.',
      spotTitle: 'Karura Forest',
      area: 'Limuru Road, Nairobi',
      happenedOn: d2,
      createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
      publishedAt: new Date(Date.now() - 65 * 86400000).toISOString(),
      media: [
        {
          id: `local-hm-${userId}-2`,
          kind: 'photo',
          url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop',
          path: 'local/2.jpg',
          position: 0,
        },
      ],
    },
  ];
}

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
  if (!userId) return [];
  const mode = opts.drafts || 'exclude';
  if (!ready()) {
    const local = readLocalHangouts().filter((h) => h.userId === userId);
    const all = local.length > 0 ? local : seedDemoHangoutsFor(userId);
    return all
      .filter((h) => (mode === 'only' ? h.status === 'draft' : mode === 'exclude' ? h.status === 'published' : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
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
  if (!ready()) {
    const item: Hangout = {
      id: `local-ho-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      status: input.status || 'draft',
      caption: (input.caption || '').trim().slice(0, HANGOUT_LIMITS.maxCaption),
      spotId: input.spotId ?? null,
      spotTitle: input.spotTitle ?? null,
      area: input.area ?? null,
      happenedOn: input.happenedOn ?? null,
      createdAt: new Date().toISOString(),
      publishedAt: input.status === 'published' ? new Date().toISOString() : null,
      media: [],
    };
    writeLocalHangouts([item, ...readLocalHangouts()]);
    return { hangout: item, error: null };
  }
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
  if (!ready()) {
    const all = readLocalHangouts();
    const idx = all.findIndex((h) => h.id === id);
    if (idx === -1) return 'Hangout not found.';
    const cur = all[idx];
    all[idx] = {
      ...cur,
      caption: input.caption !== undefined ? input.caption.trim().slice(0, HANGOUT_LIMITS.maxCaption) : cur.caption,
      spotId: input.spotId !== undefined ? input.spotId : cur.spotId,
      spotTitle: input.spotTitle !== undefined ? input.spotTitle : cur.spotTitle,
      area: input.area !== undefined ? input.area : cur.area,
      happenedOn: input.happenedOn !== undefined ? input.happenedOn : cur.happenedOn,
    };
    writeLocalHangouts(all);
    return null;
  }
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
  if (!ready()) {
    const all = readLocalHangouts();
    const idx = all.findIndex((h) => h.id === id);
    if (idx === -1) return 'Hangout not found.';
    if (all[idx].media.length === 0) return 'Add at least one photo or video first.';
    all[idx] = { ...all[idx], status: 'published', publishedAt: new Date().toISOString() };
    writeLocalHangouts(all);
    return null;
  }
  const { count } = await supabase.from('hangout_media').select('id', { count: 'exact', head: true }).eq('hangout_id', id);
  if (!count) return 'Add at least one photo or video first.';
  const { error } = await supabase.from('hangouts').update({ status: 'published' }).eq('id', id);
  return error ? error.message : null;
}

/** Take a published hangout back to drafts (hides it from the profile without deleting it). */
export async function unpublishHangout(id: string): Promise<string | null> {
  if (!ready()) {
    const all = readLocalHangouts();
    const idx = all.findIndex((h) => h.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], status: 'draft' };
    writeLocalHangouts(all);
    return null;
  }
  const { error } = await supabase.from('hangouts').update({ status: 'draft' }).eq('id', id);
  return error ? error.message : null;
}

export async function deleteHangout(h: Hangout): Promise<string | null> {
  if (!ready()) {
    writeLocalHangouts(readLocalHangouts().filter((x) => x.id !== h.id));
    return null;
  }
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Failed to read media'));
    r.readAsDataURL(blob);
  });
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
    if (s > myVideoSeconds + 0.5) return `Videos can be up to ${myVideoSeconds} seconds on your plan.`;
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
  const problem = await checkHangoutFile(file);
  if (problem) return { media: null, error: problem };

  const isVideo = file.type.startsWith('video/');
  const body: Blob = isVideo ? file : await shrinkPhoto(file);

  if (!ready()) {
    const url = await blobToDataUrl(body);
    const media: HangoutMedia = {
      id: `local-hm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: isVideo ? 'video' : 'photo',
      url,
      path: `local/${hangoutId}/${Date.now()}`,
      position,
      duration: isVideo ? Math.round(await videoSeconds(file)) : null,
    };
    const all = readLocalHangouts();
    const idx = all.findIndex((h) => h.id === hangoutId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], media: [...all[idx].media, media] };
      writeLocalHangouts(all);
    }
    return { media, error: null };
  }

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
  if (!ready()) {
    const all = readLocalHangouts().map((h) => ({
      ...h,
      media: h.media.filter((x) => x.id !== m.id),
    }));
    writeLocalHangouts(all);
    return null;
  }
  await supabase.storage.from(BUCKET).remove([m.path]);
  const { error } = await supabase.from('hangout_media').delete().eq('id', m.id);
  return error ? error.message : null;
}
