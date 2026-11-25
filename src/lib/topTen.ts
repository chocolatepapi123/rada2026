const memorySeeds = new Map<string, Record<string, number>>();

function readSeedMap(sessionKey: string): Record<string, number> {
  const cached = memorySeeds.get(sessionKey);
  if (cached) return cached;

  try {
    const raw = window.sessionStorage.getItem(`rada_top10_seed_${sessionKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memorySeeds.set(sessionKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors in restricted environments
  }

  const fresh: Record<string, number> = {};
  memorySeeds.set(sessionKey, fresh);
  return fresh;
}

function writeSeedMap(sessionKey: string, map: Record<string, number>) {
  memorySeeds.set(sessionKey, map);
  try {
    window.sessionStorage.setItem(`rada_top10_seed_${sessionKey}`, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Picks up to `count` items randomly once per browser session without reshuffling on re-render.
 * Respects active category/search filtering by sorting matching items via their session-stable random weight.
 */
export function pickSessionTopTen<T>(
  sessionKey: string,
  items: T[],
  getId: (item: T) => string,
  count = 10,
): T[] {
  if (!items.length) return [];

  const seeds = readSeedMap(sessionKey);
  let mutated = false;

  for (const item of items) {
    const id = getId(item);
    if (typeof seeds[id] !== 'number') {
      seeds[id] = Math.random();
      mutated = true;
    }
  }

  if (mutated) {
    writeSeedMap(sessionKey, seeds);
  }

  return [...items]
    .sort((a, b) => (seeds[getId(a)] ?? 0) - (seeds[getId(b)] ?? 0))
    .slice(0, count);
}

/**
 * Returns the current week's Monday–Sunday label (e.g. "23 Nov – 29 Nov 2026").
 */
export function getCurrentWeekRangeLabel(now: Date = new Date()): string {
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = local.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMon = day === 0 ? -6 : 1 - day;

  const start = new Date(local);
  start.setDate(local.getDate() + diffToMon);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmtDayMonth = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return `${fmtDayMonth(start)} – ${fmtDayMonth(end)} ${end.getFullYear()}`;
}
