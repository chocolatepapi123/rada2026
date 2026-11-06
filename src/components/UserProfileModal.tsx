import React from 'react';
import { track } from '../lib/tracking';
import {
  X,
  ChevronLeft,
  PartyPopper,
  Camera,
  Heart,
  MessageSquare,
  MapPin,
  Sparkles,
  Shield,
  CheckCircle2,
  Lock,
  Bookmark,
  ChevronRight,
  UserCog,
  Flag,
  Bell,
  BellOff,
} from 'lucide-react';
import { ReportUserModal } from './ReportUserModal';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { PublicTierBadges } from './BusinessBadge';
import { usePublicTiers } from '../lib/subscriptions';
import { fetchMyBroadcastSubscriptions, setBroadcastSubscription } from '../lib/broadcasts';
import { listHostVideos, type HostVideo } from '../lib/hostVideos';
import { toHandle } from '../lib/cloudSync';
import { fetchProfileLook, themeColor, DEFAULT_THEME, type ProfileLook } from '../lib/profileLook';
import { fetchMilestones, MILESTONE_META, type MilestoneKind, type MilestoneData } from '../lib/milestones';
import {
  AvatarHero,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';
import { UserHangouts } from './UserHangouts';
import type { ToastOptions } from './Toast.tsx';

interface ProfessionalStats {
  profileViews?: number;
  outingsHosted?: number;
  joinRequests?: number;
}

interface UserProfileModalProps {
  /** The single user object. Own profile: user.username, user.name, user.avatar, user.is_creator. */
  user: UserProfile | null;
  isMutualMatch?: boolean;
  onClose: () => void;
  onSendMatchRequest?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  showToast: (msg: string, options?: ToastOptions) => void;
  onOpenSavedItems?: () => void;
  onOpenAccountSettings?: () => void;
  /** True when this modal shows the signed-in user's own profile (enables editing). */
  isOwnProfile?: boolean;
  /** Signed-in user's id, needed to save the profile and upload the avatar. */
  currentUserId?: string;
  /** @deprecated No longer used: switching to a professional account needs no application. */
  accountEmail?: string;
  /** Called on every save/switch/upload so the parent App state updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  /** @deprecated Professional state is written straight to Supabase. Ignored. */
  onUpdateProfessional?: (data: any) => Promise<void> | void;
  /** Optional numbers from the app. Used only when the server has none. */
  professionalStats?: ProfessionalStats;
  onOpenAuth?: () => void;
  /** Hangout actions: RADA spots, saved state, save and plan handlers (all by spot id). */
  spots?: { id: number | string }[];
  isSpotSaved?: (spotId: string) => boolean;
  onSaveSpot?: (spotId: string) => void;
  onPlanDateAtSpot?: (spotId: string, withUserId: string) => void;
}

const NavRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
  >
    <span className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-semibold">{title}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
  </button>
);

const cleanLoc = (loc?: string) =>
  loc
    ? loc
        .replace(/^nearby\s+/i, '')
        .replace(/\bnearby\b/gi, '')
        .replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '')
        .trim()
    : 'Kenya';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isMutualMatch = false,
  onClose,
  onSendMatchRequest,
  onSendMessage,
  showToast,
  onOpenSavedItems,
  onOpenAccountSettings,
  isOwnProfile = false,
  currentUserId,
  onProfileChange,
  professionalStats,
  onOpenAuth,
  spots = [],
  isSpotSaved,
  onSaveSpot,
  onPlanDateAtSpot,
}) => {
  const requireLogin = () => {
    showToast('Please sign in first.', { type: 'error' });
    onOpenAuth?.();
  };

  const [reportOpen, setReportOpen] = React.useState(false);

  // Host/creator analytics: someone else opened this profile.
  React.useEffect(() => {
    if (!isOwnProfile && user?.id) track('view', 'profile', user.id);
  }, [isOwnProfile, user?.id]);

  // Same hook as AccountSettingsModal: both read/write the one parent-owned user object
  const own = useOwnProfile({
    profile: user || {},
    userId: isOwnProfile ? currentUserId : undefined,
    active: isOwnProfile && !!user,
    onProfileChange,
    showToast,
    onRequireLogin: requireLogin,
    statsFallback: professionalStats,
  });

  // Public tier (Creator / Golden Creator). Only the tier is exposed, never trial dates.
  const tierUserId = (isOwnProfile ? currentUserId : undefined) || user?.id;
  const publicTiers = usePublicTiers([tierUserId]);
  const myTiers = tierUserId ? publicTiers[tierUserId] : undefined;

  // Host updates opt-in + public videos (someone else's profile only)
  const viewedId = !isOwnProfile ? user?.id : undefined;
  const [followsUpdates, setFollowsUpdates] = React.useState(false);
  const [updatesBusy, setUpdatesBusy] = React.useState(false);
  const [hostVideos, setHostVideos] = React.useState<HostVideo[]>([]);
  React.useEffect(() => {
    let off = false;
    setHostVideos([]);
    setFollowsUpdates(false);
    if (!viewedId) return;
    listHostVideos(viewedId).then((v) => { if (!off) setHostVideos(v); });
    if (currentUserId) fetchMyBroadcastSubscriptions().then((set) => { if (!off) setFollowsUpdates(set.has(viewedId)); });
    return () => { off = true; };
  }, [viewedId, currentUserId]);
  const toggleUpdates = async () => {
    if (!viewedId) return;
    if (!currentUserId) { showToast('Please sign in first.', { type: 'error' }); return; }
    setUpdatesBusy(true);
    try {
      const on = await setBroadcastSubscription(viewedId, !followsUpdates);
      setFollowsUpdates(on);
      showToast(on ? 'You will get updates from this host.' : 'You will no longer get updates from this host.');
    } catch (err: any) {
      showToast(err?.message || 'Could not change this. Try again.', { type: 'error' });
    } finally {
      setUpdatesBusy(false);
    }
  };

  // Their public look (colour theme + tags) and milestone badges
  const [look, setLook] = React.useState<ProfileLook | null>(null);
  const [mData, setMData] = React.useState<MilestoneData | null>(null);
  React.useEffect(() => {
    let off = false;
    setLook(null);
    setMData(null);
    if (!viewedId) return;
    fetchProfileLook(viewedId).then((l) => { if (!off) setLook(l); });
    fetchMilestones(viewedId).then((d) => { if (!off) setMData(d); }).catch(() => {});
    return () => { off = true; };
  }, [viewedId]);

  if (!user) return null;

  const handle = toHandle(user.handle);
  const isSingle = user.relationshipStatus === 'single';

  // ===================== YOUR PROFILE (read-only preview; all editing lives in Account & Security) =====================
  if (isOwnProfile) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div
          className="bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 sm:rounded-3xl max-w-md w-full h-full sm:h-auto overflow-hidden shadow-2xl flex flex-col sm:max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-sm flex items-center gap-2">
            <span className="w-9" />
            <h3 className="flex-1 text-center text-[15px] font-black tracking-tight">Your profile</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            <AvatarHero
              p={own}
              editable={false}
              subtitle={
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3 h-3 text-[#E0533C] dark:text-[#D17A68]" />
                    {cleanLoc(user.loc)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      isSingle
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isSingle && <CheckCircle2 className="w-3 h-3" />}
                    {isSingle ? (user.isLivenessVerified ? 'Single (verified)' : 'Single') : 'Not single'}
                  </span>
                </div>
              }
            />

            <Section title="About">
              <p className="p-4 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                {user.bio || 'No bio yet. Add one in Account & Security.'}
              </p>
            </Section>

            <Section title="Manage">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {onOpenAccountSettings && (
                  <NavRow
                    icon={<UserCog className="w-4 h-4" />}
                    title="Edit profile"
                    subtitle="Username, display name, bio, relationship status"
                    onClick={() => {
                      onClose();
                      onOpenAccountSettings();
                    }}
                  />
                )}
                {onOpenSavedItems && (
                  <NavRow
                    icon={<Bookmark className="w-4 h-4" />}
                    title="Saved items & moves"
                    subtitle="Bookmarked spots, raves, fits and offers"
                    onClick={() => {
                      onClose();
                      onOpenSavedItems();
                    }}
                  />
                )}
              </div>
            </Section>

            {myTiers?.creator && (
              <div className="mx-4 mt-5">
                <PublicTierBadges tiers={myTiers} kinds={['creator']} size="md" />
              </div>
            )}

            {own.isPro && (
              <p className="mx-4 mt-4 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <VerifiedBadge status="approved" size="sm" golden={myTiers?.creator === 'elite'} />
                <span>Professional account. Open the ••• menu in Account & Security for your host dashboard and plan.</span>
              </p>
            )}
          </div>

          {onOpenAccountSettings && (
            <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccountSettings();
                }}
                className="w-full py-3 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-black rounded-xl text-[13px] transition cursor-pointer"
              >
                Edit profile
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== SOMEONE ELSE'S PROFILE =====================
  const isVerifiedPro =
    user.is_creator === true ||
    user.account_type === 'professional' ||
    (user as any).professionalStatus === 'approved';
  const proCategory: string = (user as any).professionalCategory || '';
  const proWebsite: string = (user as any).professionalWebsite || '';

  const handleMatchClick = () => {
    if (!isSingle) {
      showToast(`${handle} is Not Single. Matching requests are disabled for this profile.`, { type: 'error' });
      return;
    }
    if (onSendMatchRequest) {
      onSendMatchRequest(user);
    } else {
      showToast(`Hangout & Match request sent to ${handle}!`, { category: 'match' });
    }
  };

  const handleMessageClick = () => {
    if (!isMutualMatch) {
      showToast(`Direct messaging requires a mutual match acceptance. Send a match request first!`, { type: 'error' });
      return;
    }
    if (onSendMessage) {
      onSendMessage(user);
    }
    onClose();
  };

  const accent = themeColor(look?.theme || DEFAULT_THEME);
  const tags = look?.tags ?? [];
  const thresholds = mData?.thresholds ?? [];
  const KIND_COLOR: Record<MilestoneKind, string> = { outings: '#F9D6CE', spots: '#D9EFE3', photo_reviews: '#E4DAF7' };
  const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = { party: PartyPopper, pin: MapPin, camera: Camera };
  const badges = (['outings', 'spots', 'photo_reviews'] as MilestoneKind[]).map((kind) => {
    const meta = MILESTONE_META[kind];
    const count = mData?.counts?.[kind] ?? 0;
    const level = Math.min(meta.names.length, thresholds.filter((t) => count >= t).length);
    return { kind, meta, count, level, name: level > 0 ? meta.names[level - 1] : null };
  });
  const hasAnyBadge = badges.some((b) => b.level > 0);
  const initial = String(handle || 'R').replace(/^@/, '').charAt(0).toUpperCase() || 'R';

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-200">
      {/* Their theme colours the whole page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${accent}38 0px, ${accent}16 280px, ${accent}0A 100%)` }}
      />

      {/* Top bar */}
      <div className="relative shrink-0 px-2 py-2 flex items-center gap-1" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center text-[17px] font-black tracking-tight flex items-center justify-center gap-1.5 min-w-0">
          <span className="truncate">{handle}</span>
          <VerifiedBadge status={isVerifiedPro ? 'approved' : 'none'} size="md" golden={myTiers?.creator === 'elite'} />
        </h2>
        {user.id ? (
          <button
            type="button"
            onClick={() => {
              if (!currentUserId) { requireLogin(); return; }
              setReportOpen(true);
            }}
            className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer"
            title="Report or block"
            aria-label="Report or block this person"
          >
            <Flag className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto pb-28">
        {/* Identity */}
        <div className="px-4 pt-3 flex items-center gap-4">
          <div
            className="w-[88px] h-[88px] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-3xl font-black"
            style={{ background: accent, boxShadow: `0 0 0 3px ${accent}33` }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={handle} className="w-full h-full object-cover" decoding="async" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[22px] leading-tight font-black truncate">{handle}</h3>
            {myTiers?.creator && (
              <div className="mt-1">
                <PublicTierBadges tiers={myTiers} kinds={['creator']} size="md" />
              </div>
            )}
          </div>
        </div>

        <p className="px-4 mt-3 text-[15px] leading-snug text-slate-800 dark:text-slate-200">
          {user.bio || 'Exploring Kenyan hangouts, good music, food, and culture.'}
        </p>

        {/* Chips: location, status, tags, vibes */}
        <div className="px-4 mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
            {cleanLoc(user.loc)}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full ${
              isSingle ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isSingle && <CheckCircle2 className="w-3.5 h-3.5" />}
            {isSingle ? (user.isLivenessVerified ? 'Single (verified)' : 'Single') : 'Not single'}
          </span>
          {tags.map((t) => (
            <span key={t} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: `${accent}1F`, color: accent }}>
              {t}
            </span>
          ))}
          {(user.vibes || []).map((v, idx) => (
            <span key={`v${idx}`} className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              #{v}
            </span>
          ))}
        </div>

        {/* Milestones */}
        {hasAnyBadge && (
          <div className="mt-5 flex gap-4 overflow-x-auto hide-scrollbar px-4 pb-1">
            {badges.filter((b) => b.level > 0).map((b) => {
              const Icon = KIND_ICON[b.meta.icon] || PartyPopper;
              return (
                <div key={b.kind} className="shrink-0 w-[96px] flex flex-col items-center gap-1.5">
                  <span className="relative w-[84px] h-[84px] rounded-full flex items-center justify-center" style={{ background: KIND_COLOR[b.kind] }}>
                    <Icon className="w-9 h-9 text-slate-800" />
                    <span className="absolute -bottom-0.5 -right-0.5 min-w-6 h-6 px-1.5 rounded-full text-white text-[11px] font-black shadow flex items-center justify-center" style={{ background: accent }}>
                      {b.level}
                    </span>
                  </span>
                  <span className="text-[12px] font-bold leading-tight text-center line-clamp-2">{b.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1">{b.meta.title}</span>
                </div>
              );
            })}
          </div>
        )}

        {viewedId && (
          <UserHangouts
            viewedId={viewedId}
            currentUserId={currentUserId}
            accent={accent}
            handle={handle}
            spots={spots}
            isSpotSaved={(id) => !!isSpotSaved?.(id)}
            onSaveSpot={(id) => onSaveSpot?.(id)}
            onPlanDateAtSpot={(id) => onPlanDateAtSpot?.(id, viewedId)}
            onSayHi={() => (isMutualMatch ? handleMessageClick() : handleMatchClick())}
            showToast={showToast}
            onNeedLogin={requireLogin}
          />
        )}

        <div className="px-4 mt-5 space-y-3.5">
          {isVerifiedPro && (
            <div className="p-3 rounded-2xl flex items-center justify-between gap-3" style={{ background: `${accent}14` }}>
              <div className="min-w-0">
                <p className="text-[12px] font-black" style={{ color: accent }}>{myTiers?.creator === 'elite' ? 'Golden verified host' : 'Verified host'}</p>
                {proCategory && <p className="text-xs font-bold truncate">{proCategory}</p>}
              </div>
              {proWebsite && (
                <a
                  href={proWebsite.startsWith('http') ? proWebsite : `https://${proWebsite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-black shrink-0"
                  style={{ color: accent }}
                >
                  Website
                </a>
              )}
            </div>
          )}

          {isVerifiedPro && viewedId && (
            <button
              type="button"
              onClick={toggleUpdates}
              disabled={updatesBusy}
              className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 ${
                followsUpdates ? 'bg-white/80 dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300' : 'text-white'
              }`}
              style={followsUpdates ? undefined : { background: accent }}
            >
              {followsUpdates ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{followsUpdates ? 'Stop updates from this host' : 'Get updates from this host'}</span>
            </button>
          )}

          {hostVideos.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[12px] font-black text-slate-500">Videos</h4>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {hostVideos.map((v) => (
                  <video key={v.path} src={v.url} controls preload="metadata" playsInline className="h-44 w-auto rounded-xl bg-black shrink-0" />
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-2xl text-[11px] bg-slate-50/80 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400">
            {isMutualMatch ? (
              <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>You and <strong>{handle}</strong> are mutual matches. Direct messaging is unlocked!</span>
              </p>
            ) : isSingle ? (
              <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 shrink-0" style={{ color: accent }} />
                <span>Direct messaging requires mutual match acceptance. Send a request to connect!</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-slate-500">
                <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                <span>This user is <strong>Not single</strong>. Hangout matching is disabled.</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute inset-x-0 bottom-0 px-3 py-3 bg-white/90 dark:bg-[#121113]/90 backdrop-blur-md flex gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
        {isMutualMatch ? (
          <button type="button" onClick={handleMessageClick} className="w-full py-3 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer" style={{ background: accent }}>
            <MessageSquare className="w-4 h-4" />
            <span>Open direct message</span>
          </button>
        ) : isSingle ? (
          <>
            <button type="button" onClick={handleMatchClick} className="flex-1 py-3 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer" style={{ background: accent }}>
              <Heart className="w-4 h-4 fill-white" />
              <span>Send match request</span>
            </button>
            <button type="button" onClick={handleMessageClick} className="py-3 px-3.5 bg-slate-100 dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer" title="Direct message">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Message</span>
            </button>
          </>
        ) : (
          <button type="button" onClick={() => showToast(`${handle} is Not Single. Matching requests are disabled.`, { type: 'error' })} className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs cursor-not-allowed flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 opacity-40" />
            <span>Matching disabled (not single)</span>
          </button>
        )}
      </div>
      <ReportUserModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={user.id}
        targetHandle={handle}
        context="profile"
        onBlocked={onClose}
        showToast={showToast}
      />
    </div>
  );
};
