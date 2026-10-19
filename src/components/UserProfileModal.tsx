import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Heart,
  MessageSquare,
  MapPin,
  Sparkles,
  Shield,
  User,
  CheckCircle2,
  Lock,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Camera,
  Loader2,
  BadgeCheck,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { UserProfile } from '../types.ts';
import { VerifiedBadge } from './VerifiedBadge';
import { ProfileIdentityForm } from './ProfileIdentityForm';
import {
  ProfessionalAccount,
  ProfessionalKind,
  ProfessionalStatus,
  EMPTY_PROFESSIONAL,
  PROFESSIONAL_CATEGORIES,
  loadProfessionalAccount,
  saveProfessionalAccount,
} from '../utils/professionalAccount';
import { normalizeUsername, toHandle, uploadAvatar } from '../lib/cloudSync';

interface ProfessionalStats {
  profileViews?: number;
  outingsHosted?: number;
  joinRequests?: number;
}

interface UserProfileModalProps {
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
  /** Signed-in user's email, used only as a placeholder in the professional application. */
  accountEmail?: string;
  /** Called whenever name, username or avatar changes so the global App profile state stays in sync. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  /** Optional: persist the professional application/settings to your backend. */
  onUpdateProfessional?: (data: ProfessionalAccount) => Promise<void> | void;
  /** Optional: real analytics numbers. Anything undefined renders as an empty state, never mock data. */
  professionalStats?: ProfessionalStats;
  onOpenAuth?: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 text-[13px] bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1';

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
  accountEmail = '',
  onProfileChange,
  onUpdateProfessional,
  professionalStats,
  onOpenAuth,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [view, setView] = useState<'profile' | 'professional'>('profile');

  // Local copy of the identity fields so the modal always shows the latest saved values,
  // even before the parent re-renders. Cleared when the parent passes in a different identity.
  const [identity, setIdentity] = useState<Partial<UserProfile>>({});
  useEffect(() => {
    setIdentity({});
  }, [user?.id, user?.handle]);

  // Professional account: one key per account (user id), shared with Account Settings
  const proKey: string | undefined = isOwnProfile ? currentUserId || user?.handle : user?.handle;
  const [pro, setPro] = useState<ProfessionalAccount>(EMPTY_PROFESSIONAL);
  const [isSavingPro, setIsSavingPro] = useState(false);
  useEffect(() => {
    if (isOwnProfile) {
      setPro(loadProfessionalAccount(proKey));
      setView('profile');
    }
  }, [isOwnProfile, proKey]);

  if (!user) return null;

  const viewUser: UserProfile = isOwnProfile ? { ...user, ...identity } : user;

  // Public identity is the @username only; the display name is private to the account owner
  const handle = toHandle(viewUser.handle);
  const username = normalizeUsername(viewUser.username || viewUser.handle || '');
  const avatarSrc = viewUser.avatar;

  const isSingle = viewUser.relationshipStatus === 'single';

  // Professional account info
  const localPro = isOwnProfile ? pro : loadProfessionalAccount(handle);
  const proStatus: ProfessionalStatus = isOwnProfile
    ? pro.status
    : ((user as any).professionalStatus as ProfessionalStatus) || localPro.status;
  const proKind: string = isOwnProfile ? pro.kind : (user as any).professionalKind || localPro.kind;
  const proCategory: string = isOwnProfile ? pro.category : (user as any).professionalCategory || localPro.category;
  const proWebsite: string = isOwnProfile ? pro.website : (user as any).professionalWebsite || localPro.website;
  const isApprovedPro = proStatus === 'approved';
  const isProfessional = pro.status !== 'none';

  const applyProfileChange = (patch: Partial<UserProfile>) => {
    setIdentity((prev) => ({ ...prev, ...patch }));
    onProfileChange?.(patch);
  };

  const requireLogin = () => {
    showToast('Please sign in first.');
    onOpenAuth?.();
  };

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!currentUserId) return showToast('Please sign in to change your photo.');
    setIsUploadingAvatar(true);
    const res = await uploadAvatar(currentUserId, file);
    setIsUploadingAvatar(false);
    if (res.error || !res.url) return showToast(res.error || 'Could not upload photo.');
    applyProfileChange({ avatar: res.url });
    showToast('Profile photo updated.');
  };

  const persistPro = async (next: ProfessionalAccount) => {
    setPro(next);
    saveProfessionalAccount(proKey, next);
    if (onUpdateProfessional) await onUpdateProfessional(next);
  };

  // Toggle ON -> open application. Toggle OFF -> switch back to personal.
  const handleToggleProfessional = async () => {
    if (!currentUserId) return requireLogin();
    if (isProfessional) {
      if (!window.confirm('Switch back to a personal account? Your professional settings will be removed.')) return;
      await persistPro({ ...EMPTY_PROFESSIONAL });
      showToast('Switched back to a personal account.');
    } else {
      setView('professional');
    }
  };

  const handleSubmitProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro.category) return showToast('Please pick a category.');
    if (!pro.brandName.trim()) return showToast('Please enter your brand or creator name.');
    setIsSavingPro(true);
    try {
      const next: ProfessionalAccount = {
        ...pro,
        brandName: pro.brandName.trim(),
        contactEmail: pro.contactEmail.trim() || accountEmail,
        website: pro.website.trim(),
        status: pro.status === 'approved' ? 'approved' : 'pending',
        appliedAt: pro.appliedAt || new Date().toISOString(),
      };
      await persistPro(next);
      showToast(
        next.status === 'approved'
          ? 'Professional settings saved.'
          : 'Application submitted. We will review it shortly.'
      );
      setView('profile');
    } catch (err: any) {
      showToast(`Could not save: ${err?.message || 'try again'}`);
    } finally {
      setIsSavingPro(false);
    }
  };

  const handleMatchClick = () => {
    if (!isSingle) {
      showToast(`${handle} is Not Single. Matching requests are disabled for this profile.`);
      return;
    }
    if (onSendMatchRequest) {
      onSendMatchRequest(viewUser);
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
      onSendMessage(viewUser);
    } else {
      showToast(`Chat conversation opened with ${handle}!`);
    }
    onClose();
  };

  const statNumber = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '—');

  // ===================== PROFESSIONAL APPLICATION VIEW =====================
  if (isOwnProfile && view === 'professional') {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div
          className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setView('profile')}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="flex-1 text-center text-[15px] font-black tracking-tight">
              {isProfessional ? 'Professional account' : 'Switch to professional'}
            </h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitProfessional} className="px-4 py-5 space-y-4 overflow-y-auto">
            {!isProfessional && (
              <div className="p-3.5 rounded-2xl bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                <p className="font-black flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#1D9BF0]" /> What you get
                </p>
                <p>Advanced profile settings, host benefits, profile analytics, and a verified badge once approved.</p>
              </div>
            )}

            {pro.status !== 'none' && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold">Status</span>
                <VerifiedBadge status={pro.status} size="sm" showLabel />
              </div>
            )}

            <div>
              <label className={labelCls}>Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['personal_brand', 'Personal brand'],
                  ['creator', 'Creator'],
                ] as [ProfessionalKind, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPro({ ...pro, kind: k })}
                    className={`py-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                      pro.kind === k
                        ? 'bg-[#1D9BF0] text-white border-[#1D9BF0]'
                        : 'bg-white dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select value={pro.category} onChange={(e) => setPro({ ...pro, category: e.target.value })} className={inputCls}>
                <option value="">Select a category</option>
                {PROFESSIONAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Brand / creator name</label>
              <input
                type="text"
                value={pro.brandName}
                onChange={(e) => setPro({ ...pro, brandName: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Contact email (optional)</label>
              <input
                type="email"
                value={pro.contactEmail}
                onChange={(e) => setPro({ ...pro, contactEmail: e.target.value })}
                placeholder={accountEmail}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Website (optional)</label>
              <input
                type="url"
                value={pro.website}
                onChange={(e) => setPro({ ...pro, website: e.target.value })}
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPro}
              className="w-full py-3 bg-[#1D9BF0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSavingPro ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{isProfessional ? 'Save changes' : 'Submit for approval'}</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full Uncropped Profile Photo Display with Ambient Fill (No cropping, no blank spots) */}
        <div className="relative h-80 sm:h-96 w-full bg-[#121113] shrink-0 overflow-hidden flex items-center justify-center">
          {/* Blurred ambient fill eliminates solid colored blank spots */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-50 dark:opacity-40"
            style={{ backgroundImage: `url('${avatarSrc}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10 pointer-events-none" />

          {/* Complete uncropped photo */}
          <img
            src={avatarSrc}
            alt={handle}
            className="relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl"
          />

          {/* Top Header Floating Controls */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between">
            <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#E9C46A]" />
              <span>RADA Profile</span>
            </span>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer shadow-md"
              title="Close Profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Edit profile photo (own profile only) */}
          {isOwnProfile && (
            <>
              <button
                type="button"
                onClick={() => (currentUserId ? fileInputRef.current?.click() : showToast('Please sign in to change your photo.'))}
                disabled={isUploadingAvatar}
                className="absolute bottom-16 right-3 z-20 w-10 h-10 rounded-full bg-[#E0533C] hover:bg-orange-700 text-white flex items-center justify-center shadow-lg border-2 border-white/80 cursor-pointer disabled:opacity-60"
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPicked} />
            </>
          )}

          {/* Bottom Photo Overlay Badge */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
            <div className="text-white drop-shadow-md min-w-0">
              <h3 className="text-xl font-black flex items-center gap-1.5">
                <span className="truncate">{handle}</span>
                <VerifiedBadge status={isApprovedPro ? 'approved' : 'none'} size="md" />
              </h3>
            </div>

            <span
              className={`text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1 shrink-0 ${
                isSingle ? 'bg-emerald-600/90 text-white' : 'bg-slate-800/90 text-slate-200'
              }`}
            >
              {isSingle && <CheckCircle2 className="w-3 h-3 text-white" />}
              <span>{isSingle ? (viewUser.isLivenessVerified ? 'Single (Verified)' : 'Single') : 'Not single'}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 relative flex-1 overflow-y-auto space-y-3.5">
          {/* Location details */}
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>
              {viewUser.loc
                ? viewUser.loc
                    .replace(/^nearby\s+/i, '')
                    .replace(/\bnearby\b/gi, '')
                    .replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '')
                    .trim()
                : 'Kenya'}
            </span>
          </p>

          {/* Editable identity (own profile only) */}
          {isOwnProfile && (
            <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-[#E0533C]" />
                <span>Edit profile</span>
              </h4>
              <ProfileIdentityForm
                userId={currentUserId}
                name={viewUser.name || ''}
                username={username}
                handle={handle}
                showToast={showToast}
                onRequireLogin={requireLogin}
                onChange={applyProfileChange}
              />
            </div>
          )}

          {/* Professional account details */}
          {isApprovedPro && (
            <div className="p-3 rounded-2xl bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#1D9BF0]">
                  {proKind === 'creator' ? 'Verified creator' : 'Verified personal brand'}
                </p>
                {proCategory && <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{proCategory}</p>}
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

          {/* Account type: Switch to Professional / Business account (own profile only) */}
          {isOwnProfile && (
            <div className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
              <div className="px-3.5 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#1D9BF0]/10 text-[#1D9BF0] flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">Switch to professional account</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pro.status === 'pending'
                      ? 'Application under review'
                      : pro.status === 'approved'
                      ? 'Verified professional'
                      : 'For personal brands, creators and businesses'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isProfessional}
                  onClick={handleToggleProfessional}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                    isProfessional ? 'bg-[#1D9BF0]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isProfessional ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {isProfessional && (
                <button
                  type="button"
                  onClick={() => setView('professional')}
                  className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">Professional settings</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {pro.brandName || 'Brand'} • {pro.category || 'No category'}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Professional-only: insights + host benefits */}
          {isOwnProfile && isProfessional && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Profile insights</h4>
              {pro.status === 'approved' ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Profile views', professionalStats?.profileViews],
                    ['Plans hosted', professionalStats?.outingsHosted],
                    ['Join requests', professionalStats?.joinRequests],
                  ].map(([label, n]) => (
                    <div
                      key={label as string}
                      className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 text-center min-w-0"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#1D9BF0] mx-auto mb-1" />
                      <p className="text-base font-black">{statNumber(n as number | undefined)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold truncate">{label as string}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Insights unlock once your account is approved.</p>
              )}

              <h4 className="pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Host benefits</h4>
              <div className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                {[
                  ['Verified badge on your profile and hosted plans', pro.status === 'approved'],
                  ['Advanced profile settings and brand details', true],
                  ['Priority placement for plans you host', pro.status === 'approved'],
                  ['Profile analytics', pro.status === 'approved'],
                ].map(([text, active]) => (
                  <div key={text as string} className="px-3.5 py-2.5 flex items-center gap-3">
                    <Megaphone className={`w-4 h-4 shrink-0 ${active ? 'text-[#1D9BF0]' : 'text-slate-300'}`} />
                    <span className={`text-xs font-medium flex-1 min-w-0 ${active ? '' : 'text-slate-400'}`}>{text as string}</span>
                    {!active && <span className="text-[10px] font-bold text-slate-400 shrink-0">After approval</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio Section */}
          <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-[#E0533C]" />
              <span>Bio & Vibe</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {viewUser.bio || 'Exploring Kenyan hangouts, good music, food, and culture.'}
            </p>
          </div>

          {/* Vibes / Interests */}
          {viewUser.vibes && viewUser.vibes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Favorite Vibes</h4>
              <div className="flex flex-wrap gap-1.5">
                {viewUser.vibes.map((v, idx) => (
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

          {/* Matching Status Note (other people's profiles) */}
          {!isOwnProfile && (
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
          )}

          {/* Prominent Saved Items Entry Point */}
          {onOpenSavedItems && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSavedItems();
              }}
              className="w-full p-3 rounded-2xl bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 hover:border-[#E0533C]/50 text-left flex items-center justify-between transition cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#E0533C] flex items-center justify-center group-hover:scale-105 transition shrink-0">
                  <Bookmark className="w-4 h-4 fill-[#E0533C]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Saved Items & Moves</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-[#E0533C]/10 text-[#E0533C] rounded">Collection</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">View bookmarked spots, raves, fits & offers</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          )}

          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAccountSettings();
              }}
              className="w-full p-3 rounded-2xl bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 hover:border-[#E0533C]/50 text-left flex items-center justify-between transition cursor-pointer"
            >
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">Account & Security</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* Action Buttons (other people's profiles) */}
          {!isOwnProfile && (
            <div className="pt-2 flex gap-2">
              {isMutualMatch ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  className="w-full py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Direct Message</span>
                </button>
              ) : isSingle ? (
                <>
                  <button
                    type="button"
                    onClick={handleMatchClick}
                    className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Send Match Request</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMessageClick}
                    className="py-3 px-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Direct Message"
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
                  <span>Matching Disabled (Not Single)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
