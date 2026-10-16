import { supabase } from './supabase';
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
// Photos picked from the phone arrive as huge base64 "data:image/..." strings.
// We shrink them, upload to Supabase Storage, and keep only the short URL.
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
  const blob = await dataUrlToBlob(dataUrl);
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Walks any object/array and replaces every data:image string with an uploaded URL. */
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
  const status = (row.verification_status || 'pending') as 'pending' | 'approved' | 'rejected';
  return {
    ...(row.data || {}),
    id: row.id,
    ownerId: row.owner_id ?? row.data?.ownerId,
    // The database column is the source of truth for verification
    verificationStatus: status,
    verified: status === 'approved',
  } as BusinessAccount;
}

export async function fetchBusinesses(): Promise<BusinessAccount[] | null> {
  try {
    const { data, error } = await supabase
      .from('rada_businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchBusinesses failed:', error.message);
      return null;
    }
    return (data || []).map(rowToBusiness);
  } catch (err) {
    console.warn('fetchBusinesses error:', err);
    return null;
  }
}

/** Returns an error message, or null on success. */
export async function insertBusiness(biz: BusinessAccount, ownerId: string): Promise<string | null> {
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, ownerId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  try {
    const { error } = await supabase.from('rada_businesses').insert({
      id: biz.id,
      owner_id: ownerId,
      verification_status: 'pending',
      data: clean,
    });
    return error ? error.message : null;
  } catch (e) {
    return errMsg(e);
  }
}

/** Owner editing their own business profile. Returns an error message, or null on success. */
export async function updateBusiness(biz: BusinessAccount, uid: string): Promise<string | null> {
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, uid);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  try {
    const { data, error } = await supabase
      .from('rada_businesses')
      .update({ data: clean, verification_status: biz.verificationStatus || 'pending' })
      .eq('id', biz.id)
      .select('id');

    if (error) return error.message;
    if (!data || data.length === 0) return 'not allowed or business not found online';
    return null;
  } catch (e) {
    return errMsg(e);
  }
}

/**
 * Admin approve / reject. Merges ONLY the verification fields into the latest saved
 * copy, so it can't overwrite edits the owner made after the admin loaded the page.
 */
export async function reviewBusiness(
  id: string,
  updates: Partial<BusinessAccount>
): Promise<string | null> {
  try {
    const { data: row, error: readErr } = await supabase
      .from('rada_businesses')
      .select('data')
      .eq('id', id)
      .maybeSingle();

    if (readErr) return readErr.message;
    if (!row) return 'business not found online';

    const merged = { ...(row.data || {}), ...updates };
    const { data, error } = await supabase
      .from('rada_businesses')
      .update({
        data: merged,
        verification_status: updates.verificationStatus || merged.verificationStatus || 'pending',
      })
      .eq('id', id)
      .select('id');

    if (error) return error.message;
    if (!data || data.length === 0) return 'not allowed (is this account set as admin?)';
    return null;
  } catch (e) {
    return errMsg(e);
  }
}

// =====================================================================
// LISTINGS (spots, events, thrift items, offers)
// =====================================================================
export async function fetchListings(): Promise<CloudListings | null> {
  try {
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
  } catch (err) {
    console.warn('fetchListings error:', err);
    return null;
  }
}

/** Returns an error message, or null on success. */
export async function upsertListing(
  kind: ListingKind,
  item: any,
  businessId: string | undefined | null,
  ownerId: string
): Promise<string | null> {
  let payload: any = item;
  if (kind === 'spot') {
    // Reviews, rating and count come from the reviews table, never from the spot row
    const { reviews, reviewCount, rating, ...rest } = item;
    payload = rest;
  }

  try {
    payload = await uploadImagesDeep(payload, ownerId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  try {
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
  } catch (e) {
    return errMsg(e);
  }
}

/** Returns an error message, or null on success. */
export async function deleteListing(kind: ListingKind, id: string | number): Promise<string | null> {
  try {
    const { error } = await supabase
      .from('rada_listings')
      .delete()
      .eq('kind', kind)
      .eq('id', String(id));
    return error ? error.message : null;
  } catch (e) {
    return errMsg(e);
  }
}

// =====================================================================
// REVIEWS (anyone signed in can post; everyone can read)
// =====================================================================
/** Returns reviews grouped by spot id, newest first. */
export async function fetchReviews(): Promise<Record<string, any[]> | null> {
  try {
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
  } catch (err) {
    console.warn('fetchReviews error:', err);
    return null;
  }
}

/** Returns an error message, or null on success. */
export async function insertReview(spotId: number | string, review: any, userId: string): Promise<string | null> {
  let clean: any;
  try {
    clean = await uploadImagesDeep(review, userId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }
  try {
    const { error } = await supabase.from('rada_reviews').insert({
      id: String(review.id),
      spot_id: String(spotId),
      user_id: userId,
      data: clean,
    });
    return error ? error.message : null;
  } catch (e) {
    return errMsg(e);
  }
}
