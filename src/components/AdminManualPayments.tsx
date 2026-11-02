import React, { useCallback, useEffect, useState } from 'react';
import { decideClaim, listPendingClaims, type ManualClaim } from '../lib/manualPayments';

/** Admin list of M-Pesa codes waiting for approval. Put it in the admin screen (e.g. a "Payments" tab). */
export const AdminManualPayments: React.FC<{ showToast?: (msg: string, options?: any) => void }> = ({ showToast }) => {
  const [rows, setRows] = useState<ManualClaim[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(() => { listPendingClaims().then(setRows); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (c: ManualClaim, approve: boolean) => {
    if (approve && !window.confirm(`Approve KES ${c.amount_kes} (code ${c.mpesa_code})?\nCheck that your M-Pesa SMS shows this code and amount.`)) return;
    const note = approve ? undefined : (window.prompt('Reason to show the user (optional)') ?? undefined);
    setBusyId(c.id);
    const err = await decideClaim(c.id, approve, note);
    setBusyId(null);
    if (err) showToast?.(err, { type: 'error' }); else { showToast?.(approve ? 'Approved' : 'Rejected'); load(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">M-Pesa payments to approve ({rows.length})</h3>
        <button type="button" onClick={load} className="text-[11px] font-bold text-[#E0533C]">Refresh</button>
      </div>
      {rows.length === 0 && <p className="text-xs text-slate-400">Nothing waiting.</p>}
      {rows.map(c => (
        <div key={c.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">KES {c.amount_kes.toLocaleString('en-KE')}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">{c.kind} • {c.plan}</span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{c.mpesa_code}</p>
          <p className="text-[11px] text-slate-500">From {c.sender_phone} • {new Date(c.created_at).toLocaleString('en-KE')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busyId === c.id} onClick={() => act(c, true)} className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">Approve</button>
            <button type="button" disabled={busyId === c.id} onClick={() => act(c, false)} className="py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-black disabled:opacity-50">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminManualPayments;
