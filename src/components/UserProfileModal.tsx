import React, { useRef, useState } from 'react';
import { X, Heart, MessageSquare, MapPin, Sparkles, Shield, User, CheckCircle2, Lock, Bookmark, ChevronRight, Camera, Loader2 } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { VerifiedBadge } from './VerifiedBadge';
import { ProfessionalStatus, loadProfessionalAccount } from '../utils/professionalAccount';
import { toHandle, uploadAvatar } from '../lib/cloudSync';

interface UserProfileModalProps {
  user: UserProfile | null;
  isMutualMatch?: boolean;
  onClose: () => void;
  onSendMatchRequest?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  showToast: (msg: string) => void;
  onOpenSavedItems?: () => void;
  onOpenAccountSettings?: () => void;
  /** True when this modal shows the signed-in user's own profile (enables the photo edit button). */
  isOwnProfile?: boolean;
  /** Signed-in user's id, needed to upload their avatar. */
  currentUserId?: string;
  /** Called after a new avatar is saved so the app can update the profile in real time. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
}

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // Show the new photo immediately, even before the parent re-renders with it
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  if (!user) return null;

  // Public identity is the @username only; real names are never displayed here
  const handle = toHandle(user.handle);
  const avatarSrc = avatarOverride || user.avatar;

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!currentUserId) {
      showToast('Please sign in to change your photo.');
      return;
    }
    setIsUploadingAvatar(true);
    const res = await uploadAvatar(currentUserId, file);
    setIsUploadingAvatar(false);
    if (res.error || !res.url) {
      showToast(res.error || 'Could not upload photo.');
      return;
    }
    setAvatarOverride(res.url);
    onProfileChange?.({ avatar: res.url });
    showToast('Profile photo updated.');
  };

  const isSingle = user.relationshipStatus === 'single';

  // Professional account info: prefer fields on the profile, fall back to the locally stored record
  const localPro = loadProfessionalAccount(handle);
  const proStatus: ProfessionalStatus =
    ((user as any).professionalStatus as ProfessionalStatus) || localPro.status;
  const proKind: string = (user as any).professionalKind || localPro.kind;
  const proCategory: string = (user as any).professionalCategory || localPro.category;
  const proWebsite: string = (user as any).professionalWebsite || localPro.website;
  const isApprovedPro = proStatus === 'approved';

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
          <div className="absolute top-3 inset-x-3 flex items-center justify-between">
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPicked}
              />
            </>
          )}

          {/* Bottom Photo Overlay Badge */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="text-white drop-shadow-md">
              <h3 className="text-xl font-black flex items-center gap-1.5">
                <span>{handle}</span>
                <VerifiedBadge status={isApprovedPro ? 'approved' : 'none'} size="md" />
              </h3>
            </div>

            <span className={`text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1 ${
              isSingle 
                ? 'bg-emerald-600/90 text-white' 
                : 'bg-slate-800/90 text-slate-200'
            }`}>
              {isSingle && <CheckCircle2 className="w-3 h-3 text-white" />}
              <span>{isSingle ? (user.isLivenessVerified ? 'Single (Verified)' : 'Single') : 'Not single'}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 relative flex-1 overflow-y-auto space-y-3.5">
          {/* Location details */}
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>{user.loc ? user.loc.replace(/^nearby\s+/i, '').replace(/\bnearby\b/gi, '').replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '').trim() : 'Kenya'}</span>
          </p>

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

          {/* Bio Section */}
          <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-[#E0533C]" />
              <span>Bio & Vibe</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {user.bio || 'Exploring Kenyan hangouts, good music, food, and culture.'}
            </p>
          </div>

          {/* Vibes / Interests */}
          {user.vibes && user.vibes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Favorite Vibes
              </h4>
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

          {/* Matching Status Note */}
          <div className="p-3 rounded-2xl text-[11px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            {isMutualMatch ? (
              <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>You and <strong>{handle}</strong> are mutual matches. Direct messaging is unlocked!</span>
              </p>
            ) : isSingle ? (
              <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 shrink-0 text-[#E0533C]" />
                <span>Direct messaging requires mutual match acceptance. Send a request to connect!</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-slate-500">
                <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                <span>This user is <strong>Not single</strong>. Hangout matching is disabled.</span>
              </p>
            )}
          </div>

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
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#E0533C] flex items-center justify-center group-hover:scale-105 transition">
                  <Bookmark className="w-4 h-4 fill-[#E0533C]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Saved Items & Moves</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-[#E0533C]/10 text-[#E0533C] rounded">Collection</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">View bookmarked spots, raves, fits & offers</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
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

          {/* Action Buttons */}
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
        </div>
      </div>
    </div>
  );
};
