import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Calendar, Flag, Heart, MapPin, Navigation, Plus, Reply, ShieldCheck, X } from 'lucide-react';
import AskComposer from './AskComposer.tsx';
import PullUpSheet from './PullUpSheet.tsx';
import { NearYouControl } from './NearYouControl.tsx';
import { acceptReply, blockUser, closeAsk, declineReply, fetchAsks, fetchReplies, getMyArea, likeAsk, passAsk, reportAsk, setMyArea, timeLeft, type Ask, type AskReply } from '../lib/asks.ts';
import { resolveLocationTextCoords } from '../lib/geo.ts';
import { formatKm, hasRealCoords, haversineKm, useNearYou } from '../lib/spotRanking.ts';

const CARD = 'bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10';
const REPORT_REASONS: [string, string][] = [['spam', 'Spam or selling'], ['harassment', 'Harassment'], ['unsafe_meetup', 'Unsafe plan'], ['inappropriate_content', 'Inappropriate photo or video'], ['fake_profile', 'Fake profile']];
const THRESHOLD = 110;

interface Props { signedIn: boolean; showToast: (m: string) => void; onNeedSignIn?: () => void; onChatOpened?: (chatId: string) => void; spots?: any[]; events?: any[] }

/** One swipeable card. Right = like, left = pass. Reply is a button. */
const SwipeCard: React.FC<{ ask: Ask; distanceKm?: number | null; top: boolean; depth: number; onSwipe: (dir: 'left' | 'right') => void; onReport: () => void }> = ({ ask, distanceKm, top, depth, onSwipe, onReport }) => {
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
          ? <video src={ask.media_url} className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay={top} preload={top ? 'auto' : 'none'} muted loop playsInline />
          : <img src={ask.media_url} alt="" draggable={false} decoding="async" loading={top ? 'eager' : 'lazy'} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />)
        : <div className="absolute inset-0 bg-gradient-to-br from-[#E0533C] via-[#C9402B] to-[#2D6A4F]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />
      {top && dx > 30 && <span className="absolute top-8 left-6 px-3 py-1 rounded-xl border-4 border-[#EE8A47] text-[#EE8A47] font-black text-2xl -rotate-12" style={{ opacity: Math.min(1, dx / THRESHOLD) }}>LIKE</span>}
      {top && dx < -30 && <span className="absolute top-8 right-6 px-3 py-1 rounded-xl border-4 border-red-400 text-red-300 font-black text-2xl rotate-12" style={{ opacity: Math.min(1, -dx / THRESHOLD) }}>PASS</span>}
      <button onPointerDown={(e) => e.stopPropagation()} onClick={onReport} aria-label="Report" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white/90 flex items-center justify-center cursor-pointer"><Flag className="w-4 h-4" /></button>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-2 pointer-events-none">
        {ask.plan_title && <p className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-extrabold"><Calendar className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{ask.plan_title}</span></p>}
        <p className="text-[20px] font-extrabold leading-tight">{ask.body}</p>
        <p className="text-[12px] font-bold flex items-center gap-1.5 flex-wrap text-white/90">
          <span>@{ask.handle || 'someone'}</span>
          {ask.verified && <BadgeCheck className="w-4 h-4 text-green-300" aria-label="Verified" />}
          {ask.trusted && <span className="inline-flex items-center gap-0.5 text-green-300"><ShieldCheck className="w-4 h-4" />Trusted</span>}
        </p>
        <p className="text-[12px] font-semibold text-white/80 flex items-center gap-1 flex-wrap">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{ask.area}</span>
          {distanceKm != null && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#2D6A4F]/90 text-white text-[10px] font-black">
              <Navigation className="w-2.5 h-2.5" />
              {formatKm(distanceKm)}
            </span>
          )}
          <span>· {timeLeft(ask.expires_at)}</span>
        </p>
      </div>
    </div>
  );
};

const AsksSection: React.FC<Props> = ({ signedIn, showToast, onNeedSignIn, onChatOpened, spots, events }) => {
  const [area, setArea] = useState(getMyArea());
  const [asks, setAsks] = useState<Ask[] | null>(null);
  const [showArea, setShowArea] = useState(false);
  const [view, setView] = useState<'swipe' | 'mine'>('swipe');
  const [composing, setComposing] = useState(false);
  const [pullingUp, setPullingUp] = useState<Ask | null>(null);
  const [burst, setBurst] = useState(0);
  const [viewing, setViewing] = useState<string | null>(null);
  const [replies, setReplies] = useState<AskReply[]>([]);
  const [reporting, setReporting] = useState<Ask | null>(null);

  const [offline, setOffline] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    inflight.current?.abort(); // a newer search replaces an older one, so slow answers never overwrite fresh ones
    if (!signedIn) { setAsks([]); return; }
    const ctl = new AbortController(); inflight.current = ctl;
    const res = await fetchAsks(area, ctl.signal);
    if (ctl.signal.aborted) return;
    if (res === null) { setOffline(true); setAsks((p) => p ?? []); return; } // keep what is already on screen
    setOffline(false); setAsks(res);
  }, [area, signedIn]);
  useEffect(() => { const t = setTimeout(() => void load(), 350); return () => { clearTimeout(t); inflight.current?.abort(); }; }, [load]);
  useEffect(() => { if (!burst) return; const t = setTimeout(() => setBurst(0), 650); return () => clearTimeout(t); }, [burst]);
  useEffect(() => { if (viewing) void fetchReplies(viewing).then(setReplies); }, [viewing]);

  const near = useNearYou();

  const resolveAskCoords = useCallback((a: Ask) => {
    if (a.plan_kind === 'spot' && a.plan_ref && Array.isArray(spots)) {
      const sp = spots.find((s) => String(s.id) === String(a.plan_ref));
      if (sp && hasRealCoords(sp)) return { lat: Number(sp.lat), lng: Number(sp.lng) };
    }
    if (a.plan_kind === 'event' && a.plan_ref && Array.isArray(events)) {
      const ev = events.find((e) => String(e.id) === String(a.plan_ref));
      if (ev && hasRealCoords(ev)) return { lat: Number(ev.lat), lng: Number(ev.lng) };
    }
    return resolveLocationTextCoords(`${a.area || ''} ${a.plan_title || ''}`);
  }, [spots, events]);

  const deckEntries = useMemo(() => {
    const base = (asks || []).filter((a) => !a.mine && !a.replied);
    if (!near.active || !near.origin) {
      return base.map((ask) => ({ ask, distanceKm: null as number | null }));
    }
    const origin = near.origin;
    return base
      .map((ask) => {
        const coords = resolveAskCoords(ask);
        const distanceKm = coords ? haversineKm(origin, coords) : null;
        return { ask, distanceKm };
      })
      .filter((item) => item.distanceKm != null && (!near.radiusKm || item.distanceKm <= near.radiusKm))
      .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
  }, [asks, near.active, near.origin, near.radiusKm, resolveAskCoords]);

  const deck = useMemo(() => deckEntries.map((x) => x.ask), [deckEntries]);
  const mine = (asks || []).filter((a) => a.mine);
  const drop = (id: string) => setAsks((p) => (p || []).filter((a) => a.id !== id));

  const swiped = (a: Ask, dir: 'left' | 'right') => {
    if (dir === 'left') { void passAsk(a.id); drop(a.id); return; }
    setBurst(Date.now());
    void likeAsk(a.id);
    drop(a.id);
  };
  const pulledUp = (a: Ask) => { drop(a.id); setPullingUp(null); };
  const accept = async (r: AskReply) => {
    const { chatId, error } = await acceptReply(r.id);
    if (error || !chatId) return showToast(error || 'Could not open the chat.');
    showToast(`You let @${r.handle || 'them'} in. Chat opened.`); onChatOpened?.(chatId);
    setReplies((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'accepted' } : x)));
  };
  const decline = async (r: AskReply) => { const err = await declineReply(r.id); if (err) return showToast(err); setReplies((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'declined' } : x))); };
  const close = async (a: Ask) => { const err = await closeAsk(a.id); if (err) return showToast(err); showToast('Rada closed.'); void load(); };
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
        <button onClick={() => setShowArea((v) => !v)} aria-label="Filter by location" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 ${area || showArea ? 'bg-[#E0533C]/15' : 'bg-slate-100 dark:bg-white/[0.06]'}`}><MapPin className="w-4 h-4 text-[#E0533C]" /></button>
        {(showArea || area) && (
          <label className="flex-1 flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-3 py-2 text-[12px] font-bold">
            <input autoFocus={showArea && !area} value={area} onChange={(e) => { setArea(e.target.value); setMyArea(e.target.value); }} placeholder="Type a place" className="bg-transparent flex-1 min-w-0 outline-none placeholder:font-semibold" />
            {area && <button onClick={() => { setArea(''); setMyArea(''); setShowArea(false); }} aria-label="Clear" className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
          </label>
        )}
        <button onClick={() => setComposing(true)} className="ml-auto px-4 py-2.5 rounded-full bg-[#E0533C] text-white font-extrabold text-xs inline-flex items-center gap-1 active:scale-95 cursor-pointer"><Plus className="w-3.5 h-3.5" />Rada?</button>
      </div>
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-full text-[12px] text-center">
        {([['swipe', 'Discover'], ['mine', `My posts${mine.length ? ` (${mine.length})` : ''}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`flex-1 py-1.5 rounded-full cursor-pointer ${view === id ? 'font-extrabold bg-white dark:bg-[#1C1A1E] text-[#E0533C] shadow-sm' : 'font-semibold text-slate-500'}`}>{label}</button>
        ))}
      </div>
      {view === 'swipe' && <NearYouControl />}
      {composing && <AskComposer defaultArea={area} onClose={() => setComposing(false)} onPosted={() => { setComposing(false); void load(); }} showToast={showToast} spots={spots} events={events} />}

      {offline && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 px-3 py-2 text-[12px] font-semibold">
          <span>Couldn't refresh just now. What you see is still fine.</span>
          <button onClick={() => void load()} className="font-extrabold underline cursor-pointer">Try again</button>
        </div>
      )}
      {asks === null && <p className="text-[13px] text-slate-500 text-center py-10">Loading…</p>}

      {asks && view === 'swipe' && (deck.length === 0
        ? <p className="text-[13px] text-slate-500 text-center py-12">You're all caught up{near.active ? ' near you' : area ? ` near ${area}` : ''}. Post a rada or check back soon.</p>
        : (
          <>
            <div className="relative w-full aspect-[4/5] max-h-[62vh] mx-auto">
              {burst > 0 && <Heart key={burst} className="absolute left-1/2 top-1/2 -ml-10 -mt-10 w-20 h-20 text-[#E0533C] fill-[#E0533C] z-20 pointer-events-none animate-ping" aria-hidden="true" />}
              {deckEntries.slice(0, 3).map(({ ask: a, distanceKm }, i) => ({ a, distanceKm, i })).reverse().map(({ a, distanceKm, i }) => (
                <SwipeCard key={a.id} ask={a} distanceKm={distanceKm} top={i === 0} depth={i} onSwipe={(d) => swiped(a, d)} onReport={() => setReporting(a)} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button onClick={() => buttonSwipe('left')} aria-label="Pass, next" className="w-14 h-14 shrink-0 rounded-full bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10 shadow-md flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer active:scale-90 transition"><X className="w-6 h-6" /></button>
              <button onClick={() => deck[0] && setPullingUp(deck[0])} aria-label="Reply" className="h-14 flex-1 max-w-[180px] rounded-full bg-gradient-to-br from-[#E0533C] to-[#EE8A47] shadow-lg shadow-[#E0533C]/30 flex items-center justify-center gap-1.5 text-white text-[14px] font-black cursor-pointer active:scale-95 transition"><Reply className="w-5 h-5" />Reply</button>
              <button onClick={() => buttonSwipe('right')} aria-label="Like, next" className="w-14 h-14 shrink-0 rounded-full bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10 shadow-md flex items-center justify-center text-[#E0533C] cursor-pointer active:scale-90 transition"><Heart className="w-6 h-6" /></button>
            </div>
          </>
        ))}

      {asks && view === 'mine' && (mine.length === 0
        ? <p className="text-[13px] text-slate-500 text-center py-10">You have no live posts.</p>
        : mine.map((a) => (
          <div key={a.id} className={`${CARD} rounded-3xl p-4 space-y-2`}>
            {a.media_url && (a.media_type === 'video' ? <video src={a.media_url} className="w-full max-h-56 rounded-2xl object-cover" controls playsInline preload="metadata" /> : <img src={a.media_url} alt="" loading="lazy" className="w-full max-h-56 rounded-2xl object-cover" />)}
            {a.plan_title && <p className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] text-[11px] font-extrabold"><Calendar className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{a.plan_title}</span></p>}
            <p className="text-[14px] font-semibold leading-snug">{a.body}</p>
            <p className="text-[11px] text-slate-400 font-bold">{a.area} · {timeLeft(a.expires_at)}</p>
            <div className="flex gap-2">
              <button onClick={() => setViewing(viewing === a.id ? null : a.id)} className="flex-1 py-2 rounded-full bg-slate-100 dark:bg-white/[0.08] text-xs font-extrabold cursor-pointer inline-flex items-center justify-center gap-1"><Reply className="w-3.5 h-3.5 text-[#E0533C]" />Reply ({a.replies})</button>
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
                        <button onClick={() => accept(r)} className="px-3 py-1.5 rounded-full bg-[#2D6A4F] text-white text-[11px] font-extrabold cursor-pointer">Chat</button>
                        <button onClick={() => decline(r)} className="px-3 py-1.5 rounded-full text-slate-500 text-[11px] font-extrabold cursor-pointer">Not now</button>
                      </div>
                    ) : <p className="text-[11px] font-bold text-slate-400">{r.status === 'accepted' ? 'In the chat' : 'Not now'}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )))}

      {pullingUp && <PullUpSheet ask={pullingUp} showToast={showToast} onClose={() => setPullingUp(null)} onSent={pulledUp} />}

      {reporting && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setReporting(null)}>
          <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl p-4 w-full max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="font-extrabold">Report this rada</p>
            {REPORT_REASONS.map(([id, label]) => <button key={id} onClick={() => report(id, false)} className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] text-[13px] font-semibold cursor-pointer">{label}</button>)}
            <button onClick={() => report('other', true)} className="w-full px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-[13px] font-extrabold cursor-pointer">Report and block @{reporting.handle || 'this person'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AsksSection;
