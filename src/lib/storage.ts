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
