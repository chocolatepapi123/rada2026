import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Receipt, Smartphone, X } from 'lucide-react';
import {
  claimShare, closeSplit, confirmShare, createBillSplit, fetchBillSplit, kes, prettyPhone,
  type BillShare, type BillSplit,
} from '../lib/billSplit';

type Toast = (msg: string, o?: { type?: 'success' | 'error' | 'info' }) => void;

const shell = 'w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 space-y-4 shadow-xl';
const inputCls = 'mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-[15px] font-semibold outline-none focus:border-[#E0533C]';
const primaryBtn = 'w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60';

const Sheet: React.FC<{ title: string; sub?: string; onClose: () => void; children: React.ReactNode }> = ({ title, sub, onClose, children }) => (
  <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true">
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{sub || 'Split the bill'}</p>
          <p className="text-xl font-black tracking-tight mt-1">{title}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/** Host: start a split for everyone in the chat. */
export const StartBillSheet: React.FC<{
  conversationId: string;
  memberCount: number;
  onClose: () => void;
  onCreated: (splitId: string, title: string, total: number) => void;
  showToast: Toast;
}> = ({ conversationId, memberCount, onClose, onCreated, showToast }) => {
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [phone, setPhone] = useState(() => { try { return localStorage.getItem('rada_split_phone') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const totalNum = Number(total.replace(/[^\d]/g, ''));
  const each = memberCount > 0 && totalNum > 0 ? Math.floor(totalNum / memberCount) : 0;

  const go = async () => {
    setBusy(true); setErr('');
    const { id, error } = await createBillSplit(conversationId, title.trim() || 'Bill', totalNum, phone);
    setBusy(false);
    if (error || !id) { setErr(error || 'Could not start the split.'); return; }
    try { localStorage.setItem('rada_split_phone', phone); } catch { /* ignore */ }
    showToast('Bill split started', { type: 'success' });
    onCreated(id, title.trim() || 'Bill', totalNum);
  };

  return (
    <Sheet title="Split the bill" onClose={onClose}>
      <label className="block">
        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">What for?</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Dinner, tickets, drinks…" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Total bill (KES)</span>
        <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="6000" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Your M-Pesa number (where friends send their share)</span>
        <input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputCls} />
      </label>
      {each > 0 && <p className="text-[12px] text-slate-500">Split between {memberCount} people: about <b>{kes(each)}</b> each.</p>}
      {err && <p className="text-[12px] text-red-500">{err}</p>}
      <button type="button" onClick={go} disabled={busy || !totalNum} className={primaryBtn}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />} Start split
      </button>
      <p className="text-[11px] text-slate-400 leading-relaxed">Friends pay you directly on M-Pesa. RADA never holds the money.</p>
    </Sheet>
  );
};

/** Guest: how to pay the host, then report the M-Pesa code. */
const PayShareSheet: React.FC<{ split: BillSplit; share: BillShare; onClose: () => void; onDone: () => void; showToast: Toast }> = ({ split, share, onClose, onDone, showToast }) => {
  const [code, setCode] = useState(share.mpesa_code || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(split.host_phone.replace(/^254/, '0')); showToast('Number copied', { type: 'success' }); } catch { /* ignore */ }
  };
  const send = async () => {
    setBusy(true); setErr('');
    const e = await claimShare(split.id, code);
    setBusy(false);
    if (e) { setErr(e); return; }
    showToast('Sent. The host will confirm.', { type: 'success' });
    onDone();
  };
  return (
    <Sheet title={kes(share.share_kes)} sub={`Your share · ${split.title}`} onClose={onClose}>
      <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.05] p-4 space-y-2">
        <p className="text-[12px] text-slate-500">1. Open M-Pesa and choose <b>Send money</b> to the host:</p>
        <button type="button" onClick={copy} className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 cursor-pointer">
          <span className="text-[16px] font-black tracking-wide">{prettyPhone(split.host_phone)}</span>
          <Copy className="w-4 h-4 text-slate-400" />
        </button>
        <p className="text-[12px] text-slate-500">2. Enter the M-Pesa code from your confirmation message:</p>
      </div>
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder="e.g. SLK4X9ABCD" className={inputCls + ' tracking-widest'} />
      {err && <p className="text-[12px] text-red-500">{err}</p>}
      <button type="button" onClick={send} disabled={busy || code.length < 8} className={primaryBtn}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />} I have paid
      </button>
    </Sheet>
  );
};

/** The card that appears in the group chat. */
export const BillSplitCard: React.FC<{ splitId: string; myUserId?: string; showToast: Toast }> = ({ splitId, myUserId, showToast }) => {
  const [split, setSplit] = useState<BillSplit | null>(null);
  const [missing, setMissing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await fetchBillSplit(splitId);
    if (s) { setSplit(s); setMissing(false); } else setMissing(true);
  }, [splitId]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  if (!split) {
    return (
      <div className="w-72 max-w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1C1A1E] p-4 text-[12px] text-slate-500">
        {missing ? 'This bill is not available.' : 'Loading bill…'}
      </div>
    );
  }

  const isHost = myUserId === split.host_id;
  const mine = split.shares.find((s) => s.user_id === myUserId);
  const paid = split.shares.filter((s) => s.status === 'confirmed').reduce((a, s) => a + s.share_kes, 0);
  const pct = Math.min(100, Math.round((paid / Math.max(1, split.total_kes)) * 100));
  const open = split.status === 'open';

  const act = async (id: string, fn: () => Promise<string | null>) => {
    setBusyId(id);
    const e = await fn();
    setBusyId(null);
    if (e) showToast(e, { type: 'error' });
    load();
  };

  return (
    <div className="w-72 max-w-full rounded-3xl border border-[#E0533C]/25 bg-white dark:bg-[#1C1A1E] shadow-lg shadow-[#E0533C]/10 overflow-hidden text-slate-900 dark:text-slate-100">
      <div className="bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Bill split{!open ? ` · ${split.status}` : ''}</p>
        <p className="text-[15px] font-black leading-tight mt-0.5 truncate">{split.title}</p>
        <p className="text-[22px] font-black tracking-tight">{kes(split.total_kes)}</p>
      </div>
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="text-[11px] text-slate-500 mt-1">{kes(paid)} of {kes(split.total_kes)} confirmed</p>
      </div>
      <ul className="px-4 py-2 space-y-1.5">
        {split.shares.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-[13px]">
            <span className="flex-1 min-w-0 truncate font-bold">{s.user_id === myUserId ? 'You' : (s.user_handle ? (s.user_handle.startsWith('@') ? s.user_handle : `@${s.user_handle}`) : 'Member')}{s.user_id === split.host_id ? ' · host' : ''}</span>
            <span className="font-black">{kes(s.share_kes)}</span>
            {s.status === 'confirmed' ? (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>
            ) : s.status === 'claimed' ? (
              isHost && open ? (
                <span className="flex gap-1">
                  <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => confirmShare(s.id, true))} className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black cursor-pointer">Got it</button>
                  <button type="button" disabled={busyId === s.id} onClick={() => act(s.id, () => confirmShare(s.id, false))} className="px-2 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-[10px] font-black cursor-pointer">Not yet</button>
                </span>
              ) : <span className="text-[10px] font-black text-amber-500">Waiting</span>
            ) : (
              <span className="text-[10px] font-black text-slate-400">Owes</span>
            )}
          </li>
        ))}
      </ul>
      {isHost && open && split.shares.some((s) => s.status === 'claimed' && s.mpesa_code) && (
        <p className="px-4 text-[10px] text-slate-400">Match the code in your M-Pesa messages: {split.shares.filter((s) => s.status === 'claimed' && s.mpesa_code).map((s) => s.mpesa_code).join(', ')}</p>
      )}
      <div className="p-4 space-y-2">
        {open && mine && !isHost && mine.status !== 'confirmed' && (
          <button type="button" onClick={() => setPaying(true)} className={primaryBtn}>
            <Smartphone className="w-4 h-4" /> {mine.status === 'claimed' ? 'Edit M-Pesa code' : `Pay ${kes(mine.share_kes)} with M-Pesa`}
          </button>
        )}
        {isHost && open && (
          <button type="button" onClick={() => act('close', () => closeSplit(split.id, paid === 0))} className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-white/10 text-[12px] font-black cursor-pointer">
            {paid === 0 ? 'Cancel bill' : 'Close bill'}
          </button>
        )}
      </div>
      {paying && mine && <PayShareSheet split={split} share={mine} showToast={showToast} onClose={() => setPaying(false)} onDone={() => { setPaying(false); load(); }} />}
    </div>
  );
};
