import React, { useState } from 'react';
import { Check, Clock, Loader2, Users, X } from 'lucide-react';
import type { EventItem } from '../types.ts';
import { RadaTimePicker } from './RadaPickers.tsx';

export interface PlanChoice { handle: string }

interface Props {
  event: EventItem;
  /** People I already chat with (handles like @amina). */
  friends: PlanChoice[];
  onClose: () => void;
  /** Creates the group chat. Resolves with an error message or null. */
  onCreate: (opts: { handles: string[]; meetTime: string }) => Promise<string | null>;
}

const input = 'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-[15px] font-semibold outline-none focus:border-[#E0533C]';

export const PlanFromEventSheet: React.FC<Props> = ({ event, friends, onClose, onCreate }) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (h: string) => setPicked((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]));
  const typed = extra.split(/[\s,]+/).map((h) => h.trim().replace(/^@/, '')).filter(Boolean).map((h) => `@${h}`);
  const all = Array.from(new Set([...picked, ...typed]));

  const go = async () => {
    if (all.length === 0) { setErr('Pick at least one person to go with.'); return; }
    setBusy(true); setErr('');
    const e = await onCreate({ handles: all, meetTime });
    setBusy(false);
    if (e) setErr(e);
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Go with someone</p>
            <p className="text-lg font-black tracking-tight mt-1 leading-tight">{event.title}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">{event.date}{event.time ? ` · ${event.time}` : ''} · {event.location}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Who is coming?</p>
          {friends.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {friends.map((f) => {
                const on = picked.includes(f.handle);
                return (
                  <button key={f.handle} type="button" onClick={() => toggle(f.handle)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1 cursor-pointer border ${on ? 'bg-[#E0533C] border-[#E0533C] text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                    {on && <Check className="w-3 h-3" />}{f.handle}
                  </button>
                );
              })}
            </div>
          )}
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Or type @usernames" className={input} />
        </div>

        <div className="space-y-1.5">
          <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Meet at (optional)</span>
          <RadaTimePicker
            ariaLabel="Meet at time"
            value={meetTime}
            onChange={setMeetTime}
            allowClear
            placeholder="Pick meeting time"
            buttonClassName="bg-transparent border-slate-200 dark:border-slate-700 py-3 text-[14px]"
          />
        </div>

        {err && <p className="text-[12px] text-red-500">{err}</p>}
        <button type="button" onClick={go} disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Start the plan
        </button>
        <p className="text-[11px] text-slate-400 leading-relaxed">This opens a group chat with them and saves the plan in your Vault. Buy tickets from the event page as usual.</p>
      </div>
    </div>
  );
};

export default PlanFromEventSheet;
