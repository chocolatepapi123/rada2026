import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Clock, X, Video, Image as ImageIcon, RefreshCw, Ticket, Search } from 'lucide-react';
import { clearDraft, createAsk, loadDraft, newAttemptKey, saveDraft, searchPlans, uploadAskMedia, type PlanHit, type PlanLink } from '../lib/asks.ts';

const INPUT = 'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-[#E0533C]';

const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** Searches the spots and events already loaded in the app, so linking works even when the server search is empty. */
function searchLocalPlans(q: string, spots: any[], events: any[]): PlanHit[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const match = (...parts: unknown[]) => { const hay = norm(parts.join(' ')); return words.every((w) => hay.includes(w)); };
  const out: PlanHit[] = [];
  for (const s of spots) if (s?.title && match(s.title, s.neighborhood, s.address, s.category)) out.push({ kind: 'spot', ref: String(s.id), title: String(s.title), subtitle: s.neighborhood || s.address || null });
  for (const e of events) if (e?.title && match(e.title, e.location, e.address)) out.push({ kind: 'event', ref: String(e.id), title: String(e.title), subtitle: [e.date, e.location].filter(Boolean).join(' · ') || null });
  const starts = (h: PlanHit) => (norm(h.title).startsWith(words[0]) ? 0 : 1);
  return out.sort((a, b) => starts(a) - starts(b)).slice(0, 8);
}

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Props { defaultArea: string; onClose: () => void; onPosted: () => void; showToast: (m: string) => void; spots?: any[]; events?: any[] }

/** Full-screen sheet for posting an ask. Poster types the location and picks when it expires. */
const AskComposer: React.FC<Props> = ({ defaultArea, onClose, onPosted, showToast, spots = [], events = [] }) => {
  const draft = useRef(loadDraft()).current;
  const [body, setBody] = useState(draft?.body || '');
  const [area, setArea] = useState(draft?.area || defaultArea);
  const [expires, setExpires] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600e3)));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<PlanLink | null>(draft?.plan || null);
  const [planQ, setPlanQ] = useState('');
  const [planHits, setPlanHits] = useState<PlanHit[]>([]);
  const [planBusy, setPlanBusy] = useState(false);
  const attempt = useRef(newAttemptKey());
  const uploaded = useRef<{ file: File; media: { url: string; type: 'image' | 'video' } } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const minNow = toLocalInput(new Date(Date.now() + 5 * 60000));

  useEffect(() => { saveDraft({ body, area, plan }); }, [body, area, plan]);
  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const isVideo = file?.type.startsWith('video/');

  useEffect(() => {
    if (plan || planQ.trim().length < 2) { setPlanHits([]); setPlanBusy(false); return; }
    setPlanBusy(true);
    let off = false;
    const t = setTimeout(async () => { const local = searchLocalPlans(planQ, spots, events); let remote: PlanHit[] = []; try { remote = await searchPlans(planQ); } catch { /* local results still work */ } const seen = new Set(local.map((x) => `${x.kind}-${x.ref}`)); const h = [...local, ...remote.filter((x) => !seen.has(`${x.kind}-${x.ref}`))]; if (!off) { setPlanHits(h); setPlanBusy(false); } }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [planQ, plan, spots, events]);

  const post = async () => {
    const when = new Date(expires);
    if (Number.isNaN(when.getTime())) return showToast('Pick a date and time for this rada to expire.');
    if (!file) return showToast('Add a photo or video to post your rada.');
    if (busy) return;
    setBusy(true);
    try {
      // Reuse an upload that already succeeded, so a retry does not send the file again.
      let media = null as { url: string; type: 'image' | 'video' } | null;
      if (file) {
        if (uploaded.current?.file !== file) uploaded.current = { file, media: await uploadAskMedia(file) };
        media = uploaded.current.media;
      }
      const err = await createAsk(body, area, when, media, plan, attempt.current);
      if (err) return showToast(`${err} Your words are saved, nothing is lost.`);
      clearDraft(); showToast('Posted to Rada.'); onPosted();
    } catch (e: any) { showToast(`${e?.message || 'Could not post.'} Your words are saved, try again when you are ready.`); } finally { setBusy(false); }
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => ref.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-[#141216] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-md mx-auto px-4 pb-10">
        <div className="flex items-center justify-between py-4">
          <p className="text-lg font-extrabold">New rada</p>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={onFile} />

        {/* Media tile, shaped like the card people will swipe */}
        <div className="relative w-full aspect-[4/5] rounded-[28px] overflow-hidden bg-gradient-to-br from-[#E0533C]/15 via-[#E0533C]/5 to-[#2D6A4F]/15 border border-slate-200/70 dark:border-white/10">
          {preview ? (
            <>
              {isVideo ? <video src={preview} className="w-full h-full object-cover" muted autoPlay loop playsInline /> : <img src={preview} alt="" className="w-full h-full object-cover" />}
              <div className="absolute inset-x-0 top-0 p-3 flex justify-between">
                <button onClick={() => pick(isVideo ? videoRef : photoRef)} className="px-3 py-1.5 rounded-full bg-black/55 text-white text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" />Change</button>
                <button onClick={() => setFile(null)} aria-label="Remove" className="w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1C1A1E] shadow-md flex items-center justify-center"><Camera className="w-7 h-7 text-[#E0533C]" /></div>
              <p className="text-[15px] font-extrabold">Add a photo or video <span className="text-[#E0533C]">*</span></p>
              <div className="flex gap-2">
                <button onClick={() => pick(photoRef)} className="px-4 py-2.5 rounded-full bg-[#E0533C] text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer active:scale-95"><ImageIcon className="w-4 h-4" />Photo</button>
                <button onClick={() => pick(videoRef)} className="px-4 py-2.5 rounded-full bg-white dark:bg-[#1C1A1E] text-[#E0533C] text-[13px] font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"><Video className="w-4 h-4" />Video</button>
              </div>
              <p className="text-[11px] text-slate-500">Required · Videos up to 30 seconds</p>
            </div>
          )}
        </div>

        <div className="space-y-3 mt-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={160} rows={3} placeholder="What's the plan, and who do you want with you?" className={INPUT} />

          <div className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1"><Ticket className="w-3.5 h-3.5 text-[#E0533C]" />Link an event or spot</span>
            {plan ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-3 py-2.5">
                <span className="flex-1 min-w-0 text-[13px] font-bold truncate">{plan.kind === 'event' ? 'Event' : 'Spot'}: {plan.title}</span>
                <button onClick={() => { setPlan(null); setPlanQ(''); }} aria-label="Remove link" className="cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input value={planQ} onChange={(e) => setPlanQ(e.target.value)} maxLength={60} placeholder="Search an event or spot" className={`${INPUT} pl-10`} />
              </div>
            )}
            {!plan && planBusy && <p className="text-[11px] text-slate-400 mt-1.5">Searching…</p>}
            {!plan && !planBusy && planQ.trim().length >= 2 && planHits.length === 0 && <p className="text-[11px] text-slate-400 mt-1.5">No matching spot or event. Try a different name.</p>}
            {!plan && planHits.length > 0 && (
              <div className="mt-1.5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                {planHits.slice(0, 6).map((h) => (
                  <button key={`${h.kind}-${h.ref}`} onClick={() => { setPlan({ kind: h.kind, ref: h.ref, title: h.title.slice(0, 120) }); setPlanQ(''); setPlanHits([]); }} className="w-full text-left px-3 py-2.5 border-b last:border-b-0 border-slate-100 dark:border-white/5 cursor-pointer">
                    <p className="text-[13px] font-bold truncate">{h.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{h.kind === 'event' ? 'Event' : 'Spot'}{h.subtitle ? ` · ${h.subtitle}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5 text-[#E0533C]" />Location</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} placeholder="Type any place, e.g. Westgate Mall, Kilimani" className={INPUT} />
          </label>

          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-[#E0533C]" />Expires</span>
            <input type="datetime-local" value={expires} min={minNow} onChange={(e) => setExpires(e.target.value)} className={INPUT} />
          </label>

          <p className="text-[11px] text-slate-400">No phone numbers or links; chat in RADA once someone replies.</p>
          <button disabled={busy || !file} onClick={post} className="w-full py-3.5 rounded-full bg-[#E0533C] text-white text-[14px] font-extrabold cursor-pointer active:scale-95 disabled:opacity-60">{busy ? 'Posting…' : !file ? 'Add a photo or video to post' : 'Post to Rada'}</button>
        </div>
      </div>
    </div>
  );
};
export default AskComposer;
