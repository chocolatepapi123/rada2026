import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QrCode, Plus, X, Trash2, Film, Ticket, Upload, Loader2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ToastOptions } from './Toast.tsx';

type QrKind = 'event' | 'cinema';

interface QrRow {
  id: string;
  kind: QrKind;
  title: string;
  venue: string | null;
  event_date: string | null; // YYYY-MM-DD
  image_path: string;
  created_at: string;
}

interface Props {
  showToast?: (msg: string, options?: ToastOptions) => void;
}

const BUCKET = 'vault-qr';
const MAX_BYTES = 5 * 1024 * 1024;

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const prettyDate = (s: string | null) => {
  if (!s) return 'No date';
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

export const VaultQrUploads: React.FC<Props> = ({ showToast }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [rows, setRows] = useState<QrRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QrKind>('event');

  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewing, setViewing] = useState<QrRow | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') =>
    showToast?.(msg, { type } as ToastOptions);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setAuthChecked(true); return; }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    setUserId(uid);
    setAuthChecked(true);
    if (!uid) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('vault_qr_codes')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) { notify('Could not load your saved QR codes.', 'error'); setLoading(false); return; }

    const list = (data || []) as QrRow[];
    setRows(list);

    if (list.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(list.map(r => r.image_path), 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s: any) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
      setUrls(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const resetForm = () => {
    setFile(null); setTitle(''); setVenue(''); setDate('');
    if (fileRef.current) fileRef.current.value = '';
    setShowForm(false);
  };

  const onPick = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { notify('Please choose an image of the QR code or ticket.', 'error'); return; }
    if (f.size > MAX_BYTES) { notify('That image is over 5 MB. Try a smaller screenshot.', 'error'); return; }
    setFile(f);
  };

  const save = async () => {
    if (!supabase || !userId) { notify('Sign in to save tickets to your Vault.', 'error'); return; }
    if (!file) { notify('Choose the QR image first.', 'error'); return; }
    if (!title.trim()) { notify(tab === 'cinema' ? 'Add the movie name.' : 'Add the event name.', 'error'); return; }

    setSaving(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { setSaving(false); notify('Upload failed. Please try again.', 'error'); return; }

    const { error } = await supabase.from('vault_qr_codes').insert({
      user_id: userId,
      kind: tab,
      title: title.trim(),
      venue: venue.trim() || null,
      event_date: date || null,
      image_path: path,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setSaving(false);
      notify('Could not save the ticket. Please try again.', 'error');
      return;
    }
    setSaving(false);
    resetForm();
    notify('Saved to your Vault.');
    void load();
  };

  const remove = async (row: QrRow) => {
    if (!supabase) return;
    if (!window.confirm(`Remove "${row.title}" from your Vault?`)) return;
    await supabase.storage.from(BUCKET).remove([row.image_path]);
    const { error } = await supabase.from('vault_qr_codes').delete().eq('id', row.id);
    if (error) { notify('Could not remove it. Please try again.', 'error'); return; }
    setViewing(null);
    setRows(r => r.filter(x => x.id !== row.id));
  };

  const shown = useMemo(() => rows.filter(r => r.kind === tab), [rows, tab]);
  const today = todayStr();
  const upcoming = shown.filter(r => !r.event_date || r.event_date >= today);
  const past = shown.filter(r => r.event_date && r.event_date < today).reverse();

  const renderCard = (r: QrRow) => (
    <button
      key={r.id}
      type="button"
      onClick={() => setViewing(r)}
      className="w-full text-left flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1A1E] p-2.5 hover:border-[#E05328] transition cursor-pointer"
    >
      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
        {urls[r.image_path]
          ? <img src={urls[r.image_path]} alt="" className="w-full h-full object-contain" />
          : <QrCode className="w-6 h-6 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">{r.title}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
          <CalendarIcon className="w-3 h-3 shrink-0" />
          <span>{prettyDate(r.event_date)}</span>
        </p>
        {r.venue && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{r.venue}</span>
          </p>
        )}
      </div>
      <span className="text-[10px] font-black text-[#E05328] shrink-0 pr-1">Show</span>
    </button>
  );

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-[#E05328] dark:text-[#D17A68]" />
          <span>My QR Tickets</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-[#E05328] hover:bg-[#c74721] text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add QR</span>
        </button>
      </div>

      {/* Events | Cinema */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900">
        {([['event', 'Events', Ticket], ['cinema', 'Cinema', Film]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === id
                ? 'bg-white dark:bg-[#1C1A1E] text-[#E05328] shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label} ({rows.filter(r => r.kind === id).length})</span>
          </button>
        ))}
      </div>

      {!authChecked || loading ? (
        <div className="py-6 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !userId ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          Sign in to keep your event and cinema QR tickets in the Vault.
        </div>
      ) : shown.length === 0 ? (
        <div className="py-6 px-4 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          {tab === 'cinema'
            ? 'No cinema tickets saved yet. Add the QR from your booking confirmation.'
            : 'No event tickets saved yet. Add the QR from your ticket email or screenshot.'}
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Upcoming</p>
              {upcoming.map(renderCard)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Past</p>
              {past.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !saving && resetForm()}
        >
          <div
            className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                Add {tab === 'cinema' ? 'cinema' : 'event'} QR
              </h3>
              <button type="button" onClick={() => !saving && resetForm()} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => onPick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-500 overflow-hidden cursor-pointer"
            >
              {preview
                ? <img src={preview} alt="QR preview" className="w-full h-full object-contain bg-white" />
                : (<><Upload className="w-6 h-6" /><span className="text-xs font-bold">Choose QR image or screenshot</span></>)}
            </button>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={tab === 'cinema' ? 'Movie name' : 'Event name'}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
            />
            <input
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder={tab === 'cinema' ? 'Cinema and screen (optional)' : 'Venue (optional)'}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
            />

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="w-full py-3 rounded-xl bg-[#E05328] hover:bg-[#c74721] disabled:opacity-60 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving…</span></> : <span>Save to Vault</span>}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen scan view: plain white so scanners read it cleanly */}
      {viewing && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="font-black text-slate-900 truncate">{viewing.title}</p>
              <p className="text-xs text-slate-500 truncate">
                {prettyDate(viewing.event_date)}{viewing.venue ? ` • ${viewing.venue}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => setViewing(null)} aria-label="Close" className="p-2 rounded-xl bg-slate-100 text-slate-900">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {urls[viewing.image_path]
              ? <img src={urls[viewing.image_path]} alt={`QR for ${viewing.title}`} className="max-w-full max-h-full object-contain" />
              : <Loader2 className="w-6 h-6 animate-spin text-slate-400" />}
          </div>
          <div className="p-4 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">Turn your screen brightness up before scanning.</p>
            <button
              type="button"
              onClick={() => remove(viewing)}
              className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
