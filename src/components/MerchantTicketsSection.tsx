import React, { useEffect, useState } from 'react';
import { CalendarPlus, CheckCircle2, ChevronRight, Loader2, QrCode, Smartphone, Ticket } from 'lucide-react';
import { canSellTickets, getMyPayoutPhone, savePayoutPhone } from '../lib/tickets';
import TicketScanner from './TicketScanner';
import type { EventItem } from '../types.ts';

interface Props {
  events: EventItem[];
  onPublishEvent: () => void;
  onManageEvent: (evt: EventItem) => void;
  onGoToPlan?: () => void;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

const CARD = 'rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 shadow-sm';
const PRIMARY = 'min-h-[44px] rounded-2xl px-4 bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-[13px] font-extrabold shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50';
const SOFT = 'min-h-[44px] rounded-2xl px-4 bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 text-[13px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer';

/** Everything a merchant needs to sell tickets, in one place. Works for every business type. */
export const MerchantTicketsSection: React.FC<Props> = ({ events, onPublishEvent, onManageEvent, onGoToPlan, onToast }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [payout, setPayout] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let off = false;
    Promise.all([canSellTickets(), getMyPayoutPhone()]).then(([ok, ph]) => { if (!off) { setAllowed(ok); setPayout(ph); } });
    return () => { off = true; };
  }, []);

  const save = async () => {
    setBusy(true); setErr('');
    try { setPayout(await savePayoutPhone(input)); setEditing(false); onToast?.('Payout number saved'); }
    catch (e: any) { setErr(e?.message || 'Could not save that number.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-[#E0533C] to-[#EE8A47] shadow-lg shadow-[#E0533C]/25">
        <Ticket className="absolute -right-3 -top-3 w-24 h-24 opacity-15 rotate-12" />
        <h3 className="text-[18px] font-black tracking-tight">Sell tickets on RADA</h3>
        <p className="text-[13px] text-white/90 mt-1 max-w-[17rem]">Guests pay by M-Pesa, get a QR ticket instantly, and your share is sent to your phone within minutes.</p>
        <button onClick={onPublishEvent} className="mt-4 min-h-[44px] rounded-2xl px-4 bg-white text-[#E0533C] text-[13px] font-extrabold flex items-center gap-2 active:scale-[0.98] transition cursor-pointer">
          <CalendarPlus className="w-4 h-4" /> Publish an event
        </button>
      </div>

      {allowed === false && (
        <div className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 p-4 text-[13px] text-amber-900 dark:text-amber-200">
          <p className="font-extrabold">A Pro or Elite plan is needed to sell tickets.</p>
          <p className="mt-1 opacity-90">You can still publish events. Start a plan to switch ticket sales on.</p>
          {onGoToPlan && <button onClick={onGoToPlan} className={`${PRIMARY} mt-3`}>See plans</button>}
        </div>
      )}

      {/* Payout number */}
      <div className={CARD}>
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Where we send your money</p>
        {allowed === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 mt-3" />
        ) : payout && !editing ? (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[14px] font-bold">M-Pesa +{payout}</span>
            <button onClick={() => { setEditing(true); setInput(''); }} className="ml-auto text-[12px] font-extrabold text-[#E0533C]">Change</button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} inputMode="tel" placeholder="0712 345 678"
                className="flex-1 min-w-0 rounded-2xl bg-slate-100 dark:bg-white/[0.07] px-4 py-3 text-[14px] outline-none" />
              <button onClick={save} disabled={busy} className={PRIMARY}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
            {err && <p role="alert" className="text-[12px] text-red-600">{err}</p>}
            <p className="text-[11px] text-slate-500">Needed before you can sell paid tickets.</p>
          </div>
        )}
      </div>

      {/* Door check-in */}
      <button onClick={() => setScanning(true)} className={`${CARD} w-full flex items-center gap-3 text-left active:scale-[0.99] transition cursor-pointer`}>
        <span className="w-11 h-11 rounded-2xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0"><QrCode className="w-5 h-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-extrabold">Check in guests</span>
          <span className="block text-[12px] text-slate-500">Scan ticket QR codes at the door</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {/* Events */}
      <div className="space-y-2">
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 px-1">Your events ({events.length})</p>
        {events.length === 0 && (
          <div className={`${CARD} text-center py-8`}>
            <Ticket className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="font-extrabold text-[14px]">No events yet</p>
            <p className="text-[12px] text-slate-500 mt-1">Publish an event, then add ticket types and prices.</p>
          </div>
        )}
        {events.map((evt) => (
          <div key={evt.id} className={`${CARD} flex items-center gap-3`}>
            <img loading="lazy" decoding="async" src={evt.img} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[14px] truncate">{evt.title}</p>
              <p className="text-[12px] text-slate-500 truncate">{[evt.date, evt.time].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => onManageEvent(evt)} className={PRIMARY}>
              <Ticket className="w-4 h-4" /> Tickets
            </button>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className={CARD}>
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">How it works</p>
        <ol className="space-y-2 text-[13px] text-slate-700 dark:text-slate-300">
          <li><b>1.</b> Publish an event and tap Tickets to add prices.</li>
          <li><b>2.</b> Share the link. Guests pay with M-Pesa and get a QR ticket.</li>
          <li><b>3.</b> Scan tickets at the door. Your share arrives on your phone.</li>
        </ol>
      </div>

      {scanning && <TicketScanner onClose={() => setScanning(false)} />}
    </div>
  );
};

export default MerchantTicketsSection;
