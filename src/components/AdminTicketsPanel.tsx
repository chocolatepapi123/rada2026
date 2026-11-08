import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  adminMarkPayoutsPaid, adminMarkRefunded, adminRetryPayout, adminSetPaidTickets, adminTicketOverview,
  type AdminTicketOverview,
} from '../lib/tickets';
import type { ToastOptions } from './Toast.tsx';

const kes = (n: number) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

/** Ticket money for admins: switch paid tickets on, refunds to send, payouts that need a person. */
export const AdminTicketsPanel: React.FC<{ toast: (m: string, o?: ToastOptions) => void }> = ({ toast }) => {
  const [data, setData] = useState<AdminTicketOverview | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setErr('');
    try { setData(await adminTicketOverview()); } catch (e: any) { setErr(e?.message || 'Could not load.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); await load(); }
    catch (e: any) { toast(e?.message || 'Something went wrong', { type: 'error' }); }
    finally { setBusy(null); }
  };

  if (!data && !err) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return null;

  const input = 'flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm';
  const btn = 'px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold">Ticket money</h3>
        <button onClick={load} aria-label="Refresh" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 p-3">
        <span>
          <span className="font-bold text-sm block">Paid tickets</span>
          <span className="text-[11px] text-slate-500">Turn on only after the M-Pesa keys are added and a KES 50 test works.</span>
        </span>
        <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={data.paid_enabled} disabled={busy === 'paid'}
          onChange={(e) => act('paid', () => adminSetPaidTickets(e.target.checked), e.target.checked ? 'Paid tickets are on' : 'Paid tickets are off')} />
      </label>

      <section className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Refunds to send ({data.refunds.length})</h4>
        {!data.refunds.length && <p className="text-sm text-slate-500">Nothing to refund.</p>}
        {data.refunds.map((r) => (
          <div key={r.order_id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <p className="font-bold text-sm truncate">{r.buyer}</p>
              <p className="font-extrabold text-sm shrink-0">{kes(r.amount_kes)}</p>
            </div>
            <p className="text-xs text-slate-500">Pay back to {r.phone || 'unknown number'}{r.email ? ` · ${r.email}` : ''}</p>
            {r.reason && <p className="text-[11px] text-slate-500 break-words">{r.reason}</p>}
            <div className="flex gap-2">
              <input className={input} placeholder="M-Pesa refund reference" value={refs[r.order_id] || ''} onChange={(e) => setRefs({ ...refs, [r.order_id]: e.target.value })} />
              <button className={btn} disabled={busy === r.order_id} onClick={() => act(r.order_id, () => adminMarkRefunded(r.order_id, refs[r.order_id] || ''), 'Refund recorded and buyer told')}>Mark sent</button>
            </div>
          </div>
        ))}
        {!!data.refunds.length && <p className="text-[11px] text-slate-500">Send the money back from the M-Pesa portal (Reversal or Send Money), then paste its reference here.</p>}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Payouts that need a person ({data.payouts_failed.length})</h4>
        {!data.payouts_failed.length && <p className="text-sm text-slate-500">All automatic payouts are fine.</p>}
        {data.payouts_failed.map((p) => (
          <div key={p.order_id} className="rounded-2xl border border-amber-300 dark:border-amber-700 p-3 space-y-2">
            <div className="flex justify-between"><p className="text-sm font-bold">{kes(p.net_kes)} to {p.phone || 'no number'}</p><p className="text-[11px] text-slate-500">{p.attempts} tries</p></div>
            {p.error && <p className="text-[11px] text-slate-600 dark:text-slate-300">{p.error}</p>}
            <p className="text-[11px] text-slate-500">Check the M-Pesa statement first. Retry only if the money did not leave.</p>
            <button className={btn + ' py-2'} disabled={busy === p.order_id} onClick={() => act(p.order_id, () => adminRetryPayout(p.order_id), 'Payout queued again')}>Retry payout</button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Waiting to be paid out ({data.payouts_due.length})</h4>
        {!data.payouts_due.length && <p className="text-sm text-slate-500">Nothing waiting.</p>}
        {data.payouts_due.map((d) => (
          <div key={d.owner_id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
            <div className="flex justify-between gap-2"><p className="font-bold text-sm truncate">{d.name || d.email}</p><p className="font-extrabold text-sm shrink-0">{kes(d.net_due_kes)}</p></div>
            <p className="text-[11px] text-slate-500">{d.orders} sales · RADA commission {kes(d.commission_kes)}</p>
            <div className="flex gap-2">
              <input className={input} placeholder="Reference, if you paid by hand" value={refs[d.owner_id] || ''} onChange={(e) => setRefs({ ...refs, [d.owner_id]: e.target.value })} />
              <button className={btn} disabled={busy === d.owner_id} onClick={() => act(d.owner_id, () => adminMarkPayoutsPaid(d.owner_id, refs[d.owner_id] || ''), 'Marked as paid')}>Paid by hand</button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-slate-500">Automatic payouts clear these within minutes. Only use "Paid by hand" if you sent the money yourself.</p>
      </section>
    </div>
  );
};

export default AdminTicketsPanel;
