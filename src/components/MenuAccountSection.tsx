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

  const input =
    'w-full pl-9 pr-9 py-2 text-xs bg-slate-100 dark:bg-[#121113] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]/40 text-slate-900 dark:text-slate-100';

  return (
    <div className="border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-1">
      <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Account & security</p>

      <div className="px-4 py-2 flex items-center gap-3 text-xs">
        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Email (private)</p>
          <p className="text-[10px] text-slate-500 truncate">{email || '…'}</p>
        </div>
      </div>
      <div className="px-4 py-2 flex items-center gap-3 text-xs">
        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Sign-in method</p>
          <p className="text-[10px] text-slate-500 truncate">{providerName}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!canChangePassword) { showToast?.(`Your password is managed by ${providerName}.`, { type: 'error' } as any); return; }
          setPwOpen((o) => !o);
        }}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
      >
        <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200">Change password</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${pwOpen ? 'rotate-180' : ''}`} />
      </button>
      {pwOpen && (
        <form onSubmit={updatePassword} className="px-4 pb-3 space-y-2">
          {err && <p className="text-[11px] text-red-500 font-medium">{err}</p>}
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" className={input} />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-2 text-slate-400" aria-label="Show or hide password">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={input} />
          </div>
          <button type="submit" disabled={busy || !pw} className="w-full py-2 bg-[#E0533C] disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
          </button>
        </form>
      )}

      {userId && showToast && (
        <div className="px-1">
          <AccountSwitcher
            currentUserId={userId}
            showToast={showToast}
            onAddAccount={() => { onDone(); onOpenAuth?.(); }}
          />
        </div>
      )}

      <div className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => setLegalDoc('terms')} className="underline cursor-pointer">Terms</button>
        <button type="button" onClick={() => setLegalDoc('privacy')} className="underline cursor-pointer">Privacy</button>
        <button type="button" onClick={() => setLegalDoc('guidelines')} className="underline cursor-pointer">Guidelines</button>
        <button type="button" onClick={() => setLegalDoc('merchant')} className="underline cursor-pointer">Merchant Terms</button>
        <span className="opacity-70">v{LEGAL_VERSION}</span>
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={() => { onDone(); onLogout(); }}
          className="w-full px-4 py-2.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-3 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-800/80 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      )}

      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
};
