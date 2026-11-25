import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, CalendarPlus, MapPin } from 'lucide-react';
import { fetchGroups, fetchMeetups, postMeetup, setGroupMembership, type InterestGroup, type Meetup } from '../lib/interestGroups.ts';
import RecapCard from './RecapCard.tsx';

const CARD = 'bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10';
const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const GroupsSection: React.FC<{ signedIn: boolean; showToast: (m: string) => void; onNeedSignIn?: () => void }> = ({ signedIn, showToast, onNeedSignIn }) => {
  const [groups, setGroups] = useState<InterestGroup[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [form, setForm] = useState({ title: '', place: '', when: '' });
  const [busy, setBusy] = useState(false);
  const [recap, setRecap] = useState(false);

  const load = useCallback(async () => setGroups(await fetchGroups()), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (open) void fetchMeetups(open).then(setMeetups); }, [open]);

  const toggle = async (g: InterestGroup) => {
    if (!signedIn) { onNeedSignIn?.(); return; }
    setBusy(true);
    const err = await setGroupMembership(g.id, !g.joined);
    setBusy(false);
    if (err) return showToast(err);
    showToast(g.joined ? `Left ${g.name}.` : `You joined ${g.name}.`);
    void load();
  };
  const post = async (g: InterestGroup) => {
    const d = new Date(form.when);
    if (!form.when || Number.isNaN(d.getTime())) return showToast('Pick a date and time.');
    setBusy(true);
    const err = await postMeetup(g.id, form.title, form.place, d);
    setBusy(false);
    if (err) return showToast(err);
    showToast('Meetup posted.');
    setForm({ title: '', place: '', when: '' });
    void load(); void fetchMeetups(g.id).then(setMeetups);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Interest groups</h3>
        {signedIn && (
          <button onClick={() => setRecap(true)} className="px-3 py-1.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] font-extrabold text-xs inline-flex items-center gap-1.5 active:scale-95 cursor-pointer">
            <Calendar className="w-3.5 h-3.5" /> My month
          </button>
        )}
      </div>
      {groups === null && <p className="text-[13px] text-slate-500 text-center py-6">Loading groups…</p>}
      {groups?.length === 0 && <p className="text-[13px] text-slate-500 text-center py-6">Groups are not available right now. Try again later.</p>}
      {groups?.map((g) => (
        <div key={g.id} className={`${CARD} rounded-3xl p-4 space-y-3`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl leading-none">{g.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-[15px]">{g.name}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{g.blurb}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">{g.members} {g.members === 1 ? 'member' : 'members'}</p>
            </div>
            <button disabled={busy} onClick={() => toggle(g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold active:scale-95 cursor-pointer ${g.joined ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300' : 'bg-[#E0533C] text-white'}`}>
              {g.joined ? 'Joined' : 'Join'}
            </button>
          </div>
          {g.next_title && (
            <button onClick={() => setOpen(open === g.id ? null : g.id)} className="w-full text-left rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2 cursor-pointer">
              <p className="text-[12px] font-extrabold">{g.next_title}</p>
              <p className="text-[11px] text-slate-500 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{g.next_place} · {g.next_starts && when(g.next_starts)}</p>
            </button>
          )}
          {!g.next_title && <button onClick={() => setOpen(open === g.id ? null : g.id)} className="text-[12px] font-bold text-slate-400 cursor-pointer">No meetups yet{g.joined ? ' · be the first' : ''}</button>}
          {open === g.id && (
            <div className="space-y-2">
              {meetups.slice(1).map((m) => (
                <p key={m.id} className="text-[12px] text-slate-600 dark:text-slate-300"><b>{m.title}</b> · {m.place} · {when(m.starts_at)}</p>
              ))}
              {g.joined ? (
                <div className="space-y-2 pt-1">
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="What's the plan? e.g. Ngong Hills sunrise" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-[13px]" />
                  <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} maxLength={120} placeholder="Where to meet" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-[13px]" />
                  <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-[13px]" />
                  <button disabled={busy} onClick={() => post(g)} className="w-full py-2.5 rounded-full bg-[#2D6A4F] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                    <CalendarPlus className="w-3.5 h-3.5" /> Post meetup
                  </button>
                </div>
              ) : <p className="text-[11px] text-slate-400">Join the group to post a meetup.</p>}
            </div>
          )}
        </div>
      ))}
      {recap && <RecapCard onClose={() => setRecap(false)} showToast={showToast} />}
    </div>
  );
};
export default GroupsSection;
