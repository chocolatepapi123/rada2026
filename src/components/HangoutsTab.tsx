import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Play, MapPin, Calendar, Trash2, EyeOff, Pencil, Loader2, ChevronLeft, Users, ImagePlus, FileText, Camera, Images } from 'lucide-react';
import {
  Hangout,
  HangoutMedia,
  HANGOUT_LIMITS,
  listHangouts,
  createHangout,
  updateHangout,
  publishHangout,
  unpublishHangout,
  deleteHangout,
  addHangoutMedia,
  removeHangoutMedia,
  checkHangoutFile,
  fetchJoinRequestsForMe,
} from '../lib/hangouts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface HangoutSpotOption {
  id: number | string;
  title: string;
  neighborhood?: string;
}

interface Props {
  userId: string;
  accent: string;
  showToast: (msg: string, options?: any) => void;
  spots?: HangoutSpotOption[];
}

type View = { kind: 'list' } | { kind: 'edit'; hangout: Hangout | null } | { kind: 'detail'; hangout: Hangout } | { kind: 'joins' };

interface Pending { key: string; file: File; preview: string; isVideo: boolean }
interface Requester { id: string; name: string; avatar?: string }

const prettyDate = (d?: string | null) => {
  if (!d) return '';
  const t = new Date(d + 'T00:00:00');
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const Thumb: React.FC<{ h: Hangout; draft?: boolean }> = ({ h, draft }) => {
  const first = h.media[0];
  return (
    <div className="relative w-full aspect-square bg-slate-200 dark:bg-slate-800 overflow-hidden">
      {first ? (
        first.kind === 'video' ? (
          <video src={first.url + '#t=0.1'} muted playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : (
          <img src={first.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400"><ImagePlus className="w-6 h-6" /></div>
      )}
      {first?.kind === 'video' && <Play className="absolute top-1.5 right-1.5 w-4 h-4 text-white drop-shadow" fill="white" />}
      {h.media.length > 1 && <span className="absolute bottom-1.5 right-1.5 text-[10px] font-black text-white bg-black/50 rounded-full px-1.5 py-0.5">{h.media.length}</span>}
      {draft && <span className="absolute top-1.5 left-1.5 text-[10px] font-black bg-white/90 text-slate-800 rounded-full px-2 py-0.5">Draft</span>}
    </div>
  );
};

export const HangoutsTab: React.FC<Props> = ({ userId, accent, showToast, spots = [] }) => {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [published, setPublished] = useState<Hangout[]>([]);
  const [drafts, setDrafts] = useState<Hangout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [joinCount, setJoinCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [pub, dr, joins] = await Promise.all([
      listHangouts(userId, { drafts: 'exclude' }),
      listHangouts(userId, { drafts: 'only' }),
      fetchJoinRequestsForMe(userId),
    ]);
    setPublished(pub);
    setDrafts(dr);
    setJoinCount(joins.length);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const back = async () => { setView({ kind: 'list' }); await load(); };

  if (view.kind === 'edit') {
    return <Editor userId={userId} accent={accent} showToast={showToast} spots={spots} hangout={view.hangout} onDone={back} />;
  }
  if (view.kind === 'detail') {
    return <Detail h={view.hangout} accent={accent} showToast={showToast} onBack={back} onEdit={() => setView({ kind: 'edit', hangout: view.hangout })} />;
  }
  if (view.kind === 'joins') {
    return <Joins userId={userId} accent={accent} hangouts={[...published, ...drafts]} onBack={back} />;
  }

  const list = showDrafts ? drafts : published;
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-2">
        <div className="flex p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[12px] font-bold">
          {([[false, `Posted ${published.length}`], [true, `Drafts ${drafts.length}`]] as [boolean, string][]).map(([v, label]) => (
            <button key={label} type="button" onClick={() => setShowDrafts(v)}
              className={`px-3 py-1.5 rounded-full cursor-pointer ${showDrafts === v ? 'bg-white dark:bg-[#1C1A1E] shadow-sm' : 'text-slate-500'}`}>{label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <button type="button" onClick={() => setView({ kind: 'joins' })}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer">
          <Users className="w-4 h-4" style={{ color: accent }} /> Join requests{joinCount > 0 ? ` (${joinCount})` : ''}
        </button>
      </div>

      <button type="button" onClick={() => setView({ kind: 'edit', hangout: null })}
        className="mt-3 w-full py-3 rounded-2xl text-white text-[14px] font-black flex items-center justify-center gap-2 cursor-pointer" style={{ background: accent }}>
        <Plus className="w-5 h-5" /> Add hangout
      </button>

      {loading ? (
        <p className="text-[13px] text-slate-400 py-8 text-center">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-10 text-center">
          {showDrafts ? 'No drafts. Anything you save as a draft stays private to you.' : 'No hangouts yet. Add photos or videos from places you have been with friends.'}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
          {list.map((h) => (
            <button key={h.id} type="button" className="cursor-pointer" onClick={() => setView(showDrafts ? { kind: 'edit', hangout: h } : { kind: 'detail', hangout: h })}>
              <Thumb h={h} draft={showDrafts} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const Detail: React.FC<{ h: Hangout; accent: string; showToast: Props['showToast']; onBack: () => void; onEdit: () => void }> = ({ h, accent, showToast, onBack, onEdit }) => {
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const run = async (fn: () => Promise<string | null>, ok: string) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) showToast(err, { type: 'error' });
    else { showToast(ok); onBack(); }
  };
  return (
    <div className="pb-6">
      <button type="button" onClick={onBack} className="m-2 inline-flex items-center gap-1 text-[13px] font-bold cursor-pointer"><ChevronLeft className="w-5 h-5" /> Hangouts</button>
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar items-start">
        {h.media.map((m) => (
          <div key={m.id} className="snap-center shrink-0 w-full">
            {m.kind === 'video'
              ? <video src={m.url} controls playsInline preload="metadata" className="block w-full h-auto max-h-[70vh] object-cover" />
              : <img src={m.url} alt="" className="block w-full h-auto max-h-[70vh] object-cover" />}
          </div>
        ))}
      </div>
      {h.media.length > 1 && <p className="text-center text-[11px] text-slate-400 mt-1">Swipe for more ({h.media.length})</p>}
      <div className="px-4 mt-3 space-y-2">
        {h.caption && <p className="text-[15px] leading-snug">{h.caption}</p>}
        <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
          {(h.spotTitle || h.area) && <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><MapPin className="w-3.5 h-3.5" style={{ color: accent }} />{[h.spotTitle, h.area].filter(Boolean).join(' · ')}</span>}
          {h.happenedOn && <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><Calendar className="w-3.5 h-3.5" style={{ color: accent }} />{prettyDate(h.happenedOn)}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3">
          <button type="button" disabled={busy} onClick={onEdit} className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"><Pencil className="w-4 h-4" />Edit</button>
          <button type="button" disabled={busy} onClick={() => run(() => unpublishHangout(h.id), 'Moved to drafts.')} className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"><EyeOff className="w-4 h-4" />Unpublish</button>
          <button type="button" disabled={busy} onClick={() => (confirmDel ? run(() => deleteHangout(h), 'Hangout deleted.') : setConfirmDel(true))}
            className={`py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${confirmDel ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-600'}`}><Trash2 className="w-4 h-4" />{confirmDel ? 'Tap to confirm' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const Editor: React.FC<{ userId: string; accent: string; showToast: Props['showToast']; spots: HangoutSpotOption[]; hangout: Hangout | null; onDone: () => void }> = ({ userId, accent, showToast, spots, hangout, onDone }) => {
  const [step, setStep] = useState<1 | 2>(hangout ? 2 : 1);
  const [existing, setExisting] = useState<HangoutMedia[]>(hangout?.media || []);
  const [removed, setRemoved] = useState<HangoutMedia[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [current, setCurrent] = useState(0);
  const [caption, setCaption] = useState(hangout?.caption || '');
  const [spotId, setSpotId] = useState<string | null>(hangout?.spotId ?? null);
  const [spotText, setSpotText] = useState(hangout?.spotTitle || '');
  const [area, setArea] = useState<string | null>(hangout?.area ?? null);
  const [date, setDate] = useState(hangout?.happenedOn || new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState<string | null>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Pending[]>([]);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  type Slot = { key: string; url: string; isVideo: boolean; remove: () => void };
  const slots: Slot[] = [
    ...existing.map((m): Slot => ({ key: m.id, url: m.url, isVideo: m.kind === 'video', remove: () => { setExisting((x) => x.filter((y) => y.id !== m.id)); setRemoved((r) => [...r, m]); } })),
    ...pending.map((m): Slot => ({ key: m.key, url: m.preview, isVideo: m.isVideo, remove: () => { URL.revokeObjectURL(m.preview); setPending((x) => x.filter((y) => y.key !== m.key)); } })),
  ];
  const total = slots.length;
  const shown = slots[Math.min(current, Math.max(0, total - 1))];

  const pick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (existing.length + pendingRef.current.length >= HANGOUT_LIMITS.maxMedia) { showToast(`Up to ${HANGOUT_LIMITS.maxMedia} photos or videos.`, { type: 'error' }); break; }
      const problem = await checkHangoutFile(f);
      if (problem) { showToast(problem, { type: 'error' }); continue; }
      const item: Pending = { key: `${Date.now()}-${Math.random()}`, file: f, preview: URL.createObjectURL(f), isVideo: f.type.startsWith('video/') };
      setPending((p) => [...p, item]);
    }
    if (libRef.current) libRef.current.value = '';
    if (camRef.current) camRef.current.value = '';
  };

  const matches = spotText.trim().length >= 2 && !spotId
    ? spots.filter((s) => s.title.toLowerCase().includes(spotText.trim().toLowerCase())).slice(0, 5)
    : [];

  const todayIso = new Date().toISOString().slice(0, 10);
  const yIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const save = async (publish: boolean) => {
    if (publish && total === 0) { showToast('Add at least one photo or video first.', { type: 'error' }); setStep(1); return; }
    if (!publish && total === 0 && !caption.trim() && !spotText.trim()) { showToast('Add something first.', { type: 'error' }); return; }
    setBusy(publish ? 'Sharing…' : 'Saving…');
    try {
      const fields = { caption, spotId, spotTitle: spotText.trim() || null, area, happenedOn: date || null };
      let id = hangout?.id;
      if (!id) {
        const r = await createHangout(userId, { ...fields, status: 'draft' });
        if (!r.hangout) { showToast(r.error || 'Could not save.', { type: 'error' }); return; }
        id = r.hangout.id;
      } else {
        const err = await updateHangout(id, fields);
        if (err) { showToast(err, { type: 'error' }); return; }
      }
      for (const m of removed) await removeHangoutMedia(m);
      let pos = existing.length;
      let failed = 0;
      for (let i = 0; i < pending.length; i++) {
        setBusy(`Uploading ${i + 1} of ${pending.length}…`);
        const r = await addHangoutMedia(userId, id, pending[i].file, pos);
        if (r.error) { failed++; showToast(r.error, { type: 'error' }); } else pos++;
      }
      if (publish) {
        const err = await publishHangout(id);
        if (err) { showToast(err, { type: 'error' }); return; }
        showToast(failed ? 'Shared (some files did not upload).' : 'Hangout shared.');
      } else {
        showToast(failed ? 'Saved as draft (some files did not upload).' : 'Saved as draft.');
      }
      onDone();
    } finally {
      setBusy(null);
    }
  };

  const hiddenInputs = (
    <>
      <input ref={libRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
    </>
  );

  const chip = (active: boolean) => `px-3.5 py-2 rounded-full text-[12px] font-bold cursor-pointer ${active ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`;

  const ui = (
    <div className="fixed inset-0 z-[65] bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 flex items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <button type="button" disabled={!!busy} aria-label={step === 2 && !hangout ? 'Back' : 'Close'}
          onClick={() => (step === 2 && !hangout ? setStep(1) : onDone())}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer">
          {step === 2 && !hangout ? <ChevronLeft className="w-6 h-6" /> : <X className="w-6 h-6" />}
        </button>
        <p className="flex-1 text-center text-[16px] font-black">{hangout ? 'Edit hangout' : step === 1 ? 'New hangout' : 'Details'}</p>
        {step === 1 ? (
          <button type="button" disabled={total === 0} onClick={() => setStep(2)} className="px-4 h-10 text-[14px] font-black disabled:opacity-30 cursor-pointer" style={{ color: accent }}>Next</button>
        ) : (
          <span className="w-14" />
        )}
      </div>

      {step === 1 ? (
        <div className="flex-1 overflow-y-auto pb-6">
          {total === 0 ? (
            <div className="px-5 pt-6">
              <div className="rounded-3xl p-6 text-center" style={{ background: `${accent}12` }}>
                <ImagePlus className="w-10 h-10 mx-auto" style={{ color: accent }} />
                <p className="mt-3 text-[17px] font-black">Share a hangout</p>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Photos or short videos from places you went with friends. Friends can then join you next time, plan a date there or save the spot.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => libRef.current?.click()} className="py-4 rounded-2xl text-white text-[14px] font-black flex flex-col items-center gap-1.5 cursor-pointer" style={{ background: accent }}>
                  <Images className="w-6 h-6" /> Library
                </button>
                <button type="button" onClick={() => camRef.current?.click()} className="py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[14px] font-black flex flex-col items-center gap-1.5 cursor-pointer">
                  <Camera className="w-6 h-6" style={{ color: accent }} /> Camera
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">Up to {HANGOUT_LIMITS.maxMedia} files. Videos up to {HANGOUT_LIMITS.maxVideoSeconds} seconds.</p>
            </div>
          ) : (
            <>
              {/* Big preview, 4:5 like a feed post */}
              <div className="relative w-full bg-slate-100 dark:bg-slate-900 overflow-hidden" style={{ aspectRatio: '4 / 5', maxHeight: '58vh' }}>
                {shown && (shown.isVideo
                  ? <video key={shown.key} src={shown.url + '#t=0.1'} controls playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  : <img key={shown.key} src={shown.url} alt="" className="absolute inset-0 w-full h-full object-cover" />)}
                {shown && (
                  <button type="button" aria-label="Remove this one" onClick={() => { shown.remove(); setCurrent(0); }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                )}
                <span className="absolute bottom-3 right-3 text-[11px] font-black text-white bg-black/55 rounded-full px-2.5 py-1">{Math.min(current, total - 1) + 1}/{total}</span>
              </div>

              {/* Thumbnail strip */}
              <div className="mt-3 px-4 flex gap-2 overflow-x-auto hide-scrollbar">
                {slots.map((sl, i) => (
                  <button key={sl.key} type="button" onClick={() => setCurrent(i)}
                    className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden cursor-pointer"
                    style={i === Math.min(current, total - 1) ? { boxShadow: `0 0 0 2.5px ${accent}` } : { opacity: 0.75 }}>
                    {sl.isVideo ? <video src={sl.url + '#t=0.1'} muted playsInline preload="metadata" className="w-full h-full object-cover" /> : <img src={sl.url} alt="" className="w-full h-full object-cover" />}
                    {sl.isVideo && <Play className="absolute bottom-1 left-1 w-3.5 h-3.5 text-white" fill="white" />}
                  </button>
                ))}
                {total < HANGOUT_LIMITS.maxMedia && (
                  <>
                    <button type="button" onClick={() => libRef.current?.click()} className="shrink-0 w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer" aria-label="Add from library"><Plus className="w-6 h-6" style={{ color: accent }} /></button>
                    <button type="button" onClick={() => camRef.current?.click()} className="shrink-0 w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer" aria-label="Take photo or video"><Camera className="w-5 h-5" style={{ color: accent }} /></button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto pb-4">
            {/* thumb + caption, like a new post */}
            <div className="px-4 pt-2 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="relative shrink-0 w-20 h-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 cursor-pointer" aria-label="Change photos">
                {slots[0] && (slots[0].isVideo ? <video src={slots[0].url + '#t=0.1'} muted playsInline preload="metadata" className="w-full h-full object-cover" /> : <img src={slots[0].url} alt="" className="w-full h-full object-cover" />)}
                {total > 1 && <span className="absolute bottom-1 right-1 text-[10px] font-black text-white bg-black/55 rounded-full px-1.5 py-0.5">{total}</span>}
                {total === 0 && <ImagePlus className="w-6 h-6 m-auto text-slate-400" />}
              </button>
              <div className="flex-1 min-w-0">
                <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, HANGOUT_LIMITS.maxCaption))} rows={4} placeholder="Tell friends about it. Who was there? What was the vibe?"
                  className="w-full bg-transparent text-[15px] focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none" />
                <p className="text-right text-[11px] text-slate-400">{caption.length}/{HANGOUT_LIMITS.maxCaption}</p>
              </div>
            </div>

            <div className="mx-4 mt-2 border-t border-slate-100 dark:border-slate-800" />

            {/* Spot */}
            <div className="px-4 pt-4 relative">
              <p className="text-[13px] font-black flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: accent }} /> Where was it?</p>
              <input value={spotText} onChange={(e) => { setSpotText(e.target.value); setSpotId(null); setArea(null); }} placeholder="Search a RADA spot or type a place"
                className="mt-2 w-full px-3.5 py-3 text-[14px] rounded-xl bg-slate-100 dark:bg-slate-800 focus:outline-none text-slate-900 dark:text-slate-100" />
              {spotId && <p className="mt-1.5 text-[11px] font-bold text-emerald-600">Linked to a RADA spot{area ? ` in ${area}` : ''}. Friends can plan a date there or save it.</p>}
              {!spotId && spotText.trim() && matches.length === 0 && <p className="mt-1.5 text-[11px] text-slate-400">Not linked to a RADA spot. Pick one from the list so friends can plan or save it.</p>}
              {matches.length > 0 && (
                <div className="mt-1.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {matches.map((sp) => (
                    <button key={String(sp.id)} type="button" onClick={() => { setSpotId(String(sp.id)); setSpotText(sp.title); setArea(sp.neighborhood || null); }}
                      className="w-full text-left px-3.5 py-3 text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                      <span className="font-bold">{sp.title}</span>{sp.neighborhood && <span className="text-slate-500"> · {sp.neighborhood}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="px-4 pt-5">
              <p className="text-[13px] font-black flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: accent }} /> When?</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setDate(todayIso)} className={chip(date === todayIso)} style={date === todayIso ? { background: accent } : undefined}>Today</button>
                <button type="button" onClick={() => setDate(yIso)} className={chip(date === yIso)} style={date === yIso ? { background: accent } : undefined}>Yesterday</button>
                <input type="date" value={date} max={todayIso} onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 text-[12px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <p className="px-4 mt-5 text-[11px] text-slate-400">No likes or comments here. Friends can join you next time, plan a date at the spot, save it or say hi.</p>
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 px-4 pt-3 bg-white dark:bg-[#121113] border-t border-slate-100 dark:border-slate-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
            {busy && <p className="mb-2 text-center text-[12px] text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{busy}</p>}
            <div className="grid grid-cols-5 gap-2">
              <button type="button" disabled={!!busy} onClick={() => save(false)} className="col-span-2 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"><FileText className="w-4 h-4" />Save draft</button>
              <button type="button" disabled={!!busy} onClick={() => save(true)} className="col-span-3 py-3.5 rounded-2xl text-white text-[14px] font-black cursor-pointer disabled:opacity-50" style={{ background: accent }}>Share hangout</button>
            </div>
          </div>
        </>
      )}
      {hiddenInputs}
    </div>
  );

  return createPortal(ui, document.body);
};

// ---------------------------------------------------------------------------

const Joins: React.FC<{ userId: string; accent: string; hangouts: Hangout[]; onBack: () => void }> = ({ userId, accent, hangouts, onBack }) => {
  const [rows, setRows] = useState<{ hangoutId: string; fromUser: string; createdAt: string }[] | null>(null);
  const [people, setPeople] = useState<Record<string, Requester>>({});

  useEffect(() => {
    let off = false;
    (async () => {
      const r = await fetchJoinRequestsForMe(userId);
      if (off) return;
      setRows(r);
      const ids = Array.from(new Set(r.map((x) => x.fromUser)));
      if (ids.length && isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('profiles').select('*').in('id', ids);
        if (off) return;
        const map: Record<string, Requester> = {};
        (data || []).forEach((p: any) => { map[p.id] = { id: p.id, name: p.username ? `@${String(p.username).replace(/^@/, '')}` : 'Someone', avatar: p.avatar_url || p.avatar }; });
        setPeople(map);
      }
    })();
    return () => { off = true; };
  }, [userId]);

  const byHangout = new Map<string, { fromUser: string; createdAt: string }[]>();
  (rows || []).forEach((r) => byHangout.set(r.hangoutId, [...(byHangout.get(r.hangoutId) || []), r]));

  return (
    <div className="pb-6">
      <button type="button" onClick={onBack} className="m-2 inline-flex items-center gap-1 text-[13px] font-bold cursor-pointer"><ChevronLeft className="w-5 h-5" /> Hangouts</button>
      <h3 className="px-4 text-[17px] font-black">Who wants to join next time</h3>
      {rows === null ? (
        <p className="text-[13px] text-slate-400 py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-8 px-6 text-center">Nobody yet. When someone taps Join next time on a hangout, they show up here.</p>
      ) : (
        <div className="px-4 mt-3 space-y-3">
          {hangouts.filter((h) => byHangout.has(h.id)).map((h) => (
            <div key={h.id} className="rounded-2xl bg-slate-50 dark:bg-[#1C1A1E] p-3">
              <div className="flex items-center gap-3">
                <div className="w-14 shrink-0 rounded-lg overflow-hidden"><Thumb h={h} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black truncate">{h.spotTitle || h.caption || 'Hangout'}</p>
                  <p className="text-[11px] text-slate-500">{byHangout.get(h.id)!.length} want to join</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {byHangout.get(h.id)!.map((r) => {
                  const pr = people[r.fromUser];
                  return (
                    <span key={r.fromUser} className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-white dark:bg-slate-800 text-[12px] font-semibold">
                      <span className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-white text-[11px] font-black" style={{ background: accent }}>
                        {pr?.avatar ? <img src={pr.avatar} alt="" className="w-full h-full object-cover" /> : (pr?.name || 'S').replace('@', '').charAt(0).toUpperCase()}
                      </span>
                      {pr?.name || 'Someone'}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
