import { siteOrigin } from '../lib/siteUrl';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { track } from '../lib/tracking';
import { logPlatformEvent } from '../lib/platformAnalytics';
import { useActivePromotions, outingRankMap, sortOutingsByPromotion } from '../lib/promotions';
import { isDemoMode } from '../lib/demoMode.ts';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Search, 
  CheckCircle2, 
  Heart, 
  Sparkles, 
  Filter, 
  X, 
  Check, 
  ChevronRight, 
  Ticket,
  Share2, 
  Link2, 
  Compass, 
  AlertCircle,
  Building2,
  CalendarPlus,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  UserCheck,
  MessageSquare,
  ImagePlus,
  Loader2,
  Bookmark
} from 'lucide-react';
import { OutingPlan, OutingAttendee, SpotItem, UserProfile } from '../types.ts';
import { shareContent } from '../utils/shareUtils.ts';
import OutingShareCard from './OutingShareCard';
import HostTicketsPanel from './HostTicketsPanel';
import TicketBuySheet from './TicketBuySheet';
import MyTicketsSheet from './MyTicketsSheet';
import { fetchTicketSummaries, type TicketSummary } from '../lib/ticketsBuyer';
import { WaitlistButton, TemplatePicker } from './OutingExtras';
import { uploadCoverImage } from '../lib/cloudSync.ts';
import { useUnclaimedSpots, mergeSpots, sortTrending } from '../lib/spotsFeed.ts';
import { HostBadge } from './VerifiedBadge.tsx';
import { fetchMySavedOutingIds, toggleOutingSave, fetchOutingSaveCounts } from '../lib/outingSaves';
import {
  PLAN_META,
  attendeeCeiling,
  clampAttendees,
  countOutingsThisMonth,
  fetchMyOutingUsage,
  getOutingQuota,
  useMySubscriptions,
} from '../lib/subscriptions';

export const NAIROBI_KEY_LOCATIONS = [
  'All Locations',
  'Westlands',
  'Kilimani',
  'Karen',
  'Nairobi CBD',
  'Kiambu Road',
  'Lavington',
  'Lang\'ata',
  'Parklands',
  'Ngong Road',
  'Ruiru / Thika Road'
] as const;

export const RADA_10_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'restaurants_dining', label: 'Restaurants / Dining' },
  { id: 'tech_gaming', label: 'Tech / Gaming' },
  { id: 'clubs_lounges', label: 'Clubs / Lounges' },
  { id: 'nature', label: 'Nature' },
  { id: 'action_sports', label: 'Action / Sports' },
  { id: 'cafes_bakeries', label: 'Cafes / Bakeries' },
  { id: 'date_spots', label: 'Date Spots' },
  { id: 'creative_leisure', label: 'Creative / Leisure' },
  { id: 'hotels_luxury', label: 'Hotels & Luxury' },
  { id: 'vacation_escapes', label: 'Vacation Escapes' }
] as const;

function matchOutingCategory(plan: OutingPlan, categoryId: string, spot?: SpotItem): boolean {
  if (categoryId === 'all') return true;

  const planCat = (plan.spotCategory || '').toLowerCase();
  const spotCat = (spot?.category || '').toLowerCase();
  const spotTitle = (spot?.title || plan.spotTitle || '').toLowerCase();

  switch (categoryId) {
    case 'restaurants_dining':
      return (
        planCat.includes('restaurant') ||
        planCat.includes('dining') ||
        spotCat.includes('restaurant') ||
        spotCat.includes('dining') ||
        spotCat.includes('food') ||
        spotTitle.includes('kitchen') ||
        spotTitle.includes('grill')
      );
    case 'tech_gaming':
      return (
        planCat.includes('tech') ||
        planCat.includes('gaming') ||
        spotCat.includes('tech') ||
        spotCat.includes('gaming') ||
        spotCat.includes('arcade') ||
        spotCat.includes('vr') ||
        spotTitle.includes('vr') ||
        spotTitle.includes('gaming')
      );
    case 'clubs_lounges':
      return (
        planCat.includes('club') ||
        planCat.includes('lounge') ||
        planCat.includes('nightlife') ||
        spotCat.includes('club') ||
        spotCat.includes('lounge') ||
        spotCat.includes('nightlife') ||
        spotCat.includes('bar') ||
        spotTitle.includes('bar') ||
        spotTitle.includes('alchemist')
      );
    case 'nature':
      return (
        planCat.includes('nature') ||
        planCat.includes('outdoor') ||
        spotCat.includes('nature') ||
        spotCat.includes('outdoor') ||
        spotCat.includes('connect_with_nature') ||
        spotTitle.includes('forest') ||
        spotTitle.includes('trail') ||
        spotTitle.includes('karura') ||
        spotTitle.includes('hike') ||
        spotTitle.includes('arboretum')
      );
    case 'action_sports':
      return (
        planCat.includes('action') ||
        planCat.includes('sport') ||
        planCat.includes('fitness') ||
        spotCat.includes('action') ||
        spotCat.includes('sport') ||
        spotCat.includes('fitness') ||
        spotTitle.includes('bowling') ||
        spotTitle.includes('kart') ||
        spotTitle.includes('paintball')
      );
    case 'cafes_bakeries':
      return (
        planCat.includes('cafe') ||
        planCat.includes('café') ||
        planCat.includes('bakery') ||
        spotCat.includes('cafe') ||
        spotCat.includes('café') ||
        spotCat.includes('bakery') ||
        spotCat.includes('coffee') ||
        spotTitle.includes('cafe') ||
        spotTitle.includes('coffee')
      );
    case 'date_spots':
      return (
        planCat.includes('date') ||
        spotCat.includes('date') ||
        spotTitle.includes('unseen') ||
        (plan.tags?.some(t => t.toLowerCase().includes('date')) ?? false)
      );
    case 'creative_leisure':
      return (
        planCat.includes('creative') ||
        planCat.includes('leisure') ||
        planCat.includes('art') ||
        spotCat.includes('creative') ||
        spotCat.includes('leisure') ||
        spotCat.includes('art') ||
        spotCat.includes('social') ||
        spotTitle.includes('pottery') ||
        spotTitle.includes('paint')
      );
    case 'hotels_luxury':
      return (
        planCat.includes('hotel') ||
        planCat.includes('luxury') ||
        spotCat.includes('hotel') ||
        spotCat.includes('luxury') ||
        spotCat.includes('stay')
      );
    case 'vacation_escapes':
      return (
        planCat.includes('vacation') ||
        planCat.includes('escape') ||
        spotCat.includes('vacation') ||
        spotCat.includes('escape') ||
        spotCat.includes('resort')
      );
    default:
      return planCat.includes(categoryId.toLowerCase()) || spotCat.includes(categoryId.toLowerCase());
  }
}

export function getCategoryFallbackImage(category: string): string {
  switch (category) {
    case 'restaurants_dining':
    case 'restaurants':
      return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop';
    case 'tech_gaming':
      return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop';
    case 'clubs_lounges':
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
    case 'nature':
    case 'nature_outdoors':
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop';
    case 'action_sports':
      return 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop';
    case 'cafes_bakeries':
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop';
    case 'date_spots':
      return 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop';
    case 'creative_leisure':
      return 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop';
    case 'hotels_luxury':
      return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop';
    case 'vacation_escapes':
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop';
    default:
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  }
}

function matchOutingLocation(plan: OutingPlan, selectedLocation: string, spot?: SpotItem): boolean {
  if (!selectedLocation || selectedLocation === 'All Locations' || !selectedLocation.trim()) return true;

  const loc = selectedLocation.trim().toLowerCase();
  const address = (plan.spotAddress || '').toLowerCase();
  const spotAddress = (spot?.address || '').toLowerCase();
  const spotNeigh = (spot?.neighborhood || '').toLowerCase();
  const spotTag = (spot?.exactLocationTag || '').toLowerCase();
  const spotTitle = (spot?.title || plan.spotTitle || '').toLowerCase();

  if (loc === 'cbd' || loc === 'nairobi cbd') {
    return (
      address.includes('cbd') ||
      address.includes('central business') ||
      address.includes('tom mboya') ||
      address.includes('moi ave') ||
      spotNeigh.includes('cbd') ||
      spotAddress.includes('cbd') ||
      spotTag.includes('cbd')
    );
  }

  if (loc === 'kiambu' || loc === 'kiambu road') {
    return (
      address.includes('kiambu') ||
      spotNeigh.includes('kiambu') ||
      spotAddress.includes('kiambu') ||
      spotTag.includes('kiambu')
    );
  }

  if (loc === 'thika' || loc === 'ruiru' || loc === 'thika road' || loc === 'ruiru / thika road') {
    return (
      address.includes('ruiru') ||
      address.includes('thika') ||
      spotNeigh.includes('ruiru') ||
      spotNeigh.includes('thika') ||
      spotNeigh.includes('roysambu') ||
      spotNeigh.includes('kasarani')
    );
  }

  return (
    address.includes(loc) ||
    spotNeigh.includes(loc) ||
    spotAddress.includes(loc) ||
    spotTag.includes(loc) ||
    spotTitle.includes(loc)
  );
}

function matchOutingAccessType(plan: OutingPlan, accessType: 'All Plans' | 'Open Plans' | 'Singles Only'): boolean {
  if (accessType === 'All Plans') return true;
  if (accessType === 'Open Plans') return plan.accessType === 'open';
  if (accessType === 'Singles Only') {
    return plan.accessType === 'singles_only' || (plan.tags?.includes('Singles Only') ?? false);
  }
  return true;
}

interface OutingsTabProps {
  outings: OutingPlan[];
  spots: SpotItem[];
  currentUserProfile: UserProfile;
  currentUserId?: string;
  isUserSignedIn: boolean;
  onOpenAuth: () => void;
  onCreateOuting: (outing: OutingPlan) => Promise<void>;
  /** Opens the account area where plans live (Creator Hub > Plan). */
  onOpenPlans?: () => void;
  onRequestJoin: (outingId: string, attendee: OutingAttendee) => Promise<void>;
  onUpdateAttendeeStatus?: (outingId: string, attendeeId: string, status: 'approved' | 'declined') => Promise<void>;
  onOpenOutingChat?: (outing: OutingPlan) => void;
  onOpenSpotDetails?: (spot: SpotItem) => void;
  showToast: (msg: string) => void;
}

// Outings card + sheet styling, kept in one place so everything on this tab matches
const OUTING_BTN_PRIMARY = 'min-h-[44px] rounded-2xl px-3 bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white text-[13px] font-extrabold shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50';
const OUTING_BTN_SOFT = 'min-h-[44px] rounded-2xl px-3 bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 text-[13px] font-bold active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer';
const OUTING_BTN_STATUS = 'min-h-[44px] rounded-2xl px-3 text-[13px] font-extrabold flex items-center justify-center gap-1.5';
const OUTING_TICKET_STRIP = 'w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 bg-[#E0533C]/[0.06] border border-[#E0533C]/15 active:scale-[0.99] transition cursor-pointer';

export const OutingsTab: React.FC<OutingsTabProps> = ({
  outings,
  spots: spotsProp,
  currentUserProfile,
  currentUserId,
  isUserSignedIn,
  onOpenAuth,
  onCreateOuting,
  onOpenPlans,
  onRequestJoin,
  onUpdateAttendeeStatus,
  onOpenOutingChat,
  onOpenSpotDetails,
  showToast
}) => {
  // The parent only passes merchant/user spots. Merge in the full catalog so the Host picker shows every spot.
  const { spots: catalogSpots } = useUnclaimedSpots();
  const spots = useMemo(() => mergeSpots(spotsProp || [], catalogSpots), [spotsProp, catalogSpots]);

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [accessTypeFilter, setAccessTypeFilter] = useState<'All Plans' | 'Open Plans' | 'Singles Only'>('All Plans');
  const [searchQuery, setSearchQuery] = useState('');
  // Saved outings (private to the person) and, for hosts, how many people saved each of their outings.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedOnly, setSavedOnly] = useState(false);
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let off = false;
    if (!currentUserId) { setSavedIds(new Set()); return; }
    fetchMySavedOutingIds().then((ids) => { if (!off) setSavedIds(ids); });
    return () => { off = true; };
  }, [currentUserId]);
  const handleToggleSave = async (plan: OutingPlan, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (!isUserSignedIn || !currentUserId) {
      showToast('Sign in to save outings.');
      return;
    }
    const wasSaved = savedIds.has(plan.id);
    // optimistic
    setSavedIds((cur) => { const n = new Set(cur); if (wasSaved) n.delete(plan.id); else n.add(plan.id); return n; });
    try {
      const nowSaved = await toggleOutingSave(plan.id);
      setSavedIds((cur) => { const n = new Set(cur); if (nowSaved) n.add(plan.id); else n.delete(plan.id); return n; });
      showToast(nowSaved ? 'Saved to your outings.' : 'Removed from saved.');
    } catch (err: any) {
      setSavedIds((cur) => { const n = new Set(cur); if (wasSaved) n.add(plan.id); else n.delete(plan.id); return n; });
      const m = String(err?.message || '');
      showToast(/not found/i.test(m) ? 'This outing is still syncing. Try again in a moment.' : (m || 'Could not save. Try again.'));
    }
  };
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{ kind: 'outing_limit' | 'attendee_cap'; message: string } | null>(null);
  const [selectedOutingDetail, setSelectedOutingDetail] = useState<OutingPlan | null>(null);
  // Host analytics: one view per outing and one profile view per host, per session.
  useEffect(() => {
    if (!selectedOutingDetail) return;
    track('view', 'outing', selectedOutingDetail.id);
    if (selectedOutingDetail.hostId) track('view', 'profile', selectedOutingDetail.hostId);
  }, [selectedOutingDetail?.id]);
  const [managingOuting, setManagingOuting] = useState<OutingPlan | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  // Keep managingOuting in sync with fresh outings array
  const activeManagingOuting = useMemo(() => {
    if (!managingOuting) return null;
    return outings.find(o => o.id === managingOuting.id) || managingOuting;
  }, [outings, managingOuting]);

  // Hosts see how many people saved the outing they are managing (a number only, never who).
  useEffect(() => {
    const id = activeManagingOuting?.id;
    if (!id || !currentUserId || activeManagingOuting?.hostId !== currentUserId) return;
    let off = false;
    fetchOutingSaveCounts([id]).then((c) => { if (!off) setSaveCounts((cur) => ({ ...cur, ...c })); });
    return () => { off = true; };
  }, [activeManagingOuting?.id, currentUserId]);

  // ---- Custom deep link for hosted plans ----------------------------------
  const [ticketInfo, setTicketInfo] = useState<Record<string, TicketSummary>>({});
  const [buyFor, setBuyFor] = useState<OutingPlan | null>(null);
  const [myTicketsOpen, setMyTicketsOpen] = useState(false);

  // Links for outings that sell tickets open the buy sheet straight away
  const buildOutingLink = (plan: OutingPlan) =>
    `${siteOrigin()}/?tab=outings&outing=${encodeURIComponent(String(plan.id))}&ref=share${ticketInfo[String(plan.id)] ? '&tickets=1' : ''}`;

  const [shareCardFor, setShareCardFor] = useState<OutingPlan | null>(null);
  const [ticketsFor, setTicketsFor] = useState<OutingPlan | null>(null);

  const handleShareOutingLink = (plan: OutingPlan) => {
    // Pro and Elite get a share card; Free keeps the plain link share
    if (myPlan === 'pro' || myPlan === 'elite') {
      setShareCardFor(plan);
      return;
    }
    track('share', 'outing', plan.id);
    const link = buildOutingLink(plan);
    shareContent({
      title: `RADA Outing: ${plan.spotTitle}`,
      text: `${plan.hostName} is hosting a plan at ${plan.spotTitle} (${plan.date}). Join on RADA:`,
      url: link,
      onSuccess: showToast,
      onError: async () => {
        try {
          await navigator.clipboard.writeText(link);
          showToast('Outing link copied to clipboard!');
        } catch {
          showToast(link);
        }
      }
    });
  };

  const handleCopyOutingLink = async (plan: OutingPlan) => {
    const link = buildOutingLink(plan);
    try {
      await navigator.clipboard.writeText(link);
      showToast('Outing link copied!');
    } catch {
      showToast(link);
    }
  };

  // Open the outing when someone lands on a shared link (?outing=ID)
  useEffect(() => {
    if (typeof window === 'undefined' || outings.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const outingId = params.get('outing');
    if (!outingId) return;
    const match = outings.find(o => String(o.id) === outingId);
    if (match) {
      setSelectedOutingDetail(match);
      params.delete('outing');
      params.delete('ref');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, [outings]);

  // Opened from Saved Items while this tab is already on screen
  useEffect(() => {
    const open = (e: Event) => {
      const id = String((e as CustomEvent).detail?.id || '');
      const match = outings.find(o => String(o.id) === id);
      if (match) setSelectedOutingDetail(match);
    };
    window.addEventListener('rada:open-outing', open);
    return () => window.removeEventListener('rada:open-outing', open);
  }, [outings]);

  const activeSelectedOutingDetail = useMemo(() => {
    if (!selectedOutingDetail) return null;
    return outings.find(o => o.id === selectedOutingDetail.id) || selectedOutingDetail;
  }, [outings, selectedOutingDetail]);

  const handleApproveApplicant = async (outingId: string, attendeeId: string) => {
    if (!onUpdateAttendeeStatus) return;
    setIsProcessingAction(attendeeId);
    try {
      await onUpdateAttendeeStatus(outingId, attendeeId, 'approved');
    } catch (err: any) {
      showToast(err?.message || 'Could not approve applicant');
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleDeclineApplicant = async (outingId: string, attendeeId: string) => {
    if (!onUpdateAttendeeStatus) return;
    setIsProcessingAction(attendeeId);
    try {
      await onUpdateAttendeeStatus(outingId, attendeeId, 'declined');
    } catch (err: any) {
      showToast(err?.message || 'Could not decline applicant');
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Form state for Hosting a Plan (Catalog Spot vs Custom Spot / Venue)
  const [venueMode, setVenueMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSpotId, setSelectedSpotId] = useState<string | number | null>(spots[0]?.id ?? null);
  const [spotSearchQuery, setSpotSearchQuery] = useState('');
  const [customSpotTitle, setCustomSpotTitle] = useState('');
  const [customSpotAddress, setCustomSpotAddress] = useState('');
  const [customSpotCategory, setCustomSpotCategory] = useState('restaurants_dining');
  const [customSpotImage, setCustomSpotImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Direct cover upload: picks a photo, uploads to Supabase Storage, stores the public URL
  const handleCoverPicked = async (file: File) => {
    if (!isUserSignedIn || !currentUserId) {
      showToast('Please sign in to upload a cover image');
      onOpenAuth();
      return;
    }
    setCoverUploading(true);
    const res = await uploadCoverImage(currentUserId, file);
    setCoverUploading(false);
    if (res.error || !res.url) {
      showToast(res.error || 'Could not upload cover image');
      return;
    }
    setCustomSpotImage(res.url);
    showToast('Cover image uploaded');
  };

  const [planDate, setPlanDate] = useState('2026-10-24');
  const [planTime, setPlanTime] = useState('18:00');
  const [maxAttendees, setMaxAttendees] = useState(6);

  // ---- Plan limits: Free 4 / Pro 10 / Elite unlimited outings a month; attendees 10 / 30 / unlimited ----
  const { plan: myPlan } = useMySubscriptions(currentUserId);
  const [serverOutingsUsed, setServerOutingsUsed] = useState(0);
  useEffect(() => {
    if (!currentUserId) {
      setServerOutingsUsed(0);
      return;
    }
    let cancelled = false;
    fetchMyOutingUsage().then((u) => {
      if (!cancelled && u) setServerOutingsUsed(u.used);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, outings.length]);
  const quota = getOutingQuota(
    myPlan,
    Math.max(serverOutingsUsed, countOutingsThisMonth(outings, currentUserId))
  );
  const attendeeMax = attendeeCeiling(myPlan);
  useEffect(() => {
    setMaxAttendees((prev) => clampAttendees(myPlan, prev));
  }, [myPlan]);
  const outingLimitMessage = `You've used all ${quota.limit} outings for this month on the ${PLAN_META[myPlan].name} plan. Upgrade in Account & Security to host more.`;
  const [accessType, setAccessType] = useState<'open' | 'singles_only'>('open');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['All Plans', 'Group Hangouts']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically extracted locations from active spots and outings database
  const dynamicLocations = useMemo(() => {
    const locSet = new Set<string>();

    spots.forEach(s => {
      if (s.neighborhood && s.neighborhood.trim()) {
        locSet.add(s.neighborhood.trim());
      }
      if (s.exactLocationTag && s.exactLocationTag.trim()) {
        locSet.add(s.exactLocationTag.trim());
      }
    });

    outings.forEach(o => {
      if (o.spotAddress && o.spotAddress.trim()) {
        const parts = o.spotAddress.split(',').map(p => p.trim()).filter(Boolean);
        parts.forEach(part => {
          if (part.length > 2 && !part.toLowerCase().includes('nairobi') && !part.toLowerCase().includes('kenya')) {
            locSet.add(part);
          }
        });
      }
    });

    // Curated high-frequency locations ensuring key zones are accessible
    ['Westlands', 'Kilimani', 'Karen', 'Nairobi CBD', 'Kiambu Road', 'Lavington', 'Lang\'ata', 'Parklands', 'Ruiru', 'Thika Road', 'Ngong Road', 'Gigiri', 'Kileleshwa'].forEach(loc => {
      locSet.add(loc);
    });

    return Array.from(locSet).sort((a, b) => a.localeCompare(b));
  }, [spots, outings]);

  const popularLocationChips = useMemo(() => {
    return ['All', 'Westlands', 'Kilimani', 'Karen', 'Ruiru', 'CBD', 'Kiambu Rd', 'Lavington', 'Parklands'];
  }, []);

  // Real-Time Feed Filtering
  const outingPromos = useActivePromotions('event_boost');
  const outingRanks = useMemo(() => outingRankMap(outingPromos), [outingPromos]);
  const filteredOutings = useMemo(() => {
    const list = outings.filter(plan => {
      const spot = spots.find(s => s.id === plan.spotId);

      if (savedOnly && !savedIds.has(plan.id)) return false;

      // Access Type Filter ("All Plans", "Open Plans", "Singles Only")
      if (!matchOutingAccessType(plan, accessTypeFilter)) {
        return false;
      }

      // Location Filter (e.g. "All Locations", "Westlands", "Kilimani", "Karen", "Nairobi CBD", "Kiambu Road")
      if (!matchOutingLocation(plan, selectedLocation, spot)) {
        return false;
      }

      // Category Filter (10 RADA Categories)
      if (!matchOutingCategory(plan, selectedCategory, spot)) {
        return false;
      }

      // Real-time venue/host/vibe search query
      if (searchQuery.trim()) {
        // every word must appear somewhere in the venue, host, description or tags (null-safe)
        const hay = [
          plan.spotTitle, plan.spotAddress, spot?.title, spot?.neighborhood,
          plan.hostName, plan.hostHandle, plan.description, spot?.category,
          ...(Array.isArray(plan.tags) ? plan.tags : []),
        ].map((v) => String(v ?? '').toLowerCase()).join(' | ');
        const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.every((w) => {
          const t = w.replace(/^@/, '');
          return hay.includes(t) || (t.length > 3 && t.endsWith('s') && hay.includes(t.slice(0, -1)));
        })) return false;
      }

      return true;
    }).map((plan, i) => ({ plan, i }))
      // Early-registered hosts' outings are listed first; otherwise the original (newest first) order is kept
      .sort((a, b) => (Number(Boolean((b.plan as any).isEarlyHost)) - Number(Boolean((a.plan as any).isEarlyHost))) || (a.i - b.i))
      .map(x => x.plan);
    // Boosted outings first, in the order RADA chose; everything else keeps its order.
    return sortOutingsByPromotion(list, (p) => p.id, outingRanks);
  }, [outings, spots, selectedLocation, selectedCategory, accessTypeFilter, searchQuery, outingRanks, savedOnly, savedIds]);

  // Spots search inside Host modal
  const filteredSpotsForHosting = useMemo(() => {
    if (!spotSearchQuery.trim()) return sortTrending(spots).slice(0, 10);
    const q = spotSearchQuery.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    return spots.filter(s => {
      const hay = `${s.title || ''} ${s.neighborhood || ''} ${s.address || ''} ${s.category || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 10);
  }, [spots, spotSearchQuery]);

  const selectedSpot = useMemo(() => {
    return spots.find(s => s.id === selectedSpotId) || spots[0];
  }, [spots, selectedSpotId]);

  // Format date readable
  const formatOutingDate = (dateStr: string, timeStr?: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        return `${dateObj.toLocaleDateString('en-KE', options)}${timeStr ? ` • ${timeStr}` : ''}`;
      }
    } catch (e) {}
    return `${dateStr}${timeStr ? ` • ${timeStr}` : ''}`;
  };

  // Check user attendee status for a plan
  const getAttendeeStatus = (plan: OutingPlan): 'host' | 'joined' | 'pending' | 'awaiting' | 'none' => {
    const effectiveUserId = currentUserId || currentUserProfile.handle || 'current-user';
    if (plan.hostId === effectiveUserId || plan.hostName === currentUserProfile.name) {
      return 'host';
    }
    const myAttendee = plan.attendees?.find(a => 
      a.userId === effectiveUserId || 
      a.userName === currentUserProfile.name ||
      (currentUserProfile.handle && a.userHandle === currentUserProfile.handle)
    );
    if (!myAttendee || myAttendee.status === 'declined') return 'none';
    if (myAttendee.status === 'awaiting_payment') return 'awaiting';
    return (myAttendee.status === 'joined' || myAttendee.status === 'approved') ? 'joined' : 'pending';
  };

  // Approved guests who still have to pay: how long they have left
  const myPayBy = (plan: OutingPlan): string | null => {
    const me = plan.attendees?.find(a => a.status === 'awaiting_payment' && (a.userId === currentUserId || (currentUserProfile.handle && a.userHandle === currentUserProfile.handle)));
    return me?.payBy || null;
  };
  const timeLeft = (iso?: string | null): string => {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'time is up';
    const m = Math.ceil(ms / 60000);
    if (m < 60) return `${m} min left`;
    const h = Math.floor(m / 60);
    return h < 48 ? `${h}h ${m % 60}m left` : `${Math.floor(h / 24)} days left`;
  };

  // Handle Join Request
  const ticketIdsKey = filteredOutings.map((p) => String(p.id)).join(',');
  useEffect(() => {
    let off = false;
    const ids = ticketIdsKey ? ticketIdsKey.split(',') : [];
    fetchTicketSummaries('outing', ids).then((m) => { if (!off) setTicketInfo(m); });
    return () => { off = true; };
  }, [ticketIdsKey]);

  const openBuy = (e: React.MouseEvent, plan: OutingPlan) => {
    e.stopPropagation();
    setBuyFor(plan);
  };

  const handleJoinClick = async (e: React.MouseEvent, plan: OutingPlan) => {
    e.stopPropagation();
    if (!isUserSignedIn && !currentUserId) {
      showToast('Please sign in or create an account to request to join outings');
      onOpenAuth();
      return;
    }

    const currentStatus = getAttendeeStatus(plan);
    if (currentStatus === 'host') {
      showToast('You are the host of this plan!');
      return;
    }
    if (currentStatus === 'joined') {
      showToast('You are already a confirmed attendee for this outing!');
      return;
    }
    if (currentStatus === 'pending') {
      showToast('Your request is already pending host approval');
      return;
    }

    // Check available slots
    const joinedCount = plan.attendees?.filter(a => a.status === 'joined' || a.status === 'approved').length || 0;
    const remainingSlots = Math.max(0, plan.maxAttendees - joinedCount - 1);
    if (remainingSlots <= 0) {
      showToast('This outing has reached maximum attendee capacity.');
      return;
    }
    track('rsvp', 'outing', plan.id);
    logPlatformEvent('outing_join');

    const newAttendee: OutingAttendee = {
      id: `att-${Date.now()}`,
      outingId: plan.id,
      userId: currentUserId || `usr-${Date.now()}`,
      userName: currentUserProfile.name || 'Explorer',
      userAvatar: currentUserProfile.avatar || '',
      userHandle: currentUserProfile.handle || '@explorer',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    await onRequestJoin(plan.id, newAttendee);
    showToast('Join request sent to host! Pending approval');
  };

  // Submit Host Plan Form
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserSignedIn && !currentUserId) {
      showToast('Please sign in or create an account to host a plan');
      onOpenAuth();
      return;
    }

    if (!quota.allowed) {
      showToast(outingLimitMessage);
      return;
    }

    if (quota.attendeeCap !== null && Number(maxAttendees) > quota.attendeeCap) {
      showToast(`The ${PLAN_META[myPlan].name} plan allows up to ${quota.attendeeCap} attendees per outing.`);
      return;
    }

    if (coverUploading) {
      showToast('Cover image is still uploading, one moment...');
      return;
    }

    const isCustom = venueMode === 'custom';

    if (isCustom) {
      if (!customSpotTitle.trim()) {
        showToast('Please enter a Venue or Spot Name for your custom outing.');
        return;
      }
    } else {
      if (!selectedSpot) {
        showToast('Please select a target hangout spot or venue.');
        return;
      }
    }

    if (!description.trim()) {
      showToast('Please write a short vibe note or plan description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const spotTitle = isCustom ? customSpotTitle.trim() : selectedSpot.title;
      const spotAddress = isCustom ? (customSpotAddress.trim() || 'Nairobi Area') : selectedSpot.address;
      const spotCategory = isCustom ? customSpotCategory : selectedSpot.category;
      const spotImage = isCustom
        ? (customSpotImage.trim() || getCategoryFallbackImage(customSpotCategory))
        : (selectedSpot.img || selectedSpot.images?.[0] || getCategoryFallbackImage(selectedSpot.category));

      const newPlan: OutingPlan = {
        id: `out-${Date.now()}`,
        hostId: currentUserId || `host-${Date.now()}`,
        hostName: currentUserProfile.name || 'RADA member',
        hostAvatar: currentUserProfile.avatar || '',
        hostHandle: currentUserProfile.handle || '@host',
        isHostVerified: currentUserProfile.is_verified === true, // RADA-approved only; the database re-checks this on save
        spotId: isCustom ? undefined : selectedSpot.id,
        spotTitle,
        spotAddress,
        spotImage,
        spotCategory,
        date: planDate,
        time: planTime,
        maxAttendees: Number(maxAttendees),
        currentAttendeesCount: 1, // host
        description: description.trim(),
        accessType,
        tags: Array.from(new Set(['All Plans', accessType === 'singles_only' ? 'Singles Only' : 'Group Hangouts', ...selectedTags])),
        status: 'active',
        createdAt: new Date().toISOString(),
        attendees: []
      };

      await onCreateOuting(newPlan);
      showToast(`Outing Plan "${spotTitle}" Published!`);
      setIsHostModalOpen(false);
      setDescription('');
      setCustomSpotTitle('');
      setCustomSpotAddress('');
      setCustomSpotImage('');
      setVenueMode('catalog');
    } catch (err: any) {
      if (err?.kind === 'outing_limit' || err?.kind === 'attendee_cap') {
        // The server said no because of the plan: explain it and offer the upgrade instead of an error toast
        setUpgradePrompt({ kind: err.kind, message: String(err.message || '') });
      } else {
        showToast(err?.message || 'Could not publish outing plan');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-3 sm:px-4 py-4 space-y-4 max-w-lg min-[900px]:max-w-none mx-auto pb-24 min-[900px]:pb-8">
      {/* =====================================================================
          SECTION 1: HOST A PLAN (own card, separate from search & filters)
          ===================================================================== */}
      <div className="bg-gradient-to-br from-[#E0533C]/10 via-white to-white dark:from-[#E0533C]/15 dark:via-[#1C1A1E] dark:to-[#1C1A1E] border border-[#E0533C]/25 rounded-3xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E0533C] animate-pulse shrink-0" />
              <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Outings & Public Plans
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Got a plan? Host it and let the community join.
            </p>
            {isUserSignedIn && !isDemoMode() && (
              <div className="mt-3.5 space-y-2">
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {quota.limit === null
                    ? `Unlimited outings · ${PLAN_META[myPlan].name} plan`
                    : `${quota.used} of ${quota.limit} outings used this month · ${PLAN_META[myPlan].name} plan`}
                </p>
                {quota.limit !== null && (
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${quota.allowed ? 'bg-[#E0533C]' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.round((quota.used / quota.limit) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isUserSignedIn && !currentUserId) {
                showToast('Please sign in to host a plan');
                onOpenAuth();
                return;
              }
              if (!quota.allowed) {
                showToast(outingLimitMessage);
                return;
              }
              setIsHostModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-xs font-black shadow-md shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Host a Plan</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: SEARCH + CATEGORY / LOCATION FILTERS (separate card)
          ===================================================================== */}
      <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Search className="w-3 h-3 text-[#E0533C]" />
          <span>Find a plan</span>
        </h2>

        {/* Venue/Host/Vibe Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue, host, or vibe (e.g. Alchemist, Jazz, Karura)..."
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Filters (Dynamic Location & Category) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          {/* Dynamic Location Search / Type Input with Autocomplete */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
            </div>
            <input
              type="text"
              list="dynamic-locations-datalist"
              aria-label="Filter area or neighborhood"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              placeholder="Filter area (e.g. Ruiru, Karen, Kilimani)..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E0533C] placeholder:text-slate-400"
            />
            <datalist id="dynamic-locations-datalist">
              {dynamicLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            {selectedLocation ? (
              <button
                type="button"
                onClick={() => setSelectedLocation('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Clear area filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                Area
              </span>
            )}
          </div>

          {/* Category Filter Dropdown (10 RADA Categories) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-3.5 h-3.5 text-[#E0533C]" />
            </div>
            <select
              aria-label="Filter by RADA Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E0533C] appearance-none cursor-pointer"
            >
              {RADA_10_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Quick Area Chips for 1-tap filtering */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5">
          <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">
            Areas:
          </span>
          {popularLocationChips.map((chip) => {
            const isChipActive = chip === 'All'
              ? (!selectedLocation || selectedLocation === 'All Locations')
              : selectedLocation.trim().toLowerCase() === chip.toLowerCase();
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setSelectedLocation(chip === 'All' ? '' : chip)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer ${
                  isChipActive
                    ? 'bg-[#E0533C] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSavedOnly((v) => !v)}
          className={`self-start px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer border ${
            savedOnly
              ? 'bg-[#E0533C] text-white border-[#E0533C]'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
          aria-pressed={savedOnly}
        >
          <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white' : ''}`} />
          <span>Saved{savedIds.size ? ` (${savedIds.size})` : ''}</span>
        </button>

        {/* Access Type Toggle: "All Plans", "Open Plans", "Singles Only" */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-black/40 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          {(['All Plans', 'Open Plans', 'Singles Only'] as const).map((type) => {
            const isActive = accessTypeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setAccessTypeFilter(type)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {type === 'Singles Only' && (
                  <Heart className={`w-3 h-3 ${isActive ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                )}
                {type === 'Open Plans' && (
                  <Users className={`w-3 h-3 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                )}
                {type === 'All Plans' && (
                  <Compass className={`w-3 h-3 ${isActive ? 'text-[#E0533C]' : 'text-slate-400'}`} />
                )}
                <span className="truncate">{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Outings Count & Active Status */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#E0533C]" />
          <span>Active Plans ({filteredOutings.length})</span>
        </span>
        <div className="flex items-center gap-2">
          {(Boolean(selectedLocation && selectedLocation !== 'All Locations') || selectedCategory !== 'all' || accessTypeFilter !== 'All Plans' || searchQuery.trim() !== '' || savedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSelectedLocation('');
                setSelectedCategory('all');
                setAccessTypeFilter('All Plans');
                setSearchQuery('');
                setSavedOnly(false);
              }}
              className="text-[11px] text-[#E0533C] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
            {accessTypeFilter}
            {selectedLocation && selectedLocation !== 'All Locations' ? ` • ${selectedLocation}` : ''}
            {selectedCategory !== 'all' ? ` • ${RADA_10_CATEGORIES.find(c => c.id === selectedCategory)?.label}` : ''}
          </span>
        </div>
      </div>

      {/* Outings Feed Cards */}
      {filteredOutings.length > 0 ? (
        <div className="space-y-3.5 min-[900px]:space-y-0 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:gap-4 min-[900px]:items-start">
          {filteredOutings.map((plan) => {
            const attendeeStatus = getAttendeeStatus(plan);
            const joinedAttendees = plan.attendees?.filter(a => a.status === 'joined' || a.status === 'approved') || [];
            const pendingAttendees = plan.attendees?.filter(a => a.status === 'pending') || [];
            // Host is 1 attendee
            const totalOccupied = joinedAttendees.length + 1;
            const remainingSlots = Math.max(0, plan.maxAttendees - totalOccupied);
            const isFull = remainingSlots === 0;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedOutingDetail(plan)}
                className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:border-[#E0533C]/50 transition-all cursor-pointer group space-y-3.5 text-slate-900 dark:text-slate-100"
              >
                {/* Host Profile Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-2xs"
                      style={{ backgroundImage: `url('${plan.hostAvatar}')` }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {plan.hostName}
                        </span>
                        <HostBadge hostId={plan.hostId} verified={!!plan.isHostVerified} size="sm" />
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] uppercase tracking-wider shrink-0 ml-1">
                          Host
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {plan.hostHandle || '@host'} • Nairobi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                  {/* Access Type Badge */}
                  {plan.accessType === 'singles_only' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1 shrink-0">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      <span>Singles Only</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-emerald-600" />
                      <span>Open Plan</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSave(plan, e)}
                    aria-label={savedIds.has(plan.id) ? 'Remove from saved' : 'Save outing'}
                    aria-pressed={savedIds.has(plan.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#E0533C] transition cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${savedIds.has(plan.id) ? 'fill-[#E0533C] text-[#E0533C]' : ''}`} />
                  </button>
                  </div>
                </div>

                {/* Target Spot Banner & Details */}
                <div className="flex gap-3 bg-slate-50 dark:bg-black/30 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <div
                    className="w-20 h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-200 dark:border-slate-700 relative overflow-hidden"
                    style={{ backgroundImage: `url('${plan.spotImage}')` }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition truncate">
                        {plan.spotTitle}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5 font-medium">
                        <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                        <span className="truncate">{plan.spotAddress || 'Nairobi'}</span>
                      </p>
                    </div>

                    {/* Date & Time Tag */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                        <Calendar className="w-3 h-3 text-[#E0533C]" />
                        <span>{formatOutingDate(plan.date, plan.time)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan Description / Vibe Note */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {plan.description}
                </p>

                {/* Spots + people */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {joinedAttendees.length > 0 && (
                        <div className="flex items-center -space-x-2 shrink-0">
                          {joinedAttendees.slice(0, 3).map((att) => (
                            <img loading="lazy" decoding="async" key={att.id} src={att.userAvatar} alt={att.userName} title={att.userName}
                              className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-[#1C1A1E]" />
                          ))}
                          {joinedAttendees.length > 3 && (
                            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-extrabold flex items-center justify-center border-2 border-white dark:border-[#1C1A1E]">+{joinedAttendees.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span className={`text-[12px] font-extrabold ${isFull ? 'text-slate-500' : remainingSlots <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {isFull ? 'Plan full' : `${remainingSlots} ${remainingSlots === 1 ? 'spot' : 'spots'} left`}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{totalOccupied} of {plan.maxAttendees} going</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#E0533C] to-[#EE8A47] transition-all" style={{ width: `${Math.min(100, Math.round((totalOccupied / Math.max(1, plan.maxAttendees)) * 100))}%` }} />
                  </div>
                </div>

                {/* Tickets for guests */}
                {attendeeStatus !== 'host' && ticketInfo[String(plan.id)] && (
                  <button type="button" onClick={(e) => openBuy(e, plan)} className={OUTING_TICKET_STRIP}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0"><Ticket className="w-4 h-4" /></span>
                      <span className="min-w-0 text-left">
                        <span className="block text-[13px] font-extrabold leading-tight">{ticketInfo[String(plan.id)].min_price > 0 ? `Tickets from KES ${ticketInfo[String(plan.id)].min_price.toLocaleString('en-KE')}` : 'Free tickets'}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{ticketInfo[String(plan.id)].left <= 0 ? 'Sold out' : ticketInfo[String(plan.id)].left <= 10 ? `Only ${ticketInfo[String(plan.id)].left} left` : 'Tap to get yours'}</span>
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                )}

                {/* Actions */}
                <div className="flex items-stretch gap-2" onClick={(e) => e.stopPropagation()}>
                  {attendeeStatus === 'host' && (
                    <>
                      <button type="button" onClick={() => setManagingOuting(plan)} className={`${OUTING_BTN_SOFT} flex-1 relative`}>
                        <UserCheck className="w-4 h-4 text-[#E0533C]" />
                        <span>Manage</span>
                        {pendingAttendees.length > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#E0533C] text-white text-[11px] font-black flex items-center justify-center">{pendingAttendees.length}</span>
                        )}
                      </button>
                      <button type="button" onClick={() => onOpenOutingChat?.(plan)} className={`${OUTING_BTN_SOFT} flex-1`}>
                        <MessageSquare className="w-4 h-4 text-[#E0533C]" />
                        <span>Chat</span>
                      </button>
                      <button type="button" onClick={() => setTicketsFor(plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                        <Ticket className="w-4 h-4" />
                        <span>Tickets</span>
                      </button>
                    </>
                  )}

                  {attendeeStatus === 'pending' && (
                    <div className={`${OUTING_BTN_STATUS} flex-1 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300`}>
                      <Clock className="w-4 h-4" />
                      <span>Waiting for host approval</span>
                    </div>
                  )}

                  {attendeeStatus === 'awaiting' && (
                    <button type="button" onClick={(e) => openBuy(e, plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                      <Ticket className="w-4 h-4" />
                      <span>You're approved. Pay to confirm</span>
                      <span className="text-[11px] font-bold opacity-90">· {timeLeft(myPayBy(plan))}</span>
                    </button>
                  )}

                  {attendeeStatus === 'joined' && (
                    <>
                      <div className={`${OUTING_BTN_STATUS} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>You're in</span>
                      </div>
                      <button type="button" onClick={() => onOpenOutingChat?.(plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                        <MessageSquare className="w-4 h-4" />
                        <span>Group chat</span>
                      </button>
                    </>
                  )}

                  {attendeeStatus === 'none' && (
                    isFull ? (
                      <div className="flex-1"><WaitlistButton outingId={String(plan.id)} /></div>
                    ) : (
                      <button type="button" onClick={(e) => handleJoinClick(e, plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                        <Users className="w-4 h-4" />
                        <span>Request to join</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm text-slate-900 dark:text-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center mx-auto shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              No outings match these filters. Be the first to host one!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Try adjusting your location, category, or access type filters, or create a brand new public hangout.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {(selectedLocation !== 'All Locations' || selectedCategory !== 'all' || accessTypeFilter !== 'All Plans' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation('All Locations');
                  setSelectedCategory('all');
                  setAccessTypeFilter('All Plans');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsHostModalOpen(true)}
              className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Host a Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          HOST A PLAN MODAL
          ========================================================================= */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-[#E0533C] flex items-center justify-center font-bold">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Host an Outing Plan
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Create a public plan and invite fellow explorers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHostModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPlan} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* 1. Target Spot / Venue Selection with Custom Entry Toggle */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>1. Hangout Venue / Spot *</span>
                  </label>

                  {/* Toggle between selecting from database or typing custom spot */}
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setVenueMode('catalog')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        venueMode === 'catalog'
                          ? 'bg-white dark:bg-slate-900 text-[#E0533C] shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Browse Spots
                    </button>
                    <button
                      type="button"
                      onClick={() => setVenueMode('custom')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        venueMode === 'custom'
                          ? 'bg-[#E0533C] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#E0533C]'
                      }`}
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Custom Venue</span>
                    </button>
                  </div>
                </div>

                {venueMode === 'catalog' ? (
                  /* Catalog Spot Selection */
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={spotSearchQuery}
                        onChange={(e) => setSpotSearchQuery(e.target.value)}
                        placeholder="Search spots or enter custom venue..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                      />
                      {spotSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSpotSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Spot Select Carousel/List */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                      {filteredSpotsForHosting.map((spot) => {
                        const isSelected = selectedSpotId === spot.id;
                        return (
                          <div
                            key={spot.id}
                            onClick={() => setSelectedSpotId(spot.id)}
                            className={`w-36 p-2 rounded-2xl border transition cursor-pointer shrink-0 flex flex-col justify-between ${
                              isSelected
                                ? 'border-[#E0533C] ring-2 ring-[#E0533C]/40 bg-orange-50/60 dark:bg-orange-950/30'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
                            }`}
                          >
                            <div
                              className="h-16 rounded-xl bg-cover bg-center mb-1.5 relative overflow-hidden"
                              style={{ backgroundImage: `url('${spot.img}')` }}
                            >
                              {isSelected && (
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E0533C] text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-[11px] truncate text-slate-900 dark:text-slate-100">
                              {spot.title}
                            </h4>
                            <p className="text-[9px] text-slate-500 truncate">
                              {spot.neighborhood}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Selected: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSpot?.title}</span> • {selectedSpot?.neighborhood}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setVenueMode('custom');
                          if (spotSearchQuery.trim()) setCustomSpotTitle(spotSearchQuery.trim());
                        }}
                        className="text-[10px] font-extrabold text-[#E0533C] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Can't find it? Add Custom</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Custom Venue Entry Form */
                  <div className="p-3.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#E0533C] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Custom Spot & Venue Details</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setVenueMode('catalog')}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 underline font-semibold cursor-pointer"
                      >
                        Switch to Catalog Spots
                      </button>
                    </div>

                    {/* Venue Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Venue / Spot Name *
                      </label>
                      <input
                        type="text"
                        required={venueMode === 'custom'}
                        value={customSpotTitle}
                        onChange={(e) => setCustomSpotTitle(e.target.value)}
                        placeholder="e.g. K1 Klub House, Brew Bistro, Ruiru Falls, Java House..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                      />
                    </div>

                    {/* Location / Area */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Location / Area / Address
                      </label>
                      <input
                        type="text"
                        value={customSpotAddress}
                        onChange={(e) => setCustomSpotAddress(e.target.value)}
                        placeholder="e.g. Ruiru Bypass, Ojijo Rd Parklands, Karen Road..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                      />
                    </div>

                    {/* Spot Category (10 Standard Categories) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block">
                        Spot Category * (10 Standard Categories)
                      </label>
                      <select
                        value={customSpotCategory}
                        onChange={(e) => setCustomSpotCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                      >
                        {RADA_10_CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cover photo upload */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span>Cover photo (optional)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Auto-assigned if left empty</span>
                      </label>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) handleCoverPicked(f);
                        }}
                      />
                      {customSpotImage ? (
                        <div className="relative h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                          <img loading="lazy" decoding="async" src={customSpotImage} alt="Cover preview" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              disabled={coverUploading}
                              className="px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold backdrop-blur-md cursor-pointer disabled:opacity-60"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomSpotImage('')}
                              aria-label="Remove cover image"
                              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {coverUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={coverUploading}
                          className="w-full h-28 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-wait"
                        >
                          {coverUploading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-[#E0533C]" />
                              <span className="text-xs font-bold">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <ImagePlus className="w-5 h-5 text-[#E0533C]" />
                              <span className="text-xs font-extrabold">Upload Cover Image</span>
                              <span className="text-[10px] text-slate-400">Pick a photo from your device</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Date and Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Time *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Date Shortcuts */}
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-23')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  This Friday (Oct 23)
                </button>
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-24')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  Saturday (Oct 24)
                </button>
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-25')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  Sunday (Oct 25)
                </button>
              </div>

              {/* 3. Max Attendees & Access Type */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>
                      Max Attendees
                      <span className="ml-1 font-semibold text-[10px] text-slate-400">(up to {quota.attendeeCap ?? 'any'})</span>:
                    </span>
                    <span className="font-black text-[#E0533C] text-sm">{maxAttendees}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxAttendees(prev => Math.max(2, prev - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={2}
                      max={attendeeMax}
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(parseInt(e.target.value, 10))}
                      className="flex-1 accent-[#E0533C]"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxAttendees(prev => Math.min(attendeeMax, prev + 1))}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                    Access Type *
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAccessType('open')}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        accessType === 'open'
                          ? 'bg-white dark:bg-slate-900 text-[#E0533C] shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessType('singles_only')}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        accessType === 'singles_only'
                          ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Singles Only
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Short Description & Vibe Note */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                  Short Description & Vibe Note *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Heading to the sundowner DJ set and woodfired tacos. Looking for easygoing music lovers to hang out with!"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E0533C] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <TemplatePicker
                userId={currentUserId}
                current={{ spotId: selectedSpotId, description, maxAttendees, accessType, tags: selectedTags }}
                onApply={(d) => {
                  if (d.spotId != null) setSelectedSpotId(d.spotId);
                  if (typeof d.description === 'string') setDescription(d.description);
                  if (typeof d.maxAttendees === 'number') setMaxAttendees(clampAttendees(myPlan, d.maxAttendees));
                  if (d.accessType) setAccessType(d.accessType);
                  if (Array.isArray(d.tags)) setSelectedTags(d.tags);
                }}
              />

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CalendarPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Publishing Plan...' : 'Publish Outing Plan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHostModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          OUTING DETAIL / ATTENDEES MODAL
          ========================================================================= */}
      {selectedOutingDetail && (() => {
        const plan = activeSelectedOutingDetail || selectedOutingDetail;
        const status = getAttendeeStatus(plan);
        const joined = (plan.attendees || []).filter(a => a.status === 'joined' || a.status === 'approved');
        const pendingCount = (plan.attendees || []).filter(a => a.status === 'pending').length;
        const spotsLeft = Math.max(0, plan.maxAttendees - (joined.length + 1));
        const tInfo = ticketInfo[String(plan.id)];
        const saved = savedIds.has(plan.id);
        const close = () => setSelectedOutingDetail(null);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={close}>
            <div
              className="relative w-full sm:max-w-md max-h-[94vh] bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero */}
              <div className="relative h-56 shrink-0 bg-cover bg-center" style={{ backgroundImage: `url('${plan.spotImage}')` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-white/20 backdrop-blur-md text-white flex items-center gap-1.5">
                    {plan.accessType === 'singles_only' ? <Heart className="w-3 h-3 fill-white" /> : <Users className="w-3 h-3" />}
                    {plan.accessType === 'singles_only' ? 'Singles only' : 'Open plan'}
                  </span>
                  <button type="button" onClick={close} aria-label="Close" className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <h3 className="text-[22px] font-black leading-tight tracking-tight">{plan.spotTitle}</h3>
                  <p className="text-[13px] text-white/80 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{plan.spotAddress || 'Nairobi'}</span>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.05] p-3">
                    <Calendar className="w-4 h-4 text-[#E0533C]" />
                    <p className="text-[12px] font-extrabold mt-1.5 leading-tight">{formatOutingDate(plan.date, plan.time)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">When</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.05] p-3">
                    <Users className="w-4 h-4 text-[#E0533C]" />
                    <p className="text-[12px] font-extrabold mt-1.5 leading-tight">{spotsLeft === 0 ? 'Full' : `${spotsLeft} left`}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">of {plan.maxAttendees} spots</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.05] p-3">
                    <Ticket className="w-4 h-4 text-[#E0533C]" />
                    <p className="text-[12px] font-extrabold mt-1.5 leading-tight">{tInfo ? (tInfo.min_price > 0 ? `KES ${tInfo.min_price.toLocaleString('en-KE')}` : 'Free') : 'No ticket'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{tInfo ? (tInfo.left <= 0 ? 'sold out' : 'per ticket') : 'needed'}</p>
                  </div>
                </div>

                {status !== 'host' && tInfo && (
                  <button type="button" onClick={(e) => openBuy(e, plan)} className={OUTING_TICKET_STRIP}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0"><Ticket className="w-4 h-4" /></span>
                      <span className="min-w-0 text-left">
                        <span className="block text-[13px] font-extrabold leading-tight">{status === 'awaiting' ? `Pay to confirm your spot (${timeLeft(myPayBy(plan))})` : 'Get your ticket'}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{tInfo.left <= 10 && tInfo.left > 0 ? `Only ${tInfo.left} left` : 'Secure it with M-Pesa'}</span>
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                )}

                {/* Host */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E] shadow-sm shrink-0" style={{ backgroundImage: `url('${plan.hostAvatar}')` }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[14px] truncate">{plan.hostName}</span>
                        <HostBadge hostId={plan.hostId} verified={!!plan.isHostVerified} size="sm" />
                      </div>
                      <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block">Host {plan.hostHandle ? `· ${plan.hostHandle}` : ''}</span>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => handleToggleSave(plan, e)} aria-pressed={saved}
                    className={`shrink-0 h-9 px-3.5 rounded-full text-[12px] font-extrabold inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${saved ? 'bg-[#E0533C]/10 text-[#E0533C]' : 'bg-slate-100 dark:bg-white/[0.07] text-slate-700 dark:text-slate-200'}`}>
                    <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-[#E0533C]' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>

                {/* About */}
                {plan.description && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">About this plan</p>
                    <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{plan.description}</p>
                  </div>
                )}

                {/* Who is going */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Going ({joined.length + 1})</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#E0533C]/10 text-[12px] font-bold">
                      <img loading="lazy" decoding="async" src={plan.hostAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="truncate max-w-[110px]">{plan.hostName}</span>
                      <span className="text-[9px] font-black text-[#E0533C] uppercase">Host</span>
                    </span>
                    {joined.map((att) => (
                      <span key={att.id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.07] text-[12px] font-bold">
                        <img loading="lazy" decoding="async" src={att.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        <span className="truncate max-w-[110px]">{att.userName}</span>
                      </span>
                    ))}
                  </div>
                  {joined.length === 0 && <p className="text-[12px] text-slate-400 mt-2">Be the first to join.</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 p-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2 bg-white/95 dark:bg-[#1C1A1E]/95 backdrop-blur" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <div className="flex items-stretch gap-2">
                  {status === 'host' && (
                    <>
                      <button type="button" onClick={() => setManagingOuting(plan)} className={`${OUTING_BTN_SOFT} flex-1`}>
                        <UserCheck className="w-4 h-4 text-[#E0533C]" />
                        <span>Manage</span>
                        {pendingCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#E0533C] text-white text-[11px] font-black flex items-center justify-center">{pendingCount}</span>}
                      </button>
                      <button type="button" onClick={() => { onOpenOutingChat?.(plan); close(); }} className={`${OUTING_BTN_SOFT} flex-1`}>
                        <MessageSquare className="w-4 h-4 text-[#E0533C]" />
                        <span>Chat</span>
                      </button>
                      <button type="button" onClick={() => setTicketsFor(plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                        <Ticket className="w-4 h-4" />
                        <span>Tickets</span>
                      </button>
                    </>
                  )}
                  {status === 'joined' && (
                    <>
                      <div className={`${OUTING_BTN_STATUS} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>
                        <Check className="w-4 h-4 stroke-[3]" /><span>You're in</span>
                      </div>
                      <button type="button" onClick={() => { onOpenOutingChat?.(plan); close(); }} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                        <MessageSquare className="w-4 h-4" /><span>Group chat</span>
                      </button>
                    </>
                  )}
                  {status === 'awaiting' && (
                    <button type="button" onClick={(e) => openBuy(e, plan)} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                      <Ticket className="w-4 h-4" /><span>Pay to confirm</span><span className="text-[11px] opacity-90">· {timeLeft(myPayBy(plan))}</span>
                    </button>
                  )}
                  {status === 'pending' && (
                    <div className={`${OUTING_BTN_STATUS} flex-1 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300`}>
                      <Clock className="w-4 h-4" /><span>Waiting for host approval</span>
                    </div>
                  )}
                  {status === 'none' && (
                    <button type="button" disabled={spotsLeft === 0} onClick={(e) => { handleJoinClick(e, plan); close(); }} className={`${OUTING_BTN_PRIMARY} flex-1`}>
                      <Users className="w-4 h-4" /><span>{spotsLeft === 0 ? 'Plan full' : 'Request to join'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-stretch gap-2">
                  <button type="button" onClick={() => handleShareOutingLink(plan)} className={`${OUTING_BTN_SOFT} flex-1`}>
                    <Share2 className="w-4 h-4 text-[#E0533C]" /><span>Share plan</span>
                  </button>
                  <button type="button" onClick={() => handleCopyOutingLink(plan)} aria-label="Copy link" className={`${OUTING_BTN_SOFT} w-12 px-0`}>
                    <Link2 className="w-4 h-4 text-[#E0533C]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          HOST ATTENDEE MANAGEMENT MODAL
          ========================================================================= */}
      {activeManagingOuting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-t-[2rem] sm:rounded-[2rem] max-w-md w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white flex items-center justify-center shadow-lg shadow-[#E0533C]/25">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-black tracking-tight text-slate-900 dark:text-slate-100">Manage guests</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                    {activeManagingOuting.spotTitle} • {formatOutingDate(activeManagingOuting.date, activeManagingOuting.time)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManagingOuting(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-5 pb-6 pt-1 overflow-y-auto space-y-5 text-[13px]">
              {/* Capacity & Outing Summary Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-white/[0.05] rounded-3xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img loading="lazy" decoding="async"
                      src={activeManagingOuting.spotImage}
                      alt={activeManagingOuting.spotTitle}
                      className="w-11 h-11 rounded-2xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[14px] text-slate-900 dark:text-slate-100 truncate">
                        {activeManagingOuting.spotTitle}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {activeManagingOuting.spotAddress}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-orange-100 dark:bg-orange-950 text-[#E0533C] border border-orange-200 dark:border-orange-900 shrink-0">
                    {activeManagingOuting.accessType === 'singles_only' ? 'Singles' : 'Open'}
                  </span>
                </div>

                {/* Capacity progress */}
                {(() => {
                  const confirmedCount = (activeManagingOuting.attendees || []).filter(a => a.status === 'joined' || a.status === 'approved').length + 1; // + host
                  const remaining = Math.max(0, activeManagingOuting.maxAttendees - confirmedCount);
                  const isFull = remaining === 0;
                  const pct = Math.min(100, Math.round((confirmedCount / activeManagingOuting.maxAttendees) * 100));
                  return (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#E0533C]" />
                          <span>Squad: {confirmedCount} / {activeManagingOuting.maxAttendees} Filled</span>
                        </span>
                        <span className={isFull ? 'text-rose-500 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                          {isFull ? 'Outing Full' : `${remaining} slots left`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#E0533C] to-[#EE8A47] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 1. Pending Join Requests */}
              {(() => {
                const pendingList = (activeManagingOuting.attendees || []).filter(a => a.status === 'pending');
                const confirmedCount = (activeManagingOuting.attendees || []).filter(a => a.status === 'joined' || a.status === 'approved').length + 1;
                const isFull = confirmedCount >= activeManagingOuting.maxAttendees;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-[14px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Pending Join Requests ({pendingList.length})</span>
                      </h4>
                      {pendingList.length > 0 && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          Requires Action
                        </span>
                      )}
                    </div>

                    {pendingList.length === 0 ? (
                      <div className="p-4 bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                        <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                          No pending join requests right now.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          When explorers request to join this plan, their profile and approval actions will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pendingList.map((applicant) => (
                          <div
                            key={applicant.id}
                            className="p-3.5 bg-slate-50 dark:bg-white/[0.05] rounded-3xl space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img loading="lazy" decoding="async"
                                  src={applicant.userAvatar}
                                  alt={applicant.userName}
                                  className="w-11 h-11 rounded-full object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="font-black text-[14px] text-slate-900 dark:text-slate-100 truncate">
                                      {applicant.userName}
                                    </h5>
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      <span>Verified</span>
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {applicant.userHandle || '@explorer'} • Nairobi Hangouts
                                  </p>
                                </div>
                              </div>

                              <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold shrink-0 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                Pending
                              </span>
                            </div>

                            {/* Action buttons: Approve and Decline */}
                            <div className="flex items-center gap-2 pt-1 border-0">
                              <button
                                type="button"
                                disabled={isProcessingAction === applicant.id || isFull}
                                onClick={() => handleApproveApplicant(activeManagingOuting.id, applicant.id)}
                                className={`${OUTING_BTN_PRIMARY} flex-1`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{isProcessingAction === applicant.id ? 'Approving…' : isFull ? 'Plan full' : 'Approve'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isProcessingAction === applicant.id}
                                onClick={() => handleDeclineApplicant(activeManagingOuting.id, applicant.id)}
                                className={`${OUTING_BTN_SOFT} px-4`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Confirmed Attendees & Host */}
              {(() => {
                const waiting = (activeManagingOuting.attendees || []).filter(a => a.status === 'awaiting_payment');
                if (!waiting.length) return null;
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-extrabold text-[14px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>Approved, waiting for payment ({waiting.length})</span>
                    </h4>
                    {waiting.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#E0533C]/[0.06] px-3 py-2 text-xs">
                        <span className="font-bold truncate">{a.userHandle || a.userName}</span>
                        <span className="text-[#E0533C] font-bold shrink-0">{timeLeft(a.payBy)}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500">If they do not pay in time, their approval is cancelled automatically.</p>
                  </div>
                );
              })()}

              {(() => {
                const confirmedList = (activeManagingOuting.attendees || []).filter(a => a.status === 'joined' || a.status === 'approved');

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2">
                      <Bookmark className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>
                        Saved by {saveCounts[activeManagingOuting.id] ?? 0} {(saveCounts[activeManagingOuting.id] ?? 0) === 1 ? 'person' : 'people'}
                      </span>
                    </p>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span>Confirmed Squad ({confirmedList.length + 1})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Host + Approved Members
                      </span>
                    </h4>

                    <div className="space-y-1.5">
                      {/* Host line */}
                      <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img loading="lazy" decoding="async"
                            src={activeManagingOuting.hostAvatar}
                            alt="Host"
                            className="w-8 h-8 rounded-full object-cover border border-orange-300 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-extrabold text-xs">{activeManagingOuting.hostName}</span>
                              <HostBadge hostId={activeManagingOuting.hostId} verified={!!activeManagingOuting.isHostVerified} size="xs" />
                            </div>
                            <span className="text-[9px] text-[#E0533C] font-black uppercase">Host & Organizer</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                          Confirmed
                        </span>
                      </div>

                      {/* Confirmed / Approved applicants */}
                      {confirmedList.map((att) => (
                        <div
                          key={att.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <img loading="lazy" decoding="async"
                              src={att.userAvatar}
                              alt={att.userName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs">{att.userName}</span>
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              </div>
                              <span className="text-[10px] text-slate-400">{att.userHandle || '@explorer'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Approved</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer with Group Chat Shortcut */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenOutingChat?.(activeManagingOuting);
                  setManagingOuting(null);
                }}
                className="flex-1 py-3 px-4 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Outing Group Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setManagingOuting(null)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {shareCardFor && (myPlan === 'pro' || myPlan === 'elite') && (
        <OutingShareCard
          plan={shareCardFor}
          tier={myPlan}
          link={buildOutingLink(shareCardFor)}
          onClose={() => setShareCardFor(null)}
          onShared={() => track('share', 'outing', shareCardFor.id)}
          showToast={showToast}
        />
      )}
      {buyFor && (
        <TicketBuySheet
          kind="outing"
          source={String(buyFor.id)}
          signedIn={isUserSignedIn || !!currentUserId}
          onNeedSignIn={() => { setBuyFor(null); showToast('Please sign in to buy tickets'); onOpenAuth(); }}
          onClose={() => setBuyFor(null)}
          onOpenMyTickets={() => setMyTicketsOpen(true)}
        />
      )}
      {myTicketsOpen && <MyTicketsSheet onClose={() => setMyTicketsOpen(false)} />}
      {ticketsFor && (
        <HostTicketsPanel
          kind="outing"
          source={String(ticketsFor.id)}
          title={ticketsFor.spotTitle}
          onClose={() => setTicketsFor(null)}
          onEditPoster={() => { const p = ticketsFor; setTicketsFor(null); handleShareOutingLink(p); }}
          onToast={(m, t) => showToast(m, { type: t === 'error' ? 'error' : 'success' })}
        />
      )}

      {upgradePrompt && (() => {
        const onPro = /\bpro\b/i.test(upgradePrompt.message);
        const next = onPro ? 'Elite' : 'Pro';
        const isCap = upgradePrompt.kind === 'attendee_cap';
        return (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1A1E] p-6 space-y-4 shadow-xl">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E0533C]">Plan limit reached</p>
              <h3 className="text-lg font-black tracking-tight">
                {isCap ? 'That is more guests than your plan allows' : 'You have used all your outings this month'}
              </h3>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {isCap
                  ? 'Pick a smaller group size, or move up a plan to host bigger outings.'
                  : 'Your count resets at the start of next month, or you can move up a plan to host more now.'}
              </p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Free: 4 outings a month, up to 10 guests. Pro: 10 outings, up to 30 guests. Elite: unlimited.
              </p>
              <div className="flex gap-2 pt-1">
                {onOpenPlans && (
                  <button
                    type="button"
                    onClick={() => { setUpgradePrompt(null); setIsHostModalOpen(false); onOpenPlans(); }}
                    className="flex-1 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-[13px] font-black cursor-pointer"
                  >
                    See {next} plan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUpgradePrompt(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[13px] font-black cursor-pointer"
                >
                  {isCap ? 'Change group size' : 'Not now'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
export default OutingsTab;
