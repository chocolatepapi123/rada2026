import { useUnclaimedSpots, spotInCategory, mergeSpots, sortTrending, formatOpeningHours } from '../lib/spotsFeed.ts';
import { resolveSpotBudget, budgetBadge } from '../lib/spotBudget.ts';
import { useLocationPreference, sortByProximity, NEIGHBORHOOD_COORDS, formatDistance, distanceKm, resolveNearestNeighborhood } from '../lib/geo.ts';
import { SPOT_CATEGORIES, getSpotCategoryIds } from '../lib/spotCategories.ts';
import { getSpotCategoryAccent, accentPillStyle, accentVars } from '../lib/spotAccentTheme.ts';
import { rankSpots, useNearYou } from '../lib/spotRanking.ts';
import { NearYouControl } from './NearYouControl.tsx';
import { pickTrendingSpots, isHomeSpot } from '../lib/trendingSpots.ts';
import { CinemaMovieSheet } from './CinemaExplorer.tsx';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getStoredLanguage, translations, type AppLanguage } from '../utils/i18n.ts';

const getDisplayHours = (hours: any, fallback = 'Open Daily'): string => {
  if (typeof hours === 'string' && hours.trim()) return hours;
  if (hours) {
    const formatted = formatOpeningHours(hours);
    if (formatted) return formatted;
  }
  return fallback;
};
import { searchNairobiLocations } from '../data/nairobiLocations.ts';
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
  UtensilsCrossed,
  Crown,
  Users,
  Ban,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MoreVertical,
  ChevronDown,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { EventItem, CinemaMovie, StatusPost, UserProfile, BusinessOffer, OfferCategory, SpotItem, SavedItem, BusinessAccount, isOfficialAdmin } from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';
import { AdminConfirmModal, AdminActionType, AdminTargetAccount } from './AdminConfirmModal.tsx';
import { deleteAccountAdmin, setUserSuspension, revokeBusinessStatus, fetchAdminUsers } from '../lib/cloudSync';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getCategoryBadgeStyle, 
  isDateToday 
} from '../utils/calendarUtils.ts';
import {
  eventMatchesCategory,
  eventMatchesSearch,
  getEventPriceLabel,
  getSourceLabel,
  sortEvents,
  isHappeningToday,
  isUpcoming,
  matchesDateFilter,
  matchesPriceFilter,
  compareByStart
} from '../utils/eventUtils.ts';

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
  isAdmin?: boolean;
  currentUserEmail?: string | null;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  businesses?: BusinessAccount[];
  currentLocation?: string;
  isGpsActive?: boolean;
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
  showToast,
  isAdmin = false,
  currentUserEmail,
  currentUserId,
  currentUserRole,
  businesses = [],
  currentLocation,
  isGpsActive
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCinemaLoc, setSelectedCinemaLoc] = useState('all');
  const [sheetMovie, setSheetMovie] = useState<CinemaMovie | null>(null);

  // Comprehensive Home Tab Modal Filters
  const [isHomeFilterModalOpen, setIsHomeFilterModalOpen] = useState(false);
  const [selectedHomeSection, setSelectedHomeSection] = useState<'all' | 'events' | 'spots' | 'cinemas' | 'offers' | 'statuses'>('all');
  const [selectedHomeCategory, setSelectedHomeCategory] = useState<string>('all');
  const [selectedHomeDate, setSelectedHomeDate] = useState<'all' | 'today' | 'tomorrow' | 'weekend' | 'week'>('all');
  const [selectedHomeArea, setSelectedHomeArea] = useState<string>('all');
  const [selectedHomeBudget, setSelectedHomeBudget] = useState<'all' | 'free' | 'Low' | 'Mid' | 'High'>('all');

  // Admin Account Management State
  const [isAdminAccountModalOpen, setIsAdminAccountModalOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState<'all' | 'merchants' | 'suspended' | 'admins'>('all');
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    actionType: AdminActionType;
    target: AdminTargetAccount;
  }>({
    isOpen: false,
    actionType: 'delete_account',
    target: { id: '', name: '' }
  });
  const [activeAdminMenuId, setActiveAdminMenuId] = useState<string | null>(null);

  // Load accounts for admin management
  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    async function loadAccounts() {
      try {
        const u = await fetchAdminUsers(businesses);
        if (isMounted && u && u.length > 0) {
          setAdminUsers(u);
        } else if (isMounted) {
          const fallbackMap = new Map<string, any>();
          statuses.forEach(st => {
            const h = st.handle || `@${(st.author || 'user').toLowerCase().replace(/\s+/g, '')}`;
            fallbackMap.set(h, {
              id: st.id,
              name: st.author,
              handle: h,
              email: `${h.replace('@', '')}@rada.app`,
              avatar: st.avatar,
              role: 'user',
              isMerchant: false,
              isSuspended: false,
              businessIds: []
            });
          });
          businesses.forEach(b => {
            fallbackMap.set(b.id, {
              id: b.ownerId || b.id,
              name: b.name,
              handle: `@${b.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              email: b.email,
              role: 'merchant',
              isMerchant: true,
              isSuspended: false,
              businessName: b.name,
              businessIds: [b.id]
            });
          });
          setAdminUsers(Array.from(fallbackMap.values()));
        }
      } catch (err) {
        console.warn('Admin users load error in HomeTab:', err);
      }
    }
    loadAccounts();
    return () => { isMounted = false; };
  }, [isAdmin, businesses, statuses]);

  const handleAdminTriggerAction = (actionType: AdminActionType, target: AdminTargetAccount) => {
    setActiveAdminMenuId(null);
    setConfirmModalConfig({
      isOpen: true,
      actionType,
      target
    });
  };

  const handleAdminConfirmAction = async (target: AdminTargetAccount, reason?: string) => {
    const { actionType } = confirmModalConfig;

    if (actionType === 'delete_account') {
      const res = await deleteAccountAdmin(target.id);
      if (res.error) {
        showToast(res.error);
        return;
      }
      setAdminUsers(prev => prev.filter(u => u.id !== target.id));
      showToast(`Account @${target.handle || target.name} permanently deleted.`);
      onRefreshFeed?.();
    } else if (actionType === 'suspend_account') {
      const err = await setUserSuspension(target.id, true, reason);
      if (err) {
        showToast(err);
        return;
      }
      setAdminUsers(prev => prev.map(u => u.id === target.id ? { ...u, isSuspended: true, suspendedReason: reason } : u));
      showToast(`Account @${target.handle || target.name} suspended.`);
      onRefreshFeed?.();
    } else if (actionType === 'unsuspend_account') {
      const err = await setUserSuspension(target.id, false);
      if (err) {
        showToast(err);
        return;
      }
      setAdminUsers(prev => prev.map(u => u.id === target.id ? { ...u, isSuspended: false } : u));
      showToast(`Account @${target.handle || target.name} reinstated.`);
      onRefreshFeed?.();
    } else if (actionType === 'revoke_business') {
      const err = await revokeBusinessStatus(target.id, reason);
      if (err) {
        showToast(err);
        return;
      }
      setAdminUsers(prev => prev.map(u => u.id === target.id ? { ...u, isMerchant: false } : u));
      showToast(`Merchant status revoked for ${target.name}.`);
      onRefreshFeed?.();
    } else if (actionType === 'delete_status') {
      if (onDeleteStatus) {
        onDeleteStatus(target.id);
      }
      showToast('Status post deleted.');
    } else if (actionType === 'delete_spot') {
      try {
        if (supabase) {
          await supabase.from('rada_listings').delete().eq('id', target.id);
        }
        setDbSpots(prev => prev.filter(s => String(s.id) !== String(target.id)));
        showToast(`Spot "${target.name}" deleted.`);
        onRefreshFeed?.();
      } catch (err: any) {
        showToast(err?.message || 'Could not delete spot.');
      }
    }
  };

  // Events Streamlined Modal Filters
  const [selectedEventPriceTier, setSelectedEventPriceTier] = useState('all');
  const [selectedEventDateRange, setSelectedEventDateRange] = useState('all');
  const [selectedEventCategory, setSelectedEventCategory] = useState<'all' | 'nightlife' | 'music' | 'tech' | 'art' | 'sports'>('all');
  const [showStatusEmojiPicker, setShowStatusEmojiPicker] = useState(false);

  // Offers state
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<'all' | OfferCategory>('all');

  // Events sorting state: Upcoming (date) vs Most Popular (going count)
  const [eventSortBy, setEventSortBy] = useState<'smart' | 'date' | 'popular'>('smart');

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
  const near = useNearYou();
  const [dbSpots, setDbSpots] = useState<any[]>([]);
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
        category: d.category || 'Hangouts & Leisure',
        neighborhood: d.neighborhood || 'Nearby',
        address: d.address || '',
        price: resolveSpotBudget(d),
        hasCoords: d.lat != null && d.lng != null,
        lat: d.lat ?? -1.2921,
        lng: d.lng ?? 36.8219,
        img: d.img || (d.images && d.images[0]) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      }));

    const merged = mergeSpots([...spots, ...extraDbSpots], unclaimedFeed);
    const allCombined = merged;

    // Compute live review counts and ratings from actual Supabase reviews
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
        : (sp.rating || 'New');

      return {
        ...sp,
        reviews: combinedRevs,
        reviewCount: totalReviews,
        baseRating: sp.rating,
        rating: calculatedRating,
        price: resolveSpotBudget(sp)
      };
    });

    // Default = premium-first (rating, reviews, real photos, verification). Near You = nearest first within radius.
    return rankSpots(enriched, { nearYou: near.active, origin: near.origin, radiusKm: near.radiusKm });
  }, [spots, dbSpots, unclaimedFeed, liveReviews, near.active, near.origin, near.radiusKm]);

  // Home only shows representable spots: a real photo, complete info and solid ratings.
  // Imported (unclaimed) spots need a real cover, 3+ photos, 4.0+ rating, 20+ reviews and an address.
  // Merchant-created spots only need a real photo. displaySpots is already ranked, so order is kept.
  const HOME_MAX_PER_CATEGORY = 30;
  const homeSpots = useMemo(() => displaySpots.filter(isHomeSpot), [displaySpots]);

  // "Trending Spots" rail: max 30 near the user, nearest -> farthest (shared with the View All page).
  const trendingSpots = useMemo(() => pickTrendingSpots(displaySpots, feedOrigin), [displaySpots, feedOrigin]);

  // Filtered spots for Home Tab based on active Home filters
  const homeFilteredSpots = useMemo(() => {
    // Searching looks through every spot; browsing only shows the representable set.
    const base = searchQuery.trim() ? displaySpots : homeSpots;
    return base.filter(sp => {
      if (selectedHomeCategory !== 'all' && !spotInCategory(sp, selectedHomeCategory)) return false;
      if (selectedHomeArea !== 'all') {
        const areaLower = selectedHomeArea.toLowerCase();
        const neigh = (sp.neighborhood || '').toLowerCase();
        const addr = (sp.address || '').toLowerCase();
        if (!neigh.includes(areaLower) && !addr.includes(areaLower)) return false;
      }
      if (selectedHomeBudget !== 'all' && resolveSpotBudget(sp) !== selectedHomeBudget) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (sp.title || '').toLowerCase().includes(q);
        const matchDesc = (sp.description || '').toLowerCase().includes(q);
        const matchNeigh = (sp.neighborhood || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchNeigh) return false;
      }
      return true;
    });
  }, [displaySpots, homeSpots, selectedHomeCategory, selectedHomeArea, selectedHomeBudget, searchQuery]);

  // Active language hook
  const [appLang, setAppLang] = useState<AppLanguage>(() => getStoredLanguage());
  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setAppLang(e.detail);
    };
    window.addEventListener('rada_language_changed', handleLangChange);
    return () => window.removeEventListener('rada_language_changed', handleLangChange);
  }, []);
  const t = translations[appLang];

  // Category rows data: all 17 RADA categories (category + extra_categories); Home only renders a few of them
  const spotsByCat = useMemo(() => {
    const out: Record<string, SpotItem[]> = {};
    for (const c of SPOT_CATEGORIES) out[c.id] = homeFilteredSpots.filter(sp => spotInCategory(sp, c.id)).slice(0, HOME_MAX_PER_CATEGORY) as SpotItem[];
    return out;
  }, [homeFilteredSpots]);

  // Uncapped counts, so "View All (N)" matches what the full list page shows.
  const spotsByCatTotal = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of SPOT_CATEGORIES) out[c.id] = homeFilteredSpots.filter(sp => spotInCategory(sp, c.id)).length;
    return out;
  }, [homeFilteredSpots]);

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

  // Exact location for "Where Are You At?" — user can search or type any exact spot, venue, or neighborhood
  const [statusLocation, setStatusLocation] = useState<string>(() => currentLocation || '');
  const [isStatusLocOpen, setIsStatusLocOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentLocation && !statusLocation) {
      setStatusLocation(currentLocation);
    }
  }, [currentLocation]);

  // Fast suggestions for exact location searchbox in status feed
  const statusLocSuggestions = useMemo(() => {
    const popularAreas = ['Westlands', 'Kilimani', 'Karen', 'CBD', 'Lavington', 'Kileleshwa', 'Gigiri', 'Parklands', 'Ngong Road', 'Ruaka'];
    const spotNames = (spots || []).slice(0, 8).map(s => `${s.title}, ${s.neighborhood}`);

    if (!statusLocation.trim()) {
      return Array.from(new Set([...spotNames, ...popularAreas])).slice(0, 8);
    }

    const q = statusLocation.toLowerCase();
    const matchedSpots = (spots || [])
      .filter(s => (s.title && s.title.toLowerCase().includes(q)) || (s.neighborhood && s.neighborhood.toLowerCase().includes(q)))
      .map(s => `${s.title}, ${s.neighborhood}`);

    const matchedPlaces = searchNairobiLocations(statusLocation).map(p => `${p.name}, ${p.neighborhood}`);
    return Array.from(new Set([...matchedSpots, ...matchedPlaces])).slice(0, 8);
  }, [spots, statusLocation]);

  // Daytime arrangement: 7:00 AM to 8:00 PM (7 <= hour < 20)
  const isDayTime = useMemo(() => {
    const hr = new Date().getHours();
    return hr >= 7 && hr < 20;
  }, []);

  // Active status replies drawer
  const [activeReplyStatusId, setActiveReplyStatusId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState('');

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
    const loc = statusLocation.trim() || currentLocation || 'Nairobi';
    onPostStatus(statusText.trim(), statusMediaUrl || undefined, loc);
    setStatusText('');
    setStatusMediaUrl(null);
    setShowStatusEmojiPicker(false);
    setIsStatusLocOpen(false);
  };

  const handleSendReply = (statusId: string) => {
    if (!replyInputText.trim()) return;
    onReplyStatus(statusId, replyInputText.trim());
    setReplyInputText('');
  };

  // Filter live events with real-time query, vibe, genre, price tier, date, category and Home filters
  const homeEventCategoryId = selectedEventCategory === 'art' ? 'arts' : selectedEventCategory;
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (!isUpcoming(e)) return false;
      const matchesVibe = selectedVibe === 'all' || e.category === selectedVibe;
      const genreText = `${e.genre || ''} ${e.title || ''} ${e.description || ''} ${(e.tags || []).join(' ')}`.toLowerCase();
      const matchesGenre = selectedGenre === 'all' || genreText.includes(selectedGenre.toLowerCase());

      // Home filters
      if (selectedHomeDate !== 'all' && !matchesDateFilter(e, selectedHomeDate)) return false;
      if (selectedHomeBudget !== 'all' && !matchesPriceFilter(e, selectedHomeBudget.toLowerCase())) return false;
      if (selectedHomeArea !== 'all' && !e.location.toLowerCase().includes(selectedHomeArea.toLowerCase())) return false;
      if (selectedHomeCategory !== 'all' && !eventMatchesCategory(e, selectedHomeCategory)) return false;

      return (
        matchesVibe &&
        matchesGenre &&
        matchesPriceFilter(e, selectedEventPriceTier) &&
        matchesDateFilter(e, selectedEventDateRange) &&
        eventMatchesCategory(e, homeEventCategoryId) &&
        eventMatchesSearch(e, searchQuery)
      );
    });
  }, [events, selectedVibe, selectedGenre, selectedEventPriceTier, selectedEventDateRange, homeEventCategoryId, searchQuery, selectedHomeDate, selectedHomeBudget, selectedHomeArea, selectedHomeCategory]);

  // Events Suite: soonest first (or cheapest when asked); capped for the home carousel
  const sortedEvents = useMemo(() => {
    if (eventSortBy === 'smart') return sortEvents(filteredEvents, 'smart');
    return [...filteredEvents].sort((a, b) => {
      if (eventSortBy === 'popular') {
        return (b.goingCount || 0) - (a.goingCount || 0) || compareByStart(a, b);
      }
      return compareByStart(a, b);
    });
  }, [filteredEvents, eventSortBy]);

  // Filter and sort cinema movies from near you silently
  const filteredCinemaMovies = useMemo(() => {
    const effectiveOrigin = feedOrigin || { lat: -1.2864, lng: 36.8172 };
    const getCinemaCoords = (m: CinemaMovie) => {
      const loc = (m.location || m.locationName || '').toLowerCase();
      if (loc.includes('sarit')) return { lat: -1.2635, lng: 36.8028 };
      if (loc.includes('westgate')) return { lat: -1.2582, lng: 36.8041 };
      if (loc.includes('two rivers')) return { lat: -1.2057, lng: 36.7745 };
      if (loc.includes('garden city')) return { lat: -1.2322, lng: 36.8778 };
      if (loc.includes('junction')) return { lat: -1.2989, lng: 36.7618 };
      if (loc.includes('prestige')) return { lat: -1.2982, lng: 36.7865 };
      if (loc.includes('diamond')) return { lat: -1.2612, lng: 36.8208 };
      if (loc.includes('panari')) return { lat: -1.3324, lng: 36.8576 };
      return { lat: -1.2864, lng: 36.8172 };
    };

    const res = cinemaMovies.filter(m => {
      const matchesLoc = selectedCinemaLoc === 'all' || m.location === selectedCinemaLoc;
      const matchesGenre = selectedGenre === 'all' || (m.genre && m.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
      
      if (!matchesLoc || !matchesGenre) return false;

      // Home area filter
      if (selectedHomeArea !== 'all') {
        const loc = (m.location || m.locationName || '').toLowerCase();
        if (!loc.includes(selectedHomeArea.toLowerCase())) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.locationName && m.locationName.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q)) ||
        (m.genre && m.genre.toLowerCase().includes(q))
      );
    });

    res.sort((a, b) => {
      const distA = distanceKm(effectiveOrigin, getCinemaCoords(a));
      const distB = distanceKm(effectiveOrigin, getCinemaCoords(b));
      return distA - distB;
    });

    return res;
  }, [cinemaMovies, selectedCinemaLoc, selectedGenre, searchQuery, feedOrigin, selectedHomeArea]);

  // Filter offers by category and search query
  const filteredOffers = useMemo(() => {
    return (offers || []).filter(o => {
      if (selectedOfferCategory !== 'all' && o.category !== selectedOfferCategory) return false;
      if (selectedHomeCategory !== 'all') {
        const cat = o.category.toLowerCase();
        const bCat = (o.businessCategory || '').toLowerCase();
        if (!cat.includes(selectedHomeCategory.toLowerCase()) && !bCat.includes(selectedHomeCategory.toLowerCase())) return false;
      }
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
  }, [offers, selectedOfferCategory, selectedHomeCategory, searchQuery]);

  // Admin users filtering
  const filteredAdminUsers = useMemo(() => {
    const q = adminUserSearch.trim().toLowerCase();
    return (adminUsers || []).filter(u => {
      if (adminUserFilter === 'admins' && u.role !== 'admin') return false;
      if (adminUserFilter === 'merchants' && !u.isMerchant && u.role !== 'merchant') return false;
      if (adminUserFilter === 'suspended' && !u.isSuspended && !u.is_suspended) return false;
      return !q || [u.name, u.username, u.handle, u.email, u.id].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [adminUsers, adminUserSearch, adminUserFilter]);

  const hasActiveHomeFilters = selectedHomeSection !== 'all' || selectedHomeCategory !== 'all' || selectedHomeDate !== 'all' || selectedHomeArea !== 'all' || selectedHomeBudget !== 'all' || selectedGenre !== 'all' || near.active;

  return (
    <section className="px-4 py-4 space-y-6 relative">
      {/* Admin Quick Control Banner on Home Tab */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 dark:from-purple-950/30 dark:via-amber-950/20 dark:to-orange-950/20 border border-purple-200/80 dark:border-purple-800/60 rounded-3xl p-3 shadow-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Admin Account Controls
                </span>
                <span className="text-[9px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Delete, suspend & moderate accounts with confirmation safety
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAdminAccountModalOpen(true)}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Accounts</span>
          </button>
        </div>
      )}

      {/* Search Bar & Clean Filters (Voice Search Removed) */}
      <div className="space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Kenyan events, venues, movies, or DJs..."
              className="w-full pl-10 pr-9 py-3 bg-white dark:bg-[#1C1A1E] border border-slate-300 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] shadow-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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

          {/* Clean Filter Icon Button relevant to Home Tab */}
          <button
            type="button"
            onClick={() => setIsHomeFilterModalOpen(true)}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
              hasActiveHomeFilters
                ? 'bg-[#E0533C] text-white border-[#E0533C] shadow-md'
                : 'bg-white dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
            title="Filter Home Feed (Sections, Vibes, Area, Date, Budget)"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveHomeFilters && (
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
        {hasActiveHomeFilters && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Active:</span>
            {selectedHomeSection !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shrink-0">
                <span className="capitalize">{selectedHomeSection}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHomeSection('all')} />
              </span>
            )}
            {selectedHomeCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0533C] text-white shrink-0">
                <span>{getSpotCategoryAccent(selectedHomeCategory).label}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHomeCategory('all')} />
              </span>
            )}
            {selectedHomeDate !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                <span>{selectedHomeDate}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHomeDate('all')} />
              </span>
            )}
            {selectedHomeArea !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F] text-white shrink-0">
                <span>{selectedHomeArea}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHomeArea('all')} />
              </span>
            )}
            {selectedHomeBudget !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shrink-0">
                <span>{selectedHomeBudget === 'Low' ? 'Budget $' : selectedHomeBudget === 'Mid' ? 'Mid $$' : selectedHomeBudget === 'High' ? 'Luxury $$$' : 'Free Entry'}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedHomeBudget('all')} />
              </span>
            )}
            {selectedGenre !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                <span>{selectedGenre.toUpperCase()}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGenre('all')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedHomeSection('all');
                setSelectedHomeCategory('all');
                setSelectedHomeDate('all');
                setSelectedHomeArea('all');
                setSelectedHomeBudget('all');
                setSelectedGenre('all');
                near.clear();
              }}
              className="text-[10px] text-[#E0533C] font-bold underline ml-1 cursor-pointer shrink-0"
            >
              Reset All
            </button>
          </div>
        )}

        {/* Comprehensive Home Tab Filter Modal */}
        {isHomeFilterModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setIsHomeFilterModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E0533C] flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Filter Nairobi Home Hub
                    </h3>
                    <p className="text-[10px] text-slate-400">Sections, vibes, areas, dates & budgets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHomeFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* What to show on Home Feed (Sections) */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>Show Sections:</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Feed' },
                    { id: 'events', label: '🎟️ Events' },
                    { id: 'spots', label: '📍 Hangouts' },
                    { id: 'cinemas', label: '🎬 Movies' },
                    { id: 'offers', label: '🔥 Offers' },
                    { id: 'statuses', label: '💬 Statuses' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedHomeSection(s.id as any)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer text-[11px] ${
                        selectedHomeSection === s.id
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Vibe Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Category & Vibe:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs max-h-56 overflow-y-auto pr-1">
                  {[{ id: 'all', label: 'All Vibes' }, ...SPOT_CATEGORIES].map((cat) => {
                    const isSel = selectedHomeCategory === cat.id;
                    const acc = cat.id === 'all' ? null : getSpotCategoryAccent(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedHomeCategory(cat.id)}
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

              {/* Exact Location Searchbox */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>Exact Location / Area:</span>
                  </span>
                  {selectedHomeArea !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedHomeArea('all')}
                      className="text-[10px] font-bold text-[#E0533C] hover:underline cursor-pointer"
                    >
                      Reset to All
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={selectedHomeArea === 'all' ? '' : selectedHomeArea}
                    onChange={(e) => setSelectedHomeArea(e.target.value.trim() ? e.target.value : 'all')}
                    placeholder="Search exact area (e.g. Westlands, Kilimani, Karen)..."
                    className="w-full pl-9 pr-8 py-2 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E0533C]"
                  />
                  {selectedHomeArea !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedHomeArea('all')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Popular exact area quick picks */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {['Westlands', 'Kilimani', 'Karen', 'CBD', 'Lavington', 'Ngong Road'].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedHomeArea(selectedHomeArea === area ? 'all' : area)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        selectedHomeArea.toLowerCase() === area.toLowerCase()
                          ? 'bg-[#E0533C] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>When (Events & Shows):</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Today' },
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'weekend', label: 'This Weekend' },
                    { id: 'week', label: 'Next 7 Days' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedHomeDate(d.id as any)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer text-[11px] ${
                        selectedHomeDate === d.id
                          ? 'bg-[#E0533C] text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Budget / Price Range:</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'free', label: 'Free' },
                    { id: 'Low', label: 'Budget $' },
                    { id: 'Mid', label: 'Mid $$' },
                    { id: 'High', label: 'Luxury $$$' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedHomeBudget(p.id as any)}
                      className={`p-2 rounded-xl font-bold transition text-center cursor-pointer text-[11px] ${
                        selectedHomeBudget === p.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHomeSection('all');
                    setSelectedHomeCategory('all');
                    setSelectedHomeDate('all');
                    setSelectedHomeArea('all');
                    setSelectedHomeBudget('all');
                    setSelectedGenre('all');
                    near.clear();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsHomeFilterModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#E0533C] text-white rounded-xl text-xs font-black shadow-md hover:bg-orange-700 transition cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Accounts Quick Manager Modal */}
        {isAdminAccountModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setIsAdminAccountModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-[#1C1A1E] w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Admin Account Management
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Moderate, suspend, or delete accounts with confirmation safeguards
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminAccountModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Filter pills */}
              <div className="space-y-2 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    placeholder="Search accounts by name, handle, email, ID..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
                  {[
                    { id: 'all', label: 'All Accounts' },
                    { id: 'merchants', label: 'Merchants' },
                    { id: 'suspended', label: 'Suspended' },
                    { id: 'admins', label: 'Admins' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminUserFilter(tab.id as any)}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] transition cursor-pointer ${
                        adminUserFilter === tab.id
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
                {filteredAdminUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                    No accounts matching search criteria
                  </div>
                ) : (
                  filteredAdminUsers.map((u: any) => {
                    const isSuspended = u.isSuspended || u.is_suspended;
                    const isTargetOfficial = isOfficialAdmin(u.email);
                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121113] flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 overflow-hidden shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              (u.name || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                {u.name || 'Unnamed Account'}
                              </span>
                              {u.role === 'admin' && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 uppercase">
                                  Admin
                                </span>
                              )}
                              {u.isMerchant && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 uppercase">
                                  Merchant
                                </span>
                              )}
                              {isSuspended && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 uppercase">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.handle || u.username || u.email || u.id}
                            </p>
                          </div>
                        </div>

                        {/* Account Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isTargetOfficial && (
                            <>
                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => handleAdminTriggerAction('unsuspend_account', u)}
                                  className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Reinstate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAdminTriggerAction('suspend_account', u)}
                                  className="px-2 py-1 bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}

                              {u.isMerchant && (
                                <button
                                  type="button"
                                  onClick={() => handleAdminTriggerAction('revoke_business', u)}
                                  className="px-2 py-1 bg-orange-100 dark:bg-orange-950/50 hover:bg-orange-200 text-[#E0533C] text-[11px] font-bold rounded-lg transition cursor-pointer"
                                  title="Revoke Merchant Privileges"
                                >
                                  Revoke
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAdminTriggerAction('delete_account', u)}
                                className="p-1.5 bg-red-100 dark:bg-red-950/50 hover:bg-red-200 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                                title="Delete Account Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Admin Confirmation Modal */}
        <AdminConfirmModal
          isOpen={confirmModalConfig.isOpen}
          actionType={confirmModalConfig.actionType}
          target={confirmModalConfig.target}
          onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={handleAdminConfirmAction}
        />
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
      {(selectedHomeSection === 'all' || selectedHomeSection === 'offers') && filteredOffers.length > 0 && (
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
                  <img loading="lazy" decoding="async"
                    src={offer.posterUrl || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop'}
                    alt={offer.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-[#E0533C] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide">
                      {offer.discount}
                    </span>
                    <span className="bg-black/60 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-white/20">
                      {offer.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave?.(offer, 'offer');
                    }}
                    className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer z-10 shadow-sm ${
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

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleAdminTriggerAction('revoke_business', {
                          id: offer.businessId,
                          name: offer.businessName,
                          businessName: offer.businessName,
                          isMerchant: true
                        })}
                        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800 transition shrink-0 cursor-pointer"
                        title="Admin: Revoke Merchant Status"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Trending Events Section with Category Filter */}
      {(selectedHomeSection === 'all' || selectedHomeSection === 'events') && (selectedVibe === 'all' || selectedVibe === 'concerts' || selectedVibe === 'nightlife' || selectedVibe === 'art') && (
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
                View More ({events.length})
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
              {sortedEvents.slice(0, 12).map((evt) => {
                const isToday = isHappeningToday(evt);
                const priceDisplay = getEventPriceLabel(evt);
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
                      style={evt.img ? { backgroundImage: `url('${evt.img}')` } : undefined}
                    >
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
                        <span className="bg-black/60 text-white text-[9px] font-black px-2.5 py-1 rounded-md">
                          {evt.date.split(',')[0]}
                        </span>
                        {isToday && (
                          <span className="bg-emerald-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            <span>Happening Today</span>
                          </span>
                        )}
                      </div>
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md shadow-xs ${badgeStyle.bg} ${badgeStyle.text}`}>
                          {evt.genre || evt.category}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSave?.(evt, 'event');
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
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
                        <span className="bg-black/75 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-white/10">
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
                      {evt.goingCount > 0 ? `${evt.goingCount} going` : (getSourceLabel(evt.source) ? `via ${getSourceLabel(evt.source)}` : 'New')}
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
              {sortedEvents.length > 12 && (
                <button
                  type="button"
                  onClick={() => onOpenDedicatedViewAll('Featured Trending Events', 'events')}
                  className="flex flex-col items-center justify-center gap-2 w-40 shrink-0 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-[#F8F8F6] dark:bg-[#1C1A1E] text-[#E0533C] font-black text-xs cursor-pointer hover:border-[#E0533C] transition"
                >
                  <span className="text-2xl leading-none">→</span>
                  <span>View {sortedEvents.length - 12} more</span>
                  <span className="text-[10px] text-slate-400 font-bold">search & filter all</span>
                </button>
              )}
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
      {(selectedHomeSection === 'all' || selectedHomeSection === 'cinemas') && (selectedVibe === 'all' || selectedVibe === 'cinemas') && filteredCinemaMovies.length > 0 && (
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
                onClick={() => setSheetMovie(movie)}
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
                      <span className="absolute bottom-2 left-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
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
                    setSheetMovie(movie);
                  }}
                  className="mt-3 w-full py-2 bg-[#2D6A4F] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Showtimes & Tickets</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          4A. SPOTS NEAR YOU / TRENDING (LIVE SUPABASE DATABASE)
          ======================================================== */}
      {(selectedHomeSection === 'all' || selectedHomeSection === 'spots') && trendingSpots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 text-[#E0533C] flex items-center justify-center shadow-xs">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  Trending Spots
                </h2>
              </div>
            </div>
            <button
              onClick={() => onOpenDedicatedViewAll('Trending Spots', 'spots')}
              className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
            >
              View All ({trendingSpots.length})
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {trendingSpots.map((spot) => {
              const saved = isSaved(spot.id, 'spot');
              const reviewCount = spot.reviews?.length ?? (spot.reviewCount || 0);
              const hasReviews = reviewCount > 0;
              const spotAccent = getSpotCategoryAccent(getSpotCategoryIds(spot)[0] || spot.category);
              return (
                <div
                  key={spot.id}
                  onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                  style={accentVars(spotAccent)}
                  className="w-72 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer transition group"
                >
                  <div>
                    <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                        style={{ backgroundImage: `url('${spot.img}')` }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave?.(spot, 'spot');
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs z-10 ${
                          saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={saved ? 'Remove from saved' : 'Save experience'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
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
                      </p>

                      <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-[#E0533C] font-bold">
                      {getDisplayHours(spot.openingHours, 'Open Daily')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminTriggerAction('delete_spot', {
                              id: String(spot.id),
                              name: spot.title,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                          title="Admin: Delete Spot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSpotDetails && onOpenSpotDetails(spot);
                        }}
                        className="px-3 py-1.5 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)] hover:opacity-90 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Explore</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          4B & 4C & 4D. DAY/NIGHT DYNAMIC CATEGORIES
          Nighttime (8pm-7am): Restaurants and dinner, clubs and lounges, then the rest
          Daytime (7am-8pm): Action and sports, Nature trails, Tech and gaming, Creative & leisure, Restaurants, Cafés, Clubs
          ======================================================== */}
      {(() => {
        const renderCategoryRow = (
          key: string,
          title: string,
          catKey: string,
          IconComp: any,
          spotsList: SpotItem[],
          accentColor: string,
          _badgeText?: string
        ) => {
          if ((selectedHomeSection !== 'all' && selectedHomeSection !== 'spots') || spotsList.length === 0) return null;
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]" style={{ ...accentVars({ color: accentColor }), backgroundColor: `${accentColor}20` }}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDedicatedViewAll(title, catKey)}
                  className="text-[11px] font-bold text-[#E0533C] hover:underline cursor-pointer"
                >
                  {t.viewAll} ({spotsByCatTotal[catKey] ?? spotsList.length})
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {spotsList.map((spot) => {
                  const saved = isSaved(spot.id, 'spot');
                  return (
                    <div
                      key={spot.id}
                      onClick={() => onOpenSpotDetails && onOpenSpotDetails(spot)}
                      style={accentVars({ color: accentColor })}
                      className="w-72 bg-white dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shrink-0 shadow-sm flex flex-col justify-between cursor-pointer transition group"
                    >
                      <div>
                        <div className="h-44 rounded-2xl relative overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                          <div
                            className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-all duration-300"
                            style={{ backgroundImage: `url('${spot.img}')` }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSave?.(spot, 'spot');
                            }}
                            className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs z-10 ${
                              saved ? 'bg-[#E0533C] text-white' : 'bg-black/60 text-white hover:bg-black/80'
                            }`}
                            title={saved ? 'Remove from saved' : 'Save experience'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
                          </button>
                          <span className="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
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
                              <span>{spot.rating}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                            <span className="truncate">{spot.address || spot.neighborhood}</span>
                          </p>

                          <p className="text-[11px] text-[#475569] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                            {spot.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[color:var(--accent-text)] dark:text-[color:var(--accent-ink)]">
                          {getDisplayHours(spot.openingHours, 'Open Daily')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSpotDetails && onOpenSpotDetails(spot);
                          }}
                          className="px-3 py-1.5 bg-[var(--accent)] dark:bg-[var(--accent-deep)] text-[color:var(--accent-on)] dark:text-[color:var(--accent-ink)] border border-transparent dark:border-[color:var(--accent-line)] hover:opacity-90 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>{t.explore}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };

        const NIGHT_ORDER = ['restaurants', 'nyama_choma', 'clubs_lounges', 'bars_chill', 'rooftops', 'date_spots', 'desserts', 'fast_food', 'hangouts_leisure', 'gaming_arcades', 'arts_culture', 'cafes_bakeries', 'hotels_stays', 'getaways_resorts', 'sports_adventure', 'outdoors_nature', 'garden_hangouts'];
        const DAY_ORDER = ['sports_adventure', 'outdoors_nature', 'garden_hangouts', 'gaming_arcades', 'arts_culture', 'cafes_bakeries', 'restaurants', 'nyama_choma', 'fast_food', 'desserts', 'hangouts_leisure', 'getaways_resorts', 'hotels_stays', 'rooftops', 'date_spots', 'bars_chill', 'clubs_lounges'];
        const order = !isDayTime ? NIGHT_ORDER : DAY_ORDER;
        const allIds = [...order, ...SPOT_CATEGORIES.map(c => c.id).filter(id => !order.includes(id))];
        // Streamlined Home: only the first few categories (time-of-day order) that actually have spots.
        // A category picked in the Home filter always shows; the full list lives in the Spots tab.
        const HOME_CATEGORY_ROWS = 6;
        const ids = selectedHomeCategory !== 'all'
          ? [selectedHomeCategory]
          : allIds.filter(id => (spotsByCat[id] || []).length > 0).slice(0, HOME_CATEGORY_ROWS);

        return (
          <>
            {/* Near You (device geolocation) */}
            {(selectedHomeSection === 'all' || selectedHomeSection === 'spots') && <NearYouControl />}
            {ids.map(id => {
              const acc = getSpotCategoryAccent(id);
              return renderCategoryRow(id, acc.label, id, acc.Icon, spotsByCat[id] || [], acc.color, acc.label);
            })}
          </>
        );
      })()}

      {/* ========================================================
          5. LIVE COMMUNITY STATUS FEED - "Where Are You At?" (Last bottom)
          ======================================================== */}
      {(selectedHomeSection === 'all' || selectedHomeSection === 'statuses') && (
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

          {/* Post Creation Box - Compacted, Clean, No Cramped Phone GPS, Searchbox for Exact Location */}
          <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs mt-0.5">
                W
              </div>
              <textarea
                rows={2}
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What spot are you at right now? Share vibes or tips..."
                className="flex-1 bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>

            {/* Exact Location Searchbox */}
            <div className="relative">
              <div className="relative flex items-center">
                <MapPin className="w-3.5 h-3.5 text-[#E0533C] absolute left-2.5 pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={statusLocation}
                  onChange={(e) => {
                    setStatusLocation(e.target.value);
                    setIsStatusLocOpen(true);
                  }}
                  onFocus={() => setIsStatusLocOpen(true)}
                  placeholder="Search exact spot or location (e.g. Alchemist, Westlands)..."
                  className="w-full pl-8 pr-7 py-2 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E0533C]"
                />
                {statusLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusLocation('');
                      setIsStatusLocOpen(true);
                    }}
                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear location"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Exact Location Suggestions Popup */}
              {isStatusLocOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Suggested Exact Locations</span>
                    <button
                      type="button"
                      onClick={() => setIsStatusLocOpen(false)}
                      className="text-[#E0533C] hover:underline"
                    >
                      Done
                    </button>
                  </div>
                  {statusLocSuggestions.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setStatusLocation(loc);
                        setIsStatusLocOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-[#E0533C] flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                        <span className="truncate">{loc}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {myStatusId && (
              <p className="text-[10px] text-slate-500 font-medium">
                Posting replaces your current live status. Statuses disappear after 12 hours.
              </p>
            )}

            {statusMediaUrl && (
              <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                <img loading="lazy" decoding="async" src={statusMediaUrl} alt="Status upload" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setStatusMediaUrl(null)}
                  className="absolute top-1 right-1 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Compact Bottom Bar: Camera, Emoji on Left, Post on Right */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1">
                <label className="cursor-pointer p-1.5 text-slate-500 hover:text-[#E0533C] transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" title="Attach Photo">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleMediaUpload} />
                </label>

                <button
                  type="button"
                  onClick={() => setShowStatusEmojiPicker(!showStatusEmojiPicker)}
                  className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                    showStatusEmojiPicker ? 'text-[#E0533C] bg-orange-50 dark:bg-orange-950/40' : 'text-slate-500 hover:text-[#E0533C] hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Pick Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handlePublishStatus}
                className="px-4 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <span>Post</span>
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
                    <img loading="lazy" decoding="async" src={post.mediaUrl} alt="Status media" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Action Buttons: Reply + Admin controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveReplyStatusId(activeReplyStatusId === post.id ? null : post.id)}
                    className="text-slate-500 hover:text-[#E0533C] font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{post.replies?.length || 0} Replies</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Admin Moderation Shortcuts */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-xl border border-purple-200 dark:border-purple-900">
                        <span className="text-[9px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Admin
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdminTriggerAction('delete_status', {
                            id: post.id,
                            name: post.author,
                            handle: post.handle
                          })}
                          className="p-1 text-slate-500 hover:text-red-600 rounded transition cursor-pointer"
                          title="Admin: Delete Status Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminTriggerAction('suspend_account', {
                            id: (post as any).userId || post.author,
                            name: post.author,
                            handle: post.handle
                          })}
                          className="p-1 text-slate-500 hover:text-amber-600 rounded transition cursor-pointer"
                          title="Admin: Suspend Author Account"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminTriggerAction('delete_account', {
                            id: (post as any).userId || post.author,
                            name: post.author,
                            handle: post.handle
                          })}
                          className="p-1 text-slate-500 hover:text-red-600 rounded transition cursor-pointer"
                          title="Admin: Permanently Delete Author Account"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

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
      )}
      {sheetMovie && (
        <CinemaMovieSheet
          movie={sheetMovie}
          allMovies={cinemaMovies}
          onBookMovie={onBookCinema}
          onClose={() => setSheetMovie(null)}
        />
      )}
    </section>
  );
};
