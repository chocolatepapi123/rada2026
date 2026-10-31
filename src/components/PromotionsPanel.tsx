import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, Loader2, Rocket, Smartphone, X } from 'lucide-react';
import {
  DOW, STATUS_LABEL, cancelMyPromotion, fetchMyPromotions, fetchPromoProducts, fetchPromotionReport,
  nextStartDate, priceLabel, requestPromotion, startPromoPayment,
  type PromoPlacement, type PromoProduct, type Promotion, type PromotionReport, type PromoStatus, type PromoTargetType,
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

const BRAND = '#E0533C';

const dateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Plain-language line for each pack. Promoted items are not labelled in the app, so we never say "sponsored". */
const PLACEMENT_COPY: Record<PromoPlacement, string> = {
  home_top10: 'Shown among the first 10 on the Home feed',
  home_11_20: 'Shown in positions 11 to 20 on the Home feed',
  spotlight: 'Featured in the weekend spotlight for your category',
  event_boost: 'Pushed up the Events and Outings lists',
  spots_category: 'Listed first inside a category on the Spots tab',
};

const STEPS = ['Request', 'Approval', 'Pay', 'Live'];
/** How far along the 4 steps a status is (1-based index of the current step). */
const stepOf = (s: PromoStatus): number => {
  switch (s) {
    case 'draft': case 'requested': return 2;
    case 'approved': case 'pending_payment': return 3;
    case 'scheduled': case 'active': return 4;
    case 'completed': return 5;
    default: return 0;
  }
};

const pillCls = (s: PromoStatus) => {
  if (s === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
  if (s === 'approved' || s === 'pending_payment') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200';
  if (s === 'rejected' || s === 'refunded') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
};

const Sheet: React.FC<{ onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ onClose, title, children, footer }) => (
  <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="w-full sm:max-w-md max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-3xl bg-white dark:bg-[#1C1A1E] shadow-2xl animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="pt-2.5 pb-1 flex justify-center sm:hidden"><span className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" /></div>
      <div className="px-5 pt-2 pb-3 flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
        <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="px-5 pb-4 overflow-y-auto space-y-4">{children}</div>
      {footer && <div className="px-5 pt-3 pb-5 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
    </div>
  </div>
);

const fieldCls = 'w-full rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-[13px] font-semibold outline-none focus:border-[#E0533C]';

/**
 * Bottom sheet to pick a pack and send a boost request. Can be opened from anywhere (an offer card, the
 * Boost tab, right after publishing a promo). `lockedTargetKey` skips the "what to boost" choice.
 */
export const BoostSheet: React.FC<{
  targets: PromoTarget[];
  audience: 'merchant' | 'creator';
  categories?: { id: string; label: string }[];
  lockedTargetKey?: string;
  /** Shown under the title, e.g. the promo's name. */
  subject?: string;
  onClose: () => void;
  onSent?: () => void;
  onViewBoosts?: () => void;
}> = ({ targets, audience, categories = [], lockedTargetKey, subject, onClose, onSent, onViewBoosts }) => {
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [targetKey, setTargetKey] = useState(lockedTargetKey || '');
  const [category, setCategory] = useState('');
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const eligible = useMemo(() => targets.filter((t) => (audience === 'creator' ? t.type === 'outing' : t.type !== 'outing')), [targets, audience]);
  useEffect(() => {
    if (!targetKey && eligible.length === 1) setTargetKey(`${eligible[0].type}:${eligible[0].id}`);
  }, [eligible, targetKey]);

  useEffect(() => {
    let live = true;
    fetchPromoProducts()
      .then((p) => live && setProducts(p.filter((x) => x.audience === 'both' || x.audience === audience)))
      .catch((e) => live && setErr(e?.message || 'Could not load the packs'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [audience]);

  const product = products.find((p) => p.id === productId) || null;
  const target = eligible.find((t) => `${t.type}:${t.id}` === targetKey) || null;
  useEffect(() => { if (product) setStart(nextStartDate(product.start_dow)); }, [product]);

  const canSend = !!product && !!target && !!start && (!product.needs_category || !!category) && !busy;

  const send = async () => {
    if (!product || !target) return;
    setBusy(true); setErr('');
    try {
      await requestPromotion({
        product: product.id, targetType: target.type, targetId: target.id, targetTitle: target.title,
        category: product.needs_category ? category : null, zone: target.zone ?? null, start,
      });
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setErr(e?.message || 'Could not send this request');
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <Sheet onClose={onClose} title="Request sent">
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <span className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-9 h-9" /></span>
          <p className="text-[14px] font-black text-slate-900 dark:text-white">{product?.name} for {target?.title}</p>
          <p className="text-[12px] text-slate-500 leading-relaxed max-w-xs">
            RADA reviews every request. Once it is approved you will get a notification, then you pay with M-Pesa from the Boost tab and it goes live on your start date.
          </p>
        </div>
        <div className="space-y-2 pb-1">
          {onViewBoosts && <button type="button" onClick={() => { onClose(); onViewBoosts(); }} className="w-full py-3.5 rounded-2xl text-white text-[13px] font-black cursor-pointer" style={{ background: BRAND }}>See my boosts</button>}
          <button type="button" onClick={onClose} className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-bold cursor-pointer">Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      onClose={onClose}
      title="Boost"
      footer={
        <div className="space-y-2">
          {err && <p className="text-[12px] font-semibold text-rose-600">{err}</p>}
          <button type="button" disabled={!canSend} onClick={send} className="w-full py-3.5 rounded-2xl text-white text-[14px] font-black disabled:opacity-40 cursor-pointer" style={{ background: BRAND }}>
            {busy ? 'Sending…' : product ? `Send request · ${priceLabel(product.price_kes)}` : 'Choose a pack'}
          </button>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">You pay only after RADA approves. Results are not guaranteed.</p>
        </div>
      }
    >
      {subject && <p className="-mt-2 text-[12px] font-semibold text-slate-500">For: <span className="text-slate-800 dark:text-slate-200">{subject}</span></p>}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : products.length === 0 ? (
        <p className="text-[13px] text-slate-500">No boost packs are available right now.</p>
      ) : (
        <>
          {!lockedTargetKey && eligible.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">What to boost</p>
              <select value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className={fieldCls}>
                <option value="">{audience === 'creator' ? 'Choose an outing' : 'Choose what to boost'}</option>
                {eligible.map((t) => <option key={`${t.type}:${t.id}`} value={`${t.type}:${t.id}`}>{t.title}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pick a pack</p>
            {products.map((p) => {
              const on = productId === p.id;
              return (
                <button key={p.id} type="button" onClick={() => setProductId(p.id)}
                  className={`w-full text-left rounded-2xl p-3.5 border-2 transition cursor-pointer flex items-start gap-3 ${on ? 'border-[#E0533C] bg-[#E0533C]/5' : 'border-slate-100 dark:border-slate-800'}`}>
                  <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'border-[#E0533C] bg-[#E0533C] text-white' : 'border-slate-300 dark:border-slate-600'}`}>{on && <Check className="w-3 h-3" />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-black text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-[13px] font-black" style={{ color: BRAND }}>{priceLabel(p.price_kes)}</span>
                    </span>
                    <span className="block text-[12px] text-slate-500 mt-0.5">{p.description || PLACEMENT_COPY[p.placement]}</span>
                    <span className="block text-[11px] font-semibold text-slate-400 mt-1">
                      {p.duration_days} {p.duration_days === 1 ? 'day' : 'days'}{p.start_dow !== null ? ` · starts ${DOW[p.start_dow]}` : ''}{p.slots ? ` · ${p.slots} slots` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {product && (
            <div className="space-y-3">
              {product.needs_category && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Category</p>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
                    <option value="">Choose a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Start date</p>
                <input type="date" value={start} min={nextStartDate(null)} onChange={(e) => setStart(e.target.value)} className={fieldCls} />
                {product.start_dow !== null && <p className="text-[11px] text-slate-400">This pack starts on a {DOW[product.start_dow]}.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
};

const PaySheet: React.FC<{ promo: Promotion; onClose: () => void; onDone: () => void }> = ({ promo, onClose, onDone }) => {
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'form' | 'waiting' | 'done' | 'failed'>('form');
  const [msg, setMsg] = useState('');

  const pay = async () => {
    const n = normalizeKenyanPhone(phone);
    if (!n) { setMsg('Enter a valid Safaricom number, like 0712 345 678.'); return; }
    setMsg(''); setPhase('waiting');
    try {
      const started = await startPromoPayment(promo.id, n);
      const row = await waitForPayment(started.payment_id);
      if (row?.status === 'succeeded') { setPhase('done'); onDone(); }
      else if (!row || row.status === 'pending') { setPhase('failed'); setMsg("We haven't heard back from M-Pesa yet. If you entered your PIN, your boost will update shortly."); onDone(); }
      else { setPhase('failed'); setMsg(row.failure_reason || 'The payment did not go through. You have not been charged.'); }
    } catch (e: any) { setPhase('form'); setMsg(e?.message || 'Could not start the payment'); }
  };

  return (
    <Sheet onClose={phase === 'waiting' ? () => undefined : onClose} title={phase === 'done' ? 'Payment received' : 'Pay with M-Pesa'}>
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-black truncate text-slate-900 dark:text-white">{promo.target_title}</p>
          <p className="text-[11px] text-slate-500">{dateLabel(promo.start_date)} – {dateLabel(promo.end_date)}</p>
        </div>
        <p className="text-[16px] font-black" style={{ color: BRAND }}>{priceLabel(promo.amount_kes)}</p>
      </div>

      {phase === 'form' && (
        <div className="space-y-3 pb-1">
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="M-Pesa number, 0712 345 678" className={fieldCls} />
          {msg && <p className="text-[12px] font-semibold text-rose-600">{msg}</p>}
          <button type="button" onClick={pay} className="w-full py-3.5 rounded-2xl text-white text-[14px] font-black flex items-center justify-center gap-2 cursor-pointer" style={{ background: BRAND }}>
            <Smartphone className="w-4 h-4" /> Send M-Pesa prompt
          </button>
        </div>
      )}
      {phase === 'waiting' && (
        <div className="flex flex-col items-center text-center py-6 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND }} />
          <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Check your phone and enter your M-Pesa PIN…</p>
        </div>
      )}
      {phase === 'done' && (
        <div className="flex flex-col items-center text-center py-4 space-y-3 pb-2">
          <span className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-9 h-9" /></span>
          <p className="text-[13px] text-slate-500">Your boost is confirmed and goes live on {dateLabel(promo.start_date)}.</p>
          <button type="button" onClick={onClose} className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-bold cursor-pointer">Done</button>
        </div>
      )}
      {phase === 'failed' && (
        <div className="space-y-3 pb-1">
          <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{msg}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPhase('form')} className="flex-1 py-3 rounded-2xl text-white text-[13px] font-black cursor-pointer" style={{ background: BRAND }}>Try again</button>
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

const Progress: React.FC<{ status: PromoStatus }> = ({ status }) => {
  const at = stepOf(status);
  if (at === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      {STEPS.map((label, i) => {
        const done = at > i + 1 || at === 5;
        const current = at === i + 1;
        return (
          <div key={label} className="space-y-1">
            <span className={`block h-1.5 rounded-full ${done ? 'bg-emerald-500' : current ? 'bg-[#E0533C]' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <span className={`block text-[10px] font-bold ${current ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const PromotionsPanel: React.FC<Props> = ({ targets, audience, categories = [] }) => {
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [mine, setMine] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [boostOpen, setBoostOpen] = useState(false);
  const [payFor, setPayFor] = useState<Promotion | null>(null);
  const [report, setReport] = useState<{ promo: Promotion; data: PromotionReport } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([fetchPromoProducts(), fetchMyPromotions()]);
      setProducts(p);
      setMine(m);
      setErr('');
    } catch (e: any) {
      setErr(e?.message || 'Could not load boosts');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name || 'Boost';
  const needsPay = mine.filter((p) => p.status === 'approved' || p.status === 'pending_payment');

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this boost request?')) return;
    try { await cancelMyPromotion(id); await load(); } catch (e: any) { setErr(e?.message || 'Could not cancel'); }
  };
  const openReport = async (promo: Promotion) => {
    try { setReport({ promo, data: await fetchPromotionReport(promo.id) }); } catch (e: any) { setErr(e?.message || 'Could not load the report'); }
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E0533C 0%,#C2402B 60%,#9F2F1E 100%)' }}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative space-y-3">
          <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center"><Rocket className="w-5 h-5" /></span>
          <div>
            <p className="text-[18px] font-black tracking-tight">Boost your {audience === 'creator' ? 'outing' : 'business'}</p>
            <p className="text-[12px] text-white/80 mt-1 leading-relaxed">Get seen higher up on RADA. Pick a pack, RADA approves it, you pay with M-Pesa and it goes live.</p>
          </div>
          <button type="button" onClick={() => setBoostOpen(true)} className="px-5 py-2.5 rounded-xl bg-white text-[13px] font-black cursor-pointer active:scale-95 transition" style={{ color: BRAND }}>
            Boost now
          </button>
        </div>
      </div>

      {needsPay.length > 0 && (
        <button type="button" onClick={() => setPayFor(needsPay[0])}
          className="w-full rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3.5 flex items-center gap-3 text-left cursor-pointer">
          <span className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-black text-amber-900 dark:text-amber-200">{needsPay.length === 1 ? 'Approved. Pay to go live' : `${needsPay.length} approved boosts are waiting for payment`}</span>
            <span className="block text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate">{needsPay[0].target_title} · {priceLabel(needsPay[0].amount_kes)}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-amber-700" />
        </button>
      )}

      {err && <p className="text-[12px] font-semibold text-rose-600 px-1">{err}</p>}

      <div className="space-y-3">
        <h3 className="text-[15px] font-black px-1 text-slate-900 dark:text-white">Your boosts</h3>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : mine.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1A1E] p-6 text-center">
            <Rocket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] font-black text-slate-900 dark:text-white">No boosts yet</p>
            <p className="text-[12px] text-slate-400 mt-1">Your requests and live boosts will show up here.</p>
          </div>
        ) : mine.map((p) => (
          <div key={p.id} className="rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 shadow-sm border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{p.target_title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{nameOf(p.product_id)} · {dateLabel(p.start_date)} – {dateLabel(p.end_date)} · {priceLabel(p.amount_kes)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${pillCls(p.status)}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <Progress status={p.status} />
            {p.admin_note && <p className="text-[11px] text-slate-500 mt-2.5">{p.admin_note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.status === 'approved' || p.status === 'pending_payment') && (
                <button type="button" onClick={() => setPayFor(p)} className="px-4 py-2 rounded-xl text-white text-[12px] font-black cursor-pointer" style={{ background: BRAND }}>Pay {priceLabel(p.amount_kes)}</button>
              )}
              {(p.status === 'requested' || p.status === 'approved' || p.status === 'pending_payment') && (
                <button type="button" onClick={() => cancel(p.id)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold cursor-pointer">Cancel</button>
              )}
              {(p.status === 'active' || p.status === 'completed') && (
                <button type="button" onClick={() => openReport(p)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[12px] font-bold flex items-center gap-1.5 cursor-pointer"><BarChart3 className="w-3.5 h-3.5" /> Report</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {boostOpen && <BoostSheet targets={targets} audience={audience} categories={categories} onClose={() => setBoostOpen(false)} onSent={load} />}
      {payFor && <PaySheet promo={payFor} onClose={() => setPayFor(null)} onDone={load} />}
      {report && (
        <Sheet onClose={() => setReport(null)} title={report.promo.target_title}>
          {Object.keys(report.data.counts).length === 0 ? (
            <p className="text-[13px] text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {Object.entries(report.data.counts).map(([k, v]) => (
                <li key={k} className="flex justify-between rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-2"><span className="capitalize">{k.replace(/_/g, ' ')}</span><span className="font-black">{v}</span></li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed pb-1">{report.data.note}</p>
        </Sheet>
      )}
    </div>
  );
};

export default PromotionsPanel;
