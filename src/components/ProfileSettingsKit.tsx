import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Camera,
  Check,
  Eye,
  Loader2,
  Lock,
  Star,
  User as UserIcon,
  Users,
  Zap,
} from 'lucide-react';
import type { HostAnalytics, HostControls, UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import {
  USERNAME_MAX,
  checkUsernameAvailable,
  cleanDisplayName,
  fetchHostAnalytics,
  fetchHostControls,
  fetchProfessionalState,
  fetchProfileIdentity,
  normalizeUsername,
  saveHostControls,
  saveRelationshipStatus,
  saveUnifiedProfile,
  setProfessionalMode,
  toHandle,
  uploadAvatar,
  validateUsernameFormat,
} from '../lib/cloudSync';
import type { ToastOptions } from './Toast.tsx';

/* ------------------------------------------------------------------ */
/* Shared state: one hook, used by BOTH UserProfileModal and           */
/* AccountSettingsModal. It reads from the single parent-owned user    */
/* object and writes back through onProfileChange.                     */
/* ------------------------------------------------------------------ */

const BIO_MAX = 160;

type UsernameState = {
  state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';
  message?: string;
};

interface UseOwnProfileArgs {
  /** The single source of truth: user.username, user.name, user.avatar, user.is_creator. */
  profile: Partial<UserProfile>;
  userId?: string;
  /** Only hydrate/fetch while the modal is actually open for the owner. */
  active: boolean;
  onProfileChange?: (patch: Partial<UserProfile>) => void;
  showToast: (msg: string, options?: ToastOptions) => void;
  onRequireLogin: () => void;
  /** Optional numbers passed down by the app; used only when the server has none. */
  statsFallback?: { profileViews?: number; joinRequests?: number };
}

export function useOwnProfile({
  profile,
  userId,
  active,
  onProfileChange,
  showToast,
  onRequireLogin,
  statsFallback,
}: UseOwnProfileArgs) {
  const fallbackHandle = profile.handle && profile.handle !== '@explorer' ? profile.handle : '';
  const currentUsername = normalizeUsername(profile.username || fallbackHandle);
  // Display name starts blank. The legacy "Explorer" placeholder is never shown or edited as a real name.
  const currentName = cleanDisplayName(profile.name);
  const currentBio = profile.bio || '';
  const profileIsPro = profile.is_creator === true || profile.account_type === 'professional';
  const currentStatus: 'single' | 'not_single' = profile.relationshipStatus === 'single' ? 'single' : 'not_single';

  // Always-fresh view of the parent's user object, for async callbacks that outlive a render
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const latestRef = useRef({ currentName, currentUsername, currentBio, currentStatus });
  latestRef.current = { currentName, currentUsername, currentBio, currentStatus };

  // ---- drafts: local input state, always re-synced from the parent's user object
  const [name, setName] = useState(currentName);
  const [username, setUsername] = useState(currentUsername);
  const [bio, setBio] = useState(currentBio);
  const [status, setStatus] = useState<'single' | 'not_single'>(currentStatus);
  useEffect(() => setName(currentName), [currentName, userId]);
  useEffect(() => setUsername(currentUsername), [currentUsername, userId]);
  useEffect(() => setBio(currentBio), [currentBio, userId]);
  useEffect(() => setStatus(currentStatus), [currentStatus, userId]);

  /** Throws away unsaved edits and reloads every input from the parent's user object. */
  const resetDrafts = () => {
    const l = latestRef.current;
    setName(l.currentName);
    setUsername(l.currentUsername);
    setBio(l.currentBio);
    setStatus(l.currentStatus);
  };
  // Re-opening the modal (it stays mounted while closed) must show the stored values, not the
  // previous session's leftover drafts.
  useEffect(() => {
    if (active) resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userId]);

  // A save that finishes while the open-time fetch is still in flight must win over that fetch
  const savedAtRef = useRef(0);

  // ---- hydrate the parent from Supabase once per open so both modals show the same thing
  useEffect(() => {
    if (!active || !userId) return;
    let cancelled = false;
    const startedAt = Date.now();
    (async () => {
      const [idn, pro] = await Promise.all([fetchProfileIdentity(userId), fetchProfessionalState(userId)]);
      if (cancelled || savedAtRef.current >= startedAt) return;
      const cur = profileRef.current;
      const patch: Partial<UserProfile> = {};
      // '' is a valid stored name; it also clears a stale "Explorer" left in the store
      if (idn && idn.name !== undefined && idn.name !== cleanDisplayName(cur.name)) patch.name = idn.name;
      if (idn?.username && idn.username !== cur.username) {
        patch.username = idn.username;
        patch.handle = toHandle(idn.username);
      }
      if (idn?.avatarUrl && idn.avatarUrl !== cur.avatar) patch.avatar = idn.avatarUrl;
      if (typeof idn?.bio === 'string' && idn.bio && idn.bio !== cur.bio) patch.bio = idn.bio;
      const curIsPro = cur.is_creator === true || cur.account_type === 'professional';
      if (pro && pro.isCreator !== curIsPro) {
        patch.is_creator = pro.isCreator;
        patch.account_type = pro.isCreator ? 'professional' : 'personal';
        if (pro.since) patch.professional_since = pro.since;
      }
      if (Object.keys(patch).length) onProfileChange?.(patch);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userId]);

  // ---- live username availability
  const [usernameState, setUsernameState] = useState<UsernameState>({ state: 'idle' });
  useEffect(() => {
    const u = normalizeUsername(username);
    if (!userId || u === currentUsername) return setUsernameState({ state: 'idle' });
    const formatError = validateUsernameFormat(u);
    if (formatError) return setUsernameState({ state: 'invalid', message: formatError });
    setUsernameState({ state: 'checking' });
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await checkUsernameAvailable(u, userId);
      if (cancelled) return;
      if (r.error) setUsernameState({ state: 'error', message: r.error });
      else if (r.available) setUsernameState({ state: 'available' });
      else setUsernameState({ state: 'taken', message: 'Username taken' });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username, currentUsername, userId]);

  const dirty =
    name.trim() !== currentName.trim() ||
    normalizeUsername(username) !== currentUsername ||
    bio.trim() !== currentBio.trim() ||
    status !== currentStatus;

  // ---- save identity (writes username + display_name, then updates parent immediately)
  const [saving, setSaving] = useState(false);
  const save = async (): Promise<boolean> => {
    if (!userId) {
      onRequireLogin();
      return false;
    }
    if (usernameState.state === 'taken' || usernameState.state === 'invalid') {
      showToast(usernameState.message || 'Pick a different username.', { type: 'error' });
      return false;
    }
    setSaving(true);
    const patch: Partial<UserProfile> = {};
    const bioChanged = bio.trim() !== currentBio.trim();
    const identityChanged =
      name.trim() !== currentName.trim() || normalizeUsername(username) !== currentUsername || bioChanged;
    let bioFailed = false;

    if (identityChanged) {
      const res = await saveUnifiedProfile(userId, { name, username, ...(bioChanged ? { bio } : {}) });
      if (res.error || !res.username || res.name === undefined) {
        setSaving(false);
        showToast(res.error || 'Could not save profile.', { type: 'error' });
        return false;
      }
      patch.name = res.name;
      patch.username = res.username;
      patch.handle = toHandle(res.username);
      if (bioChanged) {
        if (res.bioSaved === false) bioFailed = true;
        else patch.bio = res.bio;
      }
    }

    if (status !== currentStatus) {
      const r = await saveRelationshipStatus(userId, status);
      if (r.error) {
        setSaving(false);
        if (Object.keys(patch).length) onProfileChange?.(patch);
        showToast(`Relationship status could not be saved: ${r.error}`, { type: 'error' });
        return false;
      }
      patch.relationshipStatus = status;
    }

    setSaving(false);
    savedAtRef.current = Date.now();
    // Dispatch what Supabase returned straight into the app store (the single shared user object)
    if (Object.keys(patch).length) onProfileChange?.(patch);
    showToast(bioFailed ? 'Saved, but your bio could not be stored yet.' : 'Profile saved.', { category: 'profile' });
    return true;
  };

  // ---- avatar
  const [uploading, setUploading] = useState(false);
  const pickAvatar = async (file: File) => {
    if (!userId) return onRequireLogin();
    setUploading(true);
    const res = await uploadAvatar(userId, file);
    setUploading(false);
    if (res.error || !res.url) return showToast(res.error || 'Could not upload photo.', { type: 'error' });
    onProfileChange?.({ avatar: res.url });
    showToast('Profile photo updated.', { category: 'profile' });
  };

  // ---- professional switch (instant, no approval)
  const [optimisticPro, setOptimisticPro] = useState<boolean | null>(null);
  useEffect(() => setOptimisticPro(null), [profileIsPro, userId]);
  const isPro = optimisticPro ?? profileIsPro;
  const [switching, setSwitching] = useState(false);

  const setPro = async (next: boolean) => {
    if (!userId) return onRequireLogin();
    if (switching) return;
    if (!next && !window.confirm('Switch back to a personal account? You can switch again any time.')) return;
    setOptimisticPro(next);
    setSwitching(true);
    const res = await setProfessionalMode(userId, next);
    setSwitching(false);
    if (res.error) {
      setOptimisticPro(null);
      return showToast(res.error, { type: 'error' });
    }
    onProfileChange?.({
      is_creator: next,
      account_type: next ? 'professional' : 'personal',
      professional_since: next ? res.since : undefined,
    });
    showToast(next ? 'You are now a professional account.' : 'Switched back to a personal account.', { category: 'profile' });
  };

  // ---- hub data
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [hubLoading, setHubLoading] = useState(false);
  const [controls, setControls] = useState<HostControls>({ featuredSpots: false, priorityListing: false });
  const [controlBusy, setControlBusy] = useState<keyof HostControls | null>(null);

  useEffect(() => {
    if (!active || !userId || !isPro) return;
    let cancelled = false;
    setHubLoading(true);
    Promise.all([fetchHostAnalytics(userId), fetchHostControls(userId)])
      .then(([a, c]) => {
        if (cancelled) return;
        setAnalytics(a);
        setControls(c);
      })
      .finally(() => !cancelled && setHubLoading(false));
    return () => {
      cancelled = true;
    };
  }, [active, userId, isPro]);

  const toggleControl = async (key: keyof HostControls) => {
    if (!userId) return onRequireLogin();
    const prev = controls;
    const next = { ...controls, [key]: !controls[key] };
    setControls(next);
    setControlBusy(key);
    const res = await saveHostControls(userId, next);
    setControlBusy(null);
    if (res.error) {
      setControls(prev);
      return showToast(res.error, { type: 'error' });
    }
    showToast(next[key] ? 'Turned on.' : 'Turned off.', { category: 'profile' });
  };

  const stats: HostAnalytics = {
    impressions: analytics?.impressions ?? null,
    eventSaves: analytics?.eventSaves ?? null,
    profileViews: analytics?.profileViews ?? statsFallback?.profileViews ?? null,
    rsvps: analytics?.rsvps ?? statsFallback?.joinRequests ?? null,
  };

  return {
    userId,
    handle: currentUsername ? `@${currentUsername}` : toHandle(profile.handle),
    hasUsername: !!currentUsername,
    displayName: currentName,
    avatar: profile.avatar || '',
    name, setName,
    username, setUsername,
    bio, setBio,
    status, setStatus,
    resetDrafts,
    currentStatus,
    usernameState,
    dirty,
    saving,
    save,
    uploading,
    pickAvatar,
    isPro,
    switching,
    setPro,
    stats,
    hubLoading,
    controls,
    controlBusy,
    toggleControl,
    requireLogin: onRequireLogin,
  };
}

export type OwnProfile = ReturnType<typeof useOwnProfile>;

/* ------------------------------------------------------------------ */
/* UI blocks                                                           */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full px-3.5 py-2.5 text-[13px] bg-slate-100 dark:bg-[#121113] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40 dark:focus:ring-[#D17A68]/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400';
const labelCls = 'block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1';

export const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="mx-3 mt-4">
    <div className="px-1 pb-2">
      <h4 className="text-[14px] font-black text-slate-900 dark:text-slate-100">{title}</h4>
      {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
    </div>
    <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-2xl overflow-hidden">
      {children}
    </div>
  </section>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  busy?: boolean;
}> = ({ checked, onChange, label, busy }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={busy}
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer transition-colors motion-reduce:transition-none disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E0533C] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1C1A1E] ${
      checked ? 'bg-[#E0533C] dark:bg-[#A94F3E]' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center transition-transform motion-reduce:transition-none ${
        checked ? 'translate-x-5' : ''
      }`}
    >
      {busy && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
    </span>
  </button>
);

/** Hero avatar with camera upload, public @username and the private display name. */
export const AvatarHero: React.FC<{ p: OwnProfile; subtitle?: React.ReactNode; editable?: boolean }> = ({
  p,
  subtitle,
  editable = true,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center text-center px-4 pt-6 pb-5">
      <div className="relative">
        {p.avatar ? (
          <img
            src={p.avatar}
            alt={p.handle}
            className={`w-24 h-24 rounded-full object-cover shadow-md ${
              p.isPro ? 'ring-2 ring-[#E0533C]/60 ring-offset-2 ring-offset-white dark:ring-offset-[#1C1A1E]' : ''
            }`}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-md">
            <UserIcon className="w-9 h-9 text-slate-400" />
          </div>
        )}
        {p.uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
        {editable && (
          <>
        <button
          type="button"
          onClick={() => (p.userId ? fileRef.current?.click() : p.requireLogin())}
          disabled={p.uploading}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-60"
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) p.pickAvatar(f);
          }}
        />
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 max-w-full">
        <h2 className="text-xl font-black truncate">{p.displayName || (p.userId || p.hasUsername ? p.handle : 'Guest')}</h2>
        <VerifiedBadge status={p.isPro ? 'approved' : 'none'} size="md" />
      </div>
      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1 max-w-full">
        <span className="truncate">{p.handle || '@explorer'}</span>
      </p>
      {subtitle}
    </div>
  );
};

/** Display name, @username (with live availability) and bio. */
export const IdentityFields: React.FC<{ p: OwnProfile; showSave?: boolean; saveLabel?: string }> = ({
  p,
  showSave = false,
  saveLabel = 'Save changes',
}) => {
  const u = p.usernameState;
  const hint =
    u.state === 'checking'
      ? { text: 'Checking…', cls: 'text-slate-400' }
      : u.state === 'available'
      ? { text: 'Available', cls: 'text-emerald-600 dark:text-emerald-400' }
      : u.state === 'taken' || u.state === 'invalid' || u.state === 'error'
      ? { text: u.message || 'Not available', cls: 'text-red-500' }
      : { text: 'Shown to everyone as your public name.', cls: 'text-slate-400' };

  return (
    <div className="p-4 space-y-3.5">
      <div>
        <label className={labelCls} htmlFor="pf-username">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">@</span>
          <input
            id="pf-username"
            type="text"
            value={p.username}
            onChange={(e) =>
              p.setUsername(
                e.target.value.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, USERNAME_MAX)
              )
            }
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            className={`${inputCls} pl-8 pr-9`}
            aria-describedby="pf-username-hint"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {u.state === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {u.state === 'available' && <Check className="w-4 h-4 text-emerald-500" />}
          </span>
        </div>
        <p id="pf-username-hint" className={`mt-1 text-[11px] ${hint.cls}`}>
          {hint.text}
        </p>
      </div>

      <div>
        <label className={labelCls} htmlFor="pf-name">
          Display name
        </label>
        <input
          id="pf-name"
          type="text"
          value={p.name}
          onChange={(e) => p.setName(e.target.value)}
          maxLength={40}
          placeholder="Add a display name (optional)"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Private. Only you can see it.
        </p>
      </div>

      <div>
        <label className={labelCls} htmlFor="pf-bio">
          Bio
        </label>
        <textarea
          id="pf-bio"
          value={p.bio}
          onChange={(e) => p.setBio(e.target.value.slice(0, BIO_MAX))}
          rows={3}
          placeholder="Tell people what you’re into."
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-[11px] text-slate-400 text-right">
          {p.bio.length}/{BIO_MAX}
        </p>
      </div>

      {showSave && (
        <button
          type="button"
          onClick={p.save}
          disabled={!p.dirty || p.saving}
          className="w-full py-3 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {p.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{saveLabel}</span>}
        </button>
      )}
    </div>
  );
};

/** The prominent instant switch. */
export const ProfessionalSwitchCard: React.FC<{ p: OwnProfile }> = ({ p }) => (
  <div className={`p-4 flex items-center gap-3.5 ${p.isPro ? 'bg-[#E0533C]/10 dark:bg-[#A94F3E]/10' : ''}`}>
    <span className="w-11 h-11 rounded-full bg-[#E0533C]/10 dark:bg-[#A94F3E]/10 flex items-center justify-center shrink-0">
      <VerifiedBadge status="approved" size="lg" />
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-black leading-tight">
        {p.isPro ? 'Professional account' : 'Switch to Professional Account'}
      </p>
      <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">
        {p.isPro
          ? 'Active. Your RADA host badge is live.'
          : 'Get the RADA host badge, analytics and priority listing. It switches on instantly, no approval needed.'}
      </p>
    </div>
    <Toggle
      checked={p.isPro}
      onChange={() => p.setPro(!p.isPro)}
      busy={p.switching}
      label="Switch to professional account"
    />
  </div>
);

/** Relationship status, edited here and saved with the rest of the profile. */
export const RelationshipStatusField: React.FC<{ p: OwnProfile }> = ({ p }) => (
  <div className="p-4">
    <div role="radiogroup" aria-label="Relationship status" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#121113]">
      {(
        [
          ['single', 'Single'],
          ['not_single', 'Not single'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={p.status === value}
          onClick={() => p.setStatus(value)}
          className={`py-2 rounded-lg text-[13px] font-bold transition cursor-pointer motion-reduce:transition-none ${
            p.status === value
              ? 'bg-white dark:bg-[#1C1A1E] shadow-sm text-[#E0533C] dark:text-[#D17A68]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
      {p.status === 'single'
        ? 'People can send you hangout and match requests.'
        : 'Match requests are turned off for your profile.'}
    </p>
  </div>
);

const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString());

/** Unlocked once the account is professional. */
export const ProfessionalHub: React.FC<{ p: OwnProfile }> = ({ p }) => {
  const s = p.stats;
  const noData = s.impressions === null && s.eventSaves === null && s.profileViews === null && s.rsvps === null;
  const statCards: [string, number | null, React.ReactNode][] = [
    ['Total impressions', s.impressions, <BarChart3 key="i" className="w-4 h-4" />],
    ['Event saves', s.eventSaves, <Bookmark key="s" className="w-4 h-4" />],
    ['Profile views', s.profileViews, <Eye key="v" className="w-4 h-4" />],
    ['RSVPs', s.rsvps, <Users key="r" className="w-4 h-4" />],
  ];

  return (
    <div className="border-t border-slate-100 dark:border-slate-800/80">
      <div className="px-4 pt-4">
        <h5 className="text-[13px] font-black">Professional tools & insights</h5>
      </div>

      {/* Host benefits & badges */}
      <div className="px-4 pt-3">
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">Host benefits & badges</p>
        <div className="rounded-xl bg-[#E0533C]/10 dark:bg-[#A94F3E]/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <VerifiedBadge status="approved" size="lg" />
            <span className="text-[13px] font-bold">Verified host</span>
          </div>
          {[
            'RADA host badge on your profile and every outing you host',
            'Outing analytics in this hub',
            'Featured spots and priority listing controls',
          ].map((t) => (
            <p key={t} className="text-[12px] text-slate-700 dark:text-slate-200 flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68] mt-0.5 shrink-0" />
              <span>{t}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Outing analytics */}
      <div className="px-4 pt-4">
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">Outing analytics</p>
        <div className="grid grid-cols-2 gap-2">
          {statCards.map(([label, n, icon]) => (
            <div
              key={label}
              className="rounded-xl bg-slate-100 dark:bg-[#121113] p-3"
            >
              <div className="flex items-center gap-1.5 text-[#E0533C] dark:text-[#D17A68]">{icon}</div>
              {p.hubLoading ? (
                <div className="mt-2 h-6 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse motion-reduce:animate-none" />
              ) : (
                <p className="mt-1.5 text-xl font-black leading-none">{fmt(n)}</p>
              )}
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
        {!p.hubLoading && noData && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            No activity yet. Numbers appear as people see your profile, save your events and RSVP to your outings.
          </p>
        )}
      </div>

      {/* Advanced host controls */}
      <div className="px-4 pt-4 pb-4">
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Advanced host controls</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {(
            [
              ['featuredSpots', 'Featured outing spots', 'Highlight the spots you host at.', <Star key="f" className="w-4 h-4" />],
              ['priorityListing', 'Priority event listing', 'Show your outings higher in listings.', <Zap key="z" className="w-4 h-4" />],
            ] as [keyof HostControls, string, string, React.ReactNode][]
          ).map(([key, title, desc, icon]) => (
            <div key={key} className="py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#E0533C]/10 dark:bg-[#A94F3E]/10 text-[#E0533C] dark:text-[#D17A68] flex items-center justify-center shrink-0">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
              <Toggle
                checked={p.controls[key]}
                onChange={() => p.toggleControl(key)}
                busy={p.controlBusy === key}
                label={title}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Everything for the Professional / Host dashboard view. */
export const ProfessionalDashboard: React.FC<{ p: OwnProfile }> = ({ p }) => (
  <>
    <Section title="Professional account" description="Switch on instantly. No approval needed.">
      <ProfessionalSwitchCard p={p} />
      {p.isPro ? (
        <ProfessionalHub p={p} />
      ) : (
        <div className="px-4 pb-4 pt-1 space-y-2">
          <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">What you unlock</p>
          {[
            'RADA host badge on your profile and outings',
            'Outing analytics: impressions, saves, views and RSVPs',
            'Featured outing spots and priority event listing',
          ].map((t) => (
            <p key={t} className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
              <span>{t}</span>
            </p>
          ))}
        </div>
      )}
    </Section>
  </>
);
