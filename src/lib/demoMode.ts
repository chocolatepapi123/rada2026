import { isSupabaseConfigured } from './supabase';

/**
 * Demo Mode: fills the app with mock events, people, chats, Discover asks, group chats and
 * hosting chats. Everything is local to the browser: nothing is written to Supabase while it is on.
 *
 *   Turn on : open the app with  ?demo=1
 *   Turn off: open the app with  ?demo=0
 *
 * When Supabase is not configured, Demo Mode is enabled by default unless ?demo=0 is set.
 */
const KEY = 'rada_demo_mode';

function readDemoFlag(): boolean {
  try {
    if (typeof window === 'undefined') return !isSupabaseConfigured;
    const p = new URLSearchParams(window.location.search).get('demo');
    if (p === '1') localStorage.setItem(KEY, '1');
    if (p === '0') localStorage.removeItem(KEY);
    if (!isSupabaseConfigured) {
      return p !== '0';
    }
    // Production builds with real Supabase ignore ?demo=1 unless VITE_ENABLE_DEMO=true.
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_DEMO !== 'true') return false;
    return localStorage.getItem(KEY) === '1';
  } catch {
    return !isSupabaseConfigured;
  }
}

const DEMO_ON = readDemoFlag();

/** Demo accounts open in Demo Mode on their own when allowed. Set from the signed-in email. */
const DEMO_ACCOUNT_EMAILS: Record<string, 'merchant' | 'host' | 'user'> = {};
let personaForEmail: 'merchant' | 'host' | 'user' | null = null;
const DEMO_ALLOWED = !isSupabaseConfigured || !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';
export function setDemoAccountEmail(email?: string | null) {
  if (!DEMO_ALLOWED) { personaForEmail = null; return; }
  personaForEmail = DEMO_ACCOUNT_EMAILS[String(email || '').trim().toLowerCase()] ?? null;
}
export const getDemoPersona = (): 'merchant' | 'host' | 'user' | null => personaForEmail;

const GUEST_DEMO = !isSupabaseConfigured;
let guestDemoActive = false;
/** App calls this on every render with "is nobody signed in". */
export const setDemoGuest = (isGuest: boolean) => { guestDemoActive = GUEST_DEMO && isGuest; };

export const isDemoMode = (): boolean => DEMO_ON || personaForEmail !== null || guestDemoActive;

/** Stand-in identity for a guest in Demo Mode, so chats, outings and Discover work without signing in. */
export const DEMO_GUEST_ID = 'demo-guest-me';
/** The real user id when signed in; in Demo Mode a guest gets DEMO_GUEST_ID; otherwise undefined. */
export const demoAwareUserId = (realId?: string | null): string | undefined =>
  realId ? realId : (isDemoMode() ? DEMO_GUEST_ID : undefined);

/** Every mock id starts with "demo-" so real code paths can skip the network for them. */
export const isDemoId = (id: unknown): boolean => { const s = String(id ?? ''); return s.startsWith('demo-') || s.startsWith('showcase-out-'); };
