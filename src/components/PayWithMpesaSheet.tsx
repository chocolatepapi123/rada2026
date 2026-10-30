import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Smartphone, X, XCircle } from 'lucide-react';
import { PLAN_META, type PlanId, type SubKind } from '../lib/subscriptions';
import { normalizeKenyanPhone, startPlanPayment, waitForPayment, type BillingPeriod } from '../lib/payments';

interface Props {
  kind: SubKind;
  plan: Exclude<PlanId, 'free'>;
  amountKes: number;
  periodDays: number;
  period?: BillingPeriod;
  onClose: () => void;
  /** Called once the payment has succeeded so the caller can refresh the plan. */
  onPaid: () => void;
}

type Phase = 'form' | 'waiting' | 'done' | 'failed';

export const PayWithMpesaSheet: React.FC<Props> = ({ kind, plan, amountKes, periodDays, period = 'monthly', onClose, onPaid }) => {
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [msg, setMsg] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const pay = async () => {
    if (!normalizeKenyanPhone(phone)) {
      setMsg('Enter a valid Safaricom number, like 0712 345 678.');
      return;
    }
    setMsg('');
    setPhase('waiting');
    try {
      const started = await startPlanPayment(kind, plan, phone, period);
      abort.current = new AbortController();
      const row = await waitForPayment(started.payment_id, { signal: abort.current.signal });
      if (row?.status === 'succeeded') {
        setPhase('done');
        onPaid();
      } else if (!row || row.status === 'pending') {
        setPhase('failed');
        setMsg("We haven't heard back from M-Pesa yet. If you entered your PIN, your plan will switch on shortly. Tap refresh on the plans page in a minute.");
      } else {
        setPhase('failed');
        setMsg(row.failure_reason || 'The payment did not go through. You have not been charged.');
      }
    } catch (e: any) {
      setPhase('form');
      setMsg(e?.message || 'We could not start the payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {kind === 'creator' ? 'Creator' : 'Merchant'} {PLAN_META[plan].name}
            </p>
            <p className="text-2xl font-black tracking-tight mt-1">KES {amountKes.toLocaleString('en-KE')}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">for {periodDays} days. Not auto-renewed.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {phase === 'form' && (
          <>
            <label className="block">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">M-Pesa number</span>
              <input
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-[15px] font-semibold outline-none focus:border-[#E0533C]"
              />
            </label>
            {msg && <p className="text-[12px] text-red-500">{msg}</p>}
            <button type="button" onClick={pay} className="w-full py-3.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer">
              <Smartphone className="w-4 h-4" /> Pay with M-Pesa
            </button>
            <p className="text-[11px] text-slate-400 leading-relaxed">You&apos;ll get a prompt on your phone to enter your M-Pesa PIN. RADA never sees your PIN.</p>
          </>
        )}

        {phase === 'waiting' && (
          <div className="py-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E0533C]" />
            <p className="text-[14px] font-black">Check your phone</p>
            <p className="text-[12px] text-slate-500">Enter your M-Pesa PIN to approve KES {amountKes.toLocaleString('en-KE')}.</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="text-[15px] font-black">Payment received</p>
            <p className="text-[12px] text-slate-500">Your {PLAN_META[plan].name} plan is now active.</p>
            <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[13px] font-black cursor-pointer">Done</button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="py-2 text-center space-y-3">
            <XCircle className="w-9 h-9 mx-auto text-amber-500" />
            <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{msg}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPhase('form')} className="flex-1 py-3 rounded-2xl bg-[#E0533C] text-white text-[13px] font-black cursor-pointer">Try again</button>
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-black cursor-pointer">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayWithMpesaSheet;
