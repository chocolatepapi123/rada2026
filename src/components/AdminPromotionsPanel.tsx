import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, EyeOff, Loader2, Pencil, Trash2, X } from 'lucide-react';
import {
  AUDIENCES, DOW_SHORT, STATUS_LABEL, adminConfirmPayment, adminDeleteOffer, adminDeletePromotion, adminFetchAllProducts,
  adminListOffers, adminListPromotions, adminRemoveOffer, adminRemovePromotion, adminReorderPromotions, adminReviewPromotion,
  adminSetAutoApprove, adminUpdateOffer, adminUpdatePromotion, isPaidDeleteError, offerScheduleText, priceLabel,
  type AdminOffer, type AdminPromotion, type PromoProduct, type PromoStatus,
} from '../lib/promotions';
import type { ToastOptions } from './Toast.tsx';

type Filter = 'requested' | 'live' | 'all';
type Section = 'boosts' | 'offers';
const LIVE = ['approved', 'pending_payment', 'scheduled', 'active'];
const ALL_STATUSES = Object.keys(STATUS_LABEL) as PromoStatus[];
const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const field = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]';
const lbl = 'block text-[11px] font-bold text-slate-500 mb-1';
const btn = 'px-3.5 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50';

type Toast = (m: string, options?: ToastOptions) => void;

export const AdminPromotionsPanel: React.FC<{ toast: Toast }> = ({ toast }) => {
  const [section, setSection] = useState<Section>('boosts');
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {([['boosts', 'Boosts'], ['offers', 'Offers']] as [Section, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSection(id)}
            className={`px-4 py-2 rounded-full text-[12px] font-black cursor-pointer ${section === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>{label}</button>
        ))}
      </div>
      {section === 'boosts' ? <BoostsSection toast={toast} /> : <OffersSection toast={toast} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Boosts (paid placements)
// ---------------------------------------------------------------------------
const BoostsSection: React.FC<{ toast: Toast }> = ({ toast }) => {
  const [rows, setRows] = useState<AdminPromotion[]>([]);
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [filter, setFilter] = useState<Filter>('requested');
  const [loading, setLoading] = useState(true);
  const [orderInput, setOrderInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

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
    const note = window.prompt('Reason (shown to the owner)', 'Not approved');
    if (note === null) return;
    return run(r.id, () => adminReviewPromotion(r.id, 'reject', null, note), 'Rejected');
  };
  const move = (r: AdminPromotion, dir: -1 | 1) => {
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

  const startEdit = (r: AdminPromotion) => {
    setEditing(r.id);
    setDraft({
      title: r.target_title || '', category: r.category || '', zone: r.zone || '', start: r.start_date, end: r.end_date,
      status: r.status, amount: String(r.amount_kes), order: r.slot_order ? String(r.slot_order) : '', note: r.admin_note || '',
    });
  };
  const saveEdit = (r: AdminPromotion) => {
    const amount = parseInt(draft.amount, 10);
    const order = parseInt(draft.order, 10);
    return run(r.id, async () => {
      await adminUpdatePromotion(r.id, {
        targetTitle: draft.title, category: draft.category, zone: draft.zone, start: draft.start, end: draft.end,
        status: draft.status as PromoStatus, amountKes: Number.isFinite(amount) ? amount : null,
        slotOrder: Number.isFinite(order) && order > 0 ? order : null, note: draft.note,
      });
      setEditing(null);
    }, 'Promotion updated');
  };
  const remove = (r: AdminPromotion) => {
    const note = window.prompt('Take this promotion off the app? Optional note for the record', 'Removed by admin');
    if (note === null) return;
    return run(r.id, () => adminRemovePromotion(r.id, note), 'Removed from the app (kept as Paused)');
  };
  const del = async (r: AdminPromotion) => {
    if (!window.confirm(`Delete "${r.target_title}" permanently? This cannot be undone.`)) return;
    setBusy(r.id);
    try {
      try {
        await adminDeletePromotion(r.id, false);
      } catch (e) {
        if (!isPaidDeleteError(e)) throw e;
        if (!window.confirm('This promotion has a confirmed payment. Delete anyway? The payment record is kept, but no longer linked to it.')) return;
        await adminDeletePromotion(r.id, true);
      }
      toast('Promotion deleted');
      await load();
    } catch (e: any) {
      toast(e?.message || 'Could not delete', { type: 'error' });
    } finally {
      setBusy(null);
    }
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

          {editing === r.id ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-[#121113] p-3 space-y-2.5">
              <div><label className={lbl}>Title</label><input className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div><label className={lbl}>Category</label><input className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
                <div><label className={lbl}>Zone</label><input className={field} value={draft.zone} onChange={(e) => setDraft({ ...draft, zone: e.target.value })} /></div>
                <div><label className={lbl}>Start</label><input type="date" className={field} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
                <div><label className={lbl}>End</label><input type="date" className={field} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
                <div><label className={lbl}>Status</label>
                  <select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Amount (KES)</label><input inputMode="numeric" className={field} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
                <div><label className={lbl}>Order #</label><input inputMode="numeric" className={field} value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} /></div>
              </div>
              <div><label className={lbl}>Admin note</label><input className={field} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div>
              <div className="flex gap-2">
                <button type="button" disabled={busy === r.id} onClick={() => saveEdit(r)} className={`${btn} bg-emerald-600 text-white`}><Check className="w-3.5 h-3.5" />Save</button>
                <button type="button" onClick={() => setEditing(null)} className={`${btn} bg-slate-100 dark:bg-slate-800`}><X className="w-3.5 h-3.5" />Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {r.status === 'requested' && (
                <>
                  <input inputMode="numeric" placeholder="Order # (blank = last)" value={orderInput[r.id] || ''} onChange={(e) => setOrderInput({ ...orderInput, [r.id]: e.target.value })}
                    className="w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[12px]" />
                  <button type="button" disabled={busy === r.id} onClick={() => approve(r)} className={`${btn} bg-emerald-600 text-white`}><Check className="w-3.5 h-3.5" />Approve</button>
                  <button type="button" disabled={busy === r.id} onClick={() => reject(r)} className={`${btn} bg-slate-100 dark:bg-slate-800`}><X className="w-3.5 h-3.5" />Reject</button>
                </>
              )}
              {LIVE.includes(r.status) && (
                <>
                  <button type="button" aria-label="Move up" onClick={() => move(r, -1)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" aria-label="Move down" onClick={() => move(r, 1)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                </>
              )}
              {(r.status === 'approved' || r.status === 'pending_payment') && (
                <button type="button" onClick={() => confirmPaid(r)} className={`${btn} bg-slate-100 dark:bg-slate-800`}>Mark paid (receipt)</button>
              )}
              <span className="flex-1" />
              <button type="button" disabled={busy === r.id} onClick={() => startEdit(r)} className={`${btn} bg-slate-100 dark:bg-slate-800`}><Pencil className="w-3.5 h-3.5" />Edit</button>
              {r.status !== 'paused' && (
                <button type="button" disabled={busy === r.id} onClick={() => remove(r)} className={`${btn} bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400`}><EyeOff className="w-3.5 h-3.5" />Remove</button>
              )}
              <button type="button" disabled={busy === r.id} onClick={() => del(r)} className={`${btn} bg-red-50 dark:bg-red-950/30 text-red-600`}><Trash2 className="w-3.5 h-3.5" />Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Offers (promos businesses post)
// ---------------------------------------------------------------------------
const OffersSection: React.FC<{ toast: Toast }> = ({ toast }) => {
  const [rows, setRows] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adminListOffers(search)); }
    catch (e: any) { toast(e?.message || 'Could not load offers', { type: 'error' }); }
    finally { setLoading(false); }
  }, [search, toast]);

  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [load]);

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try { await fn(); toast(ok); await load(); }
    catch (e: any) { toast(e?.message || 'Something went wrong', { type: 'error' }); }
    finally { setBusy(null); }
  };

  const startEdit = (o: AdminOffer) => {
    const d = o.data || {};
    setEditing(o.id);
    setDraft({
      title: o.title || '', highlight: d.highlight || d.discount || '', description: o.description || '', venue: d.venue || '',
      location: d.location || '', startsAt: d.startsAt || '', endsAt: d.endsAt || '', startTime: d.startTime || '', endTime: d.endTime || '',
      daysOfWeek: Array.isArray(d.daysOfWeek) ? d.daysOfWeek : [], audience: d.audience || '', contactPhone: d.contactPhone || '',
      bookingUrl: d.bookingUrl || d.actionUrl || '', validUntil: d.validUntil || '', published: o.status === 'published',
    });
  };
  const set = (k: string, v: any) => setDraft((p) => ({ ...p, [k]: v }));
  const toggleDay = (n: number) => set('daysOfWeek', draft.daysOfWeek.includes(n) ? draft.daysOfWeek.filter((x: number) => x !== n) : [...draft.daysOfWeek, n]);

  const save = (o: AdminOffer) => run(o.id, async () => {
    const sched = offerScheduleText(draft);
    await adminUpdateOffer(o.id, {
      title: draft.title.trim(), description: draft.description.trim(), highlight: draft.highlight.trim(), discount: draft.highlight.trim() || o.data?.discount || 'SPECIAL OFFER',
      venue: draft.venue.trim(), location: draft.location.trim(), startsAt: draft.startsAt || null, endsAt: draft.endsAt || null,
      startTime: draft.startTime || null, endTime: draft.endTime || null, daysOfWeek: draft.daysOfWeek, audience: draft.audience,
      contactPhone: draft.contactPhone.trim(), bookingUrl: draft.bookingUrl.trim(), actionUrl: draft.bookingUrl.trim(),
      validUntil: sched || draft.validUntil.trim(),
    }, draft.published ? 'published' : 'draft');
    setEditing(null);
  }, 'Offer updated');

  const hide = (o: AdminOffer) => {
    if (!window.confirm(`Hide "${o.title}" from the app? Any live boost on it is paused. You can show it again from Edit.`)) return;
    return run(o.id, () => adminRemoveOffer(o.id, 'Removed by admin'), 'Offer hidden');
  };
  const del = (o: AdminOffer) => {
    if (!window.confirm(`Delete "${o.title}" permanently? Saves and claims on it are deleted too. This cannot be undone.`)) return;
    return run(o.id, () => adminDeleteOffer(o.id), 'Offer deleted');
  };

  return (
    <div className="space-y-4">
      <input className={field} placeholder="Search offers or businesses" value={search} onChange={(e) => setSearch(e.target.value)} />
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">No offers found.</p>
      ) : rows.map((o) => (
        <div key={o.id} className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 shadow-sm space-y-2.5">
          <div className="flex items-start gap-3">
            {o.data?.posterUrl && <img loading="lazy" decoding="async" src={o.data.posterUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black truncate">{o.title}</p>
              <p className="text-[11px] text-slate-500 truncate">{o.business_name || '—'} · {o.owner_label}</p>
              <p className="text-[11px] text-slate-400 truncate">{o.data?.validUntil || ''}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${o.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800'}`}>{o.status === 'published' ? 'Live' : 'Hidden'}</span>
              {o.boosted && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700">Boosted</span>}
            </div>
          </div>

          {editing === o.id ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-[#121113] p-3 space-y-2.5">
              <div><label className={lbl}>Title</label><input className={field} value={draft.title} onChange={(e) => set('title', e.target.value)} /></div>
              <div><label className={lbl}>What's on offer</label><input className={field} value={draft.highlight} onChange={(e) => set('highlight', e.target.value)} /></div>
              <div><label className={lbl}>Description</label><textarea rows={2} className={field} value={draft.description} onChange={(e) => set('description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div><label className={lbl}>Venue</label><input className={field} value={draft.venue} onChange={(e) => set('venue', e.target.value)} /></div>
                <div><label className={lbl}>Location / area</label><input className={field} value={draft.location} onChange={(e) => set('location', e.target.value)} /></div>
                <div><label className={lbl}>Starts</label><input type="date" className={field} value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></div>
                <div><label className={lbl}>Ends</label><input type="date" className={field} value={draft.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></div>
                <div><label className={lbl}>From</label><input type="time" className={field} value={draft.startTime} onChange={(e) => set('startTime', e.target.value)} /></div>
                <div><label className={lbl}>To</label><input type="time" className={field} value={draft.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
                <div><label className={lbl}>Phone</label><input inputMode="tel" className={field} value={draft.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
                <div><label className={lbl}>Booking link</label><input className={field} value={draft.bookingUrl} onChange={(e) => set('bookingUrl', e.target.value)} /></div>
              </div>
              <div>
                <label className={lbl}>Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DOW_SHORT.map((d, i) => (
                    <button key={d} type="button" onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer ${draft.daysOfWeek.includes(i) ? 'bg-[#E0533C] text-white' : 'bg-slate-200/70 dark:bg-slate-800'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div><label className={lbl}>Audience</label>
                <select className={field} value={draft.audience} onChange={(e) => set('audience', e.target.value)}>
                  <option value="">Not set</option>
                  {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-semibold"><input type="checkbox" checked={draft.published} onChange={(e) => set('published', e.target.checked)} />Show in the app</label>
              <div className="flex gap-2">
                <button type="button" disabled={busy === o.id} onClick={() => save(o)} className={`${btn} bg-emerald-600 text-white`}><Check className="w-3.5 h-3.5" />Save</button>
                <button type="button" onClick={() => setEditing(null)} className={`${btn} bg-slate-100 dark:bg-slate-800`}><X className="w-3.5 h-3.5" />Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button type="button" disabled={busy === o.id} onClick={() => startEdit(o)} className={`${btn} bg-slate-100 dark:bg-slate-800`}><Pencil className="w-3.5 h-3.5" />Edit</button>
              {o.status === 'published' && (
                <button type="button" disabled={busy === o.id} onClick={() => hide(o)} className={`${btn} bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400`}><EyeOff className="w-3.5 h-3.5" />Remove</button>
              )}
              <button type="button" disabled={busy === o.id} onClick={() => del(o)} className={`${btn} bg-red-50 dark:bg-red-950/30 text-red-600`}><Trash2 className="w-3.5 h-3.5" />Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminPromotionsPanel;
