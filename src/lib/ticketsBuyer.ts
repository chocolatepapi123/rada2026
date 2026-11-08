/** Buyer side of ticketing: see tickets, pay with M-Pesa, hold tickets, check guests in. */
import { supabase, isSupabaseConfigured } from './supabase';
import { normalizeKenyanPhone } from './payments';
import type { TicketSource } from './tickets';

export interface PublicTicketType {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  left: number;
  max_per_order: number;
  sales_end: string | null;
  closed: boolean;
}

export interface PublicTicketView {
  title: string;
  date: string | null;
  time: string | null;
  place: string | null;
  image: string | null;
  host: string | null;
  paid_enabled: boolean;
  types: PublicTicketType[];
}

export interface MyTicket {
  id: string;
  code: string;
  status: 'valid' | 'used' | string;
  created_at: string;
  checked_in_at: string | null;
  type_name: string;
  price_kes: number;
  source_kind: TicketSource;
  source_id: string;
  title: string | null;
  event_date: string | null;
  event_time: string | null;
  place: string | null;
}

export interface OrderRow {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | string;
  failure_reason: string | null;
  gross_kes: number;
  qty: number;
}

export type CheckInResult = {
  result: 'ok' | 'already_used' | 'invalid' | 'not_allowed';
  type?: string;
  name?: string;
  checked_in_at?: string;
};

const clean = (m: string) => String(m || 'Something went wrong.').trim();

export async function fetchPublicTickets(kind: TicketSource, source: string): Promise<PublicTicketView | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('ticket_public_view', { p_kind: kind, p_source: source });
  if (error || !data) return null;
  return data as PublicTicketView;
}

/** Free tickets are issued instantly. Paid tickets start an M-Pesa prompt and return the order to wait on. */
export async function buyTicket(
  type: PublicTicketType,
  qty: number,
  phone: string
): Promise<{ orderId: string; free: boolean }> {
  if (type.price_kes === 0) {
    const { data, error } = await supabase.rpc('ticket_buy', { p_type: type.id, p_qty: qty, p_phone: null });
    if (error) throw new Error(clean(error.message));
    return { orderId: (data as any).id, free: true };
  }
  const normalized = normalizeKenyanPhone(phone);
  if (!normalized) throw new Error('Enter a valid Safaricom number, like 0712 345 678.');
  const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
    body: { kind: 'ticket', ticket_type_id: type.id, qty, phone: normalized },
  });
  if (error) {
    let msg = '';
    try { msg = (await (error as any).context?.json?.())?.error || ''; } catch { /* ignore */ }
    throw new Error(msg || 'We could not start the payment. Please try again.');
  }
  if (!(data as any)?.order_id) throw new Error((data as any)?.error || 'We could not start the payment.');
  return { orderId: (data as any).order_id, free: !!(data as any).free };
}

export async function waitForOrder(
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<OrderRow | null> {
  const { intervalMs = 2500, timeoutMs = 120000, signal } = opts;
  const end = Date.now() + timeoutMs;
  let last: OrderRow | null = null;
  while (Date.now() < end && !signal?.aborted) {
    const { data } = await supabase.from('ticket_orders').select('id,status,failure_reason,gross_kes,qty').eq('id', id).maybeSingle();
    last = (data as OrderRow) || last;
    if (last && last.status !== 'pending') return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

export async function fetchMyTickets(): Promise<MyTicket[]> {
  const { data, error } = await supabase.rpc('ticket_my_tickets');
  if (error) throw new Error(clean(error.message));
  return (data as MyTicket[]) || [];
}

/** What a ticket's QR code contains. The scanner and the database both accept the bare code too. */
export const ticketQrText = (code: string) => `rada:t:${code}`;

export async function checkInTicket(code: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('ticket_check_in', { p_code: code });
  if (error) throw new Error(clean(error.message));
  return data as CheckInResult;
}
