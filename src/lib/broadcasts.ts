import { supabase, isSupabaseConfigured } from './supabase';

export interface BroadcastAudience {
  plan: 'free' | 'pro' | 'elite';
  subscribers: number;
  push_subscribers: number;
  window_limit: number;
  window_hours: number;
  sent_in_window: number;
  can_send: boolean;
  next_allowed_at: string | null;
  recent: { id: string; title: string; recipients: number; created_at: string }[];
}

export async function fetchBroadcastAudience(): Promise<BroadcastAudience | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_my_broadcast_audience');
  if (error) return null;
  return data as BroadcastAudience;
}

export async function sendBroadcast(title: string, body: string): Promise<{ recipients: number }> {
  const { data, error } = await supabase.rpc('send_broadcast', { p_title: title, p_body: body });
  if (error) throw new Error(error.message);
  return data as { recipients: number };
}

/** Opt in to (or out of) updates from one host. Returns the new state. */
export async function setBroadcastSubscription(hostId: string, on: boolean, push = false): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_broadcast_subscription', { p_host: hostId, p_on: on, p_push: push });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function fetchMyBroadcastSubscriptions(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data } = await supabase.from('broadcast_subscriptions').select('host_id');
  return new Set((data || []).map((r: { host_id: string }) => r.host_id));
}

// ---- notifications (in-app inbox) ----
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

export async function fetchNotifications(limit = 40): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('notifications')
    .select('id,type,title,body,data,read_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as AppNotification[]) || [];
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
}

export async function deleteNotification(id: string) {
  await supabase.from('notifications').delete().eq('id', id);
}
