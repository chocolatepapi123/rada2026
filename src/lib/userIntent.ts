import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// What a person says they use RADA for. Asked once after sign-in, used to keep the 3-dot menu relevant.
// Saved on this device and on the account (auth user_metadata), so it follows them to a new phone.

export type Intent = 'discover' | 'meet' | 'host' | 'business';

export const INTENT_OPTIONS: { id: Intent; title: string; sub: string }[] = [
  { id: 'discover', title: 'Find places & events', sub: 'Nights out, food, cinema, things to do' },
  { id: 'meet', title: 'Meet people', sub: 'Join outings and hangouts with new faces' },
  { id: 'host', title: 'Host outings', sub: 'Plan hangouts and invite people along' },
  { id: 'business', title: 'Run a business or venue', sub: 'List a spot, post events, sell tickets' },
];

const VALID: Intent[] = ['discover', 'meet', 'host', 'business'];
const CHANGED = 'rada-intents-changed';
const lsKey = (uid: string) => `rada_intents_${uid}`;

const clean = (v: unknown): Intent[] | null => {
  if (!Array.isArray(v)) return null;
  const ok = v.filter((x): x is Intent => VALID.includes(x as Intent));
  return ok.length ? ok : null;
};

export const readIntents = (uid?: string | null): Intent[] | null => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(lsKey(uid));
    return raw ? clean(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export async function saveIntents(uid: string, intents: Intent[]): Promise<void> {
  try { localStorage.setItem(lsKey(uid), JSON.stringify(intents)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(CHANGED, { detail: { uid } })); } catch { /* ignore */ }
  try { await supabase.auth.updateUser({ data: { intents } }); } catch { /* the device copy still works */ }
}

/** intents = null means "not answered yet" (show everything). loaded = we have finished checking the account. */
export function useIntents(uid?: string | null) {
  const [intents, setIntents] = useState<Intent[] | null>(() => readIntents(uid));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) { setIntents(null); setLoaded(false); return; }
    const local = readIntents(uid);
    setIntents(local);
    if (local) { setLoaded(true); return; }
    let alive = true;
    setLoaded(false);
    Promise.resolve(supabase.auth.getUser())
      .then(({ data }: any) => {
        if (!alive) return;
        const remote = clean(data?.user?.user_metadata?.intents);
        if (remote) {
          try { localStorage.setItem(lsKey(uid), JSON.stringify(remote)); } catch { /* ignore */ }
          setIntents(remote);
        }
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const onChange = () => setIntents(readIntents(uid));
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [uid]);

  return { intents, loaded };
}
