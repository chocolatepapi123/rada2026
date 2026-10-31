import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X, Megaphone, BellOff } from 'lucide-react';
import {
  fetchNotifications,
  markNotificationsRead,
  deleteNotification,
  setBroadcastSubscription,
  type AppNotification,
} from '../lib/broadcasts';

interface Props {
  userId?: string | null;
}

const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

export const NotificationBell: React.FC<Props> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setItems(await fetchNotifications());
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const t = window.setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, userId]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!userId) return null;

  const unread = items.filter((n) => !n.read_at).length;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
    } else {
      const ids = items.filter((n) => !n.read_at).map((n) => n.id);
      if (ids.length) {
        await markNotificationsRead(ids);
        setItems((cur) => cur.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
      }
    }
  };

  const stopUpdates = async (n: AppNotification) => {
    const hostId = n.data?.host_id as string | undefined;
    if (!hostId) return;
    setBusy(n.id);
    try {
      await setBroadcastSubscription(hostId, false);
      setItems((cur) => cur.filter((x) => !(x.type === 'broadcast' && x.data?.host_id === hostId)));
    } catch {
      /* leave the notification in place so the person can retry */
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setItems((cur) => cur.filter((n) => n.id !== id));
    await deleteNotification(id);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell className="w-4.5 h-4.5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E0533C] text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#121113]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[64px] sm:top-full sm:mt-2 sm:w-80 max-h-[70vh] overflow-y-auto bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">Notifications</span>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Nothing yet. Updates from hosts you follow will show up here.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${n.read_at ? '' : 'bg-orange-50/60 dark:bg-orange-950/20'}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 break-words">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.type === 'broadcast' && n.data?.host_handle && (
                        <p className="text-[10px] font-bold text-[#E0533C] dark:text-[#D17A68]">from {n.data.host_handle}</p>
                      )}
                      {n.body && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">{n.body}</p>}
                      <div className="mt-1.5 flex items-center gap-3">
                        {n.type === 'broadcast' && n.data?.host_id && (
                          <button
                            type="button"
                            disabled={busy === n.id}
                            onClick={() => stopUpdates(n)}
                            className="text-[10px] font-bold text-slate-500 hover:text-red-600 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <BellOff className="w-3 h-3" /> Stop updates
                          </button>
                        )}
                        <button type="button" onClick={() => remove(n.id)} className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
