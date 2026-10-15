import React, { useEffect, useState } from 'react';
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
  Compass
} from 'lucide-react';


import { SpotItem } from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';

interface SpotsTabProps {
  spots: SpotItem[];
  onOpenSpotFullView: (spot: SpotItem) => void;
  onViewLocation: (spot: SpotItem) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateSpot?: (initialTitle?: string) => void;
  showToast?: (msg: string) => void;
}

export const SpotsTab: React.FC<SpotsTabProps> = ({
  spots,
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
  const [customNeighborhoodInput, setCustomNeighborhoodInput] = useState('');
  const [isAddingCustomNeigh, setIsAddingCustomNeigh] = useState(false);
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([
    'All',
    'Westlands',
    'Kilimani',
    'CBD',
    'Karen',
    'Lavington',
    'Parklands',
    'Mombasa Rd',
    'Ruiru',
    'Kiambu Town',
    'Thika'
  ]);

  const [dbSpots, setDbSpots] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLiveSpots() {
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching spots:', error);
      } else if (data && data.length > 0) {
        setDbSpots(data);
      }
    }

    fetchLiveSpots();
  }, []);

  
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
        if (showToast) showToast('Listening... Speak a spot or neighborhood in Nairobi');
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

  const handleAddCustomNeighborhood = () => {
    const trimmed = customNeighborhoodInput.trim();
    if (!trimmed) return;
    if (!neighborhoodOptions.map(n => n.toLowerCase()).includes(trimmed.toLowerCase())) {
      setNeighborhoodOptions(prev => [...prev, trimmed]);
    }
    setSelectedNeighborhood(trimmed);
    setCustomNeighborhoodInput('');
    setIsAddingCustomNeigh(false);
    if (showToast) showToast(`Added "${trimmed}" to neighborhoods!`);
  };
const displaySpots = dbSpots.length > 0 ? dbSpots : spots;

  // Real-time fuzzy natural query search
  // e.g. "Sushi in Westlands" parses "sushi" and "westlands"
  const filteredSpots = displaySpots.filter(s => {

    // Category filter
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;

    // Neighborhood filter
    const matchesNeigh = selectedNeighborhood === 'all' || 
      s.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase());

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
      (s.menuItems && s.menuItems.some(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)));

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
        (s.menuItems && s.menuItems.some(m => m.name.toLowerCase().includes(word) || m.description.toLowerCase().includes(word)))
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
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-black text-sm text-[#E0533C] truncate group-hover:opacity-90 transition">
                  {spot.title}
                </h4>
                {(spot.businessId || !spot.isUserUploaded) && (
                  <MerchantVerificationBadge category="hospitality" size="xs" showLabel={false} />
                )}
              </div>
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
            Nairobi Hangouts & Experiences
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
            placeholder="Search spots, food, bars, cafes, or neighborhoods in Nairobi & Kiambu..."
            className="w-full pl-10 pr-24 py-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5">
            {/* Listening Waveform Animation */}
            {isListening && (
              <div className="flex items-center gap-0.5 px-2 py-1 bg-red-100 dark:bg-red-950/80 rounded-full animate-pulse">
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
                  ? 'bg-[#E0533C] text-white shadow-md animate-ping' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#E0533C] hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills (Including Vacation Spots, Hotels, Date Spots) */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Categories', icon: Compass },
            { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
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

        {/* Neighborhood Filter & Searchable Typeahead with Custom Additions */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {neighborhoodOptions.map((item) => (
            <button
              key={item}
              onClick={() => setSelectedNeighborhood(item.toLowerCase() === 'all' ? 'all' : item.toLowerCase())}
              className={`px-3 py-1 rounded-full text-[11px] shrink-0 transition-all ${
                (selectedNeighborhood === 'all' && item.toLowerCase() === 'all') || selectedNeighborhood.toLowerCase() === item.toLowerCase()
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-800'
              }`}
            >
              {item}
            </button>
          ))}

          {/* Add custom neighborhood */}
          {isAddingCustomNeigh ? (
            <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-[#121113] p-0.5 rounded-full border border-[#E0533C]">
              <input
                type="text"
                value={customNeighborhoodInput}
                onChange={(e) => setCustomNeighborhoodInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomNeighborhood()}
                placeholder="Custom location..."
                className="text-[11px] px-2 py-0.5 bg-transparent border-none focus:outline-none w-24 text-slate-900 dark:text-slate-100"
                autoFocus
              />
              <button
                onClick={handleAddCustomNeighborhood}
                className="px-2 py-0.5 bg-[#E0533C] text-white rounded-full text-[10px] font-bold"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingCustomNeigh(false)}
                className="px-1.5 py-0.5 text-slate-400 text-[10px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCustomNeigh(true)}
              className="px-2.5 py-1 rounded-full text-[11px] shrink-0 bg-transparent text-[#E0533C] border border-dashed border-[#E0533C] font-bold flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
            >
              <Plus className="w-3 h-3" />
              <span>Location</span>
            </button>
          )}
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
