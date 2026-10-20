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
  Mic,
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
  Dumbbell
} from 'lucide-react';

import { SpotItem, MenuItem, SavedItem, Review } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { supabase } from '../lib/supabase.ts';
import { LocationCombobox } from './LocationCombobox.tsx';
import { deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';

interface SpotsTabProps {
  spots: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpotFullView: (spot: SpotItem) => void;
  onViewLocation: (spot: SpotItem) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateSpot?: (initialTitle?: string) => void;
  onPostReview?: (spotId: number, review: Review) => void;
  onNavigateToCalendar?: (dateStr?: string, eventId?: number | string) => void;
  showToast?: (msg: string) => void;
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
  onPostReview,
  onNavigateToCalendar,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState(cachedSpotsFilters.searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(cachedSpotsFilters.selectedCategory);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(cachedSpotsFilters.selectedNeighborhood);
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>(cachedSpotsFilters.selectedPriceTier);
  const [activeImageIndices, setActiveImageIndices] = useState<Record<number, number>>({});
  const [isListening, setIsListening] = useState(false);

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
      showToast?.('Maximum 5 photos allowed per review.');
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(reviewPhotos, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast?.('Duplicate photo(s) skipped — already added.');
    } else if (result.duplicateCount > 0 && result.addedCount > 0) {
      showToast?.(`Added ${result.addedCount} photo(s). Skipped ${result.duplicateCount} duplicate(s).`);
    } else if (result.exceededLimit) {
      showToast?.('Maximum 5 photos limit reached.');
    } else if (result.addedCount > 0) {
      showToast?.(`Added ${result.addedCount} photo(s) to review.`);
    }

    setReviewPhotos(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveReviewPhoto = (indexToRemove: number) => {
    setReviewPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast?.('Photo removed from review.');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSpot) return;
    if (!reviewComment.trim()) {
      showToast?.('Please write a short review.');
      return;
    }

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      userName: 'Explorer',
      userHandle: '@explorer',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
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

    showToast?.('Review Submitted');
    setReviewModalSpot(null);
    setReviewComment('');
    setReviewPhotos([]);
  };

  const [dbSpots, setDbSpots] = useState<any[]>([]);
  const [liveReviews, setLiveReviews] = useState<Record<string, any[]>>({});


  useEffect(() => {
    async function fetchLiveReviewsAndSpots() {
      try {
        if (!supabase) return;
        const [spotsRes, reviewsRes, radaReviewsRes] = await Promise.all([
          supabase.from('spots').select('*').order('created_at', { ascending: false }),
          supabase.from('reviews').select('*').order('created_at', { ascending: false }),
          supabase.from('rada_reviews').select('*').order('created_at', { ascending: false }),
        ]);

        if (spotsRes.data && spotsRes.data.length > 0) {
          setDbSpots(spotsRes.data);
        }

        const revMap: Record<string, any[]> = {};
        const seenRevIds = new Set<string>();

        if (reviewsRes.data) {
          for (const row of reviewsRes.data) {
            const sid = String(row.spot_id ?? row.spotId ?? '');
            if (sid) {
              const rid = String(row.id);
              seenRevIds.add(rid);
              (revMap[sid] = revMap[sid] || []).push({
                id: rid,
                spotId: sid,
                rating: Number(row.rating || 5),
                comment: row.comment || row.content || '',
                userName: row.user_name || row.userName || 'Anonymous',
                userAvatar: row.user_avatar || row.userAvatar,
                userHandle: row.user_handle || row.userHandle || '@explorer',
                images: row.images || [],
                createdAt: row.created_at,
                ...(row.data || {})
              });
            }
          }
        }

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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, () => {
            fetchLiveReviewsAndSpots();
          })
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

  // Web Speech API Voice Search with pulsing waveform
  const handleToggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (showToast) showToast('Voice search not supported in this browser. Try Chrome/Edge!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-KE';

      recognition.onstart = () => {
        setIsListening(true);
        if (showToast) showToast('Listening... Speak a spot or location');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        if (showToast) showToast(`Searching for: "${transcript}"`);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
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
        category: d.category || 'restaurants',
        neighborhood: d.neighborhood || 'Nairobi',
        address: d.address || '',
        price: d.price || 'KES $$',
        lat: d.lat ?? -1.2921,
        lng: d.lng ?? 36.8219,
        img: d.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      }));

    const allCombined = [...spots, ...extraDbSpots];

    // Compute live review counts and ratings from actual reviews only (no mock reviews or fake 4.8)
    return allCombined.map(sp => {
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
        : 'New';

      return {
        ...sp,
        reviews: combinedRevs,
        reviewCount: totalReviews,
        rating: calculatedRating
      };
    });
  }, [spots, dbSpots, liveReviews]);

  const isNatureSpot = (s: SpotItem) =>
    s.category === 'nature' ||
    s.category === 'connect_with_nature' ||
    s.category === 'outdoors' ||
    (s.category === 'activities' && (s.title.toLowerCase().includes('forest') || s.title.toLowerCase().includes('arboretum') || s.title.toLowerCase().includes('trail') || s.title.toLowerCase().includes('nature') || s.title.toLowerCase().includes('biking') || s.title.toLowerCase().includes('hike') || s.title.toLowerCase().includes('waterfall') || s.title.toLowerCase().includes('mountain') || s.title.toLowerCase().includes('hills')));

  const isCreativeSpot = (s: SpotItem): boolean =>
    Boolean(
      s.category === 'creative_leisure' ||
      s.category === 'creative_arts' ||
      s.category === 'social_activities' ||
      s.title.toLowerCase().includes('paint') ||
      s.title.toLowerCase().includes('pottery') ||
      s.title.toLowerCase().includes('craft') ||
      s.title.toLowerCase().includes('clay') ||
      s.description?.toLowerCase().includes('pottery') ||
      s.description?.toLowerCase().includes('canvas') ||
      s.description?.toLowerCase().includes('painting')
    );

  const isTechGamingSpot = (s: SpotItem): boolean =>
    Boolean(
      s.category === 'tech_gaming' ||
      s.title.toLowerCase().includes('vr') ||
      s.title.toLowerCase().includes('gaming') ||
      s.title.toLowerCase().includes('arcade') ||
      s.title.toLowerCase().includes('simulator') ||
      s.description?.toLowerCase().includes('virtual reality') ||
      s.description?.toLowerCase().includes('gaming')
    );

  const isActionSportsSpot = (s: SpotItem): boolean =>
    Boolean(
      s.category === 'action_sports' ||
      s.category === 'outdoor_fitness' ||
      s.title.toLowerCase().includes('kart') ||
      s.title.toLowerCase().includes('paintball') ||
      s.title.toLowerCase().includes('bowling') ||
      s.title.toLowerCase().includes('archery') ||
      s.title.toLowerCase().includes('tactical') ||
      s.description?.toLowerCase().includes('paintball') ||
      s.description?.toLowerCase().includes('racing')
    );

  // Real-time fuzzy natural query search
  // e.g. "Sushi in Westlands" parses "sushi" and "westlands"
  const filteredSpots = displaySpots.filter(s => {

    // Category filter matching strictly against the 10 main categories
    let matchesCategory = false;
    if (selectedCategory === 'all') {
      matchesCategory = true;
    } else if (selectedCategory === 'restaurants_dining') {
      matchesCategory = s.category === 'restaurants_dining' || s.category === 'restaurants';
    } else if (selectedCategory === 'nature') {
      matchesCategory = isNatureSpot(s);
    } else if (selectedCategory === 'creative_leisure') {
      matchesCategory = isCreativeSpot(s);
    } else if (selectedCategory === 'tech_gaming') {
      matchesCategory = isTechGamingSpot(s);
    } else if (selectedCategory === 'action_sports') {
      matchesCategory = isActionSportsSpot(s);
    } else if (selectedCategory === 'date_spots') {
      matchesCategory = s.category === 'date_spots';
    } else if (selectedCategory === 'clubs_lounges') {
      matchesCategory = s.category === 'clubs_lounges' || s.category === 'nightlife';
    } else if (selectedCategory === 'cafes_bakeries') {
      matchesCategory = s.category === 'cafes_bakeries' || s.category === 'cafes';
    } else if (selectedCategory === 'hotels_luxury') {
      matchesCategory = s.category === 'hotels_luxury' || s.category === 'hotels';
    } else if (selectedCategory === 'vacation_escapes') {
      matchesCategory = s.category === 'vacation_escapes' || s.category === 'vacation';
    } else {
      matchesCategory = s.category === selectedCategory;
    }

    // Neighborhood filter
    const matchesNeigh = selectedNeighborhood === 'all' || 
      s.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase()) ||
      selectedNeighborhood.toLowerCase().includes(s.neighborhood.toLowerCase());

    // Price Tier filter
    const matchesPrice = selectedPriceTier === 'all' || s.price === selectedPriceTier;

    if (!matchesCategory || !matchesNeigh || !matchesPrice) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    // Check if query has natural language "in <neighborhood>"
    const words = q.split(/\s+/).filter(w => w.length > 1 && !['in', 'at', 'near', 'the', 'for', 'and'].includes(w));
    
    // Check full query first
    const fullTextMatch = 
      s.title.toLowerCase().includes(q) ||
      s.neighborhood.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      (s.exactLocationTag && s.exactLocationTag.toLowerCase().includes(q)) ||
      (s.landmark && s.landmark.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.cuisineTypes && s.cuisineTypes.some((c: string) => c.toLowerCase().includes(q))) ||
      (s.featuredDishes && s.featuredDishes.some((d: string) => d.toLowerCase().includes(q))) ||
      (s.equipmentProvided && s.equipmentProvided.toLowerCase().includes(q)) ||
      (s.equipmentNeeded && s.equipmentNeeded.toLowerCase().includes(q)) ||
      (s.whatToBring && (Array.isArray(s.whatToBring) ? s.whatToBring.some((w: string) => w.toLowerCase().includes(q)) : s.whatToBring.toLowerCase().includes(q))) ||
      (s.amenitiesAV && s.amenitiesAV.some((a: string) => a.toLowerCase().includes(q))) ||
      (s.menuItems && s.menuItems.some((m: MenuItem) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)));

    if (fullTextMatch) return true;

    // Fuzzy check: all non-stop words must match some spot attribute
    const allWordsMatch = words.every(word => {
      return (
        s.title.toLowerCase().includes(word) ||
        s.neighborhood.toLowerCase().includes(word) ||
        s.category.toLowerCase().includes(word) ||
        s.address.toLowerCase().includes(word) ||
        (s.exactLocationTag && s.exactLocationTag.toLowerCase().includes(word)) ||
        (s.landmark && s.landmark.toLowerCase().includes(word)) ||
        (s.description && s.description.toLowerCase().includes(word)) ||
        (s.cuisineTypes && s.cuisineTypes.some((c: string) => c.toLowerCase().includes(word))) ||
        (s.featuredDishes && s.featuredDishes.some((d: string) => d.toLowerCase().includes(word))) ||
        (s.equipmentProvided && s.equipmentProvided.toLowerCase().includes(word)) ||
        (s.equipmentNeeded && s.equipmentNeeded.toLowerCase().includes(word)) ||
        (s.amenitiesAV && s.amenitiesAV.some((a: string) => a.toLowerCase().includes(word))) ||
        (s.menuItems && s.menuItems.some((m: MenuItem) => m.name.toLowerCase().includes(word) || m.description.toLowerCase().includes(word)))
      );
    });

    return allWordsMatch;
  });

  const restaurants = filteredSpots.filter(s => s.category === 'restaurants' || s.category === 'restaurants_dining');
  const natureSpots = filteredSpots.filter(isNatureSpot);
  const creativeSpots = filteredSpots.filter(isCreativeSpot);
  const techGamingSpots = filteredSpots.filter(isTechGamingSpot);
  const actionSportsSpots = filteredSpots.filter(isActionSportsSpot);
  const dateSpots = filteredSpots.filter(s => s.category === 'date_spots');
  const clubsLounges = filteredSpots.filter(s => s.category === 'clubs_lounges' || s.category === 'nightlife');
  const cafesBakeries = filteredSpots.filter(s => s.category === 'cafes_bakeries' || s.category === 'cafes');
  const hotelsLuxury = filteredSpots.filter(s => s.category === 'hotels_luxury' || s.category === 'hotels');
  const vacationEscapes = filteredSpots.filter(s => s.category === 'vacation_escapes' || s.category === 'vacation');


  const isSaved = (id: number | string) => {
    return savedItems.some(s => String(s.id) === String(id) && s.kind === 'spot');
  };

  // Render individual Spot Card with multiple images carousel & reviews
  const renderSpotCard = (spot: SpotItem) => {
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
        className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#E0533C] transition group"
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
              className={`absolute top-2.5 left-2.5 z-10 transition-all cursor-pointer backdrop-blur-md shadow-sm flex items-center gap-1.5 ${
                saved
                  ? 'bg-[#E0533C] text-white px-2.5 py-1 rounded-full ring-2 ring-white/50'
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
            <span className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {spot.price}
            </span>

            {/* Image Counter Badge if multiple images */}
            {imagesList.length > 1 && (
              <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10">
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
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] truncate transition">
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
                {spot.is_claimed === false && !spot.hasPendingClaim && (
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                    Unclaimed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[11px] shrink-0">
                <Star className={`w-3 h-3 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span>{hasReviews ? spot.rating : 'New'}</span>
              </div>
            </div>

            <p className="text-xs text-[#475569] dark:text-slate-300 flex items-center justify-between font-medium">
              <span className="truncate">{spot.neighborhood} • {spot.address.split(',')[0]}</span>
              <span className="text-[10px] text-[#475569] dark:text-slate-400 font-bold shrink-0">
                {hasReviews ? `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
              </span>
            </p>

            {spot.exactLocationTag && (
              <p className="text-[10px] text-[#2D6A4F] font-semibold flex items-center gap-1 truncate">
                <Compass className="w-3 h-3 shrink-0" />
                <span className="truncate">{spot.exactLocationTag}</span>
              </p>
            )}

            {/* Special offer preview badge */}
            {spot.specialOffers && spot.specialOffers.length > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black bg-red-50 dark:bg-red-950/40 text-[#E0533C] border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-md">
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
            className="flex-1 py-2 bg-white dark:bg-[#121113] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
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
            className="flex-1 py-2 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
          >
            <span>Details</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Search Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
            Hangouts & Experiences
          </h2>
          <span className="text-[10px] text-[#475569] dark:text-slate-300 font-bold">
            {filteredSpots.length} venues found
          </span>
        </div>

        {/* Smart Search Bar with Web Speech API & Waveform Animation */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spots, activities, or locations..."
            className="w-full pl-10 pr-24 py-3 bg-white dark:bg-[#1C1A1E] border border-slate-300 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {/* Listening Waveform Animation */}
            {isListening && (
              <div className="flex items-center gap-0.5 px-2 py-1 bg-red-100 dark:bg-red-950/80 rounded-full">
                <span className="w-1 h-3 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[9px] font-black text-[#E0533C] ml-1">Listening</span>
              </div>
            )}

            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              title={isListening ? 'Stop Listening' : 'Voice Search with Web Speech API'}
              className={`p-2 rounded-xl transition ${
                isListening 
                  ? 'bg-[#E0533C] text-white shadow-md' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#E0533C] hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills: Strictly 10 Overhauled Categories */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Categories', icon: Compass },
            { id: 'restaurants_dining', label: 'Restaurants and dining', icon: UtensilsCrossed },
            { id: 'nature', label: 'Nature Trails & Outdoors', icon: Trees },
            { id: 'creative_leisure', label: 'Creative and leisure', icon: Palette },
            { id: 'tech_gaming', label: 'Tech and Gaming', icon: Gamepad2 },
            { id: 'action_sports', label: 'Action and sports', icon: Dumbbell },
            { id: 'date_spots', label: 'Date spots', icon: Heart },
            { id: 'clubs_lounges', label: 'Clubs and lounges', icon: Music },
            { id: 'cafes_bakeries', label: 'Cafes and Bakeries', icon: Coffee },
            { id: 'hotels_luxury', label: 'Hotels and luxury stays', icon: Hotel },
            { id: 'vacation_escapes', label: 'Vacation spots and escapes', icon: Palmtree }
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#E0533C] text-white font-black shadow-xs'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Price Tier Selector Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Price:</span>
          {[
            { id: 'all', label: 'All Prices' },
            { id: '$', label: '$ Budget' },
            { id: '$$', label: '$$ Mid-Range' },
            { id: '$$$', label: '$$$ Fine & Luxury' }
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
            showSelectedChip={true}
          />
        </div>
      </div>

      {/* Empty Search Result State with "Create" button */}
      {filteredSpots.length === 0 && (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] mx-auto flex items-center justify-center font-black">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
              No spots found for "{searchQuery || selectedCategory}"
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Know this spot or running a business here? Add it to the RADA interactive map!
            </p>
          </div>
          <button
            onClick={() => onOpenCreateSpot ? onOpenCreateSpot(searchQuery) : showToast?.('Open Business Hub from menu to add a spot')}
            className="px-5 py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Spot "{searchQuery || 'New Venue'}"</span>
          </button>
        </div>
      )}

      {/* Categorized Spot Carousels */}
      <div className="space-y-6">
        {/* 1. Restaurants and dining */}
        {(selectedCategory === 'all' || selectedCategory === 'restaurants_dining') && restaurants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>Restaurants and dining</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Restaurants and dining', 'restaurants_dining')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({restaurants.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {restaurants.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 2. Nature */}
        {(selectedCategory === 'all' || selectedCategory === 'nature') && natureSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-600" />
                <span>NATURE TRAILS & OUTDOORS</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Nature Trails & Outdoors', 'nature')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({natureSpots.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {natureSpots.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 3. Creative and leisure */}
        {(selectedCategory === 'all' || selectedCategory === 'creative_leisure') && creativeSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Creative and leisure</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Creative and leisure', 'creative_leisure')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({creativeSpots.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {creativeSpots.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 4. Tech and Gaming */}
        {(selectedCategory === 'all' || selectedCategory === 'tech_gaming') && techGamingSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Tech and Gaming</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Tech and Gaming', 'tech_gaming')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({techGamingSpots.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {techGamingSpots.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 5. Action and sports */}
        {(selectedCategory === 'all' || selectedCategory === 'action_sports') && actionSportsSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-blue-600" />
                <span>Action and sports</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Action and sports', 'action_sports')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({actionSportsSpots.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {actionSportsSpots.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 6. Date spots */}
        {(selectedCategory === 'all' || selectedCategory === 'date_spots') && dateSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>Date spots</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Date spots', 'date_spots')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({dateSpots.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {dateSpots.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 7. Clubs and lounges */}
        {(selectedCategory === 'all' || selectedCategory === 'clubs_lounges') && clubsLounges.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-600" />
                <span>Clubs and lounges</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Clubs and lounges', 'clubs_lounges')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({clubsLounges.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {clubsLounges.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 8. Cafes and Bakeries */}
        {(selectedCategory === 'all' || selectedCategory === 'cafes_bakeries') && cafesBakeries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Cafes and Bakeries</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Cafes and Bakeries', 'cafes_bakeries')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({cafesBakeries.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {cafesBakeries.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 9. Hotels and luxury stays */}
        {(selectedCategory === 'all' || selectedCategory === 'hotels_luxury') && hotelsLuxury.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Hotels and luxury stays</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Hotels and luxury stays', 'hotels_luxury')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({hotelsLuxury.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {hotelsLuxury.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* 10. Vacation spots and escapes */}
        {(selectedCategory === 'all' || selectedCategory === 'vacation_escapes') && vacationEscapes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Vacation spots and escapes</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Vacation spots and escapes', 'vacation_escapes')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({vacationEscapes.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {vacationEscapes.map(renderSpotCard)}
            </div>
          </div>
        )}
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
                <span className="text-[10px] font-black uppercase tracking-wider text-[#E0533C]">
                  Rate & Review
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {reviewModalSpot.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reviewModalSpot.neighborhood || 'Nairobi'}
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
                  className="w-full p-3 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0533C] resize-none"
                  required
                />
              </div>

              {/* Photos Gallery with Deduplication Guard, 5-photo limit, & 'X' removal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Photos ({reviewPhotos.length}/5)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {reviewPhotos.length >= 5 ? 'Max limit reached' : 'Up to 5 • Deduplicated'}
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
                        <img
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
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer transition text-center bg-[#F8F8F6] dark:bg-[#121113] group">
                    <Plus className="w-4 h-4 text-[#E0533C] group-hover:scale-110 transition" />
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
                  className="flex-1 py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
