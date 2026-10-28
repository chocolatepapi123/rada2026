import React, { useEffect, useState } from 'react';
import { AtSign, Check, Loader2, X } from 'lucide-react';
import { checkUsernameAvailable, updateUsername } from '../lib/cloudSync';

interface ClaimUsernamePromptProps {
  uid: string;
  currentUsername: string;
  onClaimed: (username: string) => void;
  onDismiss: () => void;
}

/** True while the account still has the auto-generated name (new_user_42). */
export const hasAutoUsername = (username?: string) => /^new_user_\d+$/i.test((username || '').trim().replace(/^@/, ''));

export const ClaimUsernamePrompt: React.FC<ClaimUsernamePromptProps> = ({ uid, currentUsername, onClaimed, onDismiss }) => {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = value.trim().replace(/^@/, '').toLowerCase();
    if (!v) { setStatus('idle'); setMsg(''); return; }
    setStatus('checking');
    const t = setTimeout(async () => {
      const res = await checkUsernameAvailable(v, uid);
      if (res.available) { setStatus('ok'); setMsg('Available'); }
      else { setStatus('bad'); setMsg(res.error || 'Username taken'); }
    }, 350);
    return () => clearTimeout(t);
  }, [value, uid]);

  async function claim() {
    setSaving(true);
    const res = await updateUsername(uid, value);
    setSaving(false);
    if (res.error) { setStatus('bad'); setMsg(res.error); return; }
    onClaimed(res.username || value.trim().replace(/^@/, '').toLowerCase());
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Claim your username">
      <div className="w-full sm:max-w-sm bg-white dark:bg-[#161316] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black">Claim your @username</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              You are <b>@{currentUsername.replace(/^@/, '')}</b> for now. Pick the name people will find you by. It is yours once you save it.
            </p>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Not now" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F0D10] border border-slate-200 dark:border-slate-800 focus-within:border-[#E0533C]">
          <AtSign className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20))}
            placeholder="yourname"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
          />
          {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          {status === 'ok' && <Check className="w-4 h-4 text-emerald-500" />}
        </div>
        <p className={`mt-1.5 text-[11px] font-semibold min-h-[16px] ${status === 'bad' ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>
        <button
          type="button"
          onClick={claim}
          disabled={saving || status !== 'ok'}
          className="w-full mt-2 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Claim @{value || 'username'}</span>
        </button>
        <button type="button" onClick={onDismiss} className="w-full mt-1.5 py-2 text-[11px] font-bold text-slate-500 cursor-pointer">Not now</button>
      </div>
    </div>
  );
};
