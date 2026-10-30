import React, { useEffect, useState } from 'react';
import { fetchMilestones, MILESTONE_META, type MilestoneData, type MilestoneKind } from '../lib/milestones';

const KINDS: MilestoneKind[] = ['outings', 'spots', 'photo_reviews'];

export const MilestoneBadges: React.FC<{ userId?: string | null }> = ({ userId }) => {
  const [data, setData] = useState<MilestoneData | null>(null);

  useEffect(() => {
    let live = true;
    fetchMilestones(userId).then((d) => live && setData(d)).catch(() => undefined);
    return () => { live = false; };
  }, [userId]);

  if (!data) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">My Badges</h2>
      <div className="space-y-2.5">
        {KINDS.map((k) => {
          const meta = MILESTONE_META[k];
          const count = data.counts?.[k] ?? 0;
          const level = data.levels?.[k] ?? 0;
          const next = data.thresholds.find((t) => t > count);
          const prev = level > 0 ? data.thresholds[level - 1] : 0;
          const pct = next ? Math.min(100, Math.round(((count - prev) / (next - prev)) * 100)) : 100;
          return (
            <div key={k} className="rounded-3xl p-4 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${level > 0 ? 'bg-amber-100 dark:bg-amber-950/60' : 'bg-slate-100 dark:bg-slate-800 grayscale opacity-60'}`}>
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-slate-500">{meta.title}</p>
                  <p className="text-sm font-black truncate">{level > 0 ? meta.names[level - 1] : 'Not unlocked yet'}</p>
                  <p className="text-[11px] text-slate-400">
                    {count} {meta.unit}{next ? ` · next badge at ${next}` : ' · top badge reached'}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-[#E0533C]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneBadges;
