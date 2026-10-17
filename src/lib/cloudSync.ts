import { supabase, isSupabaseConfigured } from './supabase';
import type { BusinessAccount } from '../types';

export type ListingKind = 'spot' | 'event' | 'thrift' | 'offer';

export interface CloudListings {
  spot: any[];
  event: any[];
  thrift: any[];
  offer: any[];
}

const MEDIA_BUCKET = 'rada-media';

// =====================================================================
// IMAGE UPLOADS
// =====================================================================
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not read image'));
    img.src = src;
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  try {
    const img = await loadImage(dataUrl);
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');

    const isPng = dataUrl.startsWith('data:image/png');
    if (!isPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise(res =>
      canvas.toBlob(res, isPng ? 'image/png' : 'image/jpeg', 0.82)
    );
    if (blob) return blob;
  } catch {
    // fall through to the raw conversion below
  }
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function uploadDataUrl(dataUrl: string, uid: string): Promise<string> {
  if (!isSupabaseConfigured) return dataUrl;
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '31536000',
    });
    if (error) {
      console.warn('Storage upload fallback to dataUrl:', error.message);
      return dataUrl;
    }

    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn('Image processing fallback to dataUrl:', err);
    return dataUrl;
  }
}

export async function uploadImagesDeep<T>(
  value: T,
  uid: string,
  cache: Map<string, string> = new Map()
): Promise<T> {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) {
      if (!cache.has(value)) cache.set(value, await uploadDataUrl(value, uid));
      return cache.get(value) as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out: any[] = [];
    for (const v of value) out.push(await uploadImagesDeep(v, uid, cache));
    return out as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      out[k] = await uploadImagesDeep(v as any, uid, cache);
    }
    return out as T;
  }
  return value;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// =====================================================================
// BUSINESSES
// =====================================================================
function rowToBusiness(row: any): BusinessAccount {
  const status = (row.verification_status || row.data?.verificationStatus || 'pending') as 'pending' | 'approved' | 'rejected';
  return {
    ...(row.data || {}),
    id: row.id,
    ownerId: row.owner_id ?? row.data?.ownerId,
    verificationStatus: status,
    verified: status === 'approved',
  } as BusinessAccount;
}

export async function fetchBusinesses(): Promise<BusinessAccount[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('rada_businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchBusinesses failed:', error.message);
    return null;
  }
  return (data || []).map(rowToBusiness);
}

/** Inserts business with explicit owner_id and verification_status columns so Admin can see it */
export async function insertBusiness(biz: BusinessAccount, ownerId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, ownerId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  const { error } = await supabase.from('rada_businesses').insert({
    id: biz.id,
    owner_id: ownerId,
    verification_status: 'pending',
    verified: false,
    data: clean,
  });

  return error ? error.message : null;
}

export async function updateBusiness(biz: BusinessAccount, uid: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, uid);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  const { data, error } = await supabase
    .from('rada_businesses')
    .update({ 
      data: clean, 
      verification_status: biz.verificationStatus || 'pending',
      verified: biz.verificationStatus === 'approved'
    })
    .eq('id', biz.id)
    .select('id');

  if (error) return error.message;
  if (!data || data.length === 0) return 'not allowed or business not found online';
  return null;
}

export async function reviewBusiness(
  id: string,
  updates: Partial<BusinessAccount>
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data: row, error: readErr } = await supabase
    .from('rada_businesses')
    .select('data')
    .eq('id', id)
    .maybeSingle();

  if (readErr) return readErr.message;
  if (!row) return 'business not found online';

  const newStatus = updates.verificationStatus || 'pending';
  const merged = { 
    ...(row.data || {}), 
    ...updates, 
    verificationStatus: newStatus,
    verified: newStatus === 'approved' 
  };

  const { data, error } = await supabase
    .from('rada_businesses')
    .update({
      data: merged,
      verification_status: newStatus,
      verified: newStatus === 'approved',
    })
    .eq('id', id)
    .select('id');

  if (error) return error.message;
  if (!data || data.length === 0) return 'not allowed (is this account set as admin?)';
  return null;
}

// =====================================================================
// LISTINGS
// =====================================================================
export async function fetchListings(): Promise<CloudListings | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('rada_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchListings failed:', error.message);
    return null;
  }

  const out: CloudListings = { spot: [], event: [], thrift: [], offer: [] };
  for (const row of data || []) {
    if (row.kind in out && row.data) {
      (out as any)[row.kind].push(row.data);
    }
  }
  return out;
}

export async function fetchSpots(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.spot : null;
}

export async function fetchEvents(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.event : null;
}

export async function fetchThrift(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.thrift : null;
}

export async function fetchOffers(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.offer : null;
}

export async function upsertListing(
  kind: ListingKind,
  item: any,
  businessId: string | undefined | null,
  ownerId: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let payload: any = item;
  if (kind === 'spot') {
    const { reviews, reviewCount, rating, ...rest } = item;
    payload = rest;
  } else if (kind === 'event') {
    const { goingCount, ...rest } = item;
    payload = rest;
  }

  try {
    payload = await uploadImagesDeep(payload, ownerId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  const { error } = await supabase.from('rada_listings').upsert(
    {
      kind,
      id: String(item.id),
      business_id: businessId ?? null,
      owner_id: ownerId,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'kind,id' }
  );
  return error ? error.message : null;
}

export async function deleteListing(kind: ListingKind, id: string | number): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase
    .from('rada_listings')
    .delete()
    .eq('kind', kind)
    .eq('id', String(id));
  return error ? error.message : null;
}

// =====================================================================
// REVIEWS
// =====================================================================
export async function fetchReviews(): Promise<Record<string, any[]> | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('rada_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchReviews failed:', error.message);
    return null;
  }

  const out: Record<string, any[]> = {};
  for (const row of data || []) {
    (out[row.spot_id] = out[row.spot_id] || []).push({ ...row.data, id: row.id });
  }
  return out;
}

export async function insertReview(spotId: number | string, review: any, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: any;
  try {
    clean = await uploadImagesDeep(review, userId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  const { error } = await supabase.from('rada_reviews').insert({
    id: String(review.id),
    spot_id: String(spotId),
    user_id: userId,
    data: clean,
  });
  return error ? error.message : null;
}

// =====================================================================
// STATUSES
// =====================================================================
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 60_000) return 'Just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function fetchStatuses(): Promise<any[] | null> {
  if (!isSupabaseConfigured) return null;
  const [st, rp] = await Promise.all([
    supabase.from('rada_statuses').select('*').order('created_at', { ascending: false }),
    supabase.from('rada_status_replies').select('*').order('created_at', { ascending: true }),
  ]);
  if (st.error || rp.error) {
    console.warn('fetchStatuses failed:', st.error?.message || rp.error?.message);
    return null;
  }

  const repliesByStatus: Record<string, any[]> = {};
  for (const row of rp.data || []) {
    (repliesByStatus[row.status_id] = repliesByStatus[row.status_id] || []).push({
      ...row.data,
      id: row.id,
      timeAgo: timeAgo(row.created_at),
    });
  }

  return (st.data || []).map((row: any) => ({
    ...row.data,
    id: row.id,
    timeAgo: timeAgo(row.created_at),
    replies: repliesByStatus[row.id] || [],
  }));
}

export async function insertStatus(post: any, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { replies, timeAgo: _ta, ...rest } = post;
  let clean: any;
  try {
    clean = await uploadImagesDeep(rest, userId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  const { error } = await supabase.from('rada_statuses').insert({
    id: String(post.id),
    user_id: userId,
    data: clean,
  });
  return error ? error.message : null;
}

export async function insertStatusReply(statusId: string, reply: any, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { timeAgo: _ta, ...rest } = reply;
  const { error } = await supabase.from('rada_status_replies').insert({
    id: String(reply.id),
    status_id: String(statusId),
    user_id: userId,
    data: rest,
  });
  return error ? error.message : null;
}

// =====================================================================
// GOING
// =====================================================================
export async function fetchGoing(uid?: string): Promise<{ counts: Record<string, number>; mine: number[] } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('rada_going').select('event_id,user_id');
  if (error) {
    console.warn('fetchGoing failed:', error.message);
    return null;
  }
  const counts: Record<string, number> = {};
  const mine: number[] = [];
  for (const row of data || []) {
    counts[row.event_id] = (counts[row.event_id] || 0) + 1;
    if (uid && row.user_id === uid) mine.push(Number(row.event_id));
  }
  return { counts, mine };
}

export async function setGoing(eventId: number | string, uid: string, going: boolean): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (going) {
    const { error } = await supabase
      .from('rada_going')
      .upsert({ event_id: String(eventId), user_id: uid }, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
    return error ? error.message : null;
  }
  const { error } = await supabase
    .from('rada_going')
    .delete()
    .eq('event_id', String(eventId))
    .eq('user_id', uid);
  return error ? error.message : null;
}

// =====================================================================
// USER DATA
// =====================================================================
export async function fetchUserData(uid: string): Promise<Record<string, any> | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('rada_user_data').select('key,data').eq('user_id', uid);
  if (error) {
    console.warn('fetchUserData failed:', error.message);
    return null;
  }
  const out: Record<string, any> = {};
  for (const row of data || []) out[row.key] = row.data;
  return out;
}

export async function saveUserData(
  uid: string,
  bundle: Record<string, any>
): Promise<{ error: string | null; cleaned: Record<string, any> }> {
  if (!isSupabaseConfigured) return { error: null, cleaned: bundle };
  let cleaned: Record<string, any>;
  try {
    cleaned = await uploadImagesDeep(bundle, uid);
  } catch (e) {
    return { error: `photo upload failed: ${errMsg(e)}`, cleaned: bundle };
  }
  const rows = Object.entries(cleaned).map(([key, data]) => ({
    user_id: uid,
    key,
    data,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('rada_user_data').upsert(rows, { onConflict: 'user_id,key' });
  return { error: error ? error.message : null, cleaned };
}
