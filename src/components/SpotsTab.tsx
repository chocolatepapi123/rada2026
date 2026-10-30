import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Music,
  Coffee,
  Heart,
  Hotel,
  Palmtree,
  SlidersHorizontal,
  Plus,
  Compass,
  Bookmark,
  Trees,
  ArrowRight,
  Sparkles,
  Palette,
  Gamepad2,
  Camera,
  Image as ImageIcon,
  Building2,
  X,
  Dumbbell,
  Trash2,
  Navigation
} from 'lucide-react';

import { SpotItem, MenuItem, SavedItem, Review } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { supabase } from '../lib/supabase.ts';
import { LocationCombobox } from './LocationCombobox.tsx';
import { deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { resolveSpotBudget, budgetBadge } from '../lib/spotBudget.ts';
import { useUnclaimedSpots, spotInCategory, mergeSpots, evictUnclaimedSpot, spotMatchesArea } from '../lib/spotsFeed.ts';
import { SPOT_CATEGORIES, getSpotCategoryIds } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentPillStyle, accentVars } from '../lib/spotAccentTheme.ts';
import { rankSpots, useNearYou, formatKm } from '../lib/spotRanking.ts';
import { NearYouControl } from './NearYouControl.tsx';
import { spotMatchesSearchWithTags } from '../utils/spotTags.ts';
import { AdminConfirmModal } from './AdminConfirmModal.tsx';
import { deleteListing } from '../lib/cloudSync.ts';
import { useActivePromotions, sortSpotsByCategoryPromotion } from '../lib/promotions.ts';

interface SpotsTabProps {
  spots: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpotFullView: (spot: SpotItem) => void;
  onViewLocation: (spot: SpotItem) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateSpot?: (initialTitle?: string) => void;
  onOpenSuggestSpot?: () => void;
  onPostReview?: (spotId: number, review: Review) => void;
  onNavigateToCalendar?: (dateStr?: string, eventId?: number | string) => void;
  showToast?: (msg: string, options?: ToastOptions) => void;
  isAdmin?: boolean;
  onDeleteSpot?: (spot: SpotItem) => Promise<void> | void;
}

// Persistent filter state across unmounts and calendar/modal navigations
let cachedSpotsFilters = {
  searchQuery: '',
  selectedCategory: 'all',
  selectedNeighborhood: 'all',
  selectedPriceTier: 'all'
};

let cachedSpotsScrollY = 0;

export const SpotsTab: React.FC<SpotsTabProps> = ({
  spots,
  savedItems = [],
  onToggleSave,
  onOpenSpotFullView,
  onViewLocation,
  onOpenDedicatedViewAll,
  onOpenCreateSpot,
  onOpenSuggestSpot,
  onPostReview,
  onNavigateToCalendar,
  showToast,
  isAdmin = false,
  onDeleteSpot
}) => {
  const [searchQuery, setSearchQuery] = useState(cachedSpotsFilters.searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(cachedSpotsFilters.selectedCategory);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(cachedSpotsFilters.selectedNeighborhood);
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>(cachedSpotsFilters.selectedPriceTier);
  const [activeImageIndices, setActiveImageIndices] = useState<Record<number, number>>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'all' | '4.5' | '4.0' | 'reviewed'>('all');
  const [onlySpecialOffers, setOnlySpecialOffers] = useState(false);
  const near = useNearYou();

  // Admin Spot Deletion state
  const [spotToDelete, setSpotToDelete] = useState<SpotItem | null>(null);

  const handleConfirmDeleteSpot = async (spot: SpotItem) => {
    try {
      if (onDeleteSpot) {
        await onDeleteSpot(spot);
      } else {
        if (supabase) {
          const rawId = String(spot.id);
          const cleanId = rawId.replace('unclaimed-', '').replace('scraped-', '');
          try {
            await supabase.from('unclaimedspots').delete().or(`id.eq.${cleanId},id.eq.${rawId}`);
          } catch (_) {}
          if (spot.title) {
            try {
              await supabase.from('unclaimedspots').delete().eq('name', spot.title);
            } catch (_) {}
          }
          try {
            await deleteListing('spot', spot.id);
          } catch (_) {}
        }
      }

      setDbSpots(prev => prev.filter(s => String(s.id) !== String(spot.id) && (!spot.title || (s.title || '').trim().toLowerCase() !== spot.title.trim().toLowerCase())));
      evictUnclaimedSpot(spot.id, spot.title);
      showToast?.(`"${spot.title}" was permanently deleted.`, { type: 'success' });
      setSpotToDelete(null);
    } catch (err: any) {
      console.error('Delete spot error:', err);
      showToast?.(err?.message || 'Failed to delete spot.', { type: 'error' });
    }
  };

  // Sync back to cache so filters are never lost when viewing details or calendar
  useEffect(() => {
    cachedSpotsFilters.searchQuery = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    cachedSpotsFilters.selectedCategory = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    cachedSpotsFilters.selectedNeighborhood = selectedNeighborhood;
  }, [selectedNeighborhood]);

  useEffect(() => {
    cachedSpotsFilters.selectedPriceTier = selectedPriceTier;
  }, [selectedPriceTier]);

  // Smooth scroll persistence: restore previous scroll position in Spots feed
  useEffect(() => {
    if (cachedSpotsScrollY > 0) {
      const scrollTimer = setTimeout(() => {
        window.scrollTo({ top: cachedSpotsScrollY, behavior: 'instant' });
      }, 20);
      return () => clearTimeout(scrollTimer);
    }

    const onScroll = () => {
      cachedSpotsScrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cachedSpotsScrollY = window.scrollY;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);


  // Quick Review Modal State with 5-photo limit & Deduplication Guard
  const [reviewModalSpot, setReviewModalSpot] = useState<SpotItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (reviewPhotos.length >= 5) {
      showToast?.('Maximum 5 photos allowed per review.', { type: 'error' });
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(reviewPhotos, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast?.('Photo already selected.');
    } else if (result.exceededLimit) {
      showToast?.('Maximum 5 photos limit reached.', { type: 'error' });
    } else if (result.addedCount > 0) {
      showToast?.(`Added ${result.addedCount} photo(s).`);
    }

    setReviewPhotos(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveReviewPhoto = (indexToRemove: number) => {
    setReviewPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSpot) return;
    if (!reviewComment.trim()) {
      showToast?.('Please write a short review.', { type: 'error' });
      return;
    }

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      userName: 'Explorer',
      userHandle: '@explorer',
      userAvatar: '',
      rating: reviewRating,
      date: 'Just now',
      comment: reviewComment.trim(),
      images: reviewPhotos.length > 0 ? reviewPhotos : undefined
    };

    if (onPostReview) {
      onPostReview(reviewModalSpot.id, newRev);
    }

    const sid = String(reviewModalSpot.id);
    setLiveReviews(prev => ({
      ...prev,
      [sid]: [newRev, ...(prev[sid] || [])]
    }));

    setReviewModalSpot(null);
    setReviewComment('');
    setReviewPhotos([]);
  };

  const [dbSpots, setDbSpots] = useState<any[]>([]);
  const { spots: unclaimedSpots } = useUnclaimedSpots();
  const categorySlotPromos = useActivePromotions('spots_category');
  const [liveReviews, setLiveReviews] = useState<Record<string, any[]>>({});


  useEffect(() => {
    async function fetchLiveReviewsAndSpots() {
      try {
        if (!supabase) return;
        const radaReviewsRes = await supabase.from('rada_reviews').select('*').order('created_at', { ascending: false });

        const revMap: Record<string, any[]> = {};
        const seenRevIds = new Set<string>();
        if (radaReviewsRes.data) {
          for (const row of radaReviewsRes.data) {
            const sid = String(row.spot_id);
            const rid = String(row.id);
            if (sid && !seenRevIds.has(rid)) {
              seenRevIds.add(rid);
              (revMap[sid] = revMap[sid] || []).push({
                ...row.data,
                id: rid,
                spotId: sid,
                rating: Number(row.data?.rating || row.rating || 5)
              });
            }
          }
        }

        setLiveReviews(revMap);
      } catch (err) {
        console.warn('Error connecting to Supabase spots/reviews:', err);
      }
    }

    fetchLiveReviewsAndSpots();

    // Supabase Realtime listener for immediate updates across devices/sessions without full reload
    let channel: any = null;
    try {
      if (supabase && typeof supabase.channel === 'function') {
        channel = supabase
          .channel('spots-feed-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rada_listings' }, () => {
            fetchLiveReviewsAndSpots();
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    };
  }, [spots]);

  const handlePrevImage = (e: React.MouseEvent, spotId: number, maxImages: number) => {
    e.stopPropagation();
    setActiveImageIndices(prev => {
      const current = prev[spotId] || 0;
      return { ...prev, [spotId]: (current - 1 + maxImages) % maxImages };
    });
  };

  const handleNextImage = (e: React.MouseEvent, spotId: number, maxImages: number) => {
    e.stopPropagation();
    setActiveImageIndices(prev => {
      const current = prev[spotId] || 0;
      return { ...prev, [spotId]: (current + 1) % maxImages };
    });
  };



  // Show BOTH local spots (merchant-published, stored in app state) and Supabase spots.
  // Dynamically compute review count and average rating from real database rows.
  const displaySpots = useMemo(() => {
    const localIds = new Set(spots.map(s => String(s.id)));
    const localTitles = new Set(spots.map(s => (s.title || '').trim().toLowerCase()));

    const extraDbSpots = dbSpots
      .filter(d =>
        !localIds.has(String(d.id)) &&
        !localTitles.has((d.title || '').trim().toLowerCase())
      )
      .map(d => ({
        ...d,
        title: d.title || 'Untitled Spot',
        category: d.category || 'Hangouts & Leisure',
        neighborhood: d.neighborhood || 'Nearby',
        address: d.address || '',
        price: resolveSpotBudget(d),
        hasCoords: d.lat != null && d.lng != null,
        lat: d.lat ?? -1.2921,
        lng: d.lng ?? 36.8219,
        img: d.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      }));

    const merged = mergeSpots([...spots, ...extraDbSpots], unclaimedSpots);
    const allCombined = merged;

    // Compute live review counts and ratings from actual reviews only (no mock reviews or fake 4.8)
    const enriched = allCombined.map(sp => {
      const sid = String(sp.id);
      const dbRevs = liveReviews[sid] || [];
      const propRevs = (sp.reviews || []).filter((r: any) => r.id !== 'rev-1');
      const seenRids = new Set<string>();
      const combinedRevs: any[] = [];
      for (const r of [...propRevs, ...dbRevs]) {
        const rid = String(r.id);
        if (!seenRids.has(rid)) {
          seenRids.add(rid);
          combinedRevs.push(r);
        }
      }

      const totalReviews = combinedRevs.length;
      const calculatedRating = totalReviews > 0
        ? (combinedRevs.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1)
        : (sp.rating && !isNaN(Number(sp.rating)) ? String(sp.rating) : 'New');

      return {
        ...sp,
        reviews: combinedRevs,
        reviewCount: totalReviews,
        rating: calculatedRating,
        price: resolveSpotBudget(sp)
      };
    });

    // Default = premium-first (rating, reviews, real photos, verification). Near You = nearest first within radius.
    return rankSpots(enriched, { nearYou: near.active, origin: near.origin, radiusKm: near.radiusKm });
  }, [spots, dbSpots, unclaimedSpots, liveReviews, near.active, near.origin, near.radiusKm]);

  // Real-time fuzzy natural query search with in-app hidden tags
  const filteredSpots = displaySpots.filter(s => {
    // Category filter: strictly the spot's own category vs the 10 RADA categories
    const matchesCategory = spotInCategory(s, selectedCategory);

    // Neighborhood filter
    const matchesNeigh = spotMatchesArea(s, selectedNeighborhood);

    // Price Tier filter
    const matchesPrice = selectedPriceTier === 'all' || resolveSpotBudget(s) === selectedPriceTier;

    // Rating filter
    if (selectedRating !== 'all') {
      const numRating = Number(s.rating);
      const revCount = s.reviews?.length ?? (s.reviewCount || 0);
      if (selectedRating === 'reviewed' && revCount === 0) return false;
      if (selectedRating === '4.5' && (isNaN(numRating) || numRating < 4.5)) return false;
      if (selectedRating === '4.0' && (isNaN(numRating) || numRating < 4.0)) return false;
    }

    // Special Offers filter
    if (onlySpecialOffers && (!s.specialOffers || s.specialOffers.length === 0)) return false;

    if (!matchesCategory || !matchesNeigh || !matchesPrice) return false;

    // Use enhanced in-app tags search matching (invisible to users)
    if (!spotMatchesSearchWithTags(s, searchQuery)) return false;

    return true;
  });

  // One list per category; a spot with extra_categories appears in every category it belongs to.
  // Spots tab category slots (paid packs): promoted spots first in admin order, the rest keep their order.
  const spotsByCategory = SPOT_CATEGORIES.map(def => ({
    def,
    list: sortSpotsByCategoryPromotion(filteredSpots.filter(sp => spotInCategory(sp, def.id)), def.id, categorySlotPromos),
  }));

  const isSaved = (id: number | string) => {
    return savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');
  };

  // Render individual Spot Card with multiple images carousel & reviews
  const renderSpotCard = (spot: SpotItem, contextCategory?: string) => {
    const catIds = getSpotCategoryIds(spot);
    const accent = getSpotCategoryAccent(contextCategory || catIds[0] || spot.category);
    const imagesList = (spot.images && spot.images.length > 0) ? spot.images : [spot.img];
    const currentIndex = activeImageIndices[spot.id] || 0;
    const currentImg = imagesList[currentIndex] || spot.img;
    const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
    const hasReviews = reviewCount > 0;
    const saved = isSaved(spot.id);

    const handleOpenDetails = () => {
      cachedSpotsScrollY = window.scrollY;
      onOpenSpotFullView(spot);
    };

    return (
      <div
        key={spot.id}
        onClick={handleOpenDetails}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 288px auto 340px', ...accentVars(accent) }}
        className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#E0533C] dark:hover:border-[#D17A68] transition group"
      >
        <div>
          {/* Multiple Image Carousel Area */}
          <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
            <div
              className="w-full h-full bg-cover bg-center transition-all duration-300"
              style={{ backgroundImage: `url('${currentImg}')` }}
            />

            {/* Active Bookmark / In Your Plans button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(spot, 'spot');
              }}
              className={`absolute top-2.5 left-2.5 z-10 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                saved
                  ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white px-2.5 py-1 rounded-full ring-2 ring-white/50'
                  : 'w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/85 justify-center'
              }`}
              title={saved ? 'In Your Plans (Tap to remove)' : 'Add to Your Plans'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
              {saved && (
                <span className="text-[10px] font-black tracking-tight whitespace-nowrap">
                  In Your Plans
                </span>
              )}
            </button>

            {/* Price Badge */}
            <span className="absolute top-2.5 right-2.5 bg-black/75 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {budgetBadge(resolveSpotBudget(spot))}
            </span>

            {/* Admin Delete Spot shortcut */}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpotToDelete(spot);
                }}
                className="absolute top-2.5 right-14 z-10 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                title="Delete Spot (Admin)"
                aria-label={`Delete ${spot.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Image Counter Badge if multiple images */}
            {imagesList.length > 1 && (
              <span className="absolute bottom-2.5 left-2.5 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10">
                {currentIndex + 1} / {imagesList.length} photos
              </span>
            )}

            {/* Carousel navigation arrows */}
            {imagesList.length > 1 && (
              <div className="absolute inset-y-0 inset-x-1 flex items-center justify-between pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => handlePrevImage(e, spot.id, imagesList.length)}
                  className="pointer-events-auto w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleNextImage(e, spot.id, imagesList.length)}
                  className="pointer-events-auto w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dots Indicator */}
            {imagesList.length > 1 && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 pointer-events-none">
                {imagesList.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentIndex ? 'bg-white w-3' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Spot Header Info */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] dark:group-hover:text-[#D17A68] truncate transition">
                  {spot.title}
                </h4>
                <BusinessBadge
                  businessId={spot.businessId}
                  category="hospitality"
                  size="xs"
                  unclaimedVerified={!spot.isUserUploaded && spot.is_claimed !== false}
                />
                {spot.hasPendingClaim && (
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-black shrink-0">
                    Proof Under Review
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[11px] shrink-0">
                <Star className={`w-3 h-3 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span>{hasReviews ? spot.rating : 'New'}</span>
              </div>
            </div>

            {(spot as any).distanceKm != null && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#2D6A4F] dark:bg-[#1F4D3A] text-white">
                  <Navigation className="w-2.5 h-2.5" />
                  {formatKm((spot as any).distanceKm)}
                </span>
              </div>
            )}

            <p className="text-xs text-[#475569] dark:text-slate-300 flex items-center justify-between font-medium">
              <span className="truncate">{spot.neighborhood} • {spot.address.split(',')[0]}</span>
              <span className="text-[10px] text-[#475569] dark:text-slate-400 font-bold shrink-0">
                {hasReviews ? `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
              </span>
            </p>

            {/* Fills the row when a neighbouring card is taller (carousel cards share one height) */}
            {spot.description && (
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2 pt-0.5">
                {spot.description}
              </p>
            )}

            {spot.exactLocationTag && (
              <p className="text-[10px] text-[#2D6A4F] font-semibold flex items-center gap-1 truncate">
                <Compass className="w-3 h-3 shrink-0" />
                <span className="truncate">{spot.exactLocationTag}</span>
              </p>
            )}

            {/* Special offer preview badge */}
            {spot.specialOffers && spot.specialOffers.length > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black bg-red-50 dark:bg-red-950/40 text-[#E0533C] dark:text-[#D17A68] border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-md">
                🔥 {spot.specialOffers[0].title} ({spot.specialOffers[0].discount})
              </div>
            )}
          </div>
        </div>

        {/* Actions: "Map", "Review", & "Details" */}
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewLocation(spot);
            }}
            className="flex-1 py-2 bg-transparent hover:opacity-80 text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)] border border-[color:var(--accent)] dark:border-[color:var(--accent-line)] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setReviewModalSpot(spot);
            }}
            className="py-2 px-2.5 bg-white dark:bg-[#121113] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
            title="Write a Review"
          >
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Review</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSpotFullView(spot);
            }}
            className="flex-1 py-2 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)] hover:opacity-90 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Details</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSpotToDelete(spot);
              }}
              className="py-2 px-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-red-200 dark:border-red-900 shrink-0 cursor-pointer"
              title="Delete this spot (Admin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Search Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
              Hangouts & Experiences
            </h2>
          </div>
        </div>

        {/* Search Bar & Filter Button (Voice search removed) */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spots, activities, or locations..."
              className="w-full pl-10 pr-9 py-3 bg-white dark:bg-[#1C1A1E] border border-slate-300 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] dark:focus:ring-[#D17A68] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Button Next to Search */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
              selectedCategory !== 'all' || selectedNeighborhood !== 'all' || selectedPriceTier !== 'all' || selectedRating !== 'all' || onlySpecialOffers || near.active
                ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white border-[#E0533C] shadow-md'
                : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
            title="Filter Spots (Category, Area, Budget, Rating, Offers)"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {(selectedCategory !== 'all' || selectedNeighborhood !== 'all' || selectedPriceTier !== 'all' || selectedRating !== 'all' || onlySpecialOffers || near.active) && (
              <span className="w-2 h-2 rounded-full bg-white ml-1.5" />
            )}
          </button>
        </div>

        {/* Active Filter Indicators */}
        {(selectedCategory !== 'all' || selectedNeighborhood !== 'all' || selectedPriceTier !== 'all' || selectedRating !== 'all' || onlySpecialOffers || near.active) && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Active:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={accentPillStyle(getSpotCategoryAccent(selectedCategory), true)}>
                <span>{getSpotCategoryAccent(selectedCategory).label}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
              </span>
            )}
            {near.active && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F] text-white shrink-0">
                <Navigation className="w-3 h-3" />
                <span>Near You{near.radiusKm ? ` • ${near.radiusKm} km` : ''}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => near.clear()} />
              </span>
            )}
            {selectedNeighborhood !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                <span>{selectedNeighborhood}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedNeighborhood('all')} />
              </span>
            )}
            {selectedPriceTier !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F] text-white shrink-0">
                <span>{selectedPriceTier === 'Low' ? 'Budget $' : selectedPriceTier === 'Mid' ? 'Mid $$' : 'Luxury $$$'}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPriceTier('all')} />
              </span>
            )}
            {selectedRating !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shrink-0">
                <span>{selectedRating === 'reviewed' ? 'Has Reviews' : `${selectedRating}+ Stars`}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRating('all')} />
              </span>
            )}
            {onlySpecialOffers && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shrink-0">
                <span>Special Offers</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setOnlySpecialOffers(false)} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedNeighborhood('all');
                setSelectedPriceTier('all');
                setSelectedRating('all');
                setOnlySpecialOffers(false);
                near.clear();
              }}
              className="text-[10px] text-[#E0533C] font-bold underline ml-1 cursor-pointer shrink-0"
            >
              Reset All
            </button>
          </div>
        )}

        {/* Spots Filter Modal */}
        {isFilterModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setIsFilterModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Filter Spots & Hangouts
                    </h3>
                    <p className="text-[10px] text-slate-400">Category, area, budget & ratings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Options */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Category:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs max-h-56 overflow-y-auto pr-1">
                  {[{ id: 'all', label: 'All Categories' }, ...SPOT_CATEGORIES].map((cat) => {
                    const isSel = selectedCategory === cat.id;
                    const acc = cat.id === 'all' ? null : getSpotCategoryAccent(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2 rounded-xl font-bold transition text-left cursor-pointer truncate text-[11px] border ${
                          acc ? '' : isSel ? 'bg-[#E0533C] text-white border-[#E0533C]' : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                        style={acc ? accentPillStyle(acc, isSel) : undefined}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Area / Neighborhood Quick Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Neighborhood / Area:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs max-h-36 overflow-y-auto pr-1">
                  {[
                    'all',
                    'Westlands',
                    'Kilimani',
                    'Karen',
                    'CBD',
                    'Lavington',
                    'Kileleshwa',
                    'Gigiri',
                    'Parklands',
                    'Ngong Road',
                    'South B',
                    'South C',
                    'Ruaka',
                    'Thika Road'
                  ].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedNeighborhood(area)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer text-[11px] ${
                        selectedNeighborhood.toLowerCase() === area.toLowerCase()
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {area === 'all' ? 'All Nairobi' : area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Tier */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>Price / Budget Tier:</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'Low', label: 'Budget $' },
                    { id: 'Mid', label: 'Mid $$' },
                    { id: 'High', label: 'Luxury $$$' }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedPriceTier(tier.id)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer text-[11px] ${
                        selectedPriceTier === tier.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ratings & Special Deals */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Ratings & Deals:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'Any Rating' },
                    { id: '4.5', label: '★ 4.5+ Top Rated' },
                    { id: '4.0', label: '★ 4.0+ Great' },
                    { id: 'reviewed', label: 'Has Reviews' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRating(r.id as any)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer text-[11px] ${
                        selectedRating === r.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOnlySpecialOffers(!onlySpecialOffers)}
                  className={`w-full mt-1.5 p-2.5 rounded-xl font-bold transition flex items-center justify-between text-xs cursor-pointer border ${
                    onlySpecialOffers
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🔥 Has Running Special Offers</span>
                  </span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${onlySpecialOffers ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    {onlySpecialOffers ? '✓' : ''}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedNeighborhood('all');
                    setSelectedPriceTier('all');
                    setSelectedRating('all');
                    setOnlySpecialOffers(false);
                    near.clear();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#E0533C] text-white rounded-xl text-xs font-black shadow-md hover:bg-orange-700 transition cursor-pointer"
                >
                  Apply Filters ({filteredSpots.length} spots)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Near You (device geolocation) */}
        <NearYouControl />

        {/* Category icon buttons: no fill. Icon + selected outline carry the category accent */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[{ id: 'all', label: 'All Categories', icon: Compass }, ...SPOT_CATEGORIES].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const acc = cat.id === 'all' ? null : getSpotCategoryAccent(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={acc ? accentVars(acc) : undefined}
                className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition-all flex items-center gap-1.5 border bg-transparent cursor-pointer ${
                  acc
                    ? isSelected
                      ? 'font-black border-[color:var(--accent)] dark:border-[color:var(--accent-line)] ring-1 ring-[color:var(--accent)] dark:ring-[color:var(--accent-line)] text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]'
                      : 'font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[color:var(--accent)] dark:hover:border-[color:var(--accent-line)]'
                    : isSelected
                      ? 'font-black border-[#E0533C] dark:border-[#A94F3E] ring-1 ring-[#E0533C] dark:ring-[#A94F3E] text-[#E0533C] dark:text-[#D17A68]'
                      : 'font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3 h-3 ${acc ? 'text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]' : ''}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Budget Selector Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Budget:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'Low', label: 'Budget $' },
            { id: 'Mid', label: 'Mid $$' },
            { id: 'High', label: 'Luxury $$$' }
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedPriceTier(tier.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all ${
                selectedPriceTier === tier.id
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Searchable Location Combobox Filter */}
        <div className="pt-0.5">
          <LocationCombobox
            value={selectedNeighborhood}
            onChange={(val) => setSelectedNeighborhood(val)}
            spots={displaySpots}
            placeholder="Filter by neighborhood, area, or location..."
            allowAll={true}
            liveFilter
          />
        </div>
      </div>

      {/* Empty Search Result State with "Create" button */}
      {filteredSpots.length === 0 && (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] dark:text-[#D17A68] mx-auto flex items-center justify-center font-black">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
              No spots found for "{searchQuery || (selectedCategory === 'all' ? 'your filters' : getSpotCategoryAccent(selectedCategory).label)}"{near.active ? ' near you' : ''}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Know this spot or running a business here? Add it to the RADA interactive map!
            </p>
          </div>
          <button
            onClick={() => onOpenCreateSpot ? onOpenCreateSpot(searchQuery) : undefined}
            className="px-5 py-2.5 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Spot "{searchQuery || 'New Venue'}"</span>
          </button>
        </div>
      )}

      {/* Categorized Spot Carousels: one per category, in that category's accent colour */}
      <div className="space-y-6">
        {spotsByCategory.map(({ def, list }) => {
          if (list.length === 0 || (selectedCategory !== 'all' && selectedCategory !== def.id)) return null;
          const acc = getSpotCategoryAccent(def.id);
          const Icon = acc.Icon;
          return (
            <div key={def.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: acc.soft, color: acc.color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span>{def.label}</span>
                </h3>
                <button
                  onClick={() => onOpenDedicatedViewAll(def.label, def.id)}
                  className="text-[11px] font-bold hover:underline"
                  style={{ color: acc.color }}
                >
                  View All ({list.length})
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {list.map(sp => renderSpotCard(sp, def.id))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Review Modal with Deduplication Guard & 5-Photo Limit */}
      {reviewModalSpot && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setReviewModalSpot(null);
            setReviewComment('');
            setReviewPhotos([]);
          }}
        >
          <div 
            className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#E0533C] dark:text-[#D17A68]">
                  Rate & Review
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {reviewModalSpot.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reviewModalSpot.neighborhood || 'Nearby'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewModalSpot(null);
                  setReviewComment('');
                  setReviewPhotos([]);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-2">
                    {reviewRating} of 5 stars
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your Experience
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your thoughts on the ambiance, food, cocktails, and service..."
                  rows={3}
                  className="w-full p-3 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0533C] dark:focus:ring-[#D17A68] resize-none"
                  required
                />
              </div>

              {/* Photos Gallery with Deduplication Guard, 5-photo limit, & 'X' removal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68]" />
                    <span>Photos ({reviewPhotos.length}/5)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {reviewPhotos.length >= 5 ? 'Max limit reached' : 'Up to 5'}
                  </span>
                </div>

                {/* Thumbnail Previews */}
                {reviewPhotos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {reviewPhotos.map((photoUrl, pIdx) => (
                      <div
                        key={pIdx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 shadow-xs group"
                      >
                        <img loading="lazy" decoding="async"
                          src={photoUrl}
                          alt={`Review attachment ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveReviewPhoto(pIdx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition cursor-pointer z-10 shadow-sm"
                          title="Remove photo"
                          aria-label={`Remove photo ${pIdx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 rounded">
                          {pIdx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Trigger (Only if < 5 photos) */}
                {reviewPhotos.length < 5 && (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] dark:hover:border-[#D17A68] rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer transition text-center bg-[#F8F8F6] dark:bg-[#121113] group">
                    <Plus className="w-4 h-4 text-[#E0533C] dark:text-[#D17A68] group-hover:scale-110 transition" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {reviewPhotos.length === 0 ? 'Select or Upload Photos' : 'Add More Photos'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReviewPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalSpot(null);
                    setReviewComment('');
                    setReviewPhotos([]);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Confirm Delete Spot Modal */}
      {spotToDelete && (
        <AdminConfirmModal
          isOpen={Boolean(spotToDelete)}
          actionType="delete_spot"
          target={{
            id: String(spotToDelete.id),
            name: spotToDelete.title,
            handle: spotToDelete.address,
            neighborhood: spotToDelete.neighborhood,
            category: spotToDelete.category,
            businessName: spotToDelete.title,
          }}
          onClose={() => setSpotToDelete(null)}
          onConfirm={async () => {
            await handleConfirmDeleteSpot(spotToDelete);
          }}
        />
      )}
    </section>
  );
};
