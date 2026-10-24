import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, MapPin, Bookmark, Star, SlidersHorizontal, Compass, Trash2, Navigation } from 'lucide-react';
import { SpotItem, SavedItem } from '../types.ts';
import { spotInCategory, getSpotCategoryIds, isAllKey } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent } from '../lib/spotAccents.ts';
import { rankSpots, premiumScore, formatKm, useNearYou } from '../lib/spotRanking.ts';
import { NearYouControl } from './NearYouControl.tsx';
import { resolveSpotBudget, budgetBadge } from '../lib/spotBudget.ts';
import type { LatLng } from '../lib/geo.ts';
import { spotMatchesSearchWithTags } from '../utils/spotTags.ts';

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
}

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
}) => {
  const [query, setQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Areas');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'reviews'>('featured');
  const nearYou = useNearYou();

  // Accent for the whole screen (only when a single category is open)
  const screenAccent = isAllKey(categoryKey) ? getSpotCategoryAccent(null) : getSpotCategoryAccent(categoryKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedNeighborhood, selectedBudget, sortBy, nearYou.active, nearYou.radiusKm, categoryKey]);

  const isSaved = (id: string | number) =>
    savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');

  const filteredSpots = useMemo(() => {
    const effectiveCat = (categoryKey || '').toLowerCase().trim();

    let result = spots.filter(s => {
      // Category match
      if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
        if (!spotInCategory(s, effectiveCat)) return false;
      }

      // Neighborhood match
      if (selectedNeighborhood !== 'All Areas') {
        const sNeigh = (s.neighborhood || '').toLowerCase();
        const target = selectedNeighborhood.toLowerCase();
        if (!sNeigh.includes(target) && !target.includes(sNeigh)) return false;
      }

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

    // 3) Default "Featured": premium / high-end first
    return rankSpots(result);
  }, [spots, categoryKey, selectedNeighborhood, selectedBudget, query, sortBy, nearYou.active, nearYou.origin, nearYou.radiusKm]);

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

        {/* Quick Popular Area Chips */}
        <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto hide-scrollbar text-xs">
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
        </div>
      </div>

      {/* Budget & Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
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
        </div>

        <div className="flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
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
        </div>

        <NearYouControl />

        {(selectedNeighborhood !== 'All Areas' || selectedBudget !== 'all' || query || sortBy !== 'featured') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedNeighborhood('All Areas');
              setSelectedBudget('all');
              setSortBy('featured');
            }}
            className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
        <span>
          {filteredSpots.length} {filteredSpots.length === 1 ? 'place' : 'places'} {nearYou.active ? `within ${nearYou.radiusKm ? nearYou.radiusKm + ' km' : 'range'} of you` : 'available'}
        </span>
      </div>

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
            }}
            className="px-4 py-2 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer"
          >
            Show All Places
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSpots.slice(0, visibleCount).map((spot) => {
            const saved = isSaved(spot.id);
            const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
            const hasReviews = reviewCount > 0;
            const budgetText = budgetBadge(resolveSpotBudget(spot)) || spot.price;
            const catIds = getSpotCategoryIds(spot);
            const accents = (catIds.length ? catIds : [spot.category]).map(c => getSpotCategoryAccent(c));
            const primary = accents[0];
            const dist = (spot as any).distanceKm as number | undefined;

            return (
              <div
                key={String(spot.id)}
                onClick={() => onOpenSpot(spot)}
                className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xs cursor-pointer transition flex flex-col justify-between group"
                style={{ borderTopColor: primary.color, borderTopWidth: 3 }}
              >
                <div>
                  <div
                    className="h-44 rounded-2xl bg-cover bg-center mb-3 relative overflow-hidden bg-slate-200 dark:bg-slate-800"
                    style={{ backgroundImage: `url('${spot.img}')` }}
                  >
                    <div className="absolute top-2.5 left-2.5 right-24 flex flex-wrap gap-1">
                      {accents.slice(0, 2).map(a => (
                        <span
                          key={a.id}
                          className="text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs"
                          style={{ backgroundColor: a.color, color: a.textOn }}
                        >
                          <a.Icon className="w-2.5 h-2.5" />
                          <span className="truncate">{a.label}</span>
                        </span>
                      ))}
                      {accents.length > 2 && (
                        <span className="bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">+{accents.length - 2}</span>
                      )}
                    </div>

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
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate transition">
                        {spot.title}
                      </h4>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>{hasReviews ? spot.rating : 'New'}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" style={{ color: primary.color }} />
                      <span className="truncate">{spot.address || spot.neighborhood}</span>
                    </p>

                    {spot.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {spot.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 truncate">
                    {spot.neighborhood}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition shadow-xs cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: primary.color, color: primary.textOn }}
                    >
                      View Details
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
