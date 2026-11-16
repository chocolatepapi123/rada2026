import React, { useState } from 'react';
import { Compass, Users, CalendarPlus, Store, Check, Loader2, X } from 'lucide-react';
import { INTENT_OPTIONS, saveIntents, type Intent } from '../lib/userIntent';

const ICONS: Record<Intent, React.ElementType> = {
  discover: Compass,
  meet: Users,
  host: CalendarPlus,
  business: Store,
};

interface IntentPromptProps {
  uid: string;
  initial?: Intent[] | null;
  /** 'first' = shown once after sign-in (can be skipped). 'edit' = opened from Account settings. */
  mode?: 'first' | 'edit';
  onDone: (intents: Intent[]) => void;
  onSkip: () => void;
}

export const IntentPrompt: React.FC<IntentPromptProps> = ({ uid, initial, mode = 'first', onDone, onSkip }) => {
  const [picked, setPicked] = useState<Intent[]>(initial || []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: Intent) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save() {
    if (!picked.length) return;
    setSaving(true);
    await saveIntents(uid, picked);
    setSaving(false);
    onDone(picked);
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="What brings you to RADA">
      <div className="w-full sm:max-w-sm bg-white dark:bg-[#161316] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black">{mode === 'first' ? 'What brings you to RADA?' : 'What you use RADA for'}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Pick all that fit. We use this to keep your menu and suggestions relevant. You can change it any time in Account settings.
            </p>
          </div>
          <button type="button" onClick={onSkip} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {INTENT_OPTIONS.map((o) => {
            const Icon = ICONS[o.id];
            const on = picked.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                aria-pressed={on}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition cursor-pointer ${
                  on
                    ? 'border-[#E0533C] bg-[#E0533C]/8 dark:bg-[#E0533C]/15'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F0D10]'
                }`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-[#E0533C] text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-extrabold leading-tight">{o.title}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{o.sub}</span>
                </span>
                {on && <Check className="w-4 h-4 text-[#E0533C] shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || !picked.length}
          className="w-full mt-4 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{mode === 'first' ? 'Continue' : 'Save'}</span>
        </button>
        {mode === 'first' && (
          <button type="button" onClick={onSkip} className="w-full mt-1.5 py-2 text-[11px] font-bold text-slate-500 cursor-pointer">Skip for now</button>
        )}
      </div>
    </div>
  );
};
