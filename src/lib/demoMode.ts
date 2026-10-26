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
    const p = new URLSearchParams(window.location.search).get('demo');
    if (p === '1') localStorage.setItem(KEY, '1');
    if (p === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

const DEMO_ON = readDemoFlag();

export const isDemoMode = (): boolean => DEMO_ON;

/** Every mock id starts with "demo-" so real code paths can skip the network for them. */
export const isDemoId = (id: unknown): boolean => String(id ?? '').startsWith('demo-');
