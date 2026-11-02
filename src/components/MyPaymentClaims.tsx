import React, { useEffect, useState } from 'react';
import { listMyClaims, type ManualClaim } from '../lib/manualPayments';

const TONE: Record<ManualClaim['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};
const LABEL: Record<ManualClaim['status'], string> = { pending: 'Waiting for confirmation', approved: 'Approved', rejected: 'Rejected' };

/** The signed-in user's recent M-Pesa payment codes and their status. Renders nothing when there are none. */
export const MyPaymentClaims: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [rows, setRows] = useState<ManualClaim[]>([]);
  useEffect(() => { listMyClaims().then(setRows).catch(() => setRows([])); }, [refreshKey]);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 shadow-sm space-y-3">
      <h3 className="text-[15px] font-black">My payments</h3>
      {rows.map(c => (
        <div key={c.id} className="flex items-start justify-between gap-3 text-[12px]">
          <div className="min-w-0">
            <p className="font-bold text-slate-800 dark:text-slate-100">KES {c.amount_kes.toLocaleString('en-KE')} · {c.kind === 'promotion' ? 'Boost' : c.plan}</p>
            <p className="font-mono text-slate-500">{c.mpesa_code} · {new Date(c.created_at).toLocaleDateString('en-KE')}</p>
            {c.status === 'rejected' && c.admin_note && <p className="text-red-600 mt-0.5">{c.admin_note}</p>}
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${TONE[c.status]}`}>{LABEL[c.status]}</span>
        </div>
      ))}
    </div>
  );
};

export default MyPaymentClaims;
