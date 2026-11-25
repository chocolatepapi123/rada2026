import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, X, MapPin, Bookmark, Star, Compass, Trash2, Navigation, ChevronDown, Check, LayoutGrid, Wallet, ArrowUpRight,
} from 'lucide-react';
import { SpotItem, SavedItem } from '../types.ts';
import { spotInCategory, getSpotCategoryIds, isAllKey, resolveSpotCategory, SPOT_CATEGORIES } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentVars } from '../lib/spotAccentTheme.ts';
import { rankSpots, formatKm } from '../lib/spotRanking.ts';
import { resolveSpotBudget, budgetBadge, plainPriceLabel } from '../lib/spotBudget.ts';
import type { LatLng } from '../lib/geo.ts';
import { spotMatchesSearchWithTags } from '../utils/spotTags.ts';
import { useActivePromotions, sortSpotsByCategoryPromotion } from '../lib/promotions.ts';
import { isStockSpotImage, formatOpeningHours } from '../lib/spotsFeed.ts';
import { pickSessionTopTen, getCurrentWeekRangeLabel } from '../lib/topTen.ts';
import { SingleSlideCarousel } from './SingleSlideCarousel.tsx';
import { SpotCategoryBadge, SpotCategoryTile } from './SpotCategoryBadge.tsx';

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

interface PillOption { id: string; label: string; icon?: LucideIcon; color?: string; categoryId?: string }

/** Rounded dropdown that matches RADA's pills and S05 category icon tiles. */
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
        className={`flex items-center gap-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border rounded-full px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition whitespace-nowrap ${
          active ? 'border-[#E0533C]/60 text-[#E0533C]' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {caption && <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{caption}</span>}
        {current.categoryId ? (
          <SpotCategoryTile category={current.categoryId} size="xs" />
        ) : (
          CurIcon && <CurIcon className="w-3.5 h-3.5 shrink-0" style={{ color: current.color || '#E0533C' }} />
        )}
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
                {o.categoryId ? (
                  <SpotCategoryTile category={o.categoryId} size="md" />
                ) : Icon ? (
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${o.color || '#E0533C'}1F` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: o.color || '#E0533C' }} />
                  </span>
                ) : null}
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
  ...SPOT_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon, color: c.color, categoryId: c.id })),
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

  const screenAccent = isAllKey(categoryKey) ? getSpotCategoryAccent(null) : getSpotCategoryAccent(categoryKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedBudget, pickedCat, categoryKey]);

  const isSaved = (id: string | number) =>
    savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');

  const effectiveCat = showCategoryDropdown ? pickedCat : (categoryKey || '').toLowerCase().trim();

  // Top 10 reflects category + search (independent of budget filter placed below Top 10)
  const categoryMatchedSpots = useMemo(() => {
    const result = spots.filter(s => {
      if (isStockSpotImage(s.img)) return false;
      if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
        if (!spotInCategory(s, effectiveCat)) return false;
      }
      if (query.trim()) {
        if (!spotMatchesSearchWithTags(s, query)) return false;
      }
      return true;
    });
    const featured = rankSpots(result);
    if (effectiveCat && !isAllKey(effectiveCat) && effectiveCat !== 'spots') {
      return sortSpotsByCategoryPromotion(featured, effectiveCat, categorySlotPromos);
    }
    return featured;
  }, [spots, categorySlotPromos, effectiveCat, query]);

  const filteredSpots = useMemo(() => {
    if (selectedBudget === 'all') return categoryMatchedSpots;
    return categoryMatchedSpots.filter(s => resolveSpotBudget(s) === selectedBudget);
  }, [categoryMatchedSpots, selectedBudget]);

  const weekLabel = useMemo(() => getCurrentWeekRangeLabel(), []);
  const topTenSpots = useMemo(() => {
    if (forDate || categoryMatchedSpots.length === 0) return [];
    const scopeKey = effectiveCat && !isAllKey(effectiveCat) ? effectiveCat : 'all';
    return pickSessionTopTen(`spots-cat-${scopeKey}`, categoryMatchedSpots, (s) => String(s.id), 10);
  }, [forDate, effectiveCat, categoryMatchedSpots]);

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

      {/* RADA PULSE TOP 10 Banner + Single-Card Swipe Carousel */}
      {!forDate && topTenSpots.length > 0 && (
        <section className="space-y-2.5" aria-label="RADA PULSE Top 10 this week">
          {/* Clear RADA PULSE Logo Banner */}
          <div className="rounded-2xl px-3.5 py-2.5 bg-gradient-to-r from-[#E05328] via-[#E0533C] to-[#EE8A47] text-white shadow-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white/95 rounded-xl px-2.5 py-1 shadow-xs shrink-0 flex items-center">
                <img
                  src="/assets/aistudio/RADAPULSE_Logo_Transparent_9a9a4145.png"
                  alt="RADA PULSE"
                  className="h-5 w-auto object-contain"
                />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="block text-xs font-black tracking-wider uppercase whitespace-nowrap">
                  TOP 10
                </span>
                {effectiveCat && !isAllKey(effectiveCat) && (
                  <span className="block text-[10px] font-bold text-white/85 truncate">
                    {screenAccent.label}
                  </span>
                )}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-xs text-[10px] font-extrabold tracking-tight text-white tabular-nums whitespace-nowrap shrink-0">
              {weekLabel}
            </span>
          </div>

          <SingleSlideCarousel ariaLabel="RADA PULSE Top 10 spots carousel">
            {topTenSpots.map((spot, idx) => {
              const rank = idx + 1;
              const saved = isSaved(spot.id);
              const coverImg = (spot.images && spot.images[0]) || spot.img;
              const catIds = getSpotCategoryIds(spot);
              const primaryCatId = catIds[0] || spot.category;
              const primary = getSpotCategoryAccent(primaryCatId);
              const locationLine =
                [spot.neighborhood, spot.address?.split(',')[0]].filter(Boolean).join(' · ') || 'Nairobi';
              const shortDesc =
                spot.description?.trim() || spot.exactLocationTag || `${primary.label} spot in ${spot.neighborhood || 'Nairobi'}.`;
              const dist = (spot as any).distanceKm as number | undefined;
              const budgetText = budgetBadge(resolveSpotBudget(spot)) || plainPriceLabel(spot.price);
              const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
              const hasRating = Boolean(spot.rating) && reviewCount > 0;
              const hoursText = typeof spot.openingHours === 'string'
                ? spot.openingHours
                : formatOpeningHours(spot.openingHours as any);

              return (
                <article
                  key={`top10-spot-${spot.id}`}
                  onClick={() => onOpenSpot(spot)}
                  style={accentVars(primary)}
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs cursor-pointer hover:border-[#E0533C] transition group"
                >
                  {/* Landscape 16:9 image */}
                  <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={spot.title}
                        loading={idx < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 dark:from-slate-800 dark:to-slate-900">
                        <Compass className="w-10 h-10 text-[#E0533C]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20 pointer-events-none" />

                    {/* Ranking badge #1 through #10 */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-[#E0533C] text-white text-xs font-black shadow-md tabular-nums">
                      #{rank}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.(spot, 'spot');
                      }}
                      aria-label={saved ? 'Remove from saved' : 'Save spot'}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                        saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                    </button>

                    {dist != null && (
                      <span className="absolute bottom-3 left-3 bg-[#2D6A4F]/95 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> {formatKm(dist)}
                      </span>
                    )}
                  </div>

                  {/* Small relevant info + compact Visit button on bottom right */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-[15px] leading-snug text-slate-900 dark:text-slate-100 truncate group-hover:text-[#E0533C] transition">
                          {spot.title}
                        </h4>
                        {hasRating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-lg shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>{spot.rating}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-[#E0533C]" />
                        <span className="truncate">{locationLine}</span>
                        {hoursText && (
                          <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                            · {hoursText}
                          </span>
                        )}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {shortDesc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <SpotCategoryBadge category={primaryCatId} size="xs" />
                        {budgetText && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 shrink-0">
                            {budgetText}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSpot(spot);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#E0533C] hover:bg-orange-700 text-white text-[11px] font-black transition inline-flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                      >
                        <span>Visit</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </SingleSlideCarousel>
        </section>
      )}

      {/* Budget Filter placed AFTER RADA TOP 10 */}
      <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
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

      {/* 2-Column Spots Catalogue with small relevant info */}
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
        <div className="grid grid-cols-2 gap-2.5">
          {filteredSpots.slice(0, visibleCount).map((spot) => {
            const saved = isSaved(spot.id);
            const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
            const hasReviews = reviewCount > 0 && Boolean(spot.rating);
            const budgetText = budgetBadge(resolveSpotBudget(spot)) || plainPriceLabel(spot.price);
            const catIds = getSpotCategoryIds(spot);
            const primaryCatId = catIds[0] || spot.category;
            const primary = getSpotCategoryAccent(primaryCatId);
            const dist = (spot as any).distanceKm as number | undefined;
            const snippet = spot.exactLocationTag || spot.description?.trim() || '';

            return (
              <div
                key={String(spot.id)}
                onClick={() => onOpenSpot(spot)}
                className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition flex flex-col justify-between group min-w-0 rounded-2xl p-2"
                style={accentVars(primary)}
              >
                <div>
                  <div
                    className="h-28 rounded-xl mb-2 bg-cover bg-center relative overflow-hidden bg-slate-200 dark:bg-slate-800"
                    style={{ backgroundImage: `url('${spot.img}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

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

                    {dist != null && (
                      <span className="absolute bottom-2 left-2 bg-[#2D6A4F]/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" /> {formatKm(dist)}
                      </span>
                    )}

                    {budgetText && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        {budgetText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 truncate transition max-w-full text-[13px] group-hover:text-[#E0533C]">
                      {spot.title}
                    </h4>
                    {hasReviews && (
                      <div className="flex items-center gap-0.5 text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>{spot.rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-1">
                    <SpotCategoryBadge category={primaryCatId} size="xs" />
                  </div>

                  <p className="text-[11px] text-[#475569] dark:text-slate-300 mt-1 flex items-center gap-1 truncate font-medium">
                    <MapPin className="w-3 h-3 shrink-0 text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]" />
                    <span className="truncate">{spot.neighborhood || spot.address || 'Nairobi'}</span>
                  </p>

                  {snippet && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                      {snippet}
                    </p>
                  )}
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
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpot(spot);
                      }}
                      className="w-full px-2 py-1.5 rounded-xl text-[11px] font-black transition shadow-xs cursor-pointer hover:opacity-90 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)]"
                    >
                      {forDate ? 'Pick venue' : 'View Details'}
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
            Load more
          </button>
        </div>
      )}
    </div>
  );
};
