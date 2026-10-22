import React, { useState } from 'react';
import { AlertCircle, Check, ChevronDown, Clock, Crown, Loader2, Mail, Minus, RefreshCw, Sparkles } from 'lucide-react';
import {
  PLAN_FEATURES,
  PLAN_META,
  PLAN_ORDER,
  SUPPORT_EMAIL,
  TRIAL_LENGTH_DAYS,
  daysLabel,
  formatDate,
  planRank,
  type FeatureCell,
  type PlanId,
  type SubKind,
  type SubscriptionRecord,
} from '../lib/subscriptions';

// ---------------------------------------------------------------------------
// shared look
// ---------------------------------------------------------------------------
const PLAN_STYLE: Record<PlanId, { ring: string; chip: string; accent: string; icon: string }> = {
  free: {
    ring: 'border-slate-200 dark:border-slate-800',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    accent: 'text-slate-500 dark:text-slate-400',
    icon: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
  },
  pro: {
    ring: 'border-[#E0533C]/50 dark:border-[#D17A68]/50',
    chip: 'bg-[#E0533C]/10 text-[#E0533C] dark:text-[#D17A68]',
    accent: 'text-[#E0533C] dark:text-[#D17A68]',
    icon: 'bg-[#E0533C]/10 text-[#E0533C] dark:text-[#D17A68]',
  },
  elite: {
    ring: 'border-amber-400/70 dark:border-amber-500/60',
    chip: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950',
    accent: 'text-amber-600 dark:text-amber-400',
    icon: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950',
  },
};

export const PlanPill: React.FC<{ plan: PlanId; className?: string }> = ({ plan, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide ${PLAN_STYLE[plan].chip} ${className}`}
  >
    {plan === 'elite' && <Crown className="w-3 h-3" />}
    {PLAN_META[plan].name}
  </span>
);

const PlanIcon: React.FC<{ plan: PlanId }> = ({ plan }) => (
  <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${PLAN_STYLE[plan].icon}`}>
    {plan === 'elite' ? <Crown className="w-5 h-5" /> : plan === 'pro' ? <Sparkles className="w-5 h-5" /> : <Check className="w-5 h-5" />}
  </span>
);

// ---------------------------------------------------------------------------
// Countdown / status banner
// ---------------------------------------------------------------------------
interface TrialBannerProps {
  record: SubscriptionRecord | null;
  onManage?: () => void;
  /** Compact version for use above other content (single block, no progress bar). */
  compact?: boolean;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ record, onManage, compact = false }) => {
  if (!record) return null;
  const status = record.effective_status;
  const days = record.days_left;
  const planName = PLAN_META[record.plan]?.name || 'Pro';

  type Tone = 'trial' | 'soon' | 'ended' | 'terminated';
  let tone: Tone | null = null;
  let title = '';
  let body = '';

  if (status === 'trialing') {
    const soon = days !== null && days <= 7;
    tone = soon ? 'soon' : 'trial';
    title = soon ? 'Your trial ends soon' : `Your ${planName} trial`;
    body = record.trial_ends_at ? `Full ${planName} access until ${formatDate(record.trial_ends_at)}.` : `Full ${planName} access.`;
  } else if (status === 'active' && record.plan !== 'free' && days !== null && days <= 7) {
    tone = 'soon';
    title = `${planName} ends soon`;
    body = `Your ${planName} plan ends on ${formatDate(record.current_period_end)}.`;
  } else if (status === 'expired') {
    tone = 'ended';
    title = `Your ${planName} trial has ended`;
    body = "You're now on the Free plan. Ask the RADA team to switch Pro back on.";
  } else if (status === 'terminated') {
    tone = 'terminated';
    title = 'Your plan was ended by RADA';
    body = record.terminated_reason ? `Reason: ${record.terminated_reason}` : "You're now on the Free plan.";
  }
  if (!tone) return null;

  const live = tone === 'trial' || tone === 'soon';
  const tones: Record<Tone, string> = {
    trial: 'bg-gradient-to-br from-[#E0533C] to-[#C2412D] text-white',
    soon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    ended: 'bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100',
    terminated: 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200',
  };
  const subtle = live ? 'text-white/80' : 'text-slate-600 dark:text-slate-400';
  const pct =
    status === 'trialing' && days !== null
      ? Math.max(4, Math.min(100, Math.round((days / TRIAL_LENGTH_DAYS) * 100)))
      : 0;

  return (
    <div className={`rounded-3xl p-5 sm:p-6 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start gap-4">
        {live ? (
          <div className="shrink-0 w-[72px] h-[72px] rounded-2xl bg-white/15 flex flex-col items-center justify-center">
            <span className="text-[28px] leading-none font-black tabular-nums">{days ?? '∞'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-white/80">{days === 1 ? 'day' : 'days'}</span>
          </div>
        ) : (
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center">
            {tone === 'terminated' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-snug">{title}</p>
          <p className={`text-[13px] mt-1.5 leading-relaxed ${subtle}`}>{body}</p>
          {live && days !== null && <p className="text-[12px] font-bold mt-2 text-white/90">{daysLabel(days)}</p>}
        </div>
      </div>

      {live && !compact && pct > 0 && (
        <div className="mt-5 h-2 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
      )}

      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className={`mt-5 w-full sm:w-auto px-5 py-3 rounded-2xl text-[13px] font-black transition cursor-pointer ${
            live
              ? 'bg-white text-slate-900 hover:bg-white/90'
              : 'bg-[#E0533C] hover:bg-orange-700 text-white'
          }`}
        >
          {live ? 'View plan details' : 'See plans'}
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Plan cards + comparison matrix
// ---------------------------------------------------------------------------
const Cell: React.FC<{ value: FeatureCell; plan: PlanId }> = ({ value, plan }) => {
  if (value === true) return <Check className={`w-4 h-4 mx-auto ${PLAN_STYLE[plan].accent}`} aria-label="Included" />;
  if (value === false) return <Minus className="w-4 h-4 mx-auto text-slate-300 dark:text-slate-600" aria-label="Not included" />;
  return <span className="text-[12px] font-bold leading-tight text-slate-800 dark:text-slate-100">{value}</span>;
};

const cellText = (v: FeatureCell): string | null => (v === true ? 'Included' : v === false ? null : v);

interface SubscriptionPlansProps {
  kind: SubKind;
  record: SubscriptionRecord | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  /** Shown in the upgrade email so the RADA team can find the account quickly. */
  accountLabel?: string;
  signedIn?: boolean;
  onOpenAuth?: () => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  kind,
  record,
  loading,
  error,
  onRefresh,
  accountLabel,
  signedIn = true,
  onOpenAuth,
}) => {
  const [showMatrix, setShowMatrix] = useState(false);
  const current: PlanId = record?.effective_plan || 'free';
  const features = PLAN_FEATURES[kind];
  const kindLabel = kind === 'creator' ? 'Creator' : 'Merchant';

  const requestHref = (plan: PlanId) => {
    const subject = `Upgrade request: ${PLAN_META[plan].name} (${kindLabel})`;
    const body = `Hi RADA team,\n\nI'd like to move to the ${PLAN_META[plan].name} plan on my ${kindLabel.toLowerCase()} account${
      accountLabel ? ` (${accountLabel})` : ''
    }.\n\nThanks!`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!signedIn) {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 text-center space-y-4 shadow-sm">
        <PlanIcon plan="pro" />
        <p className="text-[15px] font-black">Sign in to see your plan</p>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
          New professional and merchant accounts start with a free 30-day Pro trial.
        </p>
        {onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black cursor-pointer"
          >
            Log in / Create account
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current plan summary */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <PlanIcon plan={current} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{kindLabel} plan</p>
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <p className="text-xl font-black tracking-tight">{PLAN_META[current].name}</p>
              {record?.effective_status === 'trialing' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Free trial
                </span>
              )}
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Refresh plan"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-slate-500" />}
            </button>
          )}
        </div>
        {record?.ends_at && record.effective_status !== 'expired' && record.effective_status !== 'terminated' && (
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
            {record.effective_status === 'trialing' ? 'Trial ends' : 'Current plan ends'} on{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{formatDate(record.ends_at)}</span>.
          </p>
        )}
        {current === 'elite' && !record?.ends_at && (
          <p className="text-[13px] text-amber-600 dark:text-amber-400 font-extrabold mt-4 flex items-center gap-1.5">
            <Crown className="w-4 h-4 fill-amber-400" />
            <span>Permanent Elite Tier Active (Forever)</span>
          </p>
        )}
        {error && (
          <p className="mt-4 text-[12px] text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>

      <TrialBanner record={record} />

      {/* Plan cards */}
      <div className="space-y-4">
        <h3 className="text-[15px] font-black px-1">Plans</h3>
        {PLAN_ORDER.map((plan) => {
          const isCurrent = plan === current;
          const higher = planRank(plan) > planRank(current);
          return (
            <div
              key={plan}
              className={`rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 sm:p-6 border-2 transition ${
                isCurrent ? PLAN_STYLE[plan].ring : 'border-transparent'
              } shadow-sm`}
            >
              <div className="flex items-start gap-4">
                <PlanIcon plan={plan} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-lg font-black tracking-tight">{PLAN_META[plan].name}</p>
                    {isCurrent && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Current plan
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {PLAN_META[plan].tagline[kind]}
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3.5">
                {features.map((f) => {
                  const v = f[plan];
                  if (v === false) return null;
                  const text = cellText(v);
                  return (
                    <li key={f.label} className="flex items-start gap-3 text-[13px] leading-snug">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${PLAN_STYLE[plan].accent}`} />
                      <span className="text-slate-700 dark:text-slate-200">
                        {f.label}
                        {text && text !== 'Included' && <span className="font-bold text-slate-900 dark:text-white">: {text}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {higher && (
                <a
                  href={requestHref(plan)}
                  className={`mt-6 w-full py-3.5 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2 transition ${
                    plan === 'elite'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 hover:brightness-95'
                      : 'bg-[#E0533C] hover:bg-orange-700 text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Request {PLAN_META[plan].name}</span>
                </a>
              )}
            </div>
          );
        })}
        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
          Plans are set up by the RADA team. Send a request and we&apos;ll switch your account over.
        </p>
      </div>

      {/* Comparison matrix */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMatrix((s) => !s)}
          aria-expanded={showMatrix}
          className="w-full px-5 sm:px-6 py-5 flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <span className="text-[15px] font-black">Compare all features</span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showMatrix ? 'rotate-180' : ''}`} />
        </button>
        {showMatrix && (
          <div className="px-5 sm:px-6 pb-6">
            <div className="grid grid-cols-[1fr_repeat(3,minmax(0,4.75rem))] gap-x-2 items-end pb-3 border-b border-slate-100 dark:border-slate-800">
              <span />
              {PLAN_ORDER.map((p) => (
                <span
                  key={p}
                  className={`text-center text-[11px] font-extrabold uppercase tracking-wide ${PLAN_STYLE[p].accent}`}
                >
                  {PLAN_META[p].name}
                </span>
              ))}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {features.map((f) => (
                <div key={f.label} className="grid grid-cols-[1fr_repeat(3,minmax(0,4.75rem))] gap-x-2 items-center py-4">
                  <div className="pr-2">
                    <p className="text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{f.label}</p>
                    {f.hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{f.hint}</p>}
                  </div>
                  {PLAN_ORDER.map((p) => (
                    <div key={p} className={`text-center rounded-xl py-1 ${p === current ? 'bg-slate-50 dark:bg-white/5' : ''}`}>
                      <Cell value={f[p]} plan={p} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
