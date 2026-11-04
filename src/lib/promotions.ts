/**
 * Promo packs. Flow: owner requests -> admin approves and sets the order -> owner pays -> it shows in the
 * offers/promotions sections in that order. Prices, slots and rules live in Postgres; this file only reads and displays.
 * Promoted items are NOT labelled in the app on purpose.
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { listingUuid } from './cloudSync';

export type PromoPlacement = 'spotlight' | 'home_top10' | 'home_11_20' | 'event_boost' | 'spots_category';
export type PromoTargetType = 'business' | 'spot' | 'listing' | 'outing';
export type PromoStatus =
  | 'draft' | 'requested' | 'approved' | 'pending_payment' | 'scheduled' | 'active' | 'paused' | 'completed' | 'refunded' | 'rejected';

export interface PromoProduct {
  id: string;
  name: string;
  description: string | null;
  audience: 'merchant' | 'creator' | 'both';
  placement: PromoPlacement;
  price_kes: number | null;
  duration_days: number;
  start_dow: number | null;
  slots: number | null;
  needs_category: boolean;
  active: boolean;
  sort: number;
  auto_approve?: boolean;
}

export interface Promotion {
  id: string;
  owner_id: string;
  product_id: string;
  target_type: PromoTargetType;
  target_id: string;
  target_title: string;
  category: string | null;
  zone: string | null;
  start_date: string;
  end_date: string;
  amount_kes: number;
  status: PromoStatus;
  payment_receipt: string | null;
  admin_note: string | null;
  slot_order: number | null;
  created_at: string;
}

export interface ActivePromo {
  promo_id: string;
  placement: PromoPlacement;
  target_type: PromoTargetType;
  target_id: string;
  target_title: string;
  category: string | null;
  zone: string | null;
  owner_id: string;
  slot_order: number | null;
}

export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const STATUS_LABEL: Record<PromoStatus, string> = {
  draft: 'Draft',
  requested: 'Waiting for approval',
  approved: 'Approved · pay to go live',
  pending_payment: 'Awaiting payment',
  scheduled: 'Scheduled',
  active: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  refunded: 'Refunded',
  rejected: 'Rejected',
};

export async function fetchPromoProducts(): Promise<PromoProduct[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('promo_products').select('*').eq('active', true).order('sort');
  if (error) throw new Error(error.message);
  return (data as PromoProduct[]) || [];
}

export async function fetchMyPromotions(): Promise<Promotion[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Promotion[]) || [];
}

export interface PromoRequest {
  product: string;
  targetType: PromoTargetType;
  targetId: string;
  targetTitle: string;
  category?: string | null;
  zone?: string | null;
  start: string; // YYYY-MM-DD
}

export async function requestPromotion(r: PromoRequest): Promise<Promotion> {
  const { data, error } = await supabase.rpc('request_promotion', {
    p_product: r.product,
    p_target_type: r.targetType,
    p_target_id: r.targetId,
    p_target_title: r.targetTitle,
    p_category: r.category ?? null,
    p_zone: r.zone ?? null,
    p_start: r.start,
  });
  if (error) throw new Error(error.message);
  return data as Promotion;
}

export async function cancelMyPromotion(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_my_promotion', { p_id: id });
  if (error) throw new Error(error.message);
}

export interface PromotionReport {
  promotion_id: string;
  start_date: string;
  end_date: string;
  status: PromoStatus;
  counts: Record<string, number>;
  note: string;
}

export async function fetchPromotionReport(id: string): Promise<PromotionReport> {
  const { data, error } = await supabase.rpc('get_promotion_report', { p_id: id });
  if (error) throw new Error(error.message);
  return data as PromotionReport;
}

export async function fetchActivePromotions(placement?: PromoPlacement, category?: string | null): Promise<ActivePromo[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_active_promotions', {
    p_placement: placement ?? null,
    p_category: category ?? null,
  });
  if (error) return [];
  return (data as ActivePromo[]) || [];
}

/** Active sponsored slots for a placement. Fails quiet: a missing promo list never hides real content. */
export function useActivePromotions(placement?: PromoPlacement, category?: string | null) {
  const [promos, setPromos] = useState<ActivePromo[]>([]);
  useEffect(() => {
    let live = true;
    fetchActivePromotions(placement, category).then((p) => live && setPromos(p)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [placement, category]);
  return promos;
}

export const priceLabel = (kes: number | null | undefined) => (kes == null ? 'Not priced' : `KES ${kes.toLocaleString('en-KE')}`);

/** Next date (YYYY-MM-DD, Nairobi) that falls on `dow`, or today when the pack has no fixed start day. */
export function nextStartDate(dow: number | null): string {
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  if (dow !== null) today.setDate(today.getDate() + ((dow - today.getDay() + 7) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}


/** Owner pays for an APPROVED promotion via M-Pesa (see startPromotionPayment in payments.ts). */
export { startPromotionPayment as startPromoPayment } from './payments';

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export interface AdminPromotion {
  id: string;
  owner_id: string;
  owner_label: string;
  product_id: string;
  product_name: string;
  placement: PromoPlacement;
  target_type: PromoTargetType;
  target_id: string;
  target_title: string;
  category: string | null;
  zone: string | null;
  start_date: string;
  end_date: string;
  amount_kes: number;
  status: PromoStatus;
  slot_order: number | null;
  payment_receipt: string | null;
  admin_note: string | null;
  created_at: string;
}

export async function adminListPromotions(status?: PromoStatus | null): Promise<AdminPromotion[]> {
  const { data, error } = await supabase.rpc('admin_list_promotions', { p_status: status ?? null, p_limit: 200 });
  if (error) throw new Error(error.message);
  return (data as AdminPromotion[]) || [];
}

export async function adminReviewPromotion(id: string, decision: 'approve' | 'reject', order?: number | null, note?: string | null) {
  const { error } = await supabase.rpc('admin_review_promotion', { p_id: id, p_decision: decision, p_order: order ?? null, p_note: note ?? null });
  if (error) throw new Error(error.message);
}

export async function adminReorderPromotions(ids: string[]) {
  const { error } = await supabase.rpc('admin_reorder_promotions', { p_ids: ids });
  if (error) throw new Error(error.message);
}

export async function adminConfirmPayment(id: string, receipt: string) {
  const { error } = await supabase.rpc('admin_set_promotion_status', { p_id: id, p_status: 'active', p_note: null, p_receipt: receipt });
  if (error) throw new Error(error.message);
}

export interface AdminPromotionEdit {
  targetTitle?: string | null;
  category?: string | null;
  zone?: string | null;
  start?: string | null; // YYYY-MM-DD
  end?: string | null;
  status?: PromoStatus | null;
  amountKes?: number | null;
  slotOrder?: number | null;
  note?: string | null;
}

/** Edit any promotion, whatever its status (approved and live ones included). Omitted fields stay as they are. */
export async function adminUpdatePromotion(id: string, e: AdminPromotionEdit) {
  const { error } = await supabase.rpc('admin_update_promotion', {
    p_id: id,
    p_target_title: e.targetTitle ?? null,
    p_category: e.category ?? null,
    p_zone: e.zone ?? null,
    p_start: e.start ?? null,
    p_end: e.end ?? null,
    p_status: e.status ?? null,
    p_amount_kes: e.amountKes ?? null,
    p_slot_order: e.slotOrder ?? null,
    p_note: e.note ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Take a promotion off the app but keep the record (it can be switched back on by editing its status). */
export async function adminRemovePromotion(id: string, note?: string | null) {
  const { error } = await supabase.rpc('admin_remove_promotion', { p_id: id, p_note: note ?? null });
  if (error) throw new Error(error.message);
}

/** Delete for good. A promotion with a confirmed payment needs force = true (the payment record is kept, unlinked). */
export async function adminDeletePromotion(id: string, force = false) {
  const { error } = await supabase.rpc('admin_delete_promotion', { p_id: id, p_force: force });
  if (error) throw new Error(error.message);
}

export const isPaidDeleteError = (e: unknown) => String((e as any)?.message || '').startsWith('PAID:');

// Offer schedule text (shown on the offer card as "Fri & Sat · 5–8pm · until 20 Nov") ---------------------------
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const AUDIENCES = ['Everyone', 'Friends & groups', 'Couples', 'Families', 'Students', 'Women', 'Professionals', '18+ only'];

const fmtTime = (t?: string) => {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  if (Number.isNaN(hh)) return '';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh >= 12 ? 'pm' : 'am'}`;
};
const fmtDay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function offerScheduleText(o: { startsAt?: string; endsAt?: string; startTime?: string; endTime?: string; daysOfWeek?: number[] }): string {
  const days = [...new Set(o.daysOfWeek || [])].sort((a, b) => a - b);
  const dayText = days.length === 0 || days.length === 7 ? (days.length === 7 ? 'Every day' : '') : days.map((d) => DOW_SHORT[d]).join(', ');
  const t1 = fmtTime(o.startTime), t2 = fmtTime(o.endTime);
  const time = t1 && t2 ? `${t1}–${t2}` : t1 ? `from ${t1}` : t2 ? `until ${t2}` : '';
  const a = fmtDay(o.startsAt), b = fmtDay(o.endsAt);
  const range = a && b ? (a === b ? a : `${a} – ${b}`) : b ? `until ${b}` : a ? `from ${a}` : '';
  return [dayText, time, range].filter(Boolean).join(' · ');
}

// Offers (the promos businesses post on the Home feed) ----------------------------------------------------------
export interface AdminOffer {
  id: string;
  owner_id: string;
  owner_label: string;
  business_name: string | null;
  title: string;
  description: string | null;
  status: string | null;
  data: Record<string, any>;
  created_at: string;
  boosted: boolean;
}

export async function adminListOffers(search?: string | null): Promise<AdminOffer[]> {
  const { data, error } = await supabase.rpc('admin_list_offers', { p_search: search || null, p_limit: 200 });
  if (error) throw new Error(error.message);
  return (data as AdminOffer[]) || [];
}

/** `patch` is merged into the offer's stored JSON; status 'draft' hides it, 'published' shows it. */
export async function adminUpdateOffer(id: string, patch: Record<string, any>, status?: 'published' | 'draft' | null) {
  const { error } = await supabase.rpc('admin_update_offer', { p_id: id, p_patch: patch, p_status: status ?? null });
  if (error) throw new Error(error.message);
}

export async function adminRemoveOffer(id: string, note?: string | null) {
  const { error } = await supabase.rpc('admin_remove_offer', { p_id: id, p_note: note ?? null });
  if (error) throw new Error(error.message);
}

export async function adminDeleteOffer(id: string) {
  const { error } = await supabase.rpc('admin_delete_offer', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function adminSetAutoApprove(productId: string, on: boolean) {
  const { error } = await supabase.from('promo_products').update({ auto_approve: on }).eq('id', productId);
  if (error) throw new Error(error.message);
}

export async function adminFetchAllProducts(): Promise<PromoProduct[]> {
  const { data, error } = await supabase.from('promo_products').select('*').order('sort');
  if (error) throw new Error(error.message);
  return (data as PromoProduct[]) || [];
}

// ---------------------------------------------------------------------------
// Ordering used by the offers/promotions sections (no labels, order only)
// ---------------------------------------------------------------------------
const PLACEMENT_TIER: Record<PromoPlacement, number> = { home_top10: 0, home_11_20: 1, spotlight: 2, spots_category: 3, event_boost: 4 };

/** Map of business id -> rank (lower = earlier). Only business promotions with a home placement count. */
export function businessRankMap(promos: ActivePromo[]): Map<string, number> {
  const sorted = promos
    .filter((p) => p.target_type === 'business' && p.placement !== 'event_boost' && p.placement !== 'spots_category')
    .sort((a, b) => PLACEMENT_TIER[a.placement] - PLACEMENT_TIER[b.placement] || (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9));
  const out = new Map<string, number>();
  sorted.forEach((p, i) => { if (!out.has(p.target_id)) out.set(p.target_id, i); });
  return out;
}

/** Packs that boost ONE promo (offer) on the Home feed. Matches request_promotion() in Postgres. */
export const PROMO_BOOST_PLACEMENTS: PromoPlacement[] = ['home_top10', 'home_11_20', 'spotlight'];

/** The id a promo (offer) has on the server, and what a boost stores as its target. */
export const offerPromoKey = (offerId: string | number): string => listingUuid('offer', offerId);

/** Map of promo (offer) server id -> rank (lower = earlier). Only boosts aimed at a single promo count. */
export function offerRankMap(promos: ActivePromo[]): Map<string, number> {
  const sorted = promos
    .filter((p) => p.target_type === 'listing' && PROMO_BOOST_PLACEMENTS.includes(p.placement))
    .sort((a, b) => PLACEMENT_TIER[a.placement] - PLACEMENT_TIER[b.placement] || (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9));
  const out = new Map<string, number>();
  sorted.forEach((p, i) => { if (!out.has(p.target_id)) out.set(p.target_id, i); });
  return out;
}

/**
 * Order used by the offers lists: promoted businesses first, in the admin-chosen order (newest first within
 * the same business); then every other item from latest to earliest. Nothing is hidden.
 */
export function sortByPromotion<T>(
  items: T[],
  businessIdOf: (x: T) => string | undefined,
  ranks: Map<string, number>,
  createdAtOf?: (x: T) => string | undefined
): T[] {
  const time = (x: T) => {
    const t = createdAtOf ? Date.parse(createdAtOf(x) || '') : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return items
    .map((x, i) => ({ x, i, r: ranks.get(String(businessIdOf(x) ?? '')) ?? Infinity, t: time(x) }))
    .sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;           // promoted first, in the chosen order
      if (a.t !== b.t) return b.t - a.t;           // then latest to earliest
      return a.i - b.i;                            // undated items keep their order
    })
    .map((o) => o.x);
}

/** Map of outing id -> rank for approved outing boosts, in the admin-chosen order. */
export function outingRankMap(promos: ActivePromo[]): Map<string, number> {
  const out = new Map<string, number>();
  promos
    .filter((p) => p.target_type === 'outing' && p.placement === 'event_boost')
    .sort((a, b) => (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9))
    .forEach((p, i) => { if (!out.has(p.target_id)) out.set(p.target_id, i); });
  return out;
}

/** Boosted outings first in the chosen order; the rest keep the order they already had. */
export function sortOutingsByPromotion<T>(items: T[], idOf: (x: T) => string | number, ranks: Map<string, number>): T[] {
  if (ranks.size === 0) return items;
  return items
    .map((x, i) => ({ x, i, r: ranks.get(String(idOf(x))) ?? Infinity }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map((o) => o.x);
}

/** Make ids from claims and from the feed comparable ('unclaimed-123' and '123' are the same spot). */
const cleanSpotId = (id: unknown) => String(id ?? '').replace(/^unclaimed-/, '').replace(/^scraped-/, '');

/**
 * Spots tab category slots: inside one category, spots whose business (or claimed spot) holds an active
 * "Spots tab category slot" for that category come first, in the admin-chosen order. Everything else keeps
 * the order it already had. No labels are added anywhere.
 */
export function sortSpotsByCategoryPromotion<T extends { id?: string | number; businessId?: string | number | null }>(
  items: T[],
  categoryId: string,
  promos: ActivePromo[]
): T[] {
  const cat = (categoryId || '').toLowerCase();
  const mine = promos
    .filter((p) => p.placement === 'spots_category' && (!p.category || p.category.toLowerCase() === cat))
    .sort((a, b) => (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9));
  if (mine.length === 0 || items.length === 0) return items;

  const byBusiness = new Map<string, number>();
  const bySpot = new Map<string, number>();
  mine.forEach((p, i) => {
    if (p.target_type === 'business' && !byBusiness.has(String(p.target_id))) byBusiness.set(String(p.target_id), i);
    if (p.target_type === 'spot' && !bySpot.has(cleanSpotId(p.target_id))) bySpot.set(cleanSpotId(p.target_id), i);
  });

  const rankOf = (x: T) => {
    const a = x.businessId != null ? byBusiness.get(String(x.businessId)) : undefined;
    const b = bySpot.get(cleanSpotId(x.id));
    return Math.min(a ?? Infinity, b ?? Infinity);
  };
  return items
    .map((x, i) => ({ x, i, r: rankOf(x) }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map((o) => o.x);
}
