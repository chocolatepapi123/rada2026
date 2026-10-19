import type { StatusPost } from '../types';

/**
 * "Where are you at" status rules
 *  - one active status per person (a new post replaces the old one)
 *  - a status disappears 12 hours after it was posted
 *  - the owner can delete it at any time
 *
 * Statuses without a `createdAt` are the built-in demo posts; they never expire.
 */

export const STATUS_TTL_MS = 12 * 60 * 60 * 1000;

export interface StatusOwner {
  userId?: string | null;
  handle?: string | null;
}

const createdMs = (s: StatusPost): number | null => {
  if (!s.createdAt) return null;
  const t = Date.parse(s.createdAt);
  return Number.isNaN(t) ? null : t;
};

const handleKey = (h?: string | null) => (h || '').trim().toLowerCase();

const authorKey = (s: StatusPost) => handleKey(s.handle) || (s.userId ? `id:${s.userId}` : s.id);

export const isStatusExpired = (s: StatusPost, now: number = Date.now()): boolean => {
  const t = createdMs(s);
  return t !== null && now - t >= STATUS_TTL_MS;
};

export const isOwnStatus = (s: StatusPost, owner: StatusOwner): boolean => {
  if (owner.userId && s.userId) return owner.userId === s.userId;
  const h = handleKey(owner.handle);
  return Boolean(h) && h === handleKey(s.handle);
};

export const findOwnStatus = (list: StatusPost[], owner: StatusOwner): StatusPost | undefined =>
  list.find(s => isOwnStatus(s, owner));

export const formatTimeAgo = (createdAt: string, now: number = Date.now()): string => {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

/** Keeps only the newest status per author, preserving list order. */
const keepNewestPerAuthor = (list: StatusPost[]): StatusPost[] => {
  const winner = new Map<string, StatusPost>();
  for (const s of list) {
    const key = authorKey(s);
    const cur = winner.get(key);
    if (!cur || (createdMs(s) ?? -Infinity) > (createdMs(cur) ?? -Infinity)) winner.set(key, s);
  }
  return list.filter(s => winner.get(authorKey(s)) === s);
};

/**
 * Drops expired statuses, enforces one-per-author and refreshes "x ago" labels.
 * Returns the SAME array when nothing changed, so React does not re-render.
 */
export const cleanStatuses = (list: StatusPost[], now: number = Date.now()): StatusPost[] => {
  const live = list
    .filter(s => !isStatusExpired(s, now))
    .map(s => {
      if (!s.createdAt) return s;
      const ago = formatTimeAgo(s.createdAt, now);
      return ago && ago !== s.timeAgo ? { ...s, timeAgo: ago } : s;
    });
  const next = keepNewestPerAuthor(live);
  return next.length === list.length && next.every((s, i) => s === list[i]) ? list : next;
};

/** Adds a new status and removes the owner's earlier one(s). `replaced` lets the caller delete them online. */
export const addStatusReplacingOwn = (
  list: StatusPost[],
  post: StatusPost,
  owner: StatusOwner
): { next: StatusPost[]; replaced: StatusPost[] } => {
  const replaced = list.filter(s => isOwnStatus(s, owner));
  const rest = list.filter(s => !isOwnStatus(s, owner));
  return { next: cleanStatuses([post, ...rest]), replaced };
};

/**
 * Merges statuses loaded from the cloud with what is on this device.
 * Keeps createdAt/userId from the local copy if the cloud row did not return them,
 * and appends the demo statuses that are not online.
 */
export const mergeRemoteStatuses = (
  remote: StatusPost[],
  local: StatusPost[],
  seeds: StatusPost[] = []
): StatusPost[] => {
  const localById = new Map(local.map(s => [s.id, s]));
  const merged = remote.map(r => {
    const l = localById.get(r.id);
    return { ...r, createdAt: r.createdAt || l?.createdAt, userId: r.userId || l?.userId };
  });
  return [...merged, ...seeds.filter(sd => !merged.some(m => m.id === sd.id))];
};
