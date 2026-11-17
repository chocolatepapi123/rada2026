import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Users, CalendarDays } from 'lucide-react';
import type { EventItem, OutingPlan } from '../types.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Props {
  events: EventItem[];
  outings: OutingPlan[];
  onOpenEvent: (e: EventItem) => void;
  onOpenOutings: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const localKey = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

interface FriendGoing { event_id: string; handle: string | null }

/** "Tonight": events today, outings today with spots left, and which friends are going. */
export const TonightSection: React.FC<Props> = ({ events, outings, onOpenEvent, onOpenOutings }) => {
  const today = todayKey();
  const tonightEvents = useMemo(
    () => events.filter((e) => (e.startAt ? localKey(e.startAt) === today : e.date === today)).slice(0, 8),
    [events, today]
  );
  const tonightOutings = useMemo(
    () => outings
      .filter((o) => o.date === today && (o.status === 'active' || !o.status) && (o.time || '23:59') >= nowHM())
      .map((o) => ({ o, left: Math.max(0, o.maxAttendees - (o.currentAttendeesCount ?? 1)) }))
      .filter((x) => x.left > 0)
      .sort((a, b) => (a.o.time || '').localeCompare(b.o.time || ''))
      .slice(0, 6),
    [outings, today]
  );

  const [friends, setFriends] = useState<Record<string, string[]>>({});
  const idsKey = tonightEvents.map((e) => String(e.id)).join(',');
  useEffect(() => {
    if (!idsKey || !isSupabaseConfigured) return;
    let off = false;
    (async () => {
      const { data, error } = await supabase.rpc('friends_going', { p_event_ids: idsKey.split(',') });
      if (off || error || !Array.isArray(data)) return;
      const map: Record<string, string[]> = {};
      (data as FriendGoing[]).forEach((r) => { if (r.handle) (map[r.event_id] ||= []).push(r.handle.startsWith('@') ? r.handle : `@${r.handle}`); });
      setFriends(map);
    })();
    return () => { off = true; };
  }, [idsKey]);

  if (tonightEvents.length === 0 && tonightOutings.length === 0) return null;

  const friendLine = (id: string) => {
    const f = friends[id];
    if (!f?.length) return null;
    return f.length === 1 ? `${f[0]} is going` : `${f[0]} and ${f.length - 1} ${f.length === 2 ? 'friend' : 'friends'} going`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-[#E0533C]" />
        <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Tonight</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
        {tonightOutings.map(({ o, left }) => (
          <button key={o.id} type="button" onClick={onOpenOutings}
            className="snap-start shrink-0 w-56 text-left rounded-2xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white p-3.5 shadow-md shadow-[#E0533C]/20 active:scale-[0.98] transition cursor-pointer">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1"><Users className="w-3 h-3" /> Outing · {left} spot{left === 1 ? '' : 's'} left</span>
            <span className="block font-black text-[15px] leading-tight mt-1 line-clamp-2">{o.spotTitle}</span>
            <span className="block text-[11px] opacity-90 mt-1">{o.time} · @{String(o.hostHandle || o.hostName || '').replace(/^@/, '')}</span>
          </button>
        ))}
        {tonightEvents.map((e) => (
          <button key={String(e.id)} type="button" onClick={() => onOpenEvent(e)}
            className="snap-start shrink-0 w-56 text-left rounded-2xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-3.5 active:scale-[0.98] transition cursor-pointer">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E0533C] flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Event{e.time ? ` · ${e.time}` : ''}</span>
            <span className="block font-black text-[15px] leading-tight mt-1 line-clamp-2 text-slate-900 dark:text-slate-100">{e.title}</span>
            <span className="block text-[11px] text-slate-500 mt-1 truncate">{e.location}</span>
            {friendLine(String(e.id)) && <span className="block text-[11px] font-bold text-[#2D6A4F] dark:text-emerald-400 mt-1.5">{friendLine(String(e.id))}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TonightSection;
