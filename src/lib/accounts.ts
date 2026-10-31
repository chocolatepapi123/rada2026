/**
 * Multiple signed-in accounts on one device. Each account's Supabase session is kept in this browser
 * only (same place Supabase already keeps the active session), so the person can switch without
 * typing a password again. "Remove" forgets that account on this device.
 */
import { supabase } from './supabase';

const KEY = 'rada_accounts_v1';

export interface SavedAccount {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  access_token: string;
  refresh_token: string;
  savedAt: number;
}

function read(): SavedAccount[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((a) => a && a.id && a.refresh_token) : [];
  } catch {
    return [];
  }
}
function write(list: SavedAccount[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ }
}

export const listAccounts = (): SavedAccount[] => read();

/** Call whenever Supabase reports a signed-in session (sign in, token refresh). Keeps tokens current. */
export function rememberSession(session: any, extra?: { name?: string; avatar?: string }) {
  const u = session?.user;
  if (!u?.id || !session?.refresh_token) return;
  const list = read();
  const prev = list.find((a) => a.id === u.id);
  const next: SavedAccount = {
    id: u.id,
    email: u.email || prev?.email || '',
    name: extra?.name || prev?.name,
    avatar: extra?.avatar || prev?.avatar,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    savedAt: Date.now(),
  };
  write([next, ...list.filter((a) => a.id !== u.id)]);
}

/** Update the display name or photo shown in the switcher for an account already saved. */
export function updateAccountLook(id: string, look: { name?: string; avatar?: string }) {
  const list = read();
  const a = list.find((x) => x.id === id);
  if (!a) return;
  if (look.name) a.name = look.name;
  if (look.avatar) a.avatar = look.avatar;
  write(list);
}

export function forgetAccount(id: string) {
  write(read().filter((a) => a.id !== id));
}

/** Switch the active session to a saved account. Returns an error message, or null on success. */
export async function switchToAccount(id: string): Promise<string | null> {
  const a = read().find((x) => x.id === id);
  if (!a) return 'That account is no longer saved on this device.';
  const { data, error } = await supabase.auth.setSession({
    access_token: a.access_token,
    refresh_token: a.refresh_token,
  });
  if (error || !data?.session) {
    forgetAccount(id);
    return 'That login expired. Please add the account again.';
  }
  rememberSession(data.session);
  return null;
}
