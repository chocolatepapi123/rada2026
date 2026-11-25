import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Share2, 
  MapPin, 
  Users, 
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
  getCategoryBadgeStyle, 
  isDateToday 
} from '../utils/calendarUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { RadaSelect } from './RadaPickers.tsx';

interface VaultTabProps {
  tickets: VaultTicket[];
  events?: EventItem[];
  onShowQrCode?: (title: string) => void;
  onOpenEventDetails?: (event: EventItem) => void;
  onExploreTrendingEvents?: () => void;
  showToast?: (msg: string, options?: ToastOptions) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({ 
  tickets = [], 
  events = [],
  onOpenEventDetails,
  onExploreTrendingEvents,
  showToast,
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

  // Saved plans synced from outings, events, and date invites
  const savedPlans = useMemo(() => tickets.filter(t => t.type === 'Vault Synced Outing'), [tickets]);

  // Clean formatted date header
  const dateHeader = useMemo(() => {
    if (selectedDay === null) return 'All Upcoming Events & Outings';
    if (isSelectedDayToday) return 'Events for Today';
    return getCleanDateHeader(selectedYear, selectedMonth, selectedDay, isSelectedDayToday);
  }, [selectedYear, selectedMonth, selectedDay, isSelectedDayToday]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <section className="w-full max-w-full min-w-0 overflow-x-hidden px-3 sm:px-4 py-4 space-y-6 min-[900px]:max-w-3xl min-[900px]:mx-auto">
      {/* Calendar Card */}
      <div className="w-full max-w-full min-w-0 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm space-y-4">
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

            <RadaSelect
              ariaLabel="Select month"
              compact
              value={String(selectedMonth)}
              onChange={(val) => setSelectedMonth(parseInt(val, 10))}
              options={monthNames.map((m, idx) => ({ value: String(idx), label: m }))}
              buttonClassName="bg-white dark:bg-[#121113] rounded-xl px-2.5 py-1.5 font-black text-xs"
              className="min-w-[7.2rem]"
            />

            <RadaSelect
              ariaLabel="Select year"
              compact
              value={String(selectedYear)}
              onChange={(val) => setSelectedYear(parseInt(val, 10))}
              options={[
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
                { value: '2027', label: '2027' },
              ]}
              buttonClassName="bg-white dark:bg-[#121113] rounded-xl px-2.5 py-1.5 font-black text-xs"
              className="min-w-[4.8rem]"
            />

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
                const now = new Date();
                setSelectedMonth(now.getMonth());
                setSelectedYear(now.getFullYear());
                setSelectedDay(now.getDate());
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

      {/* 2. My Saved Plans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-[#E05328] dark:text-[#D17A68]" />
            <span>My Saved Plans</span>
          </h2>
        </div>
        {savedPlans.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            Nothing saved yet. Join an outing or plan a date and it shows up here.
          </div>
        ) : (
          <div className="space-y-3">
            {savedPlans.map((t) => (
              <div key={t.id} className="w-full max-w-full min-w-0 overflow-hidden rounded-3xl p-4 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E05328] dark:text-[#D17A68] flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-black tracking-wider text-[#E05328] dark:text-[#D17A68]">Saved plan</span>
                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">{t.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{t.dateStr}</p>
                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{t.locationStr}</span></p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.locationStr || t.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-[#E05328] dark:bg-[#A94F3E] text-white rounded-xl text-[11px] font-black text-center"
                  >
                    Directions
                  </a>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await shareContent({
                        title: `Plan: ${t.title}`,
                        text: `I have a plan: "${t.title}" on ${t.dateStr} at ${t.locationStr}. Join me on RADA!`,
                        url: window.location.href,
                        onError: (m: string) => showToast?.(m, { type: 'error' })
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Events for Today / Selected Date */}
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
                  </div>

                  {/* Event Body */}
                  <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E05328] dark:group-hover:text-[#D17A68] transition line-clamp-1">
                          {evt.title}
                        </h4>
                        <span className="hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {evt.genre || evt.category}
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
    </section>
  );
};
