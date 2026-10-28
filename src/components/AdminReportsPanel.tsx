import React, { useCallback, useEffect, useState } from 'react';
import { Ban, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { setUserSuspension } from '../lib/cloudSync';
import { REPORT_REASONS } from '../lib/safety';
import type { ToastOptions } from './Toast.tsx';

type Status = 'open' | 'reviewing' | 'actioned' | 'dismissed';

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  context: string;
  reason: string;
  details: string | null;
  status: Status;
  created_at: string;
  reporter_username?: string;
  reported_username?: string;
  reported_suspended?: boolean;
}

const FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
];

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label || id;

export const AdminReportsPanel: React.FC<{ toast: (m: string, options?: ToastOptions) => void }> = ({ toast }) => {
  const [filter, setFilter] = useState<Status | 'all'>('open');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('user_reports').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) {
      toast('Could not load reports.', { type: 'error' });
      setLoading(false);
      return;
    }
    const list = (data || []) as ReportRow[];
    const ids = Array.from(new Set(list.flatMap((r) => [r.reporter_id, r.reported_id])));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username, is_suspended').in('id', ids);
      const map = new Map<string, any>((profs || []).map((p: any) => [p.id, p]));
      list.forEach((r) => {
        r.reporter_username = map.get(r.reporter_id)?.username;
        r.reported_username = map.get(r.reported_id)?.username;
        r.reported_suspended = Boolean(map.get(r.reported_id)?.is_suspended);
      });
    }
    setRows(list);
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(r: ReportRow, status: Status) {
    setBusyId(r.id);
    const { error } = await supabase
      .from('user_reports')
      .update({ status, resolved_at: status === 'actioned' || status === 'dismissed' ? new Date().toISOString() : null })
      .eq('id', r.id);
    setBusyId(null);
    if (error) return toast('Could not update the report.', { type: 'error' });
    toast(`Report marked ${status}.`);
    load();
  }

  async function suspend(r: ReportRow) {
    setBusyId(r.id);
    const err = await setUserSuspension(r.reported_id, true, `Report: ${reasonLabel(r.reason)}`);
    if (err) {
      setBusyId(null);
      return toast(err, { type: 'error' });
    }
    await setStatus(r, 'actioned');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                filter === f.id ? 'bg-[#E0533C] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">No reports here.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151319] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black truncate">
                  @{r.reported_username || r.reported_id.slice(0, 8)}
                  {r.reported_suspended && <span className="ml-1.5 text-[10px] text-red-600">(suspended)</span>}
                </p>
                <p className="text-[10px] text-slate-500">
                  reported by @{r.reporter_username || r.reporter_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">{r.status}</span>
            </div>
            <p className="text-xs font-bold text-[#E0533C]">{reasonLabel(r.reason)} <span className="text-slate-400 font-medium">· {r.context}</span></p>
            {r.details && <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.details}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {busyId === r.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <>
                  {r.status === 'open' && (
                    <button type="button" onClick={() => setStatus(r, 'reviewing')} className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer">Start review</button>
                  )}
                  {!r.reported_suspended && (r.status === 'open' || r.status === 'reviewing') && (
                    <button type="button" onClick={() => suspend(r)} className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 cursor-pointer">
                      <Ban className="w-3 h-3" /> Suspend user
                    </button>
                  )}
                  {(r.status === 'open' || r.status === 'reviewing') && (
                    <>
                      <button type="button" onClick={() => setStatus(r, 'actioned')} className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer">
                        <Check className="w-3 h-3" /> Actioned
                      </button>
                      <button type="button" onClick={() => setStatus(r, 'dismissed')} className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-200 dark:bg-slate-700 flex items-center gap-1 cursor-pointer">
                        <X className="w-3 h-3" /> Dismiss
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
