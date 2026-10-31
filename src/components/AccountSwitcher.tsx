import React, { useEffect, useState } from 'react';
import { Check, Plus, X, Users } from 'lucide-react';
import { forgetAccount, listAccounts, switchToAccount, type SavedAccount } from '../lib/accounts';

interface Props {
  currentUserId?: string;
  onAddAccount: () => void;
  showToast: (msg: string, options?: any) => void;
}

/** List of accounts signed in on this device, with one-tap switching and "Add account". */
export const AccountSwitcher: React.FC<Props> = ({ currentUserId, onAddAccount, showToast }) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => listAccounts());
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { setAccounts(listAccounts()); }, [currentUserId]);

  const doSwitch = async (id: string) => {
    if (id === currentUserId || busy) return;
    setBusy(id);
    const err = await switchToAccount(id);
    if (err) {
      showToast(err, { type: 'error' });
      setAccounts(listAccounts());
      setBusy(null);
      return;
    }
    window.location.reload(); // fresh start so nothing from the other account lingers
  };

  const remove = (id: string) => {
    forgetAccount(id);
    setAccounts(listAccounts());
  };

  return (
    <div className="mx-3 mt-6 bg-white dark:bg-[#1C1A1E] rounded-2xl shadow-sm p-3">
      <div className="flex items-center gap-2 px-1 pb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Users className="w-3.5 h-3.5" /> Accounts on this device
      </div>
      {accounts.map((a) => {
        const active = a.id === currentUserId;
        return (
          <div key={a.id} className="flex items-center gap-3 py-2">
            <button type="button" onClick={() => doSwitch(a.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
              {a.avatar ? (
                <img src={a.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#E0533C] text-white font-black flex items-center justify-center shrink-0">
                  {(a.name || a.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-black truncate">{a.name || a.email.split('@')[0]}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{a.email}</div>
              </div>
            </button>
            {active ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" aria-label="Current account" />
            ) : (
              <button type="button" onClick={() => remove(a.id)} className="p-1 text-slate-400 hover:text-red-500 cursor-pointer" aria-label={`Remove ${a.email} from this device`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={onAddAccount} className="w-full mt-1 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer">
        <Plus className="w-4 h-4" /> Add account
      </button>
    </div>
  );
};
