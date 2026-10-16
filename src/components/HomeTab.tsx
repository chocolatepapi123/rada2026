import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Film, 
  Camera, 
  ArrowRight, 
  Clock, 
  MapPin, 
  X,
  Ticket,
  MessageCircle,
  Send,
  UserCheck,
  Mic,
  Plus,
  Sparkles,
  Music,
  ExternalLink,
  Percent,
  Flame,
  Copy,
  Check,
  Store,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Bookmark,
  Images,
  Compass,
  Star,
  CheckCircle2,
  UtensilsCrossed,
  Tag
} from 'lucide-react';
import { 
  EventItem, 
  CinemaMovie, 
  StatusPost, 
  UserProfile, 
  BusinessOffer, 
  OfferCategory, 
  SpotItem,
  ExperienceItem,
  ThriftItem,
  DiscoveryCategory,
  DISCOVERY_TAGS,
  NAIROBI_NEIGHBORHOODS,
  SavedItem
} from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';

interface HomeTabProps {
  events: EventItem[];
  cinemaMovies: CinemaMovie[];
  statuses: StatusPost[];
  offers?: BusinessOffer[];
  spots?: SpotItem[];
  experiences?: ExperienceItem[];
  thriftItems?: ThriftItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'experience' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpotDetails?: (spot: SpotItem) => void;
  onOpenEventDetails: (event: EventItem) => void;
  onOpenExperienceDetails?: (exp: ExperienceItem) => void;
  onOpenThriftDetails?: (item: ThriftItem) => void;
  onOpenGallery?: (images: string[], index?: number, title?: string, subtitle?: string) => void;
  onBookCinema: (movie: CinemaMovie) => void;
  onPostStatus: (text: string, mediaUrl?: string, locationName?: string) => void;
  onReplyStatus: (statusId: string, text: string) => void;
  onViewUserProfile: (profile: UserProfile) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateEvent?: (initialTitle?: string) => void;
  onOpenBusinessProfile?: (businessId: string) => void;
  onOpenPlanDate?: (initialSpot?: SpotItem) => void;
  showToast: (msg: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  events,
  cinemaMovies,
  statuses,
  offers = [],
  spots = [],
  experiences = [],
  thriftItems = [],
  savedItems = [],
  onToggleSave,
  onOpenSpotDetails,
  onOpenEventDetails,
  onOpenExperienceDetails,
  onOpenThriftDetails,
  onOpenGallery,
  onBookCinema,
  onPostStatus,
  onReplyStatus,
  onViewUserProfile,
  onOpenDedicatedViewAll,
  onOpenCreateEvent,
  onOpenBusinessProfile,
  onOpenPlanDate,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscoveryCategory, setSelectedDiscoveryCategory] = useState<DiscoveryCategory>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');

  const [selectedVibe, setSelectedVibe] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCinemaLoc, setSelectedCinemaLoc] = useState('all');
  const [isListening, setIsListening] = useState(false);

  // Events Streamlined Modal Filters
  const [isEventFilterModalOpen, setIsEventFilterModalOpen] = useState(false);
  const [selectedEventPriceTier, setSelectedEventPriceTier] = useState('all');
  const [selectedEventDateRange, setSelectedEventDateRange] = useState('all');
  const [showStatusEmojiPicker, setShowStatusEmojiPicker] = useState(false);

  // Offers state
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<'all' | OfferCategory>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Helper to check if an item is saved
  const isItemSaved = (id: string | number, kind: string) => {
    return savedItems.some(s => String(s.id) === String(id) && s.kind === kind);
  };

  // Dynamic time-of-day greeting for Nairobi
  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { title: "What's the move Nairobi? ☀️", subtitle: "Breakfast, specialty coffee & morning chill spots" };
    if (hour < 17) return { title: "What's the move this afternoon? 🌤️", subtitle: "Daytime hangouts, exhibitions & casual bites" };
    if (hour < 21) return { title: "What's the move tonight? 🌆", subtitle: "Golden hour sundowners, rooftop dawas & dining" };
    return { title: "Late Night Moves Nairobi 🌙", subtitle: "Amapiano raves, club sets & late choma spots" };
  };

  const greeting = getDynamicGreeting();

  // Multi-tag toggle handler
  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedTags([]);
    setSelectedArea('all');
    setSelectedDiscoveryCategory('all');
    setSelectedGenre('all');
    setSelectedEventPriceTier('all');
    setSelectedEventDateRange('all');
    setSearchQuery('');
  };

  // Handle promo code copy
  const handleCopyPromoCode = (code: string, offerId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeId(offerId);
      showToast(`Promo code "${code}" copied to clipboard!`);
      setTimeout(() => setCopiedCodeId(null), 2500);
    }).catch(() => {
      showToast(`Promo code: ${code}`);
    });
  };

  const handleVisitSpot = (offer: BusinessOffer) => {
    const matchingSpot = spots.find(
      s => (s.businessId && s.businessId === offer.businessId) ||
           s.title.toLowerCase().trim() === offer.businessName.toLowerCase().trim() ||
           offer.businessName.toLowerCase().includes(s.title.toLowerCase()) ||
           s.title.toLowerCase().includes(offer.businessName.toLowerCase())
    );

    if (matchingSpot && onOpenSpotDetails) {
      onOpenSpotDetails(matchingSpot);
      showToast(`Showing location & directions for ${matchingSpot.title}`);
      return;
    }

    if (onOpenBusinessProfile) {
      onOpenBusinessProfile(offer.businessId);
      showToast(`Viewing venue details for ${offer.businessName}`);
      return;
    }

    showToast(`Viewing details for ${offer.businessName}`);
  };

  // Status creation state
  const [statusText, setStatusText] = useState('');
  const [statusMediaUrl, setStatusMediaUrl] = useState<string | null>(null);
  const [statusLocation, setStatusLocation] = useState('Westlands, Nairobi');

  // Active status replies drawer
  const [activeReplyStatusId, setActiveReplyStatusId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Web Speech API Voice Search with pulsing waveform
  const handleToggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice search not supported in this browser. Try Chrome/Edge!');
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
        showToast('Listening... Speak an event, movie or artist');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        showToast(`Searching for: "${transcript}"`);
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

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setStatusMediaUrl(event.target.result as string);
          showToast('Photo attached to status!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishStatus = () => {
    if (!statusText.trim() && !statusMediaUrl) {
      showToast('Type a status or attach a photo.');
      return;
    }
    onPostStatus(statusText.trim(), statusMediaUrl || undefined, statusLocation);
    setStatusText('');
    setStatusMediaUrl(null);
    setShowStatusEmojiPicker(false);
  };

  const handleSendReply = (statusId: string) => {
    if (!replyInputText.trim()) return;
    onReplyStatus(statusId, replyInputText.trim());
    setReplyInputText('');
  };

  // Filter spots with tags, location, search
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      if (selectedArea !== 'all' && !spot.neighborhood.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
      if (selectedTags.length > 0) {
        const spotTags = spot.tags || [];
        const hasMatch = selectedTags.some(tag => 
          spotTags.some(st => st.toLowerCase() === tag.toLowerCase()) ||
          spot.title.toLowerCase().includes(tag.toLowerCase()) ||
          (spot.description && spot.description.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          spot.title.toLowerCase().includes(q) ||
          spot.neighborhood.toLowerCase().includes(q) ||
          spot.address.toLowerCase().includes(q) ||
          (spot.description && spot.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [spots, selectedArea, selectedTags, searchQuery]);

  // Filter experiences with tags, location, search
  const filteredExperiences = useMemo(() => {
    return experiences.filter(exp => {
      if (selectedArea !== 'all' && !exp.neighborhood.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
      if (selectedTags.length > 0) {
        const expTags = exp.tags || [];
        const hasMatch = selectedTags.some(tag => 
          expTags.some(et => et.toLowerCase() === tag.toLowerCase()) ||
          exp.title.toLowerCase().includes(tag.toLowerCase()) ||
          (exp.description && exp.description.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          exp.title.toLowerCase().includes(q) ||
          exp.neighborhood.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q) ||
          (exp.description && exp.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [experiences, selectedArea, selectedTags, searchQuery]);

  // Filter events with real-time query, vibe, genre, price tier, and date
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedArea !== 'all' && !e.location.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
      if (selectedTags.length > 0) {
        const evtTags = e.tags || [];
        const hasMatch = selectedTags.some(tag => 
          evtTags.some(et => et.toLowerCase() === tag.toLowerCase()) ||
          e.title.toLowerCase().includes(tag.toLowerCase()) ||
          (e.genre && e.genre.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatch) return false;
      }

      const matchesVibe = selectedVibe === 'all' || e.category === selectedVibe;
      const matchesGenre = selectedGenre === 'all' || (e.genre && e.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

      let matchesPrice = true;
      if (selectedEventPriceTier === 'free') {
        matchesPrice = e.tiers.some(t => t.price.toLowerCase().includes('free') || t.price.includes('0'));
      } else if (selectedEventPriceTier === 'under1k') {
        matchesPrice = e.tiers.some(t => {
          const num = parseInt(t.price.replace(/\D/g, ''), 10);
          return num && num < 1000;
        });
      } else if (selectedEventPriceTier === '1k-3k') {
        matchesPrice = e.tiers.some(t => {
          const num = parseInt(t.price.replace(/\D/g, ''), 10);
          return num && num >= 1000 && num <= 3000;
        });
      } else if (selectedEventPriceTier === '3k+') {
        matchesPrice = e.tiers.some(t => {
          const num = parseInt(t.price.replace(/\D/g, ''), 10);
          return num && num > 3000;
        });
      }

      let matchesDate = true;
      if (selectedEventDateRange === 'today') {
        matchesDate = e.date.toLowerCase().includes('today') || e.date.includes('15 Oct') || e.date.includes('16 Oct');
      } else if (selectedEventDateRange === 'weekend') {
        matchesDate = e.date.toLowerCase().includes('sat') || e.date.toLowerCase().includes('sun') || e.date.toLowerCase().includes('fri');
      }

      if (!matchesVibe || !matchesGenre || !matchesPrice || !matchesDate) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.genre && e.genre.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    });
  }, [events, selectedArea, selectedTags, selectedVibe, selectedGenre, selectedEventPriceTier, selectedEventDateRange, searchQuery]);

  // Filter thrift items
  const filteredThrift = useMemo(() => {
    return thriftItems.filter(item => {
      if (selectedArea !== 'all' && !item.storeLocation.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
      if (selectedTags.length > 0) {
        const itemTags = item.tags || [];
        const hasMatch = selectedTags.some(tag => 
          itemTags.some(it => it.toLowerCase() === tag.toLowerCase()) ||
          item.name.toLowerCase().includes(tag.toLowerCase()) ||
          item.category.toLowerCase().includes(tag.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          item.storeLocation.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.seller.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [thriftItems, selectedArea, selectedTags, searchQuery]);

  // Filter cinema movies
  const filteredCinemaMovies = useMemo(() => {
    return cinemaMovies.filter(m => {
      const matchesLoc = selectedCinemaLoc === 'all' || m.location === selectedCinemaLoc;
      const matchesGenre = selectedGenre === 'all' || (m.genre && m.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
      
      if (!matchesLoc || !matchesGenre) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        m.title.toLowerCase().includes(q) ||
        m.locationName.toLowerCase().includes(q) ||
        (m.genre && m.genre.toLowerCase().includes(q))
      );
    });
  }, [cinemaMovies, selectedCinemaLoc, selectedGenre, searchQuery]);

  // Filter offers by category and search query
  const filteredOffers = useMemo(() => {
    return (offers || []).filter(o => {
      if (selectedOfferCategory !== 'all' && o.category !== selectedOfferCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        o.title.toLowerCase().includes(q) ||
        o.businessName.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        o.discount.toLowerCase().includes(q)
      );
    });
  }, [offers, selectedOfferCategory, searchQuery]);

  // Total active filter count
  const activeFilterCount = selectedTags.length + (selectedArea !== 'all' ? 1 : 0) + (selectedDiscoveryCategory !== 'all' ? 1 : 0);

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Editorial Hero Header ("What's the move?") */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#1C1A1E] text-white rounded-3xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-[#E0533C]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E0533C] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              RADA Discovery
            </span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-slate-300 text-xs font-semibold">Nairobi & Kiambu Guide</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {greeting.title}
          </h1>
          <p className="text-xs text-slate-300 font-medium">
            {greeting.subtitle}
          </p>

          {/* Quick Curated Weekend / Date Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-2">
            {onOpenPlanDate && (
              <button
                onClick={() => onOpenPlanDate()}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm transition flex items-center gap-1.5 border border-white/10 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span>Plan a Date</span>
              </button>
            )}
            <button
              onClick={() => setSelectedDiscoveryCategory('experiences')}
              className="px-3.5 py-1.5 rounded-xl bg-[#E0533C] hover:bg-orange-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Experiences</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar with Web Speech API & Waveform Animation */}
      <div className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places, experiences, events, thrift fits..."
              className="w-full pl-10 pr-20 py-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] shadow-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              {isListening && (
                <div className="flex items-center gap-0.5 px-2 py-1 bg-red-100 dark:bg-red-950/80 rounded-full animate-pulse">
                  <span className="w-1 h-3 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-[#E0533C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[9px] font-black text-[#E0533C] ml-1">Listening</span>
                </div>
              )}

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

          {/* Filter Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsEventFilterModalOpen(true)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
              activeFilterCount > 0
                ? 'bg-[#E0533C] text-white border-[#E0533C] shadow-md'
                : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
            title="Filter by Dates, Price, and Genres"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-white ml-1.5" />
            )}
          </button>
        </div>

        {/* 1. FLEXIBLE DISCOVERY CATEGORIES (Places, Experiences, Events, Fashion, Deals) */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
          {[
            { id: 'all', label: '🔥 All Moves' },
            { id: 'places', label: '🍸 Places & Venues' },
            { id: 'experiences', label: '✨ Experiences' },
            { id: 'events', label: '🎟️ Events' },
            { id: 'fashion', label: '👟 Luku & Thrift' },
            { id: 'deals', label: '⚡ Exclusive Deals' }
          ].map((cat) => {
            const isActive = selectedDiscoveryCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedDiscoveryCategory(cat.id as DiscoveryCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 2. MANY-TO-MANY TAG SYSTEM (Interactive Multi-Select Chips) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Vibes & Tags
            </span>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] font-bold text-[#E0533C] hover:underline"
              >
                Clear tags ({selectedTags.length})
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {DISCOVERY_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#E0533C] text-white shadow-xs'
                      : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span>#{tag}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. LOCATION-BASED DISCOVERY (Nairobi Neighborhoods) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#E0533C]" />
              <span>Nairobi Areas & Hubs</span>
            </span>
            {selectedArea !== 'all' && (
              <button
                onClick={() => setSelectedArea('all')}
                className="text-[10px] font-bold text-[#E0533C] hover:underline"
              >
                Reset area
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                selectedArea === 'all'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              All Nairobi
            </button>
            {NAIROBI_NEIGHBORHOODS.map((area) => {
              const isSelected = selectedArea.toLowerCase() === area.toLowerCase();
              return (
                <button
                  key={area}
                  onClick={() => setSelectedArea(isSelected ? 'all' : area)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {activeFilterCount > 0 && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-900 dark:text-amber-200">
              {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''} applied
            </span>
            <button
              onClick={handleClearAllFilters}
              className="font-bold text-[#E0533C] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          RUNNING OFFERS & PROMOTIONS (Deals Architecture)
          ======================================================== */}
      {(selectedDiscoveryCategory === 'all' || selectedDiscoveryCategory === 'deals') && filteredOffers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#E0533C] to-amber-400 flex items-center justify-center text-white shadow-xs">
                <Flame className="w-3 h-3 fill-white" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-slate-200">
                Running Offers & Promo Codes
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Special Offers & Deals', 'offers')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              View All ({filteredOffers.length})
            </button>
          </div>

          {/* Offers Horizontal Showcase */}
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredOffers.map(offer => (
              <div
                key={offer.id}
                className="w-72 sm:w-80 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shrink-0 shadow-sm flex flex-col justify-between hover:border-rose-400/60 transition group"
              >
                {/* Poster Banner */}
                <div className="h-36 w-full relative bg-slate-900 overflow-hidden">
                  <img
                    src={offer.posterUrl || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop'}
                    alt={offer.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-[#E0533C] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide">
                      {offer.discount}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-white/20">
                      {offer.category}
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  {onToggleSave && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(offer, 'offer');
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-[#E0533C] transition"
                      title={isItemSaved(offer.id, 'offer') ? 'Saved' : 'Save Offer'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isItemSaved(offer.id, 'offer') ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                    </button>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-[10px] text-amber-300 font-bold">{offer.validUntil}</p>
                    <h3 className="text-sm font-black text-white line-clamp-1 mt-0.5">{offer.title}</h3>
                  </div>
                </div>

                {/* Offer Details & Actions */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div 
                      onClick={() => onOpenBusinessProfile && onOpenBusinessProfile(offer.businessId)}
                      className="flex items-center justify-between cursor-pointer group/biz"
                    >
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover/biz:text-[#E0533C] transition truncate max-w-[150px]">
                        {offer.businessName}
                      </span>
                      <BusinessBadge businessId={offer.businessId} category={offer.businessCategory} size="xs" />
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {offer.description}
                    </p>
                  </div>

                  {/* Promo Code Copy Bar */}
                  {offer.claimCode && (
                    <div className="flex items-center justify-between bg-[#F8F8F6] dark:bg-[#121113] p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {offer.claimCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPromoCode(offer.claimCode!, offer.id)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                      >
                        {copiedCodeId === offer.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCodeId === offer.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVisitSpot(offer)}
                      className="flex-1 py-2 px-3 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Redeem / Visit Venue</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          CURATED EXPERIENCES (New Experience System)
          ======================================================== */}
      {(selectedDiscoveryCategory === 'all' || selectedDiscoveryCategory === 'experiences') && filteredExperiences.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
              <span>Unique Nairobi Experiences</span>
            </h2>
            <button
              onClick={() => setSelectedDiscoveryCategory('experiences')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              View All ({filteredExperiences.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredExperiences.map((exp) => (
              <div
                key={exp.id}
                onClick={() => onOpenExperienceDetails && onOpenExperienceDetails(exp)}
                className="w-72 sm:w-80 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-[#2D6A4F] transition group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${exp.img}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase">
                      {exp.category}
                    </span>

                    {/* Bookmark Button */}
                    {onToggleSave && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(exp, 'experience');
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-[#E0533C] transition"
                        title={isItemSaved(exp.id, 'experience') ? 'Saved' : 'Save Experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isItemSaved(exp.id, 'experience') ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                      </button>
                    )}

                    {/* Full-Screen Gallery Trigger */}
                    {onOpenGallery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const imgs = exp.images && exp.images.length > 0 ? exp.images : [exp.img];
                          onOpenGallery(imgs, 0, exp.title, exp.neighborhood);
                        }}
                        className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                        title="View Full-Screen Gallery"
                      >
                        <Images className="w-3 h-3" />
                        <span>Gallery</span>
                      </button>
                    )}

                    <span className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{exp.rating} ({exp.reviewCount || 42})</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#2D6A4F] transition line-clamp-1">
                      {exp.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                      <span>{exp.neighborhood} · {exp.duration || '2-3 hrs'}</span>
                    </p>

                    {/* Tags preview */}
                    {exp.tags && exp.tags.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto hide-scrollbar pt-1">
                        {exp.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-2">
                  <span className="font-black text-xs text-[#2D6A4F]">
                    {exp.price}
                  </span>
                  <span className="text-[11px] font-bold text-[#E0533C] flex items-center gap-1">
                    <span>Book Experience</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          FEATURED TRENDING EVENTS
          ======================================================== */}
      {(selectedDiscoveryCategory === 'all' || selectedDiscoveryCategory === 'events') && filteredEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E0533C] animate-pulse"></span>
              <span>Featured Trending Events</span>
            </h2>
            <button
              onClick={() => onOpenDedicatedViewAll('Featured Trending Events', 'events')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              View All ({filteredEvents.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onOpenEventDetails(evt)}
                className="w-64 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-[#E0533C] transition group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${evt.img}')` }}
                  >
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md">
                      {evt.date.split(',')[0]}
                    </span>

                    {/* Bookmark Button */}
                    {onToggleSave && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(evt, 'event');
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-[#E0533C] transition"
                        title={isItemSaved(evt.id, 'event') ? 'Saved' : 'Save Event'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isItemSaved(evt.id, 'event') ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                      </button>
                    )}

                    {onOpenGallery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const imgs = evt.images && evt.images.length > 0 ? evt.images : [evt.img];
                          onOpenGallery(imgs, 0, evt.title, evt.location);
                        }}
                        className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                        title="View Event Gallery"
                      >
                        <Images className="w-3 h-3" />
                        <span>Gallery</span>
                      </button>
                    )}

                    {evt.genre && (
                      <span className="absolute bottom-2.5 left-2.5 bg-[#E0533C] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                        {evt.genre}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition line-clamp-1">
                    {evt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                    <span>{evt.location}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {evt.goingCount} going
                  </span>
                  <span className="text-[11px] font-bold text-[#E0533C] flex items-center gap-1">
                    <span>Get Tickets</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          PLACES & HANGOUT VENUES
          ======================================================== */}
      {(selectedDiscoveryCategory === 'all' || selectedDiscoveryCategory === 'places') && filteredSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Popular Nairobi Spots & Rooftops</span>
            </h2>
            <button
              onClick={() => onOpenDedicatedViewAll('Top Hangout Spots', 'spots')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              View All ({filteredSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                className="w-64 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-amber-500 transition group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${spot.img}')` }}
                  >
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase">
                      {spot.category}
                    </span>

                    {/* Bookmark Button */}
                    {onToggleSave && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(spot, 'spot');
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-[#E0533C] transition"
                        title={isItemSaved(spot.id, 'spot') ? 'Saved' : 'Save Spot'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isItemSaved(spot.id, 'spot') ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                      </button>
                    )}

                    {onOpenGallery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const imgs = spot.images && spot.images.length > 0 ? spot.images : [spot.img];
                          onOpenGallery(imgs, 0, spot.title, spot.address);
                        }}
                        className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                        title="View Spot Gallery"
                      >
                        <Images className="w-3 h-3" />
                        <span>Gallery</span>
                      </button>
                    )}

                    <span className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{spot.rating} ({spot.reviewCount || spot.reviews?.length || 0})</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition line-clamp-1">
                    {spot.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                    <span>{spot.neighborhood} · {spot.price}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-[#E0533C]">
                    {spot.exactLocationTag ? '📍 Exact Pin' : 'Verified Venue'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <span>View Spot</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          LUKU FASHION & THRIFT DROPS
          ======================================================== */}
      {(selectedDiscoveryCategory === 'all' || selectedDiscoveryCategory === 'fashion') && filteredThrift.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Luku Fashion & Vintage Thrift Drops</span>
            </h2>
            <button
              onClick={() => onOpenDedicatedViewAll('Streetwear & Fits', 'thrift')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              View All ({filteredThrift.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredThrift.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenThriftDetails && onOpenThriftDetails(item)}
                className="w-56 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-emerald-500 transition group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${item.img}')` }}
                  >
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                      Size {item.size}
                    </span>

                    {/* Bookmark Button */}
                    {onToggleSave && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(item, 'thrift');
                        }}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:text-[#E0533C] transition"
                        title={isItemSaved(item.id, 'thrift') ? 'Saved' : 'Save Fit'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isItemSaved(item.id, 'thrift') ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                      </button>
                    )}

                    <span className="absolute bottom-2.5 left-2.5 bg-[#2D6A4F] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                      {item.condition}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#2D6A4F] transition line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.seller} · {item.storeLocation}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-2">
                  <span className="font-black text-xs text-[#2D6A4F]">
                    {item.price}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Inquire Fit →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          CINEMA SHOWTIMES (GARDEN CITY, SARIT, JUNCTION, TWO RIVERS)
          ======================================================== */}
      {filteredCinemaMovies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-blue-500" />
              <span>Cinema Movies & Showtimes</span>
            </h2>
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'sarit', label: 'Sarit' },
                { id: 'gardencity', label: 'Garden City' },
                { id: 'tworivers', label: 'Two Rivers' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCinemaLoc(c.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    selectedCinemaLoc === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredCinemaMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onBookCinema(movie)}
                className="w-56 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-blue-500 transition group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${movie.img}')` }}
                  >
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                      {movie.format}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 bg-blue-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                      {movie.locationName}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition line-clamp-1">
                    {movie.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {movie.times} · {movie.genre || 'Action'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between mt-2">
                  <span className="text-[10px] text-blue-500 font-bold">
                    Now Showing
                  </span>
                  <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">
                    Book Seats →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          COMMUNITY STATUS FEED & STORIES (Broadcast Nairobi Vibes)
          ======================================================== */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
              Nairobi Vibe Check & Live Updates
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Real-time status broadcast</span>
        </div>

        {/* Status Input Box */}
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-xs space-y-3">
          <textarea
            rows={2}
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="What's the move right now? Post a hangout update, party vibe, or ask the crowd..."
            className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 resize-none"
          />

          {statusMediaUrl && (
            <div className="relative inline-block">
              <img src={statusMediaUrl} alt="Attached media" className="w-20 h-20 rounded-xl object-cover border border-slate-300 dark:border-slate-700" />
              <button
                onClick={() => setStatusMediaUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px]"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 hover:text-[#E0533C] cursor-pointer transition">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => setShowStatusEmojiPicker(!showStatusEmojiPicker)}
                className={`p-2 rounded-xl transition ${
                  showStatusEmojiPicker 
                    ? 'bg-[#E0533C] text-white shadow-xs' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E0533C]'
                }`}
                title="Pick Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                📍 {statusLocation}
              </span>
            </div>

            <button
              onClick={handlePublishStatus}
              className="px-4 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Broadcast</span>
              <Send className="w-3 h-3" />
            </button>
          </div>

          {showStatusEmojiPicker && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <EmojiPicker
                isOpen={showStatusEmojiPicker}
                onSelectEmoji={(emoji) => setStatusText(prev => prev + emoji)}
                onClose={() => setShowStatusEmojiPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Status Stream */}
        <div className="space-y-3">
          {statuses.map((post) => (
            <div
              key={post.id}
              className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => onViewUserProfile({
                    name: post.author,
                    handle: post.handle,
                    avatar: post.avatar,
                    bio: 'Exploring Nairobi nightlife, music events, and great culinary spots.',
                    loc: post.locationName || 'Nairobi, Kenya',
                    relationshipStatus: 'single'
                  })}
                >
                  <div
                    className="w-9 h-9 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700 group-hover:scale-105 transition"
                    style={{ backgroundImage: `url('${post.avatar}')` }}
                  />
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition">
                      {post.author}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {post.handle} • {post.timeAgo}
                    </span>
                  </div>
                </div>

                {post.locationName && (
                  <span className="text-[10px] font-bold text-[#2D6A4F] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{post.locationName}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {post.text}
              </p>

              {post.mediaUrl && (
                <div className="rounded-2xl overflow-hidden max-h-64 border border-slate-200 dark:border-slate-800">
                  <img src={post.mediaUrl} alt="Status media" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setActiveReplyStatusId(activeReplyStatusId === post.id ? null : post.id)}
                  className="text-slate-500 hover:text-[#E0533C] font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.replies?.length || 0} Replies</span>
                </button>
              </div>

              {activeReplyStatusId === post.id && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                  {post.replies && post.replies.map((rep) => (
                    <div key={rep.id} className="flex items-start gap-2 text-xs bg-white dark:bg-[#121113] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div
                        className="w-6 h-6 rounded-full bg-cover bg-center shrink-0"
                        style={{ backgroundImage: `url('${rep.avatar}')` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{rep.author}</span>
                          <span className="text-[9px] text-slate-400">{rep.timeAgo}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{rep.text}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={replyInputText}
                      onChange={(e) => setReplyInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply(post.id)}
                      placeholder="Write a reply..."
                      className="flex-1 p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleSendReply(post.id)}
                      className="px-3 py-2 bg-[#E0533C] text-white rounded-xl text-xs font-bold"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
