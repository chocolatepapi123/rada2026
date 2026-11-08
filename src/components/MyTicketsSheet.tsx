import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, MapPin, Ticket, X } from 'lucide-react';
import QRCode from 'qrcode';
import { fetchMyTickets, ticketQrText, type MyTicket } from '../lib/ticketsBuyer';

const Qr: React.FC<{ code: string }> = ({ code }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let off = false;
    QRCode.toDataURL(ticketQrText(code), { margin: 1, width: 480, errorCorrectionLevel: 'M' })
      .then((u: string) => { if (!off) setSrc(u); })
      .catch(() => {});
    return () => { off = true; };
  }, [code]);
  return src ? <img src={src} alt="Ticket QR code" className="w-56 h-56 mx-auto rounded-xl bg-white p-2" /> : <div className="w-56 h-56 mx-auto" />;
};

export const MyTicketsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = () => fetchMyTickets().then(setTickets).catch((e) => setErr(e?.message || 'We could not load your tickets.'));
  useEffect(() => { load(); }, []);

  // a ticket's status flips to "used" at the door, so refresh while one is on screen
  useEffect(() => {
    if (!open) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [open]);

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold flex items-center gap-2"><Ticket className="w-5 h-5" /> My tickets</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        {!tickets && !err && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {tickets && !tickets.length && <p className="text-sm text-slate-500 py-6 text-center">No tickets yet. When you get one, it shows up here with its QR code.</p>}
        {tickets?.map((t) => {
          const isOpen = open === t.id;
          const used = t.status === 'used';
          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : t.id)} className="w-full text-left p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{t.title || 'Event'}</p>
                  <p className="text-xs text-slate-500">{t.type_name}{[t.event_date, t.event_time].filter(Boolean).length ? ` · ${[t.event_date, t.event_time].filter(Boolean).join(' ')}` : ''}</p>
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${used ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{used ? 'Used' : 'Valid'}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-4 space-y-2 text-center">
                  <div className={used ? 'opacity-30' : ''}><Qr code={t.code} /></div>
                  {used && <p className="text-xs font-bold text-slate-500">Checked in{t.checked_in_at ? ` at ${new Date(t.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>}
                  {t.event_date && <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{[t.event_date, t.event_time].filter(Boolean).join(' · ')}</p>}
                  {t.place && <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><MapPin className="w-3.5 h-3.5" />{t.place}</p>}
                  <p className="text-[10px] font-mono text-slate-400 break-all select-all">{t.code}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyTicketsSheet;
