import { useUnclaimedSpots, spotInCategory, mergeSpots, sortTrending } from '../lib/spotsFeed.ts';
import { resolveSpotBudget, budgetBadge } from '../lib/spotBudget.ts';
import { useLocationPreference, sortByProximity, NEIGHBORHOOD_COORDS, formatDistance } from '../lib/geo.ts';
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  SlidersHorizontal, 
  Smile, 
  Bookmark, 
  Trees, 
  Palette, 
  Gamepad2, 
  RefreshCw, 
  Trash2, 
  Compass, 
  Star,
  UtensilsCrossed
} from 'lucide-react';
import { EventItem, CinemaMovie, StatusPost, UserProfile, BusinessOffer, OfferCategory, SpotItem, SavedItem } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getEventPriceDisplay, 
  getCategoryBadgeStyle, 
  isDateToday 
} from '../utils/calendarUtils.ts';

interface HomeTabProps {
  events: EventItem[];
  cinemaMovies: CinemaMovie[];
  statuses: StatusPost[];
  offers?: BusinessOffer[];
  spots?: SpotItem[];
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'offer') => void;
  onRefreshFeed?: () => Promise<void> | void;
  onOpenSpotDetails?: (spot: SpotItem) => void;
  onOpenEventDetails: (event: EventItem) => void;
  onBookCinema: (movie: CinemaMovie) => void;
  onPostStatus: (text: string, mediaUrl?: string, locationName?: string) => void;
  onReplyStatus: (statusId: string, text: string) => void;
  onDeleteStatus?: (statusId: string) => void;
  myStatusId?: string;
  onViewUserProfile: (profile: UserProfile) => void;
  onOpenDedicatedViewAll: (title: string, category: string) => void;
  onOpenCreateEvent?: (initialTitle?: string) => void;
  onOpenSuggestSpot?: () => void;
  onOpenBusinessProfile?: (businessId: string) => void;
  showToast: (msg: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  events,
  cinemaMovies,
  statuses,
  offers = [],
  spots = [],
  savedItems = [],
  onToggleSave,
  onRefreshFeed,
  onOpenSpotDetails,
  onOpenEventDetails,
  onBookCinema,
  onPostStatus,
  onReplyStatus,
  onDeleteStatus,
  myStatusId,
  onViewUserProfile,
  onOpenDedicatedViewAll,
  onOpenCreateEvent,
  onOpenSuggestSpot,
  onOpenBusinessProfile,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCinemaLoc, setSelectedCinemaLoc] = useState('all');
  const [isListening, setIsListening] = useState(false);

  // Events Streamlined Modal Filters
  const [isEventFilterModalOpen, setIsEventFilterModalOpen] = useState(false);
  const [selectedEventPriceTier, setSelectedEventPriceTier] = useState('all');
  const [selectedEventDateRange, setSelectedEventDateRange] = useState('all');
  const [selectedEventCategory, setSelectedEventCategory] = useState<'all' | 'nightlife' | 'music' | 'tech' | 'art' | 'sports'>('all');
  const [showStatusEmojiPicker, setShowStatusEmojiPicker] = useState(false);

  // Offers state
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<'all' | OfferCategory>('all');

  // Events sorting state: Upcoming (date) vs Most Popular (going count)
  const [eventSortBy, setEventSortBy] = useState<'date' | 'popular'>('date');

  // Outdoor & Social Activity sub-category filter
  const [selectedActivityCategory, setSelectedActivityCategory] = useState<'all' | 'nature' | 'art' | 'gaming' | 'adrenaline'>('all');

  // Universal Bookmark Checker
  const isSaved = (id: string | number, kind: 'spot' | 'event' | 'offer') => {
    return savedItems.some(s => String(s.id) === String(id) && s.kind === kind);
  };

  // Explicit refresh only (Refresh Feed button). No pull-down gesture.
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real spots from Supabase (unclaimedspots + merchant-created) for the Home feed
  const { spots: unclaimedFeed } = useUnclaimedSpots();
  // Home feed is ordered by distance from the device (or a picked neighborhood)
  const { pref: locPref, setPref: setLocPref, origin: feedOrigin, status: locStatus, requestGps } = useLocationPreference();
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
        console.warn('Error connecting to Supabase spots/reviews for Home feed:', err);
      }
    }

    fetchLiveReviewsAndSpots();

    // Supabase Realtime listener on spots & listings
    let channel: any = null;
    try {
      if (supabase && typeof supabase.channel === 'function') {
        channel = supabase
          .channel('home-spots-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, () => {
            fetchLiveReviewsAndSpots();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rada_listings' }, () => {
            fetchLiveReviewsAndSpots();
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription error on Home tab:', e);
    }

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    };
  }, []);

  // Merged live spots combining Supabase database rows + props with verified reviews
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
        neighborhood: d.neighborhood || 'Nearby',
        address: d.address || '',
        price: resolveSpotBudget(d),
        hasCoords: d.lat != null && d.lng != null,
        lat: d.lat ?? -1.2921,
        lng: d.lng ?? 36.8219,
        img: d.img || (d.images && d.images[0]) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      }));

    const merged = mergeSpots([...spots, ...extraDbSpots], unclaimedFeed);
    const allCombined = feedOrigin ? sortByProximity(merged, feedOrigin) : sortTrending(merged);

    // Compute live review counts and ratings from actual Supabase reviews
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
        : (sp.rating || 'New');

      return {
        ...sp,
        reviews: combinedRevs,
        reviewCount: totalReviews,
        rating: calculatedRating,
        price: resolveSpotBudget(sp)
      };
    });
  }, [spots, dbSpots, unclaimedFeed, liveReviews, feedOrigin]);

  // Category rows: strictly the 10 RADA categories (no keyword guessing)
  const natureSpots = useMemo(() => displaySpots.filter(s => spotInCategory(s, 'nature')), [displaySpots]);
  const creativeSpots = useMemo(() => displaySpots.filter(s => spotInCategory(s, 'creative_leisure')), [displaySpots]);
  const techGamingSpots = useMemo(() => displaySpots.filter(s => spotInCategory(s, 'tech_gaming')), [displaySpots]);
  const actionSportsSpots = useMemo(() => displaySpots.filter(s => spotInCategory(s, 'action_sports')), [displaySpots]);

  const handleVisitSpot = (offer: BusinessOffer) => {
    // 1. Check if there is a corresponding spot in displaySpots
    const matchingSpot = displaySpots.find(
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
  const [statusLocation, setStatusLocation] = useState('Westlands');

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

  // Filter events with real-time query, vibe, genre, price tier, and date
  const filteredEvents = events.filter(e => {
    const matchesVibe = selectedVibe === 'all' || e.category === selectedVibe;
    const matchesGenre = selectedGenre === 'all' || (e.genre && e.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

    // Price tier filtering
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

    // Date range filtering
    let matchesDate = true;
    if (selectedEventDateRange === 'today') {
      matchesDate = e.date.toLowerCase().includes('today') || e.date.toLowerCase().includes('14 oct');
    } else if (selectedEventDateRange === 'weekend') {
      matchesDate = e.date.toLowerCase().includes('sat') || e.date.toLowerCase().includes('sun') || e.date.toLowerCase().includes('weekend') || e.date.toLowerCase().includes('17 oct') || e.date.toLowerCase().includes('18 oct');
    }

    // Event Category Filtering
    let matchesEventCategory = true;
    if (selectedEventCategory === 'nightlife') {
      const text = `${e.category || ''} ${e.genre || ''} ${e.title || ''} ${e.description || ''}`.toLowerCase();
      matchesEventCategory = e.category === 'nightlife' || text.includes('party') || text.includes('rave') || text.includes('club') || text.includes('amapiano') || text.includes('afro-house') || text.includes('house & techno') || text.includes('nightlife');
    } else if (selectedEventCategory === 'music') {
      const text = `${e.category || ''} ${e.genre || ''} ${e.title || ''} ${e.description || ''}`.toLowerCase();
      matchesEventCategory = e.category === 'concerts' || text.includes('live') || text.includes('concert') || text.includes('band') || text.includes('acoustic') || text.includes('jazz') || text.includes('soul') || text.includes('afrobeats') || text.includes('music');
    } else if (selectedEventCategory === 'tech') {
      const text = `${e.category || ''} ${e.genre || ''} ${e.title || ''} ${e.description || ''}`.toLowerCase();
      matchesEventCategory = e.category === 'tech' || text.includes('tech') || text.includes('gaming') || text.includes('game') || text.includes('vr') || text.includes('esports') || text.includes('hackathon');
    } else if (selectedEventCategory === 'art') {
      const text = `${e.category || ''} ${e.genre || ''} ${e.title || ''} ${e.description || ''}`.toLowerCase();
      matchesEventCategory = e.category === 'art' || text.includes('art') || text.includes('visual') || text.includes('culture') || text.includes('fashion') || text.includes('streetwear') || text.includes('sneaker') || text.includes('food & wine') || text.includes('tasting');
    } else if (selectedEventCategory === 'sports') {
      const text = `${e.category || ''} ${e.genre || ''} ${e.title || ''} ${e.description || ''}`.toLowerCase();
      matchesEventCategory = e.category === 'sports' || text.includes('sport') || text.includes('fitness') || text.includes('run') || text.includes('marathon') || text.includes('derby') || text.includes('race') || text.includes('football') || text.includes('tournament');
    }

    if (!matchesVibe || !matchesGenre || !matchesPrice || !matchesDate || !matchesEventCategory) return false;

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

  // Events Suite: Upcoming events sorted by date/popularity
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      if (eventSortBy === 'popular') {
        return (b.goingCount || 0) - (a.goingCount || 0);
      }
      // Date sort: "Today" first, then upcoming dates, then popularity as secondary
      const aIsToday = a.date.toLowerCase().includes('today') || a.date.toLowerCase().includes('14 oct');
      const bIsToday = b.date.toLowerCase().includes('today') || b.date.toLowerCase().includes('14 oct');
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      return (b.goingCount || 0) - (a.goingCount || 0);
    });
  }, [filteredEvents, eventSortBy]);

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
    <section className="px-4 py-4 space-y-6 relative">
      {/* Search Bar with Web Speech API & Waveform Animation */}
      <div className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Kenyan events, venues, movies, or DJs..."
              className="w-full pl-10 pr-20 py-3 bg-white dark:bg-[#1C1A1E] border border-slate-300 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] shadow-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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

          {/* Clean Filter Icon Button (Replaces top genre pill row) */}
          <button
            type="button"
            onClick={() => setIsEventFilterModalOpen(true)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
              selectedGenre !== 'all' || selectedEventDateRange !== 'all' || selectedEventPriceTier !== 'all'
                ? 'bg-[#E0533C] text-white border-[#E0533C] shadow-md'
                : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
            title="Filter Events (Date, Price, Expanded Genres)"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {(selectedGenre !== 'all' || selectedEventDateRange !== 'all' || selectedEventPriceTier !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-white ml-1.5" />
            )}
          </button>

          {/* Refresh Feed Button (explicit refresh) */}
          <button
            type="button"
            onClick={async () => {
              setIsRefreshing(true);
              try {
                if (onRefreshFeed) {
                  await onRefreshFeed();
                } else {
                  await new Promise(r => setTimeout(r, 600));
                }
                showToast('Feed refreshed ✨');
              } finally {
                setIsRefreshing(false);
              }
            }}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-[#E0533C] hover:border-slate-300 ${
              isRefreshing ? 'opacity-80' : ''
            }`}
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#E0533C]' : ''}`} />
          </button>
        </div>

        {/* Active Filter Indicators */}
        {(selectedGenre !== 'all' || selectedEventDateRange !== 'all' || selectedEventPriceTier !== 'all') && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active:</span>
            {selectedGenre !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0533C] text-white">
                <span>{selectedGenre.toUpperCase()}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGenre('all')} />
              </span>
            )}
            {selectedEventDateRange !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <span>{selectedEventDateRange}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedEventDateRange('all')} />
              </span>
            )}
            {selectedEventPriceTier !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F] text-white">
                <span>{selectedEventPriceTier}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedEventPriceTier('all')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedGenre('all');
                setSelectedEventDateRange('all');
                setSelectedEventPriceTier('all');
              }}
              className="text-[10px] text-[#E0533C] font-bold underline ml-1 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}

        {/* Streamlined Events & Entertainment Filter Modal */}
        {isEventFilterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E0533C] flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Filter Events & Movies
                    </h3>
                    <p className="text-[10px] text-slate-400">Date, price tier & expanded genres</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEventFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date Filter Options */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>When:</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Happening Today' },
                    { id: 'weekend', label: 'This Weekend' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedEventDateRange(d.id)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        selectedEventDateRange === d.id
                          ? 'bg-[#E0533C] text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Tier Options */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Price / Budget:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'free', label: 'Free Entry / RSVP' },
                    { id: 'under1k', label: 'Under KES 1,000' },
                    { id: '1k-3k', label: 'KES 1,000 - 3,000' },
                    { id: '3k+', label: 'VIP (KES 3,000+)' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedEventPriceTier(p.id)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        selectedEventPriceTier === p.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expanded Genres */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-purple-500" />
                  <span>Genre & Style:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Genres' },
                    { id: 'hip hop', label: 'Hip Hop & Rap' },
                    { id: 'afrobeats', label: 'Afrobeats' },
                    { id: 'amapiano', label: 'Amapiano' },
                    { id: 'gengetone', label: 'Gengetone' },
                    { id: 'reggae', label: 'Reggae & Dancehall' },
                    { id: 'electronic', label: 'Electronic & Tech' },
                    { id: 'acoustic', label: 'Acoustic & Live Bands' },
                    { id: 'sci-fi', label: 'Sci-Fi' },
                    { id: 'action', label: 'Action Movies' },
                    { id: 'comedy', label: 'Comedy' },
                    { id: 'animation', label: 'Animation' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGenre(g.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        selectedGenre === g.id
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGenre('all');
                    setSelectedEventDateRange('all');
                    setSelectedEventPriceTier('all');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsEventFilterModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#E0533C] text-white rounded-xl text-xs font-black shadow-md hover:bg-orange-700 transition cursor-pointer"
                >
                  Apply Filters ({filteredEvents.length} events)
                </button>
              </div>
            </div>
          </div>
        )}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#E0533C] to-amber-400 flex items-center justify-center text-white shadow-xs">
                <Flame className="w-3 h-3 fill-white" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                Running Offers & Promotions
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Running Offers & Promotions', 'offers')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({filteredOffers.length})
            </button>
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
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave?.(offer, 'offer');
                    }}
                    className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md z-10 shadow-sm ${
                      isSaved(offer.id, 'offer')
                        ? 'bg-[#E0533C] text-white'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title={isSaved(offer.id, 'offer') ? 'Remove bookmark' : 'Bookmark this offer'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved(offer.id, 'offer') ? 'fill-white' : ''}`} />
                  </button>

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
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover/biz:text-[#E0533C] transition truncate max-w-[150px]">
                        {offer.businessName}
                      </span>
                      <BusinessBadge businessId={offer.businessId} category={offer.businessCategory} size="xs" />
                    </div>

                    <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                      {offer.description}
                    </p>
                  </div>

                  {/* Customized CTA Button: View Tickets or Visit Spot */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {(() => {
                      const isEventOffer = offer.category === 'Tickets' || offer.businessCategory === 'event_organizer';

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

      {/* Featured Trending Events Section with Category Filter */}
      {(selectedVibe === 'all' || selectedVibe === 'concerts' || selectedVibe === 'nightlife' || selectedVibe === 'art') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E0533C]"></span>
              <span>Featured Trending Events</span>
            </h2>
            <div className="flex items-center gap-2">
              {selectedEventCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedEventCategory('all')}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Show All Events
                </button>
              )}
              <button
                onClick={() => onOpenDedicatedViewAll('Featured Trending Events', 'events')}
                className="text-[11px] font-bold text-[#E0533C] hover:underline"
              >
                View All ({events.length})
              </button>
            </div>
          </div>

          {/* Scrollable Event Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
            {[
              { id: 'all' as const, label: 'All Events' },
              { id: 'nightlife' as const, label: 'Parties & Nightlife' },
              { id: 'music' as const, label: 'Live Music' },
              { id: 'tech' as const, label: 'Tech & Gaming' },
              { id: 'art' as const, label: 'Art & Culture' },
              { id: 'sports' as const, label: 'Sports & Fitness' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedEventCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition text-xs cursor-pointer ${
                  selectedEventCategory === cat.id
                    ? 'bg-[#E0533C] text-white shadow-xs'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Active Filter Indicators if any */}
          {(selectedEventCategory !== 'all' || selectedGenre !== 'all' || selectedEventPriceTier !== 'all' || selectedEventDateRange !== 'all') && (
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-[11px]">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Active Filters:</span>
              {selectedEventCategory !== 'all' && (
                <span className="bg-[#E0533C]/10 text-[#E0533C] px-2.5 py-0.5 rounded-full font-bold">
                  {selectedEventCategory === 'nightlife' && 'Parties & Nightlife'}
                  {selectedEventCategory === 'music' && 'Live Music'}
                  {selectedEventCategory === 'tech' && 'Tech & Gaming'}
                  {selectedEventCategory === 'art' && 'Art & Culture'}
                  {selectedEventCategory === 'sports' && 'Sports & Fitness'}
                </span>
              )}
              {selectedGenre !== 'all' && (
                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedGenre}
                </span>
              )}
              {selectedEventPriceTier !== 'all' && (
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedEventPriceTier}
                </span>
              )}
              {selectedEventDateRange !== 'all' && (
                <span className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedEventDateRange}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedEventCategory('all');
                  setSelectedGenre('all');
                  setSelectedEventPriceTier('all');
                  setSelectedEventDateRange('all');
                }}
                className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {filteredEvents.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {filteredEvents.map((evt) => {
                const isToday = evt.date.toLowerCase().includes('today') || evt.date.toLowerCase().includes('14 oct');
                const priceDisplay = getEventPriceDisplay(evt.tiers);
                const badgeStyle = getCategoryBadgeStyle(evt.category, evt.genre);

                return (
                <div
                  key={evt.id}
                  onClick={() => onOpenEventDetails(evt)}
                  className="event-card flex flex-col justify-between w-64 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm cursor-pointer hover:border-[#E0533C] transition group"
                >
                  <div>
                    <div
                      className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-2.5 bg-cover bg-center relative overflow-hidden"
                      style={{ backgroundImage: `url('${evt.img}')` }}
                    >
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md">
                          {evt.date.split(',')[0]}
                        </span>
                        {isToday && (
                          <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            <span>Happening Today</span>
                          </span>
                        )}
                      </div>
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md shadow-xs backdrop-blur-md ${badgeStyle.bg} ${badgeStyle.text}`}>
                          {evt.genre || evt.category}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSave?.(evt, 'event');
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs ${
                            isSaved(evt.id, 'event')
                              ? 'bg-[#E0533C] text-white'
                              : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                          title={isSaved(evt.id, 'event') ? 'Remove bookmark' : 'Bookmark this event'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved(evt.id, 'event') ? 'fill-white' : ''}`} />
                        </button>
                      </div>

                      {/* Ticket price badge on thumbnail */}
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-black/75 backdrop-blur-md text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-white/10">
                          {priceDisplay}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition">
                      {evt.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#E0533C] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{evt.date} • {evt.time || 'Evening'}</span>
                    </p>
                    <p className="text-[10px] text-[#475569] dark:text-slate-300 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#475569] dark:text-slate-300">
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
              );
            })}
            </div>
          ) : (
            /* Sleek Empty State Card for Day View */
            <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] mx-auto flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                  No events scheduled for this day
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Check back soon or explore trending events!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventCategory('all')}
                className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Explore Trending Events</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CENTURY CINEMAX SHOWINGS (Official Posters, Showtime by Date removed, Movie Genre filter added) */}
      {(selectedVibe === 'all' || selectedVibe === 'cinemas') && filteredCinemaMovies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#2D6A4F]" />
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
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
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-800'
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
                className="cinema-card flex flex-col justify-between w-52 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-2.5 shrink-0 shadow-sm cursor-pointer hover:border-[#2D6A4F] transition group"
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
                  <p className="text-[10px] text-[#475569] dark:text-slate-300 mt-0.5 flex items-center gap-1">
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

      {/* ========================================================
          4A. SPOTS NEAR YOU / TRENDING (LIVE SUPABASE DATABASE)
          ======================================================== */}
      {displaySpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-[#E0533C] flex items-center justify-center shadow-xs">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  {feedOrigin ? 'Spots Near You' : 'Trending Spots'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll(feedOrigin ? 'Spots Near You' : 'Trending Spots', 'spots')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({displaySpots.length})
            </button>
          </div>


          {/* Location for the feed: device GPS or a chosen neighborhood */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <MapPin className="w-3 h-3 text-[#E0533C]" />
              <span>Near</span>
              <select
                value={locPref}
                onChange={(e) => setLocPref(e.target.value)}
                className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold"
              >
                <option value="gps">My location</option>
                {Object.keys(NEIGHBORHOOD_COORDS).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            {locPref === 'gps' && locStatus === 'asking' && (
              <span className="text-[10px] text-slate-400">Finding you…</span>
            )}
            {locPref === 'gps' && (locStatus === 'denied' || locStatus === 'unavailable') && (
              <span className="text-[10px] text-slate-500">
                Location is off.{' '}
                <button type="button" onClick={requestGps} className="font-bold text-[#E0533C] hover:underline cursor-pointer">Try again</button>
                {' '}or pick an area.
              </span>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {displaySpots.slice(0, 20).map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
              const hasReviews = reviewCount > 0;
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#E0533C] transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Compass className="w-2.5 h-2.5 text-orange-400" />
                        <span className="capitalize">{spot.category?.replace(/_/g, ' ') || 'Hangout'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {budgetBadge(resolveSpotBudget(spot)) || spot.price}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-[#E0533C] transition">
                          {spot.title}
                        </h4>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{hasReviews ? spot.rating : 'New'}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                        <span className="truncate">{spot.address || spot.neighborhood}</span>
                        {spot.distanceKm != null && (
                          <span className="shrink-0 font-bold text-[#E0533C]">• {formatDistance(spot.distanceKm)}</span>
                        )}
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-[#E0533C] font-bold">
                      {spot.openingHours || 'Open Daily'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotDetails && onOpenSpotDetails(spot);
                      }}
                      className="px-3 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          4B. NATURE TRAILS AND OUTDOOR
          (Hiking, nature trails, waterfalls, mountains, and outdoor groups)
          ======================================================== */}
      {natureSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Trees className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                Nature trails and outdoor
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Nature trails and outdoor', 'nature')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({natureSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {natureSpots.map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#2D6A4F] transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Trees className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Nature & Trails</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {budgetBadge(resolveSpotBudget(spot)) || spot.price}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition">
                          {spot.title}
                        </h4>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{spot.rating}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{spot.address || spot.neighborhood}</span>
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {spot.openingHours || 'Open Daily'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotDetails && onOpenSpotDetails(spot);
                      }}
                      className="px-3 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          4D. ACTION & SPORTS CATEGORY
          (Go-karting, bowling, paintball, tactical sports)
          ======================================================== */}
      {actionSportsSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                Action and sports
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Action and sports', 'action_sports')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({actionSportsSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {actionSportsSpots.map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-orange-500 transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-orange-400" />
                        <span>Action & Adrenaline</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {budgetBadge(resolveSpotBudget(spot)) || spot.price}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-orange-600 transition">
                          {spot.title}
                        </h4>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{spot.rating}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="truncate">{spot.address || spot.neighborhood}</span>
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">
                      {spot.openingHours || 'Open Daily'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotDetails && onOpenSpotDetails(spot);
                      }}
                      className="px-3 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ========================================================
          4C. TECH & GAMING CATEGORY
          (VR arcades, gaming lounges, tech entertainment)
          ======================================================== */}
      {techGamingSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                <Gamepad2 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                Tech and gaming
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Tech and gaming', 'tech_gaming')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({techGamingSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {techGamingSpots.map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-cyan-500 transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Gamepad2 className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Tech & VR</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {budgetBadge(resolveSpotBudget(spot)) || spot.price}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-cyan-600 transition">
                          {spot.title}
                        </h4>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{spot.rating}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span className="truncate">{spot.address || spot.neighborhood}</span>
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
                      {spot.openingHours || 'Open Daily'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotDetails && onOpenSpotDetails(spot);
                      }}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Play</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          4B. CREATIVE & LEISURE CATEGORY
          (Paint & sip, crafting, pottery, social craft workshops)
          ======================================================== */}
      {creativeSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                Creative and leisure
              </h2>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Creative and leisure', 'creative_leisure')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({creativeSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {creativeSpots.map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-500 transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Palette className="w-2.5 h-2.5 text-purple-400" />
                        <span>Creative</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {budgetBadge(resolveSpotBudget(spot)) || spot.price}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 transition">
                          {spot.title}
                        </h4>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{spot.rating}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate">{spot.address || spot.neighborhood}</span>
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      {spot.openingHours || 'Open Weekend'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotDetails && onOpenSpotDetails(spot);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          5. LIVE COMMUNITY STATUS FEED - "Where Are You At?" (Last bottom)
          ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Where Are You At?</span>
          </h2>
          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Community Feed</span>
          </span>
        </div>

        {/* Post Creation Box */}
        <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-3">
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

          {myStatusId && (
            <p className="text-[10px] text-slate-500 font-medium">
              You already have a live status. Broadcasting again replaces it. Statuses disappear after 12 hours.
            </p>
          )}

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
            <div className="flex items-center gap-1.5">
              <label className="cursor-pointer p-1.5 text-slate-500 hover:text-[#E0533C] transition" title="Attach Photo">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleMediaUpload} />
              </label>

              <button
                type="button"
                onClick={() => setShowStatusEmojiPicker(!showStatusEmojiPicker)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showStatusEmojiPicker ? 'text-[#E0533C] bg-orange-50 dark:bg-orange-950/40' : 'text-slate-500 hover:text-[#E0533C]'
                }`}
                title="Pick Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
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

          {/* Expanded Emoji Picker for Status Updates */}
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
              className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => onViewUserProfile({
                    name: post.author,
                    handle: post.handle,
                    avatar: post.avatar,
                    bio: 'Exploring nightlife, music events, and great culinary spots.',
                    loc: post.locationName || 'Kenya',
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
                    <span className="text-[10px] text-slate-500">
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

              <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-normal">
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

                {myStatusId === post.id && onDeleteStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete your status?')) onDeleteStatus(post.id);
                    }}
                    className="text-slate-500 hover:text-red-600 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    title="Delete Status"
                    aria-label="Delete status"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Status</span>
                  </button>
                )}
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
