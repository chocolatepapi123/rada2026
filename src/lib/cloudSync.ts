import { supabase } from './supabase';
import type { BusinessAccount } from '../types';

export type ListingKind = 'spot' | 'event' | 'thrift' | 'offer';

export interface CloudListings {
  spot: any[];
  event: any[];
  thrift: any[];
  offer: any[];
}

// ---------- helpers ----------
function rowToBusiness(row: any): BusinessAccount {
  const status = (row.verification_status || 'pending') as 'pending' | 'approved' | 'rejected';
  return {
    ...(row.data || {}),
    id: row.id,
    ownerId: row.owner_id ?? row.data?.ownerId,
    // The database column is the source of truth for verification
    verificationStatus: status,
    verified: status === 'approved',
  } as BusinessAccount;
}

// ---------- businesses ----------
export async function fetchBusinesses(): Promise<BusinessAccount[] | null> {
  const { data, error } = await supabase
    .from('rada_businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchBusinesses failed:', error.message);
    return null;
  }
  return (data || []).map(rowToBusiness);
}

/** Returns an error message, or null on success. */
export async function insertBusiness(biz: BusinessAccount, ownerId: string): Promise<string | null> {
  const { error } = await supabase.from('rada_businesses').insert({
    id: biz.id,
    owner_id: ownerId,
    verification_status: 'pending',
    data: biz,
  });
  return error ? error.message : null;
}

/** Returns an error message, or null on success. */
export async function updateBusiness(biz: BusinessAccount): Promise<string | null> {
  const { data, error } = await supabase
    .from('rada_businesses')
    .update({
      data: biz,
      verification_status: biz.verificationStatus || 'pending',
    })
    .eq('id', biz.id)
    .select('id');

  if (error) return error.message;
  if (!data || data.length === 0) return 'not allowed or business not found online';
  return null;
}

// ---------- listings (spots, events, thrift items, offers) ----------
export async function fetchListings(): Promise<CloudListings | null> {
  const { data, error } = await supabase
    .from('rada_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchListings failed:', error.message);
    return null;
  }

  const out: CloudListings = { spot: [], event: [], thrift: [], offer: [] };
  for (const row of data || []) {
    if (row.kind in out && row.data) {
      (out as any)[row.kind].push(row.data);
    }
  }
  return out;
}

/** Returns an error message, or null on success. */
export async function upsertListing(
  kind: ListingKind,
  item: any,
  businessId: string | undefined | null,
  ownerId: string
): Promise<string | null> {
  const { error } = await supabase
    .from('rada_listings')
    .upsert(
      {
        kind,
        id: String(item.id),
        business_id: businessId ?? null,
        owner_id: ownerId,
        data: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'kind,id' }
    );
  return error ? error.message : null;
}

/** Returns an error message, or null on success. */
export async function deleteListing(kind: ListingKind, id: string | number): Promise<string | null> {
  const { error } = await supabase
    .from('rada_listings')
    .delete()
    .eq('kind', kind)
    .eq('id', String(id));
  return error ? error.message : null;
}
