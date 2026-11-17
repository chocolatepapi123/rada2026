import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { fetchMyMonthVisits } from '../lib/interestGroups.ts';

/** "My month on RADA": drawn on a canvas so the image you see is the image you share. Counts only your own visits. */
const RecapCard: React.FC<{ onClose: () => void; showToast: (m: string) => void }> = ({ onClose, showToast }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [places, setPlaces] = useState<string[] | null>(null);

  useEffect(() => { void fetchMyMonthVisits().then((v) => setPlaces(v.map((x) => x.spot_title || 'A spot'))); }, []);
  useEffect(() => {
    const c = ref.current; if (!c || places === null) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const W = 1080, H = 1350, F = "Inter, system-ui, sans-serif";
    c.width = W; c.height = H;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0F172A'); g.addColorStop(1, '#3B2A5C');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F4B860'; ctx.font = `900 44px ${F}`; ctx.fillText('RADA', 90, 130);
    ctx.fillStyle = '#FFFFFF'; ctx.font = `900 84px ${F}`;
    ctx.fillText(new Date().toLocaleString('en-KE', { month: 'long' }) + ' recap', 90, 280);
    const uniq = Array.from(new Set(places));
    ctx.font = `900 260px ${F}`; ctx.fillStyle = '#F4B860'; ctx.fillText(String(places.length), 90, 600);
    ctx.font = `700 48px ${F}`; ctx.fillStyle = '#FFFFFF';
    ctx.fillText(places.length === 1 ? 'outing this month' : 'outings this month', 90, 670);
    ctx.font = `700 40px ${F}`; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    uniq.slice(0, 5).forEach((p, i) => ctx.fillText('• ' + (p.length > 34 ? p.slice(0, 33) + '…' : p), 90, 790 + i * 70));
    if (uniq.length > 5) ctx.fillText(`+ ${uniq.length - 5} more`, 90, 790 + 5 * 70);
    ctx.fillStyle = '#F4B860'; ctx.font = `800 36px ${F}`; ctx.fillText('Go out. Together. rada.app', 90, H - 90);
  }, [places]);

  const blob = () => new Promise<Blob | null>((r) => ref.current?.toBlob(r, 'image/png'));
  const share = async () => {
    const b = await blob(); if (!b) return;
    const file = new File([b], 'rada-recap.png', { type: 'image/png' });
    try {
      if ((navigator as any).canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'My RADA month' });
      else save(b);
    } catch { /* cancelled */ }
  };
  const save = (b: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'rada-recap.png'; a.click(); showToast('Saved.'); };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl p-4 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><b>My month</b><button onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="w-5 h-5" /></button></div>
        {places === null ? <p className="text-sm text-slate-500 py-10 text-center">Building your recap…</p>
          : places.length === 0 ? <p className="text-sm text-slate-500 py-10 text-center">No outings yet this month. Join one and it will show up here.</p>
          : <canvas ref={ref} className="w-full rounded-2xl" />}
        {!!places?.length && (
          <div className="flex gap-2">
            <button onClick={share} className="flex-1 py-2.5 rounded-full bg-[#E0533C] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"><Share2 className="w-3.5 h-3.5" />Share</button>
            <button onClick={async () => { const b = await blob(); if (b) save(b); }} className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Save</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default RecapCard;
