import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, X } from 'lucide-react';
import {
  STATUS_LABEL, adminConfirmPayment, adminFetchAllProducts, adminListPromotions, adminReorderPromotions,
  adminReviewPromotion, adminSetAutoApprove, priceLabel,
  type AdminPromotion, type PromoProduct,
} from '../lib/promotions';
import type { ToastOptions } from './Toast.tsx';

type Filter = 'requested' | 'live' | 'all';
const LIVE = ['approved', 'pending_payment', 'scheduled', 'active'];
const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const AdminPromotionsPanel: React.FC<{ toast: (m: string, options?: ToastOptions) => void }> = ({ toast }) => {
  const [rows, setRows] = useState<AdminPromotion[]>([]);
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [filter, setFilter] = useState<Filter>('requested');
  const [loading, setLoading] = useState(true);
  const [orderInput, setOrderInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([adminListPromotions(null), adminFetchAllProducts()]);
      setRows(r);
      setProducts(p);
    } catch (e: any) {
      toast(e?.message || 'Could not load promotions', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    if (filter === 'requested') return rows.filter((r) => r.status === 'requested');
    if (filter === 'live') return rows.filter((r) => LIVE.includes(r.status)).sort((a, b) => (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9));
    return rows;
  }, [rows, filter]);

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try { await fn(); toast(ok); await load(); }
    catch (e: any) { toast(e?.message || 'Something went wrong', { type: 'error' }); }
    finally { setBusy(null); }
  };

  const approve = (r: AdminPromotion) => {
    const n = parseInt(orderInput[r.id] || '', 10);
    return run(r.id, () => adminReviewPromotion(r.id, 'approve', Number.isFinite(n) && n > 0 ? n : null), 'Approved. The owner can now pay.');
  };
  const reject = (r: AdminPromotion) => {
    const note = window.prompt('Reason (shown to the owner)', 'Not approved') ;
    if (note === null) return;
    return run(r.id, () => adminReviewPromotion(r.id, 'reject', null, note), 'Rejected');
  };
  const move = (r: AdminPromotion, dir: -1 | 1) => {
    // reorder within the same placement among live items
    const group = rows.filter((x) => LIVE.includes(x.status) && x.placement === r.placement).sort((a, b) => (a.slot_order ?? 1e9) - (b.slot_order ?? 1e9));
    const i = group.findIndex((x) => x.id === r.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= group.length) return;
    const ids = group.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return run(r.id, () => adminReorderPromotions(ids), 'Order updated');
  };
  const confirmPaid = (r: AdminPromotion) => {
    const receipt = window.prompt('M-Pesa receipt code');
    if (!receipt) return;
    return run(r.id, () => adminConfirmPayment(r.id, receipt), 'Payment confirmed');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 shadow-sm space-y-3">
        <p className="text-[14px] font-black">Auto-approve</p>
        <p className="text-[12px] text-slate-500">When on, requests for that pack are approved straight away and added to the end of the order, as long as a slot is free.</p>
        {products.map((p) => (
          <label key={p.id} className="flex items-center justify-between gap-3 text-[13px] font-semibold">
            <span>{p.name} <span className="text-slate-400 font-medium">· {priceLabel(p.price_kes)}</span></span>
            <input type="checkbox" checked={!!p.auto_approve} onChange={(e) => run(p.id, () => adminSetAutoApprove(p.id, e.target.checked), 'Saved')} />
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        {([['requested', `Requests (${rows.filter((r) => r.status === 'requested').length})`], ['live', 'Order'], ['all', 'All']] as [Filter, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-full text-[12px] font-black cursor-pointer ${filter === id ? 'bg-[#E0533C] text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{label}</button>
        ))}
      </div>

      {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : shown.length === 0 ? (
        <p className="text-[13px] text-slate-500">Nothing here.</p>
      ) : shown.map((r) => (
        <div key={r.id} className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 shadow-sm space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-black truncate">{r.target_title}</p>
              <p className="text-[11px] text-slate-500">{r.owner_label} · {r.product_name}{r.category ? ` · ${r.category}` : ''}</p>
              <p className="text-[11px] text-slate-500">{fmt(r.start_date)} – {fmt(r.end_date)} · {priceLabel(r.amount_kes)}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 shrink-0">
              {r.slot_order ? `#${r.slot_order} · ` : ''}{STATUS_LABEL[r.status]}
            </span>
          </div>
          {r.admin_note && <p className="text-[11px] text-slate-400">{r.admin_note}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {r.status === 'requested' && (
              <>
                <input inputMode="numeric" placeholder="Order # (blank = last)" value={orderInput[r.id] || ''} onChange={(e) => setOrderInput({ ...orderInput, [r.id]: e.target.value })}
                  className="w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]" />
                <button type="button" disabled={busy === r.id} onClick={() => approve(r)} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-black flex items-center gap-1 cursor-pointer"><Check className="w-3.5 h-3.5" />Approve</button>
                <button type="button" disabled={busy === r.id} onClick={() => reject(r)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold flex items-center gap-1 cursor-pointer"><X className="w-3.5 h-3.5" />Reject</button>
              </>
            )}
            {LIVE.includes(r.status) && (
              <>
                <button type="button" aria-label="Move up" onClick={() => move(r, -1)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" aria-label="Move down" onClick={() => move(r, 1)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
              </>
            )}
            {(r.status === 'approved' || r.status === 'pending_payment') && (
              <button type="button" onClick={() => confirmPaid(r)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold cursor-pointer">Mark paid (receipt)</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminPromotionsPanel;
