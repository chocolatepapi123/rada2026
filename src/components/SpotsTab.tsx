import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  Music,
  Coffee
} from 'lucide-react';
import { SpotItem } from '../types.ts';

interface SpotsTabProps {
  spots: SpotItem[];
  onOpenSpotFullView: (spot: SpotItem) => void;
  onViewLocation: (spot: SpotItem) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
}

export const SpotsTab: React.FC<SpotsTabProps> = ({
  spots,
  onOpenSpotFullView,
  onViewLocation,
  onOpenDedicatedViewAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all');
  const [activeImageIndices, setActiveImageIndices] = useState<Record<number, number>>({});

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

  // Filter spots
  const filteredSpots = spots.filter(s => {
    const matchesNeigh = selectedNeighborhood === 'all' || s.neighborhood.toLowerCase() === selectedNeighborhood.toLowerCase();
    const matchesQuery = !searchQuery.trim() || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNeigh && matchesQuery;
  });

  const restaurants = filteredSpots.filter(s => s.category === 'restaurants');
  const nightlife = filteredSpots.filter(s => s.category === 'nightlife');
  const cafes = filteredSpots.filter(s => s.category === 'cafes');

  // Render individual Spot Card with multiple images carousel & reviews
  const renderSpotCard = (spot: SpotItem) => {
    const imagesList = (spot.images && spot.images.length > 0) ? spot.images : [spot.img];
    const currentIndex = activeImageIndices[spot.id] || 0;
    const currentImg = imagesList[currentIndex] || spot.img;
    const reviewCount = spot.reviews?.length || spot.reviewCount || 45;

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

            {/* Price Badge */}
            <span className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {spot.price}
            </span>

            {/* Image Counter Badge if multiple images */}
            {imagesList.length > 1 && (
              <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
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
              <h4 className="font-black text-sm text-[#E0533C] truncate group-hover:opacity-90 transition">
                {spot.title}
              </h4>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[11px] shrink-0">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{spot.rating}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">{spot.neighborhood} • {spot.address.split(',')[0]}</span>
              <span className="text-[10px] text-slate-400 font-bold shrink-0">
                {reviewCount} reviews
              </span>
            </p>

            {/* Recent Review Quote Preview */}
            {spot.reviews && spot.reviews.length > 0 && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1 bg-[#F8F8F6] dark:bg-[#121113] p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                "{spot.reviews[0].comment}"
              </p>
            )}
          </div>
        </div>

        {/* Dual Actions: "View Location" & "Details & Reviews" */}
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewLocation(spot);
            }}
            className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>View Location</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSpotFullView(spot);
            }}
            className="py-2 px-2 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Reviews</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Search & Neighborhood Filters (Permanent Top Map Removed as requested!) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Nairobi Spots & Hangouts
          </h2>
          <span className="text-[11px] font-bold text-[#E0533C]">
            {filteredSpots.length} Spots Active
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Nairobi spots, lounges, cafes..."
            className="w-full pl-10 pr-4 py-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Neighborhoods' },
            { id: 'westlands', label: 'Westlands' },
            { id: 'kilimani', label: 'Kilimani' },
            { id: 'cbd', label: 'CBD' },
            { id: 'karen', label: 'Karen' },
            { id: 'lavington', label: 'Lavington' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedNeighborhood(item.id)}
              className={`px-4 py-2 rounded-full text-xs shrink-0 transition-all ${
                selectedNeighborhood === item.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categorized Spot Carousels */}
      <div className="space-y-6">
        {/* Restaurants & Dining */}
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
            {restaurants.length === 0 && (
              <div className="w-full py-6 text-center text-xs text-slate-400">
                No restaurants found matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Nightlife & Clubs */}
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
            {nightlife.length === 0 && (
              <div className="w-full py-6 text-center text-xs text-slate-400">
                No nightlife spots found matching this filter.
              </div>
            )}
          </div>
        </div>

        {/* Cafes & Bakeries */}
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
            {cafes.length === 0 && (
              <div className="w-full py-6 text-center text-xs text-slate-400">
                No cafes found matching this filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
