import { siteOrigin } from '../lib/siteUrl';
import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  MapPin,
  CheckCircle2,
  Lock,
  Crown,
  PartyPopper,
  Camera,
  Briefcase,
  Loader2,
  Sun,
  Moon,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, OutingPlan, BusinessAccount } from '../types';
import { useMySubscriptions } from '../lib/subscriptions';
import { saveUnifiedProfile } from '../lib/cloudSync';
import { NotificationBell } from './NotificationBell';
import { ProProfileCard, ProProfilePage } from './ProProfile';
// Loaded only when the Creator hub is opened, so the profile page itself opens faster.
const CreatorHubTab = lazy(() => import('./CreatorHubTab').then((m) => ({ default: m.CreatorHubTab })));
import {
  AvatarHero,
  IdentityFields,
  ProfessionalDashboard,
  RelationshipStatusField,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';
import { fetchMilestones, MILESTONE_META, type MilestoneKind, type MilestoneData } from '../lib/milestones';
import {
  THEMES,
  DEFAULT_THEME,
  MAX_TAGS,
  MAX_TAG_LEN,
  cleanTag,
  themeColor,
  fetchProfileLook,
  saveMyProfileLook,
} from '../lib/profileLook';
import type { ToastOptions } from './Toast.tsx';
import { HangoutsTab, type HangoutSpotOption } from './HangoutsTab';

interface ProfilePageProps {
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string, options?: ToastOptions) => void;
  onOpenAuth?: () => void;
  /** Called on every save/switch/upload so the parent App state updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  professionalStats?: { profileViews?: number; outingsHosted?: number; joinRequests?: number };
  outings?: OutingPlan[];
  myBusinesses?: BusinessAccount[];
  savedCount?: number;
  ticketCount?: number;
  onOpenSaved?: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  /** Spots people can link a hangout to. */
  spots?: HangoutSpotOption[];
}

type Tab = 'hangouts' | 'milestones' | 'creator' | 'settings';


const KINDS: MilestoneKind[] = ['outings', 'spots', 'photo_reviews'];
const KIND_COLOR: Record<MilestoneKind, string> = { outings: '#F9D6CE', spots: '#D9EFE3', photo_reviews: '#E4DAF7' };
const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = { party: PartyPopper, pin: MapPin, camera: Camera };

const cleanLoc = (loc?: string) =>
  loc
    ? loc
        .replace(/^nearby\s+/i, '')
        .replace(/\bnearby\b/gi, '')
        .replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '')
        .trim()
    : 'Kenya';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onClose,
  session,
  currentUserProfile,
  showToast,
  onOpenAuth,
  onProfileChange,
  professionalStats,
  outings = [],
  myBusinesses = [],
  savedCount = 0,
  ticketCount = 0,
  onOpenSaved,
  isDarkMode,
  onToggleTheme,
  spots = [],
}) => {
  const user = session?.user;
  const isLoggedIn = !!user;
  const [tab, setTab] = useState<Tab>('hangouts');
  const [hubOpen, setHubOpen] = useState(false);
  const [proPageOpen, setProPageOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const requireLogin = () => {
    showToast('Please sign in first.', { type: 'error' });
    onOpenAuth?.();
  };

  const own = useOwnProfile({
    profile: currentUserProfile || {},
    userId: user?.id,
    active: isLoggedIn,
    onProfileChange,
    showToast,
    onRequireLogin: requireLogin,
    statsFallback: professionalStats,
  });
  const handle = own.handle;

  // Keep the inputs in step with the stored profile (same as the old account window did)
  useEffect(() => {
    own.resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentUserProfile?.name, currentUserProfile?.username, currentUserProfile?.bio, currentUserProfile?.relationshipStatus]);

  const mySubs = useMySubscriptions(user?.id);
  const creatorPlan = mySubs.subs.creator?.effective_plan ?? 'free';
  const hostedOutings = outings.filter((o) => user?.id && o.hostId === user.id);

  // ---- Profile look: colour theme + tags. Public (saved in the database) so other people see it too. ----
  const themeKey = `rada_profile_theme_${user?.id || 'guest'}`;
  const [themeId, setThemeId] = useState<string>(() => {
    try { return localStorage.getItem(themeKey) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
  });
  const [tags, setTags] = useState<string[]>([]);
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lookSaving, setLookSaving] = useState(false);
  const accent = themeColor(themeId);
  const tagsDirty = JSON.stringify(tags) !== JSON.stringify(savedTags);

  useEffect(() => {
    let off = false;
    if (!user?.id) return;
    fetchProfileLook(user.id).then((look) => {
      if (off || !look) return;
      setThemeId(look.theme);
      setTags(look.tags);
      setSavedTags(look.tags);
    });
    return () => { off = true; };
  }, [user?.id]);

  const shareLook = async (theme: string, nextTags: string[]) => {
    const err = await saveMyProfileLook({ theme, tags: nextTags });
    if (err) showToast('Saved on this phone only. Run profile_look.sql in Supabase so others can see it.', { type: 'error' });
    return !err;
  };
  const pickTheme = async (id: string) => {
    setThemeId(id);
    try { localStorage.setItem(themeKey, id); } catch {}
    await shareLook(id, savedTags);
  };
  const addTag = () => {
    const t = cleanTag(tagInput);
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) { setTagInput(''); return; }
    if (tags.length >= MAX_TAGS) { showToast(`You can add up to ${MAX_TAGS} tags.`, { type: 'error' }); return; }
    setTags([...tags, t]);
    setTagInput('');
  };
  const saveAll = async () => {
    setLookSaving(true);
    try {
      if (own.dirty) await own.save();
      if (tagsDirty) {
        if (await shareLook(themeId, tags)) { setSavedTags(tags); showToast('Tags saved.'); }
      }
    } finally {
      setLookSaving(false);
    }
  };

  // ---- Milestones: the app's real badges (outings, spots, photo reviews), from the database ----
  const [mData, setMData] = useState<MilestoneData | null>(null);
  const [mLoading, setMLoading] = useState(true);
  useEffect(() => {
    let off = false;
    if (!isLoggedIn) { setMLoading(false); return; }
    setMLoading(true);
    // Never leave the spinner up forever if the request stalls on a cold start.
    Promise.race([
      fetchMilestones(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('milestones timed out')), 8000)),
    ])
      .then((d) => { if (!off) { setMData(d); setMLoading(false); } })
      .catch(() => { if (!off) setMLoading(false); });
    return () => { off = true; };
  }, [user?.id, isLoggedIn]);

  const p: any = currentUserProfile || {};
  const thresholds = mData?.thresholds ?? [];
  const progress = (kind: MilestoneKind) => {
    const names = MILESTONE_META[kind].names;
    const count = mData?.counts?.[kind] ?? 0;
    const level = Math.min(names.length, thresholds.filter((t) => count >= t).length);
    const next = level < names.length ? thresholds[level] : undefined;
    const prev = level > 0 ? thresholds[level - 1] : 0;
    const pct = next ? Math.max(0, Math.min(1, (count - prev) / (next - prev))) : 1;
    return { kind, meta: MILESTONE_META[kind], count, level, next, pct, name: level > 0 ? names[level - 1] : null };
  };
  const kinds = KINDS.map(progress);
  const earnedBadges = kinds.reduce((n, k) => n + k.level, 0);
  const totalBadges = kinds.reduce((n, k) => n + k.meta.names.length, 0);

  const isSingle = p.relationshipStatus === 'single';
  const name = p.name || handle || 'Your profile';
  const initial = String(name).replace(/^@/, '').charAt(0).toUpperCase() || 'R';

  const share = async () => {
    const url = siteOrigin();
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'RADA', text: `${handle || name} on RADA`, url });
      else { await navigator.clipboard.writeText(url); showToast('Link copied.'); }
    } catch {}
  };

  const goSettings = () => {
    setTab('settings');
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const tabs: [Tab, string][] = [
    ['hangouts', 'Hangouts'],
    ['milestones', 'Milestones'],
    ['creator', 'Creator'],
    ['settings', 'Settings'],
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-200"
      style={{ ['--rp-accent' as any]: accent }}
    >
      {/* Theme wash over the whole page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${accent}38 0px, ${accent}16 280px, ${accent}0A 100%)` }}
      />
      {/* Top bar */}
      <div className="relative shrink-0 px-2 py-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center text-[17px] font-black tracking-tight">Profile</h2>
        {isLoggedIn && <NotificationBell userId={user.id} />}
        {onOpenSaved && (
          <button
            type="button"
            onClick={onOpenSaved}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            aria-label="Saved items"
          >
            <Bookmark className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto pb-6">
        {!isLoggedIn ? (
          <div className="mx-4 mt-6 p-4 rounded-2xl bg-amber-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-800 dark:text-amber-300">You&apos;re browsing as a guest</p>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300/80">Log in to build your profile and earn milestones.</p>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenAuth(); }}
                  className="mt-3 px-4 py-2 text-white font-black text-xs rounded-xl cursor-pointer"
                  style={{ background: accent }}
                >
                  Log In / Create Account
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="px-4 pt-3 flex items-center gap-4">
              <div
                className="w-[88px] h-[88px] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-3xl font-black"
                style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
              >
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" decoding="async" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[22px] leading-tight font-black truncate">{name}</h3>
                {handle && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{handle}</p>}
              </div>
            </div>

            <p className="px-4 mt-3 text-[15px] leading-snug text-slate-800 dark:text-slate-200">
              {p.bio || <span className="text-slate-400">No bio yet. Tap Edit Profile to add one.</span>}
            </p>

            {/* Chips */}
            <div className="px-4 mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                {cleanLoc(p.loc)}
              </span>
              <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full ${isSingle ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {isSingle && <CheckCircle2 className="w-3.5 h-3.5" />}
                {isSingle ? (p.isLivenessVerified ? 'Single (verified)' : 'Single') : 'Not single'}
              </span>
              {own.isPro && (
                <span className="inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full text-white" style={{ background: accent }}>
                  <Crown className="w-3.5 h-3.5" /> Creator
                </span>
              )}
              {savedTags.map((t) => (
                <span key={t} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>
                  {t}
                </span>
              ))}
            </div>

            {/* Stats + actions */}
            <div className="px-4 mt-4 flex items-center gap-5">
              {[
                [savedCount, 'Saved'],
                [hostedOutings.length, 'Hosted'],
                [ticketCount, 'Tickets'],
              ].map(([n, label]) => (
                <div key={String(label)} className="text-center">
                  <p className="text-[22px] leading-none font-black">{n}</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              ))}
              <div className="flex-1" />
              <button type="button" onClick={goSettings} className="text-[14px] font-black cursor-pointer" style={{ color: accent }}>
                Edit Profile
              </button>
              <button
                type="button"
                onClick={share}
                className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Milestones row */}
            <div className="mt-5 flex gap-4 overflow-x-auto hide-scrollbar px-4 pb-3">
              {kinds.map((k) => {
                const Icon = KIND_ICON[k.meta.icon] || PartyPopper;
                const earned = k.level > 0;
                return (
                  <button
                    key={k.kind}
                    type="button"
                    onClick={() =>
                      showToast(
                        earned
                          ? `${k.name}: ${k.count} ${k.meta.unit}${k.next ? `, next badge at ${k.next}` : ', top badge!'}`
                          : `${k.meta.title}: ${k.count}${k.next ? ` of ${k.next}` : ''} to unlock your first badge`
                      )
                    }
                    className="shrink-0 w-[96px] flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span
                      className="relative w-[84px] h-[84px] rounded-full flex items-center justify-center"
                      style={{ background: KIND_COLOR[k.kind], opacity: earned ? 1 : 0.5, filter: earned ? 'none' : 'grayscale(0.7)' }}
                    >
                      <Icon className="w-9 h-9 text-slate-800" />
                      {earned ? (
                        <span className="absolute -bottom-0.5 -right-0.5 min-w-6 h-6 px-1.5 rounded-full text-white text-[11px] font-black shadow flex items-center justify-center" style={{ background: accent }}>
                          {k.level}
                        </span>
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white dark:bg-[#1C1A1E] shadow flex items-center justify-center">
                          <Lock className="w-3 h-3 text-slate-500" />
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] font-bold leading-tight text-center line-clamp-2">{k.name || 'Locked'}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1">{k.meta.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Tabs */}
            <div ref={tabsRef} className="mt-1 flex border-y border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-[#121113]/80 backdrop-blur-md z-10">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 py-3.5 text-[13px] font-bold relative cursor-pointer ${tab === id ? '' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {label}
                  {tab === id && <span className="absolute left-6 right-6 bottom-0 h-[3px] rounded-full" style={{ background: accent }} />}
                </button>
              ))}
            </div>

            {/* ===== Hangouts ===== */}
            {tab === 'hangouts' && user?.id && (
              <HangoutsTab userId={user.id} accent={accent} showToast={showToast} spots={spots} />
            )}

            {/* ===== Milestones ===== */}
            {tab === 'milestones' && (
              <div className="px-4 pt-4 space-y-3">
                {mLoading ? (
                  <p className="text-[13px] text-slate-400 py-6 text-center">Loading your badges…</p>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
                      {earnedBadges} of {totalBadges} badges earned
                    </p>
                    {!mData && (
                      <p className="text-[12px] text-slate-400">Could not load your progress right now. Pull down later to retry.</p>
                    )}
                    {kinds.map((k) => {
                      const Icon = KIND_ICON[k.meta.icon] || PartyPopper;
                      return (
                        <div key={k.kind} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1C1A1E]">
                          <div className="flex items-center gap-3">
                            <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: KIND_COLOR[k.kind], opacity: k.level > 0 ? 1 : 0.55 }}>
                              <Icon className="w-6 h-6 text-slate-800" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[14px] font-black truncate">{k.meta.title}</p>
                                <span className="text-[11px] font-bold text-slate-500 shrink-0">Level {k.level}/{k.meta.names.length}</span>
                              </div>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                {k.count} {k.meta.unit}{k.next ? ` · next badge at ${k.next}` : ' · top badge reached'}
                              </p>
                              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.round(k.pct * 100)}%`, background: accent }} />
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {k.meta.names.map((n, idx) => (
                              <span
                                key={n}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${idx < k.level ? 'text-white' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'}`}
                                style={idx < k.level ? { background: accent } : undefined}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ===== Creator / professional dashboard ===== */}
            {tab === 'creator' && (
              <div className="pt-2">
                {own.isPro && (
                  <div className="mx-3 mt-3">
                    <ProProfileCard
                      kind="creator"
                      name={p.name || ''}
                      subtitle={handle}
                      avatar={p.avatar}
                      bio={p.bio}
                      plan={creatorPlan}
                      stats={[
                        { label: 'Hosted', value: hostedOutings.length },
                        { label: 'Businesses', value: myBusinesses.length },
                        ...(own.stats.profileViews != null ? [{ label: 'Views', value: own.stats.profileViews }] : []),
                      ]}
                      onOpen={() => setProPageOpen(true)}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setHubOpen(true)}
                  className="mx-3 mt-4 w-[calc(100%-1.5rem)] p-4 rounded-2xl text-white flex items-center gap-3 text-left cursor-pointer shadow-md"
                  style={{ background: accent }}
                >
                  <Briefcase className="w-5 h-5 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-black">{own.isPro ? 'Open Creator Hub' : 'Become a creator'}</span>
                    <span className="block text-[11px] opacity-90">Outings, analytics, broadcasts, badge and plan</span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
                <ProfessionalDashboard p={own} />
              </div>
            )}

            {/* ===== Settings (this profile + RADA) ===== */}
            {tab === 'settings' && (
              <div className="pt-2">
                <AvatarHero p={own} subtitle={<p className="mt-1 text-[11px] text-slate-400">Only your @username is shown to others</p>} />

                <Section title="Identity & bio" description="Your public @username, private display name and bio. Updated everywhere when you save.">
                  <IdentityFields p={own} />
                </Section>

                <Section title="Relationship status" description="Controls who can send you hangout and match requests.">
                  <RelationshipStatusField p={own} />
                </Section>

                <Section title="Tags" description={`Short labels shown on your profile, like Founder or Foodie. Up to ${MAX_TAGS}.`}>
                  <div className="p-4 space-y-3">
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 text-[12px] font-semibold pl-3 pr-1.5 py-1.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>
                            {t}
                            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.slice(0, MAX_TAG_LEN))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                        placeholder="Add a tag"
                        className="flex-1 px-3 py-2.5 text-[13px] rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-100"
                        style={{ ['--tw-ring-color' as any]: `${accent}66` }}
                      />
                      <button type="button" onClick={addTag} disabled={!tagInput.trim()} className="px-4 rounded-xl text-white text-[13px] font-black disabled:opacity-40 cursor-pointer" style={{ background: accent }}>
                        Add
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="Profile theme" description="Colours your whole profile. Other people see it too.">
                  <div className="p-4 flex flex-wrap gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTheme(t.id)}
                        aria-label={t.name}
                        title={t.name}
                        className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition"
                        style={{ background: t.color, boxShadow: themeId === t.id ? `0 0 0 3px ${isDarkMode ? '#121113' : '#fff'}, 0 0 0 5px ${t.color}` : 'none' }}
                      >
                        {themeId === t.id && <Check className="w-5 h-5 text-white" />}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="App appearance">
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                      {[
                        [false, 'Light', Sun],
                        [true, 'Dark', Moon],
                      ].map(([val, label, Icon]: any) => (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={() => { if (isDarkMode !== val) onToggleTheme(); }}
                          className={`py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition ${isDarkMode === val ? 'bg-white dark:bg-[#1C1A1E] shadow-sm' : 'text-slate-500'}`}
                        >
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <p className="mx-4 mt-5 text-[11px] text-slate-400">
                  Email, password, switching accounts and log out are in the ••• menu on the home screen.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save bar (settings tab only) */}
      {isLoggedIn && tab === 'settings' && (
        <div className="shrink-0 px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={saveAll}
            disabled={(!own.dirty && !tagsDirty) || own.saving || lookSaving}
            className="w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: accent }}
          >
            {own.saving || lookSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save changes</span>}
          </button>
        </div>
      )}

      {proPageOpen && own.isPro && user?.id && (
        <ProProfilePage
          kind="creator"
          plan={creatorPlan}
          name={p.name || ''}
          subtitle={handle}
          avatar={p.avatar}
          bio={p.bio}
          nameLabel="Display name"
          onSave={async ({ name: n, bio }: { name: string; bio: string }) => {
            const username = (p.username || handle.replace(/^@/, '')).trim();
            if (!username) return 'Set a username in Identity & bio first.';
            const res = await saveUnifiedProfile(user.id, { name: n, username, bio });
            if (res.error) return res.error;
            onProfileChange?.({ name: res.name ?? n, bio: res.bio ?? bio });
            showToast('Profile saved.', { category: 'profile' });
            return null;
          }}
          businesses={myBusinesses.map((b) => ({
            id: String(b.id),
            title: b.name,
            meta: [b.category, b.neighborhood].filter(Boolean).join(' · '),
            image: b.logo,
          }))}
          hosted={hostedOutings.map((o) => ({
            id: String(o.id),
            title: o.spotTitle,
            meta: [o.date, o.time].filter(Boolean).join(' · '),
            image: o.spotImage,
          }))}
          hostedTitle="Outings & events hosted"
          hostedEmpty="You have not hosted anything yet."
          onUpgrade={() => { setProPageOpen(false); setHubOpen(true); }}
          onClose={() => setProPageOpen(false)}
        />
      )}

      {hubOpen && (
        <Suspense fallback={null}>
          <CreatorHubTab
            own={own}
            outings={outings}
            userId={user?.id}
            onClose={() => setHubOpen(false)}
            onOpenAuth={onOpenAuth}
            showToast={showToast}
          />
        </Suspense>
      )}
    </div>
  );
};
