import { supabase, isSupabaseConfigured } from './supabase';
import type { BusinessAccount, SavedItem, CollectionFolder, OutingPlan, OutingAttendee, ChatConversation, HostAnalytics, HostControls, UserProfile, AdminUserRecord, PlatformStats, SpotItem, SubscriptionStatus, UnclaimedSpotInput, SpotClaimRequest, CommunitySpotInput, AdminPermissions } from '../types';
import { isPlatformAdmin, isOfficialAdmin, DEFAULT_DELEGATED_PERMISSIONS, SUPER_ADMIN_PERMISSIONS } from '../types';
import { STATUS_TTL_MS } from '../utils/statusLifecycle';
import { loadUnclaimedSpots } from './spotsFeed';
import { generateNewUserName, isLegacyWayneName, sanitizeDisplayName, sanitizeUsername } from '../utils/userUtils';


export type ListingKind = 'spot' | 'event' | 'offer';

export interface CloudListings {
  spot: any[];
  event: any[];
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
    subscriptionStatus: (row.subscription_status || d.subscriptionStatus || 'none') as SubscriptionStatus,
    subscriptionPlan: row.subscription_plan || d.subscriptionPlan,
    subscriptionAmount: Number(row.subscription_amount ?? d.subscriptionAmount ?? 0) || undefined,
    subscriptionRenewsAt: row.subscription_renews_at || d.subscriptionRenewsAt,
    isSuspended: row.is_suspended === true || d.isSuspended === true,
    createdDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : (d.createdDate || new Date().toISOString().split('T')[0]),
    discography: d.discography || [`${name} Showcase 2026`],
    pinnedImages: d.pinnedImages || [coverImage],
  };
}

/**
 * Share one request between callers that ask at the same time (startup sync, feed refresh,
 * fetchSpots + fetchEvents + fetchOffers all need the same listings). Not a cache: once the
 * request finishes, the next call fetches fresh data again.
 */
function shareInFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) pending = fn().finally(() => { pending = null; });
    return pending;
  };
}

/** Starts a query immediately (Supabase queries are lazy) so two tables can load at the same time. */
function startQuery(q: PromiseLike<any>): Promise<any> {
  return Promise.resolve(q).catch((error: any) => ({ data: null, error }));
}

async function fetchBusinessesImpl(): Promise<BusinessAccount[] | null> {
  if (!isSupabaseConfigured) return null;
  const list: BusinessAccount[] = [];
  const seenIds = new Set<string>();
  // Both tables load at the same time; results are still merged in the original order
  const businessesReq = startQuery(supabase.from('businesses').select('*').order('created_at', { ascending: false }));

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
    let res: any = await businessesReq;

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
export const fetchBusinesses = shareInFlight(fetchBusinessesImpl);

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
async function fetchListingsImpl(): Promise<CloudListings | null> {
  if (!isSupabaseConfigured) return null;
  const out: CloudListings = { spot: [], event: [], offer: [] };
  const seenSpotIds = new Set<string>();
  // Both tables load at the same time; results are still merged in the original order
  const listingsReq = startQuery(supabase.from('rada_listings').select('*').order('created_at', { ascending: false }));

  // 1. Fetch from 'spots' table (standard Supabase table used across RADA)
  try {
    const { data: spotRows, error: sErr } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sErr && spotRows && spotRows.length > 0) {
      for (const row of spotRows) {
        const d = row.data && typeof row.data === 'object' ? row.data : {};
        if (row.status === 'pending_approval' || row.status === 'rejected' || d.status === 'pending_approval' || d.status === 'rejected') {
          continue;
        }
        const sid = String(row.id);
        seenSpotIds.add(sid);
        out.spot.push({
          id: row.id,
          title: row.title || d.title || 'Untitled Spot',
          category: row.category || d.category || 'restaurants',
          neighborhood: row.neighborhood || d.neighborhood || 'Nairobi',
          address: row.address || d.address || '',
          exactLocationTag: row.exact_location_tag || row.exactLocationTag || d.exactLocationTag || row.address || '',
          landmark: row.landmark || d.landmark || row.neighborhood || '',
          lat: row.lat ?? d.lat ?? -1.2675,
          lng: row.lng ?? d.lng ?? 36.8115,
          price: row.price || d.price || 'KES $$',
          rating: row.rating && Number(row.rating) > 0 ? Number(row.rating).toFixed(1) : (d.rating || 'New'),
          reviewCount: Number(row.review_count || row.reviewCount || d.reviewCount || 0),
          img: row.img || (row.images && row.images[0]) || d.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
          images: Array.isArray(row.images) && row.images.length > 0
            ? row.images
            : (d.images || [row.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop']),
          description: row.description || d.description || '',
          phone: row.phone || d.phone || '',
          openingHours: row.opening_hours || row.openingHours || d.openingHours || '',
          businessId: row.business_id || row.businessId || d.businessId,
          merchantId: row.merchant_id || row.merchantId || row.owner_id || row.ownerId || d.merchantId,
          isUserUploaded: row.is_user_uploaded ?? row.isUserUploaded ?? d.isUserUploaded ?? false,
          // Only an explicit false means "unclaimed"; every pre-existing spot stays owned.
          is_claimed: row.is_claimed ?? d.is_claimed,
          menuItems: row.menu_items || row.menuItems || d.menuItems || [],
          reviews: row.reviews || d.reviews || [],
          // Category-specific metadata
          cuisineTypes: row.cuisine_types || d.cuisineTypes || [],
          featuredDishes: row.featured_dishes || d.featuredDishes || [],
          menuImages: row.menu_images || d.menuImages || [],
          menuUploadUrl: row.menu_upload_url || d.menuUploadUrl,
          equipmentNeeded: row.equipment_needed || d.equipmentNeeded,
          equipmentProvided: row.equipment_provided || d.equipmentProvided,
          skillLevel: row.skill_level || d.skillLevel,
          whatToBring: row.what_to_bring || d.whatToBring,
          capacity: row.capacity || d.capacity,
          amenitiesAV: row.amenities_av || row.amenitiesAV || d.amenitiesAV || [],
          bookingPolicies: row.booking_policies || d.bookingPolicies,
          website: row.website || d.website || d.socialLinks?.website,
          instagram: row.instagram || d.instagram || d.socialLinks?.instagram,
          socialLinks: d.socialLinks || {
            website: row.website || d.website,
            instagram: row.instagram || d.instagram
          },
          ...d
        });
      }
    }
  } catch (err) {
    console.warn('fetchListings spots table failed:', err);
  }

  // 2. Fetch from 'rada_listings'
  try {
    const { data, error } = await listingsReq;

    if (!error && data) {
      for (const row of data) {
        if (row.kind in out && row.data) {
          if (row.kind === 'spot') {
            if (row.data?.status === 'pending_approval' || row.data?.status === 'rejected' || row.status === 'pending_approval' || row.status === 'rejected') {
              continue;
            }
            const sid = String(row.id);
            const appSpotId = String(row.data?.id || '');
            const existing = out.spot.find(s => String(s.id) === sid || (appSpotId && String(s.id) === appSpotId));
            if (existing) {
              Object.assign(existing, row.data, {
                id: existing.id,
                merchantId: row.data?.merchantId || existing.merchantId || row.owner_id
              });
            } else if (!seenSpotIds.has(sid) && (!appSpotId || !seenSpotIds.has(appSpotId))) {
              seenSpotIds.add(sid);
              if (appSpotId) seenSpotIds.add(appSpotId);
              out.spot.push({
                ...row.data,
                merchantId: row.data?.merchantId || row.owner_id || row.data?.ownerId,
              });
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
export const fetchListings = shareInFlight(fetchListingsImpl);

export function canEditSpot(
  spot: any,
  userId?: string | null,
  merchantBizIds: string[] = []
): boolean {
  if (!userId) return false;
  if (spot.merchantId && spot.merchantId === userId) return true;
  if (spot.ownerId && spot.ownerId === userId) return true;
  if (spot.businessId && merchantBizIds.includes(spot.businessId)) return true;
  if (spot.isUserUploaded && !spot.businessId) return true;
  return false;
}

export async function fetchSpots(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.spot : null;
}

export async function fetchEvents(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.event : null;
}

export async function fetchOffers(): Promise<any[] | null> {
  const listings = await fetchListings();
  return listings ? listings.offer : null;
}

/**
 * rada_listings.id is a UUID column, but the app's listings use numeric / text ids
 * (e.g. 1792256702908 or 'off-123'). We derive a stable UUID from kind + app id so the
 * same listing always maps to the same row (upsert works, delete works).
 * The original app id is preserved inside the `data` JSON, which is what the app reads back.
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k: number; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 19), 2869860233);
  h3 = Math.imul(h1 ^ (h2 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h3 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function listingUuid(kind: string, appId: string | number): string {
  const raw = String(appId);
  if (isValidUuid(raw)) return raw;
  const hex = cyrb128(`${kind}:${raw}`).map(n => n.toString(16).padStart(8, '0')).join('');
  const variant = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function upsertListing(
  kind: ListingKind,
  item: any,
  businessId: string | undefined | null,
  ownerId: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (!isValidUuid(ownerId)) {
    return 'you must be signed in (valid owner id) to save listings online';
  }

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

  const bizRef = businessId ?? item.businessId ?? null;
  const safeBizUuid = isValidUuid(bizRef) ? bizRef : null;
  const safeOwnerUuid = isValidUuid(ownerId) ? ownerId : null;

  payload = {
    ...payload,
    merchantId: ownerId,
    businessId: bizRef,
  };

  // 1. Explicitly persist to 'spots' table with merchant_id when saving a spot
  if (kind === 'spot') {
    try {
      const spotRow: any = {
        title: String(payload.title || item.title || 'Untitled Spot').slice(0, 300),
        category: payload.category || item.category || 'restaurants',
        neighborhood: payload.neighborhood || item.neighborhood || 'Nairobi',
        address: payload.address || item.address || '',
        exact_location_tag: payload.exactLocationTag || item.exactLocationTag || payload.address || '',
        landmark: payload.landmark || item.landmark || '',
        lat: payload.lat ?? item.lat ?? -1.2675,
        lng: payload.lng ?? item.lng ?? 36.8115,
        price: payload.price || item.price || 'KES $$',
        img: payload.img || (payload.images && payload.images[0]) || '',
        images: Array.isArray(payload.images) && payload.images.length > 0 ? payload.images : (payload.img ? [payload.img] : []),
        description: payload.description || item.description || '',
        phone: payload.phone || item.phone || '',
        opening_hours: payload.openingHours || item.openingHours || '',
        business_id: safeBizUuid,
        merchant_id: safeOwnerUuid,
        is_user_uploaded: payload.isUserUploaded ?? item.isUserUploaded ?? false,
        menu_items: payload.menuItems || item.menuItems || [],
        updated_at: new Date().toISOString(),
      };

      if (typeof payload.is_claimed === 'boolean') {
        spotRow.is_claimed = payload.is_claimed;
      }

      if (typeof item.id === 'number') {
        spotRow.id = item.id;
      }

      let { error: spotErr } = await supabase.from('spots').upsert(spotRow, { onConflict: 'id' });
      if (spotErr) {
        console.warn('spots table upsert warning:', spotErr.message);
        if (spotErr.message?.includes('column') || spotErr.message?.includes('schema cache')) {
          const minimalRow: any = {
            title: spotRow.title,
            category: spotRow.category,
            neighborhood: spotRow.neighborhood,
            address: spotRow.address,
            price: spotRow.price,
            img: spotRow.img,
            images: spotRow.images,
            description: spotRow.description,
            phone: spotRow.phone,
            opening_hours: spotRow.opening_hours,
            business_id: spotRow.business_id,
            merchant_id: spotRow.merchant_id,
            updated_at: spotRow.updated_at
          };
          if (spotRow.id) minimalRow.id = spotRow.id;
          await supabase.from('spots').upsert(minimalRow, { onConflict: 'id' });
        }
      }
    } catch (sErr) {
      console.warn('spots table upsert exception:', sErr);
    }
  }

  // 2. Also persist to rada_listings table
  const row: any = {
    id: listingUuid(kind, item.id),
    kind,
    owner_id: ownerId,
    business_id: safeBizUuid,
    title: String(item.title || item.name || item.businessName || 'Untitled').slice(0, 300),
    description: item.description ? String(item.description) : null,
    area: item.neighborhood || item.location || item.storeLocation || null,
    data: payload,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from('rada_listings').upsert(row, { onConflict: 'id' });

  if (error && (error.message?.includes('ON CONFLICT') || error.message?.includes('constraint'))) {
    const retry = await supabase.from('rada_listings').upsert(row, { onConflict: 'kind,id' });
    error = retry.error;
  }

  if (error) console.warn('rada_listings upsert error:', error.message);
  return error ? error.message : null;
}

export async function deleteListing(kind: ListingKind, id: string | number): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (kind === 'spot') {
    try {
      if (typeof id === 'number') {
        await supabase.from('spots').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('delete from spots table error:', e);
    }
  }
  const { error } = await supabase
    .from('rada_listings')
    .delete()
    .eq('kind', kind)
    .eq('id', listingUuid(kind, id));
  return error ? error.message : null;
}

// =====================================================================
// REVIEWS
// =====================================================================
async function fetchReviewsImpl(): Promise<Record<string, any[]> | null> {
  if (!isSupabaseConfigured) return null;
  const out: Record<string, any[]> = {};
  const seenIds = new Set<string>();
  // Both tables load at the same time; results are still merged in the original order
  const radaReviewsReq = startQuery(supabase.from('rada_reviews').select('*').order('created_at', { ascending: false }));

  // 1. Fetch from 'reviews' table (standard Supabase table)
  try {
    const { data: revData, error: revError } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!revError && revData) {
      for (const row of revData) {
        const spotId = String(row.spot_id ?? row.spotId ?? '');
        if (spotId) {
          const revId = String(row.id);
          seenIds.add(revId);
          const revObj = {
            id: revId,
            spotId,
            userId: row.user_id || row.userId || '',
            userName: toHandle(row.user_handle || row.userHandle || row.data?.userHandle),
            userHandle: toHandle(row.user_handle || row.userHandle || row.data?.userHandle),
            userAvatar: row.user_avatar || row.userAvatar || row.data?.userAvatar || '',
            rating: Number(row.rating ?? row.data?.rating ?? 5),
            comment: row.comment || row.content || row.data?.comment || '',
            images: Array.isArray(row.images) ? row.images : (row.data?.images || []),
            date: row.created_at ? new Date(row.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : (row.date || 'Recent'),
            ...(row.data || {})
          };
          revObj.userHandle = toHandle(revObj.userHandle);
          revObj.userName = revObj.userHandle;
          (out[spotId] = out[spotId] || []).push(revObj);
        }
      }
    }
  } catch (err) {
    console.warn('fetchReviews from reviews table failed:', err);
  }

  // 2. Fetch from 'rada_reviews' table
  try {
    const { data, error } = await radaReviewsReq;

    if (!error && data) {
      for (const row of data) {
        const spotId = String(row.spot_id);
        const revId = String(row.id);
        if (spotId && !seenIds.has(revId)) {
          seenIds.add(revId);
          const h = toHandle(row.data?.userHandle);
          (out[spotId] = out[spotId] || []).push({ ...row.data, id: revId, spotId, userHandle: h, userName: h });
        }
      }
    }
  } catch (err) {
    console.warn('fetchReviews from rada_reviews failed:', err);
  }

  return out;
}
export const fetchReviews = shareInFlight(fetchReviewsImpl);

export async function insertReview(spotId: number | string, review: any, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  let clean: any;
  try {
    clean = await uploadImagesDeep(review, userId);
  } catch (e) {
    return `photo upload failed: ${errMsg(e)}`;
  }

  clean.userHandle = toHandle(clean.userHandle);
  clean.userName = clean.userHandle;
  const sId = String(spotId);
  const ratingNum = Number(clean.rating || 5);
  let hasSuccess = false;

  // 1. Insert into 'reviews' table
  try {
    const reviewRow: any = {
      spot_id: isValidUuid(sId) ? sId : null,
      user_id: isValidUuid(userId) ? userId : null,
      rating: ratingNum,
      comment: clean.comment || '',
      user_name: clean.userHandle,
      user_handle: clean.userHandle,
      user_avatar: clean.userAvatar || '',
      images: clean.images || [],
    };
    if (isValidUuid(clean.id)) {
      reviewRow.id = clean.id;
    }

    const { error: revErr } = await supabase.from('reviews').insert(reviewRow);
    if (!revErr) {
      hasSuccess = true;
    }
  } catch (err) {
    console.warn('insert into reviews table failed:', err);
  }

  // 2. Upsert into 'rada_reviews' table (guarantees persistence across any ID type)
  try {
    const radaRow = {
      id: String(clean.id),
      spot_id: sId,
      user_id: userId,
      data: clean,
    };
    const { error: radaErr } = await supabase.from('rada_reviews').upsert(radaRow, { onConflict: 'id' });
    if (!radaErr) {
      hasSuccess = true;
    }
  } catch (err) {
    console.warn('insert into rada_reviews failed:', err);
  }

  // 3. Live update the spot row in 'spots' table with dynamic count & average rating
  try {
    const allReviews = await fetchReviews();
    const spotRevs = (allReviews && allReviews[sId]) || [clean];
    const totalCount = spotRevs.length;
    const avgRating = (spotRevs.reduce((acc, r) => acc + Number(r.rating || 0), 0) / totalCount).toFixed(1);

    await supabase
      .from('spots')
      .update({
        rating: avgRating,
        review_count: totalCount,
      })
      .eq('id', sId);
  } catch (err) {
    // optional update
  }

  return hasSuccess ? null : 'Could not save review to database';
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

/** Returns a clean ISO string, or undefined if the value is missing or not a valid date. */
function toIsoOrUndefined(value: unknown): string | undefined {
  if (!value) return undefined;
  const t = new Date(value as any).getTime();
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export async function fetchStatuses(): Promise<any[] | null> {
  if (!isSupabaseConfigured) return null;
  // Statuses live for 12 hours, so only ask for rows newer than that
  const cutoff = new Date(Date.now() - STATUS_TTL_MS).toISOString();
  const [st, rp] = await Promise.all([
    supabase.from('rada_statuses').select('*').gte('created_at', cutoff).order('created_at', { ascending: false }),
    supabase.from('rada_status_replies').select('*').gte('created_at', cutoff).order('created_at', { ascending: true }),
  ]);
  if (st.error || rp.error) {
    console.warn('fetchStatuses failed:', st.error?.message || rp.error?.message);
    return null;
  }

  const repliesByStatus: Record<string, any[]> = {};
  for (const row of rp.data || []) {
    const rh = toHandle(row.data?.handle);
    (repliesByStatus[row.status_id] = repliesByStatus[row.status_id] || []).push({
      ...row.data,
      author: rh,
      handle: rh,
      id: row.id,
      timeAgo: timeAgo(row.created_at),
    });
  }

  // created_at and user_id come from the table columns (server time, not the phone clock)
  // so the 12-hour expiry and "is this my status" checks in utils/statusLifecycle.ts work.
  return (st.data || []).map((row: any) => {
    const createdAt = toIsoOrUndefined(row.created_at) || toIsoOrUndefined(row.data?.createdAt);
    const sh = toHandle(row.data?.handle);
    return {
      ...row.data,
      author: sh,
      handle: sh,
      id: row.id,
      userId: row.user_id ? String(row.user_id) : row.data?.userId,
      createdAt,
      timeAgo: timeAgo(row.created_at),
      replies: repliesByStatus[row.id] || [],
    };
  });
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
  clean.handle = toHandle(clean.handle);
  clean.author = clean.handle;
  const { error } = await supabase.from('rada_statuses').insert({
    id: String(post.id),
    user_id: userId,
    data: clean,
  });
  return error ? error.message : null;
}

/**
 * Deletes one of the signed-in user's statuses (used by "Delete Status" and when a new
 * status replaces the old one). Needs a delete policy on rada_statuses, for example:
 *   create policy "owner deletes own status" on rada_statuses
 *     for delete using (auth.uid() = user_id);
 */
export async function deleteStatusFromCloud(statusId: string, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('rada_statuses')
    .delete()
    .eq('id', String(statusId))
    .eq('user_id', userId)
    .select('id');
  if (error) return error.message;
  if (!data || data.length === 0) {
    // Not found online (never synced) or blocked by row-level security
    console.warn('deleteStatusFromCloud: no row deleted for', statusId);
  }
  return null;
}

export async function insertStatusReply(statusId: string, reply: any, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { timeAgo: _ta, ...restReply } = reply;
  const rest = { ...restReply, handle: toHandle(restReply.handle), author: toHandle(restReply.handle) };
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

// =====================================================================
// PUBLIC IDENTITY (username-only visibility)
// =====================================================================
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;
const AVATAR_BUCKET = 'avatars';
const FALLBACK_HANDLE = '@explorer';

/** Lowercases and strips a leading "@" and whitespace. */
export function normalizeUsername(raw: string): string {
  return (raw || '').trim().replace(/^@+/, '').toLowerCase();
}

/** Returns an error message, or null when the format is valid. */
export function validateUsernameFormat(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!u) return 'Enter a username.';
  if (u.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (u.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!USERNAME_REGEX.test(u)) return 'Use only lowercase letters, numbers, _ and -.';
  return null;
}

/**
 * Turns anything into a safe public "@handle". Emails and phone numbers are never used:
 * if the value looks like one (or is not a valid username) we fall back to a neutral handle.
 */
export function toHandle(value?: unknown): string {
  const u = normalizeUsername(typeof value === 'string' ? value : '');
  return USERNAME_REGEX.test(u) ? `@${u}` : FALLBACK_HANDLE;
}

export interface UsernameCheck {
  available: boolean;
  error: string | null; // set when the check itself failed (network etc.)
}

/**
 * Live availability check. Tries the `check_username_available` RPC first, then falls back
 * to querying `profiles`. `currentUid` lets a user keep their own existing username.
 *
 * Suggested SQL (run once in Supabase):
 *   alter table profiles add column if not exists username text;
 *   create unique index if not exists profiles_username_key on profiles (lower(username));
 *   create or replace function check_username_available(username_to_check text)
 *   returns boolean language sql security definer as $$
 *     select not exists (select 1 from profiles where lower(username) = lower(username_to_check)
 *                        and id is distinct from auth.uid());
 *   $$;
 *   grant execute on function check_username_available(text) to anon, authenticated;
 */
export async function checkUsernameAvailable(raw: string, currentUid?: string): Promise<UsernameCheck> {
  const username = normalizeUsername(raw);
  const formatError = validateUsernameFormat(username);
  if (formatError) return { available: false, error: formatError };
  if (!isSupabaseConfigured) return { available: true, error: null };

  try {
    const rpc = await supabase.rpc('check_username_available', { username_to_check: username });
    if (!rpc.error && typeof rpc.data === 'boolean') {
      return { available: rpc.data, error: null };
    }
  } catch {
    // fall through to the table query
  }

  try {
    let q = supabase.from('profiles').select('id').ilike('username', username).limit(1);
    if (currentUid) q = q.neq('id', currentUid);
    const { data, error } = await q;
    if (error) return { available: false, error: 'Could not check availability. Try again.' };
    return { available: !data || data.length === 0, error: null };
  } catch (err) {
    return { available: false, error: 'Could not check availability. Try again.' };
  }
}

/** Saves the username (re-validates format and availability first). */
export async function updateUsername(uid: string, raw: string): Promise<{ error: string | null; username?: string }> {
  const username = normalizeUsername(raw);
  const formatError = validateUsernameFormat(username);
  if (formatError) return { error: formatError };
  if (!isSupabaseConfigured || !uid) return { error: null, username };

  const check = await checkUsernameAvailable(username, uid);
  if (check.error) return { error: check.error };
  if (!check.available) return { error: 'Username taken' };

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .update({ username, updated_at: now })
      .eq('id', uid)
      .select('id');
    let err = error;
    if (!err && (!data || data.length === 0)) {
      // No profile row yet
      err = (await supabase.from('profiles').upsert({ id: uid, username, updated_at: now }, { onConflict: 'id' })).error;
    }
    if (err) {
      // 23505 = unique violation: someone grabbed it between the check and the save
      if ((err as any).code === '23505' || /duplicate|unique/i.test(err.message || '')) {
        return { error: 'Username taken' };
      }
      return { error: err.message };
    }
    try { await supabase.auth.updateUser({ data: { username } }); } catch {}
    return { error: null, username };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export const NAME_MAX = 40;

/**
 * Older signups and DB defaults used "Explorer", "lowkey wayne", or "Wayne waweru".
 * Sanitizes any legacy or blank values to "new_user_(random 2 numbers)".
 */
export function cleanDisplayName(value?: unknown): string {
  const n = typeof value === 'string' ? value.trim() : '';
  if (!n || isLegacyWayneName(n)) {
    return generateNewUserName();
  }
  return n;
}

export function cleanAvatarUrl(value?: unknown): string {
  const url = typeof value === 'string' ? value.trim() : '';
  if (url.includes('photo-1535713875002-d1d0cf377fde') || url.includes('photo-1534528741775')) {
    return '';
  }
  return url;
}
const IDENTITY_CACHE_PREFIX = 'rada_profile_identity_';

export interface ProfileIdentity {
  name?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  isCreator?: boolean;
}

/** Last known identity for this user, so modals show the right values instantly on reopen. */
export function readCachedIdentity(uid?: string): ProfileIdentity | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(IDENTITY_CACHE_PREFIX + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileIdentity;
    if (parsed.name) parsed.name = cleanDisplayName(parsed.name);
    if (parsed.username && isLegacyWayneName(parsed.username)) parsed.username = parsed.name || generateNewUserName();
    if (parsed.avatarUrl) parsed.avatarUrl = cleanAvatarUrl(parsed.avatarUrl);
    return parsed;
  } catch {
    return null;
  }
}

export function cacheIdentity(uid: string, patch: ProfileIdentity): void {
  try {
    localStorage.setItem(IDENTITY_CACHE_PREFIX + uid, JSON.stringify({ ...(readCachedIdentity(uid) || {}), ...patch }));
  } catch {}
}

/**
 * Reads display name, username and avatar from `profiles` (column-agnostic: display_name,
 * full_name or name), falling back to auth metadata, then to the local cache.
 */
export async function fetchProfileIdentity(uid: string): Promise<ProfileIdentity | null> {
  if (!uid) return null;
  if (!isSupabaseConfigured) {
    const c = readCachedIdentity(uid);
    return c ? {
      ...c,
      ...(c.name !== undefined ? { name: cleanDisplayName(c.name) } : {}),
      ...(c.username !== undefined ? { username: sanitizeUsername(c.username, c.name) } : {}),
      ...(c.avatarUrl !== undefined ? { avatarUrl: cleanAvatarUrl(c.avatarUrl) } : {})
    } : null;
  }

  // Precedence: profiles row (server truth) > local cache (last save) > auth metadata (gap filler only).
  const row: ProfileIdentity = {};
  let rowHasName = false;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      if (typeof data.display_name === 'string' && data.display_name.trim()) {
        row.name = cleanDisplayName(data.display_name);
        rowHasName = true;
      } else {
        const legacy = data.full_name || data.name;
        if (legacy && legacy.trim()) {
          row.name = cleanDisplayName(legacy);
          rowHasName = true;
        }
      }
      if (data.username) {
        const u = normalizeUsername(String(data.username));
        row.username = isLegacyWayneName(u) ? (row.name || generateNewUserName()) : u;
      } else if (row.name) {
        row.username = row.name;
      }
      if (data.avatar_url) row.avatarUrl = cleanAvatarUrl(data.avatar_url);
      if (typeof data.bio === 'string') row.bio = data.bio;
      if (data.is_creator === true || data.account_type === 'professional') row.isCreator = true;
      else if (data.is_creator === false) row.isCreator = false;
    }
  } catch {}

  const meta: ProfileIdentity = {};
  if (!rowHasName || !row.username) {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const m: any = auth?.user?.user_metadata || {};
      if (!rowHasName && (m.display_name || m.full_name)) meta.name = cleanDisplayName(m.display_name || m.full_name);
      if (!row.username && m.username) {
        const u = normalizeUsername(String(m.username));
        meta.username = isLegacyWayneName(u) ? (meta.name || generateNewUserName()) : u;
      }
      if (m.avatar_url) meta.avatarUrl = cleanAvatarUrl(m.avatar_url);
    } catch {}
  }

  const merged: ProfileIdentity = { ...meta, ...(readCachedIdentity(uid) || {}), ...row };
  if (merged.name !== undefined) merged.name = cleanDisplayName(merged.name);
  if (!merged.username || isLegacyWayneName(merged.username)) {
    merged.username = merged.name || generateNewUserName();
  }
  if (merged.avatarUrl !== undefined) merged.avatarUrl = cleanAvatarUrl(merged.avatarUrl);
  if (Object.keys(merged).length === 0) return null;
  cacheIdentity(uid, merged);
  return merged;
}

let nameColumn: string | null = null;

/**
 * Persists display name and/or username to `profiles` in one go (plus auth metadata and a
 * local cache). Username goes through updateUsername(), which re-validates uniqueness.
 */
export async function saveProfileDetails(
  uid: string,
  fields: { name?: string; username?: string }
): Promise<{ error: string | null }> {
  const name = fields.name === undefined ? undefined : fields.name.trim();
  if (name !== undefined) {
    if (name.length > NAME_MAX) return { error: `Display name must be ${NAME_MAX} characters or fewer.` };
  }
  if (fields.username !== undefined) {
    const formatError = validateUsernameFormat(fields.username);
    if (formatError) return { error: formatError };
  }

  if (!isSupabaseConfigured || !uid) {
    cacheIdentity(uid || 'guest', {
      ...(name !== undefined ? { name } : {}),
      ...(fields.username !== undefined ? { username: normalizeUsername(fields.username) } : {}),
    });
    return { error: null };
  }

  if (fields.username !== undefined) {
    const r = await updateUsername(uid, fields.username);
    if (r.error) return { error: r.error };
    cacheIdentity(uid, { username: r.username });
  }

  if (name !== undefined) {
    let saved = false;
    const candidates = nameColumn ? [nameColumn] : ['display_name', 'full_name', 'name'];
    for (const col of candidates) {
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase.from('profiles').update({ [col]: name, updated_at: now }).eq('id', uid).select('id');
        if (!error && data && data.length > 0) { saved = true; nameColumn = col; break; }
        if (!error) {
          const up = await supabase.from('profiles').upsert({ id: uid, [col]: name, updated_at: now }, { onConflict: 'id' });
          if (!up.error) { saved = true; nameColumn = col; break; }
        }
      } catch {}
    }
    // Always mirror into auth metadata so the name survives even if the profiles column is missing
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: name, full_name: name } });
      if (!error) saved = true;
    } catch {}
    if (!saved) return { error: 'Could not save display name. Please try again.' };
    cacheIdentity(uid, { name });
  }

  return { error: null };
}

const BIO_MAX = 160;
const isColumnError = (msg?: string) => /column|schema cache/i.test(msg || '');

/**
 * Single write path for the profile identity used by BOTH UserProfileModal and
 * AccountSettingsModal. Writes `username` AND `display_name` to `profiles` in one upsert,
 * mirrors them into auth metadata and the local cache, and returns the normalized values so
 * the caller can pass them straight to onProfileChange.
 *
 * Suggested SQL (run once in Supabase):
 *   alter table profiles add column if not exists display_name text;
 *   alter table profiles add column if not exists bio text;
 */
export async function saveUnifiedProfile(
  uid: string,
  fields: { name: string; username: string; bio?: string }
): Promise<{ error: string | null; name?: string; username?: string; bio?: string; bioSaved?: boolean }> {
  // Display name is optional: blank is a valid, saved value (never auto-filled with "Explorer").
  const name = cleanDisplayName(fields.name);
  if (name.length > NAME_MAX) return { error: `Display name must be ${NAME_MAX} characters or fewer.` };
  const formatError = validateUsernameFormat(fields.username);
  if (formatError) return { error: formatError };
  const username = normalizeUsername(fields.username);
  const bio = fields.bio === undefined ? undefined : fields.bio.trim().slice(0, BIO_MAX);

  if (!isSupabaseConfigured || !uid) {
    cacheIdentity(uid || 'guest', { name, username, ...(bio !== undefined ? { bio } : {}) });
    return { error: null, name, username, bio, bioSaved: true };
  }

  const check = await checkUsernameAvailable(username, uid);
  if (check.error) return { error: check.error };
  if (!check.available) return { error: 'Username taken' };

  const now = new Date().toISOString();
  const payload = { username, display_name: name, updated_at: now };

  // Update-first: a plain UPDATE is what the profiles RLS policy normally allows. Only fall back to
  // an upsert when no row exists yet.
  const cols = 'id, username, display_name';
  const upd = await supabase.from('profiles').update(payload).eq('id', uid).select(cols);
  let error: { message?: string; code?: string } | null = upd.error;
  let savedRow: any = upd.data && upd.data.length > 0 ? upd.data[0] : null;
  if (!error && !savedRow) {
    const up = await supabase.from('profiles').upsert({ id: uid, ...payload }, { onConflict: 'id' }).select(cols);
    error = up.error;
    savedRow = up.data && up.data.length > 0 ? up.data[0] : null;
  }

  if (error) {
    if ((error as any).code === '23505' || /duplicate|unique/i.test(error.message || '')) {
      return { error: 'Username taken' };
    }
    if (isColumnError(error.message)) {
      // display_name column missing: fall back to whichever name column exists
      const legacy = await saveProfileDetails(uid, { name, username });
      if (legacy.error) return { error: legacy.error };
    } else {
      return { error: error.message || 'Could not save profile.' };
    }
  }

  // Read it back. An RLS-blocked UPDATE reports success with 0 rows, which looks saved but reverts on
  // the next launch. Fail loudly instead.
  try {
    const { data: stored } = await supabase.from('profiles').select('username').eq('id', uid).maybeSingle();
    if (stored && normalizeUsername(String(stored.username || '')) !== username) {
      return {
        error:
          'Your username did not save to the server. Check that the profiles table allows users to update their own row.',
      };
    }
  } catch {}

  try {
    const { error: metaErr } = await supabase.auth.updateUser({ data: { username, display_name: name, full_name: name } });
    if (metaErr) console.warn('saveUnifiedProfile auth metadata warning:', metaErr.message);
  } catch {}

  let bioSaved: boolean | undefined;
  if (bio !== undefined) {
    const { error: bioErr } = await supabase.from('profiles').update({ bio, updated_at: now }).eq('id', uid);
    bioSaved = !bioErr;
    if (bioErr) console.warn('saveUnifiedProfile bio warning:', bioErr.message);
  }

  // Hand back what Supabase actually stored so the caller can dispatch it straight to the app store
  const storedName = savedRow && typeof savedRow.display_name === 'string' ? cleanDisplayName(savedRow.display_name) : name;
  const storedUsername = savedRow?.username ? normalizeUsername(String(savedRow.username)) : username;

  cacheIdentity(uid, { name: storedName, username: storedUsername, ...(bio !== undefined && bioSaved ? { bio } : {}) });
  return { error: null, name: storedName, username: storedUsername, bio, bioSaved };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('could not read file'));
    r.readAsDataURL(file);
  });
}

/** Center-crops to a square and downsizes to 512px, so avatars stay small and consistent. */
async function avatarBlobFromFile(file: File): Promise<Blob> {
  const img = await loadImage(await fileToDataUrl(file));
  const side = Math.min(img.width, img.height);
  const size = Math.min(512, side);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('could not process image');
  return blob;
}

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads a picked image to the `avatars` bucket and saves the public URL as
 * profiles.avatar_url. Returns the new URL so the UI can update immediately.
 *
 * Bucket setup: create a PUBLIC bucket named "avatars" with policies letting authenticated
 * users insert/update/delete objects whose path starts with their own uid folder:
 *   (storage.foldername(name))[1] = auth.uid()::text
 */
export async function uploadAvatar(uid: string, file: File): Promise<{ url?: string; error: string | null }> {
  if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
  if (file.size > AVATAR_MAX_BYTES) return { error: 'Image is too large (max 8 MB).' };

  let blob: Blob;
  try {
    blob = await avatarBlobFromFile(file);
  } catch (e) {
    return { error: errMsg(e) };
  }

  // Offline / not configured: keep it local so the preview still works
  if (!isSupabaseConfigured || !uid) {
    return { url: await fileToDataUrl(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })), error: null };
  }

  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const url = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('profiles').update({ avatar_url: url, updated_at: now }).eq('id', uid).select('id');
  let err = error;
  if (!err && (!data || data.length === 0)) {
    err = (await supabase.from('profiles').upsert({ id: uid, avatar_url: url, updated_at: now }, { onConflict: 'id' })).error;
  }
  if (err) return { error: `Could not save photo: ${err.message}` };

  // Best-effort cleanup of older avatar files for this user
  try {
    const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(uid);
    const stale = (files || []).filter(f => `${uid}/${f.name}` !== path).map(f => `${uid}/${f.name}`);
    if (stale.length) await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  } catch {}

  return { url, error: null };
}

const COVER_MAX_BYTES = 12 * 1024 * 1024;
const COVER_MAX_EDGE = 1600;

/** Resize (keep aspect ratio, no crop) to a web-friendly JPEG. */
async function coverBlobFromFile(file: File): Promise<Blob> {
  const img = await loadImage(await fileToDataUrl(file));
  const scale = Math.min(1, COVER_MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('could not process image');
  return blob;
}

/**
 * Uploads an outing/spot cover photo straight to Supabase Storage and returns its public URL.
 * Stored in the existing public `avatars` bucket under `<uid>/covers/` so no new bucket or policy
 * is needed (the avatar policy already allows writes to your own `<uid>/` folder).
 */
export async function uploadCoverImage(uid: string, file: File): Promise<{ url?: string; error: string | null }> {
  if (!file.type.startsWith('image/')) return { error: 'Please choose an image file.' };
  if (file.size > COVER_MAX_BYTES) return { error: 'Image is too large (max 12 MB).' };

  let blob: Blob;
  try {
    blob = await coverBlobFromFile(file);
  } catch (e) {
    return { error: errMsg(e) };
  }

  // Offline / not configured: keep it local so the preview still works
  if (!isSupabaseConfigured || !uid) {
    return { url: await fileToDataUrl(new File([blob], 'cover.jpg', { type: 'image/jpeg' })), error: null };
  }

  const path = `${uid}/covers/outing-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };
  return { url: supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl, error: null };
}

/** Updates ONLY relationship_status so it can never overwrite the liveness flag. */
export async function saveRelationshipStatus(
  uid: string,
  status: 'single' | 'not_single'
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !uid) return { error: null };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update({ relationship_status: status, updated_at: now })
    .eq('id', uid)
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    const { error: upErr } = await supabase
      .from('profiles')
      .upsert({ id: uid, relationship_status: status, updated_at: now }, { onConflict: 'id' });
    if (upErr) return { error: upErr.message };
  }
  return { error: null };
}

// =====================================================================
// PROFILE VERIFICATION (Supabase 'profiles' table)
// =====================================================================
export async function updateProfileVerification(
  uid: string,
  relationshipStatus: string,
  isLivenessVerified: boolean,
  avatarUrl?: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !uid) return { error: null };
  try {
    const payload: Record<string, any> = {
      id: uid,
      relationship_status: relationshipStatus,
      is_liveness_verified: isLivenessVerified,
      updated_at: new Date().toISOString()
    };
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('profiles table upsert warning:', error.message);
      // Fallback: try update if upsert had conflict issues
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          relationship_status: relationshipStatus,
          is_liveness_verified: isLivenessVerified,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {})
        })
        .eq('id', uid);
      if (updateErr) {
        return { error: updateErr.message };
      }
    }
    return { error: null };
  } catch (err: any) {
    console.warn('updateProfileVerification error:', err);
    return { error: err?.message || String(err) };
  }
}

export async function fetchProfileVerification(uid: string): Promise<{
  relationship_status?: string;
  is_liveness_verified?: boolean;
  username?: string;
  avatar_url?: string;
} | null> {
  if (!isSupabaseConfigured || !uid) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('relationship_status, is_liveness_verified, username, avatar_url')
      .eq('id', uid)
      .maybeSingle();
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('fetchProfileVerification failed:', e);
  }
  return null;
}

/**
 * Call this once when a user signs in / the app launches, and pass the result to your App's
 * profile setter. It returns the saved name, username, avatar, bio and professional flag from
 * Supabase, so a username you changed last session is restored instead of an app default.
 */
export async function fetchOwnProfilePatch(uid: string): Promise<Partial<UserProfile>> {
  const patch: Partial<UserProfile> = {};
  if (!uid) return patch;
  const [idn, pro] = await Promise.all([fetchProfileIdentity(uid), fetchProfessionalState(uid)]);
  if (idn?.name) patch.name = cleanDisplayName(idn.name);
  const u = idn?.username && !isLegacyWayneName(idn.username) ? idn.username : (patch.name || generateNewUserName());
  patch.username = u;
  patch.handle = toHandle(u);
  if (idn?.avatarUrl) patch.avatar = idn.avatarUrl;
  if (typeof idn?.bio === 'string' && idn.bio) patch.bio = idn.bio;
  if (pro) {
    patch.is_creator = pro.isCreator;
    patch.account_type = pro.isCreator ? 'professional' : 'personal';
    if (pro.since) patch.professional_since = pro.since;
  }
  return patch;
}

// =====================================================================
// PROFESSIONAL ACCOUNT (instant switch, no approval)
// =====================================================================
/**
 * Suggested SQL (run once in Supabase):
 *   alter table profiles add column if not exists is_creator boolean not null default false;
 *   alter table profiles add column if not exists account_type text not null default 'personal';
 *   alter table profiles add column if not exists professional_since timestamptz;
 *   alter table profiles add column if not exists profile_views integer not null default 0;
 *   alter table profiles add column if not exists priority_listing boolean not null default false;
 *   alter table profiles add column if not exists featured_spots boolean not null default false;
 *
 * Optional analytics RPC (any missing number renders as "—", never mock data):
 *   create or replace function get_host_analytics(host_uid uuid)
 *   returns table (impressions bigint, event_saves bigint, profile_views bigint, rsvps bigint)
 *   language sql security definer as $$ ... $$;
 */
export interface ProfessionalState {
  isCreator: boolean;
  since?: string;
}

/** Reads the professional flag from profiles, then auth metadata, then the local cache. */
export async function fetchProfessionalState(uid: string): Promise<ProfessionalState | null> {
  if (!uid) return null;
  if (!isSupabaseConfigured) {
    const c = readCachedIdentity(uid);
    return c && typeof c.isCreator === 'boolean' ? { isCreator: c.isCreator } : null;
  }
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (!error && data && (data.is_creator !== undefined || data.account_type !== undefined)) {
      return {
        isCreator: data.is_creator === true || data.account_type === 'professional',
        since: data.professional_since || undefined,
      };
    }
  } catch {}
  try {
    const { data: auth } = await supabase.auth.getUser();
    const meta: any = auth?.user?.user_metadata || {};
    if (meta.is_creator !== undefined || meta.account_type !== undefined) {
      return { isCreator: meta.is_creator === true || meta.account_type === 'professional' };
    }
  } catch {}
  const c = readCachedIdentity(uid);
  return c && typeof c.isCreator === 'boolean' ? { isCreator: c.isCreator } : null;
}

/**
 * Instantly switches the account to/from professional. Writes profiles.is_creator and
 * profiles.account_type. There is no pending state and no admin review.
 */
export async function setProfessionalMode(
  uid: string,
  enabled: boolean
): Promise<{ error: string | null; since?: string }> {
  const now = new Date().toISOString();
  const since = enabled ? now : undefined;
  const account_type = enabled ? 'professional' : 'personal';

  if (!isSupabaseConfigured || !uid) {
    cacheIdentity(uid || 'guest', { isCreator: enabled });
    return { error: null, since };
  }

  // Try the full payload first, then degrade if some columns do not exist yet
  const attempts: Record<string, any>[] = [
    { is_creator: enabled, account_type, professional_since: enabled ? now : null },
    { is_creator: enabled, account_type },
    { is_creator: enabled },
    { account_type },
  ];
  let saved = false;
  let lastError: string | null = null;
  for (const fields of attempts) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: uid, ...fields, updated_at: now }, { onConflict: 'id' });
      if (!error) { saved = true; break; }
      lastError = error.message;
      if (!isColumnError(error.message)) break;
    } catch (e) {
      lastError = errMsg(e);
      break;
    }
  }

  // Mirror to auth metadata so the flag survives even if the profiles columns are missing
  let metaSaved = false;
  try {
    const { error } = await supabase.auth.updateUser({ data: { is_creator: enabled, account_type } });
    metaSaved = !error;
  } catch {}

  if (!saved && !metaSaved) return { error: lastError || 'Could not switch account type. Please try again.' };
  cacheIdentity(uid, { isCreator: enabled });
  return { error: null, since };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Outing analytics for a professional account. Anything we cannot measure comes back as null. */
export async function fetchHostAnalytics(uid: string): Promise<HostAnalytics> {
  const out: HostAnalytics = { impressions: null, eventSaves: null, profileViews: null, rsvps: null };
  if (!isSupabaseConfigured || !uid) return out;

  // 1. Preferred: a single RPC that aggregates everything server-side
  try {
    const { data, error } = await supabase.rpc('get_host_analytics', { host_uid: uid });
    if (!error && data) {
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row) {
        out.impressions = numOrNull(row.impressions);
        out.eventSaves = numOrNull(row.event_saves ?? row.eventSaves);
        out.profileViews = numOrNull(row.profile_views ?? row.profileViews);
        out.rsvps = numOrNull(row.rsvps);
      }
    }
  } catch {}

  // 2. Fallbacks for whatever the RPC did not provide
  if (out.rsvps === null) {
    try {
      const { data: mine } = await supabase.from('outings').select('id').eq('host_id', uid);
      const ids = (mine || []).map((o: any) => o.id);
      if (ids.length === 0) {
        out.rsvps = 0;
      } else {
        const { count, error } = await supabase
          .from('outing_attendees')
          .select('id', { count: 'exact', head: true })
          .in('outing_id', ids)
          .neq('status', 'declined');
        if (!error && typeof count === 'number') out.rsvps = count;
      }
    } catch {}
  }
  if (out.profileViews === null) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (data) out.profileViews = numOrNull((data as any).profile_views);
    } catch {}
  }
  return out;
}

const HOST_CONTROLS_KEY = 'host_controls';
const DEFAULT_HOST_CONTROLS: HostControls = { featuredSpots: false, priorityListing: false };

export async function fetchHostControls(uid: string): Promise<HostControls> {
  if (!isSupabaseConfigured || !uid) return { ...DEFAULT_HOST_CONTROLS };
  try {
    const { data, error } = await supabase
      .from('rada_user_data')
      .select('data')
      .eq('user_id', uid)
      .eq('key', HOST_CONTROLS_KEY)
      .maybeSingle();
    if (!error && data?.data) {
      return {
        featuredSpots: data.data.featuredSpots === true,
        priorityListing: data.data.priorityListing === true,
      };
    }
  } catch {}
  return { ...DEFAULT_HOST_CONTROLS };
}

export async function saveHostControls(uid: string, controls: HostControls): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !uid) return { error: null };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('rada_user_data')
    .upsert({ user_id: uid, key: HOST_CONTROLS_KEY, data: controls, updated_at: now }, { onConflict: 'user_id,key' });
  if (error) return { error: error.message };
  // Best-effort mirror onto profiles so feed queries can read the flags (rada_user_data is owner-only)
  try {
    await supabase
      .from('profiles')
      .update({ featured_spots: controls.featuredSpots, priority_listing: controls.priorityListing, updated_at: now })
      .eq('id', uid);
  } catch {}
  return { error: null };
}

// =====================================================================
// PERSONAL SAVED PLANS & VAULT STATE SYNC (SUPABASE)
// =====================================================================
export async function syncSavedPlans(
  uid: string,
  savedItems: SavedItem[],
  savedFolders?: CollectionFolder[]
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !uid) return { error: null };
  try {
    const bundle: Record<string, any> = {
      saved_items: savedItems,
      saved_plans: savedItems
    };
    if (savedFolders && savedFolders.length > 0) {
      bundle.saved_folders = savedFolders;
    }
    const res = await saveUserData(uid, bundle);
    return { error: res.error };
  } catch (err: any) {
    console.warn('syncSavedPlans error:', err);
    return { error: err?.message || String(err) };
  }
}

export async function fetchSavedPlans(uid: string): Promise<{
  savedItems: SavedItem[] | null;
  savedFolders: CollectionFolder[] | null;
}> {
  if (!isSupabaseConfigured || !uid) {
    return { savedItems: null, savedFolders: null };
  }
  try {
    const data = await fetchUserData(uid);
    if (data) {
      const savedItems = (data.saved_plans || data.saved_items || null) as SavedItem[] | null;
      const savedFolders = (data.saved_folders || null) as CollectionFolder[] | null;
      return { savedItems, savedFolders };
    }
  } catch (err) {
    console.warn('fetchSavedPlans error:', err);
  }
  return { savedItems: null, savedFolders: null };
}

// =====================================================================
// OUTINGS & PUBLIC PLANS SYNC (SUPABASE)
// =====================================================================
const OUTINGS_LOCAL_KEY = 'rada_outings_cache';

export async function fetchOutings(): Promise<OutingPlan[] | null> {
  if (!isSupabaseConfigured) {
    const cached = localStorage.getItem(OUTINGS_LOCAL_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  }

  try {
    const { data: outingsData, error: outingsError } = await supabase
      .from('outings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!outingsError && outingsData && outingsData.length > 0) {
      const outingIds = outingsData.map(o => o.id);
      const { data: attendeesData } = await supabase
        .from('outing_attendees')
        .select('*')
        .in('outing_id', outingIds);

      const attendeesMap: Record<string, OutingAttendee[]> = {};
      if (attendeesData) {
        attendeesData.forEach((att: any) => {
          const outId = att.outing_id;
          if (!attendeesMap[outId]) attendeesMap[outId] = [];
          attendeesMap[outId].push({
            id: String(att.id),
            outingId: att.outing_id,
            userId: att.user_id,
            userName: toHandle(att.user_handle || att.userHandle),
            userAvatar: att.user_avatar || att.userAvatar || '',
            userHandle: toHandle(att.user_handle || att.userHandle),
            status: att.status || 'pending',
            requestedAt: att.created_at || att.requestedAt || new Date().toISOString()
          });
        });
      }

      const formatted: OutingPlan[] = outingsData.map((row: any) => {
        const d = row.data && typeof row.data === 'object' ? row.data : {};
        const attList: OutingAttendee[] = (attendeesMap[row.id] || d.attendees || []).map((a: any) => {
          const ah = toHandle(a.userHandle || a.user_handle);
          return { ...a, userHandle: ah, userName: ah };
        });
        const hostH = toHandle(row.host_handle || d.hostHandle);
        return {
          id: String(row.id),
          hostId: row.host_id || d.hostId || 'anonymous',
          hostName: hostH,
          hostAvatar: row.host_avatar || d.hostAvatar || '',
          hostHandle: hostH,
          isHostVerified: row.is_host_verified ?? d.isHostVerified ?? true,
          spotId: row.spot_id || d.spotId,
          spotTitle: row.spot_title || d.spotTitle || 'Hangout Venue',
          spotAddress: row.spot_address || d.spotAddress || 'Nairobi',
          spotImage: row.spot_image || d.spotImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
          spotCategory: row.spot_category || d.spotCategory || 'hospitality',
          date: row.date || d.date || '2026-10-24',
          time: row.time || d.time || '18:00',
          maxAttendees: Number(row.max_attendees || d.maxAttendees || 6),
          currentAttendeesCount: attList.filter((a: any) => a.status === 'joined').length + 1,
          description: row.description || d.description || '',
          accessType: (row.access_type || d.accessType || 'open') as 'open' | 'singles_only',
          tags: row.tags || d.tags || ['All Plans', 'Group Hangouts'],
          status: row.status || d.status || 'active',
          createdAt: row.created_at || d.createdAt || new Date().toISOString(),
          attendees: attList
        };
      });

      localStorage.setItem(OUTINGS_LOCAL_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('fetchOutings failed or table not found:', err);
  }

  const cached = localStorage.getItem(OUTINGS_LOCAL_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return null;
}

export async function createOuting(rawOuting: OutingPlan): Promise<{ error: string | null; data?: OutingPlan }> {
  const hostH = toHandle(rawOuting.hostHandle);
  const outing: OutingPlan = { ...rawOuting, hostHandle: hostH, hostName: hostH };
  try {
    const cached = localStorage.getItem(OUTINGS_LOCAL_KEY);
    const list: OutingPlan[] = cached ? JSON.parse(cached) : [];
    const updated = [outing, ...list.filter(o => o.id !== outing.id)];
    localStorage.setItem(OUTINGS_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {}

  if (!isSupabaseConfigured) {
    return { error: null, data: outing };
  }

  try {
    const row = {
      id: outing.id,
      host_id: outing.hostId,
      host_name: outing.hostName,
      host_avatar: outing.hostAvatar,
      host_handle: outing.hostHandle,
      is_host_verified: outing.isHostVerified ?? false,
      spot_id: outing.spotId,
      spot_title: outing.spotTitle,
      spot_address: outing.spotAddress,
      spot_image: outing.spotImage,
      spot_category: outing.spotCategory,
      date: outing.date,
      time: outing.time,
      max_attendees: outing.maxAttendees,
      description: outing.description,
      access_type: outing.accessType,
      tags: outing.tags,
      status: outing.status || 'active',
      data: outing
    };

    const { error } = await supabase.from('outings').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('createOuting Supabase upsert note:', error.message);
    }
    return { error: null, data: outing };
  } catch (err: any) {
    console.warn('createOuting failed:', err);
    return { error: null, data: outing };
  }
}

export async function requestJoinOuting(
  outingId: string,
  rawAttendee: OutingAttendee
): Promise<{ error: string | null; attendee?: OutingAttendee }> {
  const attH = toHandle(rawAttendee.userHandle);
  const attendee: OutingAttendee = { ...rawAttendee, userHandle: attH, userName: attH };
  try {
    const cached = localStorage.getItem(OUTINGS_LOCAL_KEY);
    if (cached) {
      const list: OutingPlan[] = JSON.parse(cached);
      const updated = list.map(o => {
        if (o.id === outingId) {
          const existingAtts = o.attendees || [];
          const filtered = existingAtts.filter(a => a.userId !== attendee.userId && a.id !== attendee.id);
          const newAtts = [...filtered, attendee];
          return {
            ...o,
            attendees: newAtts,
            currentAttendeesCount: newAtts.filter(a => a.status === 'joined').length + 1
          };
        }
        return o;
      });
      localStorage.setItem(OUTINGS_LOCAL_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  if (!isSupabaseConfigured) {
    return { error: null, attendee };
  }

  try {
    const row = {
      id: attendee.id,
      outing_id: outingId,
      user_id: attendee.userId,
      user_name: attendee.userName,
      user_avatar: attendee.userAvatar,
      user_handle: attendee.userHandle,
      status: attendee.status,
      created_at: attendee.requestedAt
    };

    const { error } = await supabase.from('outing_attendees').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('requestJoinOuting Supabase note:', error.message);
    }
    return { error: null, attendee };
  } catch (err: any) {
    console.warn('requestJoinOuting error:', err);
    return { error: null, attendee };
  }
}

export async function updateOutingAttendeeStatus(
  attendeeId: string,
  status: 'pending' | 'joined' | 'approved' | 'declined'
): Promise<{ error: string | null }> {
  // Update local storage cache
  try {
    const cached = localStorage.getItem(OUTINGS_LOCAL_KEY);
    if (cached) {
      const list: OutingPlan[] = JSON.parse(cached);
      const updated = list.map(o => {
        if (o.attendees && o.attendees.some(a => a.id === attendeeId)) {
          const updatedAtts = o.attendees.map(a => a.id === attendeeId ? { ...a, status } : a);
          return {
            ...o,
            attendees: updatedAtts,
            currentAttendeesCount: updatedAtts.filter(a => a.status === 'joined' || a.status === 'approved').length + 1
          };
        }
        return o;
      });
      localStorage.setItem(OUTINGS_LOCAL_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  if (!isSupabaseConfigured) return { error: null };
  try {
    const { error } = await supabase.from('outing_attendees').update({ status }).eq('id', attendeeId);
    if (error) {
      console.warn('updateOutingAttendeeStatus Supabase error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}

/**
 * Automatically creates or updates a temporary Group Chat thread for an Outing when host approves an applicant
 */
export function createOrUnlockOutingGroupChat(
  rawOuting: OutingPlan,
  rawApplicant?: OutingAttendee
): ChatConversation[] {
  // Public surfaces (chat members, system messages) only ever carry @usernames
  const hostLabel = toHandle(rawOuting.hostHandle);
  const outing: OutingPlan = {
    ...rawOuting,
    hostName: hostLabel,
    attendees: (rawOuting.attendees || []).map(a => {
      const h = toHandle(a.userHandle);
      return { ...a, userHandle: h, userName: h };
    }),
  };
  const approvedApplicant: OutingAttendee | undefined = rawApplicant
    ? { ...rawApplicant, userHandle: toHandle(rawApplicant.userHandle), userName: toHandle(rawApplicant.userHandle) }
    : undefined;
  const CHATS_LOCAL_KEY = 'rada_conversations';
  let conversations: ChatConversation[] = [];
  try {
    const raw = localStorage.getItem(CHATS_LOCAL_KEY);
    if (raw) conversations = JSON.parse(raw);
  } catch (e) {}

  const chatId = `grp-outing-${outing.id}`;
  const existingIndex = conversations.findIndex(c => c.id === chatId);

  const confirmedNames = Array.from(new Set([
    outing.hostName,
    ...(approvedApplicant ? [approvedApplicant.userName] : []),
    ...(outing.attendees || [])
      .filter(a => a.status === 'approved' || a.status === 'joined')
      .map(a => a.userName)
  ]));

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (existingIndex >= 0) {
    const existing = conversations[existingIndex];
    const newMembers = Array.from(new Set([...(existing.members || []), ...confirmedNames]));
    const updatedMessages = [...existing.messages];
    if (approvedApplicant) {
      updatedMessages.push({
        id: `msg-appr-${Date.now()}`,
        sender: 'system',
        text: `👋 ${approvedApplicant.userName} was approved by ${outing.hostName}! Welcome to the group chat.`,
        time: timeStr
      });
    }

    const updatedConv: ChatConversation = {
      ...existing,
      members: newMembers,
      lastMessage: approvedApplicant 
        ? `${approvedApplicant.userName} joined the group` 
        : existing.lastMessage,
      messages: updatedMessages
    };

    conversations[existingIndex] = updatedConv;
  } else {
    const initialMessages = [
      {
        id: `msg-welcome-${Date.now()}`,
        sender: 'system' as const,
        text: `🎉 Temporary Group Chat unlocked for "${outing.spotTitle}" on ${outing.date} at ${outing.time}! Hosted by ${outing.hostName}.`,
        time: timeStr
      }
    ];

    if (approvedApplicant) {
      initialMessages.push({
        id: `msg-appr-${Date.now() + 1}`,
        sender: 'system' as const,
        text: `👋 ${approvedApplicant.userName} joined the hangout group! Connect with everyone before heading out.`,
        time: timeStr
      });
    }

    const newGroupConv: ChatConversation = {
      id: chatId,
      name: `Outing: ${outing.spotTitle}`,
      avatar: outing.spotImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      type: 'group',
      lastMessage: approvedApplicant 
        ? `${approvedApplicant.userName} joined the hangout` 
        : `Temporary group chat unlocked for ${outing.spotTitle}`,
      outingId: outing.id,
      outingTitle: outing.spotTitle,
      isTemporary: true,
      members: confirmedNames,
      messages: initialMessages
    };

    conversations = [newGroupConv, ...conversations];
  }

  try {
    localStorage.setItem(CHATS_LOCAL_KEY, JSON.stringify(conversations));
  } catch (e) {}

  return conversations;
}




// =====================================================================
// ADMIN CONTROL HUB
// =====================================================================
// NOTE: requireAdmin() is a client-side guard so the UI fails fast. It is NOT a security
// boundary. Enforce admin-only writes with Supabase RLS / RPCs (see admin_migration.sql).
async function requireAdmin(): Promise<{ uid: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { uid: null, error: 'Cloud sync is not configured.' };
  try {
    const { data } = await supabase.auth.getUser();
    const u: any = data?.user;
    if (!u) return { uid: null, error: 'You must be signed in.' };
    const role = u.app_metadata?.role || u.user_metadata?.role;
    if (!isPlatformAdmin({ email: u.email, role })) {
      return { uid: null, error: 'Admin access required.' };
    }
    return { uid: u.id as string, error: null };
  } catch (e) {
    return { uid: null, error: errMsg(e) };
  }
}

/** Upserts profile fields, degrading through the attempts when columns do not exist yet. */
async function upsertProfileFields(uid: string, attempts: Record<string, any>[]): Promise<string | null> {
  const now = new Date().toISOString();
  let lastError: string | null = null;
  for (const fields of attempts) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: uid, ...fields, updated_at: now }, { onConflict: 'id' });
      if (!error) return null;
      lastError = error.message;
      if (!isColumnError(error.message)) break;
    } catch (e) {
      lastError = errMsg(e);
      break;
    }
  }
  return lastError
    ? (isColumnError(lastError) ? `${lastError} (run admin_migration.sql to add the missing columns)` : lastError)
    : 'Update failed.';
}

// ---------- Platform metrics ----------
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const out: PlatformStats = {
    totalUsers: null,
    totalSpots: null,
    totalEvents: null,
    totalBusinesses: null,
    professionalHosts: null,
    unclaimedSpots: null,
  };
  if (!isSupabaseConfigured) return out;

  const count = async (build: () => any): Promise<number | null> => {
    try {
      const { count: c, error } = await build();
      return error ? null : (c ?? 0);
    } catch {
      return null;
    }
  };

  const [users, hosts, businesses, listings] = await Promise.all([
    count(() => supabase.from('profiles').select('*', { count: 'exact', head: true })),
    count(() =>
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('is_creator.eq.true,account_type.eq.professional')
    ),
    count(() => supabase.from('rada_businesses').select('*', { count: 'exact', head: true })),
    fetchListings(),
  ]);

  out.totalUsers = users;
  out.professionalHosts = hosts;
  out.totalBusinesses = businesses;
  if (listings) {
    out.totalSpots = listings.spot.length;
    out.totalEvents = listings.event.length;
    out.unclaimedSpots = listings.spot.filter((s: any) => s.is_claimed === false).length;
  }
  return out;
}

// ---------- Users ----------
/** Lists platform accounts for moderation. Pass businesses so merchants can be flagged. */
export async function fetchAdminUsers(businesses: BusinessAccount[] = []): Promise<AdminUserRecord[] | null> {
  const guard = await requireAdmin();
  if (guard.error) return null;

  let res: any = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (res.error) res = await supabase.from('profiles').select('*');
  if (res.error || !res.data) return null;

  const bizByOwner = new Map<string, string[]>();
  for (const b of businesses) {
    if (!b.ownerId) continue;
    bizByOwner.set(b.ownerId, [...(bizByOwner.get(b.ownerId) || []), b.id]);
  }

  return (res.data as any[]).map((row): AdminUserRecord => {
    const id = String(row.id);
    const businessIds = bizByOwner.get(id) || [];
    const email = row.email ? String(row.email) : undefined;
    const isOfficial = isOfficialAdmin(email);
    const isAdmin = isPlatformAdmin({ email, role: row.role });
    let permissions = row.admin_permissions || row.adminPermissions;
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch (_) {}
    }
    if (isAdmin && !permissions) {
      permissions = isOfficial ? SUPER_ADMIN_PERMISSIONS : DEFAULT_DELEGATED_PERMISSIONS;
    }
    return {
      id,
      name: cleanDisplayName(row.display_name || row.full_name || row.name || ''),
      username: row.username ? normalizeUsername(String(row.username)) : undefined,
      email,
      avatar: row.avatar_url || undefined,
      role: isAdmin ? 'admin' : businessIds.length > 0 || row.role === 'merchant' ? 'merchant' : 'user',
      isCreator: row.is_creator === true || row.account_type === 'professional',
      isMerchant: businessIds.length > 0,
      businessIds,
      isSuspended: row.is_suspended === true,
      suspendedReason: row.suspended_reason || undefined,
      suspendedAt: row.suspended_at || undefined,
      createdAt: row.created_at || undefined,
      isOfficialAdmin: isOfficial,
      adminPermissions: permissions,
    };
  });
}

/** Set or update a user's admin role and granular permission limits. */
export async function setUserAdminRole(
  uid: string,
  role: 'admin' | 'user',
  permissions?: AdminPermissions
): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  if (guard.uid === uid && role !== 'admin') {
    return 'You cannot revoke your own admin account.';
  }

  const now = new Date().toISOString();
  return upsertProfileFields(uid, [
    {
      role,
      admin_permissions: role === 'admin' ? (permissions || DEFAULT_DELEGATED_PERMISSIONS) : null,
      updated_at: now,
    },
    {
      role,
      updated_at: now,
    },
  ]);
}

/** Block / unblock an account. Enforce it in the app by calling fetchSuspensionState() after sign-in. */
export async function setUserSuspension(
  uid: string,
  suspended: boolean,
  reason?: string
): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  if (guard.uid === uid) return 'You cannot suspend your own admin account.';
  const now = new Date().toISOString();
  return upsertProfileFields(uid, [
    {
      is_suspended: suspended,
      suspended_reason: suspended ? (reason || null) : null,
      suspended_at: suspended ? now : null,
    },
    { is_suspended: suspended },
  ]);
}

/** Call after login / on app load so blocked accounts are signed out. */
export async function fetchSuspensionState(uid: string): Promise<{ suspended: boolean; reason?: string }> {
  if (!isSupabaseConfigured || !uid) return { suspended: false };
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    return data?.is_suspended === true
      ? { suspended: true, reason: data.suspended_reason || undefined }
      : { suspended: false };
  } catch {
    return { suspended: false };
  }
}

/** Removes professional (creator/host) status from another user. Does not touch the admin's own auth metadata. */
export async function revokeCreatorStatus(uid: string): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  return upsertProfileFields(uid, [
    { is_creator: false, account_type: 'personal', professional_since: null },
    { is_creator: false, account_type: 'personal' },
    { is_creator: false },
  ]);
}

/** Removes a merchant's verified status (sets the business back to rejected with a note). */
export async function revokeBusinessStatus(businessId: string, note?: string): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  return reviewBusiness(businessId, {
    verified: false,
    verificationStatus: 'rejected',
    verificationNote: note || 'Business status revoked by admin.',
    verifiedBy: 'admin',
  });
}

/**
 * Deletes an account's platform data (listings, businesses, saved data, profile). Removing the
 * auth.users record itself needs the service role, so it goes through the admin_delete_user RPC.
 */
export async function deleteAccountAdmin(
  uid: string
): Promise<{ error: string | null; authDeleted: boolean; warnings: string[] }> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error, authDeleted: false, warnings: [] };
  if (guard.uid === uid) return { error: 'You cannot delete your own admin account.', authDeleted: false, warnings: [] };

  const warnings: string[] = [];
  const step = async (label: string, run: () => PromiseLike<{ error: { message: string } | null }>) => {
    try {
      const { error } = await run();
      if (error) warnings.push(`${label}: ${error.message}`);
    } catch (e) {
      warnings.push(`${label}: ${errMsg(e)}`);
    }
  };

  await step('rada_listings', () => supabase.from('rada_listings').delete().eq('owner_id', uid));
  await step('spots', () => supabase.from('spots').delete().eq('merchant_id', uid));
  await step('rada_businesses', () => supabase.from('rada_businesses').delete().eq('owner_id', uid));
  await step('businesses', () => supabase.from('businesses').delete().eq('owner_id', uid));
  await step('rada_user_data', () => supabase.from('rada_user_data').delete().eq('user_id', uid));
  await step('profiles', () => supabase.from('profiles').delete().eq('id', uid));

  let authDeleted = false;
  try {
    const { error } = await supabase.rpc('admin_delete_user', { target_id: uid });
    if (error) warnings.push(`auth user: ${error.message}`);
    else authDeleted = true;
  } catch (e) {
    warnings.push(`auth user: ${errMsg(e)}`);
  }

  const profileFailed = warnings.some(w => w.startsWith('profiles:'));
  return {
    error: profileFailed && !authDeleted ? 'Could not delete the account. Check admin RLS policies.' : null,
    authDeleted,
    warnings,
  };
}

// ---------- Subscriptions ----------
export async function setBusinessSubscription(
  businessId: string,
  sub: { status: SubscriptionStatus; plan?: string; amount?: number; renewsAt?: string }
): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const patch = {
    subscriptionStatus: sub.status,
    subscriptionPlan: sub.plan,
    subscriptionAmount: sub.amount,
    subscriptionRenewsAt: sub.renewsAt,
  };
  try {
    const { data: row } = await supabase.from('rada_businesses').select('data').eq('id', businessId).maybeSingle();
    const merged = { ...(row?.data || {}), ...patch };
    let { error } = await supabase
      .from('rada_businesses')
      .update({
        data: merged,
        subscription_status: sub.status,
        subscription_plan: sub.plan ?? null,
        subscription_amount: sub.amount ?? null,
        subscription_renews_at: sub.renewsAt ?? null,
      })
      .eq('id', businessId);
    if (error && isColumnError(error.message)) {
      // Columns not migrated yet: keep the state inside the data blob so nothing is lost
      error = (await supabase.from('rada_businesses').update({ data: merged }).eq('id', businessId)).error;
    }
    return error ? error.message : null;
  } catch (e) {
    return errMsg(e);
  }
}

// ---------- Unclaimed spots ----------
/**
 * Publishes a fully built SpotItem (from the merchant-style spot form) as an admin listing:
 * no business, is_claimed = false, so a verified business can claim it later.
 */
export async function publishAdminSpot(spot: SpotItem): Promise<string | null> {
  const guard = await requireAdmin();
  if (guard.error || !guard.uid) return guard.error || 'Admin access required.';
  const stamped: SpotItem = {
    ...spot,
    businessId: undefined,
    merchantId: guard.uid,
    is_claimed: false,
    isAdminPublished: true,
    isUserUploaded: false,
  };
  return upsertListing('spot', stamped, null, guard.uid);
}

/**
 * Publishes an unclaimed spot using the Admin Dashboard form inputs.
 */
export async function publishUnclaimedSpot(
  input: UnclaimedSpotInput
): Promise<{ error: string | null; spot: SpotItem | null }> {
  const guard = await requireAdmin();
  if (guard.error || !guard.uid) return { error: guard.error || 'Admin access required.', spot: null };

  const id = Date.now();
  const spot: SpotItem = {
    id,
    title: input.title,
    category: input.category,
    neighborhood: input.neighborhood,
    address: input.address,
    description: input.description || '',
    phone: input.phone || '',
    openingHours: input.openingHours || '',
    price: input.price || 'KES 1,000 - 2,500',
    img: input.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    lat: input.lat ?? -1.2921,
    lng: input.lng ?? 36.8219,
    rating: '4.8',
    reviewCount: 0,
    reviews: [],
    is_claimed: false,
    isAdminPublished: true,
    isUserUploaded: false,
    merchantId: guard.uid,
    website: input.website,
    instagram: input.instagram,
    socialLinks: {
      website: input.website,
      instagram: input.instagram,
    },
  };

  const err = await upsertListing('spot', spot, null, guard.uid);
  if (err) return { error: err, spot: null };
  return { error: null, spot };
}

/** Spots still waiting for a merchant. Used by the admin list and by the merchant "Claim" search. */
export async function fetchUnclaimedSpots(query = ''): Promise<any[] | null> {
  let listings: CloudListings | null = null;
  try {
    listings = await fetchListings();
  } catch (e) {
    console.warn('fetchUnclaimedSpots: listings load failed', e);
  }
  const q = query.trim().toLowerCase();
  const matches = (s: any) =>
    !q || [s.title, s.neighborhood, s.address, s.category, s.subcategory, s.description]
      .some(v => String(v || '').toLowerCase().includes(q));

  const listingSpots: any[] = listings?.spot || [];
  const fromListings = listingSpots.filter((s: any) => {
    // Unclaimed = explicitly marked false or user-uploaded with no business
    const isUnclaimed = s.is_claimed === false || (s.isUserUploaded && !s.businessId);
    return isUnclaimed && matches(s);
  });

  // Real imported places from the Supabase `unclaimedspots` table (skip ones already claimed via a listing row)
  const knownIds = new Set(listingSpots.map((s: any) => String(s.id)));
  let imported: any[] = [];
  try {
    imported = (await loadUnclaimedSpots()).filter(s => !knownIds.has(String(s.id)) && matches(s));
  } catch (e) {
    console.warn('fetchUnclaimedSpots: unclaimedspots load failed', e);
  }
  return [...fromListings, ...imported];
}

/** A merchant claims an unclaimed spot for one of their businesses. */
export async function claimUnclaimedSpot(
  spotId: number | string,
  businessId: string,
  ownerId: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const safeOwner = isValidUuid(ownerId) ? ownerId : toValidUuid(ownerId);
  const safeBiz = isValidUuid(businessId) ? businessId : toValidUuid(businessId);
  if (!safeOwner) return 'you must be signed in to claim a spot';

  const rowId = listingUuid('spot', spotId);
  const now = new Date().toISOString();

  const { data: row, error: readErr } = await supabase
    .from('rada_listings')
    .select('data')
    .eq('id', rowId)
    .maybeSingle();
  if (readErr) return readErr.message;

  // Imported places live in `unclaimedspots`; on first claim, copy into rada_listings as a claimed spot.
  if (!row?.data && typeof spotId === 'string' && spotId.startsWith('unclaimed-')) {
    const rawId = spotId.slice('unclaimed-'.length);
    const { data: src, error: srcErr } = await supabase.from('unclaimedspots').select('*').eq('id', rawId).maybeSingle();
    if (srcErr) return srcErr.message;
    if (!src) return 'spot not found';
    const base = (await loadUnclaimedSpots()).find(s => String(s.id) === spotId);
    if (!base) return 'spot not found';
    const { reviews, reviewCount, rating, hasRealPhoto, ...spotData } = base as any;
    const claimedNew = {
      ...spotData,
      isUnclaimedImport: false,
      importedFrom: 'unclaimedspots',
      is_claimed: true,
      businessId,
      merchantId: safeOwner,
      claimedByBusinessId: businessId,
      claimedAt: now,
    };
    const { error: insErr } = await supabase.from('rada_listings').upsert({
      id: rowId,
      kind: 'spot',
      owner_id: safeOwner,
      business_id: safeBiz,
      data: claimedNew,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id' });
    return insErr ? insErr.message : null;
  }

  if (!row?.data) return 'spot not found';
  if (row.data.is_claimed !== false) return 'this spot has already been claimed';

  const claimed = {
    ...row.data,
    is_claimed: true,
    businessId,
    merchantId: safeOwner,
    claimedByBusinessId: businessId,
    claimedAt: now,
  };

  const { error } = await supabase
    .from('rada_listings')
    .update({ data: claimed, owner_id: safeOwner, business_id: safeBiz, updated_at: now })
    .eq('id', rowId);
  if (error) return error.message;

  if (typeof spotId === 'number') {
    try {
      let { error: sErr } = await supabase
        .from('spots')
        .update({ is_claimed: true, business_id: safeBiz, merchant_id: safeOwner, updated_at: now })
        .eq('id', spotId);
      if (sErr && isColumnError(sErr.message)) {
        await supabase.from('spots').update({ business_id: safeBiz, merchant_id: safeOwner, updated_at: now }).eq('id', spotId);
      }
    } catch (e) {
      console.warn('claimUnclaimedSpot spots update warning:', e);
    }
  }
  return null;
}

// ---------- Spot Claim Requests with Proof of Ownership ----------
export async function fetchSpotClaims(): Promise<SpotClaimRequest[]> {
  let localClaims: SpotClaimRequest[] = [];
  try {
    const raw = localStorage.getItem('rada_spot_claims');
    if (raw) localClaims = JSON.parse(raw);
  } catch {}

  if (!isSupabaseConfigured) return localClaims;

  try {
    const { data, error } = await supabase
      .from('rada_listings')
      .select('*')
      .eq('kind', 'spot_claim')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteClaims: SpotClaimRequest[] = data.map(r => r.data).filter(Boolean);
      const map = new Map<string, SpotClaimRequest>();
      for (const c of remoteClaims) map.set(c.id, c);
      for (const c of localClaims) {
        if (!map.has(c.id)) map.set(c.id, c);
      }
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn('fetchSpotClaims failed:', err);
  }

  return localClaims;
}

export async function submitSpotClaim(claim: SpotClaimRequest): Promise<string | null> {
  try {
    const raw = localStorage.getItem('rada_spot_claims');
    const existing: SpotClaimRequest[] = raw ? JSON.parse(raw) : [];
    const updated = [claim, ...existing.filter(c => c.id !== claim.id)];
    localStorage.setItem('rada_spot_claims', JSON.stringify(updated));
  } catch {}

  if (!isSupabaseConfigured) return null;

  try {
    const rowId = listingUuid('spot_claim', claim.id);
    const ownerId = claim.applicantUserId && isValidUuid(claim.applicantUserId) ? claim.applicantUserId : toValidUuid(claim.applicantUserId || 'guest');
    const bizId = isValidUuid(claim.businessId) ? claim.businessId : toValidUuid(claim.businessId);

    await supabase.from('rada_listings').upsert({
      id: rowId,
      kind: 'spot_claim',
      business_id: bizId,
      owner_id: ownerId,
      data: claim,
      created_at: claim.createdAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // Mark spot as hasPendingClaim in database
    const spotRowId = listingUuid('spot', claim.spotId);
    const { data: spotRow } = await supabase.from('rada_listings').select('data').eq('id', spotRowId).maybeSingle();
    if (spotRow?.data) {
      const patched = {
        ...spotRow.data,
        hasPendingClaim: true,
        pendingClaimId: claim.id,
        pendingClaimBusinessId: claim.businessId
      };
      await supabase.from('rada_listings').update({ data: patched }).eq('id', spotRowId);
    }
  } catch (err) {
    console.warn('submitSpotClaim remote sync warning:', err);
  }

  return null;
}

export async function reviewSpotClaim(
  claimId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  reviewedBy = 'admin'
): Promise<string | null> {
  const now = new Date().toISOString();
  let matchedClaim: SpotClaimRequest | null = null;
  try {
    const raw = localStorage.getItem('rada_spot_claims');
    if (raw) {
      const list: SpotClaimRequest[] = JSON.parse(raw);
      const updated = list.map(c => {
        if (c.id === claimId) {
          matchedClaim = {
            ...c,
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined,
            reviewedAt: now,
            reviewedBy
          };
          return matchedClaim;
        }
        return c;
      });
      localStorage.setItem('rada_spot_claims', JSON.stringify(updated));
    }
  } catch {}

  if (!isSupabaseConfigured) return null;

  try {
    const rowId = listingUuid('spot_claim', claimId);
    const { data: row } = await supabase.from('rada_listings').select('data').eq('id', rowId).maybeSingle();
    const existing = row?.data || matchedClaim;
    if (existing) {
      const patched = {
        ...existing,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        reviewedAt: now,
        reviewedBy
      };
      await supabase.from('rada_listings').update({ data: patched, updated_at: now }).eq('id', rowId);

      if (status === 'approved') {
        await claimUnclaimedSpot(existing.spotId, existing.businessId, existing.applicantUserId || 'admin');
      } else {
        const spotRowId = listingUuid('spot', existing.spotId);
        const { data: sRow } = await supabase.from('rada_listings').select('data').eq('id', spotRowId).maybeSingle();
        if (sRow?.data) {
          const sPatched = { ...sRow.data, hasPendingClaim: false };
          await supabase.from('rada_listings').update({ data: sPatched }).eq('id', spotRowId);
        }
      }
    }
  } catch (err) {
    console.warn('reviewSpotClaim remote sync warning:', err);
  }

  return null;
}

// =====================================================================
// COMMUNITY SPOT SUBMISSION & APPROVAL WORKFLOW
// =====================================================================

/**
 * Uploads a spot photo file to Supabase storage.
 * Tries 'spot-photos', then 'public', then 'rada-media'.
 * Falls back to base64 Data URL if storage bucket fails or offline.
 */
async function uploadSpotPhotoFile(file: File, uid: string): Promise<string> {
  const safeUid = uid || 'community';
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${safeUid}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;

  if (isSupabaseConfigured && supabase?.storage) {
    // Attempt 'spot-photos' bucket first as requested, then 'public', then 'rada-media'
    const targetBuckets = ['spot-photos', 'public', MEDIA_BUCKET];
    for (const bucket of targetBuckets) {
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });
        if (!error && data?.path) {
          const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            return pubData.publicUrl;
          }
        }
      } catch {
        // Try next bucket
      }
    }
  }

  // Resilient fallback: convert to base64 Data URL so photo is never lost
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * User Spot Submission:
 * - Uploads multiple image files to Supabase storage bucket ('spot-photos' or 'public')
 * - Extracts public image URLs and saves them as an array in the `photos` column
 * - Inserts listing with:
 *     status: 'pending_approval'
 *     is_claimed: false
 *     submitted_by_user_id: user.id
 */
export async function submitCommunitySpot(
  spotData: Partial<SpotItem>,
  imageFiles: File[] = []
): Promise<{ spot: SpotItem | null; error: string | null }> {
  try {
    let userId = spotData.submitted_by_user_id || '';
    let userEmail = spotData.submitted_by_email || '';
    let userName = spotData.submitted_by_name || '';

    if (isSupabaseConfigured && supabase?.auth) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          userId = userData.user.id;
          userEmail = userData.user.email || userEmail;
          userName = userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || userName;
        }
      } catch {}
    }

    if (!userId) {
      userId = toValidUuid('user-' + Date.now());
    }

    // 1. Upload all photo files in parallel
    const uploadedUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const url = await uploadSpotPhotoFile(file, userId);
        if (url) uploadedUrls.push(url);
      }
    }

    // Include existing photos / data URLs if passed in spotData
    const combinedPhotos = Array.from(new Set([
      ...uploadedUrls,
      ...(spotData.photos || []),
      ...(spotData.images || []),
      ...(spotData.img ? [spotData.img] : [])
    ])).filter(Boolean);

    const primaryImg = combinedPhotos[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
    const spotId = typeof spotData.id === 'number' ? spotData.id : Date.now();
    const now = new Date().toISOString();

    const newSpot: SpotItem = {
      id: spotId,
      title: spotData.title || 'Untitled Community Spot',
      category: spotData.category || 'restaurants_dining',
      neighborhood: spotData.neighborhood || 'Nairobi',
      address: spotData.address || `${spotData.neighborhood || 'Nairobi'}, Nairobi`,
      description: spotData.description || '',
      price: spotData.price || 'KES 1,000 - 2,500',
      tags: spotData.tags || [],
      photos: combinedPhotos,
      images: combinedPhotos.length > 0 ? combinedPhotos : [primaryImg],
      img: primaryImg,
      lat: spotData.lat ?? -1.2921,
      lng: spotData.lng ?? 36.8219,
      rating: 'New',
      reviewCount: 0,
      reviews: [],
      status: 'pending_approval',
      is_claimed: false,
      isUserUploaded: true,
      isAdminPublished: false,
      submitted_by_user_id: userId,
      submitted_by_name: userName || 'Community Explorer',
      submitted_by_email: userEmail || undefined,
      submittedAt: now,
    };

    // 2. Save locally so it's always accessible immediately
    try {
      const raw = localStorage.getItem('rada_community_spots');
      const existing: SpotItem[] = raw ? JSON.parse(raw) : [];
      const updated = [newSpot, ...existing.filter(s => String(s.id) !== String(newSpot.id))];
      localStorage.setItem('rada_community_spots', JSON.stringify(updated));
    } catch (e) {
      console.warn('Local community spot storage error:', e);
    }

    // 3. Insert into Supabase if configured
    if (isSupabaseConfigured && supabase) {
      const rowId = listingUuid('spot', newSpot.id);
      const safeOwnerId = isValidUuid(userId) ? userId : toValidUuid(userId);

      // Insert into rada_listings with kind 'spot' and status 'pending_approval'
      try {
        await supabase.from('rada_listings').upsert({
          id: rowId,
          kind: 'spot',
          owner_id: safeOwnerId,
          data: newSpot,
          created_at: now,
          updated_at: now,
        });
      } catch (err) {
        console.warn('rada_listings community spot insert error:', err);
      }

      // Try inserting into spots table
      try {
        await supabase.from('spots').insert({
          id: newSpot.id,
          title: newSpot.title,
          category: newSpot.category,
          neighborhood: newSpot.neighborhood,
          address: newSpot.address,
          description: newSpot.description,
          price: newSpot.price,
          img: newSpot.img,
          images: newSpot.images,
          photos: newSpot.photos,
          status: 'pending_approval',
          is_claimed: false,
          is_user_uploaded: true,
          submitted_by_user_id: isValidUuid(userId) ? userId : null,
          data: newSpot,
          created_at: now,
        });
      } catch (err) {
        console.warn('spots table community insert error:', err);
      }
    }

    return { spot: newSpot, error: null };
  } catch (err: any) {
    console.error('submitCommunitySpot error:', err);
    return { spot: null, error: err?.message || 'Failed to submit community spot' };
  }
}

/**
 * Fetch all pending user-submitted spots for Admin review.
 */
export async function fetchPendingUserSpots(): Promise<SpotItem[]> {
  const pendingMap = new Map<string, SpotItem>();

  // 1. Check local storage
  try {
    const raw = localStorage.getItem('rada_community_spots');
    if (raw) {
      const list: SpotItem[] = JSON.parse(raw);
      list.filter(s => s.status === 'pending_approval').forEach(s => pendingMap.set(String(s.id), s));
    }
  } catch {}

  // 2. Query Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: listingsData } = await supabase
        .from('rada_listings')
        .select('*')
        .eq('kind', 'spot')
        .order('created_at', { ascending: false });

      if (listingsData) {
        for (const row of listingsData) {
          const d = row.data as SpotItem;
          if (d && (d.status === 'pending_approval' || (row as any).status === 'pending_approval')) {
            pendingMap.set(String(d.id || row.id), {
              ...d,
              id: d.id || row.id,
              status: 'pending_approval',
              photos: d.photos || d.images || (d.img ? [d.img] : []),
            });
          }
        }
      }
    } catch (err) {
      console.warn('fetchPendingUserSpots rada_listings error:', err);
    }

    try {
      const { data: spotRows } = await supabase
        .from('spots')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (spotRows) {
        for (const row of spotRows) {
          const d = (row.data && typeof row.data === 'object' ? row.data : {}) as Partial<SpotItem>;
          const sid = String(row.id);
          const existing = pendingMap.get(sid);
          const spot: SpotItem = {
            id: row.id,
            title: row.title || d.title || 'Untitled Community Spot',
            category: row.category || d.category || 'restaurants_dining',
            neighborhood: row.neighborhood || d.neighborhood || 'Nairobi',
            address: row.address || d.address || '',
            description: row.description || d.description || '',
            price: row.price || d.price || 'KES $$',
            img: row.img || d.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
            images: Array.isArray(row.images) ? row.images : (d.images || [row.img || d.img]),
            photos: Array.isArray(row.photos) ? row.photos : (d.photos || row.images || [row.img]),
            tags: row.tags || d.tags || [],
            status: 'pending_approval',
            is_claimed: false,
            isUserUploaded: true,
            submitted_by_user_id: row.submitted_by_user_id || d.submitted_by_user_id,
            submitted_by_name: d.submitted_by_name || 'Community Explorer',
            submitted_by_email: d.submitted_by_email,
            submittedAt: row.created_at || d.submittedAt,
            lat: row.lat ?? d.lat ?? -1.2921,
            lng: row.lng ?? d.lng ?? 36.8219,
            rating: 'New',
            reviewCount: 0,
            reviews: [],
            ...existing,
            ...d,
          };
          pendingMap.set(sid, spot);
        }
      }
    } catch (err) {
      console.warn('fetchPendingUserSpots spots error:', err);
    }
  }

  return Array.from(pendingMap.values());
}

/**
 * Approve a user-submitted community spot:
 * - Sets status: 'approved'
 * - Makes it live on RADA
 */
export async function approveCommunitySpot(
  spotId: number | string
): Promise<{ spot: SpotItem | null; error: string | null }> {
  const now = new Date().toISOString();
  let approvedSpot: SpotItem | null = null;

  // 1. Update in local storage
  try {
    const raw = localStorage.getItem('rada_community_spots');
    if (raw) {
      const list: SpotItem[] = JSON.parse(raw);
      const updated = list.map(s => {
        if (String(s.id) === String(spotId)) {
          approvedSpot = {
            ...s,
            status: 'approved',
            is_claimed: false,
          };
          return approvedSpot;
        }
        return s;
      });
      localStorage.setItem('rada_community_spots', JSON.stringify(updated));
    }

    // Also add to rada_spots so it's live
    if (approvedSpot) {
      const rawSpots = localStorage.getItem('rada_spots');
      const curSpots: SpotItem[] = rawSpots ? JSON.parse(rawSpots) : [];
      const updatedLive = [approvedSpot, ...curSpots.filter(s => String(s.id) !== String(spotId))];
      localStorage.setItem('rada_spots', JSON.stringify(updatedLive));
    }
  } catch (err) {
    console.warn('approveCommunitySpot local error:', err);
  }

  // 2. Update in Supabase
  if (isSupabaseConfigured && supabase) {
    const rowId = listingUuid('spot', spotId);
    try {
      const { data: row } = await supabase.from('rada_listings').select('data').eq('id', rowId).maybeSingle();
      if (row?.data) {
        approvedSpot = {
          ...row.data,
          status: 'approved',
          is_claimed: false,
        };
        await supabase.from('rada_listings').update({
          data: approvedSpot,
          updated_at: now,
        }).eq('id', rowId);
      }
    } catch (err) {
      console.warn('approveCommunitySpot rada_listings error:', err);
    }

    try {
      await supabase.from('spots').update({
        status: 'approved',
        is_claimed: false,
        updated_at: now,
      }).eq('id', spotId);
    } catch (err) {
      console.warn('approveCommunitySpot spots table error:', err);
    }
  }

  return { spot: approvedSpot, error: null };
}

/**
 * Reject a user-submitted community spot:
 * - Deletes or sets status: 'rejected'
 */
export async function rejectCommunitySpot(
  spotId: number | string,
  reason?: string
): Promise<{ success: boolean; error: string | null }> {
  const now = new Date().toISOString();

  // 1. Update local storage
  try {
    const raw = localStorage.getItem('rada_community_spots');
    if (raw) {
      const list: SpotItem[] = JSON.parse(raw);
      const updated = list.map(s => {
        if (String(s.id) === String(spotId)) {
          return {
            ...s,
            status: 'rejected',
            rejectionReason: reason || 'Not approved for publication',
          };
        }
        return s;
      });
      localStorage.setItem('rada_community_spots', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('rejectCommunitySpot local error:', err);
  }

  // 2. Update Supabase
  if (isSupabaseConfigured && supabase) {
    const rowId = listingUuid('spot', spotId);
    try {
      const { data: row } = await supabase.from('rada_listings').select('data').eq('id', rowId).maybeSingle();
      if (row?.data) {
        const rejected = {
          ...row.data,
          status: 'rejected',
          rejectionReason: reason || 'Not approved for publication',
        };
        await supabase.from('rada_listings').update({
          data: rejected,
          updated_at: now,
        }).eq('id', rowId);
      }
    } catch (err) {
      console.warn('rejectCommunitySpot rada_listings error:', err);
    }

    try {
      await supabase.from('spots').update({
        status: 'rejected',
        updated_at: now,
      }).eq('id', spotId);
    } catch (err) {
      console.warn('rejectCommunitySpot spots table error:', err);
    }
  }

  return { success: true, error: null };
}


