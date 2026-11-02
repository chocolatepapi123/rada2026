import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  fetchPlatformAnalytics, fetchRecentErrors, clearErrors,
  type PlatformAnalytics, type ClientErrorGroup, type PlatformEvent,
} from '../lib/platformAnalytics';
import type { ToastOptions } from './Toast.tsx';

interface Props {
  toast: (msg: string, options?: ToastOptions) => void;
}

const LABELS: [PlatformEvent, string][] = [
  ['app_open', 'App opens'],
  ['signup', 'Sign-ups'],
  ['login', 'Log-ins'],
  ['search', 'Searches'],
  ['save', 'Saves'],
  ['share', 'Shares'],
  ['outing_host', 'Outings hosted'],
  ['outing_join', 'Outing joins'],
  ['review', 'Reviews'],
  ['message_sent', 'Messages'],
];

const RANGES = [7, 14, 30] as const;

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export const AdminHealthPanel: React.FC<Props> = ({ toast }) => {
  const [days, setDays] = useState<number>(14);
  const [stats, setStats] = useState<PlatformAnalytics | null>(null);
  const [errors, setErrors] = useState<ClientErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, e] = await Promise.all([fetchPlatformAnalytics(days), fetchRecentErrors(Math.min(days, 30), 50)]);
      setStats(s);
      setErrors(e);
    } catch (err: any) {
      setError(err?.message || 'Could not load health data.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async (fp?: string) => {
    try {
      await clearErrors(fp);
      setErrors((cur) => (fp ? cur.filter((x) => x.fingerprint !== fp) : []));
    } catch (err: any) {
      toast(err?.message || 'Could not clear.', { type: 'error' });
    }
  };

  const maxSessions = Math.max(1, ...(stats?.sessions_by_day || []).map((d) => d.sessions));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black">Health</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Crashes and usage. Nothing here is tied to a person.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                days === r ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {r}d
            </button>
          ))}
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {loading && !stats && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LABELS.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
                <div className="text-lg font-black leading-none">{stats.totals[key] ?? 0}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[11px] font-bold mb-2">Visitors per day</div>
            {stats.sessions_by_day.length === 0 ? (
              <p className="text-[11px] text-slate-500">No visits recorded yet.</p>
            ) : (
              <div className="flex items-end gap-1 h-16">
                {stats.sessions_by_day.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day}: ${d.sessions}`}>
                    <div
                      className="w-full rounded-t bg-purple-500"
                      style={{ height: `${Math.max(6, (d.sessions / maxSessions) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-[11px] font-bold mb-2">Top searches</div>
              {stats.top_searches.length === 0 ? (
                <p className="text-[11px] text-slate-500">None yet.</p>
              ) : (
                <ul className="space-y-1">
                  {stats.top_searches.map((s) => (
                    <li key={s.term} className="flex justify-between text-xs">
                      <span className="truncate pr-2">{s.term}</span>
                      <span className="font-bold">{s.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="text-[11px] font-bold mb-2">Right now</div>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between"><span>Users</span><b>{stats.snapshot.profiles}</b></li>
                <li className="flex justify-between"><span>Businesses</span><b>{stats.snapshot.businesses_total}</b></li>
                <li className="flex justify-between"><span>Businesses approved</span><b>{stats.snapshot.businesses_approved}</b></li>
                <li className="flex justify-between"><span>Chats</span><b>{stats.snapshot.conversations}</b></li>
                <li className="flex justify-between"><span>Messages</span><b>{stats.snapshot.messages}</b></li>
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold">Errors ({errors.length})</div>
          {errors.length > 0 && (
            <button
              type="button"
              onClick={() => clear()}
              className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        {errors.length === 0 && !loading && (
          <p className="p-3 text-[11px] text-slate-500">No errors in this period.</p>
        )}
        {errors.map((er) => {
          const isOpen = open === er.fingerprint;
          return (
            <div key={er.fingerprint} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : er.fingerprint)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{er.message}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {er.kind} · {er.count}× · {er.sessions} {er.sessions === 1 ? 'session' : 'sessions'} · {ago(er.last_seen)}
                    {er.url ? ` · ${er.url}` : ''}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {er.stack && (
                    <pre className="text-[10px] leading-snug whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-900 rounded-lg p-2 max-h-48 overflow-auto">
                      {er.stack}
                    </pre>
                  )}
                  <div className="text-[10px] text-slate-500 break-words">
                    {er.app_version ? `Build ${er.app_version}. ` : ''}
                    {er.user_agent || ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => clear(er.fingerprint)}
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    Mark fixed
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
