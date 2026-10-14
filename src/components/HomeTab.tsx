import React, { useState } from 'react';
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
  ShoppingBag
} from 'lucide-react';
import { EventItem, CinemaMovie, StatusPost, UserProfile, BusinessOffer, OfferCategory, SpotItem } from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';

interface HomeTabProps {
  events: EventItem[];
  cinemaMovies: CinemaMovie[];
  statuses: StatusPost[];
  offers?: BusinessOffer[];
  spots?: SpotItem[];
  onOpenSpotDetails?: (spot: SpotItem) => void;
  onOpenEventDetails: (event: EventItem) => void;
  onBookCinema: (movie: CinemaMovie) => void;
  onPostStatus: (text: string, mediaUrl?: string, locationName?: string) => void;
  onReplyStatus: (statusId: string, text: string) => void;
  onViewUserProfile: (profile: UserProfile) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateEvent?: (initialTitle?: string) => void;
  onOpenBusinessProfile?: (businessId: string) => void;
  showToast: (msg: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  events,
  cinemaMovies,
  statuses,
  offers = [],
  spots = [],
  onOpenSpotDetails,
  onOpenEventDetails,
  onBookCinema,
  onPostStatus,
  onReplyStatus,
  onViewUserProfile,
  onOpenDedicatedViewAll,
  onOpenCreateEvent,
  onOpenBusinessProfile,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCinemaLoc, setSelectedCinemaLoc] = useState('all');
  const [isListening, setIsListening] = useState(false);

  // Featured Events Advanced Filters
  const [eventGenreFilter, setEventGenreFilter] = useState('all');
  const [eventDateFilter, setEventDateFilter] = useState('');

  // Offers state
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<'all' | OfferCategory>('all');

  const handleVisitSpot = (offer: BusinessOffer) => {
    // 1. Check if there is a corresponding spot in spots
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

    // 2. Open merchant storefront profile (shows physical address, bus stop/directions, contact & catalog)
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
  };

  const handleSendReply = (statusId: string) => {
    if (!replyInputText.trim()) return;
    onReplyStatus(statusId, replyInputText.trim());
    setReplyInputText('');
  };

  // Filter events with real-time query, vibe, genre, and date
  const filteredEvents = events.filter(e => {
    const matchesVibe = selectedVibe === 'all' || e.category === selectedVibe;
    const matchesGenre = selectedGenre === 'all' || (e.genre && e.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
    const matchesEventGenre = eventGenreFilter === 'all' || (e.genre && e.genre.toLowerCase().includes(eventGenreFilter.toLowerCase()));

    // Date filtering (e.g. 2026-10-25 -> "25 Oct")
    let matchesDate = true;
    if (eventDateFilter) {
      const parts = eventDateFilter.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        const dNum = parseInt(parts[2], 10);
        const searchPattern = `${dNum} ${months[mIdx]}`;
        matchesDate = e.date.toLowerCase().includes(searchPattern.toLowerCase());
      }
    }
    
    if (!matchesVibe || !matchesGenre || !matchesEventGenre || !matchesDate) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      (e.genre && e.genre.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.artists && e.artists.some(a => a.name.toLowerCase().includes(q)))
    );
  });

  // Filter cinema movies (Showtime by date removed, movie genre filter added)
  const filteredCinemaMovies = cinemaMovies.filter(m => {
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

  // Filter offers by category and search query
  const filteredOffers = (offers || []).filter(o => {
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

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Search Bar with Web Speech API & Waveform Animation */}
      <div className="space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Nairobi events, venues, movies, or DJs..."
            className="w-full pl-10 pr-24 py-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] shadow-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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

        {/* Vibe Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Vibes' },
            { id: 'concerts', label: 'Concerts & Live' },
            { id: 'nightlife', label: 'Nightlife & Clubs' },
            { id: 'cinemas', label: 'Cinemas' },
            { id: 'art', label: 'Art & Culture' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedVibe(pill.id)}
              className={`px-4 py-2 rounded-full text-xs shrink-0 transition-all ${
                selectedVibe === pill.id
                  ? 'bg-[#E0533C] text-white font-black shadow-sm'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Movie/Event Genre Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Music className="w-3 h-3" /> Genre:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'afrobeats', label: 'Afrobeats' },
            { id: 'amapiano', label: 'Amapiano' },
            { id: 'electronic', label: 'Electronic / Tech' },
            { id: 'acoustic', label: 'Acoustic / Live' },
            { id: 'sci-fi', label: 'Sci-Fi' },
            { id: 'action', label: 'Action' },
            { id: 'comedy', label: 'Comedy' },
            { id: 'animation', label: 'Animation' }
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={`px-3 py-1 rounded-full text-[11px] shrink-0 transition ${
                selectedGenre === g.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-800'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty Search Result State for Home Tab */}
      {filteredEvents.length === 0 && filteredCinemaMovies.length === 0 && filteredOffers.length === 0 && (
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E0533C] mx-auto flex items-center justify-center font-black">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
              No events, movie showtimes or offers found for "{searchQuery}"
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Are you an event organizer or promoter? Publish this event live on RADA!
            </p>
          </div>
          <button
            onClick={() => onOpenCreateEvent ? onOpenCreateEvent(searchQuery) : showToast('Open Business Hub to publish an event')}
            className="px-5 py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event "{searchQuery || 'New Showcase'}"</span>
          </button>
        </div>
      )}

      {/* ========================================================
          RUNNING OFFERS & PROMOTIONS FEED (SPEC 4)
          ======================================================== */}
      {filteredOffers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#E0533C] to-amber-400 flex items-center justify-center text-white shadow-xs">
              <Flame className="w-3 h-3 fill-white" />
            </div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-slate-200">
              Running Offers & Promotions
            </h2>
          </div>

          {/* Offer Category Filter System */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: 'all', label: 'All Deals' },
              { id: 'Tickets', label: 'Tickets' },
              { id: 'Food', label: 'Food' },
              { id: 'Drinks', label: 'Drinks' },
              { id: 'Apparel', label: 'Apparel' },
              { id: 'Special Deals', label: 'Special Deals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedOfferCategory(tab.id as any)}
                className={`px-3 py-1 rounded-full text-[11px] shrink-0 font-bold transition cursor-pointer ${
                  selectedOfferCategory === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
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

                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-[10px] text-amber-300 font-bold">{offer.validUntil}</p>
                    <h3 className="text-sm font-black text-white line-clamp-1 mt-0.5">{offer.title}</h3>
                  </div>
                </div>

                {/* Offer Details & Actions */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    {/* Merchant Attribution with Tailored Verification Badge */}
                    <div 
                      onClick={() => onOpenBusinessProfile && onOpenBusinessProfile(offer.businessId)}
                      className="flex items-center justify-between cursor-pointer group/biz"
                    >
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover/biz:text-[#E0533C] transition truncate max-w-[150px]">
                        {offer.businessName}
                      </span>
                      <MerchantVerificationBadge category={offer.businessCategory} size="xs" />
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {offer.description}
                    </p>
                  </div>

                  {/* Customized CTA Button: View Tickets, Visit Shop, or Visit Spot */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {(() => {
                      const isEventOffer = offer.category === 'Tickets' || offer.businessCategory === 'event_organizer';
                      const isThriftOffer = offer.category === 'Apparel' || offer.businessCategory === 'thrift_store';

                      if (isEventOffer) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const matchingEvent = events.find(
                                e => e.businessId === offer.businessId || 
                                     e.title.toLowerCase().includes(offer.title.toLowerCase()) ||
                                     offer.title.toLowerCase().includes(e.title.toLowerCase())
                              );
                              if (matchingEvent) {
                                onOpenEventDetails(matchingEvent);
                              } else {
                                onOpenDedicatedViewAll('Featured Trending Events', 'events');
                              }
                            }}
                            className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            title={`View Tickets: ${offer.title}`}
                          >
                            <Ticket className="w-3.5 h-3.5 shrink-0" />
                            <span>View Tickets</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        );
                      }

                      if (isThriftOffer) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenBusinessProfile) {
                                onOpenBusinessProfile(offer.businessId);
                              } else {
                                onOpenDedicatedViewAll('Streetwear & Fits', 'thrift');
                              }
                            }}
                            className="flex-1 py-2 px-3 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            title={`Visit Shop: ${offer.businessName}`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                            <span>Visit Shop</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => handleVisitSpot(offer)}
                          className="flex-1 py-2 px-3 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                          title={`Visit Spot: ${offer.businessName}`}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Visit Spot</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => onOpenBusinessProfile && onOpenBusinessProfile(offer.businessId)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition shrink-0"
                      title="View Merchant Profile"
                    >
                      <Store className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Trending Events Section */}
      {(selectedVibe === 'all' || selectedVibe === 'concerts' || selectedVibe === 'nightlife' || selectedVibe === 'art') && filteredEvents.length > 0 && (
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

          {/* ADVANCED EVENT FILTERS: Genre Pills & Date/Month Date-Picker */}
          <div className="space-y-2 bg-[#F8F8F6] dark:bg-[#1C1A1E] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Genre Pills Row */}
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Genres' },
                { id: 'amapiano', label: 'Amapiano' },
                { id: 'afrobeats', label: 'Afrobeats' },
                { id: 'house', label: 'House & Techno' },
                { id: 'live', label: 'Live Bands' },
                { id: 'food', label: 'Food & Wine' },
                { id: 'art', label: 'Visual Arts' },
                { id: 'fashion', label: 'Fashion & Pop-ups' },
                { id: 'jazz', label: 'Live Jazz' }
              ].map(genre => (
                <button
                  key={genre.id}
                  onClick={() => setEventGenreFilter(genre.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
                    eventGenreFilter === genre.id
                      ? 'bg-[#E0533C] text-white shadow-xs'
                      : 'bg-white dark:bg-[#121113] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>

            {/* Date/Month Filter */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/70 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Date / Month Filter:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={eventDateFilter}
                  onChange={(e) => setEventDateFilter(e.target.value)}
                  className="bg-white dark:bg-[#121113] text-slate-800 dark:text-slate-200 text-xs px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#E0533C]"
                />
                {eventDateFilter && (
                  <button
                    type="button"
                    onClick={() => setEventDateFilter('')}
                    className="text-[10px] text-red-500 font-bold hover:underline px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onOpenEventDetails(evt)}
                className="event-card flex flex-col justify-between w-64 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-[#E0533C] transition group"
              >
                <div>
                  <div
                    className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url('${evt.img}')` }}
                  >
                    <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md">
                      {evt.date.split(',')[0]}
                    </span>
                    {evt.genre && (
                      <span className="absolute top-2.5 right-2.5 bg-[#E0533C] text-white text-[9px] font-black px-2.5 py-1 rounded-md shadow-xs">
                        {evt.genre}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition">
                    {evt.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-[#E0533C] mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{evt.date}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{evt.location}</span>
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500">
                    {evt.goingCount} going
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEventDetails(evt);
                    }}
                    className="px-3 py-1.5 bg-[#E0533C] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-700 transition"
                  >
                    Get Tickets
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CENTURY CINEMAX SHOWINGS (Official Posters, Showtime by Date removed, Movie Genre filter added) */}
      {(selectedVibe === 'all' || selectedVibe === 'cinemas') && filteredCinemaMovies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#2D6A4F]" />
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Century Cinemax Showings
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Century Cinemax Movies', 'cinemas')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline"
            >
              All Movies ({filteredCinemaMovies.length})
            </button>
          </div>

          {/* Mall Location Pills */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: 'all', label: 'All Malls' },
              { id: 'gardencity', label: 'Garden City IMAX' },
              { id: 'sarit', label: 'Sarit Centre' },
              { id: 'junction', label: 'Junction Mall' },
              { id: 'tworivers', label: 'Two Rivers Mall' }
            ].map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedCinemaLoc(loc.id)}
                className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition ${
                  selectedCinemaLoc === loc.id
                    ? 'bg-[#2D6A4F] text-white font-black shadow-xs'
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>

          {/* Movies Carousel with Official Posters & Genres */}
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {filteredCinemaMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onBookCinema(movie)}
                className="cinema-card flex flex-col justify-between w-52 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-2.5 shrink-0 shadow-sm cursor-pointer hover:border-[#2D6A4F] transition group"
              >
                <div>
                  <div
                    className="h-60 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden shadow-xs"
                    style={{ backgroundImage: `url('${movie.img}')` }}
                  >
                    <span className="absolute top-2 right-2 bg-[#2D6A4F] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                      {movie.format}
                    </span>
                    {movie.genre && (
                      <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {movie.genre}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-xs line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-[#2D6A4F] transition">
                    {movie.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-[#E0533C] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{movie.locationName}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{movie.times}</span>
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookCinema(movie);
                  }}
                  className="mt-3 w-full py-2 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Book & Sync Vault</span>
                  <Ticket className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE COMMUNITY STATUS FEED - "Where Are You At?" */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Where Are You At?</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">Live Hangout Feed</span>
        </div>

        {/* Post Creation Box */}
        <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-black text-xs shrink-0">
              W
            </div>
            <textarea
              rows={2}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What spot are you at right now? Share vibes, DJs, or crowd tips..."
              className="flex-1 bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none"
            />
          </div>

          {statusMediaUrl && (
            <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
              <img src={statusMediaUrl} alt="Status upload" className="w-full h-full object-cover" />
              <button
                onClick={() => setStatusMediaUrl(null)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer p-1.5 text-slate-500 hover:text-[#E0533C] transition">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleMediaUpload} />
              </label>
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                📍 {statusLocation}
              </span>
            </div>

            <button
              onClick={handlePublishStatus}
              className="px-4 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <span>Broadcast</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
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

              {/* Action Buttons: Reply */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setActiveReplyStatusId(activeReplyStatusId === post.id ? null : post.id)}
                  className="text-slate-500 hover:text-[#E0533C] font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.replies?.length || 0} Replies</span>
                </button>
              </div>

              {/* Replies Drawer */}
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
