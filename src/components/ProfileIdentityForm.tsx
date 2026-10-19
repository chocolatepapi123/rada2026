import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AtSign, Check, Loader2, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '../types';
import {
  NAME_MAX,
  USERNAME_MAX,
  checkUsernameAvailable,
  fetchProfileIdentity,
  normalizeUsername,
  readCachedIdentity,
  saveProfileDetails,
  validateUsernameFormat,
} from '../lib/cloudSync';

interface ProfileIdentityFormProps {
  /** Supabase user id. Without it the form is read-only and asks the user to sign in. */
  userId?: string;
  /** Current global values (the app's profile state). */
  name: string;
  username: string; // without "@"
  handle: string; // "@username", used to roll back on a failed save
  showToast: (msg: string) => void;
  onRequireLogin?: () => void;
  /** Fired immediately on save (optimistic), on rollback, and when fresher data is loaded from Supabase. */
  onChange?: (patch: Partial<UserProfile>) => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

const inputCls =
  'w-full px-3.5 py-2.5 text-[13px] bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-60';
const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1';

export const ProfileIdentityForm: React.FC<ProfileIdentityFormProps> = ({
  userId,
  name,
  username,
  handle,
  showToast,
  onRequireLogin,
  onChange,
}) => {
  const savedName = (name || '').trim();
  const savedUsername = normalizeUsername(username || handle || '');

  const [nameInput, setNameInput] = useState(savedName);
  const [usernameInput, setUsernameInput] = useState(savedUsername);
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Parent -> form: whenever the global profile changes, show the new saved values
  useEffect(() => {
    setNameInput(savedName);
  }, [savedName]);
  useEffect(() => {
    setUsernameInput(savedUsername);
  }, [savedUsername]);

  // On mount: heal global state from the local cache, then from Supabase, so edits stick after reopening
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const apply = (id: { name?: string; username?: string } | null) => {
      if (!id || cancelled) return;
      const patch: Partial<UserProfile> = {};
      if (id.name && id.name !== savedName) patch.name = id.name;
      if (id.username && id.username !== savedUsername) {
        patch.username = id.username;
        patch.handle = `@${id.username}`;
      }
      if (Object.keys(patch).length) onChangeRef.current?.(patch);
    };
    apply(readCachedIdentity(userId));
    fetchProfileIdentity(userId).then(apply);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Live username availability (debounced, stale responses ignored)
  useEffect(() => {
    const value = normalizeUsername(usernameInput);
    if (value === savedUsername) {
      setStatus('idle');
      setStatusMsg('');
      return;
    }
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setStatus('invalid');
      setStatusMsg(formatError);
      return;
    }
    setStatus('checking');
    setStatusMsg('Checking…');
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailable(value, userId);
      if (mine !== seq.current) return;
      if (res.error) {
        setStatus('error');
        setStatusMsg(res.error);
      } else if (res.available) {
        setStatus('available');
        setStatusMsg('Available');
      } else {
        setStatus('taken');
        setStatusMsg('Username taken');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [usernameInput, savedUsername, userId]);

  const trimmedName = nameInput.trim();
  const nameChanged = trimmedName !== savedName;
  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  const usernameChanged = normalizeUsername(usernameInput) !== savedUsername;

  const canSave =
    !!userId &&
    !saving &&
    (nameChanged || usernameChanged) &&
    (!nameChanged || nameValid) &&
    (!usernameChanged || status === 'available');

  const handleSave = async () => {
    if (!userId) return onRequireLogin?.();
    if (!canSave) return;

    const nextUsername = normalizeUsername(usernameInput);
    const patch: Partial<UserProfile> = {};
    const rollback: Partial<UserProfile> = {};
    if (nameChanged) {
      patch.name = trimmedName;
      rollback.name = savedName;
    }
    if (usernameChanged) {
      patch.username = nextUsername;
      patch.handle = `@${nextUsername}`;
      rollback.username = savedUsername;
      rollback.handle = handle;
    }

    // 1) Update the app's global profile state right away
    onChange?.(patch);

    // 2) Persist to Supabase `profiles`; roll back the app state if it fails
    setSaving(true);
    const res = await saveProfileDetails(userId, {
      ...(nameChanged ? { name: trimmedName } : {}),
      ...(usernameChanged ? { username: nextUsername } : {}),
    });
    setSaving(false);

    if (res.error) {
      onChange?.(rollback);
      if (res.error === 'Username taken') {
        setStatus('taken');
        setStatusMsg('Username taken');
      }
      showToast(res.error);
      return;
    }
    showToast(usernameChanged ? `Saved. You are now @${nextUsername}` : 'Display name saved.');
  };

  const bad = status === 'taken' || status === 'invalid' || status === 'error';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls} htmlFor="profile-display-name">
          Display name <span className="font-normal text-slate-400">(private, only you see it)</span>
        </label>
        <div className="relative">
          <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="profile-display-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={NAME_MAX}
            disabled={!userId || saving}
            placeholder="Your name"
            autoComplete="name"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="profile-username">
          Public @username
        </label>
        <div className="relative">
          <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="profile-username"
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(normalizeUsername(e.target.value))}
            maxLength={USERNAME_MAX}
            disabled={!userId || saving}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="wayne_dev"
            className={`${inputCls} pl-9 pr-10 ${bad ? '!border-red-500' : status === 'available' ? '!border-emerald-500' : ''}`}
          />
          <span className="absolute right-3 top-3">
            {status === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {status === 'available' && <Check className="w-4 h-4 text-emerald-500" />}
            {bad && <AlertCircle className="w-4 h-4 text-red-500" />}
          </span>
        </div>
        <p
          className={`mt-1 text-[11px] min-h-[16px] font-semibold ${
            status === 'available'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'checking'
              ? 'text-slate-400'
              : status === 'idle'
              ? 'text-slate-400 font-normal'
              : 'text-red-500'
          }`}
          aria-live="polite"
        >
          {status === 'available' && '✓ '}
          {statusMsg || `3–${USERNAME_MAX} characters: lowercase letters, numbers, _ and -`}
        </p>
      </div>

      <button
        type="button"
        onClick={userId ? handleSave : onRequireLogin}
        disabled={userId ? !canSave : false}
        className="w-full py-2.5 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-[13px] transition flex items-center justify-center gap-2 cursor-pointer"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{userId ? 'Save changes' : 'Sign in to edit'}</span>}
      </button>
    </div>
  );
};
