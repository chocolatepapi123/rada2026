/**
 * M-Pesa plan payments. The price and every rule come from the database inside the
 * `mpesa-stk-push` edge function; the client only sends which plan and which phone.
 * The result arrives on the `payments` row (written by `mpesa-callback`), which we poll.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { PlanId, SubKind } from './subscriptions';

export interface StkStarted {
  payment_id: string;
  amount_kes: number;
  phone: string;
  message: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired' | string;

export interface PaymentRow {
  id: string;
  status: PaymentStatus;
  amount_kes: number;
  failure_reason: string | null;
  receipt_no: string | null;
  subscription_applied: boolean;
}

/** Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX or 2547XXXXXXXX. Returns 2547XXXXXXXX or null. */
export function normalizeKenyanPhone(input: string): string | null {
  const d = input.replace(/[\s\-()+]/g, '');
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
}

export type BillingPeriod = 'weekly' | 'monthly';

async function invokeStk(body: Record<string, unknown>): Promise<StkStarted> {
  const { data, error } = await supabase.functions.invoke('mpesa-stk-push', { body });
  if (error) {
    // supabase-js hides the JSON body of non-2xx replies inside error.context
    let msg = '';
    try {
      const body = await (error as any).context?.json?.();
      msg = body?.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'We could not start the payment. Please try again.');
  }
  if (!data?.payment_id) throw new Error((data as any)?.error || 'We could not start the payment. Please try again.');
  return data as StkStarted;
}

export async function startPlanPayment(
  kind: SubKind,
  plan: Exclude<PlanId, 'free'>,
  phone: string,
  period: BillingPeriod = 'monthly'
): Promise<StkStarted> {
  if (!isSupabaseConfigured) throw new Error('Payments need a connection to RADA. Try again online.');
  const normalized = normalizeKenyanPhone(phone);
  if (!normalized) throw new Error('Enter a valid Safaricom number, like 0712 345 678.');
  return invokeStk({ kind, plan, period, phone: normalized });
}

/** Pay for an APPROVED promotion. The amount comes from the promotion row on the server. */
export async function startPromotionPayment(promotionId: string, phone: string): Promise<StkStarted> {
  if (!isSupabaseConfigured) throw new Error('Payments need a connection to RADA. Try again online.');
  const normalized = normalizeKenyanPhone(phone);
  if (!normalized) throw new Error('Enter a valid Safaricom number, like 0712 345 678.');
  return invokeStk({ kind: 'promotion', promotion_id: promotionId, phone: normalized });
}

export async function fetchPayment(id: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('id,status,amount_kes,failure_reason,receipt_no,subscription_applied')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data as PaymentRow) || null;
}

/** Polls until the payment is no longer pending, or the time runs out (then returns the last row). */
export async function waitForPayment(
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<PaymentRow | null> {
  const { intervalMs = 3000, timeoutMs = 120000, signal } = opts;
  const end = Date.now() + timeoutMs;
  let last: PaymentRow | null = null;
  while (Date.now() < end && !signal?.aborted) {
    last = await fetchPayment(id);
    if (last && last.status !== 'pending') return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

export interface PlanPrice {
  kind: SubKind;
  plan: 'pro' | 'elite';
  billing_period: BillingPeriod;
  period_days: number;
  amount_kes: number | null;
  active: boolean;
}

/** Public, active plan prices. A plan that is missing here (e.g. Merchant Elite) cannot be bought yet. */
export async function fetchPlanPrices(): Promise<PlanPrice[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('payment_plans').select('kind,plan,billing_period,period_days,amount_kes,active');
  if (error) return [];
  return ((data as PlanPrice[]) || []).filter((p) => p.active && p.amount_kes);
}
