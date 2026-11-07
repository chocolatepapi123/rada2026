// The public web address to put in links people share (outings, profiles).
// Inside the Android app the page origin is a private "localhost" address, so links built from it
// would not open for anyone else. There we use the public site instead.
const FALLBACK = 'https://rada2026-omega.vercel.app';

export function siteOrigin(): string {
  try {
    const configured = String((import.meta as any).env?.VITE_PUBLIC_URL || '').trim().replace(/\/+$/, '');
    const cap = (window as any).Capacitor;
    const native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    const o = window.location.origin;
    const isWeb = /^https?:\/\//i.test(o) && !/^https?:\/\/(localhost|127\.|10\.|192\.168\.)/i.test(o);
    if (native || !/^https?:\/\//i.test(o)) return configured || FALLBACK;
    if (isWeb) return o;
    // local development in a browser keeps working with its own address
    return o;
  } catch {
    return FALLBACK;
  }
}
