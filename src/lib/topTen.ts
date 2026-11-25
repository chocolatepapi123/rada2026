const SESSION_SEED_KEY = 'rada_top10_session_seed_v1';
let memorySeed: string | null = null;

/**
 * Per-session random seed so Top 10 selections are freshly randomized each session
 * yet never reshuffle across re-renders, tab switches, or async data arrivals.
 */
export function getSessionTopTenSeed(): string {
  if (memorySeed) return memorySeed;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const existing = window.sessionStorage.getItem(SESSION_SEED_KEY);
      if (existing) {
        memorySeed = existing;
        return existing;
      }
      const created = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_SEED_KEY, created);
      memorySeed = created;
      return created;
    }
  } catch {
    // Ignore storage errors (private mode / SSR)
  }
  memorySeed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return memorySeed;
}

/** Deterministic 32-bit FNV-1a hash for combining the session seed + item key. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Randomly selects up to `count` unique items from `items` once per session.
 * - Preserves unique items (no duplication if items.length < count).
 * - Order stays completely stable during the session and responds cleanly to category filtering.
 */
export function pickSessionTopTen<T>(
  namespace: string,
  items: T[],
  getKey: (item: T) => string,
  count = 10,
): T[] {
  if (!items.length || count <= 0) return [];
  const seed = getSessionTopTenSeed();
  const seen = new Set<string>();
  const unique: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      item,
      score: fnv1a(`${seed}:${namespace}:${key}`),
    });
  }

  unique.sort((a, b) => a.score - b.score);
  return unique.slice(0, count).map((entry) => entry.item);
}

/**
 * Returns the Monday–Sunday date range of the current week in Nairobi time.
 */
export function getWeekDateRangeLabel(now: Date = new Date()): {
  start: string;
  end: string;
  label: string;
} {
  const tz = 'Africa/Nairobi';
  const parts: Record<string, string> = {};
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  for (const p of dtf.formatToParts(now)) parts[p.type] = p.value;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wd = Math.max(0, weekdays.indexOf(parts.weekday || 'Mon'));
  // Shift Sunday (0) -> 6 days back to Monday; Mon (1) -> 0; Tue (2) -> 1; etc.
  const offsetToMonday = wd === 0 ? -6 : 1 - wd;

  const baseUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12, 0, 0);
  const monday = new Date(baseUtc + offsetToMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);

  const fmtDayMonth = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
  const fmtYear = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
  });

  const start = fmtDayMonth.format(monday);
  const endDayMonth = fmtDayMonth.format(sunday);
  const end = `${endDayMonth} ${fmtYear.format(sunday)}`;

  return {
    start,
    end,
    label: `${start} – ${end}`,
  };
}
