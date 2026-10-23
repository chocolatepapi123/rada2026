import React from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import { useNearYou } from '../lib/spotRanking.ts';

const RADII: { km: number | null; label: string }[] = [
  { km: 2, label: '2 km' }, { km: 5, label: '5 km' }, { km: 10, label: '10 km' }, { km: 25, label: '25 km' }, { km: null, label: 'Any' },
];

/** "Near You" pill + radius chips. Drop it anywhere; state is shared between tabs. */
export const NearYouControl: React.FC<{ className?: string }> = ({ className = '' }) => {
  const near = useNearYou();
  const msg =
    near.status === 'denied' ? 'Location permission is off. Allow it in your browser settings to use Near You.' :
    near.status === 'unsupported' ? 'This device does not support location.' :
    near.status === 'error' ? 'Could not get your location. Try again.' :
    near.active && near.outsideNairobi ? "You're outside Nairobi, so distances are from the CBD." : '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
        <button
          type="button"
          onClick={near.toggle}
          className={`px-3 py-1.5 rounded-full text-xs shrink-0 flex items-center gap-1.5 border font-black transition-all cursor-pointer ${
            near.active
              ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs'
              : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
          aria-pressed={near.active}
        >
          {near.pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          <span>{near.pending ? 'Locating…' : 'Near You'}</span>
        </button>
        {near.active && RADII.map(r => (
          <button
            key={r.label}
            type="button"
            onClick={() => near.setRadiusKm(r.km)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border cursor-pointer ${
              near.radiusKm === r.km
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {msg && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{msg}</p>}
    </div>
  );
};
