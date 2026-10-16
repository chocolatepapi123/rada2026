import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Calendar, 
  Globe, 
  LogOut, 
  KeyRound, 
  Loader2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string) => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUserProfile,
  showToast,
  onOpenAuth,
  onSignOut,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const user = session?.user;
  const isLoggedIn = !!user;

  // Account details
  const email = user?.email || (currentUserProfile ? `${currentUserProfile.handle.replace('@', '')}@rada.ke` : 'guest@rada.ke');
  const createdAtFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Local Active Session';
  
  const rawProvider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || (isLoggedIn ? 'email' : 'Local Guest');
  const authProviderName = rawProvider === 'google' 
    ? 'Google OAuth' 
    : rawProvider === 'email' 
      ? 'Email & Password' 
      : rawProvider;

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!isLoggedIn) {
      showToast('Please sign in first to manage password security.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify and retry.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      showToast('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
    } catch (err: any) {
      console.error('Password update error:', err);
      const msg = err.message || 'Could not update password. Please re-authenticate and retry.';
      setPasswordError(msg);
      showToast(`Error: ${msg}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Account & Security</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Manage your credentials, authentication & profile security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Guest User Callout if not logged in */}
          {!isLoggedIn && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-black">Using Local Guest Session</h4>
                <p className="text-[11px] mt-0.5 leading-relaxed text-amber-700 dark:text-amber-300/80">
                  You are currently using local storage. Log in or create a RADA account with Google or email to sync your spots, saved moves, and tickets across devices.
                </p>
                {onOpenAuth && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="mt-2.5 px-3.5 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Log In / Create Account
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Account Information */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
              Account Credentials
            </span>
            <div className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200/60 dark:divide-slate-800/80 text-xs">
              {/* Email */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-4 h-4 text-[#E0533C] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{email}</p>
                  </div>
                </div>
                {isLoggedIn && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    Verified
                  </span>
                )}
              </div>

              {/* Creation Date */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Account Created</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{createdAtFormatted}</p>
                  </div>
                </div>
              </div>

              {/* Auth Provider */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Authentication Provider</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{authProviderName}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Security & Change Password */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
              Change Password & Security
            </span>
            <div className="p-4 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-[#E0533C]" />
                <h4 className="text-xs font-black">Update Security Password</h4>
              </div>

              {passwordError && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-[11px] font-medium">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={isUpdatingPassword}
                      className="w-full pl-8.5 pr-3 py-2 text-xs bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      disabled={isUpdatingPassword}
                      className="w-full pl-8.5 pr-3 py-2 text-xs bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword}
                  className="w-full py-2.5 px-4 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Section 3: Session Actions */}
          {isLoggedIn && onSignOut && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                  showToast('You have been logged out.');
                }}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of RADA Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
