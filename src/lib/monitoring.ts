/**
 * Error monitoring. Fire-and-forget: monitoring must never break the app.
 * Server side: public.log_client_error(...) fingerprints, de-duplicates and rate-limits per session
 * (20 errors per hour, 3 identical per hour) and keeps 30 days. Admins read it in
 * Admin → Health (admin_recent_errors).
 *
 * No third-party SDK and no personal data: only the message, a trimmed stack, the page path,
 * the browser string and an anonymous session id.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export const APP_VERSION: string = (import.meta.env.VITE_APP_VERSION as string | undefined) || 'rc-2026-11';

const SESSION_KEY = 'rada_session_id';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).slice(0, 36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// Noise that is not a bug: it is already ignored in main.tsx, and logging it would bury real errors.
const IGNORE = [
  'resizeobserver',
  'script error',
  'failed to fetch',
  'networkerror',
  'aborterror',
  'load failed',
  'dynamically imported module',
  'loading chunk',
  'the user aborted a request',
  'non-error promise rejection',
];

function isNoise(message: string): boolean {
  const m = message.toLowerCase();
  return IGNORE.some((n) => m.includes(n));
}

/** Strips query strings and hashes so tokens in a URL are never stored. */
function cleanUrl(): string {
  try {
    return window.location.pathname || '/';
  } catch {
    return '/';
  }
}

// Same error twice in a row from a render loop would only fill the quota; send each fingerprint once per page load.
const sent = new Set<string>();

export type ErrorKind = 'js' | 'promise' | 'react' | 'api' | 'manual';

export function reportError(kind: ErrorKind, error: unknown, extra?: string): void {
  if (!isSupabaseConfigured) return;
  try {
    const e = error as any;
    const message = String(e?.message || e || '').trim();
    if (!message || isNoise(message)) return;
    const stack = [e?.stack ? String(e.stack) : '', extra || ''].filter(Boolean).join('\n');
    const key = kind + '|' + message.slice(0, 120) + '|' + stack.split('\n')[1]?.slice(0, 120);
    if (sent.has(key)) return;
    sent.add(key);
    void supabase
      .rpc('log_client_error', {
        p_kind: kind,
        p_message: message.slice(0, 300),
        p_stack: stack.slice(0, 2000) || null,
        p_url: cleanUrl(),
        p_session: sessionId(),
        p_app_version: APP_VERSION,
        p_ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* ignore */
  }
}

let started = false;

/** Call once, before React renders. */
export function initMonitoring(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('error', (ev) => {
    reportError('js', ev.error || ev.message);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    reportError('promise', ev.reason);
  });
}
