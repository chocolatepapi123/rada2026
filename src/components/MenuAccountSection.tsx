import React, { useEffect, useState } from 'react';
import { Mail, Globe, KeyRound, Lock, Eye, EyeOff, Loader2, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AccountSwitcher } from './AccountSwitcher';
import { LegalModal, LEGAL_VERSION, type LegalDoc } from './LegalModal';
import type { ToastOptions } from './Toast.tsx';

interface Props {
  userId?: string | null;
  showToast?: (msg: string, options?: ToastOptions) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  /** Closes the 3-dot menu. */
  onDone: () => void;
}

/** The account & security settings, shown inside the home 3-dot menu (replaces the old Account & Security window). */
export const MenuAccountSection: React.FC<Props> = ({ userId, showToast, onOpenAuth, onLogout, onDone }) => {
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('email');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  useEffect(() => {
    let off = false;
    supabase.auth.getUser().then(({ data }) => {
      if (off || !data?.user) return;
      const u: any = data.user;
      setEmail(u.email || '');
      setProvider(u.app_metadata?.provider || u.identities?.[0]?.provider || 'email');
    });
    return () => { off = true; };
  }, [userId]);

  const providerName = provider === 'google' ? 'Google' : provider === 'email' ? 'Email & password' : provider;
  const canChangePassword = provider === 'email';

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      showToast?.('Password updated successfully!', { category: 'profile' } as any);
      setPw(''); setPw2(''); setPwOpen(false);
    } catch (ex: any) {
      setErr(ex?.message || 'Could not update password. Please sign in again and retry.');
    } finally {
      setBusy(false);
    }
  };

  // Same look as the main 3-dot menu (see Header.tsx).
  const GROUP =
    'rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 divide-y divide-slate-200/70 dark:divide-white/5';
  const TILE = 'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300';
  const TITLE = 'block text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100';
  const SUB = 'block text-[11px] font-normal leading-snug text-slate-500 dark:text-slate-400 mt-px truncate';
  const input =
    'w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-[#121113] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="p-2 space-y-1.5">
      <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Account &amp; security</p>

      <div className={GROUP}>
        <div className="flex items-center gap-3 px-3 py-2.5 min-h-[46px]">
          <span className={TILE}><Mail className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className={TITLE}>Email (private)</span>
            <span className={SUB}>{email || '…'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 min-h-[46px]">
          <span className={TILE}><Globe className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className={TITLE}>Sign-in method</span>
            <span className={SUB}>{providerName}</span>
          </span>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              if (!canChangePassword) { showToast?.(`Your password is managed by ${providerName}.`, { type: 'error' } as any); return; }
              setPwOpen((o) => !o);
            }}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[46px] transition cursor-pointer focus:outline-none hover:bg-white dark:hover:bg-white/[0.06] active:bg-slate-100 dark:active:bg-white/10"
          >
            <span className={TILE}><KeyRound className="w-4 h-4" /></span>
            <span className="flex-1 min-w-0">
              <span className={TITLE}>Change password</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 transition-transform ${pwOpen ? 'rotate-180' : ''}`} />
          </button>
          {pwOpen && (
            <form onSubmit={updatePassword} className="px-3 pb-3 space-y-2">
              {err && <p className="text-xs text-red-500 font-medium px-1">{err}</p>}
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" className={input} />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5" aria-label="Show or hide password">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={input} />
              </div>
              <button type="submit" disabled={busy || !pw} className="w-full py-2.5 bg-[#E0533C] disabled:opacity-50 text-white text-[13px] font-extrabold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition cursor-pointer">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>

      {userId && showToast && (
        <div className="-mx-2 px-1">
          <AccountSwitcher
            currentUserId={userId}
            showToast={showToast}
            onAddAccount={() => { onDone(); onOpenAuth?.(); }}
          />
        </div>
      )}

      <div className="px-1 flex flex-wrap items-center gap-2">
        {([
          ['terms', 'Terms'],
          ['privacy', 'Privacy'],
          ['guidelines', 'Guidelines'],
          ['merchant', 'Merchant Terms'],
        ] as [LegalDoc, string][]).map(([doc, label]) => (
          <button
            key={doc}
            type="button"
            onClick={() => setLegalDoc(doc)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition cursor-pointer"
          >
            {label}
          </button>
        ))}
        <span className="text-[11px] font-semibold text-slate-400 px-1">v{LEGAL_VERSION}</span>
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={() => { onDone(); onLogout(); }}
          className="w-full rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 text-red-600 dark:text-red-400 text-[13px] font-extrabold py-2.5 flex items-center justify-center gap-2 hover:bg-red-100/70 dark:hover:bg-red-950/50 active:scale-[0.98] transition cursor-pointer focus:outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      )}

      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
};
