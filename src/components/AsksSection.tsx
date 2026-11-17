import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Flag, ImagePlus, MapPin, MessageCircle, Plus, ShieldCheck, X } from 'lucide-react';
import { nairobiLocationsData } from '../data/nairobiLocations.ts';
import { acceptReply, blockUser, closeAsk, createAsk, declineReply, fetchAsks, fetchReplies, getMyArea, replyToAsk, reportAsk, setMyArea, timeLeft, uploadAskMedia, type Ask, type AskReply } from '../lib/asks.ts';

const CARD = 'bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10';
const INPUT = 'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-[13px]';
const EXAMPLES = ['Going to a show and need someone to go with', 'Have a mzinga and looking for company', 'New in town, want to explore with someone'];
const REPORT_REASONS: [string, string][] = [['spam', 'Spam or selling'], ['harassment', 'Harassment'], ['unsafe_meetup', 'Unsafe plan'], ['inappropriate_content', 'Inappropriate photo or video'], ['fake_profile', 'Fake profile']];

interface Props { signedIn: boolean; showToast: (m: string) => void; onNeedSignIn?: () => void; onChatOpened?: (chatId: string) => void }

const AsksSection: React.FC<Props> = ({ signedIn, showToast, onNeedSignIn, onChatOpened }) => {
  const areas = useMemo(() => Array.from(new Set(nairobiLocationsData.map((l) => l.neighborhood).filter(Boolean))).sort(), []);
  const [area, setArea] = useState(getMyArea());
  const [asks, setAsks] = useState<Ask[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<'area' | 'anywhere'>('area');
  const [askArea, setAskArea] = useState(getMyArea());
  const [hours, setHours] = useState(72);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  const [replies, setReplies] = useState<AskReply[]>([]);
  const [reporting, setReporting] = useState<Ask | null>(null);

  const load = useCallback(async () => setAsks(signedIn ? await fetchAsks(area) : []), [area, signedIn]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (viewing) void fetchReplies(viewing).then(setReplies); }, [viewing]);
  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const pickArea = (a: string) => { setArea(a); setMyArea(a); if (!askArea) setAskArea(a); };
  const post = async () => {
    setBusy(true);
    try {
      const media = file ? await uploadAskMedia(file) : null;
      const err = await createAsk(body, scope, askArea, hours, media);
      if (err) return showToast(err);
      showToast('Ask posted.'); setBody(''); setFile(null); setComposing(false); void load();
    } catch (e: any) { showToast(e?.message || 'Could not post. Try again.'); } finally { setBusy(false); }
  };
  const sendReply = async (a: Ask) => {
    setBusy(true); const err = await replyToAsk(a.id, msg); setBusy(false);
    if (err) return showToast(err);
    showToast('Sent. They will see your reply.'); setMsg(''); setReplying(null); void load();
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
    showToast(alsoBlock ? 'Reported and blocked. Thank you.' : 'Reported. Thank you.'); setReporting(null); void load();
  };

  if (!signedIn) return (
    <div className={`${CARD} rounded-3xl p-6 text-center space-y-3`}>
      <p className="text-[13px] text-slate-500">Sign in to see what people near you are up to, and post your own.</p>
      <button onClick={onNeedSignIn} className="px-4 py-2 rounded-full bg-[#E0533C] text-white text-xs font-extrabold cursor-pointer">Sign in</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="flex-1 flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-3 py-2 text-[12px] font-bold">
          <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
          <select value={area} onChange={(e) => pickArea(e.target.value)} className="bg-transparent flex-1 min-w-0 outline-none">
            <option value="">No area picked</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button onClick={() => setComposing(!composing)} className="px-3 py-2 rounded-full bg-[#E0533C] text-white font-extrabold text-xs inline-flex items-center gap-1 active:scale-95 cursor-pointer">
          {composing ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {composing ? 'Cancel' : 'Post an ask'}
        </button>
      </div>

      {composing && (
        <div className={`${CARD} rounded-3xl p-4 space-y-2`}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={160} rows={3} placeholder="What's the plan, and what do you need?" className={INPUT} />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => <button key={e} onClick={() => setBody(e)} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 cursor-pointer">{e}</button>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} />
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden bg-black/5">
              {file?.type.startsWith('video/') ? <video src={preview} className="w-full max-h-56 object-cover" muted playsInline controls /> : <img src={preview} alt="" className="w-full max-h-56 object-cover" />}
              <button onClick={() => setFile(null)} aria-label="Remove" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-[12px] font-bold text-slate-500 inline-flex items-center justify-center gap-1.5 cursor-pointer"><ImagePlus className="w-4 h-4" />Add a photo or short video (optional)</button>
          )}
          <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-full text-[12px] text-center">
            {([['area', 'Near an area'], ['anywhere', 'Anyone']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setScope(id)} className={`flex-1 py-1.5 rounded-full cursor-pointer ${scope === id ? 'font-extrabold bg-white dark:bg-[#1C1A1E] text-[#E0533C] shadow-sm' : 'font-semibold text-slate-500'}`}>{label}</button>
            ))}
          </div>
          {scope === 'area' && (
            <select value={askArea} onChange={(e) => setAskArea(e.target.value)} className={INPUT}>
              <option value="">Pick an area</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={INPUT}>
            <option value={24}>Expires in 24 hours</option><option value={72}>Expires in 3 days</option><option value={168}>Expires in 7 days</option>
          </select>
          <p className="text-[11px] text-slate-400">Only the area you pick is shown, never your exact location. No phone numbers or links; chat in RADA. Videos up to 30 seconds.</p>
          <button disabled={busy} onClick={post} className="w-full py-2.5 rounded-full bg-[#2D6A4F] text-white text-xs font-extrabold cursor-pointer active:scale-95 disabled:opacity-60">{busy ? 'Posting…' : 'Post ask'}</button>
        </div>
      )}

      {asks === null && <p className="text-[13px] text-slate-500 text-center py-6">Loading…</p>}
      {asks?.length === 0 && <p className="text-[13px] text-slate-500 text-center py-8">Nothing here yet. Post the first ask{area ? ` for ${area}` : ''}.</p>}
      {asks?.map((a) => (
        <div key={a.id} className={`${CARD} rounded-3xl p-4 space-y-2`}>
          {a.media_url && (a.media_type === 'video'
            ? <video src={a.media_url} className="w-full max-h-64 rounded-2xl object-cover" controls playsInline preload="metadata" />
            : <img src={a.media_url} alt="" loading="lazy" className="w-full max-h-64 rounded-2xl object-cover" />)}
          <p className="text-[14px] font-semibold leading-snug">{a.body}</p>
          <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1 flex-wrap">
            <span>{a.mine ? 'You' : `@${a.handle || 'someone'}`}</span>
            {a.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#2D6A4F]" aria-label="Verified" />}
            {a.trusted && <span className="inline-flex items-center gap-0.5 text-[#2D6A4F]"><ShieldCheck className="w-3.5 h-3.5" />Trusted</span>}
            <span>· {a.scope === 'area' ? a.area : 'Anyone'} · {timeLeft(a.expires_at)}</span>
          </p>
          {a.mine ? (
            <div className="flex gap-2">
              <button onClick={() => setViewing(viewing === a.id ? null : a.id)} className="flex-1 py-2 rounded-full bg-slate-100 dark:bg-white/[0.08] text-xs font-extrabold cursor-pointer">Replies ({a.replies})</button>
              <button onClick={() => close(a)} className="px-4 py-2 rounded-full text-xs font-extrabold text-slate-500 cursor-pointer">Close</button>
            </div>
          ) : replying === a.id ? (
            <div className="space-y-2">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={140} placeholder="Say hi, a short line" className={INPUT} />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => sendReply(a)} className="flex-1 py-2 rounded-full bg-[#E0533C] text-white text-xs font-extrabold cursor-pointer">Send</button>
                <button onClick={() => setReplying(null)} className="px-4 py-2 text-xs font-extrabold text-slate-500 cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {a.replied ? <p className="text-[12px] font-bold text-[#2D6A4F] flex-1">You replied</p>
                : <button onClick={() => { setReplying(a.id); setMsg(''); }} className="px-4 py-2 rounded-full bg-[#E0533C]/10 text-[#E0533C] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"><MessageCircle className="w-3.5 h-3.5" />Reply</button>}
              <button onClick={() => setReporting(a)} aria-label="Report" className="ml-auto p-2 text-slate-400 cursor-pointer"><Flag className="w-4 h-4" /></button>
            </div>
          )}
          {a.mine && viewing === a.id && (
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
      ))}

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
