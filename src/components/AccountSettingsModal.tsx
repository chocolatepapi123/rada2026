import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Globe,
  LogOut,
  KeyRound,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import {
  AvatarHero,
  IdentityFields,
  ProfessionalHub,
  ProfessionalSwitchCard,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string) => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  /** Called on every save/switch/upload so the parent App state (the one shared user object) updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  /** @deprecated Professional state is written straight to Supabase. Ignored. */
  onUpdateProfessional?: (data: any) => Promise<void> | void;
  /** Optional numbers from the app. Used only when the server has none. */
  professionalStats?: { profileViews?: number; outingsHosted?: number; joinRequests?: number };
}

type Screen = 'main' | 'password';

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  right?: React.ReactNode;
}> = ({ icon, label, value, onClick, right }) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left ${
        onClick ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition' : ''
      }`}
    >
      <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</span>
        {value && <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{value}</span>}
      </span>
      {right}
      {onClick && !right && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
    </Tag>
  );
};

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUserProfile,
  showToast,
  onOpenAuth,
  onSignOut,
  onProfileChange,
  professionalStats,
}) => {
  const [screen, setScreen] = useState<Screen>('main');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const user = session?.user;
  const isLoggedIn = !!user;

  const requireLogin = () => {
    showToast('Please sign in first.');
    if (onOpenAuth) onOpenAuth();
  };

  // Same hook as UserProfileModal: both read/write the one parent-owned user object
  const own = useOwnProfile({
    profile: currentUserProfile || {},
    userId: user?.id,
    active: isOpen && isLoggedIn,
    onProfileChange,
    showToast,
    onRequireLogin: requireLogin,
    statsFallback: professionalStats,
  });
  const handle = own.handle;

  useEffect(() => {
    if (isOpen) setScreen('main');
  }, [isOpen]);

  if (!isOpen) return null;

  const email =
    user?.email ||
    (handle ? `${handle.replace('@', '')}@rada.ke` : 'guest@rada.ke');

  const rawProvider =
    user?.app_metadata?.provider || user?.identities?.[0]?.provider || (isLoggedIn ? 'email' : 'Local Guest');
  const authProviderName =
    rawProvider === 'google' ? 'Google' : rawProvider === 'email' ? 'Email & password' : rawProvider;
  const canChangePassword = isLoggedIn && rawProvider === 'email';

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!isLoggedIn) return requireLogin();
    if (newPassword.length < 6) return setPasswordError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setPasswordError('Passwords do not match.');

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setScreen('main');
    } catch (err: any) {
      const msg = err?.message || 'Could not update password. Please sign in again and retry.';
      setPasswordError(msg);
      showToast(`Error: ${msg}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 text-[13px] bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
  const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  const titles: Record<Screen, string> = {
    main: 'Account & Security',
    password: 'Password',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 sm:rounded-3xl max-w-lg w-full h-full sm:h-auto overflow-hidden shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          {screen !== 'main' ? (
            <button
              onClick={() => setScreen('main')}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="w-9" />
          )}
          <h3 className="flex-1 text-center text-[15px] font-black tracking-tight">{titles[screen]}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* ===================== MAIN ===================== */}
          {screen === 'main' && (
            <>
              <AvatarHero p={own} subtitle={<p className="mt-1 text-[11px] text-slate-400">Only your @username is shown to others</p>} />

              {!isLoggedIn && (
                <div className="mx-3 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-300">You&apos;re browsing as a guest</p>
                    <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300/80">
                      Log in to manage your account and security.
                    </p>
                    {onOpenAuth && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuth();
                        }}
                        className="mt-2 px-3.5 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black text-xs rounded-xl cursor-pointer"
                      >
                        Log In / Create Account
                      </button>
                    )}
                  </div>
                </div>
              )}

              <Section title="Profile" description="Saved to your account and updated everywhere right away.">
                <IdentityFields p={own} showSave saveLabel="Save changes" />
              </Section>

              <Section
                title="Professional account"
                description="Host outings with a verified badge and see how they perform."
              >
                <ProfessionalSwitchCard p={own} />
                {own.isPro && <ProfessionalHub p={own} />}
              </Section>

              <Section title="Account">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <Row
                  icon={<Mail className="w-4 h-4" />}
                  label="Email (private)"
                  value={email}
                  right={
                    isLoggedIn ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    ) : undefined
                  }
                />
                <Row icon={<Globe className="w-4 h-4" />} label="Sign-in method" value={authProviderName} />
              </div>
              </Section>

              <Section title="Security">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <Row
                  icon={<KeyRound className="w-4 h-4" />}
                  label="Password"
                  value={
                    canChangePassword
                      ? 'Change your password'
                      : isLoggedIn
                      ? `Managed by ${authProviderName}`
                      : 'Log in to manage'
                  }
                  onClick={() =>
                    isLoggedIn
                      ? canChangePassword
                        ? setScreen('password')
                        : showToast(`Your password is managed by ${authProviderName}.`)
                      : requireLogin()
                  }
                />
              </div>
              </Section>

              {isLoggedIn && onSignOut && (
                <div className="mx-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                      showToast('You have been logged out.');
                    }}
                    className="w-full py-3 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-black rounded-2xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* ===================== PASSWORD ===================== */}
          {screen === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="px-4 pt-5 space-y-4">
              <p className="text-xs text-slate-500">
                Use at least 6 characters. You&apos;ll stay signed in on this device.
              </p>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-medium">
                  {passwordError}
                </div>
              )}

              <div>
                <label className={labelCls}>New password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    autoComplete="new-password"
                    className={`${inputCls} pl-9 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-3 text-slate-400 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Confirm new password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    autoComplete="new-password"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword}
                className="w-full py-3 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <span>Update password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
