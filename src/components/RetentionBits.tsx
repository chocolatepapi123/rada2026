import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2, MessageSquare, Ticket } from 'lucide-react';
import {
  claimOffer, deleteReviewReply, fetchOfferStats, getReplyForReview, redeemOfferCode, replyToReview,
  type OfferStats, type ReviewReply,
} from '../lib/retention';

/** Customer side: "Get my code" turns an offer into a personal, one-time code to show at the venue. */
export const ClaimOfferButton: React.FC<{ offerId: string; onMessage?: (msg: string) => void }> = ({ offerId, onMessage }) => {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const get = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await claimOffer(offerId);
      setCode(r.code);
      onMessage?.('Your code is ready. Show it at the venue.');
    } catch (e: any) {
      setErr(e?.message || 'Could not get this offer');
    } finally {
      setBusy(false);
    }
  };

  if (code) {
    return (
      <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Your code. Show it at the venue</p>
          <p className="text-sm font-black font-mono tracking-wider">{code}</p>
        </div>
        <button
          type="button"
          onClick={() => { navigator.clipboard?.writeText?.(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    );
  }
  return (
    <div className="w-full space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={get}
        className="w-full py-2 rounded-xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-60 text-white text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />} Get my code
      </button>
      {err && <p className="text-[10px] text-red-500">{err}</p>}
    </div>
  );
};

/** Merchant side: type the customer's code to mark it used. */
export const RedeemCodePanel: React.FC = () => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await redeemOfferCode(code);
      setMsg({ ok: true, text: `Redeemed: ${r.offer_title}` });
      setCode('');
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Could not redeem this code' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-100 dark:bg-[#121113] p-3 space-y-2">
      <p className="text-[11px] font-black">Redeem a customer code</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="R-1A2B3C"
          className="flex-1 min-w-0 rounded-xl bg-white dark:bg-[#1C1A1E] px-3 py-2 text-xs font-mono font-bold outline-none"
        />
        <button type="button" disabled={busy || !code.trim()} onClick={redeem} className="px-3.5 py-2 rounded-xl bg-[#E0533C] disabled:opacity-50 text-white text-[11px] font-black cursor-pointer">
          {busy ? '…' : 'Redeem'}
        </button>
      </div>
      {msg && <p className={`text-[11px] font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
};

/** One line under each of the owner's offers: how many people claimed and used it. */
export const OfferStatsLine: React.FC<{ offerId: string }> = ({ offerId }) => {
  const [s, setS] = useState<OfferStats | null>(null);
  useEffect(() => {
    let live = true;
    fetchOfferStats(offerId).then((x) => live && setS(x)).catch(() => undefined);
    return () => { live = false; };
  }, [offerId]);
  if (!s) return null;
  return (
    <p className="text-[10px] text-slate-500 mt-0.5">
      {s.claimed} claimed · {s.redeemed} used{s.cap ? ` · limit ${s.cap}` : ''}
    </p>
  );
};

/** Shows the owner's public reply under a review; owners also get a reply box. */
export const ReviewReplyBlock: React.FC<{ reviewId: string; canReply?: boolean; className?: string }> = ({ reviewId, canReply = false, className = '' }) => {
  const [reply, setReply] = useState<ReviewReply | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    getReplyForReview(reviewId).then((r) => { if (live) { setReply(r); setLoaded(true); } });
    return () => { live = false; };
  }, [reviewId]);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      setReply(await replyToReview(reviewId, text));
      setEditing(false);
    } catch (e: any) {
      setErr(e?.message || 'Could not post the reply');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try { await deleteReviewReply(reviewId); setReply(null); } catch (e: any) { setErr(e?.message || 'Could not delete'); } finally { setBusy(false); }
  };

  if (!loaded) return null;
  return (
    <div className={className}>
      {reply && !editing && (
        <div className="mt-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Reply from the owner</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5 whitespace-pre-wrap">{reply.body}</p>
          {canReply && (
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => { setText(reply.body); setEditing(true); }} className="text-[10px] font-bold text-[#E0533C] cursor-pointer">Edit</button>
              <button type="button" disabled={busy} onClick={remove} className="text-[10px] font-bold text-slate-400 cursor-pointer">Delete</button>
            </div>
          )}
        </div>
      )}
      {canReply && !reply && !editing && (
        <button type="button" onClick={() => { setText(''); setEditing(true); }} className="mt-1.5 text-[10px] font-bold text-[#E0533C] flex items-center gap-1 cursor-pointer">
          <MessageSquare className="w-3 h-3" /> Reply
        </button>
      )}
      {canReply && editing && (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Thank them or answer their question. Replies are public."
            className="w-full rounded-xl bg-slate-100 dark:bg-[#121113] px-3 py-2 text-xs outline-none"
          />
          {err && <p className="text-[10px] text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy || !text.trim()} onClick={save} className="px-3 py-1.5 rounded-lg bg-[#E0533C] disabled:opacity-50 text-white text-[10px] font-black cursor-pointer">{busy ? '…' : 'Post reply'}</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
