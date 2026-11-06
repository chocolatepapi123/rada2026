import React, { useEffect, useState } from 'react';
import { X, Play, MapPin, Calendar, Users, CalendarHeart, Bookmark, BookmarkCheck, Hand, Loader2 } from 'lucide-react';
import { Hangout, listHangouts, toggleJoinNext, myJoinedHangoutIds } from '../lib/hangouts';
import { getCachedBlockedIds, onBlockedChanged, fetchBlockedIds } from '../lib/safety';

interface Props {
  viewedId: string;
  currentUserId?: string;
  accent: string;
  handle: string;
  /** Spots that exist in RADA, so a hangout's spot can be saved or planned. Only the id is needed. */
  spots: { id: number | string }[];
  isSpotSaved: (spotId: string) => boolean;
  onSaveSpot: (spotId: string) => void;
  onPlanDateAtSpot: (spotId: string) => void;
  onSayHi: () => void;
  showToast: (msg: string, options?: any) => void;
  onNeedLogin: () => void;
}

const prettyDate = (d?: string | null) => {
  if (!d) return '';
  const t = new Date(d + 'T00:00:00');
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const UserHangouts: React.FC<Props> = ({
  viewedId, currentUserId, accent, handle, spots, isSpotSaved, onSaveSpot, onPlanDateAtSpot, onSayHi, showToast, onNeedLogin,
}) => {
  const [items, setItems] = useState<Hangout[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Hangout | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(() => getCachedBlockedIds().includes(viewedId));

  // Hide everything from people I blocked, and react if the list changes while this is open.
  useEffect(() => {
    const check = () => setBlocked(getCachedBlockedIds().includes(viewedId));
    check();
    const off = onBlockedChanged(check);
    if (currentUserId) fetchBlockedIds().then(check).catch(() => {});
    return off;
  }, [viewedId, currentUserId]);

  useEffect(() => {
    let off = false;
    setItems([]);
    setOpen(null);
    if (!currentUserId || blocked) return;
    listHangouts(viewedId, { drafts: 'exclude' }).then(async (list) => {
      if (off) return;
      setItems(list);
      const mine = await myJoinedHangoutIds(currentUserId, list.map((h) => h.id));
      if (!off) setJoined(mine);
    });
    return () => { off = true; };
  }, [viewedId, currentUserId, blocked]);

  if (!currentUserId || blocked || items.length === 0) return null;

  const spotKnown = (h: Hangout) => !!h.spotId && spots.some((s) => String(s.id) === String(h.spotId));

  const join = async (h: Hangout) => {
    setBusy(true);
    const r = await toggleJoinNext({ id: h.id, userId: h.userId }, currentUserId);
    setBusy(false);
    if (r.error) { showToast('Could not do that. Try again.', { type: 'error' }); return; }
    setJoined((prev) => { const n = new Set(prev); r.joined ? n.add(h.id) : n.delete(h.id); return n; });
    showToast(r.joined ? `Nice. ${handle} will see you want to join next time.` : 'Removed your request.');
  };

  const btn = 'py-3 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition active:scale-[0.98]';

  return (
    <div className="px-4 mt-5">
      <h4 className="text-[12px] font-black text-slate-500 mb-1.5">Hangouts</h4>
      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
        {items.map((h) => {
          const first = h.media[0];
          return (
            <button key={h.id} type="button" onClick={() => setOpen(h)} className="relative aspect-square bg-slate-200 dark:bg-slate-800 overflow-hidden cursor-pointer">
              {first && (first.kind === 'video'
                ? <video src={first.url + '#t=0.1'} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                : <img src={first.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />)}
              {first?.kind === 'video' && <Play className="absolute top-1.5 right-1.5 w-4 h-4 text-white drop-shadow" fill="white" />}
              {h.media.length > 1 && <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black text-white bg-black/50 rounded-full px-1.5 py-0.5">{h.media.length}</span>}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-200">
          <div className="shrink-0 px-2 py-2 flex items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"><X className="w-6 h-6" /></button>
            <p className="flex-1 text-center text-[15px] font-black truncate pr-10">{handle}&apos;s hangout</p>
          </div>
          <div className="flex-1 overflow-y-auto pb-6">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
              {open.media.map((m) => (
                <div key={m.id} className="snap-center shrink-0 w-full bg-black flex items-center justify-center" style={{ maxHeight: '55vh' }}>
                  {m.kind === 'video'
                    ? <video src={m.url} controls playsInline preload="metadata" className="w-full max-h-[55vh]" />
                    : <img src={m.url} alt="" className="w-full max-h-[55vh] object-contain" />}
                </div>
              ))}
            </div>
            {open.media.length > 1 && <p className="text-center text-[11px] text-slate-400 mt-1">Swipe for more ({open.media.length})</p>}

            <div className="px-4 mt-3 space-y-3">
              {open.caption && <p className="text-[15px] leading-snug">{open.caption}</p>}
              <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                {(open.spotTitle || open.area) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><MapPin className="w-3.5 h-3.5" style={{ color: accent }} />{[open.spotTitle, open.area].filter(Boolean).join(' · ')}</span>
                )}
                {open.happenedOn && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><Calendar className="w-3.5 h-3.5" style={{ color: accent }} />{prettyDate(open.happenedOn)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" disabled={busy} onClick={() => join(open)}
                  className={`${btn} ${joined.has(open.id) ? 'bg-slate-100 dark:bg-slate-800' : 'text-white'}`}
                  style={joined.has(open.id) ? { color: accent } : { background: accent }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {joined.has(open.id) ? 'Joining next time ✓' : 'Join next time'}
                </button>
                <button type="button" onClick={() => { onSayHi(); setOpen(null); }} className={`${btn} bg-slate-100 dark:bg-slate-800`}>
                  <Hand className="w-4 h-4" style={{ color: accent }} /> Say hi
                </button>
                {spotKnown(open) && (
                  <>
                    <button type="button" onClick={() => { onPlanDateAtSpot(String(open.spotId)); setOpen(null); }} className={`${btn} bg-slate-100 dark:bg-slate-800`}>
                      <CalendarHeart className="w-4 h-4" style={{ color: accent }} /> Plan a date here
                    </button>
                    <button type="button" onClick={() => onSaveSpot(String(open.spotId))} className={`${btn} bg-slate-100 dark:bg-slate-800`}>
                      {isSpotSaved(String(open.spotId)) ? <BookmarkCheck className="w-4 h-4" style={{ color: accent }} /> : <Bookmark className="w-4 h-4" style={{ color: accent }} />}
                      {isSpotSaved(String(open.spotId)) ? 'Spot saved' : 'Save this spot'}
                    </button>
                  </>
                )}
              </div>
              {!spotKnown(open) && open.spotTitle && <p className="text-[11px] text-slate-400">This place is not a RADA spot yet, so it can&apos;t be saved or planned.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
