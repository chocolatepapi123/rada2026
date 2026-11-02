import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getDetailBlocks, type BlockConfig } from '../lib/spotDetailFields';
import type { SpotDetailsForm } from '../lib/spotDetails';

const input = 'w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none';
const label = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1';
const box = 'bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 space-y-3';
const rowBox = 'p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2';
const addBtn = 'w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5';

function Title({ cfg }: { cfg: BlockConfig }) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{cfg.title}</h3>
      {cfg.hint && <p className="text-[11px] text-slate-400 mt-0.5">{cfg.hint}</p>}
    </div>
  );
}
const Del = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Remove" className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
);

interface Props {
  category: string;
  value: SpotDetailsForm;
  onChange: (v: SpotDetailsForm) => void;
  loading?: boolean;
}

export const SpotDetailsEditor: React.FC<Props> = ({ category, value, onChange, loading }) => {
  const set = <K extends keyof SpotDetailsForm>(k: K, v: SpotDetailsForm[K]) => onChange({ ...value, [k]: v });
  const upd = <K extends 'menuItems' | 'pricing' | 'activities' | 'equipment'>(k: K, i: number, patch: Partial<SpotDetailsForm[K][number]>) =>
    set(k, value[k].map((r, idx) => (idx === i ? { ...r, ...patch } : r)) as SpotDetailsForm[K]);
  const del = <K extends 'menuItems' | 'pricing' | 'activities' | 'equipment'>(k: K, i: number) =>
    set(k, value[k].filter((_, idx) => idx !== i) as SpotDetailsForm[K]);

  if (!category) {
    return <div className={box}><p className="text-xs text-slate-500">Choose a category above to see the details you can add (menu, prices, booking…).</p></div>;
  }
  if (loading) return <div className={box}><p className="text-xs text-slate-500">Loading saved details…</p></div>;

  return (
    <>
      {getDetailBlocks(category).map(cfg => {
        switch (cfg.block) {
          case 'menu':
            return (
              <div key="menu" className={box}>
                <Title cfg={cfg} />
                <div>
                  <label className={label}>Link to full menu (optional)</label>
                  <input className={input} type="url" value={value.menuUrl} onChange={e => set('menuUrl', e.target.value)} placeholder="https://" />
                </div>
                {value.menuItems.map((m, i) => (
                  <div key={i} className={rowBox}>
                    <div className="flex gap-2"><input className={input} value={m.name} onChange={e => upd('menuItems', i, { name: e.target.value })} placeholder={cfg.namePlaceholder || 'Item name'} /><Del onClick={() => del('menuItems', i)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={input} inputMode="numeric" value={m.price} onChange={e => upd('menuItems', i, { price: e.target.value })} placeholder="Price (KES)" />
                      <input className={input} value={m.section} onChange={e => upd('menuItems', i, { section: e.target.value })} placeholder="Section (e.g. Mains)" />
                    </div>
                    <input className={input} value={m.description} onChange={e => upd('menuItems', i, { description: e.target.value })} placeholder="Description (optional)" />
                  </div>
                ))}
                <button type="button" className={addBtn} onClick={() => set('menuItems', [...value.menuItems, { name: '', section: '', price: '', description: '' }])}><Plus className="w-3.5 h-3.5" />{cfg.addLabel}</button>
              </div>
            );
          case 'pricing':
            return (
              <div key="pricing" className={box}>
                <Title cfg={cfg} />
                {value.pricing.map((p, i) => (
                  <div key={i} className={rowBox}>
                    <div className="flex gap-2"><input className={input} value={p.label} onChange={e => upd('pricing', i, { label: e.target.value })} placeholder={cfg.namePlaceholder || 'What it covers'} /><Del onClick={() => del('pricing', i)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={input} inputMode="numeric" value={p.amount} onChange={e => upd('pricing', i, { amount: e.target.value })} placeholder="Amount (KES)" />
                      <input className={input} list={`units-${cfg.title}`} value={p.unit} onChange={e => upd('pricing', i, { unit: e.target.value })} placeholder="Unit (per night…)" />
                    </div>
                    <input className={input} value={p.note} onChange={e => upd('pricing', i, { note: e.target.value })} placeholder="Note (optional)" />
                  </div>
                ))}
                <datalist id={`units-${cfg.title}`}>{(cfg.units || []).map(u => <option key={u} value={u} />)}</datalist>
                <button type="button" className={addBtn} onClick={() => set('pricing', [...value.pricing, { label: '', amount: '', unit: '', note: '' }])}><Plus className="w-3.5 h-3.5" />{cfg.addLabel}</button>
              </div>
            );
          case 'activities':
            return (
              <div key="activities" className={box}>
                <Title cfg={cfg} />
                {value.activities.map((a, i) => (
                  <div key={i} className={rowBox}>
                    <div className="flex gap-2"><input className={input} value={a.name} onChange={e => upd('activities', i, { name: e.target.value })} placeholder={cfg.namePlaceholder || 'Name'} /><Del onClick={() => del('activities', i)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={input} inputMode="numeric" value={a.price} onChange={e => upd('activities', i, { price: e.target.value })} placeholder="Price (KES)" />
                      <input className={input} inputMode="numeric" value={a.durationMin} onChange={e => upd('activities', i, { durationMin: e.target.value })} placeholder="Minutes (optional)" />
                    </div>
                    <input className={input} value={a.priceNote} onChange={e => upd('activities', i, { priceNote: e.target.value })} placeholder="Price note (e.g. per person)" />
                    <input className={input} value={a.description} onChange={e => upd('activities', i, { description: e.target.value })} placeholder="Description (optional)" />
                  </div>
                ))}
                <button type="button" className={addBtn} onClick={() => set('activities', [...value.activities, { name: '', description: '', price: '', priceNote: '', durationMin: '' }])}><Plus className="w-3.5 h-3.5" />{cfg.addLabel}</button>
              </div>
            );
          case 'equipment':
            return (
              <div key="equipment" className={box}>
                <Title cfg={cfg} />
                {value.equipment.map((e, i) => (
                  <div key={i} className={rowBox}>
                    <div className="flex gap-2"><input className={input} value={e.name} onChange={ev => upd('equipment', i, { name: ev.target.value })} placeholder={cfg.namePlaceholder || 'Item'} /><Del onClick={() => del('equipment', i)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className={input} value={e.provided ? 'yes' : 'no'} onChange={ev => upd('equipment', i, { provided: ev.target.value === 'yes' })}>
                        <option value="yes">Provided</option>
                        <option value="no">Bring your own</option>
                      </select>
                      <input className={input} inputMode="numeric" value={e.rental} onChange={ev => upd('equipment', i, { rental: ev.target.value })} placeholder="Rental price (KES)" />
                    </div>
                    <input className={input} value={e.note} onChange={ev => upd('equipment', i, { note: ev.target.value })} placeholder="Note (optional)" />
                  </div>
                ))}
                <button type="button" className={addBtn} onClick={() => set('equipment', [...value.equipment, { name: '', provided: true, rental: '', note: '' }])}><Plus className="w-3.5 h-3.5" />{cfg.addLabel}</button>
              </div>
            );
          case 'priceRange':
            return (
              <div key="priceRange" className={box}>
                <Title cfg={cfg} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} inputMode="numeric" value={value.priceMin} onChange={e => set('priceMin', e.target.value)} placeholder="From (KES)" />
                  <input className={input} inputMode="numeric" value={value.priceMax} onChange={e => set('priceMax', e.target.value)} placeholder="To (KES)" />
                </div>
              </div>
            );
          case 'payments':
            return (
              <div key="payments" className={box}>
                <Title cfg={cfg} />
                <input className={input} value={value.payments} onChange={e => set('payments', e.target.value)} placeholder="Cash, M-Pesa, Card…" />
              </div>
            );
          case 'reservation':
            return (
              <div key="reservation" className={box}>
                <Title cfg={cfg} />
                <select className={input} value={value.reservationPolicy} onChange={e => set('reservationPolicy', e.target.value as any)}>
                  <option value="">Not set</option>
                  <option value="not_needed">Not needed (walk-ins welcome)</option>
                  <option value="recommended">Recommended</option>
                  <option value="required">Required</option>
                </select>
                <input className={input} value={value.reservationPhone} onChange={e => set('reservationPhone', e.target.value)} placeholder="Booking phone" />
                <input className={input} value={value.reservationWhatsapp} onChange={e => set('reservationWhatsapp', e.target.value)} placeholder="WhatsApp number or link" />
                <input className={input} type="url" value={value.reservationUrl} onChange={e => set('reservationUrl', e.target.value)} placeholder="Online booking link (https://)" />
                <input className={input} value={value.reservationNotes} onChange={e => set('reservationNotes', e.target.value)} placeholder="Notes (deposit, dress code…)" />
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default SpotDetailsEditor;
