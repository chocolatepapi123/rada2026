import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Megaphone, X } from 'lucide-react';
import {
  DOW, STATUS_LABEL, cancelMyPromotion, fetchMyPromotions, fetchPromoProducts, fetchPromotionReport,
  nextStartDate, priceLabel, requestPromotion, startPromoPayment,
  type PromoProduct, type Promotion, type PromotionReport, type PromoTargetType,
} from '../lib/promotions';
import { normalizeKenyanPhone, waitForPayment } from '../lib/payments';

export interface PromoTarget {
  type: PromoTargetType;
  id: string;
  title: string;
  zone?: string;
}

interface Props {
  /** What this person owns and could promote (businesses/spots/listings for merchants, outings for creators). */
  targets: PromoTarget[];
  audience: 'merchant' | 'creator';
  /** value = category id used for matching, label = what the person sees */
  categories?: { id: string; label: string }[];
}

const dateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const PromotionsPanel: React.FC<Props> = ({ targets, audience, categories = [] }) => {
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [mine, setMine] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [productId, setProductId] = useState('');
  const [targetKey, setTargetKey] = useState('');
  const [category, setCategory] = useState('');
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [payPhone, setPayPhone] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [report, setReport] = useState<{ promo: Promotion; data: PromotionReport } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetchPromoProducts(), fetchMyPromotions()]);
      setProducts(p.filter((x) => x.audience === 'both' || x.audience === audience));
      setMine(m);
      setErr('');
    } catch (e: any) {
      setErr(e?.message || 'Could not load promotions');
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const product = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);
  const eligibleTargets = useMemo(
    () => targets.filter((t) => (audience === 'creator' ? t.type === 'outing' : t.type !== 'outing')),
    [targets, audience]
  );
  const target = eligibleTargets.find((t) => `${t.type}:${t.id}` === targetKey) || null;

  useEffect(() => {
    if (product) setStart(nextStartDate(product.start_dow));
  }, [product]);

  const submit = async () => {
    if (!product || !target) return;
    setBusy(true);
    setErr('');
    try {
      await requestPromotion({
        product: product.id,
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title,
        category: product.needs_category ? category : null,
        zone: target.zone ?? null,
        start,
      });
      setProductId('');
      setTargetKey('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Could not request this promotion');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await cancelMyPromotion(id);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Could not cancel');
    }
  };

  const pay = async (id: string) => {
    if (!normalizeKenyanPhone(payPhone)) {
      setErr('Enter a valid Safaricom number, like 0712 345 678.');
      return;
    }
    setPayBusy(true);
    setErr('');
    setPayMsg('Check your phone and enter your M-Pesa PIN…');
    try {
      const started = await startPromoPayment(id, normalizeKenyanPhone(payPhone)!);
      const row = await waitForPayment(started.payment_id);
      if (row?.status === 'succeeded') {
        setPayMsg('Payment received. Your promotion is confirmed.');
        setPayId(null);
      } else if (!row || row.status === 'pending') {
        setPayMsg("We haven't heard back from M-Pesa yet. If you entered your PIN, your promotion will update shortly.");
      } else {
        setPayMsg('');
        setErr(row.failure_reason || 'The payment did not go through. You have not been charged.');
      }
      await load();
    } catch (e: any) {
      setPayMsg('');
      setErr(e?.message || 'Could not start the payment');
    } finally {
      setPayBusy(false);
    }
  };

  const openReport = async (promo: Promotion) => {
    try {
      setReport({ promo, data: await fetchPromotionReport(promo.id) });
    } catch (e: any) {
      setErr(e?.message || 'Could not load the report');
    }
  };

  const canSubmit = !!product && !!target && !!start && (!product.needs_category || !!category) && !busy;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center"><Megaphone className="w-5 h-5" /></span>
          <div>
            <p className="text-[15px] font-black">Promote on RADA</p>
            <p className="text-[12px] text-slate-500">Send a request. Once RADA approves it, you pay here and it goes live. Results are not guaranteed.</p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : products.length === 0 ? (
          <p className="text-[13px] text-slate-500">No promotion packs are available right now.</p>
        ) : (
          <>
            <div className="space-y-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProductId(p.id)}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 transition cursor-pointer ${productId === p.id ? 'border-[#E0533C]' : 'border-slate-100 dark:border-slate-800'}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-black">{p.name}</span>
                    <span className="text-[13px] font-black text-[#E0533C]">{priceLabel(p.price_kes)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {p.duration_days} {p.duration_days === 1 ? 'day' : 'days'}
                    {p.start_dow !== null ? ` · starts ${DOW[p.start_dow]}` : ''}
                    {p.slots ? ` · ${p.slots} slots` : ''}
                  </p>
                </button>
              ))}
            </div>

            {product && (
              <div className="space-y-3">
                <select value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-[13px] font-semibold">
                  <option value="">{audience === 'creator' ? 'Choose an outing' : 'Choose what to promote'}</option>
                  {eligibleTargets.map((t) => (
                    <option key={`${t.type}:${t.id}`} value={`${t.type}:${t.id}`}>{t.title}</option>
                  ))}
                </select>
                {product.needs_category && (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-[13px] font-semibold">
                    <option value="">Choose a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
                <input
                  type="date"
                  value={start}
                  min={nextStartDate(null)}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-[13px] font-semibold"
                />
                <button type="button" disabled={!canSubmit} onClick={submit} className="w-full py-3.5 rounded-2xl bg-[#E0533C] disabled:opacity-40 text-white text-[13px] font-black cursor-pointer">
                  {busy ? 'Sending…' : 'Send request'}
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Not everything can be promoted, so RADA reviews each request first. You only pay ({priceLabel(product.price_kes)}) after it is approved.
                </p>
              </div>
            )}
          </>
        )}
        {err && <p className="text-[12px] text-red-500">{err}</p>}
      </div>

      {mine.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-black px-1">Your promotions</h3>
          {payMsg && <p className="px-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300">{payMsg}</p>}
          {mine.map((p) => (
            <div key={p.id} className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-black truncate">{p.target_title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dateLabel(p.start_date)} – {dateLabel(p.end_date)} · {priceLabel(p.amount_kes)}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 shrink-0">{STATUS_LABEL[p.status]}</span>
              </div>
              {p.admin_note && <p className="text-[11px] text-slate-500 mt-2">{p.admin_note}</p>}
              {payId === p.id && (
                <div className="mt-3 flex gap-2">
                  <input inputMode="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="M-Pesa number, 0712 345 678"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-[13px] font-semibold" />
                  <button type="button" disabled={payBusy} onClick={() => pay(p.id)} className="px-4 py-2 rounded-xl bg-[#E0533C] disabled:opacity-50 text-white text-[12px] font-black cursor-pointer">
                    {payBusy ? '…' : 'Send prompt'}
                  </button>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {(p.status === 'approved' || p.status === 'pending_payment') && (
                  <button type="button" onClick={() => { setPayMsg(''); setPayId(payId === p.id ? null : p.id); }} className="px-3.5 py-2 rounded-xl bg-[#E0533C] text-white text-[12px] font-black cursor-pointer">
                    Pay {priceLabel(p.amount_kes)}
                  </button>
                )}
                {(p.status === 'requested' || p.status === 'approved' || p.status === 'pending_payment') && (
                  <button type="button" onClick={() => cancel(p.id)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold cursor-pointer">Cancel</button>
                )}
                {(p.status === 'active' || p.status === 'completed') && (
                  <button type="button" onClick={() => openReport(p)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold flex items-center gap-1.5 cursor-pointer">
                    <BarChart3 className="w-3.5 h-3.5" /> Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {report && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 space-y-4">
            <div className="flex justify-between items-start">
              <p className="text-[15px] font-black">{report.promo.target_title}</p>
              <button type="button" aria-label="Close" onClick={() => setReport(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {Object.keys(report.data.counts).length === 0 ? (
              <p className="text-[13px] text-slate-500">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-[13px]">
                {Object.entries(report.data.counts).map(([k, v]) => (
                  <li key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g, ' ')}</span><span className="font-black">{v}</span></li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">{report.data.note}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPanel;
