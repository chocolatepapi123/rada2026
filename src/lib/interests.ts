// What kinds of places this person likes, learned on this phone only (nothing is sent anywhere).
// Signals: spots they open, categories they search or filter by, and spots they save.
// Recent activity counts more: every signal fades with a 2 week half-life.
import { getSpotCategoryIds, resolveSpotCategory, SPOT_CATEGORIES } from './spotCategories';

const KEY = 'rada_interest_events_v1';
const MAX_EVENTS = 400;
const HALF_LIFE_DAYS = 14;

export type InterestKind = 'view' | 'search' | 'filter';
const WEIGHT: Record<InterestKind, number> = { view: 2, search: 1.5, filter: 2.5 };
export const SAVE_WEIGHT = 4;

interface Ev { c: string[]; w: number; t: number }

const read = (): Ev[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((e) => e && Array.isArray(e.c) && typeof e.w === 'number' && typeof e.t === 'number') : [];
  } catch { return []; }
};

const write = (evs: Ev[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(evs.slice(-MAX_EVENTS))); } catch { /* storage full or blocked: skip */ }
};

/** Remember an interest in these category ids (already-resolved ids are fine, raw names are resolved). */
export function recordInterest(categoryIds: (string | null | undefined)[], kind: InterestKind) {
  const ids = Array.from(new Set(categoryIds.map((c) => resolveSpotCategory(String(c ?? ''))).filter(Boolean) as string[]));
  if (!ids.length) return;
  const evs = read();
  // the same thing twice in a row (re-opening, re-rendering) counts once
  const last = evs[evs.length - 1];
  if (last && last.c.join() === ids.join() && Date.now() - last.t < 30000) return;
  evs.push({ c: ids, w: WEIGHT[kind], t: Date.now() });
  write(evs);
}

/** A spot was opened. The main category counts fully, extra categories count half. */
export function recordSpotView(spot: any) {
  const ids = getSpotCategoryIds(spot);
  if (!ids.length) return;
  recordInterest([ids[0]], 'view');
}

/** A search text: categories whose name matches, plus the categories of the best matching spots. */
export function categoriesForQuery(query: string, matchedSpots: any[]): string[] {
  const q = query.trim().toLowerCase();
  const out: string[] = [];
  if (q.length >= 3) {
    for (const c of SPOT_CATEGORIES) {
      const words = c.label.toLowerCase().replace(/&/g, ' ').split(/\s+/).filter((w) => w.length >= 4);
      if (c.label.toLowerCase().includes(q) || words.some((w) => q.includes(w) || w.includes(q))) out.push(c.id);
    }
  }
  const tally: Record<string, number> = {};
  matchedSpots.slice(0, 8).forEach((sp) => { const p = getSpotCategoryIds(sp)[0]; if (p) tally[p] = (tally[p] || 0) + 1; });
  Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([id]) => { if (!out.includes(id)) out.push(id); });
  return out;
}

/** Category scores, highest first. `saved` adds the saved spots (they are read live, not stored). */
export function interestScores(savedSpots: any[] = []): [string, number][] {
  const now = Date.now();
  const score: Record<string, number> = {};
  for (const e of read()) {
    const age = (now - e.t) / 86400000;
    const f = Math.pow(0.5, age / HALF_LIFE_DAYS);
    e.c.forEach((id, i) => { score[id] = (score[id] || 0) + e.w * f * (i === 0 ? 1 : 0.6); });
  }
  for (const sp of savedSpots) {
    const ids = getSpotCategoryIds(sp);
    ids.forEach((id, i) => { score[id] = (score[id] || 0) + SAVE_WEIGHT * (i === 0 ? 1 : 0.5); });
  }
  return Object.entries(score).filter(([, s]) => s > 0.4).sort((a, b) => b[1] - a[1]);
}

/**
 * The category ids to show first on Home: this person's top categories, then the usual order.
 * `available` limits it to categories that actually have spots; `max` is how many rows Home shows.
 * One row is always kept for the usual order, so Home never turns into a bubble.
 */
export function personalCategoryOrder(opts: { usualOrder: string[]; available: (id: string) => boolean; max: number; savedSpots?: any[] }): string[] {
  const { usualOrder, available, max, savedSpots } = opts;
  const mine = interestScores(savedSpots).map(([id]) => id).filter(available).slice(0, Math.max(0, max - 1));
  const rest = usualOrder.filter((id) => available(id) && !mine.includes(id));
  return [...mine, ...rest].slice(0, max);
}
