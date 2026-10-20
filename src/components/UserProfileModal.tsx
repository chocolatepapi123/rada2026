import React, { useState } from 'react';
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
  UserCog,
  Palette,
  ExternalLink,
  Globe,
  Instagram,
  Music,
  Tv,
  Calendar,
  Users,
  Share2,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { UserProfile, OutingPlan, CustomLink, PinnedHighlight } from '../types.ts';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { toHandle } from '../lib/cloudSync.ts';
import { shareContent } from '../utils/shareUtils.ts';
import {
  AvatarHero,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit.tsx';
import { PersonalizationKitModal } from './PersonalizationKitModal.tsx';

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
  /** Called on every save/switch/upload so the parent App state updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  /** Optional numbers from the app. Used only when the server has none. */
  professionalStats?: ProfessionalStats;
  outings?: OutingPlan[];
  onOpenOutingDetail?: (outing: OutingPlan) => void;
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
    : 'Nairobi, Kenya';

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
  outings = [],
  onOpenOutingDetail,
  onOpenAuth,
}) => {
  const [isKitOpen, setIsKitOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<PinnedHighlight | null>(null);

  const requireLogin = () => {
    showToast('Please sign in first.');
    onOpenAuth?.();
  };

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

  // Check if profile is a professional / creator account
  const isVerifiedPro =
    user.is_creator === true ||
    user.account_type === 'professional' ||
    Boolean(user.professionalTitle) ||
    Boolean(user.accentColor) ||
    (user as any).professionalStatus === 'approved';

  const proTitle = user.professionalTitle || (user as any).professionalCategory || 'Curator & Verified Host';
  const accent = user.accentColor || (isOwnProfile ? own.isPro ? '#E0533C' : '#E0533C' : '#E0533C');

  // Find outings hosted by this creator
  const userOutings = outings.filter(o => 
    (user.id && o.hostId === user.id) ||
    (user.name && o.hostName.toLowerCase() === user.name.toLowerCase()) ||
    (user.handle && o.hostHandle?.toLowerCase() === user.handle.toLowerCase())
  );

  const handleShareProfile = () => {
    shareContent({
      title: `${handle} on RADA`,
      text: `Check out ${user.name} (${handle}) — ${proTitle} on RADA Nairobi!`,
      url: window.location.href,
      onSuccess: showToast,
      onError: showToast
    });
  };

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

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'spotify': return <Music className="w-4 h-4 text-emerald-500" />;
      case 'youtube': return <Tv className="w-4 h-4 text-red-500" />;
      case 'tiktok': return <Music className="w-4 h-4 text-slate-800 dark:text-slate-200" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      default: return <Globe className="w-4 h-4" style={{ color: accent }} />;
    }
  };

  // =========================================================================
  // RENDER FULL-SCREEN CARD FOR PROFESSIONAL CREATOR (OR OWN PROFILE)
  // =========================================================================
  return (
    <>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={`${handle} Profile`}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
      >
        <div
          className="bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar with Branding, Actions & Close */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span 
                className="w-3 h-3 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: accent }}
              />
              <div className="min-w-0">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                  <span className="truncate">{handle}</span>
                  <VerifiedBadge status={isVerifiedPro ? 'approved' : 'none'} size="sm" />
                </h3>
                <p className="text-[10px] text-slate-500 truncate">
                  {isVerifiedPro ? proTitle : 'RADA Member'} • {cleanLoc(user.loc)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Creator Personalization Kit button for owner */}
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setIsKitOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: accent }}
                  title="Customize colors, unlimited links & highlights"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Personalization Kit</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareProfile}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Share Profile"
                aria-label="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full Screen Scrollable Body */}
          <div className="flex-1 overflow-y-auto pb-12">
            
            {/* Cinematic Hero Block */}
            <div className="relative h-64 sm:h-80 w-full bg-[#121113] overflow-hidden shrink-0 flex items-center justify-center">
              {/* Ambient backdrop glow */}
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 opacity-40"
                style={{ backgroundImage: `url('${user.avatar}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 z-10 pointer-events-none" />

              {/* Creator Portrait Photo */}
              <img
                src={user.avatar}
                alt={handle}
                className="relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl"
              />

              {/* Status & Category Badges */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2">
                <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#E9C46A]" />
                  <span>{isVerifiedPro ? 'Verified Creator' : 'RADA Profile'}</span>
                </span>

                <span
                  className={`text-[11px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5 shrink-0 ${
                    isSingle ? 'bg-emerald-600/90 text-white' : 'bg-slate-800/90 text-slate-200'
                  }`}
                >
                  {isSingle && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  <span>{isSingle ? (user.isLivenessVerified ? 'Single (verified)' : 'Single') : 'Not single'}</span>
                </span>
              </div>

              {/* Bottom Identity Block inside Cover */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-3 text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black drop-shadow-md truncate">
                      {handle}
                    </h2>
                    <VerifiedBadge status={isVerifiedPro ? 'approved' : 'none'} size="md" />
                  </div>
                  {user.tagline && (
                    <p className="text-xs text-white/90 font-medium drop-shadow-sm mt-0.5 truncate">
                      {user.tagline}
                    </p>
                  )}
                  <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
                    <span>{cleanLoc(user.loc)}</span>
                  </p>
                </div>

                {isVerifiedPro && (
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-black text-white shadow-md backdrop-blur-md shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    {proTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
              
              {/* Bio & Vibe Section */}
              <div className="bg-[#FBFBF9] dark:bg-[#18161B] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bio & Vibe
                  </h4>
                  {isOwnProfile && onOpenAccountSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAccountSettings();
                      }}
                      className="text-[11px] font-bold text-[#E0533C] hover:underline"
                    >
                      Edit Bio →
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {user.bio || 'Exploring Nairobi hangouts, good music, food, and culture.'}
                </p>

                {user.vibes && user.vibes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.vibes.map((v, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-bold px-3 py-1 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        #{v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* =========================================================
                  FEATURE 1: PERSONALIZED UNLIMITED LINKS HUB
                  ========================================================= */}
              {user.customLinks && user.customLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" style={{ color: accent }} />
                      <span>Creator Links & Portals ({user.customLinks.length})</span>
                    </h4>
                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => setIsKitOpen(true)}
                        className="text-[11px] font-bold text-[#E0533C] hover:underline"
                      >
                        + Manage Links
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {user.customLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18161B] hover:border-slate-400 transition flex items-center justify-between gap-3 group shadow-2xs cursor-pointer"
                        style={{ borderLeftWidth: '3px', borderLeftColor: accent }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {getPlatformIcon(link.platform)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate group-hover:text-[#E0533C] transition">
                              {link.title}
                            </span>
                            {link.description && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {link.description}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 block truncate font-mono">
                              {link.url.replace(/^https?:\/\//, '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 2: PINNED HIGHLIGHTS & LOOKBOOK SHOWCASE
                  ========================================================= */}
              {user.pinnedHighlights && user.pinnedHighlights.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pinned Highlights & Moments ({user.pinnedHighlights.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">Curated Stories</span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {user.pinnedHighlights.map((hl) => (
                      <div
                        key={hl.id}
                        onClick={() => setSelectedHighlight(hl)}
                        className="w-44 sm:w-52 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18161B] shrink-0 shadow-sm hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="h-28 w-full relative overflow-hidden bg-slate-900">
                          <img
                            src={hl.imageUrl || hl.image}
                            alt={hl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span 
                            className="absolute bottom-2 left-2 right-2 text-xs font-black text-white truncate drop-shadow-md"
                          >
                            {hl.title}
                          </span>
                        </div>
                        {hl.description && (
                          <div className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {hl.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 3: OUTINGS HOSTED BY THIS CREATOR
                  ========================================================= */}
              {userOutings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: accent }} />
                      <span>Outings Hosted by {handle} ({userOutings.length})</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">Open for joining</span>
                  </div>

                  <div className="space-y-2.5">
                    {userOutings.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => {
                          onClose();
                          onOpenOutingDetail?.(plan);
                        }}
                        className="p-3.5 bg-white dark:bg-[#18161B] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-400 transition cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={plan.spotImage}
                            alt={plan.spotTitle}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition truncate">
                              {plan.spotTitle}
                            </h5>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {plan.date} • {plan.spotAddress || 'Nairobi'}
                            </p>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3" />
                              <span>{plan.currentAttendeesCount || 1} / {plan.maxAttendees} attendees</span>
                            </span>
                          </div>
                        </div>

                        <span 
                          className="text-xs font-black shrink-0 px-3 py-1.5 rounded-xl text-white shadow-2xs"
                          style={{ backgroundColor: accent }}
                        >
                          View Outing →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match & Messaging Connection Status Card */}
              {!isOwnProfile && (
                <div className="p-3.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                  {isMutualMatch ? (
                    <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        You and <strong>{handle}</strong> are mutual matches. Direct messaging is unlocked!
                      </span>
                    </p>
                  ) : isSingle ? (
                    <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Lock className="w-4 h-4 shrink-0 text-[#E0533C]" />
                      <span>Direct messaging requires mutual match acceptance. Send a match request to connect!</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-slate-500">
                      <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>
                        This user is <strong>Not single</strong>. Hangout matching is disabled.
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                {isOwnProfile ? (
                  <div className="w-full flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsKitOpen(true)}
                      className="flex-1 py-3 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      style={{ backgroundColor: accent }}
                    >
                      <Palette className="w-4 h-4" />
                      <span>Open Personalization Kit</span>
                    </button>
                    {onOpenAccountSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAccountSettings();
                        }}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition cursor-pointer"
                      >
                        Settings
                      </button>
                    )}
                  </div>
                ) : isMutualMatch ? (
                  <button
                    type="button"
                    onClick={handleMessageClick}
                    className="w-full py-3.5 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: accent }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Direct Message</span>
                  </button>
                ) : isSingle ? (
                  <>
                    <button
                      type="button"
                      onClick={handleMatchClick}
                      className="flex-1 py-3.5 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      style={{ backgroundColor: accent }}
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      <span>Send Match Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleMessageClick}
                      className="py-3.5 px-4 bg-[#F8F8F6] dark:bg-[#18161B] text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800"
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
                    className="w-full py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 opacity-40" />
                    <span>Matching disabled (not single)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight Details Modal */}
      {selectedHighlight && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedHighlight(null)}
        >
          <div 
            className="bg-white dark:bg-[#1C1A1E] rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-56 w-full relative bg-slate-900">
              <img src={selectedHighlight.imageUrl || selectedHighlight.image} alt={selectedHighlight.title} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setSelectedHighlight(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">{selectedHighlight.title}</h4>
              {selectedHighlight.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedHighlight.description}</p>
              )}
              {selectedHighlight.linkUrl && (
                <a
                  href={selectedHighlight.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  style={{ backgroundColor: accent }}
                >
                  <span>Explore Feature</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personalization Kit Modal */}
      {isKitOpen && (
        <PersonalizationKitModal
          isOpen={isKitOpen}
          onClose={() => setIsKitOpen(false)}
          mode="professional"
          profile={user}
          onSaveProfile={(updated) => {
            onProfileChange?.(updated);
            setIsKitOpen(false);
          }}
          showToast={showToast}
        />
      )}
    </>
  );
};
