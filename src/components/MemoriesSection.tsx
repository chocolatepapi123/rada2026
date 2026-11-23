import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Calendar,
  MapPin,
  Music2,
  Plus,
  Share2,
  Download,
  Sparkles,
  Trash2,
  Users,
  X,
  Heart,
  Upload,
} from 'lucide-react';
import {
  RadaMemory,
  MemoryMood,
  MEMORY_MOODS,
  addMemory,
  deleteMemory,
  formatMemoryDate,
  getMemories,
  getTimeAgoNostalgia,
  loadMemoriesSynced,
  pickThrowbackMemory,
} from '../lib/memories';
import type { ToastOptions } from './Toast.tsx';

export interface MemorySpotOption {
  id: number | string;
  title: string;
  neighborhood?: string;
}

const PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop',
];

const MOOD_COLORS: Record<MemoryMood, string> = {
  'Golden Hour': 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60',
  'Core Memory': 'bg-[#E0533C]/12 text-[#E0533C] dark:text-[#F09A89] border-[#E0533C]/30',
  'First Time': 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60',
  'Late Night': 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300/60 dark:border-purple-700/60',
  'Road Trip': 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300/60 dark:border-sky-700/60',
  'Rainy Day': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700/60',
};

function drawPolaroid(canvas: HTMLCanvasElement, m: RadaMemory, photo: HTMLImageElement | null) {
  const W = 900;
  const H = 1140;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Warm archival paper background
  ctx.fillStyle = '#F7F3EA';
  ctx.fillRect(0, 0, W, H);

  // Subtle corner warmth
  const glow = ctx.createRadialGradient(800, 120, 40, 800, 120, 520);
  glow.addColorStop(0, 'rgba(224,83,60,0.12)');
  glow.addColorStop(1, 'rgba(224,83,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Polaroid photo frame
  const fx = 64;
  const fy = 68;
  const fw = W - 128;
  const fh = 640;

  ctx.fillStyle = '#1E1B20';
  ctx.fillRect(fx, fy, fw, fh);

  if (photo && photo.naturalWidth > 0) {
    const scale = Math.max(fw / photo.naturalWidth, fh / photo.naturalHeight);
    const sw = photo.naturalWidth * scale;
    const sh = photo.naturalHeight * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    ctx.drawImage(photo, fx + (fw - sw) / 2, fy + (fh - sh) / 2, sw, sh);
    // Warm analog film overlay
    ctx.fillStyle = 'rgba(245, 190, 120, 0.08)';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    g.addColorStop(0, '#E0533C');
    g.addColorStop(1, '#2D1E2F');
    ctx.fillStyle = g;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // Top-left stamp on photo
  ctx.fillStyle = 'rgba(18,17,19,0.72)';
  ctx.fillRect(fx + 24, fy + 24, 240, 44);
  ctx.fillStyle = '#FDE68A';
  ctx.font = '800 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(getTimeAgoNostalgia(m.date).toUpperCase(), fx + 40, fy + 53);

  // Metadata below Polaroid frame
  ctx.fillStyle = '#E0533C';
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${m.mood.toUpperCase()}  ·  ${formatMemoryDate(m.date).toUpperCase()}`, fx, fy + fh + 58);

  ctx.fillStyle = '#181619';
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(m.title.slice(0, 42), fx, fy + fh + 114);

  // Story wrapped
  ctx.fillStyle = '#47434B';
  ctx.font = '500 24px system-ui, -apple-system, sans-serif';
  const words = m.story.split(/\s+/);
  let line = '';
  let y = fy + fh + 164;
  let lineCount = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > fw && line) {
      ctx.fillText(line, fx, y);
      y += 34;
      line = w;
      lineCount++;
      if (lineCount >= 3) break;
    } else {
      line = test;
    }
  }
  if (line && lineCount < 3) ctx.fillText(line, fx, y);

  // Bottom bar: spot + soundtrack + RADA mark
  ctx.fillStyle = '#6D6773';
  ctx.font = '700 21px system-ui, -apple-system, sans-serif';
  const place = [m.spotTitle, m.area].filter(Boolean).join(' · ') || 'Nairobi, Kenya';
  ctx.fillText(`📍 ${place}`, fx, H - 106);
  if (m.song) {
    ctx.fillText(`♫ ${m.song}`, fx, H - 70);
  }

  ctx.fillStyle = '#E0533C';
  ctx.font = '900 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('RADA MEMORIES', W - fx, H - 72);
  ctx.textAlign = 'left';
}

export const MemoryKeepsakeModal: React.FC<{
  memory: RadaMemory | null;
  onClose: () => void;
  showToast?: (msg: string, opts?: ToastOptions) => void;
}> = ({ memory, onClose, showToast }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!memory || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (!memory.photoUrl) {
      drawPolaroid(canvas, memory, null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawPolaroid(canvas, memory, img);
    img.onerror = () => drawPolaroid(canvas, memory, null);
    img.src = memory.photoUrl;
  }, [memory]);

  if (!memory) return null;

  const handleDownload = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const a = document.createElement('a');
      a.download = `rada-memory-${memory.date}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
      showToast?.('Memory Polaroid saved!');
    } catch {
      showToast?.('Could not export image from remote photo.', { type: 'error' });
    }
  };

  const handleShare = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
      if (blob && (navigator as any).share) {
        const file = new File([blob], `rada-memory-${memory.date}.png`, { type: 'image/png' });
        await (navigator as any).share({
          title: memory.title,
          text: `${memory.title} — ${getTimeAgoNostalgia(memory.date)} on RADA`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      // user cancelled
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1C1A1E] rounded-3xl max-w-sm w-full p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E0533C]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Keepsake Polaroid</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-md border border-amber-200/60 dark:border-slate-700 bg-[#F7F3EA]">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Card</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleShare}
            className="py-2.5 rounded-xl bg-[#E0533C] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer hover:bg-orange-700 disabled:opacity-50"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Memory</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MemoryComposerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  userId: string;
  spots?: MemorySpotOption[];
  initialTitle?: string;
  initialSpotTitle?: string;
  initialArea?: string;
  onSaved: (next: RadaMemory[]) => void;
  showToast?: (msg: string, opts?: ToastOptions) => void;
}> = ({
  open,
  onClose,
  userId,
  spots = [],
  initialTitle = '',
  initialSpotTitle = '',
  initialArea = '',
  onSaved,
  showToast,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [story, setStory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState<MemoryMood>('Core Memory');
  const [spotTitle, setSpotTitle] = useState(initialSpotTitle);
  const [area, setArea] = useState(initialArea || 'Nairobi');
  const [companions, setCompanions] = useState('');
  const [song, setSong] = useState('');
  const [photoUrl, setPhotoUrl] = useState(PHOTO_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialTitle) setTitle(initialTitle);
    if (initialSpotTitle) setSpotTitle(initialSpotTitle);
    if (initialArea) setArea(initialArea);
  }, [open, initialTitle, initialSpotTitle, initialArea]);

  if (!open) return null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast?.('Give this memory a title.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const matchedSpot = spots.find(
        (s) => s.title.toLowerCase() === spotTitle.trim().toLowerCase()
      );
      const next = await addMemory(userId, {
        title: title.trim(),
        story: story.trim() || 'One of those Nairobi moments worth keeping forever.',
        date,
        mood,
        spotId: matchedSpot?.id,
        spotTitle: spotTitle.trim() || undefined,
        area: area.trim() || 'Nairobi',
        companions: companions
          .split(/[\s,]+/)
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => (c.startsWith('@') ? c : `@${c}`)),
        song: song.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });
      onSaved(next);
      showToast?.('Memory saved to your RADA scrapbook.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF7F2] dark:bg-[#121113] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-amber-200/70 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 bg-white dark:bg-[#1C1A1E] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#E0533C] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black">Save a RADA Memory</h3>
              <p className="text-[11px] text-slate-500">Keep a Polaroid from a night, hike or moment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Memory Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Late night nyama choma & laughs after the rain"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Mood</label>
            <div className="flex flex-wrap gap-1.5">
              {MEMORY_MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                    mood === m
                      ? 'bg-[#E0533C] text-white border-[#E0533C]'
                      : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">When it happened</label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Spot / Event</label>
              <input
                type="text"
                list="rada-memory-spots"
                value={spotTitle}
                onChange={(e) => setSpotTitle(e.target.value)}
                placeholder="Where were you?"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
              />
              <datalist id="rada-memory-spots">
                {spots.slice(0, 40).map((s) => (
                  <option key={s.id} value={s.title} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Neighborhood / City</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Westlands, Nairobi"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Soundtrack / Song</label>
              <input
                type="text"
                value={song}
                onChange={(e) => setSong(e.target.value)}
                placeholder="e.g., Sauti Sol — Suzanna"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Who was there (@handles)</label>
            <input
              type="text"
              value={companions}
              onChange={(e) => setCompanions(e.target.value)}
              placeholder="@amani_j, @kevo_254"
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">What made it unforgettable?</label>
            <textarea
              rows={3}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Write the little details future-you will love remembering..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Polaroid Photo</label>
              <label className="text-[11px] font-bold text-[#E0533C] cursor-pointer flex items-center gap-1 hover:underline">
                <Upload className="w-3 h-3" />
                <span>Upload from device</span>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {PHOTO_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhotoUrl(p)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${
                    photoUrl === p ? 'border-[#E0533C]' : 'border-transparent opacity-75'
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white font-black text-xs shadow-lg cursor-pointer transition"
          >
            {saving ? 'Saving...' : 'Pin to RADA Memories'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface MemoriesSectionProps {
  userId: string;
  accent?: string;
  spots?: MemorySpotOption[];
  showToast?: (msg: string, opts?: ToastOptions) => void;
  compactHome?: boolean;
  onOpenAllMemories?: () => void;
}

export const MemoriesSection: React.FC<MemoriesSectionProps> = ({
  userId,
  accent = '#E0533C',
  spots = [],
  showToast,
  compactHome = false,
  onOpenAllMemories,
}) => {
  const [memories, setMemories] = useState<RadaMemory[]>(() => getMemories(userId));
  const [composerOpen, setComposerOpen] = useState(false);
  const [keepsake, setKeepsake] = useState<RadaMemory | null>(null);

  useEffect(() => {
    let off = false;
    setMemories(getMemories(userId));
    loadMemoriesSynced(userId).then((m) => {
      if (!off) setMemories(m);
    });
    return () => {
      off = true;
    };
  }, [userId]);

  const throwback = pickThrowbackMemory(memories);

  const handleDelete = async (id: string) => {
    const next = await deleteMemory(userId, id);
    setMemories(next);
    showToast?.('Memory removed.');
  };

  if (compactHome) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 truncate">
              RADA Memories &amp; Throwbacks
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="text-[11px] font-black text-[#E0533C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Memory</span>
            </button>
            {onOpenAllMemories && (
              <button
                type="button"
                onClick={onOpenAllMemories}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Scrapbook ({memories.length})
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Polaroid Strip */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {memories.slice(0, 6).map((m, idx) => (
            <div
              key={m.id}
              onClick={() => setKeepsake(m)}
              className="w-64 shrink-0 rounded-2xl p-2.5 pb-3.5 bg-[#FAF6EE] dark:bg-[#1C1A1E] border border-amber-200/80 dark:border-amber-900/40 shadow-sm hover:shadow-md transition cursor-pointer group"
              style={{ transform: idx % 2 === 0 ? 'rotate(-0.4deg)' : 'rotate(0.4deg)' }}
            >
              <div className="h-36 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 relative mb-2.5">
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt={m.title} className="w-full h-full object-cover sepia-[0.08] group-hover:scale-105 transition duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#E0533C] to-amber-500 flex items-center justify-center text-white">
                    <Heart className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-amber-200 text-[9px] font-black uppercase tracking-wider">
                  {getTimeAgoNostalgia(m.date)}
                </span>
                <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white/95 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">{m.spotTitle || m.area || 'Nairobi'}</span>
                </span>
              </div>

              <div className="space-y-1 px-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${MOOD_COLORS[m.mood]}`}>
                    {m.mood}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">{formatMemoryDate(m.date)}</span>
                </div>
                <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 line-clamp-1 pt-0.5">
                  {m.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
                  {m.story}
                </p>
                {m.song && (
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 pt-0.5 truncate">
                    <Music2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{m.song}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <MemoryComposerModal
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          userId={userId}
          spots={spots}
          onSaved={setMemories}
          showToast={showToast}
        />
        <MemoryKeepsakeModal
          memory={keepsake}
          onClose={() => setKeepsake(null)}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Looking Back Nostalgic Banner */}
      {throwback && (
        <div className="rounded-3xl p-4 bg-gradient-to-br from-amber-50 via-[#FAF3E6] to-orange-50 dark:from-[#241B16] dark:via-[#1C1A1E] dark:to-[#1F1614] border border-amber-200/80 dark:border-amber-900/40 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-[#E0533C]" />
              <span>Remember this? · {getTimeAgoNostalgia(throwback.date)}</span>
            </span>
            <button
              type="button"
              onClick={() => setKeepsake(throwback)}
              className="text-[11px] font-black text-[#E0533C] flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Share2 className="w-3 h-3" />
              <span>Keepsake Card</span>
            </button>
          </div>
          <div className="flex gap-3 items-center">
            {throwback.photoUrl && (
              <img
                src={throwback.photoUrl}
                alt={throwback.title}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-xs"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">{throwback.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{throwback.story}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory CTA */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="w-full py-3 rounded-2xl text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        style={{ background: accent }}
      >
        <Plus className="w-4 h-4" />
        <span>Capture a RADA Memory</span>
      </button>

      {/* Memory Scrapbook Grid */}
      {memories.length === 0 ? (
        <div className="py-10 text-center space-y-2 bg-slate-50 dark:bg-[#1C1A1E] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <Camera className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Your scrapbook is waiting for its first Polaroid.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <div
              key={m.id}
              className="rounded-3xl p-3 bg-[#FAF6EE] dark:bg-[#1C1A1E] border border-amber-200/70 dark:border-slate-800 shadow-xs space-y-2.5"
            >
              {m.photoUrl && (
                <div
                  onClick={() => setKeepsake(m)}
                  className="h-44 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 relative cursor-pointer group"
                >
                  <img src={m.photoUrl} alt={m.title} className="w-full h-full object-cover sepia-[0.06] group-hover:scale-105 transition duration-500" loading="lazy" />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 text-amber-200 text-[10px] font-black uppercase tracking-wider">
                    {getTimeAgoNostalgia(m.date)}
                  </span>
                </div>
              )}

              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${MOOD_COLORS[m.mood]}`}>
                    {m.mood}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatMemoryDate(m.date)}
                  </span>
                </div>

                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{m.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{m.story}</p>

                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {(m.spotTitle || m.area) && (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <MapPin className="w-3 h-3 text-[#E0533C]" />
                      {[m.spotTitle, m.area].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {m.song && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                      <Music2 className="w-3 h-3" />
                      {m.song}
                    </span>
                  )}
                  {m.companions && m.companions.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Users className="w-3 h-3" />
                      {m.companions.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setKeepsake(m)}
                    className="text-xs font-black text-[#E0533C] flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Polaroid Keepsake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MemoryComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        userId={userId}
        spots={spots}
        onSaved={setMemories}
        showToast={showToast}
      />
      <MemoryKeepsakeModal
        memory={keepsake}
        onClose={() => setKeepsake(null)}
        showToast={showToast}
      />
    </div>
  );
};
