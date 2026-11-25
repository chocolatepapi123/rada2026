import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, X, MapPin, Bookmark, Star, Compass, Trash2, Navigation, ChevronDown, Check, LayoutGrid, Wallet, ArrowUpRight } from 'lucide-react';
import { SpotItem, SavedItem } from '../types.ts';
import { spotInCategory, getSpotCategoryIds, isAllKey, resolveSpotCategory, SPOT_CATEGORIES } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentVars } from '../lib/spotAccentTheme.ts';
import { rankSpots, formatKm } from '../lib/spotRanking.ts';
import { resolveSpotBudget, budgetBadge, plainPriceLabel } from '../lib/spotBudget.ts';
import type { LatLng } from '../lib/geo.ts';
import { spotMatchesSearchWithTags } from '../utils/spotTags.ts';
import { useActivePromotions, sortSpotsByCategoryPromotion } from '../lib/promotions.ts';
import { isStockSpotImage } from '../lib/spotsFeed.ts';
import { pickSessionTopTen } from '../lib/topTen.ts';
import { SpotsTop10Carousel } from './SpotsTop10Carousel.tsx';

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
  /** Kept for backwards compatibility; every explorer now uses the same compact 2-column layout. */
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

const BUDGET_TIERS: PillOption[] = [
  { id: 'all', label: 'All budgets', icon: Wallet, color: '#E0533C' },
  { id: 'Low', label: 'Low', icon: Wallet, color: '#2D6A4F' },
  { id: 'Mid', label: 'Mid', icon: Wallet, color: '#D97706' },
  { id: 'High', label: 'High', icon: Wallet, color: '#7C3AED' },
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
  const forDate = categoryTitle === 'Select Venue for Date';
  const [query, setQuery] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [pickedCat, setPickedCat] = useState<string>(isAllKey(categoryKey) ? 'all' : (resolveSpotCategory(categoryKey) || 'all'));
  useEffect(() => { setPickedCat(isAllKey(categoryKey) ? 'all' : (resolveSpotCategory(categoryKey) || 'all')); }, [categoryKey]);
  const showCategoryDropdown = isAllKey(categoryKey);
  const categorySlotPromos = useActivePromotions('spots_category');

  // Accent for the whole screen (only when a single category is open)
  const screenAccent = isAllKey(categoryKey) ? getSpotCategoryAccent(null) : getSpotCategoryAccent(categoryKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedBudget, pickedCat, categoryKey]);

  const isSaved = (id: string | number) =>
    savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');

  const filteredSpots = useMemo(() => {
    const effectiveCat = showCategoryDropdown ? pickedCat : (categoryKey || '').toLowerCase().trim();

    let result = spots.filter(s => {
      if (isStockSpotImage(s.img)) return false;
      // Category match
      if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
        if (!spotInCategory(s, effectiveCat)) return false;
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

    // Default "Featured": premium / high-end first; paid category slots (no labels) go first in admin order
    const featured = rankSpots(result);
    if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
      return sortSpotsByCategoryPromotion(featured, effectiveCat, categorySlotPromos);
    }
    return featured;
  }, [spots, categorySlotPromos, categoryKey, showCategoryDropdown, pickedCat, selectedBudget, query]);

  const effectiveCatId = showCategoryDropdown ? pickedCat : (categoryKey || 'all');
  const topTenSpots = useMemo(
    () => (forDate ? [] : pickSessionTopTen('spots-explorer-top10', filteredSpots, (s) => String(s.id), 10)),
    [forDate, filteredSpots],
  );

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

      {/* Filters: budget dropdown, category (all-spots screens only) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {showCategoryDropdown && (
          <PillDropdown value={pickedCat} options={CATEGORY_OPTIONS} onChange={setPickedCat} menuWidthClass="w-64" />
        )}
        <PillDropdown
          value={selectedBudget}
          options={BUDGET_TIERS}
          onChange={setSelectedBudget}
          caption="Budget"
          menuWidthClass="w-48"
        />

        {(selectedBudget !== 'all' || query || (showCategoryDropdown && pickedCat !== 'all')) && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedBudget('all');
              if (showCategoryDropdown) setPickedCat('all');
            }}
            className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* RADA TOP 10 this week */}
      {!forDate && topTenSpots.length > 0 && (
        <SpotsTop10Carousel
          spots={topTenSpots}
          savedItems={savedItems}
          onToggleSave={onToggleSave}
          onVisitSpot={onOpenSpot}
          subtitle={!isAllKey(effectiveCatId) ? getSpotCategoryAccent(effectiveCatId).label : undefined}
        />
      )}

      {/* Spots Grid */}
      {filteredSpots.length === 0 ? (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Compass className="w-8 h-8 mx-auto" style={{ color: screenAccent.color }} />
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No spots found matching your search</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Try adjusting your search or clearing the budget filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedBudget('all');
              if (showCategoryDropdown) setPickedCat('all');
            }}
            className="px-4 py-2 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer"
          >
            Show All Places
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: screenAccent.color }} />
              <span>All Spots ({filteredSpots.length})</span>
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredSpots.slice(0, visibleCount).map((spot) => {
              const saved = isSaved(spot.id);
              const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
              const hasReviews = reviewCount > 0 && Boolean(spot.rating);
              const budgetText = budgetBadge(resolveSpotBudget(spot)) || plainPriceLabel(spot.price);
              const catIds = getSpotCategoryIds(spot);
              const primary = getSpotCategoryAccent(catIds[0] || spot.category);
              const dist = (spot as any).distanceKm as number | undefined;
              const coverImg = (spot.images && spot.images[0]) || spot.img;
              const locationLine = [spot.neighborhood, spot.address?.split(',')[0]].filter(Boolean).join(' · ') || 'Nairobi';
              const shortDesc = spot.description?.trim() || `${primary.label} spot in ${spot.neighborhood || 'Nairobi'}.`;

              return (
                <article
                  key={String(spot.id)}
                  onClick={() => onOpenSpot(spot)}
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-[#E0533C] transition flex flex-col justify-between group min-w-0 rounded-2xl p-2"
                  style={accentVars(primary)}
                >
                  <div>
                    <div className="aspect-video w-full rounded-xl mb-2 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                      {coverImg && (
                        <img
                          src={coverImg}
                          alt={spot.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 pointer-events-none" />

                      {/* Admin Delete shortcut */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSpot?.(spot);
                          }}
                          className="absolute top-2 right-10 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center transition shadow-xs z-10 cursor-pointer"
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
                        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>

                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                        {dist != null ? (
                          <span className="bg-[#2D6A4F]/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Navigation className="w-2.5 h-2.5" /> {formatKm(dist)}
                          </span>
                        ) : (
                          <span />
                        )}
                        {hasReviews && (
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {spot.rating}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 px-0.5">
                      <h4 className="font-black text-slate-900 dark:text-slate-100 truncate transition max-w-full text-[13px] group-hover:text-[#E0533C]">
                        {spot.title}
                      </h4>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate font-medium">
                        <MapPin className="w-3 h-3 shrink-0 text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]" />
                        <span className="truncate">{locationLine}</span>
                      </p>

                      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
                        {shortDesc}
                      </p>

                      <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px] font-bold">
                        <span className="inline-flex items-center gap-1 text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)] truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primary.color }} />
                          <span className="truncate">{primary.label}</span>
                        </span>
                        {budgetText && (
                          <span className="text-slate-600 dark:text-slate-300 shrink-0 tabular-nums">
                            {budgetText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800/80 mt-2 pt-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 w-full">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSpot?.(spot);
                          }}
                          className="px-2 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Delete Spot (Admin)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSpot(spot);
                        }}
                        className="w-full px-2 py-2 rounded-xl text-[11px] font-black transition shadow-xs cursor-pointer hover:opacity-90 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)] flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        <span>{forDate ? 'Pick venue' : 'Visit / View Details'}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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
            Load more
          </button>
        </div>
      )}
    </div>
  );
};
