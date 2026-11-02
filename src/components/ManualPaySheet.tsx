import React, { useEffect, useState } from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { getManualPayInfo, getPlanAmount, submitManualPayment, type ManualPayInfo } from '../lib/manualPayments';

interface Props {
  kind: 'creator' | 'merchant' | 'promotion';
  plan: string;                       // 'pro' | 'elite' (use 'promo' for promotions)
  period?: 'weekly' | 'monthly';
  promotionId?: string | null;
  amountKes?: number | null;          // pass it if you already know it (promotions)
  onClose: () => void;
  onSubmitted?: () => void;
  showToast?: (msg: string, options?: any) => void;
}

const input = 'w-full text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none';

export const ManualPaySheet: React.FC<Props> = ({ kind, plan, period = 'monthly', promotionId, amountKes, onClose, onSubmitted, showToast }) => {
  const [info, setInfo] = useState<ManualPayInfo | null>(null);
  const [amount, setAmount] = useState<number | null>(amountKes ?? null);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    getManualPayInfo().then(setInfo);
    if (amountKes == null && kind !== 'promotion') getPlanAmount(kind, plan, period).then(setAmount);
  }, [kind, plan, period, amountKes]);

  const copy = async () => {
    if (!info) return;
    try { await navigator.clipboard.writeText(info.pay_to_number); showToast?.('Number copied'); } catch { /* ignore */ }
  };

  const submit = async () => {
    setErr('');
    setBusy(true);
    const e = await submitManualPayment({ kind, plan, period, promotionId, code, senderPhone: phone });
    setBusy(false);
    if (e) { setErr(e); return; }
    setDone(true);
    onSubmitted?.();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-[#1C1A1E] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base text-slate-900 dark:text-slate-100">Pay with M-Pesa</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Code received</p>
            <p className="text-xs text-slate-500">We will confirm your payment shortly and you will get a notification once it is active.</p>
            <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-[#E0533C] text-white text-sm font-black">Done</button>
          </div>
        ) : !info ? (
          <p className="text-xs text-slate-500">Payments are not available right now. Please try again later.</p>
        ) : (
          <>
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal pl-4">
              <li>Open M-Pesa and choose <b>{info.pay_method}</b>.</li>
              <li>Send {amount != null ? <b>KES {amount.toLocaleString('en-KE')}</b> : 'the plan amount'} to <b>{info.pay_to_number}</b>.</li>
              <li>Type the 10-character code from the confirmation SMS below.</li>
            </ol>
            <button type="button" onClick={copy} className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy {info.pay_to_number}
            </button>
            <input className={input} value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" placeholder="M-Pesa code, e.g. SGH7K2L9XQ" />
            <input className={input} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone you paid from, e.g. 0712345678" />
            {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
            <button type="button" disabled={busy || code.trim().length < 10 || !phone.trim()} onClick={submit}
              className="w-full py-3.5 rounded-2xl bg-[#E0533C] disabled:opacity-50 text-white text-sm font-black">
              {busy ? 'Sending…' : 'I have paid'}
            </button>
            <p className="text-[10px] text-slate-400">Only send the exact amount. Your plan is activated after we confirm the payment.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ManualPaySheet;
