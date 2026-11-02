import React, { useState } from 'react';
import { UtensilsCrossed, Wallet, CalendarCheck, Sparkles, Wrench, Phone, MessageCircle, ExternalLink, Info } from 'lucide-react';
import { useSpotDetails } from '../lib/spotDetails';
import { getBlockTitle } from '../lib/spotDetailFields';

const card = 'p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2';
const head = 'text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5';
const kes = (n: number | null | undefined) => (n === null || n === undefined ? '' : `KES ${Number(n).toLocaleString('en-KE')}`);
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const waLink = (v?: string | null) => {
  if (!v) return null;
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/[^0-9]/g, '');
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
};
const POLICY: Record<string, string> = {
  not_needed: 'Reservation not needed',
  recommended: 'Reservation recommended',
  required: 'Reservation required',
};

export const SpotDetailSections: React.FC<{ spot: any }> = ({ spot }) => {
  const row = useSpotDetails(spot?.id);
  const [showAllMenu, setShowAllMenu] = useState(false);
  if (!row) return null;
  const cat = spot?.category;

  const menuItems = arr(row.menu_items).filter(m => m?.name);
  const menuUrl = safeUrl(row.menu_url);
  const pricing = arr(row.pricing).filter(p => p?.label);
  const activities = arr(row.activities).filter(a => a?.name);
  const equipment = arr(row.equipment).filter(e => e?.name);
  const payments = arr(row.payment_methods).filter(Boolean);
  const hasRange = row.price_min_kes != null || row.price_max_kes != null;
  const bookUrl = safeUrl(row.reservation_url);
  const wa = waLink(row.reservation_whatsapp);
  const phone = row.reservation_phone?.trim() || '';
  const hasBook = !!(row.reservation_policy || bookUrl || wa || phone || row.reservation_notes);

  const showMenu = menuItems.length > 0 || !!menuUrl;
  const showPrices = pricing.length > 0 || hasRange || payments.length > 0;
  if (!showMenu && !showPrices && !activities.length && !equipment.length && !hasBook) return null;

  const visibleMenu = showAllMenu ? menuItems : menuItems.slice(0, 8);
  const sections: Record<string, any[]> = {};
  visibleMenu.forEach(m => { const k = m.section || ''; (sections[k] = sections[k] || []).push(m); });

  return (
    <div className="space-y-3">
      {showMenu && (
        <div className={card}>
          <span className={head}><UtensilsCrossed className="w-3.5 h-3.5 text-[#E0533C]" />{getBlockTitle(cat, 'menu', 'Menu')}</span>
          {Object.entries(sections).map(([sec, items]) => (
            <div key={sec || 'x'} className="space-y-1">
              {sec && <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">{sec}</p>}
              {items.map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                    {m.description && <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>}
                  </div>
                  {m.price_kes != null && <span className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">{kes(m.price_kes)}</span>}
                </div>
              ))}
            </div>
          ))}
          {menuItems.length > 8 && (
            <button type="button" onClick={() => setShowAllMenu(v => !v)} className="text-[11px] font-bold text-[#E0533C]">
              {showAllMenu ? 'Show less' : `Show all ${menuItems.length} items`}
            </button>
          )}
          {menuUrl && (
            <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E0533C]">
              <ExternalLink className="w-3 h-3" /> View full menu
            </a>
          )}
        </div>
      )}

      {showPrices && (
        <div className={card}>
          <span className={head}><Wallet className="w-3.5 h-3.5 text-[#E0533C]" />{getBlockTitle(cat, 'pricing', 'Prices')}</span>
          {hasRange && (
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {row.price_min_kes != null && row.price_max_kes != null ? `${kes(row.price_min_kes)} – ${kes(row.price_max_kes)}` : row.price_min_kes != null ? `From ${kes(row.price_min_kes)}` : `Up to ${kes(row.price_max_kes)}`}
            </p>
          )}
          {pricing.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.label}</p>
                {p.note && <p className="text-[11px] text-slate-500 leading-snug">{p.note}</p>}
              </div>
              {p.amount_kes != null && <span className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0 text-right">{kes(p.amount_kes)}{p.unit ? <span className="block text-[10px] font-semibold text-slate-400">{p.unit}</span> : null}</span>}
            </div>
          ))}
          {payments.length > 0 && <p className="text-[11px] text-slate-500">Payment: {payments.join(' • ')}</p>}
        </div>
      )}

      {activities.length > 0 && (
        <div className={card}>
          <span className={head}><Sparkles className="w-3.5 h-3.5 text-[#E0533C]" />{getBlockTitle(cat, 'activities', 'Activities')}</span>
          {activities.map((a, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{a.name}{a.duration_min ? <span className="font-medium text-slate-400"> • {a.duration_min} min</span> : null}</p>
                {a.description && <p className="text-[11px] text-slate-500 leading-snug">{a.description}</p>}
                {a.price_note && <p className="text-[10px] text-slate-400">{a.price_note}</p>}
              </div>
              {a.price_kes != null && <span className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">{kes(a.price_kes)}</span>}
            </div>
          ))}
        </div>
      )}

      {equipment.length > 0 && (() => {
        const provided = equipment.filter(e => e.provided !== false);
        const bring = equipment.filter(e => e.provided === false);
        const line = (e: any, i: number) => (
          <p key={i} className="text-xs text-slate-800 dark:text-slate-200">
            • {e.name}{e.rental_price_kes != null ? ` (rent ${kes(e.rental_price_kes)})` : ''}{e.note ? <span className="text-slate-400"> – {e.note}</span> : null}
          </p>
        );
        return (
          <div className={card}>
            <span className={head}><Wrench className="w-3.5 h-3.5 text-[#E0533C]" />{getBlockTitle(cat, 'equipment', 'Equipment')}</span>
            {provided.length > 0 && <div className="space-y-0.5">{bring.length > 0 && <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Provided</p>}{provided.map(line)}</div>}
            {bring.length > 0 && <div className="space-y-0.5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bring your own</p>{bring.map(line)}</div>}
          </div>
        );
      })()}

      {hasBook && (
        <div className={card}>
          <span className={head}><CalendarCheck className="w-3.5 h-3.5 text-[#E0533C]" />{getBlockTitle(cat, 'reservation', 'Book')}</span>
          {row.reservation_policy && <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{POLICY[row.reservation_policy]}</p>}
          {row.reservation_notes && <p className="text-[11px] text-slate-500 leading-snug">{row.reservation_notes}</p>}
          <div className="flex flex-wrap gap-1.5">
            {phone && <a href={`tel:${phone.replace(/\s+/g, '')}`} className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-[11px] font-bold flex items-center gap-1"><Phone className="w-3 h-3 text-[#E0533C]" />{phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-[11px] font-bold flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-600" />WhatsApp</a>}
            {bookUrl && <a href={bookUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-xl bg-[#E0533C] text-white text-[11px] font-bold flex items-center gap-1"><ExternalLink className="w-3 h-3" />Book online</a>}
          </div>
        </div>
      )}

      {row.verified === false && (
        <p className="text-[10px] text-slate-400 flex items-start gap-1 px-1">
          <Info className="w-3 h-3 mt-px shrink-0" />
          <span>Unverified: {row.source === 'website' ? "taken from the venue's website" : 'not yet confirmed by the venue'}. Prices and details may have changed; confirm with the venue.</span>
        </p>
      )}
    </div>
  );
};

export default SpotDetailSections;
