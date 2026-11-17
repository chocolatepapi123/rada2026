import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Clock, X, Video, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { createAsk, uploadAskMedia } from '../lib/asks.ts';

const INPUT = 'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-[#E0533C]';
const EXAMPLES = ['Going to a show, need someone to go with', 'Looking for company at a nyama choma spot', 'New in town, want to explore'];

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Props { defaultArea: string; onClose: () => void; onPosted: () => void; showToast: (m: string) => void }

/** Full-screen sheet for posting an ask. Poster types the location and picks when it expires. */
const AskComposer: React.FC<Props> = ({ defaultArea, onClose, onPosted, showToast }) => {
  const [body, setBody] = useState('');
  const [area, setArea] = useState(defaultArea);
  const [expires, setExpires] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600e3)));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const minNow = toLocalInput(new Date(Date.now() + 5 * 60000));

  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const isVideo = file?.type.startsWith('video/');

  const post = async () => {
    const when = new Date(expires);
    if (Number.isNaN(when.getTime())) return showToast('Pick a date and time for this ask to expire.');
    setBusy(true);
    try {
      const media = file ? await uploadAskMedia(file) : null;
      const err = await createAsk(body, area, when, media);
      if (err) return showToast(err);
      showToast('Posted to Rada.'); onPosted();
    } catch (e: any) { showToast(e?.message || 'Could not post. Try again.'); } finally { setBusy(false); }
  };

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => ref.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-[#141216] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-md mx-auto px-4 pb-10">
        <div className="flex items-center justify-between py-4">
          <p className="text-lg font-extrabold">New ask</p>
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
              <p className="text-[15px] font-extrabold">Add a photo or video</p>
              <div className="flex gap-2">
                <button onClick={() => pick(photoRef)} className="px-4 py-2.5 rounded-full bg-[#E0533C] text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer active:scale-95"><ImageIcon className="w-4 h-4" />Photo</button>
                <button onClick={() => pick(videoRef)} className="px-4 py-2.5 rounded-full bg-white dark:bg-[#1C1A1E] text-[#E0533C] text-[13px] font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"><Video className="w-4 h-4" />Video</button>
              </div>
              <p className="text-[11px] text-slate-500">Videos up to 30 seconds</p>
            </div>
          )}
        </div>

        <div className="space-y-3 mt-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={160} rows={3} placeholder="What's the plan, and who do you want with you?" className={INPUT} />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => <button key={e} onClick={() => setBody(e)} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 cursor-pointer">{e}</button>)}
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
          <button disabled={busy} onClick={post} className="w-full py-3.5 rounded-full bg-[#E0533C] text-white text-[14px] font-extrabold cursor-pointer active:scale-95 disabled:opacity-60">{busy ? 'Posting…' : 'Post to Rada'}</button>
        </div>
      </div>
    </div>
  );
};
export default AskComposer;
