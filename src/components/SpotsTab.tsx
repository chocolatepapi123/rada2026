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
  X
} from 'lucide-react';

import { SpotItem, MenuItem, SavedItem } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { supabase } from '../lib/supabase.ts';
import { LocationCombobox } from './LocationCombobox.tsx';

interface SpotsTabProps {
  spots: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpotFullView: (spot: SpotItem) => void;
  onViewLocation: (spot: SpotItem) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateSpot?: (initialTitle?: string) => void;
  showToast?: (msg: string) => void;
}

export const SpotsTab: React.FC<SpotsTabProps> = ({
  spots,
  savedItems = [],
  onToggleSave,
  onOpenSpotFullView,
  onViewLocation,
  onOpenDedicatedViewAll,
  onOpenCreateSpot,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('all');
  const [activeImageIndices, setActiveImageIndices] = useState<Record<number, number>>({});
  const [isListening, setIsListening] = useState(false);

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
    s.category === 'connect_with_nature' ||
    s.category === 'outdoors' ||
    (s.category === 'activities' && (s.title.toLowerCase().includes('forest') || s.title.toLowerCase().includes('arboretum') || s.title.toLowerCase().includes('trail') || s.title.toLowerCase().includes('nature') || s.title.toLowerCase().includes('biking') || s.title.toLowerCase().includes('hike') || s.title.toLowerCase().includes('waterfall') || s.title.toLowerCase().includes('mountain') || s.title.toLowerCase().includes('hills')));

  const isCreativeSpot = (s: SpotItem): boolean =>
    Boolean(
      s.category === 'creative_leisure' ||
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

    // Category filter
    let matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    if (selectedCategory === 'connect_with_nature' || selectedCategory === 'outdoors') {
      matchesCategory = isNatureSpot(s);
    } else if (selectedCategory === 'creative_leisure' || selectedCategory === 'social_activities') {
      matchesCategory = isCreativeSpot(s);
    } else if (selectedCategory === 'tech_gaming') {
      matchesCategory = isTechGamingSpot(s);
    } else if (selectedCategory === 'action_sports') {
      matchesCategory = isActionSportsSpot(s);
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
        (s.menuItems && s.menuItems.some((m: MenuItem) => m.name.toLowerCase().includes(word) || m.description.toLowerCase().includes(word)))
      );
    });

    return allWordsMatch;
  });

  const restaurants = filteredSpots.filter(s => s.category === 'restaurants');
  const nightlife = filteredSpots.filter(s => s.category === 'nightlife');
  const cafes = filteredSpots.filter(s => s.category === 'cafes');
  const dateSpots = filteredSpots.filter(s => s.category === 'date_spots');
  const hotels = filteredSpots.filter(s => s.category === 'hotels');
  const vacation = filteredSpots.filter(s => s.category === 'vacation');
  const natureSpots = filteredSpots.filter(isNatureSpot);
  const creativeSpots = filteredSpots.filter(isCreativeSpot);
  const techGamingSpots = filteredSpots.filter(isTechGamingSpot);
  const actionSportsSpots = filteredSpots.filter(isActionSportsSpot);


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

    return (
      <div
        key={spot.id}
        onClick={() => onOpenSpotFullView(spot)}
        className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#E0533C] transition group"
      >
        <div>
          {/* Multiple Image Carousel Area */}
          <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
            <div
              className="w-full h-full bg-cover bg-center transition-all duration-300"
              style={{ backgroundImage: `url('${currentImg}')` }}
            />

            {/* Bookmark button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(spot, 'spot');
              }}
              className={`absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs ${
                saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/85'
              }`}
              title={saved ? 'Remove bookmark' : 'Bookmark this spot'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
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
                <h4 className="font-black text-sm text-[#E0533C] truncate group-hover:opacity-90 transition">
                  {spot.title}
                </h4>
                <BusinessBadge
                  businessId={spot.businessId}
                  category="hospitality"
                  size="xs"
                  unclaimedVerified={!spot.isUserUploaded}
                />
              </div>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[11px] shrink-0">
                <Star className={`w-3 h-3 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span>{hasReviews ? spot.rating : 'New'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">{spot.neighborhood} • {spot.address.split(',')[0]}</span>
              <span className="text-[10px] text-slate-400 font-bold shrink-0">
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

        {/* Dual Actions: "View Location" & "Details & Reviews" */}
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewLocation(spot);
            }}
            className="flex-1 py-2 bg-[#F8F8F6] dark:bg-[#121113] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Map</span>
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
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Hangouts & Experiences
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">
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
            className="w-full pl-10 pr-24 py-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
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

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Categories', icon: Compass },
            { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
            { id: 'connect_with_nature', label: 'Connect with Nature', icon: Trees },
            { id: 'creative_leisure', label: 'Creative & Leisure', icon: Palette },
            { id: 'tech_gaming', label: 'Tech & Gaming', icon: Gamepad2 },
            { id: 'action_sports', label: 'Action & Sports', icon: Sparkles },
            { id: 'nightlife', label: 'Nightlife', icon: Music },
            { id: 'cafes', label: 'Cafes', icon: Coffee },
            { id: 'date_spots', label: 'Date Spots', icon: Heart },
            { id: 'hotels', label: 'Hotels', icon: Hotel },
            { id: 'vacation', label: 'Vacation Spots', icon: Palmtree }
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
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800'
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Price:</span>
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
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
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
        {/* Restaurants & Dining */}
        {(selectedCategory === 'all' || selectedCategory === 'restaurants') && restaurants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>Restaurants & Dining</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Restaurants Catalog', 'restaurants')}
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

        {/* Connect with Nature */}
        {(selectedCategory === 'all' || selectedCategory === 'connect_with_nature' || selectedCategory === 'outdoors') && natureSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connect with Nature</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Connect with Nature', 'connect_with_nature')}
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

        {/* Creative & Leisure */}
        {(selectedCategory === 'all' || selectedCategory === 'creative_leisure' || selectedCategory === 'social_activities') && creativeSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Creative & Leisure</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Creative & Leisure', 'creative_leisure')}
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

        {/* Tech & Gaming */}
        {(selectedCategory === 'all' || selectedCategory === 'tech_gaming') && techGamingSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Tech & Gaming</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Tech & Gaming', 'tech_gaming')}
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

        {/* Action & Sports */}
        {(selectedCategory === 'all' || selectedCategory === 'action_sports') && actionSportsSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Action & Sports</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Action & Sports', 'action_sports')}
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


        {/* Date Spots */}
        {(selectedCategory === 'all' || selectedCategory === 'date_spots') && dateSpots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>Romantic Date Spots</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Romantic Date Spots', 'date_spots')}
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

        {/* Nightlife & Clubs */}
        {(selectedCategory === 'all' || selectedCategory === 'nightlife') && nightlife.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Nightlife, Clubs & Lounges</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Nightlife & Clubs', 'nightlife')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({nightlife.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {nightlife.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* Cafes & Bakeries */}
        {(selectedCategory === 'all' || selectedCategory === 'cafes') && cafes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Cafes & Bakeries</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Cafes & Bakeries', 'cafes')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({cafes.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {cafes.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* Hotels & Luxury Stays */}
        {(selectedCategory === 'all' || selectedCategory === 'hotels') && hotels.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Hotels & Luxury Stays</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Hotels Catalog', 'hotels')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({hotels.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {hotels.map(renderSpotCard)}
            </div>
          </div>
        )}

        {/* Vacation Getaways */}
        {(selectedCategory === 'all' || selectedCategory === 'vacation') && vacation.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Vacation Spots & Escapes</span>
              </h3>
              <button
                onClick={() => onOpenDedicatedViewAll('Vacation Spots', 'vacation')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({vacation.length})
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {vacation.map(renderSpotCard)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
