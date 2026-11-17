/**
 * Bill split inside a group chat. RADA never holds the money: guests pay the host's own M-Pesa
 * number, then tell the chat they paid (with the M-Pesa code) and the host confirms it.
 * All changes go through database functions; the client only reads the two tables.
 */
import { supabase } from './supabase';
import { isCloudReady } from './socialsCloud';
import { normalizeKenyanPhone } from './payments';

export type ShareStatus = 'owed' | 'claimed' | 'confirmed';

export interface BillShare {
  id: string;
  user_id: string;
  user_handle: string | null;
  share_kes: number;
  status: ShareStatus;
  mpesa_code: string | null;
}

export interface BillSplit {
  id: string;
  conversation_id: string;
  host_id: string;
  title: string;
  total_kes: number;
  host_phone: string;
  status: 'open' | 'closed' | 'cancelled';
  created_at: string;
  shares: BillShare[];
}

const clean = (m?: string) => String(m || 'Something went wrong. Please try again.').replace(/^.*?:\s*/, '').trim();

export async function fetchBillSplit(id: string): Promise<BillSplit | null> {
  if (!isCloudReady()) return null;
  const [s, sh] = await Promise.all([
    supabase.from('bill_splits').select('*').eq('id', id).maybeSingle(),
    supabase.from('bill_shares').select('id,user_id,user_handle,share_kes,status,mpesa_code').eq('split_id', id).order('share_kes', { ascending: false }),
  ]);
  if (s.error || !s.data) return null;
  return { ...(s.data as any), shares: ((sh.data as BillShare[]) || []) } as BillSplit;
}

export async function createBillSplit(conversationId: string, title: string, totalKes: number, phone: string): Promise<{ id: string | null; error: string | null }> {
  if (!isCloudReady()) return { id: null, error: 'You are offline. Try again when you are back online.' };
  if (!normalizeKenyanPhone(phone)) return { id: null, error: 'Enter your M-Pesa number, like 0712 345 678.' };
  if (!Number.isFinite(totalKes) || totalKes < 1) return { id: null, error: 'Enter the total bill.' };
  const { data, error } = await supabase.rpc('create_bill_split', {
    p_conversation: conversationId,
    p_title: title,
    p_total: Math.round(totalKes),
    p_phone: normalizeKenyanPhone(phone),
    p_include_host: true,
  });
  if (error) return { id: null, error: clean(error.message) };
  return { id: data as string, error: null };
}

export async function claimShare(splitId: string, code: string): Promise<string | null> {
  const { error } = await supabase.rpc('claim_bill_share', { p_split: splitId, p_code: code });
  return error ? clean(error.message) : null;
}

export async function confirmShare(shareId: string, received: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('confirm_bill_share', { p_share: shareId, p_received: received });
  return error ? clean(error.message) : null;
}

export async function closeSplit(splitId: string, cancel = false): Promise<string | null> {
  const { error } = await supabase.rpc('close_bill_split', { p_split: splitId, p_cancel: cancel });
  return error ? clean(error.message) : null;
}

export const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;
/** 254712345678 -> 0712 345 678 */
export const prettyPhone = (p: string) => {
  const m = String(p).match(/^254(\d{3})(\d{3})(\d{3})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : p;
};
