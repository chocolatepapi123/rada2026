import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Ticket, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Filter,
  Flame,
  CheckCircle2,
  Users,
  ArrowLeft,
  Bookmark
} from 'lucide-react';
import { EventItem, SavedItem } from '../types.ts';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getCategoryBadgeStyle,
  parseEventDate
} from '../utils/calendarUtils.ts';
import {
  EVENT_CATEGORY_FILTERS,
  eventMatchesCategory,
  eventMatchesSearch,
  eventOccursOnDay,
  getEventPriceLabel,
  getSourceLabel,
  getTodayParts,
  isRealToday
} from '../utils/eventUtils.ts';
import { getCategoryAccent } from '../utils/categoryAccents.ts';
import type { ToastOptions } from './Toast.tsx';

/** Does a live (startAt) or merchant-created (date string) event fall on this day? */
function eventOnDay(evt: EventItem, year: number, month: number, day: number): boolean {
  const live = eventOccursOnDay(evt, year, month, day);
  if (live !== null) return live;
  return doesEventMatchDay(evt.date, year, month, day, isRealToday(year, month, day));
}

interface LukuEventsTabProps {
  events: EventItem[];
  onOpenEventDetails: (event: EventItem) => void;
  onExploreTrendingEvents?: () => void;
  onCategoryChange?: (category: string) => void;
  showToast?: (msg: string, options?: ToastOptions) => void;
  initialDate?: string | { year: number; month: number; day: number } | null;
  highlightEventId?: number | string | null;
  onBackToSpots?: () => void;
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => void;
}

export const LukuEventsTab: React.FC<LukuEventsTabProps> = ({
  events = [],
  onOpenEventDetails,
  onExploreTrendingEvents,
  onCategoryChange,
  showToast,
  initialDate = null,
  highlightEventId = null,
  onBackToSpots,
  savedItems = [],
  onToggleSave
}) => {
  // Parse incoming initialDate if passed
  const parsedTargetDate = useMemo(() => {
    if (!initialDate) return null;
    if (typeof initialDate === 'object') return initialDate;
    return parseEventDate(initialDate);
  }, [initialDate]);

  // Calendar state - default to the requested date, otherwise the real "today" in Nairobi
  const [selectedYear, setSelectedYear] = useState<number>(() => parsedTargetDate?.year || getTodayParts().year);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => (parsedTargetDate?.month !== undefined ? parsedTargetDate.month : getTodayParts().month));
  const [selectedDay, setSelectedDay] = useState<number | null>(() => (parsedTargetDate?.day !== undefined ? parsedTargetDate.day : null));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedEventId, setFocusedEventId] = useState<number | string | null>(highlightEventId);

  // Sync state whenever initialDate changes
  useEffect(() => {
    if (parsedTargetDate) {
      setSelectedYear(parsedTargetDate.year);
      setSelectedMonth(parsedTargetDate.month);
      setSelectedDay(parsedTargetDate.day);
    }
  }, [parsedTargetDate]);

  useEffect(() => {
    setFocusedEventId(highlightEventId);
  }, [highlightEventId]);

  React.useEffect(() => {
    // Parent only knows the original event categories; tech/sports roll up to the generic 'events'
    const parentCategory =
      selectedCategory === 'nightlife' ? 'nightlife'
      : selectedCategory === 'music' ? 'concerts'
      : selectedCategory === 'arts' ? 'art'
      : 'events';
    onCategoryChange?.(parentCategory);
  }, [selectedCategory, onCategoryChange]);

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
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const emptyCells = Array.from({ length: firstDayOfWeek });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map of days in this month that have events
  const daysWithEvents = useMemo(() => {
    const daysSet = new Set<number>();
    dayCells.forEach(day => {
      const hasMatch = events.some(evt => eventOnDay(evt, selectedYear, selectedMonth, day));
      if (hasMatch) {
        daysSet.add(day);
      }
    });
    return daysSet;
  }, [events, selectedYear, selectedMonth, dayCells]);

  // Selected date is today check
  const isSelectedDayToday = selectedDay !== null && isRealToday(selectedYear, selectedMonth, selectedDay);

  // Filter events for the currently selected day
  const dayEvents = useMemo(() => {
    return events
      .filter(e => {
        const matchesDay = selectedDay === null || eventOnDay(e, selectedYear, selectedMonth, selectedDay);
        return matchesDay && eventMatchesCategory(e, selectedCategory) && eventMatchesSearch(e, searchQuery);
      })
      .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  }, [events, selectedDay, selectedYear, selectedMonth, selectedCategory, searchQuery]);

  // Clean formatted date header
  const dateHeader = useMemo(() => {
    if (selectedDay === null) return 'All Upcoming Events';
    return getCleanDateHeader(selectedYear, selectedMonth, selectedDay, isSelectedDayToday);
  }, [selectedYear, selectedMonth, selectedDay, isSelectedDayToday]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Auto-scroll or focus on the matching event card in the calendar schedule
  useEffect(() => {
    if (focusedEventId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`calendar-event-${focusedEventId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [focusedEventId, selectedDay, selectedMonth, selectedYear]);

  const isEventSaved = (eventId: number | string) => {
    return savedItems.some(s => String(s.id) === String(eventId) && s.kind === 'event');
  };

  return (
    <div className="space-y-4 px-3 sm:px-4 py-3">
      {/* Back Navigation Bar to return smoothly to Spots Feed */}
      {onBackToSpots && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onBackToSpots}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition shadow-xs cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-[#E0533C] dark:text-[#D17A68] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Spots Feed</span>
          </button>
          <span className="text-[11px] font-bold text-slate-400">
            Calendar Schedule
          </span>
        </div>
      )}

      {/* Calendar Header Card */}
      <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-black text-sm text-slate-900 dark:text-slate-100 min-w-[130px] text-center">
              {monthNames[selectedMonth]} {selectedYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Filter: Select Today or Clear Filter */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const t = getTodayParts();
                setSelectedMonth(t.month);
                setSelectedYear(t.year);
                setSelectedDay(t.day);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                isSelectedDayToday
                  ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              Today
            </button>

            {selectedDay !== null && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="py-2.5" />
          ))}

          {dayCells.map((day) => {
            const isSelected = selectedDay === day;
            const hasEvents = daysWithEvents.has(day);
            const isDayToday = isRealToday(selectedYear, selectedMonth, day);
            const isTargetDay = (
              parsedTargetDate &&
              parsedTargetDate.year === selectedYear &&
              parsedTargetDate.month === selectedMonth &&
              parsedTargetDate.day === day
            );

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                }}
                className={`py-2 rounded-xl sm:rounded-2xl transition relative flex flex-col items-center justify-center font-bold cursor-pointer select-none ${
                  isSelected
                    ? isTargetDay
                      ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white font-black shadow-lg ring-4 ring-[#E0533C]/60 dark:ring-[#D17A68]/60 scale-105'
                      : 'bg-[#FF5733] dark:bg-[#A94F3E] text-white font-black shadow-md ring-2 ring-[#FF5733]/40 dark:ring-[#D17A68]/40'
                    : isTargetDay
                    ? 'bg-orange-500/20 text-[#E0533C] dark:text-[#D17A68] font-black ring-2 ring-[#E0533C] dark:ring-[#D17A68] border border-[#E0533C] dark:border-[#D17A68]'
                    : isDayToday
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-black border border-amber-300 dark:border-amber-700'
                    : hasEvents
                    ? 'bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-slate-100 font-extrabold border border-slate-200 dark:border-white/10 hover:border-[#FF5733] dark:hover:border-[#D17A68]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{day}</span>
                {/* Event presence indicator dot */}
                {hasEvents && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-[#FF5733] dark:bg-[#A94F3E]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5733] dark:bg-[#A94F3E]" />
            <span>Event Scheduled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Today</span>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        <Filter className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events, venues, hosts..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#E0533C]"
        />
      </div>

      {/* Category filters */}
      <div
        className="-mx-3 sm:-mx-4 px-3 sm:px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Event categories"
      >
        {EVENT_CATEGORY_FILTERS.map((f) => {
          const active = selectedCategory === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(f.id)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-black border transition cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white border-[#E0533C] dark:border-[#D17A68] shadow-xs'
                  : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#E0533C]/60 dark:hover:border-[#D17A68]/60'
              }`}
            >
              <span aria-hidden="true">{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Header & Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#FF5733] dark:text-[#D17A68]" />
            <span>{dateHeader}</span>
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
            {dayEvents.length} {dayEvents.length === 1 ? 'event scheduled' : 'events scheduled'}
          </p>
        </div>

        {selectedDay !== null && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-xs font-bold text-[#FF5733] dark:text-[#D17A68] hover:underline cursor-pointer"
          >
            View All Dates
          </button>
        )}
      </div>

      {/* Events Day View Cards */}
      {dayEvents.length > 0 ? (
        <div className="space-y-3">
          {dayEvents.map((event) => {
            const accent = getCategoryAccent(event.category, event.title, event.genre);
            const priceDisplay = getEventPriceLabel(event);
            const isMatch = focusedEventId && String(event.id) === String(focusedEventId);
            const saved = isEventSaved(event.id);

            return (
              <div
                key={event.id}
                id={`calendar-event-${event.id}`}
                tabIndex={-1}
                onClick={() => onOpenEventDetails(event)}
                className={`bg-white dark:bg-[#1C1A1E] rounded-3xl p-3.5 shadow-sm transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5 text-slate-900 dark:text-slate-100 ${
                  isMatch
                    ? 'border-2 border-[#E0533C] dark:border-[#D17A68] ring-4 ring-[#E0533C]/30 dark:ring-[#D17A68]/30 shadow-md scale-[1.01]'
                    : 'border border-slate-200/90 dark:border-slate-800 hover:border-[#FF5733]/50 dark:hover:border-[#D17A68]/50'
                }`}
              >
                {/* Event Poster / Banner */}
                <div
                  className="h-36 sm:h-auto sm:w-36 rounded-2xl bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0 relative overflow-hidden"
                  style={event.img ? { backgroundImage: `url('${event.img}')` } : undefined}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                  
                  {/* Category / Genre Badge */}
                  <span className={`absolute top-2.5 left-2.5 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md ${accent.pillClass}`}>
                    {event.genre || accent.badge}
                  </span>

                  {/* Matching Event Focus Badge */}
                  {isMatch && (
                    <span className="absolute bottom-2.5 left-2.5 bg-[#E0533C] dark:bg-[#A94F3E] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md animate-pulse">
                      Selected Plan Target
                    </span>
                  )}

                  {/* Price Tag Overlay on Mobile */}
                  <span className="absolute bottom-2.5 right-2.5 sm:hidden bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
                    {priceDisplay}
                  </span>
                </div>

                {/* Event Information */}
                <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#FF5733] dark:group-hover:text-[#D17A68] transition line-clamp-1">
                        {event.title}
                      </h4>
                      <span className="hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {priceDisplay}
                      </span>
                    </div>

                    {/* Time & Location */}
                    <div className="space-y-1 text-slate-900 dark:text-slate-100 text-xs font-semibold">
                      {event.time && (
                        <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <Clock className="w-3.5 h-3.5 text-[#FF5733] dark:text-[#D17A68] shrink-0" />
                          <span>{event.time}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 truncate text-slate-800 dark:text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5733] dark:text-[#D17A68] shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed pt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Going Count & Active Bookmark / Plan Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{event.goingCount > 0 ? `${event.goingCount} going` : (event.source ? `via ${getSourceLabel(event.source)}` : 'Be the first to go')}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Active Bookmark / In Your Plans button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(event, 'event');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          saved
                            ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={saved ? 'In Your Plans (Tap to remove)' : 'Add to Your Plans'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                        <span className="text-[11px] font-extrabold whitespace-nowrap">
                          {saved ? 'In Your Plans' : 'Add to Plan'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEventDetails(event);
                        }}
                        className="px-3 py-1.5 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Sleek Empty State Card */
        <div className="bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3.5 shadow-sm text-slate-900 dark:text-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#FF5733] dark:text-[#D17A68] border border-orange-200 dark:border-orange-500/30 mx-auto flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {searchQuery.trim() ? 'No events match your search' : selectedCategory === 'all' ? 'No events scheduled for this day' : 'No events in this category for this day'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Check back soon or explore trending events across Nairobi!
            </p>
          </div>

          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDay(null);
                if (onExploreTrendingEvents) onExploreTrendingEvents();
              }}
              className="px-4 py-2 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Explore Trending Events</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
