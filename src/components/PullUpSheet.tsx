import React, { useState } from 'react';
import { BadgeCheck, Check, ChevronsUp, Loader2, MapPin, ShieldCheck, Ticket, X } from 'lucide-react';
import { pullUpLineProblem, replyToAsk, timeLeft, type Ask } from '../lib/asks.ts';

const QUICK = ["I'm in", 'Pulling up now', 'What time?', 'Can I bring a friend?'];

/**
 * "Pull up" on a rada: a short line to the person who posted it.
 * If they let you in, a chat opens with this line as the first message.
 */
export const PullUpSheet: React.FC<{ ask: Ask; onClose: () => void; onSent: (ask: Ask) => void; showToast: (m: string) => void }> = ({ ask, onClose, onSent, showToast }) => {
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const problem = line.trim() ? pullUpLineProblem(line) : null;
  const handle = ask.handle || 'them';

  const send = async () => {
    const p = pullUpLineProblem(line);
    if (p) { showToast(p); return; }
    setBusy(true);
    const err = await replyToAsk(ask.id, line.trim());
    setBusy(false);
    if (err) { showToast(err); return; }
    setSent(true);
  };
  const done = () => { onSent(ask); };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center" onClick={sent ? done : onClose} role="dialog" aria-modal="true" aria-label={`Pull up on @${handle}`}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="p-7 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white flex items-center justify-center shadow-lg shadow-[#E0533C]/30"><Check className="w-8 h-8" strokeWidth={3} /></div>
            <p className="text-xl font-black tracking-tight">You pulled up</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">@{handle} will see your line. If they let you in, a chat opens in Chats with your message at the top.</p>
            <button type="button" onClick={done} className="w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black cursor-pointer active:scale-[0.98] transition">Keep browsing</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 dark:bg-white/15 sm:hidden" />
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-cover bg-center bg-slate-200 dark:bg-slate-700 shrink-0 border-2 border-white dark:border-[#1C1A1E] shadow-sm" style={ask.avatar ? { backgroundImage: `url('${ask.avatar}')` } : undefined} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E0533C] flex items-center gap-1"><ChevronsUp className="w-3.5 h-3.5" /> Pull up on</p>
                <p className="text-[16px] font-black tracking-tight flex items-center gap-1.5 truncate">
                  @{handle}
                  {ask.verified && <BadgeCheck className="w-4 h-4 text-[#2D6A4F] shrink-0" aria-label="Verified" />}
                  {ask.trusted && <ShieldCheck className="w-4 h-4 text-[#2D6A4F] shrink-0" aria-label="Trusted" />}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.05] p-3.5 space-y-1.5">
              {ask.plan_title && <p className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] text-[11px] font-extrabold"><Ticket className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{ask.plan_title}</span></p>}
              <p className="text-[14px] font-semibold leading-snug text-slate-800 dark:text-slate-100 line-clamp-3">{ask.body}</p>
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{ask.area} · {timeLeft(ask.expires_at)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => setLine(q)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer border transition active:scale-95 ${line === q ? 'bg-[#E0533C] border-[#E0533C] text-white' : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'}`}>{q}</button>
                ))}
              </div>
              <div className="relative">
                <textarea value={line} onChange={(e) => setLine(e.target.value.slice(0, 140))} rows={2} placeholder="Say something short"
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-transparent px-4 py-3 pr-12 text-[14px] font-semibold outline-none focus:border-[#E0533C] resize-none placeholder:font-medium placeholder:text-slate-400" />
                <span className="absolute right-3 bottom-2.5 text-[10px] font-bold text-slate-400">{line.length}/140</span>
              </div>
              {problem && <p className="text-[12px] text-red-500">{problem}</p>}
            </div>

            <button type="button" onClick={send} disabled={busy || !line.trim() || !!problem}
              className="w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] transition shadow-lg shadow-[#E0533C]/20">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronsUp className="w-4 h-4" />} Pull up
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">They see your line first. A chat only opens if they let you in.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PullUpSheet;
