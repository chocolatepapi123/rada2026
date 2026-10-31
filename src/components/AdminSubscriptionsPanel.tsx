import { isOfficialAdmin } from '../types.ts';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, ChevronRight, Crown, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import {
  PLAN_META,
  PLAN_ORDER,
  adminAddSubscription,
  adminChangeTier,
  adminExtendSubscription,
  adminListSubscriptions,
  adminSubscriptionHistory,
  adminTerminateSubscription,
  createPermanentEliteRecord,
  daysLabel,
  formatDate,
  type AdminSubscriptionUser,
  type PlanId,
  type SubKind,
  type SubscriptionEvent,
  type SubscriptionRecord,
} from '../lib/subscriptions';
import { PlanPill } from './SubscriptionPlans';
import type { ToastOptions } from './Toast.tsx';

type Filter = 'all' | 'trialing' | 'pro' | 'elite' | 'free' | 'ended';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'trialing', label: 'On trial' },
  { id: 'pro', label: 'Pro' },
  { id: 'elite', label: 'Elite' },
  { id: 'free', label: 'Free' },
  { id: 'ended', label: 'Ended' },
];

const DURATIONS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No end', days: 0 },
];

const PLAN_BLURB: Record<SubKind, Record<PlanId, string>> = {
  creator: {
    free: '4 outings a month, up to 10 attendees.',
    pro: '10 outings a month, up to 30 attendees, Creator badge.',
    elite: 'Unlimited outings and attendees, Golden Creator badge.',
  },
  merchant: {
    free: 'Basic storefront, standard verification badge.',
    pro: 'Business badge on the storefront.',
    elite: 'Golden Featured badge on storefront, spots and offers.',
  },
};

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-purple-500';

const nameOf = (u: AdminSubscriptionUser) => u.display_name || (u.username ? `@${u.username}` : u.email || 'Unnamed user');

const matchesFilter = (u: AdminSubscriptionUser, f: Filter): boolean => {
  const recs = [u.creator, u.merchant].filter(Boolean) as SubscriptionRecord[];
  switch (f) {
    case 'trialing':
      return recs.some((r) => r.effective_status === 'trialing');
    case 'pro':
      return recs.some((r) => r.effective_plan === 'pro');
    case 'elite':
      return recs.some((r) => r.effective_plan === 'elite');
    case 'free':
      return !recs.some((r) => r.effective_plan !== 'free');
    case 'ended':
      return recs.some((r) => r.effective_status === 'expired' || r.effective_status === 'terminated');
    default:
      return true;
  }
};

const statusText = (r: SubscriptionRecord | null): { text: string; tone: string } => {
  if (!r) return { text: 'No plan yet', tone: 'text-slate-400' };
  switch (r.effective_status) {
    case 'trialing':
      return {
        text: `Trial · ${daysLabel(r.days_left)}`,
        tone: r.days_left !== null && r.days_left <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      };
    case 'active':
      return {
        text: r.ends_at ? `Active · until ${formatDate(r.ends_at)}` : 'Active · no end date',
        tone: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'expired':
      return { text: 'Expired', tone: 'text-red-500' };
    default:
      return { text: 'Terminated', tone: 'text-red-500' };
  }
};

const Avatar: React.FC<{ u: AdminSubscriptionUser; size?: number }> = ({ u, size = 48 }) =>
  u.avatar_url ? (
    <img src={u.avatar_url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-purple-600/10 text-purple-700 dark:text-purple-300 font-black flex items-center justify-center shrink-0"
    >
      {nameOf(u).replace('@', '').slice(0, 1).toUpperCase()}
    </span>
  );

// ---------------------------------------------------------------------------
// One account line inside a user card
// ---------------------------------------------------------------------------
const PlanLine: React.FC<{ label: string; rec: SubscriptionRecord | null; note?: string }> = ({ label, rec, note }) => {
  const st = statusText(rec);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-[13px] font-semibold mt-1 leading-snug ${st.tone}`}>{note && !rec ? note : st.text}</p>
      </div>
      <PlanPill plan={rec?.effective_plan || 'free'} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bottom-sheet editor
// ---------------------------------------------------------------------------
interface SheetProps {
  user: AdminSubscriptionUser;
  initialKind: SubKind;
  onClose: () => void;
  onChanged: (userId: string, kind: SubKind, rec: SubscriptionRecord) => void;
  toast: (m: string, options?: ToastOptions) => void;
}

const EditorSheet: React.FC<SheetProps> = ({ user, initialKind, onClose, onChanged, toast }) => {
  const [kind, setKind] = useState<SubKind>(initialKind);
  const rec = kind === 'creator' ? user.creator : user.merchant;
  const livePaid = !!rec && rec.effective_plan !== 'free' && (rec.effective_status === 'trialing' || rec.effective_status === 'active');

  const [plan, setPlan] = useState<PlanId>(rec && rec.effective_plan !== 'free' ? rec.effective_plan : 'pro');
  const [days, setDays] = useState<number>(30);
  const [asTrial, setAsTrial] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<SubscriptionEvent[] | null>(null);

  // Reset the form whenever the admin flips between Creator and Merchant.
  useEffect(() => {
    const r = kind === 'creator' ? user.creator : user.merchant;
    setPlan(r && r.effective_plan !== 'free' ? r.effective_plan : 'pro');
    setDays(30);
    setAsTrial(false);
    setReason('');
    setConfirming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const loadHistory = useCallback(async () => {
    const { data } = await adminSubscriptionHistory(user.user_id);
    setHistory(data || []);
  }, [user.user_id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (label: string, fn: () => Promise<{ data: SubscriptionRecord | null; error: string | null }>, ok: string) => {
    setBusy(label);
    const { data, error } = await fn();
    setBusy(null);
    if (error || !data) {
      toast(error || 'Something went wrong', { type: 'error' });
      return;
    }
    toast(ok);
    onChanged(user.user_id, kind, data);
    setConfirming(false);
    setReason('');
    void loadHistory();
  };

  const applyPlan = () => {
    const name = PLAN_META[plan].name;
    if (livePaid && plan !== 'free') {
      return run('apply', () => adminChangeTier(user.user_id, kind, plan), `Switched to ${name}.`);
    }
    if (plan === 'free') {
      return run('apply', () => adminChangeTier(user.user_id, kind, 'free'), 'Moved to the Free plan.');
    }
    return run(
      'apply',
      () => adminAddSubscription(user.user_id, kind, plan, { days, trial: asTrial }),
      asTrial ? `${name} trial started.` : `${name} assigned.`
    );
  };

  const alreadyFree = !!rec && rec.effective_plan === 'free' && rec.effective_status === 'active';
  const canApply = livePaid ? plan !== rec!.effective_plan : plan === 'free' ? !alreadyFree : true;
  const canExtend = !!rec && rec.plan !== 'free' && !(livePaid && rec.ends_at === null);
  const st = statusText(rec);

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={`Manage plan for ${nameOf(user)}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center pointer-events-none">
        <div className="pointer-events-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-6 pt-3 pb-4 border-b border-slate-100 dark:border-slate-900">
            <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mb-4 sm:hidden" />
            <div className="flex items-center gap-4">
              <Avatar u={user} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-black truncate">{nameOf(user)}</p>
                <p className="text-[13px] text-slate-500 truncate">{user.email || (user.username ? `@${user.username}` : '')}</p>
              </div>
              <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Account kind */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900">
              {(['creator', 'merchant'] as SubKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`py-3 rounded-xl text-[14px] font-black transition cursor-pointer ${
                    kind === k ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {k === 'creator' ? 'Creator account' : 'Merchant account'}
                </button>
              ))}
            </div>

            {/* Current state */}
            <section className="rounded-3xl bg-slate-50 dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-400">Right now</p>
                <PlanPill plan={rec?.effective_plan || 'free'} />
              </div>
              <p className={`text-[15px] font-black ${st.tone}`}>{st.text}</p>
              {rec && (
                <div className="text-[13px] text-slate-500 leading-relaxed space-y-1">
                  <p>{rec.origin === 'admin' ? 'Set by a RADA admin.' : 'Started automatically at onboarding.'}</p>
                  {rec.trial_started_at && <p>Trial began {formatDate(rec.trial_started_at)}.</p>}
                  {rec.terminated_reason && (
                    <p className="text-red-500">
                      Terminated {formatDate(rec.terminated_at)}: {rec.terminated_reason}
                    </p>
                  )}
                </div>
              )}
              {kind === 'merchant' && user.businesses.length > 0 && (
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  Covers {user.businesses.length} business{user.businesses.length > 1 ? 'es' : ''}: {user.businesses.slice(0, 3).join(', ')}
                  {user.businesses.length > 3 ? ` +${user.businesses.length - 3} more` : ''}
                </p>
              )}
            </section>

            {/* Choose plan */}
            <section className="space-y-4">
              <h3 className="text-[15px] font-black">{livePaid ? 'Change tier' : 'Assign a plan'}</h3>
              <div className="space-y-3">
                {PLAN_ORDER.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    aria-pressed={plan === p}
                    className={`w-full text-left rounded-2xl border-2 px-5 py-4 flex items-center gap-4 transition cursor-pointer ${
                      plan === p ? 'border-purple-600 bg-purple-600/5' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        plan === p ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {plan === p && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-black">
                        {p === 'elite' && <Crown className="w-4 h-4 text-amber-500" />}
                        {PLAN_META[p].name}
                      </span>
                      <span className="block text-[13px] text-slate-500 mt-1 leading-snug">{PLAN_BLURB[kind][p]}</span>
                    </span>
                  </button>
                ))}
              </div>

              {!livePaid && plan !== 'free' && (
                <div className="space-y-4 pt-1">
                  <p className="text-[13px] font-bold">How long?</p>
                  <div className="flex flex-wrap gap-2.5">
                    {DURATIONS.filter((d) => !(asTrial && d.days === 0)).map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setDays(d.days)}
                        className={`px-4 py-2.5 rounded-full text-[13px] font-bold border transition cursor-pointer ${
                          days === d.days
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={asTrial}
                      onChange={(e) => {
                        setAsTrial(e.target.checked);
                        if (e.target.checked && days === 0) setDays(30);
                      }}
                      className="mt-1 w-4 h-4 accent-purple-600"
                    />
                    <span className="text-[13px] leading-snug">
                      <span className="font-bold">Mark as a free trial</span>
                      <span className="block text-slate-500 mt-0.5">The person sees a trial countdown instead of a plain plan.</span>
                    </span>
                  </label>
                </div>
              )}
              {livePaid && (
                <p className="text-[13px] text-slate-500 leading-relaxed">Switching tier keeps the current end date.</p>
              )}

              <button
                type="button"
                onClick={applyPlan}
                disabled={!!busy || !canApply}
                className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-black flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {busy === 'apply' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{livePaid ? `Switch to ${PLAN_META[plan].name}` : plan === 'free' ? 'Set to Free' : `Assign ${PLAN_META[plan].name}`}</span>
              </button>
            </section>

            {/* Extend */}
            {canExtend && (
              <section className="space-y-4">
                <h3 className="text-[15px] font-black">Extend access</h3>
                <div className="flex flex-wrap gap-2.5">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`px-4 py-2.5 rounded-full text-[13px] font-bold border transition cursor-pointer ${
                        extendDays === d
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      +{d} days
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => run('extend', () => adminExtendSubscription(user.user_id, kind, extendDays), `Extended by ${extendDays} days.`)}
                  disabled={!!busy}
                  className="w-full py-4 rounded-2xl border-2 border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-600/5 disabled:opacity-40 text-[14px] font-black flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  {busy === 'extend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                  <span>Extend by {extendDays} days</span>
                </button>
              </section>
            )}

            {/* Terminate */}
            {rec && rec.effective_status !== 'terminated' && rec.plan !== 'free' && (
              <section className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[15px] font-black text-red-700 dark:text-red-300">Terminate access</h3>
                    <p className="text-[13px] text-red-700/80 dark:text-red-300/80 mt-1 leading-relaxed">
                      Drops this account to Free right away. The reason is saved to the log and shown to the user.
                    </p>
                  </div>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setConfirming(false);
                  }}
                  rows={3}
                  placeholder="Reason (required)"
                  className={inputCls}
                />
                {!confirming ? (
                  <button
                    type="button"
                    disabled={reason.trim().length < 3 || !!busy}
                    onClick={() => setConfirming(true)}
                    className="w-full py-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-600 disabled:opacity-40 text-[14px] font-black cursor-pointer"
                  >
                    Terminate…
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setConfirming(false)} className="py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[14px] font-bold cursor-pointer">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run('terminate', () => adminTerminateSubscription(user.user_id, kind, reason), 'Subscription terminated. Account is on Free.')}
                      className="py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[14px] font-black flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {busy === 'terminate' && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Yes, terminate</span>
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* History */}
            <section className="space-y-4">
              <h3 className="text-[15px] font-black">History</h3>
              {history === null ? (
                <p className="text-[13px] text-slate-400">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-[13px] text-slate-400">No changes recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {history.map((h, i) => (
                    <li key={i} className="flex gap-3.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold leading-snug">
                          {h.kind === 'creator' ? 'Creator' : 'Merchant'} · {h.action.replace('_', ' ')}
                          {h.to_plan && <span className="text-slate-500 font-semibold"> → {PLAN_META[h.to_plan].name}</span>}
                        </p>
                        {h.reason && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{h.reason}</p>}
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Panel (tab content)
// ---------------------------------------------------------------------------
export const AdminSubscriptionsPanel: React.FC<{ toast: (m: string, options?: ToastOptions) => void }> = ({ toast }) => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [users, setUsers] = useState<AdminSubscriptionUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; kind: SubKind } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await adminListSubscriptions(debounced, 100);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const mapped = (data || []).map((u) => {
      const email = (u.email || '').toLowerCase().trim();
      if (isOfficialAdmin(email)) {
        return {
          ...u,
          creator: createPermanentEliteRecord('creator', u.user_id),
          merchant: createPermanentEliteRecord('merchant', u.user_id),
        };
      }
      return u;
    });


    setUsers(mapped);
  }, [debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const onChanged = (userId: string, kind: SubKind, rec: SubscriptionRecord) =>
    setUsers((list) => (list || []).map((u) => (u.user_id === userId ? { ...u, [kind]: rec } : u)));

  const stats = useMemo(() => {
    const recs = (users || []).flatMap((u) => [u.creator, u.merchant]).filter(Boolean) as SubscriptionRecord[];
    return {
      trial: recs.filter((r) => r.effective_status === 'trialing').length,
      pro: recs.filter((r) => r.effective_plan === 'pro').length,
      elite: recs.filter((r) => r.effective_plan === 'elite').length,
      soon: recs.filter((r) => (r.effective_status === 'trialing' || r.effective_status === 'active') && r.days_left !== null && r.days_left <= 7).length,
    };
  }, [users]);

  const visible = useMemo(() => (users || []).filter((u) => matchesFilter(u, filter)), [users, filter]);
  const editingUser = editing ? (users || []).find((u) => u.user_id === editing.id) : null;

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-3xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-xl font-black tracking-tight">Subscriptions</h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">
          Search for someone, tap their card, then assign a plan, extend their access or end it.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'On trial', value: stats.trial },
          { label: 'Pro', value: stats.pro },
          { label: 'Elite', value: stats.elite },
          { label: 'Ending in 7 days', value: stats.soon },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-3xl font-black tabular-nums">{users ? s.value : '–'}</p>
            <p className="text-[13px] text-slate-500 mt-1.5 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, @username, email or business"
            className={`${inputCls} pl-12 py-4`}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex gap-2.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2.5 rounded-full text-[13px] font-bold border whitespace-nowrap transition cursor-pointer ${
                  filter === f.id
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-5 text-[13px] text-red-700 dark:text-red-300 leading-relaxed">
          {error}
        </div>
      )}

      {users === null && !error ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : visible.length === 0 && !error ? (
        <p className="text-[14px] text-slate-500 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          No one matches that search.
        </p>
      ) : (
        <div className="space-y-5">
          {visible.map((u) => (
            <div key={u.user_id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
              <button
                type="button"
                onClick={() => setEditing({ id: u.user_id, kind: u.creator || !u.merchant ? 'creator' : 'merchant' })}
                className="w-full text-left p-5 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <Avatar u={u} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-black truncate">{nameOf(u)}</p>
                    <p className="text-[13px] text-slate-500 truncate mt-0.5">{u.email || (u.username ? `@${u.username}` : '')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                </div>
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-900 space-y-5">
                  <PlanLine label="Creator" rec={u.creator} note={u.is_creator ? undefined : 'Not a creator'} />
                  <PlanLine label="Merchant" rec={u.merchant} note={u.businesses.length ? undefined : 'No business'} />
                </div>
              </button>
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex gap-3">
                {(['creator', 'merchant'] as SubKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEditing({ id: u.user_id, kind: k })}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-[13px] font-bold cursor-pointer transition"
                  >
                    Manage {k}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {users && users.length >= 100 && (
            <p className="text-[12px] text-slate-400 text-center">Showing the 100 newest matches. Search to narrow it down.</p>
          )}
        </div>
      )}

      {editing && editingUser && (
        <EditorSheet
          key={editing.id}
          user={editingUser}
          initialKind={editing.kind}
          onClose={() => setEditing(null)}
          onChanged={onChanged}
          toast={toast}
        />
      )}
    </div>
  );
};

export default AdminSubscriptionsPanel;
