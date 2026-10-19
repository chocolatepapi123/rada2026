// "Where are you at" status lifecycle rules.
//  1. One active status per user (a new post replaces the old one)
//  2. Users can delete their active status at any time
//  3. Statuses expire 12 hours after posting
//
// Works on any array of statuses that has: userId, createdAt (ISO string or ms).

export const STATUS_TTL_MS = 12 * 60 * 60 * 1000;

export interface TimedStatus {
  id?: string | number;
  userId: string;
  createdAt: string | number;
}

const ts = (v: string | number) => (typeof v === 'number' ? v : new Date(v).getTime());

export const getStatusExpiry = (s: TimedStatus) => ts(s.createdAt) + STATUS_TTL_MS;
export const isStatusExpired = (s: TimedStatus, now = Date.now()) => getStatusExpiry(s) <= now;

/** Drop anything older than 12h. Call on load, on refresh, and on a timer. */
export function pruneExpired<T extends TimedStatus>(list: T[], now = Date.now()): T[] {
  return list.filter((s) => !isStatusExpired(s, now));
}

/** Replace the user's existing status with the new one (single-active-post rule). */
export function upsertSingleStatus<T extends TimedStatus>(list: T[], next: T, now = Date.now()): T[] {
  return [next, ...pruneExpired(list, now).filter((s) => s.userId !== next.userId)];
}

/** Manual "Delete Post". */
export function removeUserStatus<T extends TimedStatus>(list: T[], userId: string): T[] {
  return list.filter((s) => s.userId !== userId);
}

/** "Expires in 3h 20m" label for the post owner. */
export function expiryLabel(s: TimedStatus, now = Date.now()): string {
  const left = Math.max(0, getStatusExpiry(s) - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
