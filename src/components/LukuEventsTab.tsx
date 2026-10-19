import React, { useState, useMemo } from 'react';
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
  Users
} from 'lucide-react';
import { EventItem } from '../types.ts';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getEventPriceDisplay, 
  getCategoryBadgeStyle,
  isDateToday 
} from '../utils/calendarUtils.ts';
import { getCategoryAccent } from '../utils/categoryAccents.ts';

interface LukuEventsTabProps {
  events: EventItem[];
  onOpenEventDetails: (event: EventItem) => void;
  onExploreTrendingEvents?: () => void;
  onCategoryChange?: (category: string) => void;
  showToast?: (msg: string) => void;
}

export const LukuEventsTab: React.FC<LukuEventsTabProps> = ({
  events = [],
  onOpenEventDetails,
  onExploreTrendingEvents,
  onCategoryChange,
  showToast
}) => {
  // Calendar state - default to October 2026, day 24 (or 14 for today)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDay, setSelectedDay] = useState<number | null>(24);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  React.useEffect(() => {
    onCategoryChange?.(selectedCategory === 'all' ? 'events' : selectedCategory);
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
      const isToday = isDateToday(selectedYear, selectedMonth, day);
      const hasMatch = events.some(evt => 
        doesEventMatchDay(evt.date, selectedYear, selectedMonth, day, isToday)
      );
      if (hasMatch) {
        daysSet.add(day);
      }
    });
    return daysSet;
  }, [events, selectedYear, selectedMonth, dayCells]);

  // Selected date is today check
  const isSelectedDayToday = selectedDay !== null && isDateToday(selectedYear, selectedMonth, selectedDay);

  // Filter events for the currently selected day
  const dayEvents = useMemo(() => {
    if (selectedDay === null) {
      return events.filter(e => selectedCategory === 'all' || e.category === selectedCategory);
    }
    return events.filter(e => {
      const matchesDay = doesEventMatchDay(e.date, selectedYear, selectedMonth, selectedDay, isSelectedDayToday);
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesDay && matchesCategory;
    });
  }, [events, selectedDay, selectedYear, selectedMonth, isSelectedDayToday, selectedCategory]);

  // Clean formatted date header
  const dateHeader = useMemo(() => {
    if (selectedDay === null) return 'All Upcoming Events';
    return getCleanDateHeader(selectedYear, selectedMonth, selectedDay, isSelectedDayToday);
  }, [selectedYear, selectedMonth, selectedDay, isSelectedDayToday]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-5 px-3 sm:px-4 py-3">
      {/* Calendar Header Card */}
      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-3xl p-4 shadow-lg space-y-4">
        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition cursor-pointer"
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
              className="p-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition cursor-pointer"
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
                setSelectedMonth(9);
                setSelectedYear(2026);
                setSelectedDay(14);
                showToast?.('Viewing Events for Today');
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                isSelectedDayToday
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              Today
            </button>

            {selectedDay !== null && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
            const isDayToday = isDateToday(selectedYear, selectedMonth, day);

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  showToast?.(`Selected ${monthNames[selectedMonth].slice(0, 3)} ${day}`);
                }}
                className={`py-2 rounded-xl sm:rounded-2xl transition relative flex flex-col items-center justify-center font-bold cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#FF5733] text-white font-black shadow-md ring-2 ring-[#FF5733]/40'
                    : isDayToday
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-black border border-amber-300 dark:border-amber-700'
                    : hasEvents
                    ? 'bg-white/80 dark:bg-white/10 text-slate-900 dark:text-slate-100 font-extrabold border border-slate-200/80 dark:border-white/10 hover:border-[#FF5733]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{day}</span>
                {/* Event presence indicator dot */}
                {hasEvents && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-[#FF5733]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5733]" />
            <span>Event Scheduled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Today</span>
          </span>
        </div>
      </div>

      {/* Date Header & Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#FF5733]" />
            <span>{dateHeader}</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            {dayEvents.length} {dayEvents.length === 1 ? 'event scheduled' : 'events scheduled'}
          </p>
        </div>

        {selectedDay !== null && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-xs font-bold text-[#FF5733] hover:underline cursor-pointer"
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
            const priceDisplay = getEventPriceDisplay(event.tiers);

            return (
              <div
                key={event.id}
                onClick={() => onOpenEventDetails(event)}
                className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-3xl p-3.5 shadow-lg hover:border-[#FF5733] transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
              >
                {/* Event Poster / Banner */}
                <div
                  className="h-36 sm:h-auto sm:w-36 rounded-2xl bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0 relative overflow-hidden"
                  style={{ backgroundImage: `url('${event.img}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                  
                  {/* Category / Genre Badge with Vibrant Category Accent */}
                  <span className={`absolute top-2.5 left-2.5 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md ${accent.pillClass}`}>
                    {event.genre || accent.badge}
                  </span>

                  {/* Price Tag Overlay on Mobile */}
                  <span className="absolute bottom-2.5 right-2.5 sm:hidden bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
                    {priceDisplay}
                  </span>
                </div>

                {/* Event Information */}
                <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#FF5733] transition line-clamp-1">
                        {event.title}
                      </h4>
                      <span className="hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {priceDisplay}
                      </span>
                    </div>

                    {/* Time & Location */}
                    <div className="space-y-1 text-slate-500 dark:text-slate-400 text-xs">
                      {event.time && (
                        <p className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-[#FF5733] shrink-0" />
                          <span>{event.time}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5733] shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Going Count & View Details CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#222735] text-xs">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.goingCount} going</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEventDetails(event);
                      }}
                      className="px-3.5 py-1.5 bg-[#FF5733] hover:bg-[#FF6B4A] text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
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
        <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md border border-dashed border-slate-300 dark:border-white/10 rounded-3xl p-6 sm:p-8 text-center space-y-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5733] mx-auto flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              No events scheduled for this day
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
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
              className="px-4 py-2 bg-[#FF5733] hover:bg-[#FF6B4A] text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
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
