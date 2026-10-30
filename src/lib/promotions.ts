/**
 * Promo packs. Prices, slots and rules live in Postgres (promo_products + request_promotion);
 * this file only reads and displays. Delivery is always labelled "Sponsored" and is not a guaranteed result.
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type PromoPlacement = 'spotlight' | 'home_top10' | 'home_11_20' | 'event_boost' | 'spots_category';
export type PromoTargetType = 'business' | 'spot' | 'listing' | 'outing';
export type PromoStatus =
  | 'draft' | 'pending_payment' | 'scheduled' | 'active' | 'paused' | 'completed' | 'refunded' | 'rejected';

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
}

export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const STATUS_LABEL: Record<PromoStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Awaiting payment',
  scheduled: 'Scheduled',
  active: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  refunded: 'Refunded',
  rejected: 'Rejected',
};

export const SPONSORED_LABEL = 'Sponsored';

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
