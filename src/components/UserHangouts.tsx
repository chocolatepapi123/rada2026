import React, { useEffect, useState } from 'react';
import { X, Play, MapPin, Calendar, CalendarHeart, Bookmark, BookmarkCheck } from 'lucide-react';
import { Hangout, listHangouts } from '../lib/hangouts';
import { getCachedBlockedIds, onBlockedChanged, fetchBlockedIds } from '../lib/safety';

interface Props {
  viewedId: string;
  currentUserId?: string;
  accent: string;
  handle: string;
  /** Spots that exist in RADA, so a diary spot can be saved or planned. Only the id is needed. */
  spots: { id: number | string }[];
  isSpotSaved: (spotId: string) => boolean;
  onSaveSpot: (spotId: string) => void;
  onPlanDateAtSpot: (spotId: string) => void;
  hideHeading?: boolean;
  showEmptyState?: boolean;
  onCountChange?: (count: number) => void;
}

const prettyDate = (d?: string | null) => {
  if (!d) return '';
  const t = new Date(d + 'T00:00:00');
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const UserHangouts: React.FC<Props> = ({
  viewedId,
  currentUserId,
  accent,
  handle,
  spots,
  isSpotSaved,
  onSaveSpot,
  onPlanDateAtSpot,
  hideHeading = false,
  showEmptyState = false,
  onCountChange,
}) => {
  const [items, setItems] = useState<Hangout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Hangout | null>(null);
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
    if (blocked) {
      setLoading(false);
      onCountChange?.(0);
      return;
    }
    setLoading(true);
    listHangouts(viewedId, { drafts: 'exclude' }).then((list) => {
      if (off) return;
      setItems(list);
      setLoading(false);
      onCountChange?.(list.length);
    });
    return () => { off = true; };
  }, [viewedId, blocked, onCountChange]);

  if (blocked) return null;
  if (!loading && items.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className="px-4 mt-4">
        <div className="py-10 px-4 text-center rounded-3xl bg-slate-50 dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
          <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">No diary entries yet</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            When {handle} shares spots and hangouts in their diary, they will appear here.
          </p>
        </div>
      </div>
    );
  }
  if (items.length === 0) return null;

  const spotKnown = (h: Hangout) => !!h.spotId && spots.some((s) => String(s.id) === String(h.spotId));

  const btn = 'py-3 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition active:scale-[0.98]';

  return (
    <div className={hideHeading ? 'px-4 mt-3' : 'px-4 mt-5'}>
      {!hideHeading && <h4 className="text-[12px] font-black text-slate-500 mb-1.5">Diary</h4>}
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
            <p className="flex-1 text-center text-[15px] font-black truncate pr-10">{handle}&apos;s diary</p>
          </div>
          <div className="flex-1 overflow-y-auto pb-6">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar items-start">
              {open.media.map((m) => (
                <div key={m.id} className="snap-center shrink-0 w-full">
                  {m.kind === 'video'
                    ? <video src={m.url} controls playsInline preload="metadata" className="block w-full h-auto max-h-[65vh] object-cover" />
                    : <img src={m.url} alt="" className="block w-full h-auto max-h-[65vh] object-cover" />}
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
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <Calendar className="w-3.5 h-3.5" style={{ color: accent }} />
                    {prettyDate(open.happenedOn)}
                  </span>
                )}
              </div>

              {spotKnown(open) && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => { onPlanDateAtSpot(String(open.spotId)); setOpen(null); }} className={`${btn} bg-slate-100 dark:bg-slate-800`}>
                    <CalendarHeart className="w-4 h-4" style={{ color: accent }} /> Plan a date here
                  </button>
                  <button type="button" onClick={() => onSaveSpot(String(open.spotId))} className={`${btn} bg-slate-100 dark:bg-slate-800`}>
                    {isSpotSaved(String(open.spotId)) ? <BookmarkCheck className="w-4 h-4" style={{ color: accent }} /> : <Bookmark className="w-4 h-4" style={{ color: accent }} />}
                    {isSpotSaved(String(open.spotId)) ? 'Spot saved' : 'Save this spot'}
                  </button>
                </div>
              )}
              {!spotKnown(open) && open.spotTitle && <p className="text-[11px] text-slate-400">This place is not a RADA PULSE spot yet, so it can&apos;t be saved or planned.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
