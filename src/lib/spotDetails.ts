import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { listingUuid } from './cloudSync';

export interface SpotDetailsRow {
  spot_id: string;
  activities: any[] | null;
  equipment: any[] | null;
  pricing: any[] | null;
  price_min_kes: number | null;
  price_max_kes: number | null;
  payment_methods: string[] | null;
  menu_url: string | null;
  menu_items: any[] | null;
  menu_photos: any[] | null;
  reservation_policy: 'not_needed' | 'recommended' | 'required' | null;
  reservation_url: string | null;
  reservation_phone: string | null;
  reservation_whatsapp: string | null;
  reservation_notes: string | null;
  source: string | null;
  verified: boolean | null;
  last_verified_at: string | null;
}

/** App spot id -> spot_details.spot_id. "unclaimed-<uuid>" -> <uuid>; other ids use the same uuid as rada_listings. */
export function spotDetailsKey(spotId: string | number): string {
  const s = String(spotId);
  if (s.startsWith('unclaimed-')) return s.slice('unclaimed-'.length);
  return listingUuid('spot', s);
}

const cache = new Map<string, SpotDetailsRow | null>();
const inflight = new Map<string, Promise<SpotDetailsRow | null>>();

export function fetchSpotDetails(spotId: string | number, force = false): Promise<SpotDetailsRow | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  const key = spotDetailsKey(spotId);
  if (!force && cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  if (!force && inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    try {
      const { data, error } = await supabase.from('spot_details').select('*').eq('spot_id', key).maybeSingle();
      if (error) { console.warn('spot_details read failed:', error.message); return null; }
      cache.set(key, (data as SpotDetailsRow) ?? null);
      return (data as SpotDetailsRow) ?? null;
    } catch (e) {
      console.warn('spot_details read failed:', e);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function useSpotDetails(spotId?: string | number | null): SpotDetailsRow | null {
  const [row, setRow] = useState<SpotDetailsRow | null>(null);
  useEffect(() => {
    let off = false;
    setRow(null);
    if (spotId == null || spotId === '') return;
    fetchSpotDetails(spotId).then(r => { if (!off) setRow(r); });
    return () => { off = true; };
  }, [spotId]);
  return row;
}

// ---------------------------------------------------------------- owner form model
export interface MenuRow { name: string; section: string; price: string; description: string }
export interface PriceRow { label: string; amount: string; unit: string; note: string }
export interface ActivityRow { name: string; description: string; price: string; priceNote: string; durationMin: string }
export interface EquipRow { name: string; provided: boolean; rental: string; note: string }

export interface SpotDetailsForm {
  menuUrl: string;
  menuItems: MenuRow[];
  pricing: PriceRow[];
  activities: ActivityRow[];
  equipment: EquipRow[];
  priceMin: string;
  priceMax: string;
  payments: string;
  reservationPolicy: '' | 'not_needed' | 'recommended' | 'required';
  reservationUrl: string;
  reservationPhone: string;
  reservationWhatsapp: string;
  reservationNotes: string;
}

export const emptySpotDetailsForm = (): SpotDetailsForm => ({
  menuUrl: '', menuItems: [], pricing: [], activities: [], equipment: [],
  priceMin: '', priceMax: '', payments: '',
  reservationPolicy: '', reservationUrl: '', reservationPhone: '', reservationWhatsapp: '', reservationNotes: '',
});

const s = (v: any) => (v === null || v === undefined ? '' : String(v));
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const toInt = (v: string): number | null => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && /\d/.test(t) ? Math.round(n) : null;
};
const nz = (v: string): string | null => (v.trim() ? v.trim() : null);

export function rowToForm(row: SpotDetailsRow | null): SpotDetailsForm {
  if (!row) return emptySpotDetailsForm();
  return {
    menuUrl: s(row.menu_url),
    menuItems: arr(row.menu_items).map(m => ({ name: s(m?.name), section: s(m?.section), price: s(m?.price_kes), description: s(m?.description) })),
    pricing: arr(row.pricing).map(p => ({ label: s(p?.label), amount: s(p?.amount_kes), unit: s(p?.unit), note: s(p?.note) })),
    activities: arr(row.activities).map(a => ({ name: s(a?.name), description: s(a?.description), price: s(a?.price_kes), priceNote: s(a?.price_note), durationMin: s(a?.duration_min) })),
    equipment: arr(row.equipment).map(e => ({ name: s(e?.name), provided: e?.provided !== false, rental: s(e?.rental_price_kes), note: s(e?.note) })),
    priceMin: s(row.price_min_kes),
    priceMax: s(row.price_max_kes),
    payments: arr(row.payment_methods).join(', '),
    reservationPolicy: (row.reservation_policy as any) || '',
    reservationUrl: s(row.reservation_url),
    reservationPhone: s(row.reservation_phone),
    reservationWhatsapp: s(row.reservation_whatsapp),
    reservationNotes: s(row.reservation_notes),
  };
}

/** Only real data the owner already typed in the old form (nothing invented). */
export function formFromLegacySpot(spot: any): SpotDetailsForm {
  const f = emptySpotDetailsForm();
  f.menuUrl = /^https?:\/\//i.test(s(spot?.menuUploadUrl)) ? s(spot.menuUploadUrl) : '';
  f.menuItems = arr(spot?.menuItems).filter(m => s(m?.name).trim()).map(m => ({
    name: s(m.name), section: s(m.category), price: s(m.price).replace(/[^0-9.]/g, ''), description: s(m.description),
  }));
  return f;
}

export function hasAnyDetails(f: SpotDetailsForm): boolean {
  return !!(f.menuUrl.trim() || f.menuItems.some(m => m.name.trim()) || f.pricing.some(p => p.label.trim()) ||
    f.activities.some(a => a.name.trim()) || f.equipment.some(e => e.name.trim()) || f.priceMin.trim() || f.priceMax.trim() ||
    f.payments.trim() || f.reservationPolicy || f.reservationUrl.trim() || f.reservationPhone.trim() ||
    f.reservationWhatsapp.trim() || f.reservationNotes.trim());
}

export function formToPayload(f: SpotDetailsForm) {
  return {
    menu_url: nz(f.menuUrl),
    menu_items: f.menuItems.filter(m => m.name.trim()).map(m => ({ name: m.name.trim(), section: nz(m.section), price_kes: toInt(m.price), description: nz(m.description) })),
    pricing: f.pricing.filter(p => p.label.trim()).map(p => ({ label: p.label.trim(), amount_kes: toInt(p.amount), unit: nz(p.unit), note: nz(p.note) })),
    activities: f.activities.filter(a => a.name.trim()).map(a => ({ name: a.name.trim(), description: nz(a.description), price_kes: toInt(a.price), price_note: nz(a.priceNote), duration_min: toInt(a.durationMin) })),
    equipment: f.equipment.filter(e => e.name.trim()).map(e => ({ name: e.name.trim(), provided: e.provided, rental_price_kes: toInt(e.rental), note: nz(e.note) })),
    price_min_kes: toInt(f.priceMin),
    price_max_kes: toInt(f.priceMax),
    payment_methods: f.payments.split(',').map(x => x.trim()).filter(Boolean),
    reservation_policy: f.reservationPolicy || null,
    reservation_url: nz(f.reservationUrl),
    reservation_phone: nz(f.reservationPhone),
    reservation_whatsapp: nz(f.reservationWhatsapp),
    reservation_notes: nz(f.reservationNotes),
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Upserts spot_details as verified. Retries a few times because the rada_listings row (needed by the
 * owner RLS policy for newly created spots) may still be saving.
 */
export async function saveSpotDetails(
  spotId: string | number,
  form: SpotDetailsForm,
  source: 'owner' | 'manual' = 'owner',
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const key = spotDetailsKey(spotId);
  const now = new Date().toISOString();
  const row = { spot_id: key, ...formToPayload(form), source, verified: true, last_verified_at: now, updated_at: now };
  let lastErr: string | null = null;
  for (const wait of [0, 1500, 4000]) {
    if (wait) await sleep(wait);
    const { error } = await supabase.from('spot_details').upsert(row, { onConflict: 'spot_id' });
    if (!error) { cache.delete(key); return null; }
    lastErr = error.message;
    if (error.code !== '42501' && !/row-level security/i.test(error.message)) break;
  }
  console.warn('spot_details save failed:', lastErr);
  return lastErr;
}
