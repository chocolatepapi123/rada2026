import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Search, X, Clock, MapPin, Bookmark, Calendar, Ticket, ArrowUpDown, Globe, ChevronDown, Check, Sparkles, Layers,
} from 'lucide-react';
import { EventItem, SavedItem } from '../types.ts';
import {
  EVENT_DATE_FILTERS,
  EVENT_PRICE_FILTERS,
  eventMatchesSearch,
  getEventPriceLabel,
  isHappeningToday,
  isOnlineEvent,
  isUpcoming,
  matchesDateFilter,
  matchesPriceFilter,
  sortEvents,
  type EventSort,
} from '../utils/eventUtils.ts';
import {
  MAJOR_EVENT_CATEGORIES,
  eventMatchesMajorCategory,
  eventMatchesSubdivision,
} from '../lib/eventTaxonomy.ts';
import { pickSessionTopTen } from '../lib/topTen.ts';

interface EventsExplorerProps {
  events: EventItem[];
  onOpenEvent: (event: EventItem) => void;
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'event') => void;
  initialCategory?: string;
}

const PAGE_SIZE = 20;

interface RadaDropdownOption {
  id: string;
  label: string;
  dotColor?: string;
}

const RadaFilterDropdown: React.FC<{
  icon: React.ReactNode;
  value: string;
  options: RadaDropdownOption[];
  onChange: (id: string) => void;
  ariaLabel: string;
  align?: 'left' | 'right';
  accentColor?: string;
}> = ({ icon, value, options, onChange, ariaLabel, align = 'left', accentColor = '#E0533C' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-10 rounded-2xl border px-3 flex items-center gap-1.5 text-xs font-extrabold text-left transition cursor-pointer ${
          open
            ? 'bg-white dark:bg-[#1C1A1E] border-[#E0533C] ring-2 ring-[#E0533C]/15'
            : active
              ? 'bg-[#E0533C]/[0.08] border-[#E0533C]/45 text-[#E0533C]'
              : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}
      >
        <span className="shrink-0" style={{ color: active || open ? accentColor : '#94A3B8' }}>
          {icon}
        </span>
        <span className="flex-1 min-w-0 truncate">{current?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full mt-2 z-40 min-w-[200px] w-full max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-white/10 shadow-xl p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
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
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                  on ? 'bg-[#E0533C]/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {o.dotColor && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.dotColor }} />
                  )}
                  <span
                    className={`text-xs truncate ${
                      on ? 'font-black text-[#E0533C]' : 'font-bold text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {o.label}
                  </span>
                </span>
                {on && <Check className="w-3.5 h-3.5 text-[#E0533C] shrink-0 stroke-[3]" />}
              </button>
            );
          })}
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
  const [majorCategory, setMajorCategory] = useState<string>(() => {
    const mapLegacy: Record<string, string> = {
      nightlife: 'parties_nightlife',
      music: 'music_festivals',
      concerts: 'music_festivals',
      tech: 'tech_innovation',
      learn: 'business_finance',
      business: 'business_finance',
      arts: 'lifestyle_culture',
      food: 'lifestyle_culture',
      community: 'lifestyle_culture',
      cinema: 'lifestyle_culture',
      online: 'lifestyle_culture',
      sports: 'sports_fitness',
    };
    return mapLegacy[initialCategory] || (MAJOR_EVENT_CATEGORIES.some(c => c.id === initialCategory) ? initialCategory : 'all');
  });
  const [subdivision, setSubdivision] = useState<string>('all');
  const [price, setPrice] = useState<string>('all');
  const [date, setDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<EventSort>('smart');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [expandedCatInMenu, setExpandedCatInMenu] = useState<string | null>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, majorCategory, subdivision, price, date, sortBy]);

  useEffect(() => {
    if (!catMenuOpen) return;
    const away = (e: PointerEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) setCatMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatMenuOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [catMenuOpen]);

  const selectMajorCategory = (nextMajor: string) => {
    setMajorCategory(nextMajor);
    setSubdivision('all');
  };

  const activeMajorDef = useMemo(
    () => MAJOR_EVENT_CATEGORIES.find((c) => c.id === majorCategory) || null,
    [majorCategory],
  );

  // Upcoming events pool filtered by search + major category + subdivision
  const categoryFilteredEvents = useMemo(() => {
    return events.filter(
      (e) =>
        isUpcoming(e) &&
        eventMatchesSubdivision(e, majorCategory, subdivision) &&
        eventMatchesSearch(e, query),
    );
  }, [events, majorCategory, subdivision, query]);

  // Featured Events: session-stable random 10 from the category-filtered dataset
  const featuredCarouselEvents = useMemo(
    () => pickSessionTopTen('events-featured-top10', categoryFilteredEvents, (e) => String(e.id), 10),
    [categoryFilteredEvents],
  );

  // Upcoming Events: applies date, price, and sort/relevance filters on top
  const results = useMemo(() => {
    const filtered = categoryFilteredEvents.filter(
      (e) => matchesPriceFilter(e, price) && matchesDateFilter(e, date),
    );
    return sortEvents(filtered, sortBy);
  }, [categoryFilteredEvents, price, date, sortBy]);

  const majorCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.filter((e) => isUpcoming(e)).length };
    for (const c of MAJOR_EVENT_CATEGORIES) {
      counts[c.id] = events.filter((e) => isUpcoming(e) && eventMatchesMajorCategory(e, c.id)).length;
    }
    return counts;
  }, [events]);

  const activeFilterCount =
    (price !== 'all' ? 1 : 0) +
    (date !== 'all' ? 1 : 0) +
    (majorCategory !== 'all' ? 1 : 0) +
    (subdivision !== 'all' ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setMajorCategory('all');
    setSubdivision('all');
    setPrice('all');
    setDate('all');
    setSortBy('smart');
  };

  const isSaved = (id: string | number) =>
    savedItems.some((s) => String(s.id) === String(id) && s.kind === 'event');

  const activeSubLabel =
    activeMajorDef && subdivision !== 'all'
      ? activeMajorDef.subdivisions.find((s) => s.id === subdivision)?.label
      : null;

  return (
    <div className="space-y-5">
      {/* Search bar FIRST (preserved) */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues, hosts, ticket types..."
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

      {/* 6 Major Event Categories + Subdivisions Selector */}
      <section className="space-y-2.5 relative z-30" aria-label="Event Categories">
        <div className="flex items-center justify-between gap-2">
          {/* Custom RADA Category & Subdivisions Dropdown */}
          <div ref={catDropdownRef} className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setCatMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={catMenuOpen}
              className={`w-full h-11 rounded-2xl border px-3.5 flex items-center justify-between gap-2 text-xs font-black transition cursor-pointer ${
                majorCategory !== 'all' || catMenuOpen
                  ? 'bg-white dark:bg-[#1C1A1E] border-[#E0533C]/60 text-slate-900 dark:text-slate-100 ring-2 ring-[#E0533C]/10'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeMajorDef?.color || '#E0533C' }}
                />
                <span className="truncate">
                  {activeMajorDef
                    ? `${activeMajorDef.label}${activeSubLabel ? ` · ${activeSubLabel}` : ''}`
                    : 'All Event Categories'}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${catMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {catMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[24rem] overflow-y-auto rounded-3xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-white/10 shadow-2xl p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={majorCategory === 'all'}
                  onClick={() => {
                    selectMajorCategory('all');
                    setCatMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
                    majorCategory === 'all'
                      ? 'bg-[#E0533C]/12 text-[#E0533C]'
                      : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span>All Event Categories</span>
                  <span className="text-[11px] font-bold text-slate-400">{majorCounts.all}</span>
                </button>

                {MAJOR_EVENT_CATEGORIES.map((cat) => {
                  const isMajor = majorCategory === cat.id;
                  const isExpanded = expandedCatInMenu === cat.id || isMajor;
                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-[#F8F8F6]/70 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            selectMajorCategory(cat.id);
                            setExpandedCatInMenu(cat.id);
                          }}
                          className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-black transition cursor-pointer ${
                            isMajor ? 'text-[#E0533C]' : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="flex-1 truncate">{cat.label}</span>
                          <span className="text-[11px] font-bold text-slate-400">{majorCounts[cat.id] || 0}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Toggle ${cat.label} subdivisions`}
                          onClick={() => setExpandedCatInMenu(isExpanded ? null : cat.id)}
                          className="px-3 py-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-2.5 pt-0.5 flex flex-wrap gap-1.5">
                          {cat.subdivisions.map((sub) => {
                            const subActive = isMajor && subdivision === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setMajorCategory(cat.id);
                                  setSubdivision(sub.id);
                                  setCatMenuOpen(false);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                                  subActive
                                    ? 'text-white shadow-xs'
                                    : 'bg-white dark:bg-[#121113] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                }`}
                                style={subActive ? { backgroundColor: cat.color } : undefined}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-[#E0533C] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition shrink-0 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Interactive 6 Major Categories Strip */}
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => selectMajorCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition cursor-pointer whitespace-nowrap ${
              majorCategory === 'all'
                ? 'bg-[#E0533C] text-white shadow-xs'
                : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All
          </button>
          {MAJOR_EVENT_CATEGORIES.map((cat) => {
            const on = majorCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectMajorCategory(on ? 'all' : cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  on
                    ? 'text-white shadow-xs'
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
                style={on ? { backgroundColor: cat.color } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: on ? '#FFFFFF' : cat.color }}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subdivisions accessible directly through the active major category */}
        {activeMajorDef && (
          <div className="p-2.5 rounded-2xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <Layers className="w-3 h-3" style={{ color: activeMajorDef.color }} />
              <span>{activeMajorDef.label} · Subdivisions</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
              {activeMajorDef.subdivisions.map((sub) => {
                const on = subdivision === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubdivision(sub.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer whitespace-nowrap ${
                      on
                        ? 'text-white shadow-xs'
                        : 'bg-white dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                    style={on ? { backgroundColor: activeMajorDef.color } : undefined}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Featured Events Section (16:9 swipeable carousel cards) */}
      {featuredCarouselEvents.length > 0 && (
        <section className="space-y-3" aria-label="Featured Events">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#E0533C]/12 text-[#E0533C] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>Featured Events</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
              1–{featuredCarouselEvents.length}
            </span>
          </div>

          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2">
            {featuredCarouselEvents.map((evt, idx) => {
              const saved = isSaved(evt.id);
              const today = isHappeningToday(evt);
              const online = isOnlineEvent(evt);
              const priceLabel = getEventPriceLabel(evt);
              const dateShort = (evt.date || '').split(',')[0];

              return (
                <article
                  key={`featured-evt-${evt.id}`}
                  onClick={() => onOpenEvent(evt)}
                  className="w-[92%] sm:w-[68%] md:w-[48%] snap-start shrink-0 bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-[#E0533C] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Strict 16:9 landscape cover */}
                    <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      {evt.img && (
                        <img
                          src={evt.img}
                          alt={evt.title}
                          loading={idx < 2 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/20 pointer-events-none" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-[#E0533C] text-white text-[10px] font-black shadow-md">
                          #{idx + 1} Featured
                        </span>
                        {today && (
                          <span className="px-2 py-1 rounded-xl bg-[#2D6A4F] text-white text-[10px] font-black uppercase">
                            Today
                          </span>
                        )}
                        {online && (
                          <span className="px-2 py-1 rounded-xl bg-sky-600 text-white text-[10px] font-black flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Online
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

                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-white">
                        <span className="text-[11px] font-extrabold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg truncate">
                          {dateShort || evt.date}
                          {evt.time ? ` · ${evt.time.split('–')[0].trim()}` : ''}
                        </span>
                        {(evt.genre || evt.category) && (
                          <span className="text-[10px] font-bold bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg truncate max-w-[45%]">
                            {evt.genre || evt.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 pb-2 space-y-1.5">
                      <h4 className="font-black text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-[#E0533C] transition">
                        {evt.title}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        {online ? (
                          <Globe className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E0533C]" />
                        )}
                        <span className="truncate">{evt.location}</span>
                      </p>
                      {evt.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preserved RADA terracotta ticket bar */}
                  <div className="px-3.5 pb-3.5 pt-2">
                    <div className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 bg-[#E0533C]/[0.08] dark:bg-[#E0533C]/[0.15] border border-[#E0533C]/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-[#E0533C]/15 text-[#E0533C] flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                            {priceLabel}
                          </span>
                          {evt.host && (
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                              {evt.host}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-[11px] font-black shadow-xs shrink-0 whitespace-nowrap">
                        {online ? 'Access' : 'Get Tickets'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Events Section with Date, Price & Relevance RADA Filters */}
      <section className="space-y-3" aria-label="Upcoming Events">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeMajorDef?.color || '#E0533C' }}
            />
            <span>
              {activeMajorDef ? `Upcoming · ${activeMajorDef.label}` : 'Upcoming Events'}
            </span>
            <span className="text-[11px] font-bold text-slate-400 normal-case">({results.length})</span>
          </h4>
        </div>

        {/* RADA-native Dropdowns for Category, Date, Price, Relevance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-20">
          <RadaFilterDropdown
            ariaLabel="Filter upcoming events by category"
            icon={<Layers className="w-3.5 h-3.5" />}
            value={majorCategory}
            onChange={selectMajorCategory}
            accentColor={activeMajorDef?.color || '#E0533C'}
            options={[
              { id: 'all', label: 'All categories', dotColor: '#E0533C' },
              ...MAJOR_EVENT_CATEGORIES.map((c) => ({ id: c.id, label: c.label, dotColor: c.color })),
            ]}
          />
          <RadaFilterDropdown
            ariaLabel="Filter events by date"
            icon={<Calendar className="w-3.5 h-3.5" />}
            value={date}
            onChange={setDate}
            align="right"
            options={EVENT_DATE_FILTERS.map((d) => ({ id: d.id, label: d.label }))}
          />
          <RadaFilterDropdown
            ariaLabel="Filter events by price"
            icon={<Ticket className="w-3.5 h-3.5" />}
            value={price}
            onChange={setPrice}
            accentColor="#2D6A4F"
            options={EVENT_PRICE_FILTERS.map((p) => ({
              id: p.id,
              label: p.id === 'all' ? 'Any price' : p.id === 'free' ? 'Free' : `KES ${p.label}`,
            }))}
          />
          <RadaFilterDropdown
            ariaLabel="Sort events by relevance"
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            value={sortBy}
            onChange={(v) => setSortBy(v as EventSort)}
            align="right"
            options={[
              { id: 'smart', label: 'Relevance' },
              { id: 'date', label: 'Soonest first' },
              { id: 'price', label: 'Cheapest first' },
            ]}
          />
        </div>

        {/* 2-Column Upcoming Events Catalogue */}
        {results.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {results.slice(0, visible).map((evt) => {
                const today = isHappeningToday(evt);
                const saved = isSaved(evt.id);
                const online = isOnlineEvent(evt);
                const priceLabel = getEventPriceLabel(evt);
                const dateShort = (evt.date || '').split(',')[0];
                return (
                  <article
                    key={evt.id}
                    onClick={() => onOpenEvent(evt)}
                    className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 flex flex-col justify-between shadow-sm cursor-pointer hover:border-[#E0533C] transition group min-w-0"
                  >
                    <div>
                      {/* Strict 16:9 landscape cover */}
                      <div className="aspect-video w-full rounded-2xl mb-2 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                        {evt.img && (
                          <img
                            src={evt.img}
                            alt={evt.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15 pointer-events-none" />
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
                          {online && (
                            <span className="bg-sky-600/95 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-0.5 shadow-xs">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Online</span>
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

                      <div className="space-y-1 px-0.5">
                        <h4 className="font-black text-[13px] leading-snug text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition line-clamp-2">
                          {evt.title}
                        </h4>
                        <p className="text-[10px] text-[#E0533C] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {evt.date}
                            {evt.time ? ` • ${evt.time}` : ''}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          {online ? (
                            <Globe className="w-3 h-3 shrink-0 text-sky-500" />
                          ) : (
                            <MapPin className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate">{evt.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                      <div className="flex items-center justify-between gap-1.5 rounded-2xl px-2 py-1.5 bg-[#E0533C]/[0.07] dark:bg-[#E0533C]/[0.14] border border-[#E0533C]/15 group-hover:bg-[#E0533C]/[0.12] transition">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-xl bg-[#E0533C]/12 text-[#E0533C] flex items-center justify-center shrink-0">
                            <Ticket className="w-3.5 h-3.5" />
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
                          {online ? 'Access' : 'Tickets'}
                        </span>
                      </div>
                    </div>
                  </article>
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
                {events.length === 0 ? 'Check back soon or refresh your feed.' : 'Try a different category, date or price.'}
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
