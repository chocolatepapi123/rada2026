import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchAdminChecklist, setChecklistDone, type ChecklistItem } from '../lib/adminChecklist';
import type { ToastOptions } from './Toast.tsx';

interface Props {
  toast: (msg: string, options?: ToastOptions) => void;
}

const SEV: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const AdminLaunchChecklistPanel: React.FC<Props> = ({ toast }) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchAdminChecklist());
    } catch (e: any) {
      setError(e?.message || 'Could not load the checklist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (it: ChecklistItem) => {
    setBusy(it.key);
    try {
      await setChecklistDone(it.key, !it.done);
      setItems((cur) => cur.map((x) => (x.key === it.key ? { ...x, done: !it.done, done_at: !it.done ? new Date().toISOString() : null } : x)));
    } catch (e: any) {
      toast(e?.message || 'Could not save that tick.', { type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const left = items.filter((i) => !i.done).length;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black">Launch cleanup</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Jobs only you can do in the Supabase dashboard. {items.length ? `${left} left.` : ''}
          </p>
        </div>
        <button type="button" onClick={load} aria-label="Refresh" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading && !items.length ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key} className={`p-3 rounded-2xl border ${it.done ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1A1E]'}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={it.done}
                  aria-label={`Mark "${it.title}" ${it.done ? 'not done' : 'done'}`}
                  disabled={busy === it.key}
                  onClick={() => toggle(it)}
                  className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 ${it.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  {busy === it.key ? <Loader2 className="w-3 h-3 animate-spin" /> : it.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs font-black ${it.done ? 'line-through opacity-60' : ''}`}>{it.title}</p>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${SEV[it.severity] || SEV.low}`}>{it.severity}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{it.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminLaunchChecklistPanel;
