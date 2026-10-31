import { supabase, isSupabaseConfigured } from './supabase';

export async function fetchMySavedOutingIds(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data } = await supabase.from('outing_saves').select('outing_id');
  return new Set((data || []).map((r: { outing_id: string }) => r.outing_id));
}

/** Returns true when the outing is now saved, false when it was un-saved. */
export async function toggleOutingSave(outingId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_outing_save', { p_outing: outingId });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Host-only aggregate. The server never returns who saved. */
export async function fetchOutingSaveCounts(ids: string[]): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !ids.length) return {};
  const { data, error } = await supabase.rpc('get_outing_save_counts', { p_ids: ids });
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of (data as { outing_id: string; saves: number | string }[]) || []) out[r.outing_id] = Number(r.saves);
  return out;
}
