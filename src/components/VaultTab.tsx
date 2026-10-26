import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  QrCode, 
  Ticket, 
  Share2, 
  Sparkles, 
  X, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { VaultTicket, EventItem } from '../types.ts';
import { shareContent } from '../utils/shareUtils.ts';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getEventPriceDisplay, 
  getCategoryBadgeStyle, 
  isDateToday 
} from '../utils/calendarUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { VaultQrUploads } from './VaultQrUploads.tsx';

interface VaultTabProps {
  tickets: VaultTicket[];
  events?: EventItem[];
  onShowQrCode: (title: string) => void;
  onOpenEventDetails?: (event: EventItem) => void;
  onExploreTrendingEvents?: () => void;
  showToast?: (msg: string, options?: ToastOptions) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({ 
  tickets = [], 
  events = [],
  onShowQrCode, 
  onOpenEventDetails,
  onExploreTrendingEvents,
  showToast 
}) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Calendar calculations
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const emptyCells = Array.from({ length: firstDay });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day has outings or scheduled events
  const daysWithActivity = useMemo(() => {
    const activeDays = new Set<number>();
    dayCells.forEach(day => {
      const isToday = isDateToday(selectedYear, selectedMonth, day);
      const hasEvent = events.some(e => doesEventMatchDay(e.date, selectedYear, selectedMonth, day, isToday));
      const hasTicket = tickets.some(t => doesEventMatchDay(t.dateStr, selectedYear, selectedMonth, day, isToday));
      if (hasEvent || hasTicket) {
        activeDays.add(day);
      }
    });
    return activeDays;
  }, [events, tickets, selectedYear, selectedMonth, dayCells]);

  const isSelectedDayToday = selectedDay !== null && isDateToday(selectedYear, selectedMonth, selectedDay);

  // Filter events scheduled for the selected day
  const dayEvents = useMemo(() => {
    if (selectedDay === null) return events;
    return events.filter(e => 
      doesEventMatchDay(e.date, selectedYear, selectedMonth, selectedDay, isSelectedDayToday)
    );
  }, [events, selectedDay, selectedYear, selectedMonth, isSelectedDayToday]);

  // Filter passes/tickets for the selected day
  const dayTickets = useMemo(() => {
    if (selectedDay === null) return tickets;
    return tickets.filter(t => 
      doesEventMatchDay(t.dateStr, selectedYear, selectedMonth, selectedDay, isSelectedDayToday)
    );
  }, [tickets, selectedDay, selectedYear, selectedMonth, isSelectedDayToday]);

  // Clean formatted date header
  const dateHeader = useMemo(() => {
    if (selectedDay === null) return 'All Upcoming Events & Outings';
    return getCleanDateHeader(selectedYear, selectedMonth, selectedDay, isSelectedDayToday);
  }, [selectedYear, selectedMonth, selectedDay, isSelectedDayToday]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <section className="w-full max-w-full min-w-0 overflow-x-hidden px-3 sm:px-4 py-4 space-y-6 min-[900px]:max-w-3xl min-[900px]:mx-auto">
      {/* Calendar Card */}
      <div className="w-full max-w-full min-w-0 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm space-y-4 overflow-hidden">
        {/* Month Navigation & Selector */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E05328] dark:hover:text-[#D17A68] transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="min-w-0 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="min-w-0 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E05328] dark:hover:text-[#D17A68] transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(9);
                setSelectedYear(2026);
                setSelectedDay(14);
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition cursor-pointer ${
                isSelectedDayToday
                  ? 'bg-[#E05328] dark:bg-[#A94F3E] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Today
            </button>
            {selectedDay !== null && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs min-w-0">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="py-2.5" />
          ))}

          {dayCells.map((day) => {
            const isSelected = selectedDay === day;
            const hasActivity = daysWithActivity.has(day);
            const isTodayDay = isDateToday(selectedYear, selectedMonth, day);

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                }}
                className={`min-w-0 py-2 rounded-xl transition cursor-pointer relative flex flex-col items-center justify-center font-bold select-none ${
                  isSelected
                    ? 'font-black bg-[#E05328] dark:bg-[#A94F3E] text-white shadow-md ring-2 ring-[#E05328] ring-offset-2 dark:ring-offset-[#1C1A1E]'
                    : isTodayDay
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-black border border-amber-300 dark:border-amber-700'
                    : hasActivity
                    ? 'font-black bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 hover:border-[#E05328] dark:hover:border-[#D17A68]'
                    : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{day}</span>
                {/* Event presence indicator dot */}
                {hasActivity && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-[#E05328] dark:bg-[#A94F3E]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E05328] dark:bg-[#A94F3E]" />
            <span>Event / Outing Scheduled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Today</span>
          </span>
        </div>
      </div>

      {/* Dynamic Date Header & Events for Selected Date */}
      <div className="space-y-3 w-full min-w-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-slate-200 flex items-start gap-1.5 min-w-0">
              <CalendarIcon className="w-3.5 h-3.5 text-[#E05328] dark:text-[#D17A68] shrink-0 mt-px" />
              <span className="min-w-0 break-words">{dateHeader}</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold">
              {dayEvents.length} {dayEvents.length === 1 ? 'event scheduled' : 'events scheduled'}
            </p>
          </div>

          {selectedDay !== null && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="shrink-0 whitespace-nowrap text-[11px] font-bold text-[#E05328] dark:text-[#D17A68] hover:underline cursor-pointer"
            >
              View All Dates
            </button>
          )}
        </div>

        {/* Clean Event Cards */}
        {dayEvents.length > 0 ? (
          <div className="space-y-3">
            {dayEvents.map((evt) => {
              const badgeStyle = getCategoryBadgeStyle(evt.category, evt.genre);
              const priceDisplay = getEventPriceDisplay(evt.tiers);

              return (
                <div
                  key={evt.id}
                  onClick={() => onOpenEventDetails?.(evt)}
                  className="w-full max-w-full min-w-0 overflow-hidden bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm hover:border-[#E05328] dark:hover:border-[#D17A68] transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                >
                  {/* Event Poster Thumbnail */}
                  <div
                    className="h-36 sm:h-auto sm:w-36 rounded-2xl bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0 relative overflow-hidden"
                    style={{ backgroundImage: `url('${evt.img}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                    <span className={`absolute top-2.5 left-2.5 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border}`}>
                      {evt.genre || evt.category}
                    </span>
                    <span className="absolute bottom-2.5 right-2.5 sm:hidden bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
                      {priceDisplay}
                    </span>
                  </div>

                  {/* Event Body */}
                  <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E05328] dark:group-hover:text-[#D17A68] transition line-clamp-1">
                          {evt.title}
                        </h4>
                        <span className="hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {priceDisplay}
                        </span>
                      </div>

                      {/* Time & Location */}
                      <div className="space-y-1 text-slate-500 dark:text-slate-400 text-xs">
                        {evt.time && (
                          <p className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-[#E05328] dark:text-[#D17A68] shrink-0" />
                            <span>{evt.time}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </p>
                      </div>

                      {evt.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.goingCount} going</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEventDetails?.(evt);
                        }}
                        className="px-3.5 py-1.5 bg-[#E05328] dark:bg-[#A94F3E] hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>Event Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Sleek Empty State Card */
          <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E05328] dark:text-[#D17A68] mx-auto flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                No events scheduled for this day
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Check back soon or explore trending events!
              </p>
            </div>

            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  if (onExploreTrendingEvents) onExploreTrendingEvents();
                }}
                className="px-4 py-2 bg-[#E05328] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Explore Trending Events</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Digital Wallet Passes & Tickets */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-[#E05328] dark:text-[#D17A68]" />
            <span>
              {selectedDay !== null 
                ? `Passes for This Day (${dayTickets.length})`
                : `Digital Passes & Synced Outings (${tickets.length})`}
            </span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">Fast-Track Entry</span>
        </div>

        <div className="space-y-3">
          {(selectedDay !== null ? dayTickets : tickets).map((t) => {
            const isToday = isDateToday(selectedYear, selectedMonth, 14) && (t.dateStr.toLowerCase().includes('14 oct') || t.dateStr.toLowerCase().includes('today'));
            return (
              <div
                key={t.id}
                className={`relative w-full max-w-full min-w-0 overflow-hidden rounded-3xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white transition select-none ${
                  isToday
                    ? 'bg-gradient-to-r from-[#E05328] dark:from-[#A94F3E] via-[#D94E28] dark:via-[#A94F3E] to-[#E9C46A] dark:to-[#A68B4B] ring-4 ring-amber-400/40 shadow-xl'
                    : t.type === 'Verified Ticket Pass'
                    ? 'bg-gradient-to-r from-[#E05328] dark:from-[#A94F3E] to-[#E9C46A] dark:to-[#A68B4B]'
                    : 'bg-gradient-to-r from-[#2D6A4F] to-emerald-700'
                }`}
              >
                {/* Status badge when event arrives today */}
                {isToday && (
                  <div className="inline-flex items-center gap-1.5 bg-black/85 backdrop-blur-md text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/40 w-fit mb-1 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>HAPPENING TODAY</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md inline-block">
                    {t.type}
                  </span>
                  <h4 className="font-black text-base mt-1 text-white truncate">{t.title}</h4>
                  <p className="text-xs text-slate-100 mt-0.5 flex items-center gap-1 truncate">
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.dateStr} • {t.locationStr}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0 flex-wrap">
                  {/* Share Outing Action */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await shareContent({
                        title: `RADA Pass: ${t.title}`,
                        text: `🎟️ Outing locked in! Catch me at "${t.title}" on ${t.dateStr} at ${t.locationStr}. Check it out on RADA!`,
                        url: window.location.href,
                        onError: (m: string) => showToast?.(m, { type: 'error' })
                      });
                    }}
                    title="Share Outing Pass"
                    className="p-2.5 bg-black/30 hover:bg-black/50 text-white rounded-xl transition flex items-center justify-center border border-white/20 cursor-pointer"
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
                    className="px-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black shadow-md hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-[#E05328] dark:text-[#D17A68]" />
                    <span>QR Pass</span>
                  </button>
                </div>
              </div>
            );
          })}

          {(selectedDay !== null ? dayTickets : tickets).length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              {selectedDay !== null 
                ? 'No passes for this specific day. Click "Show All" to view all your digital passes.'
                : 'No passes in vault yet. RSVP to events, book movies, or accept date invites to sync here!'}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded QR codes & tickets for events and cinema */}
      <VaultQrUploads showToast={showToast} />
    </section>
  );
};
