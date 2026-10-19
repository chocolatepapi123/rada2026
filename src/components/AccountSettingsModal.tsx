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
  User as UserIcon,
  BadgeCheck,
  BarChart3,
  Megaphone,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import {
  ProfessionalAccount,
  ProfessionalKind,
  EMPTY_PROFESSIONAL,
  PROFESSIONAL_CATEGORIES,
  loadProfessionalAccount,
  saveProfessionalAccount,
} from '../utils/professionalAccount';

interface ProfessionalStats {
  profileViews?: number;
  outingsHosted?: number;
  joinRequests?: number;
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  currentUserProfile?: UserProfile;
  showToast: (msg: string) => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  /** Optional: persist the professional application/settings to your backend (e.g. Supabase profiles). */
  onUpdateProfessional?: (data: ProfessionalAccount) => Promise<void> | void;
  /** Optional: real analytics numbers. Anything undefined renders as an empty state, never mock data. */
  professionalStats?: ProfessionalStats;
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

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="px-4 pt-5 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{children}</h4>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-3 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
    {children}
  </div>
);

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUserProfile,
  showToast,
  onOpenAuth,
  onSignOut,
  onUpdateProfessional,
  professionalStats,
}) => {
  const [screen, setScreen] = useState<Screen>('main');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Professional account
  const user = session?.user;
  const isLoggedIn = !!user;
  const accountKey: string | undefined = user?.id || currentUserProfile?.handle;
  const [pro, setPro] = useState<ProfessionalAccount>(EMPTY_PROFESSIONAL);
  const [isSavingPro, setIsSavingPro] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScreen('main');
      setPro(loadProfessionalAccount(accountKey));
    }
  }, [isOpen, accountKey]);

  if (!isOpen) return null;

  const email =
    user?.email ||
    (currentUserProfile ? `${currentUserProfile.handle.replace('@', '')}@rada.ke` : 'guest@rada.ke');

  const rawProvider =
    user?.app_metadata?.provider || user?.identities?.[0]?.provider || (isLoggedIn ? 'email' : 'Local Guest');
  const authProviderName =
    rawProvider === 'google' ? 'Google' : rawProvider === 'email' ? 'Email & password' : rawProvider;
  const canChangePassword = isLoggedIn && rawProvider === 'email';

  const isProfessional = pro.status !== 'none';

  const requireLogin = () => {
    showToast('Please sign in first.');
    if (onOpenAuth) onOpenAuth();
  };

  const persistPro = async (next: ProfessionalAccount) => {
    setPro(next);
    saveProfessionalAccount(accountKey, next);
    if (onUpdateProfessional) await onUpdateProfessional(next);
  };

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

  // Toggle ON -> open application. Toggle OFF -> switch back to personal.
  const handleToggleProfessional = async () => {
    if (!isLoggedIn) return requireLogin();
    if (isProfessional) {
      if (!window.confirm('Switch back to a personal account? Your professional settings will be removed.')) return;
      await persistPro({ ...EMPTY_PROFESSIONAL });
      showToast('Switched back to a personal account.');
    } else {
      setScreen('professional');
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
        contactEmail: pro.contactEmail.trim() || email,
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
      setScreen('main');
    } catch (err: any) {
      showToast(`Could not save: ${err?.message || 'try again'}`);
    } finally {
      setIsSavingPro(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 text-[13px] bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
  const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  const titles: Record<Screen, string> = {
    main: 'Account & Security',
    password: 'Password',
    professional: isProfessional ? 'Professional account' : 'Switch to professional',
  };

  const statNumber = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '—');

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
              {/* Identity header */}
              <div className="flex flex-col items-center text-center px-4 pt-6 pb-2">
                {currentUserProfile?.avatar ? (
                  <img
                    src={currentUserProfile.avatar}
                    alt={currentUserProfile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-[#1C1A1E] shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1.5">
                  <h2 className="text-base font-black">{currentUserProfile?.name || 'Guest'}</h2>
                  <VerifiedBadge status={pro.status} size="md" />
                </div>
                <p className="text-xs text-slate-500">{currentUserProfile?.handle || ''}</p>
                {isProfessional && (
                  <span className="mt-2 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#1D9BF0]/10 text-[#1D9BF0]">
                    {pro.kind === 'creator' ? 'Creator account' : 'Personal brand'}
                  </span>
                )}
              </div>

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

              <SectionTitle>Account</SectionTitle>
              <Card>
                <Row
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
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
              </Card>

              <SectionTitle>Security</SectionTitle>
              <Card>
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
                  onClick={() => (isLoggedIn ? (canChangePassword ? setScreen('password') : showToast(`Your password is managed by ${authProviderName}.`)) : requireLogin())}
                />
              </Card>

              <SectionTitle>Account type</SectionTitle>
              <Card>
                <div className="px-4 py-3.5 flex items-center gap-3">
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
                        : 'For personal brands and creators'}
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
                  <Row
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Professional settings"
                    value={`${pro.brandName || 'Brand'} • ${pro.category || 'No category'}`}
                    onClick={() => setScreen('professional')}
                  />
                )}
              </Card>

              {/* Professional-only: benefits + analytics */}
              {isProfessional && (
                <>
                  <SectionTitle>Profile insights</SectionTitle>
                  {pro.status === 'approved' ? (
                    <div className="mx-3 grid grid-cols-3 gap-2">
                      {[
                        ['Profile views', professionalStats?.profileViews],
                        ['Plans hosted', professionalStats?.outingsHosted],
                        ['Join requests', professionalStats?.joinRequests],
                      ].map(([label, n]) => (
                        <div
                          key={label as string}
                          className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-[#1D9BF0] mx-auto mb-1" />
                          <p className="text-lg font-black">{statNumber(n as number | undefined)}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{label as string}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mx-4 text-[11px] text-slate-500">
                      Insights unlock once your account is approved.
                    </p>
                  )}

                  <SectionTitle>Host benefits</SectionTitle>
                  <Card>
                    {[
                      ['Verified badge on your profile and hosted plans', pro.status === 'approved'],
                      ['Advanced profile settings and brand details', true],
                      ['Priority placement for plans you host', pro.status === 'approved'],
                      ['Profile analytics', pro.status === 'approved'],
                    ].map(([text, active]) => (
                      <div key={text as string} className="px-4 py-3 flex items-center gap-3">
                        <Megaphone className={`w-4 h-4 shrink-0 ${active ? 'text-[#1D9BF0]' : 'text-slate-300'}`} />
                        <span className={`text-xs font-medium ${active ? '' : 'text-slate-400'}`}>{text as string}</span>
                        {!active && (
                          <span className="ml-auto text-[10px] font-bold text-slate-400">After approval</span>
                        )}
                      </div>
                    ))}
                  </Card>
                </>
              )}

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

          {/* ===================== PROFESSIONAL ===================== */}
          {screen === 'professional' && (
            <form onSubmit={handleSubmitProfessional} className="px-4 pt-5 space-y-4">
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
                <select
                  value={pro.category}
                  onChange={(e) => setPro({ ...pro, category: e.target.value })}
                  className={inputCls}
                >
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
                  placeholder={email}
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
                {isSavingPro ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{isProfessional ? 'Save changes' : 'Submit for approval'}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
