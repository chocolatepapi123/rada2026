import React, { useState, useRef } from 'react';
import { Calendar, QrCode, Ticket, Share2, Sparkles, X, MapPin, Users, CheckCircle2, Camera } from 'lucide-react';
import { VaultTicket } from '../types.ts';
import { shareContent } from '../utils/shareUtils.ts';

interface VaultTabProps {
  tickets: VaultTicket[];
  onShowQrCode: (title: string) => void;
  showToast?: (msg: string) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({ tickets, onShowQrCode, showToast }) => {
  const [selectedMonth, setSelectedMonth] = useState(9); // October
  const [selectedYear, setSelectedYear] = useState(2026);
  const [snapshotTicket, setSnapshotTicket] = useState<VaultTicket | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // Calendar calculations
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const emptyCells = Array.from({ length: firstDay });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day has outings
  const hasOuting = (day: number) => {
    if (selectedMonth === 9 && selectedYear === 2026 && (day === 14 || day === 24 || day === 25 || day === 31)) {
      return true;
    }
    return false;
  };

  // Helper to check if event date arrives today (14 Oct 2026)
  const isHappeningToday = (ticket: VaultTicket) => {
    const d = ticket.dateStr.toLowerCase();
    return d.includes('14 oct') || d.includes('today') || d.includes('now');
  };

  // Long press gesture handlers
  const handlePressStart = (ticket: VaultTicket) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSnapshotTicket(ticket);
      if (showToast) showToast('Event Snapshot generated! 📸');
    }, 450);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleShareSnapshot = async (ticket: VaultTicket) => {
    await shareContent({
      title: `RADA Event Snapshot: ${ticket.title}`,
      text: `🎟️ Outing locked in! Catch me at "${ticket.title}" on ${ticket.dateStr} at ${ticket.locationStr}. Check it out on RADA Nairobi!`,
      url: window.location.href,
      onSuccess: showToast,
      onError: showToast
    });
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Calendar Card */}
      <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
            Outings Vault
          </p>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="py-2.5" />
          ))}

          {dayCells.map((day) => {
            const isSpecial = hasOuting(day);
            const isTodayDay = day === 14 && selectedMonth === 9 && selectedYear === 2026;
            return (
              <div
                key={`day-${day}`}
                className={`py-2 rounded-xl transition cursor-pointer relative ${
                  isTodayDay
                    ? 'font-black bg-[#E05328] text-white shadow-md ring-2 ring-[#E05328] ring-offset-2 dark:ring-offset-[#1C1A1E]'
                    : isSpecial
                    ? 'font-black bg-[#E05328]/80 text-white shadow-xs'
                    : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {day}
                {isTodayDay && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E05328]" />
            <span>Outing / Event Scheduled</span>
          </span>
          <span className="text-[9px] text-[#E05328] font-bold">Long-press passes for Social Snapshot 📸</span>
        </div>
      </div>

      {/* Digital Wallet Passes & Tickets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-[#E05328]" />
            <span>Digital Passes & Synced Outings ({tickets.length})</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">Fast-Track Entry</span>
        </div>

        <div className="space-y-3">
          {tickets.map((t) => {
            const isToday = isHappeningToday(t);
            return (
              <div
                key={t.id}
                onMouseDown={() => handlePressStart(t)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(t)}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                className={`relative rounded-3xl p-4.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white transition select-none cursor-pointer transform active:scale-[0.98] ${
                  isToday
                    ? 'bg-gradient-to-r from-[#E05328] via-[#D94E28] to-[#E9C46A] ring-4 ring-amber-400/40 shadow-xl'
                    : t.type === 'Verified Ticket Pass'
                    ? 'bg-gradient-to-r from-[#E05328] to-[#E9C46A]'
                    : 'bg-gradient-to-r from-[#2D6A4F] to-emerald-700'
                }`}
              >
                {/* PROMINENT BADGE WHEN EVENT DATE ARRIVES */}
                {isToday && (
                  <div className="inline-flex items-center gap-1.5 bg-black/85 backdrop-blur-md text-amber-300 text-[10px] font-black px-3 py-1 rounded-full border border-amber-400/50 w-fit animate-pulse mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>🔥 HAPPENING TODAY! ACTIVE OUTING</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md inline-block">
                      {t.type}
                    </span>
                    <span className="text-[9px] text-white/80 font-semibold flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Hold to snapshot
                    </span>
                  </div>
                  <h4 className="font-black text-base mt-1 text-white truncate">{t.title}</h4>
                  <p className="text-xs text-slate-100 mt-0.5 flex items-center gap-1 truncate">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.dateStr} • {t.locationStr}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Event Snapshot Direct Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSnapshotTicket(t);
                    }}
                    title="Generate & Share Event Snapshot"
                    className="p-2.5 bg-black/30 hover:bg-black/50 text-white rounded-xl transition flex items-center justify-center border border-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* QR Pass */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowQrCode(t.title);
                    }}
                    className="px-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black shadow-md hover:bg-slate-100 transition flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-[#E05328]" />
                    <span>QR Pass</span>
                  </button>
                </div>
              </div>
            );
          })}

          {tickets.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              No passes in vault yet. RSVP to events, book movies, or accept date invites to sync here!
            </div>
          )}
        </div>
      </div>

      {/* POLISHED EVENT SNAPSHOT CARD PREVIEW MODAL */}
      {snapshotTicket && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Header bar */}
            <div className="px-4 py-3 bg-[#F8F8F6] dark:bg-[#121113] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E05328]" />
                Event Snapshot Card
              </span>
              <button 
                onClick={() => setSnapshotTicket(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Social Poster Card Design */}
            <div className="p-5 space-y-4">
              <div 
                className="rounded-2xl p-5 text-white shadow-xl relative overflow-hidden space-y-3"
                style={{
                  background: 'linear-gradient(135deg, #E05328 0%, #D94E28 50%, #2D6A4F 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md">
                    RADA NAIROBI • PASS
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-full">
                    Verified Outing
                  </span>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-black text-white leading-tight">
                    {snapshotTicket.title}
                  </h3>
                  <p className="text-xs text-white/90 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                    <span>{snapshotTicket.dateStr}</span>
                  </p>
                  <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                    <span>{snapshotTicket.locationStr}</span>
                  </p>
                </div>

                {/* QR pass & code preview */}
                <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase tracking-wider text-white/70 font-bold">Fast-Track Pass Code</p>
                    <p className="text-xs font-mono font-black text-amber-200">#RADA-ENTRY-2026</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-md flex items-center justify-center">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                </div>

                {/* Squad Count */}
                <div className="flex items-center gap-1.5 text-[10px] text-white/80 pt-1">
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span>Nairobi Squad Synced • Verified on RADA</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleShareSnapshot(snapshotTicket)}
                  className="flex-1 py-3 bg-[#E05328] hover:bg-orange-700 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Snapshot to Friends</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotTicket(null)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
