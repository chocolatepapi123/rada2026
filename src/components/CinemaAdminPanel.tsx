import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, ImagePlus, Film } from 'lucide-react';
import {
  CinemaRow, fetchAllCinemaRows, addCinemaRow, setCinemaActive, deleteCinemaRow, uploadCinemaPoster,
} from '../lib/cinema.ts';

const EMPTY = { title: '', cinema: '', genre: '', format: '', showtimes: '', booking_url: '', poster_url: '', release_date: '' };
const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm';

export function CinemaAdminPanel({ toast }: { toast: (m: string, o?: any) => void }) {
  const [rows, setRows] = useState<CinemaRow[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => setRows(await fetchAllCinemaRows()), []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const onPoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const url = await uploadCinemaPoster(file);
    setUploading(false);
    if (url) setForm(f => ({ ...f, poster_url: url })); else toast('Poster upload failed', { type: 'error' });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.cinema.trim()) { toast('Movie title and cinema are required', { type: 'error' }); return; }
    setBusy(true);
    const err = await addCinemaRow({
      title: form.title.trim(), cinema: form.cinema.trim(), genre: form.genre.trim() || null,
      format: form.format.trim() || null, showtimes: form.showtimes.trim() || null,
      booking_url: form.booking_url.trim() || null, poster_url: form.poster_url.trim() || null,
      release_date: form.release_date.trim() || null,
    });
    setBusy(false);
    if (err) { toast(`Could not add movie: ${err}. Check the SQL ran and you are signed in as admin.`, { type: 'error' }); return; }
    toast('Movie added', { type: 'success' });
    setForm({ ...EMPTY });
    load();
  };

  const toggle = async (r: CinemaRow) => {
    const err = await setCinemaActive(r.id, !r.is_active);
    if (err) toast(err, { type: 'error' }); else load();
  };
  const remove = async (r: CinemaRow) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const err = await deleteCinemaRow(r.id);
    if (err) toast(err, { type: 'error' }); else load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
        <h2 className="text-sm font-black flex items-center gap-1.5"><Film className="w-4 h-4" /> Add a movie</h2>
        <input className={input} placeholder="Movie title *" value={form.title} onChange={set('title')} />
        <input className={input} placeholder="Cinema * (e.g. Century Cinemax Junction)" value={form.cinema} onChange={set('cinema')} />
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Genre (Action / Drama)" value={form.genre} onChange={set('genre')} />
          <input className={input} placeholder="Format (2D, 3D, IMAX)" value={form.format} onChange={set('format')} />
        </div>
        <input className={input} placeholder="Showtimes (e.g. 1:00 PM, 4:30 PM, 8:00 PM)" value={form.showtimes} onChange={set('showtimes')} />
        <input className={input} placeholder="Booking link (from the cinema's website)" value={form.booking_url} onChange={set('booking_url')} />
        <input className={input} placeholder="Release date (optional, YYYY-MM-DD)" value={form.release_date} onChange={set('release_date')} />
        <div className="flex gap-2 items-center">
          <input className={input} placeholder="Poster image link" value={form.poster_url} onChange={set('poster_url')} />
          <label className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer flex items-center gap-1">
            <ImagePlus className="w-4 h-4" /> {uploading ? '…' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={onPoster} />
          </label>
        </div>
        {form.poster_url && <div className="h-28 w-20 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url('${form.poster_url}')` }} />}
        <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-black disabled:opacity-60">
          {busy ? 'Adding…' : 'Add movie'}
        </button>
      </div>

      <h2 className="text-sm font-black">Movies ({rows.length})</h2>
      {rows.length === 0 && <p className="text-xs text-slate-500">No movies yet.</p>}
      {rows.map(r => (
        <div key={r.id} className={`flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 ${r.is_active ? '' : 'opacity-50'}`}>
          <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0" style={r.poster_url ? { backgroundImage: `url('${r.poster_url}')` } : undefined} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate">{r.title}</p>
            <p className="text-[11px] text-slate-500 truncate">{r.cinema}{r.format ? ` • ${r.format}` : ''}</p>
            <p className="text-[10px] text-slate-400 truncate">{r.showtimes || 'No showtimes'}</p>
          </div>
          <button onClick={() => toggle(r)} title={r.is_active ? 'Hide' : 'Show'} className="p-2">{r.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
          <button onClick={() => remove(r)} title="Delete" className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}
