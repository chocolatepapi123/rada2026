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
  MoreHorizontal,
  Check,
  Briefcase,
  UserCog,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, OutingPlan } from '../types';
import { CreatorHubTab } from './CreatorHubTab';
import { AccountSwitcher } from './AccountSwitcher';
import {
  AvatarHero,
  IdentityFields,
  ProfessionalDashboard,
  RelationshipStatusField,
  Section,
  useOwnProfile,
} from './ProfileSettingsKit';
import type { ToastOptions } from './Toast.tsx';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string, options?: ToastOptions) => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  /** Called on every save/switch/upload so the parent App state (the one shared user object) updates immediately. */
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  /** @deprecated Professional state is written straight to Supabase. Ignored. */
  onUpdateProfessional?: (data: any) => Promise<void> | void;
  /** Optional numbers from the app. Used only when the server has none. */
  professionalStats?: { profileViews?: number; outingsHosted?: number; joinRequests?: number };
  /** All outings; the Creator Hub filters to the ones this user hosts. */
  outings?: OutingPlan[];
}

type Screen = 'main' | 'password' | 'professional';

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
  outings = [],
}) => {
  const [screen, setScreen] = useState<Screen>('main');
  const [hubOpen, setHubOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const user = session?.user;
  const isLoggedIn = !!user;

  const requireLogin = () => {
    showToast('Please sign in first.', { type: 'error' });
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
    if (isOpen) {
      setScreen('main');
      setMenuOpen(false);
    }
  }, [isOpen]);

  // Re-sync the inputs with the user store whenever the modal opens or the stored profile changes.
  // The modal stays mounted while closed, so without this it reopens with stale local drafts.
  useEffect(() => {
    if (isOpen) own.resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    user?.id,
    currentUserProfile?.name,
    currentUserProfile?.username,
    currentUserProfile?.bio,
    currentUserProfile?.relationshipStatus,
  ]);

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
      showToast('Password updated successfully!', { category: 'profile' });
      setNewPassword('');
      setConfirmPassword('');
      setScreen('main');
    } catch (err: any) {
      const msg = err?.message || 'Could not update password. Please sign in again and retry.';
      setPasswordError(msg);
      showToast(`Error: ${msg}`, { type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 text-[13px] bg-slate-100 dark:bg-[#121113] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40 dark:focus:ring-[#D17A68]/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
  const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  const titles: Record<Screen, string> = {
    main: 'Account & Security',
    password: 'Password',
    professional: 'Host Dashboard',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 sm:rounded-3xl max-w-lg w-full h-full sm:h-auto overflow-hidden shadow-2xl flex flex-col sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="relative z-20 px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-sm flex items-center gap-1">
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

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-20 w-64 bg-white dark:bg-[#252228] rounded-2xl shadow-xl p-1.5"
                >
                  {(
                    [
                      ['main', 'Account & Security', 'Profile, email and password', <UserCog key="a" className="w-4 h-4" />],
                      ['professional', 'Professional / Host Dashboard', 'Badge, analytics and host controls', <Briefcase key="p" className="w-4 h-4" />],
                    ] as [Screen, string, string, React.ReactNode][]
                  ).map(([target, label, hint, icon]) => (
                    <button
                      key={target}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setScreen(target);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                        {icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold">{label}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{hint}</span>
                      </span>
                      {screen === target && <Check className="w-4 h-4 text-[#E0533C] dark:text-[#D17A68] shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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
                <div className="mx-3 mt-4 p-3.5 rounded-2xl bg-amber-500/10 flex items-start gap-3">
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
                        className="mt-2 px-3.5 py-1.5 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-black text-xs rounded-xl cursor-pointer"
                      >
                        Log In / Create Account
                      </button>
                    )}
                  </div>
                </div>
              )}

              <Section title="Identity & bio" description="Your public @username, private display name and bio. Updated everywhere when you save.">
                <IdentityFields p={own} />
              </Section>

              <Section title="Relationship status" description="Controls who can send you hangout and match requests.">
                <RelationshipStatusField p={own} />
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
                        : showToast(`Your password is managed by ${authProviderName}.`, { type: 'error' })
                      : requireLogin()
                  }
                />
              </div>
              </Section>

              {isLoggedIn && onOpenAuth && (
                <AccountSwitcher
                  currentUserId={session?.user?.id}
                  showToast={showToast}
                  onAddAccount={() => { onClose(); onOpenAuth(); }}
                />
              )}

              {isLoggedIn && onSignOut && (
                <div className="mx-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="w-full py-3 bg-white dark:bg-[#1C1A1E] shadow-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-black rounded-2xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* ===================== PROFESSIONAL / HOST DASHBOARD ===================== */}
          {screen === 'professional' && (
            <div className="pt-1">
              {!isLoggedIn && (
                <p className="mx-4 mt-4 text-[12px] text-slate-500 dark:text-slate-400">
                  Log in to switch to a professional account.
                </p>
              )}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setHubOpen(true)}
                  className="mx-3 mt-4 w-[calc(100%-1.5rem)] p-4 rounded-2xl bg-[#E0533C] dark:bg-[#A94F3E] text-white flex items-center gap-3 text-left cursor-pointer shadow-md shadow-orange-500/20"
                >
                  <Briefcase className="w-5 h-5 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-black">Open Creator Hub</span>
                    <span className="block text-[11px] opacity-90">Outings, analytics, broadcasts, badge and plan</span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              )}
              <ProfessionalDashboard p={own} />
            </div>
          )}

          {hubOpen && (
            <CreatorHubTab
              own={own}
              outings={outings}
              userId={user?.id}
              onClose={() => setHubOpen(false)}
              onOpenAuth={onOpenAuth}
              showToast={showToast}
            />
          )}

          {/* ===================== PASSWORD ===================== */}
          {screen === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="px-4 pt-5 space-y-4">
              <p className="text-xs text-slate-500">
                Use at least 6 characters. You&apos;ll stay signed in on this device.
              </p>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 text-[11px] font-medium">
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
                className="w-full py-3 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
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

        {/* Save bar (profile fields live on the main screen) */}
        {screen === 'main' && (
          <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={own.save}
              disabled={!own.dirty || own.saving}
              className="w-full py-3 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {own.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save changes</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
