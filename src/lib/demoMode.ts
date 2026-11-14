/**
 * Demo Mode: fills the app with mock events, people, match requests, group chats and
 * hosting chats so you can screen-record a promo. Everything is local to the browser:
 * nothing is written to Supabase while it is on.
 *
 *   Turn on : open the app with  ?demo=1   (e.g. https://rada2026-omega.vercel.app/?demo=1)
 *   Turn off: open the app with  ?demo=0
 *
 * You still sign in with a real account; the demo data is layered on top of it.
 */
const KEY = 'rada_demo_mode';

function readDemoFlag(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    // Production builds ignore ?demo=1 unless VITE_ENABLE_DEMO=true, so customers can never land in fake data.
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_DEMO !== 'true') return false;
    const p = new URLSearchParams(window.location.search).get('demo');
    if (p === '1') localStorage.setItem(KEY, '1');
    if (p === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

const DEMO_ON = readDemoFlag();

/** Demo accounts (see demoPersonas.ts) open in Demo Mode on their own. Set from the signed-in email. */
const DEMO_ACCOUNT_EMAILS: Record<string, 'merchant' | 'host' | 'user'> = {
  'waynrewaweru@gmail.com': 'merchant',
  'waynewaweruwaititu@gmail.com': 'host',
  'prodbywayne@gmail.com': 'user',
};
let personaForEmail: 'merchant' | 'host' | 'user' | null = null;
/** Production builds never switch a demo account into demo mode unless VITE_ENABLE_DEMO=true. */
const DEMO_ALLOWED = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';
export function setDemoAccountEmail(email?: string | null) {
  if (!DEMO_ALLOWED) { personaForEmail = null; return; }
  personaForEmail = DEMO_ACCOUNT_EMAILS[String(email || '').trim().toLowerCase()] ?? null;
}
/** Which sample person the signed-in demo account plays; null for everyone else. */
export const getDemoPersona = (): 'merchant' | 'host' | 'user' | null => personaForEmail;

/**
 * INVESTOR PITCH: guests (not signed in) see the full demo (chats, requests, Discover, outings)
 * with no face-verification gate. Set to false after the pitch so real guests see real data.
 */
const GUEST_DEMO = true;
let guestDemoActive = false;
/** App calls this on every render with "is nobody signed in". */
export const setDemoGuest = (isGuest: boolean) => { guestDemoActive = GUEST_DEMO && isGuest; };

export const isDemoMode = (): boolean => DEMO_ON || personaForEmail !== null || guestDemoActive;

/** Stand-in identity for a guest in Demo Mode, so chats, match requests and Discover work without signing in. */
export const DEMO_GUEST_ID = 'demo-guest-me';
/** The real user id when signed in; in Demo Mode a guest gets DEMO_GUEST_ID; otherwise undefined. */
export const demoAwareUserId = (realId?: string | null): string | undefined =>
  realId ? realId : (isDemoMode() ? DEMO_GUEST_ID : undefined);

/** Every mock id starts with "demo-" so real code paths can skip the network for them. */
export const isDemoId = (id: unknown): boolean => { const s = String(id ?? ''); return s.startsWith('demo-') || s.startsWith('showcase-out-'); };
