/**
 * Host-side ticketing. Every rule (plan check, price lock after sales, attendee caps,
 * payout number, commission) is enforced in the database; this file only calls it.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { normalizeKenyanPhone } from './payments';
import { siteOrigin } from './siteUrl';

export type TicketSource = 'outing' | 'event';

export interface HostTicketType {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  quantity: number;
  sold: number;
  status: 'on_sale' | 'paused' | string;
  sales_end: string | null;
  max_per_order: number;
  checked_in: number;
  gross_kes: number;
  commission_kes: number;
  net_kes: number;
  commission_pct: number;
}

export interface HostAttendee {
  ticket_id: string;
  type_name: string;
  status: string;
  checked_in_at: string | null;
  name: string;
}

export interface HostTicketView {
  paid_enabled: boolean;
  types: HostTicketType[];
  attendees: HostAttendee[];
}

export interface NewTicketType {
  name: string;
  description?: string;
  price_kes: number;
  quantity: number;
  max_per_order?: number;
  sales_end?: string | null;
}

function fail(error: any, fallback: string): never {
  throw new Error(String(error?.message || fallback).replace(/^.*?:\s*/, (m) => (m.length > 40 ? '' : m)));
}

export async function canSellTickets(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('can_sell_tickets');
  return !error && data === true;
}

export async function getMyPayoutPhone(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('my_payout_phone');
  return error ? null : ((data as string) || null);
}

export async function savePayoutPhone(input: string): Promise<string> {
  const phone = normalizeKenyanPhone(input);
  if (!phone) throw new Error('Enter a valid Safaricom number, like 0712 345 678.');
  const { data, error } = await supabase.rpc('set_my_payout_phone', { p_phone: phone });
  if (error) fail(error, 'We could not save that number.');
  return (data as string) || phone;
}

export async function fetchHostView(kind: TicketSource, source: string): Promise<HostTicketView> {
  const { data, error } = await supabase.rpc('ticket_organizer_view', { p_kind: kind, p_source: source });
  if (error) fail(error, 'We could not load your tickets.');
  const v = (data || {}) as Partial<HostTicketView>;
  return { paid_enabled: !!v.paid_enabled, types: v.types || [], attendees: v.attendees || [] };
}

export async function createTicketType(kind: TicketSource, source: string, t: NewTicketType): Promise<void> {
  const { error } = await supabase.rpc('ticket_create_type', {
    p_kind: kind,
    p_source: source,
    p_name: t.name.trim(),
    p_desc: t.description?.trim() || null,
    p_price: Math.max(0, Math.round(t.price_kes)),
    p_qty: Math.max(1, Math.round(t.quantity)),
    p_max_per_order: t.max_per_order ?? 6,
    p_sales_end: t.sales_end || null,
    p_image: null,
  });
  if (error) fail(error, 'We could not create that ticket.');
}

export async function updateTicketType(
  id: string,
  patch: { name?: string; desc?: string; price_kes?: number; quantity?: number; status?: 'on_sale' | 'paused'; sales_end?: string | null; clearSalesEnd?: boolean }
): Promise<void> {
  const { error } = await supabase.rpc('ticket_update_type', {
    p_id: id,
    p_name: patch.name ?? null,
    p_desc: patch.desc ?? null,
    p_price: patch.price_kes ?? null,
    p_qty: patch.quantity ?? null,
    p_status: patch.status ?? null,
    p_sales_end: patch.sales_end ?? null,
    p_clear_sales_end: !!patch.clearSalesEnd,
  });
  if (error) fail(error, 'We could not update that ticket.');
}

/** The link a host shares. Phase 22 opens the buy page from it. */
export function ticketShareUrl(kind: TicketSource, source: string): string {
  const key = kind === 'event' ? 'event' : 'outing';
  return `${siteOrigin()}/?${key}=${encodeURIComponent(source)}&tickets=1`;
}
