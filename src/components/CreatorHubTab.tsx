import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  Bookmark,
  CalendarDays,
  Check,
  Clock,
  Crown,
  Eye,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  Lock,
  Megaphone,
  Share2,
  Sparkles,
  UserCircle2,
  Users,
  Video,
  X,
  Zap,
  Star,
} from 'lucide-react';
import type { OutingPlan } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { TierBadge } from './BusinessBadge';
import { SubscriptionPlans, TrialBanner } from './SubscriptionPlans';
import PromotionsPanel from './PromotionsPanel';
import { fetchMyAnalytics, type MyAnalytics } from '../lib/tracking';
import {
  PLAN_META,
  fetchMyOutingUsage,
  getOutingLimits,
  planRank,
  tierBadgeFor,
  useMySubscriptions,
  type PlanId,
} from '../lib/subscriptions';
import { ProfessionalSwitchCard, type OwnProfile } from './ProfileSettingsKit';

type HubTab = 'overview' | 'outings' | 'analytics' | 'audience' | 'profile' | 'plan';

interface CreatorHubTabProps {
  own: OwnProfile;
  outings: OutingPlan[];
  userId?: string;
  onClose: () => void;
  onOpenAuth?: () => void;
  showToast: (msg: string, options?: any) => void;
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString());

const card = 'bg-white dark:bg-[#1C1A1E] shadow-sm rounded-2xl';
const subtle = 'text-slate-500 dark:text-slate-400';

/** What each plan unlocks, straight from the Customer Pricing Guide. */
const CAPS: Record<
  PlanId,
  {
    analytics: 'basic' | 'profile' | 'expanded';
    broadcast: false | 'subscribed' | 'push';
    video: boolean;
    waitlist: boolean;
    personalization: string;
  }
> = {
  free: { analytics: 'basic', broadcast: false, video: false, waitlist: false, personalization: 'Standard profile' },
  pro: { analytics: 'profile', broadcast: 'subscribed', video: true, waitlist: true, personalization: 'Expanded personalization' },
  elite: { analytics: 'expanded', broadcast: 'push', video: true, waitlist: true, personalization: 'Advanced layout customization' },
};

const LockedCard: React.FC<{ title: string; need: PlanId; onUpgrade: () => void; children?: React.ReactNode }> = ({
  title,
  need,
  onUpgrade,
  children,
}) => (
  <div className={`${card} p-4 border border-dashed border-slate-200 dark:border-slate-800`}>
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4 text-slate-400" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black">{title}</p>
        {children && <p className={`text-[11px] mt-0.5 ${subtle}`}>{children}</p>}
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-2 text-[11px] font-black text-[#E0533C] dark:text-[#D17A68] cursor-pointer"
        >
          Available on {PLAN_META[need].name}. See plans
        </button>
      </div>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; loading?: boolean }> = ({
  label,
  value,
  icon,
  loading,
}) => (
  <div className={`${card} p-3`}>
    <div className="text-[#E0533C] dark:text-[#D17A68]">{icon}</div>
    {loading ? (
      <div className="mt-2 h-6 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse motion-reduce:animate-none" />
    ) : (
      <p className="mt-1.5 text-xl font-black leading-none">{value}</p>
    )}
    <p className={`mt-1 text-[11px] font-medium ${subtle}`}>{label}</p>
  </div>
);

export const CreatorHubTab: React.FC<CreatorHubTabProps> = ({ own, outings, userId, onClose, onOpenAuth, showToast }) => {
  const [tab, setTab] = useState<HubTab>('overview');
  const mySubs = useMySubscriptions(userId);
  const creatorSub = mySubs.subs.creator;
  const plan: PlanId = creatorSub?.effective_plan || 'free';
  const caps = CAPS[plan];
  const limits = getOutingLimits(plan);
  const tierBadge = tierBadgeFor('creator', plan);

  // Broadcast draft (delivery is gated by plan; sending is wired server-side)
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');

  const mine = useMemo(() => outings.filter((o) => userId && o.hostId === userId), [outings, userId]);

  const now = new Date();
  const localUsed = useMemo(
    () =>
      mine.filter((o) => {
        if (o.status === 'cancelled') return false;
        const d = new Date(o.createdAt || o.date);
        return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mine]
  );
  const [serverUsed, setServerUsed] = useState<number | null>(null);
  useEffect(() => {
    let off = false;
    if (userId) fetchMyOutingUsage().then((u) => !off && u && setServerUsed(u.used));
    return () => {
      off = true;
    };
  }, [userId, outings.length]);
  const used = serverUsed ?? localUsed;

  const activeOutings = mine.filter((o) => o.status !== 'cancelled' && o.status !== 'completed');
  const pendingRequests = mine.reduce((n, o) => n + (o.attendees || []).filter((a) => a.status === 'pending').length, 0);
  const totalGoing = mine.reduce(
    (n, o) => n + (o.currentAttendeesCount ?? (o.attendees || []).filter((a) => a.status === 'joined' || a.status === 'approved').length),
    0
  );

  const goPlan = () => setTab('plan');

  // Real tracked numbers for hosts (views, profile views, link taps, RSVPs). Falls back to the old estimates.
  const [ana, setAna] = useState<MyAnalytics | null>(null);
  useEffect(() => {
    if (tab !== 'analytics' || !userId) return;
    let off = false;
    fetchMyAnalytics(30).then((a) => !off && setAna(a)).catch(() => undefined);
    return () => { off = true; };
  }, [tab, userId]);
  const tot = ana?.totals || {};
  const profileViewsTracked = (ana?.targets || []).filter((t) => t.target_type === 'profile').reduce((n, t) => n + (t.counts.view || 0), 0);
  const linkTaps = (tot.website || 0) + (tot.whatsapp || 0) + (tot.call || 0) + (tot.directions || 0);
  const outingViews = (id: string) => (ana?.targets || []).find((t) => t.target_type === 'outing' && t.target_id === String(id))?.counts.view || 0;

  const tabs: { id: HubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'outings', label: `My Outings (${mine.length})`, icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'audience', label: 'Audience & Promote', icon: <Megaphone className="w-3.5 h-3.5" /> },
    { id: 'profile', label: 'Profile & Badge', icon: <UserCircle2 className="w-3.5 h-3.5" /> },
    { id: 'plan', label: 'My Plan', icon: <Crown className="w-3.5 h-3.5" /> },
  ];

  const activeCls: Record<HubTab, string> = {
    overview: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    outings: 'bg-[#E0533C] dark:bg-[#A94F3E] text-white',
    analytics: 'bg-amber-600 text-white',
    audience: 'bg-rose-600 text-white',
    profile: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    plan: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950',
  };

  const body = (
    <div className="fixed inset-0 z-[80] bg-slate-50 dark:bg-[#121113] text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Header + menu bar (same pattern as Merchant Hub) */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1C1A1E]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                {own.avatar ? (
                  <img src={own.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 className="w-full h-full text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-black truncate">{own.displayName || 'Creator Hub'}</h2>
                  {tierBadge ? <TierBadge badge={tierBadge} size="xs" /> : own.isPro && <VerifiedBadge status="approved" size="xs" />}
                </div>
                <p className={`text-[11px] truncate ${subtle}`}>
                  Creator Hub • {PLAN_META[plan].name} plan{own.handle ? ` • ${own.handle}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Creator Hub"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  tab === t.id
                    ? `${activeCls[t.id]} shadow-xs`
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-24">
        {/* Not a professional yet: one clear gate for the whole hub */}
        {!own.isPro && tab !== 'plan' && (
          <div className={`${card} overflow-hidden`}>
            <ProfessionalSwitchCard p={own} />
            <div className="px-4 pb-4 space-y-2">
              <p className={`text-[12px] font-semibold ${subtle}`}>Switch on to unlock this hub</p>
              {['Host dashboard, outing manager and analytics', 'Creator badge, broadcasts and video uploads on paid plans', 'Featured spots and priority listing controls'].map((t) => (
                <p key={t} className="text-[12px] flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <span>{t}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {own.isPro && tab !== 'plan' && creatorSub && <TrialBanner record={creatorSub} compact onManage={goPlan} />}

        {/* ============ OVERVIEW ============ */}
        {own.isPro && tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Active outings" value={activeOutings.length} icon={<CalendarDays className="w-4 h-4" />} />
              <Stat label="People going" value={fmt(totalGoing)} icon={<Users className="w-4 h-4" />} />
              <Stat label="Requests" value={pendingRequests} icon={<Clock className="w-4 h-4" />} />
            </div>

            {/* Monthly outing allowance */}
            <div className={`${card} p-4`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-black">Outings this month</p>
                <p className="text-[12px] font-bold">
                  {used} / {limits.perMonth ?? 'Unlimited'}
                </p>
              </div>
              {limits.perMonth !== null && (
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#E0533C] dark:bg-[#A94F3E] rounded-full"
                    style={{ width: `${Math.min(100, (used / limits.perMonth) * 100)}%` }}
                  />
                </div>
              )}
              <p className={`mt-2 text-[11px] ${subtle}`}>
                Up to {limits.attendees ?? 'no standard cap on'} {limits.attendees ? 'attendees ' : 'attendees '}per outing. Venue capacity and safety rules still apply.
              </p>
              {limits.perMonth !== null && used >= limits.perMonth && planRank(plan) < 2 && (
                <button type="button" onClick={goPlan} className="mt-2 text-[11px] font-black text-[#E0533C] dark:text-[#D17A68] cursor-pointer">
                  You have used your monthly outings. See plans
                </button>
              )}
            </div>

            {/* Quick jumps */}
            <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800/80`}>
              {(
                [
                  ['outings', 'Manage my outings', `${activeOutings.length} active`, <CalendarDays key="a" className="w-4 h-4" />],
                  ['analytics', 'See how you are doing', 'Views, saves and RSVPs', <BarChart3 key="b" className="w-4 h-4" />],
                  ['audience', 'Reach your audience', 'Broadcasts and promotion', <Megaphone key="c" className="w-4 h-4" />],
                  ['profile', 'Badge and profile look', caps.personalization, <Sparkles key="d" className="w-4 h-4" />],
                ] as [HubTab, string, string, React.ReactNode][]
              ).map(([id, title, sub, icon]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className="w-full p-3.5 flex items-center gap-3 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <span className="w-8 h-8 rounded-full bg-[#E0533C]/10 dark:bg-[#A94F3E]/10 text-[#E0533C] dark:text-[#D17A68] flex items-center justify-center shrink-0">{icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">{title}</span>
                    <span className={`block text-[11px] truncate ${subtle}`}>{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ MY OUTINGS ============ */}
        {own.isPro && tab === 'outings' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black tracking-tight">My Outings ({mine.length})</h3>
              <p className={`text-xs ${subtle}`}>
                {used} of {limits.perMonth ?? 'unlimited'} used this month. Create new outings from the Outings tab.
              </p>
            </div>

            {mine.length === 0 ? (
              <div className={`${card} text-center py-10 px-6 border border-dashed border-slate-200 dark:border-slate-800`}>
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-black text-sm">No outings yet</h4>
                <p className={`text-xs mt-1 max-w-xs mx-auto ${subtle}`}>Outings you host will show up here with their requests and who is going.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {mine.map((o) => {
                  const pend = (o.attendees || []).filter((a) => a.status === 'pending').length;
                  const going = o.currentAttendeesCount ?? (o.attendees || []).filter((a) => a.status === 'joined' || a.status === 'approved').length;
                  return (
                    <div key={o.id} className={`${card} p-3 flex items-center gap-3`}>
                      {o.spotImage ? (
                        <img src={o.spotImage} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs truncate">{o.spotTitle}</h4>
                        <p className={`text-[11px] truncate ${subtle}`}>
                          {o.date} • {o.time}
                        </p>
                        <p className="text-[11px] mt-0.5 font-semibold">
                          {going}/{o.maxAttendees} going{pend > 0 ? ` • ${pend} request${pend === 1 ? '' : 's'}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          o.status === 'cancelled'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            : o.status === 'completed'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : o.status === 'full'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {(o.status || 'active').replace(/^./, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {caps.waitlist ? (
              <div className={`${card} p-4 flex items-start gap-3`}>
                <span className="w-8 h-8 rounded-full bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></span>
                <div>
                  <p className="text-[13px] font-black">Waitlist tools</p>
                  <p className={`text-[11px] mt-0.5 ${subtle}`}>Custom waitlists are included on your plan, where available in your app version.</p>
                </div>
              </div>
            ) : (
              <LockedCard title="Waitlist tools" need="pro" onUpgrade={goPlan}>Keep a queue when an outing fills up.</LockedCard>
            )}
          </div>
        )}

        {/* ============ ANALYTICS ============ */}
        {own.isPro && tab === 'analytics' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black tracking-tight">Analytics</h3>
              <p className={`text-xs ${subtle}`}>
                {caps.analytics === 'basic' ? 'Basic view counts on the Free plan.' : caps.analytics === 'profile' ? 'Profile views and link clicks on Pro.' : 'Expanded analytics suite on Elite.'} Figures are estimates from available platform data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total views (30 days)" value={fmt(ana ? (tot.view || 0) : own.stats.impressions)} icon={<BarChart3 className="w-4 h-4" />} loading={own.hubLoading} />
              <Stat label="Profile views" value={fmt(ana ? profileViewsTracked : own.stats.profileViews)} icon={<Eye className="w-4 h-4" />} loading={own.hubLoading} />
              {caps.analytics !== 'basic' && (
                <Stat label="Link clicks" value={ana ? fmt(linkTaps) : '—'} icon={<Link2 className="w-4 h-4" />} />
              )}
              {caps.analytics === 'expanded' && (
                <>
                  <Stat label="Event saves" value={fmt(own.stats.eventSaves)} icon={<Bookmark className="w-4 h-4" />} loading={own.hubLoading} />
                  <Stat label="RSVPs" value={fmt(ana ? (tot.rsvp || 0) : own.stats.rsvps)} icon={<Users className="w-4 h-4" />} loading={own.hubLoading} />
                </>
              )}
            </div>

            {caps.analytics === 'basic' && (
              <LockedCard title="Profile views, link clicks and more" need="pro" onUpgrade={goPlan}>
                Pro adds profile views and link clicks. Elite adds saves, RSVPs and the full suite.
              </LockedCard>
            )}
            {caps.analytics === 'profile' && (
              <LockedCard title="Expanded analytics suite" need="elite" onUpgrade={goPlan}>
                Event saves, RSVP trends and more detail per outing.
              </LockedCard>
            )}
            {caps.analytics === 'expanded' && mine.length > 0 && (
              <div className={`${card} p-4`}>
                <p className="text-[13px] font-black mb-2">Per outing</p>
                <div className="space-y-2">
                  {mine.slice(0, 8).map((o) => {
                    const going = o.currentAttendeesCount ?? (o.attendees || []).filter((a) => a.status === 'joined' || a.status === 'approved').length;
                    const pct = o.maxAttendees ? Math.min(100, (going / o.maxAttendees) * 100) : 0;
                    return (
                      <div key={o.id}>
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="truncate pr-2">{o.spotTitle}</span>
                          <span>{ana ? `${outingViews(o.id)} views · ` : ''}{going}/{o.maxAttendees}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!own.hubLoading && own.stats.impressions === null && own.stats.profileViews === null && (
              <p className={`text-[11px] ${subtle}`}>No activity yet. Numbers appear as people see your profile and outings.</p>
            )}
          </div>
        )}

        {/* ============ AUDIENCE & PROMOTE ============ */}
        {own.isPro && tab === 'audience' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-black tracking-tight">Audience & Promote</h3>
              <p className={`text-xs ${subtle}`}>Reach people who follow you, and boost your outings.</p>
            </div>

            {/* Broadcasts */}
            {caps.broadcast ? (
              <div className={`${card} p-4 space-y-3`}>
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-rose-600" />
                  <p className="text-[13px] font-black">New broadcast</p>
                </div>
                <p className={`text-[11px] ${subtle}`}>
                  {caps.broadcast === 'subscribed'
                    ? 'Goes to your subscribed users, subject to their consent and delivery settings.'
                    : 'Goes to eligible push-enabled users, subject to their permissions and delivery settings.'}
                </p>
                <input
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value.slice(0, 60))}
                  placeholder="Title"
                  className="w-full px-3.5 py-2.5 text-[13px] bg-slate-100 dark:bg-[#121113] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40"
                />
                <textarea
                  value={bcBody}
                  onChange={(e) => setBcBody(e.target.value.slice(0, 240))}
                  rows={3}
                  placeholder="What do you want to tell your audience?"
                  className="w-full px-3.5 py-2.5 text-[13px] bg-slate-100 dark:bg-[#121113] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${subtle}`}>{bcBody.length}/240</span>
                  <button
                    type="button"
                    disabled={!bcTitle.trim() || !bcBody.trim()}
                    onClick={() => showToast('Broadcast delivery is not switched on yet. Your draft was not sent.', { type: 'error' })}
                    className="text-xs font-black bg-rose-600 text-white px-4 py-2 rounded-xl disabled:opacity-40 cursor-pointer"
                  >
                    Send broadcast
                  </button>
                </div>
              </div>
            ) : (
              <LockedCard title="Broadcasts" need="pro" onUpgrade={goPlan}>
                Message your subscribed users. Elite reaches eligible push-enabled users.
              </LockedCard>
            )}

            {/* Host controls (existing, saved per user) */}
            <div className={`${card} p-4`}>
              <p className="text-[13px] font-black mb-1">Host controls</p>
              <p className={`text-[11px] mb-2 ${subtle}`}>Visibility is not guaranteed and depends on eligibility and available inventory.</p>
              {(
                [
                  ['featuredSpots', 'Featured outing spots', 'Highlight the spots you host at.', <Star key="f" className="w-4 h-4" />],
                  ['priorityListing', 'Priority event listing', 'Show your outings higher in listings.', <Zap key="z" className="w-4 h-4" />],
                ] as const
              ).map(([key, title, desc, icon]) => (
                <div key={key} className="py-2.5 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 first-of-type:border-t-0">
                  <span className="w-8 h-8 rounded-full bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold">{title}</p>
                    <p className={`text-[11px] ${subtle}`}>{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={own.controls[key]}
                    aria-label={title}
                    disabled={own.controlBusy === key}
                    onClick={() => own.toggleControl(key)}
                    className={`w-11 h-6 rounded-full relative transition cursor-pointer disabled:opacity-60 ${own.controls[key] ? 'bg-[#E0533C] dark:bg-[#A94F3E]' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${own.controls[key] ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Paid boosts (info only, from the pricing guide) */}
            <div className={`${card} p-4`}>
              <p className="text-[13px] font-black">Paid boosts</p>
              <p className={`text-[11px] mt-0.5 mb-2 ${subtle}`}>Separate from your plan. Indicative prices in KES; confirm availability and terms at checkout.</p>
              {[
                ['Outing boost, weekly', 'KES 200 / week'],
                ['Outing boost, weekend (Fri to Sun)', 'KES 300'],
                ['General weekend promotion package', 'KES 500 (Fri to Sun)'],
              ].map(([n, p]) => (
                <div key={n} className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800/80 text-[12px]">
                  <span className="font-semibold pr-3">{n}</span>
                  <span className={`shrink-0 font-bold ${subtle}`}>{p}</span>
                </div>
              ))}
              <p className={`text-[10px] mt-2 ${subtle}`}>Boosts do not guarantee a position, views, RSVPs or attendance.</p>
            </div>
          </div>
        )}

        {/* ============ PROFILE & BADGE ============ */}
        {own.isPro && tab === 'profile' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black tracking-tight">Profile & Badge</h3>
              <p className={`text-xs ${subtle}`}>What people see on your profile and outings.</p>
            </div>

            <div className={`${card} p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <VerifiedBadge status="approved" size="md" />
                <span className="text-[13px] font-bold">Verified host</span>
              </div>
              <div className="flex items-center gap-2">
                {tierBadge ? <TierBadge badge={tierBadge} size="md" /> : <span className={`text-[12px] ${subtle}`}>No paid badge on the Free plan</span>}
              </div>
              <p className={`text-[11px] ${subtle}`}>
                Badges depend on eligibility and are not a guarantee of quality or safety.
              </p>
            </div>

            <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800/80`}>
              {[
                ['Profile look', caps.personalization, <Sparkles key="p" className="w-4 h-4" />, true],
                ['Photo uploads', 'Included on every plan', <ImageIcon key="i" className="w-4 h-4" />, true],
                ['Video uploads', caps.video ? 'Included on your plan' : 'Pro and Elite', <Video key="v" className="w-4 h-4" />, caps.video],
                ['Share your profile', own.handle || 'Set a username first', <Share2 key="s" className="w-4 h-4" />, true],
              ].map(([t, sub, icon, on]) => (
                <div key={t as string} className="p-3.5 flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-[#E0533C]/10 text-[#E0533C]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{icon as React.ReactNode}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">{t as string}</span>
                    <span className={`block text-[11px] truncate ${subtle}`}>{sub as string}</span>
                  </span>
                  {!on && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              ))}
            </div>
            {plan !== 'elite' && (
              <button type="button" onClick={goPlan} className="text-[12px] font-black text-[#E0533C] dark:text-[#D17A68] cursor-pointer">
                {plan === 'free' ? 'Get the Creator badge and video uploads. See plans' : 'Upgrade to the Golden Creator badge. See plans'}
              </button>
            )}
          </div>
        )}

        {/* ============ MY PLAN ============ */}
        {tab === 'plan' && (
          <div className="pb-8">
            <SubscriptionPlans
              kind="creator"
              record={creatorSub}
              loading={mySubs.loading}
              error={mySubs.error}
              onRefresh={mySubs.refresh}
              signedIn={Boolean(userId)}
              onOpenAuth={onOpenAuth}
              accountLabel={own.displayName || 'your account'}
            />
            {mine.length > 0 && (
              <div className="mt-6">
                <PromotionsPanel
                  audience="creator"
                  targets={mine.map((o) => ({ type: 'outing' as const, id: String(o.id), title: `${o.spotTitle || 'Outing'} · ${o.date}` }))}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
};

export default CreatorHubTab;
