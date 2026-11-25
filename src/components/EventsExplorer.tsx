import React, { useMemo, useState, useEffect } from 'react';
import {
  Search, X, Clock, MapPin, Bookmark, Calendar, Ticket, SlidersHorizontal, ArrowUpDown, Globe,
} from 'lucide-react';
import { EventItem, SavedItem } from '../types.ts';
import CategoryIcon from './CategoryIcon.tsx';
import {
  EVENT_CATEGORY_FILTERS,
  EVENT_DATE_FILTERS,
  EVENT_PRICE_FILTERS,
  eventMatchesCategory,
  filterEvents,
  getEventPriceLabel,
  isHappeningToday,
  isOnlineEvent,
  sortEvents,
  type EventSort,
} from '../utils/eventUtils.ts';
import { pinFeaturedEvents } from '../lib/featuredEvents.ts';

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
  initialCategory = 'all',
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(initialCategory);
  const [price, setPrice] = useState<string>('all');
  const [date, setDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<EventSort>('smart');
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, category, price, date, sortBy]);

  const results = useMemo(() => {
    const filtered = filterEvents(events, { query, category, price, date });
    const sorted = sortEvents(filtered, sortBy);
    return sortBy === 'smart' ? pinFeaturedEvents(sorted) : sorted;
  }, [events, query, category, price, date, sortBy]);

  const activeFilterCount = (price !== 'all' ? 1 : 0) + (date !== 'all' ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setCategory('all');
    setPrice('all');
    setDate('all');
    setSortBy('smart');
  };

  const isSaved = (id: string | number) =>
    savedItems.some((s) => String(s.id) === String(id) && s.kind === 'event');

  return (
    <div className="space-y-4">
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

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 text-xs" role="tablist" aria-label="Event categories">
        {EVENT_CATEGORY_FILTERS.map((c) => {
          const on = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                on
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <CategoryIcon name={c.icon} className="w-3.5 h-3.5 shrink-0" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date / Price / Sort controls */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition cursor-pointer ${
            showFilters || activeFilterCount > 0
              ? 'bg-orange-50 dark:bg-orange-950/40 text-[#E0533C] border-[#E0533C]/40'
              : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Date &amp; Price{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setSortBy((prev) => (prev === 'smart' ? 'date' : prev === 'date' ? 'price' : 'smart'))
          }
          className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer"
          title="Cycle sort order"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#E0533C]" />
          <span>
            {sortBy === 'smart' ? 'Relevance' : sortBy === 'date' ? 'Soonest first' : 'Cheapest first'}
          </span>
        </button>
      </div>

      {showFilters && (
        <div className="p-3 rounded-2xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">When</span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_DATE_FILTERS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDate(d.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    date === d.id
                      ? 'bg-[#E0533C] text-white'
                      : 'bg-white dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price (KES)</span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_PRICE_FILTERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrice(p.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                    price === p.id
                      ? 'bg-[#2D6A4F] text-white'
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

      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
        <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E0533C]" />
          <span>
            {category === 'all'
              ? 'Upcoming Events'
              : EVENT_CATEGORY_FILTERS.find((c) => c.id === category)?.label || 'Events'}
          </span>
        </h4>
        {(query || category !== 'all' || activeFilterCount > 0) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {results.slice(0, visible).map((evt) => {
              const today = isHappeningToday(evt);
              const saved = isSaved(evt.id);
              const online = isOnlineEvent(evt);
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
                      {online ? <Globe className="w-3 h-3 shrink-0 text-sky-500" /> : <MapPin className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{evt.location}</span>
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
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
              {events.length === 0 ? 'Check back soon or refresh your feed.' : 'Try a different category, date or price.'}
            </p>
          </div>
          {(activeFilterCount > 0 || category !== 'all' || query) && (
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
    </div>
  );
};
