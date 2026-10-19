import React from 'react';
import {
  X,
  Heart,
  MessageSquare,
  MapPin,
  Sparkles,
  Shield,
  CheckCircle2,
  Lock,
  Bookmark,
  ChevronRight,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { toHandle } from '../lib/cloudSync';
import {
  AvatarHero,
  IdentityFields,
  ProfessionalHub,
  ProfessionalSwitchCard,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';

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
  showToast: (msg: string) => void;
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
}) => {
  const requireLogin = () => {
    showToast('Please sign in first.');
    onOpenAuth?.();
  };

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

  if (!user) return null;

  const handle = toHandle(user.handle);
  const isSingle = user.relationshipStatus === 'single';

  // ===================== YOUR PROFILE =====================
  if (isOwnProfile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div
          className="bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 sm:rounded-3xl max-w-md w-full h-full sm:h-auto overflow-hidden shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col sm:max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
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
              subtitle={
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3 h-3 text-[#E0533C]" />
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

            <Section title="Identity & bio" description="Your public @username and your private display name.">
              <IdentityFields p={own} />
            </Section>

            <Section
              title="Professional & creator suite"
              description="Host outings with a verified badge and see how they perform."
            >
              <ProfessionalSwitchCard p={own} />
              {own.isPro && <ProfessionalHub p={own} />}
            </Section>

            <Section title="Relationship status" description="Controls who can send you hangout and match requests.">
              <div className="p-4 flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isSingle ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isSingle ? <CheckCircle2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">{isSingle ? 'Single' : 'Not single'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isSingle
                      ? user.isLivenessVerified
                        ? 'Liveness verified. People can send you match requests.'
                        : 'People can send you match requests.'
                      : 'Matching requests are turned off for your profile.'}
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Security & account">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {onOpenAccountSettings && (
                  <NavRow
                    icon={<KeyRound className="w-4 h-4" />}
                    title="Account & security"
                    subtitle="Email, password and sign-in method"
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
          </div>

          {/* Save bar */}
          <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={own.save}
              disabled={!own.dirty || own.saving}
              className="w-full py-3 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {own.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save changes</span>}
            </button>
          </div>
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
      showToast(`${handle} is Not Single. Matching requests are disabled for this profile.`);
      return;
    }
    if (onSendMatchRequest) {
      onSendMatchRequest(user);
    } else {
      showToast(`Hangout & Match request sent to ${handle}!`);
    }
  };

  const handleMessageClick = () => {
    if (!isMutualMatch) {
      showToast(`Direct messaging requires a mutual match acceptance. Send a match request first!`);
      return;
    }
    if (onSendMessage) {
      onSendMessage(user);
    } else {
      showToast(`Chat conversation opened with ${handle}!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full uncropped photo with ambient fill */}
        <div className="relative h-80 sm:h-96 w-full bg-[#121113] shrink-0 overflow-hidden flex items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-50 dark:opacity-40"
            style={{ backgroundImage: `url('${user.avatar}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10 pointer-events-none" />
          <img
            src={user.avatar}
            alt={handle}
            className="relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl"
          />

          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between">
            <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#E9C46A]" />
              <span>RADA profile</span>
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer shadow-md"
              title="Close profile"
              aria-label="Close profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-1.5 text-white drop-shadow-md min-w-0">
              <span className="truncate">{handle}</span>
              <VerifiedBadge status={isVerifiedPro ? 'approved' : 'none'} size="md" />
            </h3>
            <span
              className={`text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1 shrink-0 ${
                isSingle ? 'bg-emerald-600/90 text-white' : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              {isSingle && <CheckCircle2 className="w-3 h-3 text-white" />}
              <span>{isSingle ? (user.isLivenessVerified ? 'Single (verified)' : 'Single') : 'Not single'}</span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>{cleanLoc(user.loc)}</span>
          </p>

          {isVerifiedPro && (
            <div className="p-3 rounded-2xl bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-black text-[#1D9BF0]">Verified host</p>
                {proCategory && <p className="text-xs font-bold truncate">{proCategory}</p>}
              </div>
              {proWebsite && (
                <a
                  href={proWebsite.startsWith('http') ? proWebsite : `https://${proWebsite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-black text-[#1D9BF0] shrink-0"
                >
                  Website
                </a>
              )}
            </div>
          )}

          <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <h4 className="text-[12px] font-black text-slate-500">Bio & vibe</h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {user.bio || 'Exploring Kenyan hangouts, good music, food, and culture.'}
            </p>
          </div>

          {user.vibes && user.vibes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[12px] font-black text-slate-500">Favorite vibes</h4>
              <div className="flex flex-wrap gap-1.5">
                {user.vibes.map((v, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-bold px-3 py-1 rounded-xl bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    #{v}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-2xl text-[11px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            {isMutualMatch ? (
              <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  You and <strong>{handle}</strong> are mutual matches. Direct messaging is unlocked!
                </span>
              </p>
            ) : isSingle ? (
              <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 shrink-0 text-[#E0533C]" />
                <span>Direct messaging requires mutual match acceptance. Send a request to connect!</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-slate-500">
                <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                <span>
                  This user is <strong>Not single</strong>. Hangout matching is disabled.
                </span>
              </p>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            {isMutualMatch ? (
              <button
                type="button"
                onClick={handleMessageClick}
                className="w-full py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open direct message</span>
              </button>
            ) : isSingle ? (
              <>
                <button
                  type="button"
                  onClick={handleMatchClick}
                  className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Send match request</span>
                </button>
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="py-3 px-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Direct message"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Message</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => showToast(`${handle} is Not Single. Matching requests are disabled.`)}
                className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4 opacity-40" />
                <span>Matching disabled (not single)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
