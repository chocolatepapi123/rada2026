import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, MapPin, Minus, Plus, X, XCircle } from 'lucide-react';
import { buyTicket, fetchPublicTickets, waitForOrder, type PublicTicketType, type PublicTicketView } from '../lib/ticketsBuyer';
import { normalizeKenyanPhone } from '../lib/payments';
import type { TicketSource } from '../lib/tickets';

interface Props {
  kind: TicketSource;
  source: string;
  signedIn: boolean;
  onNeedSignIn: () => void;
  onClose: () => void;
  onOpenMyTickets: () => void;
}

type Phase = 'pick' | 'waiting' | 'done' | 'failed';
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

export const TicketBuySheet: React.FC<Props> = ({ kind, source, signedIn, onNeedSignIn, onClose, onOpenMyTickets }) => {
  const [view, setView] = useState<PublicTicketView | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<PublicTicketType | null>(null);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<Phase>('pick');
  const [msg, setMsg] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let off = false;
    fetchPublicTickets(kind, source).then((v) => { if (!off) { setView(v); setLoading(false); } });
    return () => { off = true; abort.current?.abort(); };
  }, [kind, source]);

  const pick = (t: PublicTicketType) => { setSel(t); setQty(1); setMsg(''); };
  const max = sel ? Math.max(1, Math.min(sel.max_per_order, sel.left)) : 1;
  const total = sel ? sel.price_kes * qty : 0;

  const pay = async () => {
    if (!sel) return;
    if (!signedIn) return onNeedSignIn();
    if (sel.price_kes > 0 && !normalizeKenyanPhone(phone)) return setMsg('Enter a valid Safaricom number, like 0712 345 678.');
    setMsg('');
    setPhase('waiting');
    try {
      const { orderId, free } = await buyTicket(sel, qty, phone);
      if (free) return setPhase('done');
      abort.current = new AbortController();
      const row = await waitForOrder(orderId, { signal: abort.current.signal });
      if (row?.status === 'paid') setPhase('done');
      else if (!row || row.status === 'pending') {
        setPhase('failed');
        setMsg("We haven't heard back from M-Pesa yet. If you entered your PIN, your tickets will appear in My tickets within a minute.");
      } else {
        setPhase('failed');
        setMsg(row.failure_reason || 'The payment did not go through. You have not been charged.');
      }
    } catch (e: any) {
      setPhase('pick');
      setMsg(e?.message || 'We could not start the purchase.');
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-[#1C1A1E] shadow-xl">
        <div className="relative">
          {view?.image && <img src={view.image} alt="" className="w-full h-40 object-cover rounded-t-3xl" />}
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
          {!loading && !view && <p className="text-sm text-slate-600 dark:text-slate-300 py-6 text-center">This event could not be found. It may have been removed.</p>}

          {view && phase === 'pick' && (
            <>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{view.title}</h3>
                {(view.date || view.time) && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><CalendarDays className="w-4 h-4" />{[view.date, view.time].filter(Boolean).join(' · ')}</p>}
                {view.place && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5"><MapPin className="w-4 h-4" />{view.place}</p>}
              </div>

              {!view.types.length && <p className="text-sm text-slate-500">No tickets are on sale for this yet.</p>}
              <div className="space-y-2">
                {view.types.map((t) => {
                  const off = t.left <= 0 || t.closed || (t.price_kes > 0 && !view.paid_enabled);
                  const on = sel?.id === t.id;
                  return (
                    <button key={t.id} disabled={off} onClick={() => pick(t)}
                      className={`w-full text-left rounded-2xl border p-3 transition ${on ? 'border-[#E0533C] bg-[#E0533C]/[0.06]' : 'border-slate-200 dark:border-white/10'} ${off ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm">{t.name}</p>
                          {t.description && <p className="text-xs text-slate-500 truncate">{t.description}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {t.left <= 0 ? 'Sold out' : t.closed ? 'Sales ended' : t.price_kes > 0 && !view.paid_enabled ? 'Paid tickets opening soon' : t.left <= 10 ? `Only ${t.left} left` : ''}
                          </p>
                        </div>
                        <p className="font-extrabold text-sm shrink-0">{t.price_kes ? kes(t.price_kes) : 'Free'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {sel && (
                <div className="space-y-3 rounded-2xl bg-slate-50 dark:bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Tickets</span>
                    <div className="flex items-center gap-3">
                      <button aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 rounded-full border border-slate-300 dark:border-white/15"><Minus className="w-4 h-4" /></button>
                      <span className="w-6 text-center font-extrabold">{qty}</span>
                      <button aria-label="More" onClick={() => setQty((q) => Math.min(max, q + 1))} className="p-2 rounded-full border border-slate-300 dark:border-white/15"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {sel.price_kes > 0 && (
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="M-Pesa number, e.g. 0712 345 678"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
                  )}
                  <button onClick={pay} className="w-full rounded-2xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white py-3 font-extrabold">
                    {!signedIn ? 'Sign in to continue' : total > 0 ? `Pay ${kes(total)} with M-Pesa` : 'Get free ticket'}
                  </button>
                </div>
              )}
              {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
            </>
          )}

          {phase === 'waiting' && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E0533C]" />
              <p className="font-bold">Check your phone</p>
              <p className="text-sm text-slate-500">Enter your M-Pesa PIN to pay {kes(total)}. Your tickets appear here as soon as it goes through.</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="font-extrabold text-lg">You are in!</p>
              <p className="text-sm text-slate-500">Your {qty > 1 ? 'tickets are' : 'ticket is'} ready. Show the QR code at the door.</p>
              <button onClick={() => { onClose(); onOpenMyTickets(); }} className="w-full rounded-2xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white py-3 font-extrabold">View my tickets</button>
            </div>
          )}

          {phase === 'failed' && (
            <div className="py-8 text-center space-y-3">
              <XCircle className="w-10 h-10 mx-auto text-red-500" />
              <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>
              <div className="flex gap-2">
                <button onClick={() => { setPhase('pick'); setMsg(''); }} className="flex-1 rounded-2xl border border-slate-300 dark:border-white/15 py-3 font-bold">Try again</button>
                <button onClick={() => { onClose(); onOpenMyTickets(); }} className="flex-1 rounded-2xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white py-3 font-bold">My tickets</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketBuySheet;
