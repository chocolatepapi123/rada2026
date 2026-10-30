import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, Image as ImageIcon, Share2, X } from 'lucide-react';
import type { OutingPlan } from '../types.ts';

/**
 * Share card for outings.
 *  - Pro:   a ready-made card with the outing's key details and photo.
 *  - Elite: the same card, editable (theme, headline, photo, which details to show).
 * The card is drawn on a canvas so what you see is exactly the image that gets shared.
 */

type Theme = { id: string; name: string; from: string; to: string; accent: string; text: string; panel: string };
const THEMES: Theme[] = [
  { id: 'sunset', name: 'Sunset', from: '#E0533C', to: '#E9C46A', accent: '#FFFFFF', text: '#FFFFFF', panel: 'rgba(0,0,0,0.38)' },
  { id: 'midnight', name: 'Midnight', from: '#0F172A', to: '#3B2A5C', accent: '#F4B860', text: '#FFFFFF', panel: 'rgba(0,0,0,0.45)' },
  { id: 'forest', name: 'Forest', from: '#14532D', to: '#2D6A4F', accent: '#FDE68A', text: '#FFFFFF', panel: 'rgba(0,0,0,0.4)' },
  { id: 'clean', name: 'Clean', from: '#FFFFFF', to: '#F1F1EE', accent: '#E0533C', text: '#111827', panel: 'rgba(255,255,255,0.88)' },
  { id: 'gold', name: 'Gold', from: '#1C1A1E', to: '#6B4E16', accent: '#E9C46A', text: '#FFF8E1', panel: 'rgba(0,0,0,0.45)' },
];

export interface ShareCardEdits {
  themeId: string;
  headline: string;
  showHost: boolean;
  showTags: boolean;
  showSpots: boolean;
  imageUrl: string | null; // null = outing photo
}

const W = 1080;
const H = 1350;
const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = test;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

async function drawCard(canvas: HTMLCanvasElement, plan: OutingPlan, edits: ShareCardEdits) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const t = THEMES.find((x) => x.id === edits.themeId) || THEMES[0];
  canvas.width = W;
  canvas.height = H;

  // background: theme gradient, then the photo on top
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.from);
  g.addColorStop(1, t.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const photo = await loadImage(edits.imageUrl || plan.spotImage || '');
  if (photo) {
    const photoH = 800;
    const scale = Math.max(W / photo.width, photoH / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, photoH);
    ctx.clip();
    ctx.drawImage(photo, (W - dw) / 2, (photoH - dh) / 2, dw, dh);
    const fade = ctx.createLinearGradient(0, photoH * 0.45, 0, photoH);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, t.id === 'clean' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.75)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, photoH);
    ctx.restore();
  }

  // brand pill
  ctx.font = `800 34px ${FONT}`;
  const brand = 'RADA';
  const bw = ctx.measureText(brand).width + 56;
  rr(ctx, 56, 56, bw, 66, 33);
  ctx.fillStyle = t.panel;
  ctx.fill();
  ctx.fillStyle = t.id === 'clean' ? '#E0533C' : '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(brand, 84, 90);

  // headline / title
  const title = (edits.headline || '').trim() || plan.spotTitle;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.text;
  ctx.font = `900 84px ${FONT}`;
  const titleLines = wrap(ctx, title, W - 120, 2);
  let y = photo ? 700 : 300;
  titleLines.forEach((line, i) => ctx.fillText(line, 60, y + i * 96));
  y += titleLines.length * 96 + 6;

  // detail panel
  const pad = 40;
  const rows: string[] = [];
  rows.push(`${plan.date}${plan.time ? ' · ' + plan.time : ''}`);
  if (plan.spotTitle && (edits.headline || '').trim()) rows.push(plan.spotTitle);
  if (plan.spotAddress) rows.push(plan.spotAddress);
  if (edits.showSpots) {
    const going = plan.currentAttendeesCount ?? plan.attendees?.length ?? 0;
    rows.push(plan.maxAttendees >= 100 ? `${going} going` : `${going} of ${plan.maxAttendees} spots taken`);
  }
  const panelH = rows.length * 58 + pad * 2 - 14;
  rr(ctx, 56, y, W - 112, panelH, 36);
  ctx.fillStyle = t.panel;
  ctx.fill();
  ctx.fillStyle = t.text;
  ctx.font = `600 38px ${FONT}`;
  rows.forEach((row, i) => {
    const line = wrap(ctx, row, W - 112 - pad * 2, 1)[0] || '';
    ctx.fillText(line, 56 + pad, y + pad + 34 + i * 58);
  });
  y += panelH + 36;

  // host row
  if (edits.showHost && plan.hostName) {
    const av = await loadImage(plan.hostAvatar || '');
    ctx.save();
    ctx.beginPath();
    ctx.arc(56 + 36, y + 36, 36, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (av) ctx.drawImage(av, 56, y, 72, 72);
    else { ctx.fillStyle = t.accent; ctx.fillRect(56, y, 72, 72); }
    ctx.restore();
    ctx.fillStyle = t.text;
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText(`Hosted by ${plan.hostName}`, 150, y + 46);
    y += 96;
  }

  // tags
  if (edits.showTags && plan.tags && plan.tags.length) {
    ctx.font = `700 28px ${FONT}`;
    let x = 56;
    for (const tag of plan.tags.slice(0, 4)) {
      const label = `#${tag}`;
      const tw = ctx.measureText(label).width + 36;
      if (x + tw > W - 56) break;
      rr(ctx, x, y, tw, 52, 26);
      ctx.fillStyle = t.panel;
      ctx.fill();
      ctx.fillStyle = t.text;
      ctx.fillText(label, x + 18, y + 36);
      x += tw + 14;
    }
  }

  // call to action bar
  rr(ctx, 56, H - 150, W - 112, 94, 47);
  ctx.fillStyle = t.accent;
  ctx.fill();
  ctx.fillStyle = t.id === 'clean' ? '#FFFFFF' : t.from === '#FFFFFF' ? '#111' : '#111827';
  ctx.font = `800 38px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Join this outing on RADA', W / 2, H - 150 + 61);
  ctx.textAlign = 'left';
}

const PREF_KEY = 'rada_share_card_prefs';

interface Props {
  plan: OutingPlan;
  tier: 'pro' | 'elite';
  link: string;
  onClose: () => void;
  onShared?: () => void;
  showToast: (msg: string, options?: any) => void;
}

export const OutingShareCard: React.FC<Props> = ({ plan, tier, link, onClose, onShared, showToast }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const editable = tier === 'elite';
  const [edits, setEdits] = useState<ShareCardEdits>(() => {
    const base: ShareCardEdits = { themeId: 'sunset', headline: '', showHost: true, showTags: true, showSpots: true, imageUrl: null };
    if (!editable) return base;
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
      if (saved && THEMES.some((t) => t.id === saved.themeId)) return { ...base, themeId: saved.themeId, showHost: !!saved.showHost, showTags: !!saved.showTags, showSpots: !!saved.showSpots };
    } catch { /* ignore */ }
    return base;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, plan, edits).catch(() => undefined);
    if (editable) {
      try { localStorage.setItem(PREF_KEY, JSON.stringify({ themeId: edits.themeId, showHost: edits.showHost, showTags: edits.showTags, showSpots: edits.showSpots })); } catch { /* ignore */ }
    }
  }, [plan, edits, editable]);

  const toBlob = useCallback(
    () => new Promise<Blob | null>((resolve) => {
      try { canvasRef.current?.toBlob((b) => resolve(b), 'image/png'); } catch { resolve(null); }
    }),
    []
  );

  const text = `${plan.hostName} is hosting a plan at ${plan.spotTitle} (${plan.date}). Join on RADA:`;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (blob) {
        const file = new File([blob], 'rada-outing.png', { type: 'image/png' });
        const nav: any = navigator;
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          try {
            await nav.share({ files: [file], title: `RADA Outing: ${plan.spotTitle}`, text: `${text} ${link}` });
            onShared?.();
            return;
          } catch (e: any) {
            if (e?.name === 'AbortError') return;
          }
        }
        // Browser can't share files: save the image so it can be posted, and copy the link
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rada-outing.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
        showToast('Card saved. Link copied too.');
        onShared?.();
      } else {
        // the photo's host blocked drawing it: retry without the photo so the card still works
        setEdits((e) => ({ ...e, imageUrl: 'data:,' }));
        showToast('Could not use that photo for the card. Try again.', { type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); showToast('Outing link copied!'); } catch { showToast(link); }
  };

  const pickImage = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEdits((e) => ({ ...e, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black">{editable ? 'Design your share card' : 'Share this outing'}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <canvas ref={canvasRef} className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100" style={{ aspectRatio: `${W} / ${H}` }} />

        {editable && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-black mb-1.5">Theme</p>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEdits((e) => ({ ...e, themeId: t.id }))}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border cursor-pointer ${edits.themeId === t.id ? 'border-[#E0533C] ring-2 ring-[#E0533C]/30' : 'border-slate-200 dark:border-slate-700'}`}
                    style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, color: t.text }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black mb-1.5">Headline</p>
              <input
                value={edits.headline}
                onChange={(e) => setEdits((x) => ({ ...x, headline: e.target.value.slice(0, 60) }))}
                placeholder={plan.spotTitle}
                className="w-full rounded-xl bg-slate-100 dark:bg-[#121113] px-3 py-2 text-xs outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-black flex items-center gap-1.5 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> Use my own photo
              </button>
              {edits.imageUrl && (
                <button type="button" onClick={() => setEdits((e) => ({ ...e, imageUrl: null }))} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold cursor-pointer">Back to outing photo</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
            </div>
            <div className="flex gap-3 flex-wrap text-[11px] font-bold">
              {([['showHost', 'Host'], ['showTags', 'Tags'], ['showSpots', 'Spots taken']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={edits[k]} onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" disabled={busy} onClick={share} className="flex-1 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-60 text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer">
            <Share2 className="w-4 h-4" /> {busy ? 'Preparing…' : 'Share card'}
          </button>
          <button type="button" onClick={copyLink} className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[12px] font-black flex items-center gap-1.5 cursor-pointer">
            <Copy className="w-4 h-4" /> Link
          </button>
        </div>
        {!editable && <p className="text-[10px] text-slate-400 text-center">Elite members can change the theme, headline and photo.</p>}
        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1"><Download className="w-3 h-3" /> If your phone can't share images directly, the card is saved so you can post it.</p>
      </div>
    </div>
  );
};

export default OutingShareCard;
