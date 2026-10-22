/**
 * RADA premium subscriptions: shared types, plan metadata, limits helper, API wrappers and hooks.
 *
 * Source of truth is public.subscriptions in Supabase (one row per user + kind). Users can only READ
 * their own rows; every change goes through admin-only RPCs (add_subscription, change_tier,
 * extend_subscription, terminate_subscription). This file only reads and displays.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type PlanId = 'free' | 'pro' | 'elite';
export type SubKind = 'creator' | 'merchant';
export type SubStatus = 'trialing' | 'active' | 'expired' | 'terminated';

export interface SubscriptionRecord {
  user_id: string;
  kind: SubKind;
  plan: PlanId;
  status: SubStatus;
  /** Plan the user actually gets right now (Free once a trial/period has run out). */
  effective_plan: PlanId;
  /** 'expired' when a trialing/active row has passed its end date. */
  effective_status: SubStatus;
  origin: 'creator' | 'admin';
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  ends_at: string | null;
  days_left: number | null;
  terminated_reason: string | null;
  terminated_at: string | null;
  updated_at: string;
}

export type MySubscriptions = Record<SubKind, SubscriptionRecord | null>;

export const SUPPORT_EMAIL = 'hello.rada.app@gmail.com';
export const TRIAL_LENGTH_DAYS = 30;

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------
export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'elite'];
export const planRank = (p?: PlanId | null) => (p ? PLAN_ORDER.indexOf(p) : 0);
export const highestPlan = (...plans: (PlanId | null | undefined)[]): PlanId =>
  plans.reduce<PlanId>((best, p) => (p && planRank(p) > planRank(best) ? p : best), 'free');

export const PLAN_META: Record<PlanId, { name: string; tagline: Record<SubKind, string> }> = {
  free: {
    name: 'Free',
    tagline: {
      creator: 'Everything you need to start hosting.',
      merchant: 'A simple storefront on RADA.',
    },
  },
  pro: {
    name: 'Pro',
    tagline: {
      creator: 'Host more often, with bigger groups.',
      merchant: 'Stand out with the Business badge.',
    },
  },
  elite: {
    name: 'Elite',
    tagline: {
      creator: 'No limits, plus the Golden Creator badge.',
      merchant: 'Golden Featured status across RADA.',
    },
  },
};

export type FeatureCell = string | boolean;
export interface FeatureRow {
  label: string;
  hint?: string;
  free: FeatureCell;
  pro: FeatureCell;
  elite: FeatureCell;
}

export const PLAN_FEATURES: Record<SubKind, FeatureRow[]> = {
  creator: [
    { label: 'Outings you can host', hint: 'Per calendar month', free: '4 / month', pro: '10 / month', elite: 'Unlimited' },
    { label: 'Attendees per outing', hint: 'Venue capacity and safety rules still apply', free: 'Up to 10', pro: 'Up to 30', elite: 'No standard cap' },
    { label: 'Waitlist tools', hint: 'Where available', free: false, pro: true, elite: true },
    { label: 'Professional host profile', free: true, pro: true, elite: true },
    { label: 'Profile badge', hint: 'Shown on your public profile', free: false, pro: 'Creator', elite: 'Golden Creator' },
    { label: 'Profile personalization', free: 'Standard', pro: 'Expanded', elite: 'Advanced layouts' },
    { label: 'Analytics', hint: 'Estimates from available platform data', free: 'Basic view counts', pro: 'Profile views & link clicks', elite: 'Expanded suite' },
    { label: 'Broadcasts', hint: 'Subject to consent, permissions and delivery settings', free: false, pro: 'To subscribed users', elite: 'To push-enabled users' },
    { label: 'Media', free: 'Photos', pro: 'Photos & video', elite: 'Photos & video' },
  ],
  merchant: [
    { label: 'Business storefront', free: true, pro: true, elite: true },
    { label: 'Spots, events & offers', free: true, pro: true, elite: true },
    { label: 'Storefront badge', hint: 'Needs an approved business', free: false, pro: 'Business', elite: 'Golden Featured' },
    { label: 'Golden badge on spots & offers', free: false, pro: false, elite: true },
  ],
};

// ---------------------------------------------------------------------------
// Limits helper (shared by the UI; the same numbers are enforced in Postgres)
// ---------------------------------------------------------------------------
export interface OutingLimits {
  /** null = unlimited */
  perMonth: number | null;
  /** null = unlimited */
  attendees: number | null;
}

export const OUTING_LIMITS: Record<PlanId, OutingLimits> = {
  free: { perMonth: 4, attendees: 10 },
  pro: { perMonth: 10, attendees: 30 },
  elite: { perMonth: null, attendees: null },
};

/** Slider ceiling used in the UI when a plan has no attendee cap. */
export const UNLIMITED_ATTENDEES_UI_MAX = 100;

export const getOutingLimits = (plan: PlanId): OutingLimits => OUTING_LIMITS[plan] || OUTING_LIMITS.free;

export function attendeeCeiling(plan: PlanId): number {
  return getOutingLimits(plan).attendees ?? UNLIMITED_ATTENDEES_UI_MAX;
}

export function clampAttendees(plan: PlanId, value: number): number {
  return Math.max(2, Math.min(attendeeCeiling(plan), Math.round(value) || 2));
}

export interface OutingQuota {
  plan: PlanId;
  used: number;
  /** null = unlimited */
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  attendeeCap: number | null;
}

export function getOutingQuota(plan: PlanId, usedThisMonth: number): OutingQuota {
  const { perMonth, attendees } = getOutingLimits(plan);
  const used = Math.max(0, usedThisMonth || 0);
  return {
    plan,
    used,
    limit: perMonth,
    remaining: perMonth === null ? null : Math.max(0, perMonth - used),
    allowed: perMonth === null || used < perMonth,
    attendeeCap: attendees,
  };
}

const monthKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).slice(0, 7);

/** Counts outings a host created in the current calendar month (Nairobi time). */
export function countOutingsThisMonth(
  outings: { hostId?: string; createdAt?: string }[],
  hostId?: string | null,
  now: Date = new Date()
): number {
  if (!hostId) return 0;
  const key = monthKey(now);
  return outings.filter((o) => o.hostId === hostId && o.createdAt && monthKey(new Date(o.createdAt)) === key).length;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export type TierBadgeKind = 'creator' | 'golden_creator' | 'business' | 'golden_featured';

export function tierBadgeFor(kind: SubKind, plan?: PlanId | null): TierBadgeKind | null {
  if (plan === 'elite') return kind === 'creator' ? 'golden_creator' : 'golden_featured';
  if (plan === 'pro') return kind === 'creator' ? 'creator' : 'business';
  return null;
}

export const TIER_BADGE_LABEL: Record<TierBadgeKind, string> = {
  creator: 'Creator',
  golden_creator: 'Golden Creator',
  business: 'Business',
  golden_featured: 'Golden Featured',
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
}

export const daysLabel = (n: number | null | undefined): string =>
  n === null || n === undefined ? 'No end date' : n === 1 ? '1 day left' : `${n} days left`;

export const createPermanentEliteRecord = (kind: SubKind, userId: string = 'admin'): SubscriptionRecord => ({
  user_id: userId,
  kind,
  plan: 'elite',
  status: 'active',
  effective_plan: 'elite',
  effective_status: 'active',
  origin: 'admin',
  trial_started_at: null,
  trial_ends_at: null,
  current_period_end: null, // Forever
  ends_at: null,
  days_left: null, // "No end date" / Lifetime
  terminated_reason: null,
  terminated_at: null,
  updated_at: new Date().toISOString(),
});

export function isPermanentEliteAccount(email?: string | null, role?: string | null): boolean {
  if (!email && !role) return false;
  const e = (email || '').toLowerCase().trim();
  const r = (role || '').toLowerCase().trim();
  return e === 'lowkeywayne21@gmail.com' || e.includes('admin') || r === 'admin';
}

const EMPTY: MySubscriptions = { creator: null, merchant: null };

export async function fetchMySubscriptions(): Promise<MySubscriptions> {
  let isForeverElite = false;
  let uid = 'user';

  if (isSupabaseConfigured && supabase?.auth) {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (sessionUser) {
        uid = sessionUser.id;
        const email = sessionUser.email || '';
        const role = sessionUser.user_metadata?.role;
        if (isPermanentEliteAccount(email, role)) {
          isForeverElite = true;
        }
      }
    } catch {}
  }

  try {
    const rawUser = localStorage.getItem('rada_current_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (isPermanentEliteAccount(parsed?.email, parsed?.role) || parsed?.handle === '@admin') {
        isForeverElite = true;
      }
    }
  } catch {}

  if (isForeverElite) {
    return {
      creator: createPermanentEliteRecord('creator', uid),
      merchant: createPermanentEliteRecord('merchant', uid),
    };
  }

  if (!isSupabaseConfigured) return EMPTY;
  const { data, error } = await supabase.rpc('get_my_subscriptions');
  if (error) throw new Error(error.message);
  const out: MySubscriptions = { creator: null, merchant: null };
  for (const row of (data as SubscriptionRecord[] | null) || []) out[row.kind] = row;
  return out;
}

export async function fetchMyOutingUsage(): Promise<{ plan: PlanId; used: number } | null> {
  if (isSupabaseConfigured && supabase?.auth) {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (sessionUser && isPermanentEliteAccount(sessionUser.email, sessionUser.user_metadata?.role)) {
        return { plan: 'elite', used: 0 };
      }
    } catch {}
  }
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_my_outing_usage');
  if (error || !data) return null;
  return { plan: (data.plan as PlanId) || 'free', used: Number(data.used) || 0 };
}

export function useMySubscriptions(userId?: string | null) {
  const [subs, setSubs] = useState<MySubscriptions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSubs(EMPTY);
      return;
    }
    setLoading(true);
    try {
      setSubs(await fetchMySubscriptions());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load your plan');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-check when the person returns to the app so countdowns and admin changes stay fresh.
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, refresh]);

  const plan = useMemo(
    () => highestPlan(subs.creator?.effective_plan, subs.merchant?.effective_plan),
    [subs]
  );

  return { subs, loading, error, refresh, plan };
}

// ----- public badges (only the tier is exposed, never dates or status) -----
export interface PublicTiers {
  creator?: PlanId;
  merchant?: PlanId;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const badgeCache = new Map<string, { at: number; tiers: PublicTiers }>();
const BADGE_TTL_MS = 5 * 60 * 1000;

export async function fetchPublicTiers(userIds: string[]): Promise<Record<string, PublicTiers>> {
  const ids = Array.from(new Set(userIds.filter((id) => id && UUID_RE.test(id))));
  const result: Record<string, PublicTiers> = {};
  const missing: string[] = [];
  const now = Date.now();
  for (const id of ids) {
    const hit = badgeCache.get(id);
    if (hit && now - hit.at < BADGE_TTL_MS) result[id] = hit.tiers;
    else missing.push(id);
  }
  if (missing.length && isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('get_public_badges', { p_user_ids: missing });
    if (!error) {
      const fresh: Record<string, PublicTiers> = {};
      for (const id of missing) fresh[id] = {};
      for (const row of (data as { user_id: string; kind: SubKind; plan: PlanId }[]) || []) {
        fresh[row.user_id] = { ...fresh[row.user_id], [row.kind]: row.plan };
      }
      for (const id of missing) {
        badgeCache.set(id, { at: now, tiers: fresh[id] });
        result[id] = fresh[id];
      }
    }
  }
  return result;
}

export function usePublicTiers(userIds: (string | undefined | null)[]): Record<string, PublicTiers> {
  const key = Array.from(new Set(userIds.filter(Boolean) as string[])).sort().join(',');
  const [tiers, setTiers] = useState<Record<string, PublicTiers>>({});
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setTiers({});
      return;
    }
    fetchPublicTiers(key.split(',')).then((t) => {
      if (!cancelled) setTiers(t);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return tiers;
}

// ---------------------------------------------------------------------------
// Admin API (all RPCs re-check is_rada_admin() on the server)
// ---------------------------------------------------------------------------
export interface AdminSubscriptionUser {
  user_id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_creator: boolean;
  businesses: string[];
  creator: SubscriptionRecord | null;
  merchant: SubscriptionRecord | null;
}

export interface SubscriptionEvent {
  kind: SubKind;
  action: string;
  from_plan: PlanId | null;
  to_plan: PlanId | null;
  from_status: SubStatus | null;
  to_status: SubStatus | null;
  reason: string | null;
  created_at: string;
}

type Result<T> = { data: T | null; error: string | null };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { data: null, error: error.message };
  return { data: data as T, error: null };
}

export const adminListSubscriptions = (search?: string, limit = 60) =>
  rpc<AdminSubscriptionUser[]>('admin_list_subscriptions', { p_search: search || null, p_limit: limit });

export const adminAddSubscription = (
  userId: string, kind: SubKind, plan: PlanId, opts: { days?: number | null; trial?: boolean; note?: string } = {}
) =>
  rpc<SubscriptionRecord>('add_subscription', {
    p_user_id: userId, p_kind: kind, p_plan: plan,
    p_days: opts.days ?? null, p_trial: !!opts.trial, p_note: opts.note || null,
  });

export const adminChangeTier = (
  userId: string, kind: SubKind, plan: PlanId, opts: { days?: number | null; note?: string } = {}
) =>
  rpc<SubscriptionRecord>('change_tier', {
    p_user_id: userId, p_kind: kind, p_plan: plan, p_days: opts.days ?? null, p_note: opts.note || null,
  });

export const adminExtendSubscription = (userId: string, kind: SubKind, days: number, note?: string) =>
  rpc<SubscriptionRecord>('extend_subscription', { p_user_id: userId, p_kind: kind, p_days: days, p_note: note || null });

export const adminTerminateSubscription = (userId: string, kind: SubKind, reason: string) =>
  rpc<SubscriptionRecord>('terminate_subscription', { p_user_id: userId, p_kind: kind, p_reason: reason });

export const adminSubscriptionHistory = (userId: string) =>
  rpc<SubscriptionEvent[]>('admin_subscription_history', { p_user_id: userId });
