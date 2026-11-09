import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2, Pause, Pencil, Play, Plus, Share2, Smartphone, Ticket, X } from 'lucide-react';
import {
  canSellTickets, createTicketType, getOutingTicketRule, setOutingTicketRule, type OutingTicketRule, fetchHostView, getMyPayoutPhone, savePayoutPhone,
  ticketShareUrl, updateTicketType, type HostTicketType, type HostTicketView, type TicketSource,
} from '../lib/tickets';
import { shareContent } from '../utils/shareUtils';
import TicketScanner from './TicketScanner';

interface Props {
  kind: TicketSource;
  /** outing id, or the event's listing UUID */
  source: string;
  title: string;
  onClose: () => void;
  /** Opens the poster editor for this event or outing, when the caller has one. */
  onEditPoster?: () => void;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

export const HostTicketsPanel: React.FC<Props> = ({ kind, source, title, onClose, onEditPoster, onToast }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [payout, setPayout] = useState<string | null>(null);
  const [payoutInput, setPayoutInput] = useState('');
  const [view, setView] = useState<HostTicketView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [rule, setRule] = useState<OutingTicketRule>({ require_ticket: false, pay_window_minutes: 1440 });
  const [editing, setEditing] = useState<HostTicketType | null>(null);
  const [f, setF] = useState({ name: '', price: '', qty: '', desc: '' });

  const toast = (m: string, t: 'success' | 'error' = 'success') => onToast?.(m, t);
  const link = ticketShareUrl(kind, source);

  const load = useCallback(async () => {
    setErr('');
    try {
      const ok = await canSellTickets();
      setAllowed(ok);
      setPayout(await getMyPayoutPhone());
      if (ok) setView(await fetchHostView(kind, source));
      if (ok && kind === 'outing') setRule(await getOutingTicketRule(source));
    } catch (e: any) {
      setErr(e?.message || 'We could not load your tickets.');
    } finally {
      setLoading(false);
    }
  }, [kind, source]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setErr('');
    try { await fn(); if (ok) toast(ok); await load(); }
    catch (e: any) { setErr(e?.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  const openAdd = () => { setEditing(null); setF({ name: '', price: '', qty: '', desc: '' }); setAdding(true); };
  const openEdit = (t: HostTicketType) => {
    setEditing(t);
    setF({ name: t.name, price: String(t.price_kes), qty: String(t.quantity), desc: t.description || '' });
    setAdding(true);
  };

  const submitType = () => {
    const price = Number(f.price), qty = Number(f.qty);
    if (!f.name.trim()) return setErr('Give the ticket a name, like "Early bird".');
    if (!Number.isFinite(price) || price < 0) return setErr('Enter a price. Use 0 for a free ticket.');
    if (price > 0 && price < 50) return setErr('Paid tickets start at KES 50, so M-Pesa fees do not eat the sale.');
    if (!Number.isFinite(qty) || qty < 1) return setErr('Enter how many tickets you are selling.');
    run(async () => {
      if (editing) {
        await updateTicketType(editing.id, { name: f.name, desc: f.desc, price_kes: price, quantity: qty });
      } else {
        await createTicketType(kind, source, { name: f.name, description: f.desc, price_kes: price, quantity: qty });
      }
      setAdding(false);
    }, editing ? 'Ticket updated' : 'Ticket added');
  };

  const share = () =>
    shareContent({
      title,
      text: `Get your ticket for ${title} on RADA`,
      url: link,
      onSuccess: (m) => toast(m),
    });

  const totals = (view?.types || []).reduce(
    (a, t) => ({ sold: a.sold + t.sold, gross: a.gross + t.gross_kes, net: a.net + t.net_kes, fee: a.fee + t.commission_kes, in: a.in + t.checked_in }),
    { sold: 0, gross: 0, net: 0, fee: 0, in: 0 }
  );
  const pct = view?.types[0]?.commission_pct;
  const hasPaid = (view?.types || []).some((t) => t.price_kes > 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-[#1C1A1E] p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> Tickets</p>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}

        {!loading && !allowed && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
            Selling tickets is for creators and merchants on a Pro or Elite plan. Start a plan from your hub to turn it on.
          </div>
        )}

        {!loading && allowed && (
          <>
            {/* payout number */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
              <p className="text-xs font-extrabold flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Where we send your money</p>
              {payout ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> M-Pesa +{payout}
                  <button className="ml-auto text-xs font-bold text-[#E0533C]" onClick={() => setPayout(null)}>Change</button>
                </p>
              ) : (
                <div className="flex gap-2">
                  <input value={payoutInput} onChange={(e) => setPayoutInput(e.target.value)} inputMode="tel" placeholder="0712 345 678"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                  <button disabled={busy} onClick={() => run(async () => { setPayout(await savePayoutPhone(payoutInput)); }, 'Payout number saved')}
                    className="px-4 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-sm font-bold disabled:opacity-50">Save</button>
                </div>
              )}
              <p className="text-[11px] text-slate-500">Paid tickets need this. Your share is sent within minutes of each sale.</p>
            </div>

            {/* totals */}
            {totals.sold > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2"><p className="text-[10px] text-slate-500">Sold</p><p className="font-extrabold">{totals.sold}</p></div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2"><p className="text-[10px] text-slate-500">You earn</p><p className="font-extrabold">{kes(totals.net)}</p></div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-2"><p className="text-[10px] text-slate-500">Checked in</p><p className="font-extrabold">{totals.in}</p></div>
              </div>
            )}

            {kind === 'outing' && (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-[#E0533C]" checked={rule.require_ticket}
                    onChange={(e) => run(async () => { await setOutingTicketRule(source, e.target.checked, rule.pay_window_minutes); }, e.target.checked ? 'Guests must now pay after approval' : 'Ticket no longer required')} />
                  <span className="text-sm">
                    <span className="font-bold block">Approved guests must buy a ticket</span>
                    <span className="text-[11px] text-slate-500">Guests ask to join as usual. After you approve them, they pay to keep their spot.</span>
                  </span>
                </label>
                {rule.require_ticket && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 shrink-0">Pay within</span>
                    <select value={rule.pay_window_minutes} disabled={busy}
                      onChange={(e) => run(async () => { await setOutingTicketRule(source, true, Number(e.target.value)); })}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-2 py-1.5 text-sm">
                      {[[30, '30 minutes'], [60, '1 hour'], [180, '3 hours'], [720, '12 hours'], [1440, '24 hours'], [2880, '2 days'], [10080, '7 days']].map(([m, l]) => (
                        <option key={m} value={m}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}
                {rule.require_ticket && <p className="text-[11px] text-slate-500">If a guest does not pay in time, their approval is cancelled and they are told. You will see who is still waiting in Manage.</p>}
                {rule.require_ticket && !(view?.types || []).length && <p className="text-[11px] text-amber-700">Add a ticket below first. Until one is on sale, approvals go through without payment.</p>}
              </div>
            )}

            {/* ticket types */}
            <div className="space-y-2">
              {(view?.types || []).map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.price_kes ? kes(t.price_kes) : 'Free'} · {t.sold}/{t.quantity} sold{t.status === 'paused' ? ' · Paused' : ''}</p>
                    </div>
                    <button disabled={busy} onClick={() => openEdit(t)} aria-label="Edit ticket" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><Pencil className="w-4 h-4" /></button>
                    <button disabled={busy} aria-label={t.status === 'paused' ? 'Resume sales' : 'Pause sales'}
                      onClick={() => run(() => updateTicketType(t.id, { status: t.status === 'paused' ? 'on_sale' : 'paused' }))}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                      {t.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {!view?.types.length && <p className="text-sm text-slate-500">No tickets yet. Add one to start selling.</p>}
              <button onClick={openAdd} className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Add a ticket
              </button>
            </div>

            {adding && (
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-3 space-y-2">
                <p className="text-xs font-extrabold">{editing ? 'Edit ticket' : 'New ticket'}</p>
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name (Early bird, VIP...)" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Price KES (0 = free)" className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                  <input value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="How many" className="w-28 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                </div>
                <input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="What's included (optional)" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                {editing && editing.sold > 0 && <p className="text-[11px] text-slate-500">The price is locked once sales start. To change it, pause this ticket and add a new one.</p>}
                {!editing && Number(f.price) > 0 && pct != null && <p className="text-[11px] text-slate-500">RADA keeps {pct}% of each sale. You receive about {kes(Number(f.price) * (1 - pct / 100))} per ticket.</p>}
                <div className="flex gap-2">
                  <button disabled={busy} onClick={submitType} className="flex-1 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white py-2 text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setAdding(false)} className="px-4 rounded-xl text-sm font-bold">Cancel</button>
                </div>
              </div>
            )}

            {hasPaid && !view?.paid_enabled && (
              <p className="text-xs rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-slate-600 dark:text-slate-300">Paid ticket sales are not switched on yet. Your tickets are saved and will go live when RADA turns them on. Free tickets work now.</p>
            )}

            {/* share + poster */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={share} className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" /> Share link</button>
              <button onClick={async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { toast('Copy failed', 'error'); } }}
                className="rounded-xl border border-slate-200 dark:border-white/10 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"><Copy className="w-4 h-4" /> Copy link</button>
            </div>
            {<button onClick={() => setScanning(true)} className="w-full min-h-[44px] rounded-2xl bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 text-sm font-bold">Check in guests (scan QR)</button>}
            {onEditPoster && <button onClick={onEditPoster} className="w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 text-sm font-bold">Edit poster</button>}
          </>
        )}

        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </div>
      {scanning && <TicketScanner onClose={() => { setScanning(false); load(); }} />}
    </div>
  );
};

export default HostTicketsPanel;
