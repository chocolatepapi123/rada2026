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

function isValidUuid(id: any): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Returns the value if it is already a valid UUID, otherwise generates a new one. */
export function toValidUuid(value?: unknown): string {
  if (isValidUuid(value)) return value as string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// =====================================================================
// BUSINESSES
// =====================================================================
function rowToBusiness(row: any): BusinessAccount {
  const d = row.data && typeof row.data === 'object' ? row.data : {};
  const status = (
    row.verification_status ||
    row.verificationStatus ||
    d.verificationStatus ||
    (d.verified === true ? 'approved' : (d.verified === false && d.verificationStatus === 'rejected' ? 'rejected' : 'pending'))
  ) as 'pending' | 'approved' | 'rejected';

  const name = row.name || d.name || 'Unnamed Business';
  const category = (row.category || d.category || 'hospitality') as any;
  const neighborhood = row.neighborhood || d.neighborhood || 'Westlands';
  const address = row.address || d.address || `${neighborhood}, Nairobi`;
  const bio = row.bio || d.bio || `Official ${category} verified on RADA.`;
  const logo = row.logo || d.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop';
  const coverImage = row.cover_image || row.coverImage || d.coverImage || d.cover_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  const ownerId = row.owner_id || row.ownerId || d.ownerId;

  return {
    ...d,
    id: String(row.id),
    name,
    category,
    email: row.email || d.email || '',
    phone: row.phone || d.phone || '',
    whatsapp: row.whatsapp || d.whatsapp || '',
    neighborhood,
    address,
    bio,
    logo,
    coverImage,
    ownerId,
    verified: status === 'approved',
    verificationStatus: status,
    verificationNote: row.verification_note || d.verificationNote || '',
    verifiedAt: row.verified_at || d.verifiedAt,
    verifiedBy: row.verified_by || d.verifiedBy,
    instagram: row.instagram || d.instagram || '',
    createdDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : (d.createdDate || new Date().toISOString().split('T')[0]),
    discography: d.discography || [`${name} Showcase 2026`],
    pinnedImages: d.pinnedImages || [coverImage],
  };
}

export async function fetchBusinesses(): Promise<BusinessAccount[] | null> {
  if (!isSupabaseConfigured) return null;
  const list: BusinessAccount[] = [];
  const seenIds = new Set<string>();

  // 1. Query 'rada_businesses' table (primary RADA business table)
  try {
    let res = await supabase
      .from('rada_businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (res.error) {
      // Fallback in case created_at column does not exist
      res = await supabase.from('rada_businesses').select('*');
    }

    if (!res.error && res.data && res.data.length > 0) {
      for (const row of res.data) {
        const b = rowToBusiness(row);
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          list.push(b);
        }
      }
    }
  } catch (err) {
    console.warn('fetch from rada_businesses table failed:', err);
  }

  // 2. Query 'businesses' table (if populated or used in some environments)
  try {
    let res = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (res.error) {
      res = await supabase.from('businesses').select('*');
    }

    if (!res.error && res.data && res.data.length > 0) {
      for (const row of res.data) {
        const b = rowToBusiness(row);
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          list.push(b);
        }
      }
    }
  } catch (err) {
    console.warn('fetch from businesses table failed:', err);
  }

  return list;
}

/** Inserts/upserts business into 'rada_businesses' and 'businesses' */
export async function insertBusiness(biz: BusinessAccount, ownerId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, ownerId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  const status = biz.verificationStatus || 'pending';
  const isApproved = status === 'approved';
  const safeOwnerId = isValidUuid(ownerId) ? ownerId : (isValidUuid(biz.ownerId) ? biz.ownerId : null);

  const businessDataPayload = {
    ...clean,
    id: biz.id,
    ownerId,
    verificationStatus: status,
    verified: isApproved,
  };

  // rada_businesses columns (confirmed from Supabase):
  //   id uuid, owner_id uuid NOT NULL, name text NOT NULL, slug, category,
  //   verification_status, verification_note, phone, email, city, area, data jsonb,
  //   created_at, updated_at.
  // Everything else (address, whatsapp, bio, logo, coverImage, ...) lives inside `data`.
  if (!isValidUuid(biz.id)) {
    return `business id is not a valid UUID: ${biz.id}`;
  }
  if (!safeOwnerId) {
    return 'you must be signed in (valid owner id) to create a business';
  }
  if (!biz.name || !biz.name.trim()) {
    return 'business name is required';
  }

  const radaPayload = {
    id: biz.id,
    owner_id: safeOwnerId,
    name: biz.name.trim(),
    category: biz.category || null,
    phone: biz.phone || null,
    email: biz.email || null,
    area: biz.neighborhood || null,
    verification_status: status,
    data: businessDataPayload,
  };

  try {
    const { error } = await supabase
      .from('rada_businesses')
      .upsert(radaPayload, { onConflict: 'id' });
    if (error) {
      console.warn('rada_businesses upsert error:', error.message);
      return error.message;
    }
    return null;
  } catch (err: any) {
    console.warn('rada_businesses upsert threw:', err);
    return err?.message || String(err);
  }
}

export async function updateBusiness(biz: BusinessAccount, uid: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: BusinessAccount;
  try {
    clean = await uploadImagesDeep(biz, uid);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  const status = biz.verificationStatus || 'pending';
  const isApproved = status === 'approved';
  const businessDataPayload = {
    ...clean,
    id: biz.id,
    verificationStatus: status,
    verified: isApproved,
  };

  // 1. Update rada_businesses (NEVER pass 'verified' column!)
  try {
    let { error: rErr } = await supabase
      .from('rada_businesses')
      .update({
        name: biz.name,
        category: biz.category || null,
        phone: biz.phone || null,
        email: biz.email || null,
        area: biz.neighborhood || null,
        data: businessDataPayload,
        verification_status: status,
      })
      .eq('id', biz.id);

    if (rErr && (rErr.message?.includes('schema cache') || rErr.message?.includes('column'))) {
      await supabase
        .from('rada_businesses')
        .update({
          data: businessDataPayload,
        })
        .eq('id', biz.id);
    }
  } catch (e) {
    console.warn('rada_businesses update warning:', e);
  }

  // 2. Also try businesses table
  try {
    const flatUpdates: any = {
      name: biz.name,
      category: biz.category,
      email: biz.email || '',
      phone: biz.phone || '',
      whatsapp: biz.whatsapp || '',
      neighborhood: biz.neighborhood || '',
      address: biz.address || '',
      bio: biz.bio || '',
      logo: biz.logo || '',
      cover_image: biz.coverImage || '',
      verification_status: status,
      verification_note: biz.verificationNote || null,
      data: businessDataPayload,
    };
    await supabase
      .from('businesses')
      .update(flatUpdates)
      .eq('id', biz.id);
  } catch {}

  return null;
}

export async function reviewBusiness(
  id: string,
  updates: Partial<BusinessAccount>
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const newStatus = updates.verificationStatus || (updates.verified ? 'approved' : 'pending');
  const isApproved = newStatus === 'approved';

  let hadSuccess = false;

  // 1. Update 'rada_businesses' table (NEVER pass top-level 'verified')
  try {
    const { data: row } = await supabase
      .from('rada_businesses')
      .select('data')
      .eq('id', id)
      .maybeSingle();

    const merged = {
      ...(row?.data || {}),
      ...updates,
      verificationStatus: newStatus,
      verified: isApproved,
    };

    let { error: rErr } = await supabase
      .from('rada_businesses')
      .update({
        data: merged,
        verification_status: newStatus,
      })
      .eq('id', id);

    if (rErr && (rErr.message?.includes('schema cache') || rErr.message?.includes('column'))) {
      const retry = await supabase
        .from('rada_businesses')
        .update({
          data: merged,
        })
        .eq('id', id);
      rErr = retry.error;
    }

    if (!rErr) hadSuccess = true;
  } catch (e) {
    console.warn('reviewBusiness rada_businesses warning:', e);
  }

  // 2. Also update 'businesses' table if present
  try {
    const flatUpdates: any = {
      verification_status: newStatus,
      verification_note: updates.verificationNote || null,
      verified_at: updates.verifiedAt || new Date().toISOString(),
      verified_by: updates.verifiedBy || 'admin',
    };
    const { error: bErr } = await supabase
      .from('businesses')
      .update(flatUpdates)
      .eq('id', id);
    if (!bErr) hadSuccess = true;
  } catch {}

  return hadSuccess ? null : 'Could not update verification status in database.';
}

// =====================================================================
// LISTINGS
// =====================================================================
// =====================================================================
// LISTINGS
// =====================================================================
export async function fetchListings(): Promise<CloudListings | null> {
  if (!isSupabaseConfigured) return null;
  const out: CloudListings = { spot: [], event: [], thrift: [], offer: [] };
  const seenSpotIds = new Set<string>();

  // 1. Fetch from 'spots' table (standard Supabase table used across RADA)
  try {
    const { data: spotRows, error: sErr } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sErr && spotRows && spotRows.length > 0) {
      for (const row of spotRows) {
        const sid = String(row.id);
        seenSpotIds.add(sid);
        out.spot.push({
          id: row.id,
          title: row.title || 'Untitled Spot',
          category: row.category || 'restaurants',
          neighborhood: row.neighborhood || 'Nairobi',
          address: row.address || '',
          exactLocationTag: row.exact_location_tag || row.exactLocationTag || row.address || '',
          landmark: row.landmark || row.neighborhood || '',
          lat: row.lat ?? -1.2675,
          lng: row.lng ?? 36.8115,
          price: row.price || 'KES $$',
          rating: String(row.rating || '4.8'),
          reviewCount: row.review_count || row.reviewCount || 0,
          img: row.img || (row.images && row.images[0]) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
          images: Array.isArray(row.images) && row.images.length > 0
            ? row.images
            : [row.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'],
          description: row.description || '',
          phone: row.phone || '',
          openingHours: row.opening_hours || row.openingHours || '',
          businessId: row.business_id || row.businessId,
          isUserUploaded: row.is_user_uploaded ?? row.isUserUploaded ?? false,
          menuItems: row.menu_items || row.menuItems || [],
          reviews: row.reviews || [],
        });
      }
    }
  } catch (err) {
    console.warn('fetchListings spots table failed:', err);
  }

  // 2. Fetch from 'rada_listings'
  try {
    const { data, error } = await supabase
      .from('rada_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      for (const row of data) {
        if (row.kind in out && row.data) {
          if (row.kind === 'spot') {
            const sid = String(row.id);
            if (!seenSpotIds.has(sid)) {
              seenSpotIds.add(sid);
              out.spot.push(row.data);
            }
          } else {
            (out as any)[row.kind].push(row.data);
          }
        }
      }
    }
  } catch (err) {
    console.warn('fetchListings rada_listings failed:', err);
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

  // If this is a Spot, also upsert directly into the 'spots' table so all users querying 'spots' see it
  if (kind === 'spot') {
    const rawId = item.id;
    const numId = typeof rawId === 'number' ? rawId : (parseInt(String(rawId).replace(/\D/g, ''), 10) || Date.now());
    const spotRow: any = {
      id: numId,
      title: item.title || 'Untitled Spot',
      category: item.category || 'restaurants',
      neighborhood: item.neighborhood || 'Nairobi',
      address: item.address || '',
      exact_location_tag: item.exactLocationTag || item.address || '',
      landmark: item.landmark || item.neighborhood || '',
      lat: item.lat ?? -1.2675,
      lng: item.lng ?? 36.8115,
      price: item.price || 'KES $$',
      rating: String(item.rating || '4.8'),
      img: item.img || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      description: item.description || '',
      phone: item.phone || '',
      business_id: businessId ?? item.businessId ?? null,
      is_user_uploaded: item.isUserUploaded ?? false,
    };
    try {
      await supabase.from('spots').upsert(spotRow, { onConflict: 'id' });
    } catch (sErr) {
      console.warn('Direct upsert to spots table fallback:', sErr);
    }
  }

  const safeOwnerId = isValidUuid(ownerId) ? ownerId : null;

  const radaListingPayload: any = {
    kind,
    id: String(item.id),
    business_id: businessId ?? null,
    data: payload,
    updated_at: new Date().toISOString(),
  };
  if (safeOwnerId) {
    radaListingPayload.owner_id = safeOwnerId;
  }

  let { error } = await supabase.from('rada_listings').upsert(
    radaListingPayload,
    { onConflict: 'kind,id' }
  );

  // Fallback 1: In case the constraint is on 'id' instead of 'kind,id'
  if (error && (error.message?.includes('ON CONFLICT') || error.message?.includes('constraint'))) {
    const retry = await supabase.from('rada_listings').upsert(
      radaListingPayload,
      { onConflict: 'id' }
    );
    error = retry.error;
  }

  // Fallback 2: In case owner_id fails UUID validation in Postgres
  if (error && error.message?.includes('uuid')) {
    delete radaListingPayload.owner_id;
    const retryNoOwner = await supabase.from('rada_listings').upsert(
      radaListingPayload,
      { onConflict: 'kind,id' }
    );
    error = retryNoOwner.error;
  }

  return error ? error.message : null;
}

export async function deleteListing(kind: ListingKind, id: string | number): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (kind === 'spot') {
    try {
      const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10);
      if (numId) {
        await supabase.from('spots').delete().eq('id', numId);
      }
    } catch {}
  }
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
