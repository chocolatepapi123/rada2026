import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, X, MapPin, Bookmark, Star, SlidersHorizontal, Compass, Trash2, Navigation, ChevronDown, Check, LayoutGrid } from 'lucide-react';
import { SpotItem, SavedItem } from '../types.ts';
import { spotInCategory, getSpotCategoryIds, isAllKey, resolveSpotCategory, SPOT_CATEGORIES } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentVars } from '../lib/spotAccentTheme.ts';
import { rankSpots, premiumScore, formatKm, useNearYou } from '../lib/spotRanking.ts';
import { NearYouControl } from './NearYouControl.tsx';
import { resolveSpotBudget, budgetBadge } from '../lib/spotBudget.ts';
import type { LatLng } from '../lib/geo.ts';
import { spotMatchesSearchWithTags } from '../utils/spotTags.ts';
import { spotMatchesArea } from '../lib/spotsFeed.ts';
import { useActivePromotions, sortSpotsByCategoryPromotion } from '../lib/promotions.ts';

interface SpotsExplorerProps {
  categoryKey?: string | null;
  categoryTitle?: string | null;
  spots: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot') => void;
  onOpenSpot: (spot: SpotItem) => void;
  userCoords?: LatLng | null;
  isAdmin?: boolean;
  onDeleteSpot?: (spot: SpotItem) => void;
  /** 'picker' = compact venue chooser (no area chips, no count, category dropdown, two cards per row). */
  variant?: 'default' | 'picker';
}

interface PillOption { id: string; label: string; icon?: LucideIcon; color?: string }

/** Rounded dropdown that matches RADA's pills and cards (replaces the plain browser select). */
const PillDropdown: React.FC<{
  value: string;
  options: PillOption[];
  onChange: (id: string) => void;
  caption?: string;
  menuWidthClass?: string;
}> = ({ value, options, onChange, caption, menuWidthClass = 'w-60' }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.id === value) || options[0];
  const active = value !== options[0].id;
  const CurIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border rounded-xl px-2.5 py-1.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition ${
          active ? 'border-[#E0533C]/60' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {caption && <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{caption}</span>}
        {CurIcon && <CurIcon className="w-3.5 h-3.5 shrink-0" style={{ color: current.color || '#E0533C' }} />}
        <span className="truncate max-w-[9.5rem]">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute left-0 top-full mt-2 z-30 ${menuWidthClass} max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {options.map(o => {
            const Icon = o.icon;
            const selected = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left cursor-pointer transition ${
                  selected ? 'bg-[#E0533C]/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {Icon && (
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${o.color || '#E0533C'}1F` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: o.color || '#E0533C' }} />
                  </span>
                )}
                <span className={`flex-1 text-[12px] truncate ${selected ? 'font-black text-[#E0533C]' : 'font-bold text-slate-700 dark:text-slate-200'}`}>{o.label}</span>
                {selected && <Check className="w-4 h-4 text-[#E0533C] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CATEGORY_OPTIONS: PillOption[] = [
  { id: 'all', label: 'All categories', icon: LayoutGrid, color: '#E0533C' },
  ...SPOT_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon, color: c.color })),
];

const NAIROBI_NEIGHBORHOODS = [
  'All Areas',
  'Westlands',
  'Kilimani',
  'Kileleshwa',
  'Lavington',
  'Karen',
  'CBD',
  'Gigiri',
  'Parklands',
  'Ngong Road',
  'Langata',
  'South B',
  'South C',
  'Ruaka',
  'Thika Road'
];

const BUDGET_TIERS = [
  { id: 'all', label: 'All Budgets' },
  { id: 'Low', label: 'Budget ($)' },
  { id: 'Mid', label: 'Mid ($$)' },
  { id: 'High', label: 'Luxury ($$$)' },
];

const PAGE_SIZE = 18;

export const SpotsExplorer: React.FC<SpotsExplorerProps> = ({
  categoryKey = 'all',
  categoryTitle = 'Venues & Hangouts',
  spots,
  savedItems = [],
  onToggleSave,
  onOpenSpot,
  userCoords = null,
  isAdmin = false,
  onDeleteSpot,
  variant = 'default',
}) => {
  // The Plan a Date screen opens this explorer with the title below, so it gets the compact picker layout automatically.
  const picker = variant === 'picker' || categoryTitle === 'Select Venue for Date';
  const [query, setQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Areas');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'reviews'>('featured');
  const [pickedCat, setPickedCat] = useState<string>(isAllKey(categoryKey) ? 'all' : (resolveSpotCategory(categoryKey) || 'all'));
  const nearYou = useNearYou();
  const categorySlotPromos = useActivePromotions('spots_category');

  // Accent for the whole screen (only when a single category is open)
  const screenAccent = isAllKey(categoryKey) ? getSpotCategoryAccent(null) : getSpotCategoryAccent(categoryKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedNeighborhood, selectedBudget, sortBy, pickedCat, nearYou.active, nearYou.radiusKm, categoryKey]);

  const isSaved = (id: string | number) =>
    savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');

  const filteredSpots = useMemo(() => {
    const effectiveCat = picker ? (pickedCat === 'all' ? 'all' : pickedCat) : (categoryKey || '').toLowerCase().trim();

    let result = spots.filter(s => {
      // Category match
      if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
        if (!spotInCategory(s, effectiveCat)) return false;
      }

      // Neighborhood match
      if (!spotMatchesArea(s, selectedNeighborhood)) return false;

      // Budget filter
      if (selectedBudget !== 'all') {
        const b = resolveSpotBudget(s);
        if (b !== selectedBudget) return false;
      }

      // Natural query search with automatic hidden in-app tags
      if (query.trim()) {
        if (!spotMatchesSearchWithTags(s, query)) return false;
      }

      return true;
    });

    // 1) Near You (GPS) wins: nearest first, inside the chosen radius
    if (nearYou.active && nearYou.origin) {
      return rankSpots(result, { nearYou: true, origin: nearYou.origin, radiusKm: nearYou.radiusKm });
    }

    // 2) Explicit sorts
    if (sortBy === 'rating') {
      return [...result].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || premiumScore(b) - premiumScore(a));
    }
    if (sortBy === 'reviews') {
      return [...result].sort((a, b) => {
        const cA = a.reviews?.length ?? (a.reviewCount || 0);
        const cB = b.reviews?.length ?? (b.reviewCount || 0);
        return cB - cA || premiumScore(b) - premiumScore(a);
      });
    }

    // 3) Default "Featured": premium / high-end first; paid category slots (no labels) go first in admin order
    const featured = rankSpots(result);
    if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
      return sortSpotsByCategoryPromotion(featured, effectiveCat, categorySlotPromos);
    }
    return featured;
  }, [spots, categorySlotPromos, categoryKey, picker, pickedCat, selectedNeighborhood, selectedBudget, query, sortBy, nearYou.active, nearYou.origin, nearYou.radiusKm]);

  return (
    <div className="space-y-4">
      {/* Category accent strip (single-category screens) */}
      {!isAllKey(categoryKey) && (
        <div className="h-1 rounded-full" style={{ background: screenAccent.gradient }} />
      )}

      {/* Search Input with hidden in-app tag matching */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${(categoryTitle || 'places').toLowerCase()}, food, vibes...`}
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

      {/* Searchbox for Exact Location */}
      <div className="space-y-1.5">
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#E0533C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={selectedNeighborhood === 'All Areas' ? '' : selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value.trim() ? e.target.value : 'All Areas')}
            placeholder="Search exact location or area (e.g. Westlands, Kilimani, Karen)..."
            className="w-full pl-8 pr-8 py-2 rounded-xl text-xs font-semibold bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#E0533C]"
          />
          {selectedNeighborhood !== 'All Areas' && (
            <button
              type="button"
              onClick={() => setSelectedNeighborhood('All Areas')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              title="Reset location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Popular Area Chips (hidden in the venue picker) */}
        {!picker && <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar text-xs">
          {NAIROBI_NEIGHBORHOODS.slice(0, 8).map(area => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedNeighborhood(selectedNeighborhood === area ? 'All Areas' : area)}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-[11px] ${
                selectedNeighborhood.toLowerCase() === area.toLowerCase()
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {area}
            </button>
          ))}
        </div>}
      </div>

      {/* Budget & Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {picker && (
          <PillDropdown value={pickedCat} options={CATEGORY_OPTIONS} onChange={setPickedCat} menuWidthClass="w-64" />
        )}
        {picker && (
          <PillDropdown
            value={selectedBudget}
            options={BUDGET_TIERS}
            onChange={setSelectedBudget}
            caption="Budget"
            menuWidthClass="w-44"
          />
        )}
        {!picker && <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Budget</span>
          <select
            value={selectedBudget}
            onChange={(e) => setSelectedBudget(e.target.value)}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {BUDGET_TIERS.map(b => (
              <option key={b.id} value={b.id} className="bg-white dark:bg-[#1C1A1E]">
                {b.label}
              </option>
            ))}
          </select>
        </div>}

        {!picker && <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="featured" className="bg-white dark:bg-[#1C1A1E]">Featured</option>
            <option value="rating" className="bg-white dark:bg-[#1C1A1E]">Top Rated</option>
            <option value="reviews" className="bg-white dark:bg-[#1C1A1E]">Most Popular</option>
          </select>
        </div>}

        <NearYouControl />

        {(selectedNeighborhood !== 'All Areas' || selectedBudget !== 'all' || query || sortBy !== 'featured' || (picker && pickedCat !== 'all')) && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedNeighborhood('All Areas');
              setSelectedBudget('all');
              setSortBy('featured');
              if (picker) setPickedCat('all');
            }}
            className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Results Header */}
      {!picker && <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
        <span>
          {filteredSpots.length} {filteredSpots.length === 1 ? 'place' : 'places'} {nearYou.active ? `within ${nearYou.radiusKm ? nearYou.radiusKm + ' km' : 'range'} of you` : 'available'}
        </span>
      </div>}

      {/* Spots Grid */}
      {filteredSpots.length === 0 ? (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Compass className="w-8 h-8 mx-auto" style={{ color: screenAccent.color }} />
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No spots found matching your search</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {nearYou.active
              ? 'Nothing in this radius. Try a wider distance or switch off Near You.'
              : 'Try adjusting your search terms or clearing neighborhood/budget filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedNeighborhood('All Areas');
              setSelectedBudget('all');
              setSortBy('featured');
              if (picker) setPickedCat('all');
            }}
            className="px-4 py-2 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer"
          >
            Show All Places
          </button>
        </div>
      ) : (
        <div className={picker ? 'grid grid-cols-2 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'}>
          {filteredSpots.slice(0, visibleCount).map((spot) => {
            const saved = isSaved(spot.id);
            const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
            const hasReviews = reviewCount > 0;
            const budgetText = budgetBadge(resolveSpotBudget(spot)) || spot.price;
            const catIds = getSpotCategoryIds(spot);
            const primary = getSpotCategoryAccent(catIds[0] || spot.category);
            const dist = (spot as any).distanceKm as number | undefined;

            return (
              <div
                key={String(spot.id)}
                onClick={() => onOpenSpot(spot)}
                className={`bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition flex flex-col justify-between group min-w-0 ${picker ? 'rounded-2xl p-2' : 'rounded-3xl p-3'}`}
                style={accentVars(primary)}
              >
                <div>
                  <div
                    className={`${picker ? 'h-28 rounded-xl mb-2' : 'h-44 rounded-2xl mb-3'} bg-cover bg-center relative overflow-hidden bg-slate-200 dark:bg-slate-800`}
                    style={{ backgroundImage: `url('${spot.img}')` }}
                  >
                    {/* Admin Delete shortcut */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSpot?.(spot);
                        }}
                        className="absolute top-2.5 right-11 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center transition shadow-xs z-10 cursor-pointer hover:scale-105 active:scale-95"
                        title="Delete Spot (Admin)"
                        aria-label={`Delete ${spot.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.(spot, 'spot');
                      }}
                      className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs z-10 ${
                        saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={saved ? 'Remove from saved' : 'Save experience'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                    </button>

                    {dist != null && (
                      <span className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5" /> {formatKm(dist)}
                      </span>
                    )}

                    <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                      {budgetText}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className={picker ? 'flex flex-col items-start gap-1' : 'flex items-center justify-between gap-1'}>
                      <h4 className={`font-black text-slate-900 dark:text-slate-100 truncate transition max-w-full ${picker ? 'text-[13px]' : 'text-sm'}`}>
                        {spot.title}
                      </h4>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>{hasReviews ? spot.rating : 'New'}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0 text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]" />
                      <span className="truncate">{spot.address || spot.neighborhood}</span>
                    </p>

                    {!picker && spot.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {spot.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`border-t border-slate-200 dark:border-slate-800/80 ${picker ? 'mt-2 pt-2 flex flex-col gap-1.5' : 'mt-3 pt-2.5 flex items-center justify-between gap-1.5'}`}>
                  <span className={`text-[11px] font-bold text-slate-500 truncate ${picker ? 'hidden' : ''}`}>
                    {spot.neighborhood}
                  </span>
                  <div className={`flex items-center gap-1.5 ${picker ? 'w-full' : 'shrink-0'}`}>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSpot?.(spot);
                        }}
                        className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Delete Spot (Admin)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpot(spot);
                      }}
                      className={`${picker ? 'w-full px-2 py-2' : 'px-3 py-1.5'} rounded-xl text-[11px] font-bold transition shadow-xs cursor-pointer hover:opacity-90 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)]`}
                    >
                      {picker ? 'Pick venue' : 'View Details'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredSpots.length && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
          >
            Load More Places ({filteredSpots.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
