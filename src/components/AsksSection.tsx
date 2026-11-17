import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Flag, Heart, MapPin, Plus, ShieldCheck, Ticket, X } from 'lucide-react';
import AskComposer from './AskComposer.tsx';
import { acceptReply, blockUser, closeAsk, declineReply, fetchAsks, fetchReplies, getMyArea, passAsk, replyToAsk, reportAsk, setMyArea, timeLeft, type Ask, type AskReply } from '../lib/asks.ts';

const CARD = 'bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10';
const INPUT = 'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-[13px]';
const REPORT_REASONS: [string, string][] = [['spam', 'Spam or selling'], ['harassment', 'Harassment'], ['unsafe_meetup', 'Unsafe plan'], ['inappropriate_content', 'Inappropriate photo or video'], ['fake_profile', 'Fake profile']];
const THRESHOLD = 110;

interface Props { signedIn: boolean; showToast: (m: string) => void; onNeedSignIn?: () => void; onChatOpened?: (chatId: string) => void }

/** One swipeable card. Right = reply, left = pass. */
const SwipeCard: React.FC<{ ask: Ask; top: boolean; depth: number; onSwipe: (dir: 'left' | 'right') => void; onReport: () => void }> = ({ ask, top, depth, onSwipe, onReport }) => {
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<null | 'left' | 'right'>(null);
  const start = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => { if (start.current !== null) setDx(e.clientX - start.current); };
  const end = () => {
    if (start.current === null) return; start.current = null;
    if (dx > THRESHOLD) { setFly('right'); setTimeout(() => onSwipe('right'), 180); }
    else if (dx < -THRESHOLD) { setFly('left'); setTimeout(() => onSwipe('left'), 180); }
    else setDx(0);
  };
  const x = fly === 'right' ? 520 : fly === 'left' ? -520 : dx;
  const style: React.CSSProperties = top
    ? { transform: `translateX(${x}px) rotate(${x / 18}deg)`, transition: start.current === null ? 'transform 0.18s ease-out' : 'none', touchAction: 'pan-y' }
    : { transform: `scale(${1 - depth * 0.04}) translateY(${depth * 10}px)`, opacity: 1 - depth * 0.25 };
  return (
    <div
      className="absolute inset-0 rounded-[28px] overflow-hidden shadow-xl bg-slate-200 dark:bg-[#26232A] select-none"
      style={style}
      onPointerDown={top ? (e) => { start.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); } : undefined}
      onPointerMove={top ? move : undefined} onPointerUp={top ? end : undefined} onPointerCancel={top ? end : undefined}
    >
      {ask.media_url
        ? (ask.media_type === 'video'
          ? <video src={ask.media_url} className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline />
          : <img src={ask.media_url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />)
        : <div className="absolute inset-0 bg-gradient-to-br from-[#E0533C] via-[#C9402B] to-[#2D6A4F]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />
      {top && dx > 30 && <span className="absolute top-8 left-6 px-3 py-1 rounded-xl border-4 border-green-400 text-green-300 font-black text-2xl -rotate-12" style={{ opacity: Math.min(1, dx / THRESHOLD) }}>IN</span>}
      {top && dx < -30 && <span className="absolute top-8 right-6 px-3 py-1 rounded-xl border-4 border-red-400 text-red-300 font-black text-2xl rotate-12" style={{ opacity: Math.min(1, -dx / THRESHOLD) }}>PASS</span>}
      <button onPointerDown={(e) => e.stopPropagation()} onClick={onReport} aria-label="Report" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white/90 flex items-center justify-center cursor-pointer"><Flag className="w-4 h-4" /></button>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-2 pointer-events-none">
        {ask.plan_title && <p className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-extrabold"><Ticket className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{ask.plan_title}</span></p>}
        <p className="text-[20px] font-extrabold leading-tight">{ask.body}</p>
        <p className="text-[12px] font-bold flex items-center gap-1.5 flex-wrap text-white/90">
          <span>@{ask.handle || 'someone'}</span>
          {ask.verified && <BadgeCheck className="w-4 h-4 text-green-300" aria-label="Verified" />}
          {ask.trusted && <span className="inline-flex items-center gap-0.5 text-green-300"><ShieldCheck className="w-4 h-4" />Trusted</span>}
        </p>
        <p className="text-[12px] font-semibold text-white/80 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{ask.area} · {timeLeft(ask.expires_at)}</p>
      </div>
    </div>
  );
};

const AsksSection: React.FC<Props> = ({ signedIn, showToast, onNeedSignIn, onChatOpened }) => {
  const [area, setArea] = useState(getMyArea());
  const [asks, setAsks] = useState<Ask[] | null>(null);
  const [view, setView] = useState<'swipe' | 'mine'>('swipe');
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Ask | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [replies, setReplies] = useState<AskReply[]>([]);
  const [reporting, setReporting] = useState<Ask | null>(null);

  const load = useCallback(async () => setAsks(signedIn ? await fetchAsks(area) : []), [area, signedIn]);
  useEffect(() => { const t = setTimeout(() => void load(), 350); return () => clearTimeout(t); }, [load]);
  useEffect(() => { if (viewing) void fetchReplies(viewing).then(setReplies); }, [viewing]);

  const deck = (asks || []).filter((a) => !a.mine && !a.replied);
  const mine = (asks || []).filter((a) => a.mine);
  const drop = (id: string) => setAsks((p) => (p || []).filter((a) => a.id !== id));

  const swiped = (a: Ask, dir: 'left' | 'right') => {
    if (dir === 'left') { void passAsk(a.id); drop(a.id); return; }
    setReplyTo(a); setMsg(''); // card stays under the sheet until sent
  };
  const send = async () => {
    if (!replyTo) return; setBusy(true); const err = await replyToAsk(replyTo.id, msg); setBusy(false);
    if (err) return showToast(err);
    showToast('Sent. They will see your reply.'); drop(replyTo.id); setReplyTo(null);
  };
  const accept = async (r: AskReply) => {
    const { chatId, error } = await acceptReply(r.id);
    if (error || !chatId) return showToast(error || 'Could not open the chat.');
    showToast(`Chat opened with @${r.handle || 'them'}.`); onChatOpened?.(chatId);
    setReplies((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'accepted' } : x)));
  };
  const decline = async (r: AskReply) => { const err = await declineReply(r.id); if (err) return showToast(err); setReplies((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'declined' } : x))); };
  const close = async (a: Ask) => { const err = await closeAsk(a.id); if (err) return showToast(err); showToast('Ask closed.'); void load(); };
  const report = async (reason: string, alsoBlock: boolean) => {
    if (!reporting) return;
    const err = await reportAsk(reporting, reason); if (err) return showToast(err);
    if (alsoBlock) await blockUser(reporting.user_id);
    showToast(alsoBlock ? 'Reported and blocked. Thank you.' : 'Reported. Thank you.'); drop(reporting.id); setReporting(null);
  };
  const buttonSwipe = (dir: 'left' | 'right') => { if (deck[0]) swiped(deck[0], dir); };

  if (!signedIn) return (
    <div className={`${CARD} rounded-3xl p-6 text-center space-y-3`}>
      <p className="text-[13px] text-slate-500">Sign in to see what people are up to, and post your own.</p>
      <button onClick={onNeedSignIn} className="px-4 py-2 rounded-full bg-[#E0533C] text-white text-xs font-extrabold cursor-pointer">Sign in</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="flex-1 flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-3 py-2 text-[12px] font-bold">
          <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
          <input value={area} onChange={(e) => { setArea(e.target.value); setMyArea(e.target.value); }} placeholder="Everywhere · type a place to narrow" className="bg-transparent flex-1 min-w-0 outline-none placeholder:font-semibold" />
          {area && <button onClick={() => { setArea(''); setMyArea(''); }} aria-label="Clear" className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
        </label>
        <button onClick={() => setComposing(true)} className="px-3 py-2 rounded-full bg-[#E0533C] text-white font-extrabold text-xs inline-flex items-center gap-1 active:scale-95 cursor-pointer"><Plus className="w-3.5 h-3.5" />Post an ask</button>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-full text-[12px] text-center">
        {([['swipe', 'Swipe'], ['mine', `My asks${mine.length ? ` (${mine.length})` : ''}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`flex-1 py-1.5 rounded-full cursor-pointer ${view === id ? 'font-extrabold bg-white dark:bg-[#1C1A1E] text-[#E0533C] shadow-sm' : 'font-semibold text-slate-500'}`}>{label}</button>
        ))}
      </div>
      {composing && <AskComposer defaultArea={area} onClose={() => setComposing(false)} onPosted={() => { setComposing(false); void load(); }} showToast={showToast} />}

      {asks === null && <p className="text-[13px] text-slate-500 text-center py-10">Loading…</p>}

      {asks && view === 'swipe' && (deck.length === 0
        ? <p className="text-[13px] text-slate-500 text-center py-12">You're all caught up{area ? ` near ${area}` : ''}. Post an ask or check back soon.</p>
        : (
          <>
            <div className="relative w-full aspect-[4/5] max-h-[62vh] mx-auto">
              {deck.slice(0, 3).map((a, i) => ({ a, i })).reverse().map(({ a, i }) => (
                <SwipeCard key={a.id} ask={a} top={i === 0} depth={i} onSwipe={(d) => swiped(a, d)} onReport={() => setReporting(a)} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
              <button onClick={() => buttonSwipe('left')} aria-label="Pass" className="w-14 h-14 rounded-full bg-white dark:bg-[#1C1A1E] shadow-md flex items-center justify-center text-slate-500 cursor-pointer active:scale-90"><X className="w-6 h-6" /></button>
              <button onClick={() => buttonSwipe('right')} aria-label="Reply" className="w-16 h-16 rounded-full bg-[#E0533C] shadow-lg flex items-center justify-center text-white cursor-pointer active:scale-90"><Heart className="w-7 h-7" /></button>
            </div>
          </>
        ))}

      {asks && view === 'mine' && (mine.length === 0
        ? <p className="text-[13px] text-slate-500 text-center py-10">You have no live asks.</p>
        : mine.map((a) => (
          <div key={a.id} className={`${CARD} rounded-3xl p-4 space-y-2`}>
            {a.media_url && (a.media_type === 'video' ? <video src={a.media_url} className="w-full max-h-56 rounded-2xl object-cover" controls playsInline preload="metadata" /> : <img src={a.media_url} alt="" loading="lazy" className="w-full max-h-56 rounded-2xl object-cover" />)}
            {a.plan_title && <p className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] text-[11px] font-extrabold"><Ticket className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{a.plan_title}</span></p>}
            <p className="text-[14px] font-semibold leading-snug">{a.body}</p>
            <p className="text-[11px] text-slate-400 font-bold">{a.area} · {timeLeft(a.expires_at)}</p>
            <div className="flex gap-2">
              <button onClick={() => setViewing(viewing === a.id ? null : a.id)} className="flex-1 py-2 rounded-full bg-slate-100 dark:bg-white/[0.08] text-xs font-extrabold cursor-pointer">Replies ({a.replies})</button>
              <button onClick={() => close(a)} className="px-4 py-2 rounded-full text-xs font-extrabold text-slate-500 cursor-pointer">Close</button>
            </div>
            {viewing === a.id && (
              <div className="space-y-2 pt-1">
                {replies.length === 0 && <p className="text-[12px] text-slate-400">No replies yet.</p>}
                {replies.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2 space-y-1.5">
                    <p className="text-[12px]"><b>@{r.handle || 'someone'}</b>{r.verified && <BadgeCheck className="inline w-3.5 h-3.5 ml-1 text-[#2D6A4F]" />} {r.message}</p>
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => accept(r)} className="px-3 py-1.5 rounded-full bg-[#2D6A4F] text-white text-[11px] font-extrabold cursor-pointer">Accept and chat</button>
                        <button onClick={() => decline(r)} className="px-3 py-1.5 rounded-full text-slate-500 text-[11px] font-extrabold cursor-pointer">Decline</button>
                      </div>
                    ) : <p className="text-[11px] font-bold text-slate-400">{r.status === 'accepted' ? 'Chat opened' : 'Declined'}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )))}

      {replyTo && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4" onClick={() => setReplyTo(null)}>
          <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl p-4 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-extrabold">Say hi to @{replyTo.handle || 'them'}</p>
            <input autoFocus value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={140} placeholder="A short line" className={INPUT} />
            <div className="flex gap-2">
              <button disabled={busy} onClick={send} className="flex-1 py-2.5 rounded-full bg-[#E0533C] text-white text-xs font-extrabold cursor-pointer disabled:opacity-60">{busy ? 'Sending…' : 'Send'}</button>
              <button onClick={() => setReplyTo(null)} className="px-4 py-2.5 text-xs font-extrabold text-slate-500 cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {reporting && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setReporting(null)}>
          <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl p-4 w-full max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="font-extrabold">Report this ask</p>
            {REPORT_REASONS.map(([id, label]) => <button key={id} onClick={() => report(id, false)} className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] text-[13px] font-semibold cursor-pointer">{label}</button>)}
            <button onClick={() => report('other', true)} className="w-full px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-[13px] font-extrabold cursor-pointer">Report and block @{reporting.handle || 'this person'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AsksSection;
