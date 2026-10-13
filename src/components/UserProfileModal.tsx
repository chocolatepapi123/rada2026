import React from 'react';
import { X, Heart, MessageSquare, MapPin, Sparkles, Shield, User, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface UserProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onSendMatchRequest?: (user: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
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
    if (onSendMessage) {
      onSendMessage(user);
    } else {
      showToast(`Chat conversation opened with ${user.name}!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#E0533C] via-orange-500 to-[#E9C46A] p-4 flex justify-between items-start">
          <span className="bg-black/50 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RADA Community Profile</span>
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-0 relative flex-1 overflow-y-auto space-y-4">
          {/* Avatar & Relationship Status Overlay */}
          <div className="flex items-end justify-between -mt-12 mb-2">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full bg-cover bg-center border-4 border-white dark:border-[#1C1A1E] shadow-xl bg-slate-200 dark:bg-slate-800"
                style={{ backgroundImage: `url('${user.avatar}')` }}
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#2D6A4F] border-2 border-white dark:border-[#1C1A1E] flex items-center justify-center text-[10px] text-white">
                ✓
              </span>
            </div>

            {/* Relationship Status Badge */}
            <div className="pb-1">
              {isSingle ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Single (Open to Match)</span>
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Not Single (Social & Events)</span>
                </div>
              )}
            </div>
          </div>

          {/* User Names & Location */}
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {user.name}
            </h3>
            <p className="text-xs font-bold text-[#E0533C]">
              {user.handle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
              <span>{user.loc || 'Nairobi, Kenya'}</span>
            </p>
          </div>

          {/* Bio Section */}
          <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-[#E0533C]" />
              <span>Bio & Vibe</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {user.bio || 'Exploring Nairobi hangouts, good music, food, and culture.'}
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

          {/* Matching Status Info Note */}
          <div className="p-3 rounded-2xl text-[11px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            {isSingle ? (
              <p className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>This user is <strong>Single</strong> and can receive hangout & matching requests.</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                <span>This user is <strong>Not Single</strong>. Matching requests are disabled; they are here for spots & events.</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            {isSingle ? (
              <button
                onClick={handleMatchClick}
                className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>Send Match Request</span>
              </button>
            ) : (
              <button
                onClick={() => showToast(`${user.name} is Not Single. Matching requests are disabled.`)}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4 opacity-40" />
                <span>Matching Disabled (Not Single)</span>
              </button>
            )}

            <button
              onClick={handleMessageClick}
              className="py-3 px-4 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-900 dark:text-slate-100 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
