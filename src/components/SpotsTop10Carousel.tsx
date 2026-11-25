import React, { useMemo } from 'react';
import { MapPin, ArrowUpRight, Bookmark, Star, Navigation, Calendar } from 'lucide-react';
import type { SpotItem, SavedItem } from '../types.ts';
import { getWeekDateRangeLabel } from '../lib/topTen.ts';
import { getSpotCategoryIds } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentVars } from '../lib/spotAccentTheme.ts';
import { resolveSpotBudget, budgetBadge, plainPriceLabel } from '../lib/spotBudget.ts';
import { formatKm } from '../lib/spotRanking.ts';

interface SpotsTop10CarouselProps {
  spots: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot') => void;
  onVisitSpot: (spot: SpotItem) => void;
  subtitle?: string;
}

export const SpotsTop10Carousel: React.FC<SpotsTop10CarouselProps> = ({
  spots,
  savedItems = [],
  onToggleSave,
  onVisitSpot,
  subtitle,
}) => {
  const weekRange = useMemo(() => getWeekDateRangeLabel(), []);
  const isSaved = (id: string | number) =>
    savedItems.some((s) => String(s.id) === String(id) && s.kind === 'spot');

  if (!spots.length) return null;

  return (
    <section className="space-y-3" aria-label="RADA TOP 10 this week">
      {/* Header: RADA Logo + TOP 10 this week + Week Start/End Dates */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#E0533C] text-white flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img
              src="/rada-mark.png"
              alt="RADA"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black tracking-tight text-[#E0533C]">RADA</span>
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                TOP 10 this week
              </h3>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
              <Calendar className="w-3 h-3 text-[#E0533C] shrink-0" />
              <span>{weekRange.label}</span>
              {subtitle && <span className="text-slate-400 dark:text-slate-500">· {subtitle}</span>}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
          1–{spots.length}
        </span>
      </div>

      {/* Swipeable 10-slide Carousel (90-95% width on mobile so next slide peeks) */}
      <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2">
        {spots.map((spot, idx) => {
          const rank = idx + 1;
          const saved = isSaved(spot.id);
          const catIds = getSpotCategoryIds(spot);
          const accent = getSpotCategoryAccent(catIds[0] || spot.category);
          const coverImg = (spot.images && spot.images[0]) || spot.img;
          const budgetText = budgetBadge(resolveSpotBudget(spot)) || plainPriceLabel(spot.price);
          const dist = (spot as any).distanceKm as number | undefined;
          const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
          const hasRating = reviewCount > 0 && spot.rating;
          const locationLine = [spot.neighborhood, spot.address?.split(',')[0]].filter(Boolean).join(' · ') || 'Nairobi';
          const shortDesc =
            spot.description?.trim() ||
            `${accent.label} spot in ${spot.neighborhood || 'Nairobi'}.`;

          return (
            <article
              key={`top10-spot-${String(spot.id)}`}
              onClick={() => onVisitSpot(spot)}
              style={accentVars(accent)}
              className="w-[92%] sm:w-[68%] lg:w-[46%] snap-start shrink-0 bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-[#E0533C] transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Strict 16:9 landscape cover */}
                <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {coverImg && (
                    <img
                      src={coverImg}
                      alt={spot.title}
                      loading={idx < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25 pointer-events-none" />

                  {/* Ranking badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2.5 rounded-xl bg-[#E0533C] text-white text-xs font-black shadow-md tracking-tight">
                      #{rank}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                      {accent.label}
                    </span>
                  </div>

                  {/* Save button */}
                  {onToggleSave && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(spot, 'spot');
                      }}
                      aria-label={saved ? 'Remove from saved' : 'Save spot'}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                        saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                    </button>
                  )}

                  {/* Bottom overlay info */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-white">
                    <div className="flex items-center gap-2 min-w-0 text-[11px] font-bold">
                      {dist != null && (
                        <span className="inline-flex items-center gap-1 bg-[#2D6A4F]/95 px-2 py-0.5 rounded-lg shrink-0">
                          <Navigation className="w-3 h-3" />
                          {formatKm(dist)}
                        </span>
                      )}
                      {hasRating && (
                        <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {spot.rating}
                        </span>
                      )}
                    </div>
                    {budgetText && (
                      <span className="px-2 py-0.5 rounded-lg bg-black/65 backdrop-blur-xs text-[10px] font-black shrink-0">
                        {budgetText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 pb-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-black text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-[#E0533C] transition">
                      {spot.title}
                    </h4>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E0533C]" />
                    <span className="truncate">{locationLine}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {shortDesc}
                  </p>
                </div>
              </div>

              {/* Footer Visit CTA */}
              <div className="px-3.5 pb-3.5 pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {budgetText ? `Avg. budget · ${budgetText}` : accent.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisitSpot(spot);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E0533C] hover:bg-orange-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <span>Visit</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
