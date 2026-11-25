import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Search, X, Clock, MapPin, Bookmark, Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Tag,
} from 'lucide-react';
import { EventItem, SavedItem } from '../types.ts';
import {
  EVENT_CATEGORY_FILTERS,
  EVENT_PRICE_FILTERS,
  eventMatchesCategory,
  eventMatchesSearch,
  getEventPriceLabel,
  isHappeningToday,
  isUpcoming,
  matchesPriceFilter,
  nairobiDayNumber,
  sortEvents,
} from '../utils/eventUtils.ts';
import { featuredEventOrder, pinFeaturedEvents } from '../lib/featuredEvents.ts';
import { SingleSlideCarousel } from './SingleSlideCarousel.tsx';

interface EventsExplorerProps {
  events: EventItem[];
  onOpenEvent: (event: EventItem) => void;
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'event') => void;
  initialCategory?: string;
}

const PAGE_SIZE = 20;

interface DropdownOption {
  id: string;
  label: string;
}

const CompactPillDropdown: React.FC<{
  icon: React.ReactNode;
  value: string;
  options: DropdownOption[];
  onChange: (id: string) => void;
  ariaLabel: string;
  align?: 'left' | 'right';
}> = ({ icon, value, options, onChange, ariaLabel, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const current = options.find((o) => o.id === value) || options[0];
  const active = value !== options[0]?.id;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`h-9 px-3 rounded-full border flex items-center gap-1.5 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
          open
            ? 'bg-white dark:bg-[#1C1A1E] border-[#E0533C] ring-2 ring-[#E0533C]/15 text-slate-900 dark:text-slate-100'
            : active
              ? 'bg-[#E0533C]/10 border-[#E0533C]/50 text-[#E0533C]'
              : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
        }`}
      >
        <span className={`shrink-0 ${active || open ? 'text-[#E0533C]' : 'text-slate-400'}`}>{icon}</span>
        <span className="truncate max-w-[8.5rem]">{current?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full mt-1.5 z-40 w-52 max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((o) => {
            const on = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                  on ? 'bg-[#E0533C]/10 text-[#E0533C]' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className={`text-xs truncate ${on ? 'font-black' : 'font-semibold'}`}>{o.label}</span>
                {on && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DateRangeSelection {
  start: string | null; // YYYY-MM-DD
  end: string | null;   // YYYY-MM-DD
}

const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isoToDayNum = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

const formatShortISO = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const eventMatchesDateSelection = (e: EventItem, range: DateRangeSelection): boolean => {
  if (!range.start) return true;
  if (!e.startAt) return false;
  const s = new Date(e.startAt);
  if (isNaN(s.getTime())) return false;
  const first = nairobiDayNumber(s);
  let last = first;
  if (e.endAt) {
    const en = new Date(e.endAt);
    if (!isNaN(en.getTime())) last = Math.max(first, nairobiDayNumber(en));
  }
  const rStart = isoToDayNum(range.start);
  const rEnd = isoToDayNum(range.end || range.start);
  return first <= rEnd && last >= rStart;
};

const WEEKDAY_HEADINGS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DateCalendarPopover: React.FC<{
  value: DateRangeSelection;
  onChange: (next: DateRangeSelection) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const todayISO = toLocalISO(today);
  const active = Boolean(value.start);

  const label = useMemo(() => {
    if (!value.start) return 'Any date';
    if (!value.end || value.end === value.start) return formatShortISO(value.start);
    return `${formatShortISO(value.start)} – ${formatShortISO(value.end)}`;
  }, [value]);

  const monthCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday = 0 ... Sunday = 6
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDayClick = (iso: string) => {
    if (!value.start || (value.start && value.end)) {
      onChange({ start: iso, end: null });
    } else if (iso < value.start) {
      onChange({ start: iso, end: value.start });
    } else if (iso === value.start) {
      onChange({ start: iso, end: iso });
    } else {
      onChange({ start: value.start, end: iso });
    }
  };

  const applyPreset = (preset: 'today' | 'weekend' | 'week') => {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === 'today') {
      const iso = toLocalISO(base);
      onChange({ start: iso, end: iso });
      setOpen(false);
      return;
    }
    if (preset === 'weekend') {
      const wd = base.getDay();
      const sat = new Date(base);
      if (wd === 0) sat.setDate(base.getDate() - 1);
      else if (wd !== 6) sat.setDate(base.getDate() + (6 - wd));
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      onChange({ start: toLocalISO(sat), end: toLocalISO(sun) });
      setOpen(false);
      return;
    }
    const end7 = new Date(base);
    end7.setDate(base.getDate() + 6);
    onChange({ start: toLocalISO(base), end: toLocalISO(end7) });
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Filter events by date"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`h-9 px-3 rounded-full border flex items-center gap-1.5 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
          open
            ? 'bg-white dark:bg-[#1C1A1E] border-[#E0533C] ring-2 ring-[#E0533C]/15 text-slate-900 dark:text-slate-100'
            : active
              ? 'bg-[#E0533C]/10 border-[#E0533C]/50 text-[#E0533C]'
              : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 shrink-0 ${active || open ? 'text-[#E0533C]' : 'text-slate-400'}`} />
        <span className="truncate max-w-[9rem] tabular-nums">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select event date or range"
          className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-50 w-64 rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick date presets */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C]/10 hover:text-[#E0533C] transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('weekend')}
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C]/10 hover:text-[#E0533C] transition cursor-pointer"
            >
              Weekend
            </button>
            <button
              type="button"
              onClick={() => applyPreset('week')}
              className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C]/10 hover:text-[#E0533C] transition cursor-pointer"
            >
              Next 7d
            </button>
          </div>

          {/* Month header */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100">{monthTitle}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAY_HEADINGS.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 py-0.5">
                {d}
              </span>
            ))}
            {monthCells.map((cell, idx) => {
              if (!cell) return <span key={`empty-${idx}`} />;
              const start = value.start;
              const end = value.end || value.start;
              const isEndpoint = cell.iso === start || (Boolean(value.end) && cell.iso === value.end);
              const inRange = Boolean(start && end && cell.iso >= start && cell.iso <= end);
              const isToday = cell.iso === todayISO;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleDayClick(cell.iso)}
                  className={`h-7 rounded-lg text-[11px] font-bold tabular-nums transition cursor-pointer ${
                    isEndpoint
                      ? 'bg-[#E0533C] text-white font-black'
                      : inRange
                        ? 'bg-[#E0533C]/15 text-[#E0533C]'
                        : isToday
                          ? 'ring-1 ring-[#E0533C]/50 text-[#E0533C]'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                onChange({ start: null, end: null });
                setOpen(false);
              }}
              className="font-bold text-slate-500 hover:text-[#E0533C] cursor-pointer"
            >
              Clear
            </button>
            <span className="text-[10px] text-slate-400">
              {value.start && !value.end ? 'Tap end date' : 'Day or range'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-[#E0533C] text-white font-black cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const EventsExplorer: React.FC<EventsExplorerProps> = ({
  events,
  onOpenEvent,
  savedItems = [],
  onToggleSave,
  initialCategory = 'all',
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(initialCategory === 'online' ? 'all' : initialCategory);
  const [price, setPrice] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeSelection>({ start: null, end: null });
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, category, price, dateRange]);

  const categoryOptions = useMemo<DropdownOption[]>(
    () =>
      EVENT_CATEGORY_FILTERS.filter((c) => c.id !== 'online').map((c) => ({
        id: c.id,
        label: c.id === 'all' ? 'All categories' : c.label,
      })),
    [],
  );

  const priceOptions = useMemo<DropdownOption[]>(
    () =>
      EVENT_PRICE_FILTERS.map((p) => ({
        id: p.id,
        label: p.id === 'all' ? 'Any entry' : p.id === 'free' ? 'Free' : `KES ${p.label}`,
      })),
    [],
  );

  // Featured Events: curated upcoming featured events respecting search query
  const featuredEvents = useMemo(() => {
    const upcoming = events.filter((e) => isUpcoming(e) && eventMatchesSearch(e, query));
    const curated = upcoming.filter(
      (e) => e.tags?.includes('rada-featured') || featuredEventOrder(e) < 1000,
    );
    const pool = curated.length > 0 ? curated : sortEvents(upcoming, 'smart');
    return pinFeaturedEvents(pool).slice(0, 10);
  }, [events, query]);

  // Upcoming Events: respects search, category dropdown, price dropdown, and calendar date range
  const results = useMemo(() => {
    const filtered = events.filter(
      (e) =>
        isUpcoming(e) &&
        eventMatchesCategory(e, category) &&
        matchesPriceFilter(e, price) &&
        eventMatchesDateSelection(e, dateRange) &&
        eventMatchesSearch(e, query),
    );
    return pinFeaturedEvents(sortEvents(filtered, 'smart'));
  }, [events, query, category, price, dateRange]);

  const activeFilterCount =
    (category !== 'all' ? 1 : 0) + (price !== 'all' ? 1 : 0) + (dateRange.start ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setCategory('all');
    setPrice('all');
    setDateRange({ start: null, end: null });
  };

  const isSaved = (id: string | number) =>
    savedItems.some((s) => String(s.id) === String(id) && s.kind === 'event');

  return (
    <div className="space-y-5">
      {/* 1. Existing search bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues, hosts, genres..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-semibold bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#E0533C]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Featured Events (matching RADA single-card swipe card aura) */}
      {featuredEvents.length > 0 && (
        <section className="space-y-2.5" aria-label="Featured Events">
          <div className="rounded-2xl px-3.5 py-2.5 bg-gradient-to-r from-[#E05328] via-[#E0533C] to-[#EE8A47] text-white shadow-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white/95 rounded-xl px-2.5 py-1 shadow-xs shrink-0 flex items-center">
                <img
                  src="/rada-mark.png"
                  alt="RADA"
                  className="h-5 w-auto object-contain"
                />
              </div>
              <span className="text-xs font-black tracking-wider uppercase truncate">
                Featured Events
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-xs text-[10px] font-extrabold text-white whitespace-nowrap shrink-0">
              This Week
            </span>
          </div>

          <SingleSlideCarousel ariaLabel="Featured events carousel">
            {featuredEvents.map((evt, idx) => {
              const saved = isSaved(evt.id);
              const priceLabel = getEventPriceLabel(evt);
              const today = isHappeningToday(evt);
              const dateText = evt.time ? `${evt.date} · ${evt.time.split('–')[0].trim()}` : evt.date;
              const tagLabel = evt.genre || evt.category || '';

              return (
                <article
                  key={`featured-evt-${evt.id}`}
                  onClick={() => onOpenEvent(evt)}
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:border-[#E0533C] transition cursor-pointer group"
                >
                  <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    {evt.img ? (
                      <img
                        src={evt.img}
                        alt={evt.title}
                        loading={idx < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 dark:from-slate-800 dark:to-slate-900">
                        <Calendar className="w-8 h-8 text-[#E0533C]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/15 pointer-events-none" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {today && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#2D6A4F] text-white text-[10px] font-black uppercase tracking-wide shadow-xs">
                          Today
                        </span>
                      )}
                      {dateText && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-black/65 backdrop-blur-xs text-white text-[10px] font-extrabold">
                          {dateText}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.(evt, 'event');
                      }}
                      aria-label={saved ? 'Remove bookmark' : 'Bookmark event'}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                        saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Small relevant info + compact Get Tickets button on bottom right */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="space-y-1">
                      <h4 className="font-black text-[15px] text-slate-900 dark:text-slate-100 leading-snug truncate group-hover:text-[#E0533C] transition">
                        {evt.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-[#E0533C]" />
                        <span className="truncate">{evt.location}</span>
                      </p>
                      {evt.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E0533C]/10 text-[#E0533C] text-[10px] font-black tabular-nums shrink-0">
                          <Tag className="w-3 h-3" />
                          <span>{priceLabel}</span>
                        </span>
                        {tagLabel && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                            {tagLabel}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvent(evt);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-[11px] font-black shadow-xs shrink-0 cursor-pointer hover:opacity-95 transition whitespace-nowrap"
                      >
                        View Event
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </SingleSlideCarousel>
        </section>
      )}

      {/* 3. Upcoming Events */}
      <section className="space-y-3" aria-label="Upcoming Events">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Upcoming Events
          </h4>
          {(query || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Three compact pill filters: Category, Price, Date */}
        <div className="flex items-center gap-1.5 flex-wrap relative z-30">
          <CompactPillDropdown
            ariaLabel="Filter by event category"
            icon={<Tag className="w-3.5 h-3.5" />}
            value={category}
            options={categoryOptions}
            onChange={setCategory}
          />
          <CompactPillDropdown
            ariaLabel="Filter by entry"
            icon={<Tag className="w-3.5 h-3.5" />}
            value={price}
            options={priceOptions}
            onChange={setPrice}
          />
          <DateCalendarPopover value={dateRange} onChange={setDateRange} />
        </div>

        {results.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {results.slice(0, visible).map((evt) => {
                const today = isHappeningToday(evt);
                const saved = isSaved(evt.id);
                const priceLabel = getEventPriceLabel(evt);
                const dateShort = (evt.date || '').split(',')[0];
                return (
                  <div
                    key={evt.id}
                    onClick={() => onOpenEvent(evt)}
                    className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-2 flex flex-col justify-between shadow-sm cursor-pointer hover:border-[#E0533C] transition group min-w-0"
                  >
                    <div>
                      <div
                        className="h-32 rounded-2xl mb-2 bg-cover bg-center relative overflow-hidden bg-slate-200 dark:bg-slate-800"
                        style={{ backgroundImage: `url('${evt.img}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />
                        {dateShort && (
                          <span className="absolute top-2 left-2 bg-black/65 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                            {dateShort}
                          </span>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 flex-wrap">
                          {today && (
                            <span className="bg-[#2D6A4F]/95 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shadow-xs">
                              Today
                            </span>
                          )}
                          {(evt.genre || evt.category) && (
                            <span className="bg-black/60 backdrop-blur-xs text-white/95 text-[9px] font-bold px-2 py-0.5 rounded-md truncate max-w-full">
                              {evt.genre || evt.category}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSave?.(evt, 'event');
                          }}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                            saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                          title={saved ? 'Remove bookmark' : 'Bookmark this event'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                        </button>
                      </div>

                      <h4 className="font-extrabold text-[13px] leading-snug text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition line-clamp-2">
                        {evt.title}
                      </h4>

                      <p className="text-[10px] text-[#E0533C] font-semibold mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {evt.date}
                          {evt.time ? ` • ${evt.time}` : ''}
                        </span>
                      </p>

                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                      <div className="flex items-center justify-between gap-1.5 rounded-2xl px-2 py-1.5 bg-[#E0533C]/[0.07] dark:bg-[#E0533C]/[0.14] border border-[#E0533C]/15 group-hover:bg-[#E0533C]/[0.12] transition">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-xl bg-[#E0533C]/12 text-[#E0533C] flex items-center justify-center shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <span className="block text-[10px] font-black text-slate-900 dark:text-slate-100 truncate">
                              {priceLabel}
                            </span>
                            {evt.host && (
                              <span className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                {evt.host}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-[9px] font-black shadow-xs shrink-0">
                          View
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {visible < results.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="w-full py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black cursor-pointer hover:opacity-90 transition"
              >
                Load more
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] mx-auto flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                {events.length === 0 ? 'No events loaded yet' : 'No events match these filters'}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                {events.length === 0 ? 'Check back soon or refresh your feed.' : 'Try a different category, price or date.'}
              </p>
            </div>
            {(activeFilterCount > 0 || query) && (
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
