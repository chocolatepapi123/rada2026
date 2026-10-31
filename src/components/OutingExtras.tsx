import React, { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, Clock, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Shown on a full outing: join the waitlist (hosts on Pro or Elite) and get notified when a spot opens. */
export const WaitlistButton: React.FC<{ outingId: string }> = ({ outingId }) => {
  const [state, setState] = useState<{ on: boolean; position?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    if (!isSupabaseConfigured) return;
    supabase.rpc('get_my_waitlist', { p_outing: outingId }).then(({ data }) => {
      if (live && data) setState({ on: !!(data as any).on_waitlist, position: (data as any).position });
    });
    return () => { live = false; };
  }, [outingId]);

  const join = async () => {
    setBusy(true);
    setErr('');
    const { data, error } = await supabase.rpc('join_outing_waitlist', { p_outing: outingId });
    setBusy(false);
    if (error) return setErr(error.message);
    setState({ on: true, position: (data as any)?.position });
  };
  const leave = async () => {
    setBusy(true);
    await supabase.rpc('leave_outing_waitlist', { p_outing: outingId });
    setBusy(false);
    setState({ on: false });
  };

  return (
    <div className="mt-1.5 space-y-1">
      {state?.on ? (
        <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); leave(); }} className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[11px] font-black flex items-center gap-1.5 cursor-pointer">
          <Clock className="w-3.5 h-3.5" /> On the waitlist{state.position ? ` (#${state.position})` : ''} · Leave
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); join(); }} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[11px] font-black flex items-center gap-1.5 cursor-pointer">
          <Clock className="w-3.5 h-3.5" /> {busy ? '…' : 'Join waitlist'}
        </button>
      )}
      {err && <p className="text-[10px] text-slate-500">{err}</p>}
    </div>
  );
};

export interface OutingTemplateData {
  spotId?: string | number | null;
  description?: string;
  maxAttendees?: number;
  accessType?: 'open' | 'singles_only';
  tags?: string[];
}
interface TemplateRow { id: string; name: string; data: OutingTemplateData }

/** Event templates: save the current plan setup once, reuse it for repeat outings. */
export const TemplatePicker: React.FC<{ current: OutingTemplateData; onApply: (d: OutingTemplateData) => void; userId?: string | null }> = ({ current, onApply, userId }) => {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return;
    const { data } = await supabase.from('outing_templates').select('id,name,data').order('created_at', { ascending: false });
    setRows((data as TemplateRow[]) || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  if (!userId) return null;

  const save = async () => {
    setErr('');
    const { error } = await supabase.from('outing_templates').insert({ owner_id: userId, name: name.trim(), data: current });
    if (error) return setErr(error.message);
    setName('');
    setNaming(false);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from('outing_templates').delete().eq('id', id);
    load();
  };

  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
      <p className="text-[11px] font-black">Templates</p>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((t) => (
            <span key={t.id} className="inline-flex items-center rounded-full bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <button type="button" onClick={() => onApply(t.data)} className="pl-3 pr-1.5 py-1 cursor-pointer">{t.name}</button>
              <button type="button" onClick={() => remove(t.id)} className="pr-2 py-1 text-slate-400 cursor-pointer" aria-label={`Delete template ${t.name}`}><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      {naming ? (
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Template name" className="flex-1 min-w-0 rounded-xl bg-white dark:bg-[#121113] px-3 py-1.5 text-xs outline-none" />
          <button type="button" disabled={!name.trim()} onClick={save} className="px-3 py-1.5 rounded-xl bg-[#E0533C] disabled:opacity-50 text-white text-[11px] font-black cursor-pointer">Save</button>
          <button type="button" onClick={() => setNaming(false)} className="px-2 text-[11px] font-bold text-slate-500 cursor-pointer">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="text-[11px] font-black text-[#E0533C] flex items-center gap-1 cursor-pointer">
          <BookmarkPlus className="w-3.5 h-3.5" /> Save this setup as a template
        </button>
      )}
      {err && <p className="text-[10px] text-red-500">{err}</p>}
      {rows.length === 0 && !naming && <p className="text-[10px] text-slate-400">Repeat outing? Save it once and reuse it in one tap.</p>}
    </div>
  );
};

/** Day 21-27 style report: only measured numbers from this user's own trial. */
export const TrialReportCard: React.FC<{ kind: 'creator' | 'merchant' }> = ({ kind }) => {
  const [r, setR] = useState<any>(null);
  useEffect(() => {
    let live = true;
    if (!isSupabaseConfigured) return;
    supabase.rpc('get_trial_report', { p_kind: kind }).then(({ data }) => { if (live) setR(data || null); });
    return () => { live = false; };
  }, [kind]);
  if (!r) return null;
  const t = r.totals || {};
  const actions = (t.call || 0) + (t.whatsapp || 0) + (t.website || 0) + (t.directions || 0);
  const stats: [string, number][] = [
    ['Views', t.view || 0],
    ['Taps (call, WhatsApp, web, directions)', actions],
    ['Saves', t.save || 0],
    ['RSVPs', t.rsvp || 0],
  ];
  if (kind === 'creator') stats.push(['Outings hosted', r.outings_hosted || 0]);
  else stats.push(['Offers redeemed', t.offer_redeem || 0]);
  const ends = r.ends_at ? new Date(r.ends_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <div className="rounded-3xl p-4 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-[#E0533C]">Your trial so far</p>
        <p className="text-xs text-slate-500">{r.days_left} {r.days_left === 1 ? 'day' : 'days'} left. Your trial ends on {ends}.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3">
            <p className="text-xl font-black">{n}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Taps show interest, not confirmed visits. When the trial ends, your account and content stay. Paid tools pause and new actions follow Free limits until you pick a plan. Nothing is charged automatically.
      </p>
    </div>
  );
};
