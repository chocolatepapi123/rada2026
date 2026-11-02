import { supabase } from './supabase';

export interface ManualPayInfo { pay_to_number: string; pay_method: string; active: boolean }
export interface ManualClaim {
  id: string; user_id: string; kind: 'creator' | 'merchant' | 'promotion'; plan: string; period_days: number;
  amount_kes: number; mpesa_code: string; sender_phone: string; status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null; created_at: string; decided_at: string | null;
}

export async function getManualPayInfo(): Promise<ManualPayInfo | null> {
  const { data, error } = await supabase.from('manual_pay_config').select('pay_to_number, pay_method, active').eq('id', 1).maybeSingle();
  if (error || !data || !data.active) return null;
  return data as ManualPayInfo;
}

/** Returns an error message, or null on success. */
export async function submitManualPayment(args: {
  kind: 'creator' | 'merchant' | 'promotion'; plan: string; period?: 'weekly' | 'monthly';
  promotionId?: string | null; code: string; senderPhone: string;
}): Promise<string | null> {
  const { error } = await supabase.rpc('submit_manual_payment', {
    p_kind: args.kind, p_plan: args.plan, p_period: args.period || 'monthly',
    p_promotion_id: args.promotionId || null, p_mpesa_code: args.code, p_sender_phone: args.senderPhone,
  });
  return error ? error.message : null;
}

export async function listMyClaims(): Promise<ManualClaim[]> {
  const { data } = await supabase.from('manual_payment_claims').select('*').order('created_at', { ascending: false }).limit(10);
  return (data as ManualClaim[]) || [];
}

export async function listPendingClaims(): Promise<ManualClaim[]> {
  const { data } = await supabase.from('manual_payment_claims').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  return (data as ManualClaim[]) || [];
}

export async function decideClaim(id: string, approve: boolean, note?: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_decide_manual_payment', { p_claim_id: id, p_approve: approve, p_note: note || null });
  return error ? error.message : null;
}

/** Price of a plan, read from payment_plans (null if not readable). */
export async function getPlanAmount(kind: string, plan: string, period: string): Promise<number | null> {
  const { data } = await supabase.from('payment_plans').select('amount_kes').eq('kind', kind).eq('plan', plan).eq('billing_period', period).eq('active', true).maybeSingle();
  return data?.amount_kes ?? null;
}
