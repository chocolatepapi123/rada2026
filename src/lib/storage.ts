/**
 * Safe localStorage helpers. A corrupt or blocked value must never crash the app
 * or silently wipe the user's data.
 */

export function readJSON<T>(key: string, fallback: T, validate?: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded or storage blocked: keep running, data stays in memory.
    console.warn(`[RADA] Could not persist "${key}"`, err);
  }
}

// IDs of the old built-in demo content. Anything cached on a phone with these IDs is removed once.
const SEED_STATUS_IDS = ['s-1', 's-2'];
const SEED_CHAT_IDS = ['c-1'];
const SEED_OUTING_IDS = ['out-1', 'out-2', 'out-3', 'out-4', 'out-5'];
const SEED_FLAG = 'rada_seed_purged_v1';

export function purgeSeedData(): void {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    const strip = (key: string, ids: string[]) => {
      const list = readJSON<any[]>(key, [], Array.isArray);
      const cleaned = list.filter(item => !ids.includes(item?.id));
      if (cleaned.length !== list.length) writeJSON(key, cleaned);
    };
    strip('rada_statuses', SEED_STATUS_IDS);
    strip('rada_conversations', SEED_CHAT_IDS);
    strip('rada_outings_cache', SEED_OUTING_IDS);
    localStorage.setItem(SEED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Debounced / idle persistence                                        */
/* ------------------------------------------------------------------ */

const DATA_URL_MIN_LENGTH = 1024;
const isHeavyDataUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.length > DATA_URL_MIN_LENGTH && v.startsWith('data:');

/**
 * Returns a copy of `value` without large base64 data URLs (object keys are dropped,
 * array entries are filtered out). Used only for the local cache: cloudSync stores the
 * full value remotely, so the next sync restores the images.
 */
export function stripDataUrls<T>(value: T): T {
  const walk = (v: any): any => {
    if (isHeavyDataUrl(v)) return undefined;
    if (Array.isArray(v)) {
      const out: any[] = [];
      for (const item of v) {
        const r = walk(item);
        if (r !== undefined) out.push(r);
      }
      return out;
    }
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const k of Object.keys(v)) {
        const r = walk(v[k]);
        if (r !== undefined) out[k] = r;
      }
      return out;
    }
    return v;
  };
  return walk(value);
}

type Pending = { getValue: () => unknown; strip: boolean };
const pending = new Map<string, Pending>();
let timer: number | null = null;
let idleHandle: number | null = null;

const ric: (cb: () => void, opts?: { timeout: number }) => number =
  (typeof window !== 'undefined' && (window as any).requestIdleCallback)
    ? (cb, opts) => (window as any).requestIdleCallback(cb, opts)
    : (cb) => window.setTimeout(cb, 50);

function flushNow(): void {
  if (timer != null) { clearTimeout(timer); timer = null; }
  if (idleHandle != null) {
    if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idleHandle);
    else clearTimeout(idleHandle);
    idleHandle = null;
  }
  const entries = Array.from(pending.entries());
  pending.clear();
  for (const [key, { getValue, strip }] of entries) {
    const v = getValue();
    writeJSON(key, strip ? stripDataUrls(v) : v);
  }
}

/** Write the latest value of `key` after a short pause, during browser idle time. */
export function writeJSONDebounced(
  key: string,
  value: unknown,
  opts: { delay?: number; stripImages?: boolean } = {}
): void {
  pending.set(key, { getValue: () => value, strip: !!opts.stripImages });
  if (timer != null) clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    idleHandle = ric(() => { idleHandle = null; flushNow(); }, { timeout: 2000 });
  }, opts.delay ?? 800);
}

/** Immediately write anything still waiting (called when the app is hidden or closed). */
export function flushPendingWrites(): void {
  if (pending.size) flushNow();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingWrites);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingWrites();
  });
}
