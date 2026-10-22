import React, { useMemo, useState, useEffect } from 'react';
import { Search, X, Clock, MapPin, Bookmark, Calendar, Ticket, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { EventItem, SavedItem } from '../types.ts';
import {
  EVENT_CATEGORY_FILTERS,
  EVENT_DATE_FILTERS,
  EVENT_PRICE_FILTERS,
  eventMatchesCategory,
  filterEvents,
  getEventPriceLabel,
  getSourceLabel,
  isHappeningToday,
  sortEvents,
  type EventSort
} from '../utils/eventUtils.ts';

interface EventsExplorerProps {
  events: EventItem[];
  onOpenEvent: (event: EventItem) => void;
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'event') => void;
  initialCategory?: string;
}

const PAGE_SIZE = 20;

export const EventsExplorer: React.FC<EventsExplorerProps> = ({
  events,
  onOpenEvent,
  savedItems = [],
  onToggleSave,
  initialCategory = 'all'
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(initialCategory);
  const [price, setPrice] = useState<string>('all');
  const [date, setDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<EventSort>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // any filter change starts again from the first page
  useEffect(() => { setVisible(PAGE_SIZE); }, [query, category, price, date, sortBy]);

  // how many events each category pill would show (given the other active filters)
  const categoryCounts = useMemo(() => {
    const base = filterEvents(events, { query, category: 'all', price, date });
    const counts: Record<string, number> = {};
    EVENT_CATEGORY_FILTERS.forEach(c => {
      counts[c.id] = c.id === 'all' ? base.length : base.filter(e => eventMatchesCategory(e, c.id)).length;
    });
    return counts;
  }, [events, query, price, date]);

  const results = useMemo(
    () => sortEvents(filterEvents(events, { query, category, price, date }), sortBy),
    [events, query, category, price, date, sortBy]
  );

  const activeFilterCount = (price !== 'all' ? 1 : 0) + (date !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setCategory('all');
    setPrice('all');
    setDate('all');
  };

  const isSaved = (id: string | number) =>
    savedItems.some(s => String(s.id) === String(id) && s.kind === 'event');

  return (
    <div className="space-y-3">
      {/* Search */}
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

      {/* Category pills */}
      <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs" role="tablist" aria-label="Event categories">
        {EVENT_CATEGORY_FILTERS.filter(c => c.id === 'all' || c.id === category || categoryCounts[c.id] > 0).map(c => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition text-xs cursor-pointer flex items-center gap-1.5 ${
              category === c.id
                ? 'bg-[#E0533C] text-white shadow-xs'
                : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span aria-hidden="true">{c.emoji}</span>
            <span>{c.label}</span>
            <span className={`text-[10px] ${category === c.id ? 'text-white/80' : 'text-slate-400'}`}>{categoryCounts[c.id]}</span>
          </button>
        ))}
      </div>

      {/* Filter toggle + sort */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 border transition cursor-pointer ${
            showFilters || price !== 'all' || date !== 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
              : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Date & Price{price !== 'all' || date !== 'all' ? ` (${(price !== 'all' ? 1 : 0) + (date !== 'all' ? 1 : 0)})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setSortBy(s => (s === 'date' ? 'price' : 'date'))}
          className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 border bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 cursor-pointer"
          title="Change sort order"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortBy === 'date' ? 'Soonest first' : 'Cheapest first'}</span>
        </button>
      </div>

      {showFilters && (
        <div className="p-3 rounded-2xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
              <span>When</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_DATE_FILTERS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDate(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    date === d.id
                      ? 'bg-[#E0533C] text-white shadow-xs'
                      : 'bg-white dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Price (KES)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_PRICE_FILTERS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrice(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    price === p.id
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'bg-white dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
        <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E0533C]" />
          <span>
            {category === 'all'
              ? 'Upcoming Events'
              : EVENT_CATEGORY_FILTERS.find(c => c.id === category)?.label}
          </span>
        </h4>
        <span className="text-[10px] text-slate-400 font-bold">
          {results.length} {results.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-3">
          {results.slice(0, visible).map(evt => {
            const today = isHappeningToday(evt);
            const saved = isSaved(evt.id);
            return (
              <div
                key={evt.id}
                onClick={() => onOpenEvent(evt)}
                className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex gap-3 shadow-xs cursor-pointer hover:border-[#E0533C] transition group"
              >
                <div
                  className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 bg-cover bg-center shrink-0 relative overflow-hidden"
                  style={evt.img ? { backgroundImage: `url('${evt.img}')` } : undefined}
                >
                  {today && (
                    <span className="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition line-clamp-2">
                        {evt.title}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(evt, 'event');
                        }}
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                          saved
                            ? 'bg-[#E0533C] text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={saved ? 'Remove bookmark' : 'Bookmark this event'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[#E0533C] font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{evt.date}{evt.time ? ` • ${evt.time}` : ''}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate">
                      {getEventPriceLabel(evt)}
                    </span>
                    {evt.source && (
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">via {getSourceLabel(evt.source)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {visible < results.length && (
            <button
              type="button"
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black cursor-pointer hover:opacity-90 transition"
            >
              Show more ({results.length - visible} left)
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
              {events.length === 0
                ? 'Pull the latest from the header refresh icon, or check your connection.'
                : 'Try a different date, price or category.'}
            </p>
          </div>
          {(activeFilterCount > 0 || query) && (
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
