import React from 'react';
import { X, Heart, MessageSquare, MapPin, Sparkles, Shield, User, CheckCircle2, Lock } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface UserProfileModalProps {
  user: UserProfile | null;
  isMutualMatch?: boolean;
  onClose: () => void;
  onSendMatchRequest?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isMutualMatch = false,
  onClose,
  onSendMatchRequest,
  onSendMessage,
  showToast
}) => {
  if (!user) return null;

  const isSingle = user.relationshipStatus === 'single';

  const handleMatchClick = () => {
    if (!isSingle) {
      showToast(`${user.name} is Not Single. Matching requests are disabled for this profile.`);
      return;
    }
    if (onSendMatchRequest) {
      onSendMatchRequest(user);
    } else {
      showToast(`Hangout & Match request sent to ${user.name}!`);
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
      showToast(`Chat conversation opened with ${user.name}!`);
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
            style={{ backgroundImage: `url('${user.avatar}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10 pointer-events-none" />
          
          {/* Complete uncropped photo */}
          <img 
            src={user.avatar} 
            alt={user.name} 
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

          {/* Bottom Photo Overlay Badge */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="text-white drop-shadow-md">
              <h3 className="text-xl font-black">{user.name}</h3>
              <p className="text-xs font-bold text-orange-300">{user.handle}</p>
            </div>

            <span className={`text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md ${
              isSingle 
                ? 'bg-emerald-600/90 text-white' 
                : 'bg-slate-800/90 text-slate-200'
            }`}>
              {isSingle ? 'Single' : 'Not single'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 relative flex-1 overflow-y-auto space-y-3.5">
          {/* Location details */}
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
            <span>{user.loc || 'Kenya'}</span>
          </p>

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
                <span>You and <strong>{user.name}</strong> are mutual matches. Direct messaging is unlocked!</span>
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
                onClick={() => showToast(`${user.name} is Not Single. Matching requests are disabled.`)}
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
