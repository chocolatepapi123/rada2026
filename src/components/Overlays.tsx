
import { useUnclaimedSpots, spotInCategory, mergeSpots, sortTrending, formatOpeningHours } from '../lib/spotsFeed.ts';
import React, { useState, useEffect, useRef } from 'react';
import { track } from '../lib/tracking';
import { useActivePromotions, businessRankMap, sortByPromotion } from '../lib/promotions';
import { searchProfiles, type CloudProfileHit } from '../lib/socialsCloud.ts';
import { getStoredLanguage, saveStoredLanguage, translations, type AppLanguage } from '../utils/i18n.ts';
import { 
  X, 
  Sparkles, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Upload, 
  Users, 
  ArrowLeft, 
  ExternalLink, 
  QrCode,
  Moon,
  Sun,
  ShieldCheck,
  User,
  Star,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Ticket,
  ChevronRight,
  Bell,
  Lock,
  Trash2,
  Eye,
  HelpCircle,
  FileText,
  Share2,
  Sliders,
  Compass,
  Film,
  Music,
  Heart,
  Hotel,
  Palmtree,
  Coffee,
  UtensilsCrossed,
  Shirt,
  Store,
  Percent,
  Tag,
  Check,
  Bookmark,
  Flame,
  KeyRound,
  Trees,
  Plus,
  Globe,
  Instagram,
  Phone,
  Building2,
  Gamepad2,
  Camera
} from 'lucide-react';
import { 
  SpotItem, 
  EventItem, 
  CinemaMovie,
  DatingProfile, 
  EmergencyContact,
  Review,
  UserProfile,
  SavedItem,
  BusinessOffer
} from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { shareContent } from '../utils/shareUtils.ts';
import { getSpotMenuHeading } from '../utils/spotMenuUtils.ts';
import { 
  doesEventMatchDay, 
  getCleanDateHeader, 
  getCategoryBadgeStyle, 
  isDateToday 
} from '../utils/calendarUtils.ts';
import { EventsExplorer } from './EventsExplorer.tsx';
import { CinemaExplorer } from './CinemaExplorer.tsx';
import { SpotsExplorer } from './SpotsExplorer.tsx';
import { useLocationPreference } from '../lib/geo.ts';
import { pickTrendingSpots } from '../lib/trendingSpots.ts';
import { getSourceLabel } from '../utils/eventUtils.ts';
import { deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import { AdminConfirmModal } from './AdminConfirmModal.tsx';
import { ClaimOfferButton, ReviewReplyBlock } from './RetentionBits';

interface OverlaysProps {
  // Overlays state
  activeOverlay: string | null;
  onCloseOverlay: () => void;

  spots: SpotItem[];
  events?: EventItem[];
  cinemaMovies?: CinemaMovie[];
  offers?: BusinessOffer[];
  onOpenSpotDetails: (spot: SpotItem) => void;
  onOpenEventDetails?: (event: EventItem) => void;
  onBookCinema?: (movie: CinemaMovie) => void;

  // Spot View Modal
  selectedSpot: SpotItem | null;
  onCloseSpotModal: () => void;
  onPlanDateFromSpot: (spot: SpotItem) => void;
  onPostReview: (spotId: number, review: Review) => void;
  onAddSpotImage: (spotId: number, imgUrl: string) => void;

  // Event View Modal
  selectedEvent: EventItem | null;
  onCloseEventModal: () => void;
  onToggleGoing: (event: EventItem) => void;
  goingEventIds: Array<number | string>;
  onBuyEventTicket: (event: EventItem) => void;

  // Current User Profile
  currentUserProfile: UserProfile;
  onUpdateCurrentUserProfile: (profile: Partial<UserProfile>) => void;
  onOpenVerificationModal?: () => void;

  // QR Modal
  qrPassTitle: string | null;
  onCloseQrModal: () => void;

  // Plan a date workflow (SPEC 5: allow free browsing across all categories)
  isPlanDateModalOpen: boolean;
  onClosePlanDateModal: () => void;
  onSelectSpotForDate: (spot: SpotItem) => void;
  datePlanningSpot: SpotItem | null;
  onConfirmDateInvite: (spot: SpotItem, date: string, time: string) => void;

  // Create Group Modal
  isCreateGroupOpen: boolean;
  onCloseCreateGroup: () => void;
  discoveryProfiles: DatingProfile[];
  onCreateGroup: (name: string, members: string[]) => void;

  // Dedicated View All (SPEC 3: strictly display items matching that category only)
  viewAllTitle: string | null;
  viewAllCategory?: string | null;
  onCloseViewAll: () => void;

  // SOS & Profile & Settings
  isGpsBroadcasting: boolean;
  onToggleGps: () => void;
  emergencyContacts: EmergencyContact[];
  onAddEmergencyContact: (name: string, phone: string) => void;
  onDeleteEmergencyContact?: (id: string) => void;

  // Theme
  isDarkMode: boolean;
  onToggleTheme: () => void;

  showToast: (msg: string, options?: any) => void;
  selectedLocation?: string;
  activeCategory?: string;
  activeCategories?: string[];
  onOpenSaved?: () => void;
  onOpenAccountSettings?: () => void;
  savedCount?: number;
  savedItems?: SavedItem[];
  onToggleSave?: (item: any, kind: 'spot' | 'event' | 'offer') => void;
  onNavigateToCalendar?: (dateStr?: string, eventId?: number | string) => void;
  /** Opens the venue map for a live event (coordinates are looked up on demand) */
  onOpenEventMap?: (event: EventItem) => void;
  isAdmin?: boolean;
  onDeleteSpot?: (spot: SpotItem) => Promise<void> | void;
}

export const Overlays: React.FC<OverlaysProps> = ({
  activeOverlay,
  onCloseOverlay,
  selectedLocation,
  activeCategory,
  activeCategories,
  spots,
  events = [],
  cinemaMovies = [],
  offers = [],
  savedItems = [],
  onToggleSave,
  onNavigateToCalendar,
  onOpenEventMap,
  onOpenSpotDetails,
  onOpenEventDetails,
  onBookCinema,
  selectedSpot,
  onCloseSpotModal,
  onPlanDateFromSpot,
  onPostReview,
  onAddSpotImage,
  selectedEvent,
  onCloseEventModal,
  onToggleGoing,
  goingEventIds,
  onBuyEventTicket,
  currentUserProfile,
  onUpdateCurrentUserProfile,
  onOpenVerificationModal,
  qrPassTitle,
  onCloseQrModal,
  isPlanDateModalOpen,
  onClosePlanDateModal,
  onSelectSpotForDate,
  datePlanningSpot,
  onConfirmDateInvite,
  isCreateGroupOpen,
  onCloseCreateGroup,
  discoveryProfiles,
  onCreateGroup,
  viewAllTitle,
  viewAllCategory,
  onCloseViewAll,
  isGpsBroadcasting,
  onToggleGps,
  emergencyContacts,
  onAddEmergencyContact,
  onDeleteEmergencyContact,
  isDarkMode,
  onToggleTheme,
  showToast,
  onOpenSaved,
  onOpenAccountSettings,
  savedCount,
  isAdmin = false,
  onDeleteSpot
}) => {
  // Admin Spot Deletion state
  const [spotToDelete, setSpotToDelete] = useState<SpotItem | null>(null);

  // Spot Active Photo Index
  const [activeSpotImgIndex, setActiveSpotImgIndex] = useState(0);

  // Review Submission State with Deduplication Guard & 5-photo limit
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (reviewPhotos.length >= 5) {
      showToast('Maximum 5 photos allowed per review.');
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(reviewPhotos, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast('Photo already selected.');
    } else if (result.duplicateCount > 0 && result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s).`);
    } else if (result.exceededLimit) {
      showToast('Maximum 5 photos limit reached.');
    } else if (result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s) to review.`);
    }

    setReviewPhotos(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveReviewPhoto = (indexToRemove: number) => {
    setReviewPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Photo removed from review.');
  };

  // View All offers: same order as Home (promoted first as chosen by RADA, then latest to earliest).
  const activePromos = useActivePromotions();
  const sortedOffers = React.useMemo(
    () => sortByPromotion(offers || [], (o) => o.businessId, businessRankMap(activePromos), (o) => o.createdAt),
    [offers, activePromos]
  );

  // Spot analytics: one view per spot per session.
  useEffect(() => {
    if (selectedSpot?.id !== undefined && selectedSpot?.id !== null) track('view', 'spot', selectedSpot.id);
  }, [selectedSpot?.id]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot) return;
    if (!newReviewText.trim()) {
      showToast('Please type your review experience.');
      return;
    }

    const review: Review = {
      id: `rev-${Date.now()}`,
      userName: currentUserProfile?.name || 'RADA member',
      userHandle: currentUserProfile?.handle || '@explorer',
      userAvatar: currentUserProfile?.avatar || '',
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewText.trim(),
      images: reviewPhotos.length > 0 ? reviewPhotos : undefined
    };

    onPostReview(selectedSpot.id, review);
    setNewReviewText('');
    setReviewPhotos([]);
    setShowReviewForm(false);
    showToast('Review Submitted');
  };


  // Plan a date DateTime picker state
  const [chosenDate, setChosenDate] = useState('2026-10-25');
  const [chosenTime, setChosenTime] = useState('19:00');
  // SPEC 5: Plan a date - free browsing across all categories
  const [planDateCategory, setPlanDateCategory] = useState<string>('all');
  const [planDateSearch, setPlanDateSearch] = useState('');
  const [localCategoryOverride, setLocalCategoryOverride] = useState<string | null>(null);
  const { spots: unclaimedFeed } = useUnclaimedSpots();
  const { origin } = useLocationPreference();

  // SOS: read the person's real position whenever the SOS screen opens (never a fixed point).
  const [sosCoords, setSosCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sosLocStatus, setSosLocStatus] = useState<'idle' | 'locating' | 'ready' | 'unavailable'>('idle');
  useEffect(() => {
    if (activeOverlay !== 'sosOverlay') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSosLocStatus('unavailable');
      return;
    }
    let cancelled = false;
    setSosLocStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setSosCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSosLocStatus('ready');
      },
      () => {
        if (cancelled) return;
        setSosCoords(null);
        setSosLocStatus('unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
    return () => {
      cancelled = true;
    };
  }, [activeOverlay]);
  const sosLocationUrl = sosCoords
    ? `https://maps.google.com/?q=${sosCoords.lat.toFixed(6)},${sosCoords.lng.toFixed(6)}`
    : null;
  const sosLocationText = sosLocationUrl
    ? `My live location: ${sosLocationUrl}`
    : 'I could not get my location. Please call me right away.';

  useEffect(() => {
    setLocalCategoryOverride(null);
  }, [viewAllCategory]);

  // Create Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMemberNames, setSelectedGroupMemberNames] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupHits, setGroupHits] = useState<CloudProfileHit[]>([]);
  const [groupSearching, setGroupSearching] = useState(false);
  useEffect(() => {
    const q = groupSearch.trim().replace(/^@/, '');
    if (q.length < 2) { setGroupHits([]); setGroupSearching(false); return; }
    setGroupSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const hits = await searchProfiles(q, 12);
        if (!cancelled) setGroupHits(hits);
      } catch {
        if (!cancelled) setGroupHits([]);
      } finally {
        if (!cancelled) setGroupSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [groupSearch]);

  // Emergency contact creation
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Active App Language
  const [appLang, setAppLang] = useState<AppLanguage>(() => getStoredLanguage());

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setAppLang(e.detail);
    };
    window.addEventListener('rada_language_changed', handleLangChange);
    return () => window.removeEventListener('rada_language_changed', handleLangChange);
  }, []);

  // Settings State (SPEC 6: Redesign Settings like Instagram/TikTok)
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [datingDiscoverable, setDatingDiscoverable] = useState(true);

  // Profile Bio & Relationship Status state (SPEC 6: Rename Profile, strictly Single / Not single)
  const [profileBio, setProfileBio] = useState(currentUserProfile?.bio || 'Discovering local hangouts, good music and vibes.');
  const [profileAvatar, setProfileAvatar] = useState(currentUserProfile?.avatar || '');
  const [profileRelationshipStatus, setProfileRelationshipStatus] = useState<'single' | 'not_single'>(currentUserProfile?.relationshipStatus || 'single');

  useEffect(() => {
    if (currentUserProfile) {
      setProfileBio(currentUserProfile.bio);
      setProfileAvatar(currentUserProfile.avatar);
      setProfileRelationshipStatus(currentUserProfile.relationshipStatus);
    }
  }, [currentUserProfile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileAvatar(event.target.result as string);
          showToast('Profile photo updated!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* SPOT DETAILS MODAL (SPEC 1: Multi-photos carousel & reviews photo upload only) */}
      {selectedSpot && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
          <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
              <button
                onClick={onCloseSpotModal}
                className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">
                Spot Hub & Reviews
              </h3>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const isSpotSaved = savedItems.some(s => String(s.id) === String(selectedSpot.id) && s.kind === 'spot');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSave?.(selectedSpot, 'spot');
                        showToast(isSpotSaved ? 'Removed from Vault' : 'Saved to Vault');
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                        isSpotSaved
                          ? 'bg-[#E0533C] text-white ring-2 ring-orange-400/40'
                          : 'bg-[#F8F8F6] hover:bg-slate-200 dark:bg-[#1C1A1E] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E0533C]'
                      }`}
                      title={isSpotSaved ? 'Saved to Vault (Tap to remove)' : 'Save to Vault'}
                    >
                      <Bookmark className={`w-4 h-4 ${isSpotSaved ? 'fill-white' : ''}`} />
                    </button>
                  );
                })()}
                <button

                  type="button"
                  onClick={() => {
                    shareContent({
                      title: `RADA Spot: ${selectedSpot.title}`,
                      text: `Check out ${selectedSpot.title} (${selectedSpot.category}) in ${selectedSpot.address} on RADA Nairobi! Rating: ★${selectedSpot.rating}.`,
                      url: window.location.href,
                      onSuccess: showToast,
                      onError: showToast
                    });
                  }}
                  title="Share Spot Link"
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSpot) {
                        setSpotToDelete(selectedSpot);
                      }
                    }}
                    title="Delete Spot (Admin)"
                    className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900 flex items-center justify-center text-red-600 dark:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-20">
            {/* Multi-Photo Carousel Hero */}
            {(() => {
              const allImages = (selectedSpot.images && selectedSpot.images.length > 0)
                ? selectedSpot.images
                : [selectedSpot.img];
              const safeIndex = activeSpotImgIndex % allImages.length;
              const currentHeroImg = allImages[safeIndex] || selectedSpot.img;
              const isSpotSaved = savedItems.some(s => String(s.id) === String(selectedSpot.id) && s.kind === 'spot');

              return (
                <div className="space-y-2">
                  <div
                    className="h-64 rounded-3xl bg-cover bg-center relative shadow-md transition-all duration-300"
                    style={{ backgroundImage: `url('${currentHeroImg}')` }}
                  >
                    {/* Top Save Icon on Spot Image */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave?.(selectedSpot, 'spot');
                        showToast(isSpotSaved ? 'Removed from Vault' : 'Saved to Vault');
                      }}
                      className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition shadow-md cursor-pointer ${
                        isSpotSaved
                          ? 'bg-[#E0533C] text-white ring-2 ring-white/50'
                          : 'bg-black/60 hover:bg-black/85 text-white'
                      }`}
                      title={isSpotSaved ? 'Saved to Vault (Tap to remove)' : 'Save to Vault'}
                    >
                      <Bookmark className={`w-4 h-4 ${isSpotSaved ? 'fill-white' : ''}`} />
                    </button>

                    {selectedSpot.price && (
                      <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {selectedSpot.price}
                      </span>
                    )}
                    {(() => {
                      const revCount = (selectedSpot.reviews && selectedSpot.reviews.length > 0)
                        ? selectedSpot.reviews.length
                        : (selectedSpot.reviewCount || 0);
                      const hasReviews = revCount > 0;
                      return (
                        <span className="absolute bottom-3 left-3 bg-white/90 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                          <Star className={`w-3.5 h-3.5 ${hasReviews ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                          <span>{hasReviews ? `${selectedSpot.rating} (${revCount} ${revCount === 1 ? 'review' : 'reviews'})` : 'New (No reviews yet)'}</span>
                        </span>
                      );
                    })()}
                    {allImages.length > 1 && (
                      <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {safeIndex + 1} / {allImages.length} photos
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Row if Multiple Images */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                      {allImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveSpotImgIndex(i)}
                          className={`w-14 h-14 rounded-xl bg-cover bg-center shrink-0 cursor-pointer border-2 transition ${
                            i === safeIndex ? 'border-[#E0533C] scale-105' : 'border-transparent opacity-70'
                          }`}
                          style={{ backgroundImage: `url('${imgUrl}')` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Title, Address & Tags */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {selectedSpot.title}
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {selectedSpot.hasPendingClaim ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                      Proof Under Review
                    </span>
                  ) : null}
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-[#E0533C]">
                    {selectedSpot.category}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>{selectedSpot.address}</span>
              </p>
              {selectedSpot.exactLocationTag && (
                <p className="text-xs text-[#E0533C] font-semibold flex items-center gap-1">
                  <span>📍 Tag: {selectedSpot.exactLocationTag}</span>
                  {selectedSpot.landmark && <span className="text-slate-400">• Near {selectedSpot.landmark}</span>}
                </p>
              )}
              {selectedSpot.openingHours && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hours: {typeof selectedSpot.openingHours === 'string' ? selectedSpot.openingHours : (formatOpeningHours(selectedSpot.openingHours) || 'Open Daily')}</span>
                </p>
              )}
              {selectedSpot.description && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                  {selectedSpot.description}
                </p>
              )}
            </div>

            {/* ACTION BUTTONS: Uber, Bolt, Add to Plan, View on Calendar, and Plan a Date */}
            <div className="space-y-2 pt-1 pb-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    showToast(`Opening Uber to ${selectedSpot.title}...`);
                    window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(selectedSpot.address)}`, '_blank');
                  }}
                  className="py-3 bg-black text-white hover:bg-slate-800 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Car className="w-4 h-4" />
                  <span>Request Uber</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`Opening Bolt to ${selectedSpot.title}...`);
                    window.open('https://bolt.eu/', '_blank');
                  }}
                  className="py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Car className="w-4 h-4" />
                  <span>Request Bolt</span>
                </button>
              </div>

              {/* Upcoming Events at this Spot */}
              {(() => {
                const spotEvents = events.filter(e => 
                  (selectedSpot.title && e.location?.toLowerCase().includes(selectedSpot.title.toLowerCase())) ||
                  (e.title && e.title.toLowerCase().includes(selectedSpot.title.toLowerCase())) ||
                  (selectedSpot.businessId && e.businessId === selectedSpot.businessId)
                );
                if (spotEvents.length === 0) return null;
                return (
                  <div className="p-3 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#E0533C] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Upcoming Events Here ({spotEvents.length})</span>
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {spotEvents.map(evt => {
                        const isEvtSaved = savedItems.some(s => String(s.id) === String(evt.id) && s.kind === 'event');
                        return (
                          <div key={evt.id} className="p-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">{evt.title}</h5>
                              <button
                                type="button"
                                onClick={() => {
                                  onCloseSpotModal();
                                  onNavigateToCalendar?.(evt.date, evt.id);
                                }}
                                className="text-[10px] font-bold text-[#E0533C] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>{evt.date} {evt.time ? `• ${evt.time}` : ''}</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onToggleSave?.(evt, 'event')}
                                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                  isEvtSaved 
                                    ? 'bg-[#E0533C] text-white border-[#E0533C]' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                                title={isEvtSaved ? 'In Your Plans' : 'Add to Plan'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isEvtSaved ? 'fill-white' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onCloseSpotModal();
                                  onNavigateToCalendar?.(evt.date, evt.id);
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg transition cursor-pointer"
                              >
                                View ↗
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => onPlanDateFromSpot(selectedSpot)}
                className="w-full py-3.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Plan Hangout / Date at This Spot</span>
              </button>
            </div>

            {/* Direct Contact & Social Links Bar */}
            {(selectedSpot.phone || selectedSpot.website || selectedSpot.instagram || selectedSpot.socialLinks?.website || selectedSpot.socialLinks?.instagram) && (
              <div className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Contact & Links</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedSpot.phone && (
                    <a
                      href={`tel:${selectedSpot.phone}`}
                      onClick={() => track('call', 'spot', selectedSpot.id)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:text-[#E0533C] flex items-center gap-1.5 transition"
                    >
                      <Phone className="w-3 h-3 text-[#E0533C]" />
                      <span>{selectedSpot.phone}</span>
                    </a>
                  )}
                  {(selectedSpot.website || selectedSpot.socialLinks?.website) && (
                    <a
                      href={selectedSpot.website || selectedSpot.socialLinks?.website}
                      onClick={() => track('website', 'spot', selectedSpot.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:text-[#E0533C] flex items-center gap-1.5 transition"
                    >
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span>Website</span>
                    </a>
                  )}
                  {(selectedSpot.instagram || selectedSpot.socialLinks?.instagram) && (
                    <a
                      href={`https://instagram.com/${(selectedSpot.instagram || selectedSpot.socialLinks?.instagram || '').replace('@', '')}`}
                      onClick={() => track('website', 'spot', selectedSpot.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:text-pink-600 flex items-center gap-1.5 transition"
                    >
                      <Instagram className="w-3 h-3 text-pink-500" />
                      <span>{selectedSpot.instagram || selectedSpot.socialLinks?.instagram}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Food & Drink / Cuisine Types */}
            {selectedSpot.cuisineTypes && selectedSpot.cuisineTypes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cuisine & Flavors</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSpot.cuisineTypes.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] text-[11px] font-bold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Dishes / Signature Drinks */}
            {selectedSpot.featuredDishes && selectedSpot.featuredDishes.length > 0 && (
              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl space-y-2">
                <span className="font-black text-xs text-[#E0533C] flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Featured Dishes & Signature Drinks</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSpot.featuredDishes.map((dish, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121113] border border-orange-200 dark:border-orange-900/50 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs">
                      ✨ {dish}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Official Uploaded Menu Document / PDF / Flyer */}
            {(selectedSpot.menuUploadUrl || (selectedSpot.menuImages && selectedSpot.menuImages.length > 0)) && (
              <div className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate text-slate-900 dark:text-slate-100">
                      Spot Menu Document
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Official printed menu / beverage brochure
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = selectedSpot.menuUploadUrl || (selectedSpot.menuImages && selectedSpot.menuImages[0]);
                    if (url) {
                      window.open(url, '_blank');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#E0533C] hover:bg-[#c9432d] text-white text-xs font-bold rounded-xl shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Menu</span>
                </button>
              </div>
            )}

            {/* Special Offers Section if present */}
            {selectedSpot.specialOffers && selectedSpot.specialOffers.length > 0 && (
              <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2">
                <span className="font-black text-xs text-[#E0533C] flex items-center gap-1 uppercase tracking-wider">
                  <Percent className="w-3.5 h-3.5" /> Special Offers & Promos
                </span>
                <div className="space-y-1">
                  {selectedSpot.specialOffers.map(o => (
                    <div key={o.id} className="flex items-start justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 dark:text-slate-100">{o.title}</strong>
                        <p className="text-[11px] text-slate-500">{o.description}</p>
                      </div>
                      <span className="bg-[#E0533C] text-white text-[9px] font-black px-2 py-0.5 rounded shrink-0">
                        {o.discount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Digital Menu Items / Experience Packages */}
            {selectedSpot.menuItems && selectedSpot.menuItems.length > 0 && (() => {
              const heading = getSpotMenuHeading(selectedSpot);
              return (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#2D6A4F]" />
                        <span>{heading.title}</span>
                      </h4>
                      {heading.subtitle && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {heading.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                      {heading.badge}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedSpot.menuItems.map(item => (
                      <div key={item.id} className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-xs block truncate">{item.name}</span>
                          <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                        </div>
                        <span className="font-extrabold text-xs text-[#E0533C] shrink-0">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Activities & Pricing List if present */}
            {selectedSpot.activitiesList && selectedSpot.activitiesList.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>Activities & Pricing</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Available experiences, gear & activity rates
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-[#E0533C] shrink-0">
                    {selectedSpot.activitiesList.length} Options
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedSpot.activitiesList.map(item => (
                    <div key={item.id} className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          {item.duration && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-semibold">
                              ⏱ {item.duration}
                            </span>
                          )}
                          <span className="font-extrabold text-xs text-[#E0533C]">{item.price}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                      {item.equipmentProvided && (
                        <p className="text-[10px] text-[#2D6A4F] font-semibold pt-0.5 flex items-center gap-1">
                          <span>🎒 Gear provided:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-normal">{item.equipmentProvided}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outdoor / Fitness / Sports Details */}
            {(selectedSpot.equipmentProvided || selectedSpot.equipmentNeeded || selectedSpot.whatToBring || selectedSpot.skillLevel) && (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-2">
                  <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Outdoor & Fitness Details</span>
                  </span>
                  {selectedSpot.skillLevel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                      {selectedSpot.skillLevel}
                    </span>
                  )}
                </div>

                {selectedSpot.equipmentProvided && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-emerald-900 dark:text-emerald-200 block">Equipment Provided:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.equipmentProvided}</p>
                  </div>
                )}

                {selectedSpot.equipmentNeeded && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-emerald-900 dark:text-emerald-200 block">Equipment Needed / Rentals:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.equipmentNeeded}</p>
                  </div>
                )}

                {selectedSpot.whatToBring && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-emerald-900 dark:text-emerald-200 block">What to Bring:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.whatToBring}</p>
                  </div>
                )}
              </div>
            )}

            {/* Event Spaces & Venues Specifications */}
            {(selectedSpot.capacity || (selectedSpot.amenitiesAV && selectedSpot.amenitiesAV.length > 0) || selectedSpot.bookingPolicies) && (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2">
                  <span className="font-black text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Venue Specifications & Event Space</span>
                  </span>
                  {selectedSpot.capacity && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                      Capacity: {selectedSpot.capacity}
                    </span>
                  )}
                </div>

                {selectedSpot.amenitiesAV && selectedSpot.amenitiesAV.length > 0 && (
                  <div className="space-y-1.5">
                    <strong className="text-[11px] text-amber-900 dark:text-amber-200 block">Included Amenities & AV Equipment:</strong>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSpot.amenitiesAV.map((amenity, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#121113] border border-amber-200 dark:border-amber-900/50 text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-amber-600" />
                          <span>{amenity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSpot.bookingPolicies && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-amber-900 dark:text-amber-200 block">Booking, Curfew & Cancellation Policies:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.bookingPolicies}</p>
                  </div>
                )}
              </div>
            )}

            {/* Booking Slots & Group Sizes */}
            {(selectedSpot.bookingSlots || selectedSpot.groupSizeMin || selectedSpot.groupSizeMax) && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 text-xs">
                <span className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Booking Slots & Group Sizes</span>
                </span>
                {selectedSpot.bookingSlots && (
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Schedule: </strong>
                    {selectedSpot.bookingSlots}
                  </p>
                )}
                {(selectedSpot.groupSizeMin || selectedSpot.groupSizeMax) && (
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Group Size: </strong>
                    {selectedSpot.groupSizeMin ? `${selectedSpot.groupSizeMin} min` : ''}
                    {selectedSpot.groupSizeMin && selectedSpot.groupSizeMax ? ' • ' : ''}
                    {selectedSpot.groupSizeMax ? `${selectedSpot.groupSizeMax} max participants` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Connect with Nature Trail Specifics */}
            {(selectedSpot.difficulty || selectedSpot.distanceDuration || selectedSpot.meetingPoint) && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-2 text-xs">
                <span className="font-black text-[#2D6A4F] dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Trees className="w-3.5 h-3.5" />
                  <span>Nature Trail & Hike Details</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {selectedSpot.difficulty && (
                    <div className="bg-white dark:bg-[#121113] p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-slate-400 block text-[10px]">Difficulty</span>
                      <strong className="text-emerald-700 dark:text-emerald-300">{selectedSpot.difficulty}</strong>
                    </div>
                  )}
                  {selectedSpot.distanceDuration && (
                    <div className="bg-white dark:bg-[#121113] p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-slate-400 block text-[10px]">Distance & Duration</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedSpot.distanceDuration}</strong>
                    </div>
                  )}
                </div>
                {selectedSpot.meetingPoint && (
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 pt-1">
                    <strong className="text-slate-900 dark:text-slate-100">📍 Meeting Point: </strong>
                    {selectedSpot.meetingPoint}
                  </p>
                )}
              </div>
            )}

            {/* Gaming & Entertainment Specifications */}
            {(selectedSpot.pricePerHour || selectedSpot.availableGames || selectedSpot.gameConsoles || selectedSpot.timeSlots) && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
                  <span className="font-black text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Gaming Rates & Setups</span>
                  </span>
                  {selectedSpot.pricePerHour && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
                      {selectedSpot.pricePerHour}
                    </span>
                  )}
                </div>

                {selectedSpot.timeSlots && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-indigo-900 dark:text-indigo-200 block">Session & Time Slots:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.timeSlots}</p>
                  </div>
                )}

                {selectedSpot.availableGames && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-indigo-900 dark:text-indigo-200 block">Available Games & Titles:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {Array.isArray(selectedSpot.availableGames) ? selectedSpot.availableGames.join(', ') : selectedSpot.availableGames}
                    </p>
                  </div>
                )}

                {selectedSpot.gameConsoles && (
                  <div className="space-y-0.5">
                    <strong className="text-[11px] text-indigo-900 dark:text-indigo-200 block">Consoles, Rigs & Gear:</strong>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSpot.gameConsoles}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Customer Reviews ({selectedSpot.reviews?.length || 0})</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {(selectedSpot.reviews && selectedSpot.reviews.length > 0)
                      ? 'Verified community ratings with photo upload'
                      : 'No ratings yet — be the first to share your experience'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer"
                >
                  {showReviewForm ? 'Cancel Review' : '+ Write Review'}
                </button>
              </div>

              {/* POST A REVIEW FORM (WITH IMAGES) */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border-2 border-[#E0533C]/40 rounded-3xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-black text-xs text-[#E0533C]">Share Your Experience</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReviewRating(star)}
                          className="p-1 focus:outline-none"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= newReviewRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Tell everyone about the food, drinks, service, and vibe..."
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] resize-none"
                  />

                  {/* Photo attachment for review with 5-photo gallery & deduplication */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span>Photos ({reviewPhotos.length}/5)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {reviewPhotos.length >= 5 ? 'Limit reached (max 5)' : 'Max 5 photos'}
                      </span>
                    </div>

                    {/* Thumbnail previews grid */}
                    {reviewPhotos.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {reviewPhotos.map((photoUrl, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group bg-slate-900 shadow-xs"
                          >
                            <img
                              src={photoUrl}
                              alt={`Review photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Individual photo removal button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveReviewPhoto(idx);
                              }}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center text-xs transition cursor-pointer z-10 shadow-sm"
                              title="Remove photo"
                              aria-label={`Remove photo ${idx + 1}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 rounded">
                              {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button (only if < 5 photos) */}
                    {reviewPhotos.length < 5 && (
                      <label className="cursor-pointer py-2 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#E0533C] flex items-center justify-center gap-1.5 transition">
                        <Plus className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span className="text-[11px] font-bold text-[#E0533C]">
                          {reviewPhotos.length === 0 ? 'Upload Review Photos (up to 5)' : '+ Add More Photos'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleReviewPhotoUpload}
                        />
                      </label>
                    )}
                  </div>


                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#E0533C] text-white font-black rounded-xl text-xs hover:bg-orange-700 transition shadow"
                  >
                    Submit Review
                  </button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-2.5">
                {(selectedSpot.reviews && selectedSpot.reviews.length > 0) ? (
                  selectedSpot.reviews.map((rev) => (
                    <div key={rev.id} className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${rev.userAvatar}')` }} />
                          <div>
                            <span className="font-bold text-xs">{rev.userName}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{rev.userHandle}</span>
                          </div>
                        </div>
                        <div className="flex items-center text-amber-500 text-[10px] font-bold">
                          ★ {rev.rating}.0
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs">{rev.comment}</p>
                      <ReviewReplyBlock reviewId={String(rev.id)} />
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {rev.images.map((img, idx) => (
                            <img key={idx} src={img} alt="User review" className="w-20 h-16 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 px-4 text-center rounded-3xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 space-y-2.5">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-[#E0533C] flex items-center justify-center mx-auto shadow-2xs">
                      <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black text-sm text-slate-900 dark:text-slate-100">
                        No reviews yet
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        Be the first to review this spot! Share your experience, rating, and photos with the RADA community.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(true)}
                      className="mt-1 px-4 py-2 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Be the first to review this spot!</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EVENT DETAILS MODAL (SPEC 3: Dresscode removed, primary ticket site) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
          <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
              <button
                onClick={onCloseEventModal}
                className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const isEventSaved = savedItems.some(s => String(s.id) === String(selectedEvent.id) && s.kind === 'event');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSave?.(selectedEvent, 'event');
                        showToast(isEventSaved ? 'Removed from Vault' : 'Saved to Vault');
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shadow-xs ${
                        isEventSaved
                          ? 'bg-[#E0533C] text-white ring-2 ring-orange-400/40'
                          : 'bg-[#F8F8F6] hover:bg-slate-200 dark:bg-[#1C1A1E] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E0533C]'
                      }`}
                      title={isEventSaved ? 'Saved to Vault (Tap to remove)' : 'Save to Vault'}
                    >
                      <Bookmark className={`w-4 h-4 ${isEventSaved ? 'fill-white' : ''}`} />
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    shareContent({
                      title: `RADA Event: ${selectedEvent.title}`,
                      text: `Check out ${selectedEvent.title} on ${selectedEvent.date} at ${selectedEvent.location} on RADA Nairobi!`,
                      url: window.location.href,
                      onSuccess: showToast,
                      onError: showToast
                    });
                  }}
                  title="Share Event Link"
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#E0533C] transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-16">
            <div
              className="h-60 rounded-3xl bg-cover bg-center relative shadow-md"
              style={selectedEvent.img ? { backgroundImage: `url('${selectedEvent.img}')` } : undefined}
            >
              {/* Top Save Icon on Event Image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const isEventSaved = savedItems.some(s => String(s.id) === String(selectedEvent.id) && s.kind === 'event');
                  onToggleSave?.(selectedEvent, 'event');
                  showToast(isEventSaved ? 'Removed from Vault' : 'Saved to Vault');
                }}
                className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition shadow-md cursor-pointer ${
                  savedItems.some(s => String(s.id) === String(selectedEvent.id) && s.kind === 'event')
                    ? 'bg-[#E0533C] text-white ring-2 ring-white/50'
                    : 'bg-black/60 hover:bg-black/85 text-white'
                }`}
                title={savedItems.some(s => String(s.id) === String(selectedEvent.id) && s.kind === 'event') ? 'Saved to Vault (Tap to remove)' : 'Save to Vault'}
              >
                <Bookmark className={`w-4 h-4 ${savedItems.some(s => String(s.id) === String(selectedEvent.id) && s.kind === 'event') ? 'fill-white' : ''}`} />
              </button>

              <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>
                  {selectedEvent.goingCount > 0
                    ? `${selectedEvent.goingCount} people going`
                    : (selectedEvent.source ? `via ${getSourceLabel(selectedEvent.source)}` : 'Be the first to go')}
                </span>
              </div>
              {selectedEvent.genre && (
                <div className="absolute bottom-3 left-3 bg-[#E0533C] text-white text-[10px] font-black px-3 py-1 rounded-full shadow">
                  {selectedEvent.genre}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {selectedEvent.title}
                </h2>
                <BusinessBadge businessId={selectedEvent.businessId} category="event_organizer" size="xs" unclaimedVerified />
              </div>
              
              {/* Clickable Event Date Tag -> Navigates directly to Calendar with date pre-selected and highlighted */}
              <button
                type="button"
                onClick={() => {
                  onCloseEventModal();
                  onNavigateToCalendar?.(selectedEvent.date, selectedEvent.id);
                }}
                className="text-xs text-[#E0533C] hover:text-orange-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 transition group cursor-pointer w-fit shadow-2xs mt-1"
                title="View on Calendar (Pre-selects this date)"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E0533C] group-hover:scale-110 transition-transform" />
                <span>{selectedEvent.date} {selectedEvent.time ? `• ${selectedEvent.time}` : ''}</span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#E0533C] text-white px-1.5 py-0.5 rounded ml-1.5 group-hover:bg-orange-700 transition">
                  View on Calendar ↗
                </span>
              </button>

              <div className="flex items-start justify-between gap-2 pt-1">
                <p className="text-xs text-slate-500 flex items-start gap-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">{selectedEvent.location}</span>
                    {selectedEvent.address && selectedEvent.address !== selectedEvent.location && (
                      <span className="block text-[11px] text-slate-400">{selectedEvent.address}</span>
                    )}
                  </span>
                </p>
                {onOpenEventMap && (
                  <button
                    type="button"
                    onClick={() => onOpenEventMap(selectedEvent)}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-black flex items-center gap-1 cursor-pointer hover:opacity-90 transition"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>View on Map</span>
                  </button>
                )}
              </div>
              {(selectedEvent.host || selectedEvent.source) && (
                <p className="text-[11px] text-slate-400 pt-1">
                  {selectedEvent.host ? `Hosted by ${selectedEvent.host}` : ''}
                  {selectedEvent.host && selectedEvent.source ? ' · ' : ''}
                  {selectedEvent.source ? `Tickets via ${getSourceLabel(selectedEvent.source)}` : ''}
                </p>
              )}
              {selectedEvent.description && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            {/* Ride to Event */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  showToast(`Opening Uber to ${selectedEvent.title}...`);
                  window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(selectedEvent.address || selectedEvent.location)}`, '_blank');
                }}
                className="py-2.5 bg-black text-white hover:bg-slate-800 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4" />
                <span>Uber to Event</span>
              </button>
              <button
                onClick={() => {
                  showToast(`Opening Bolt to ${selectedEvent.title}...`);
                  window.open('https://bolt.eu/', '_blank');
                }}
                className="py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4" />
                <span>Bolt to Event</span>
              </button>
            </div>

            {/* Performing Artists Lineup */}
            {selectedEvent.artists && selectedEvent.artists.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider">
                  Performing Artists & Lineup
                </h4>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {selectedEvent.artists.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl p-2 shrink-0"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${a.img}')` }}
                      />
                      <div>
                        <h5 className="font-bold text-xs">{a.name}</h5>
                        <p className="text-[10px] text-slate-400">{a.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No tiers scraped: point to the ticket page instead of showing nothing */}
            {(!selectedEvent.tiers || selectedEvent.tiers.length === 0) && selectedEvent.source && (
              <div className="p-3 rounded-2xl bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500">
                Ticket prices for this event are listed on {getSourceLabel(selectedEvent.source)}.
              </div>
            )}

            {/* Ticket Tier Options */}
            {selectedEvent.tiers && selectedEvent.tiers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider">
                  Ticket Tier Options
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedEvent.tiers.map((t, idx) => (
                    <div
                      key={idx}
                      className={`bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 ${
                        t.status === 'sold_out' || t.status === 'soldout' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-xs block">{t.name}</span>
                        {t.perks && <span className="text-[9px] text-slate-400 block">{t.perks}</span>}
                      </div>
                      <span className="font-black text-xs text-[#E0533C] shrink-0">{t.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => onToggleGoing(selectedEvent)}
                  className={`flex-1 py-3 font-black rounded-2xl flex items-center justify-center gap-1.5 text-xs transition shadow-xs ${
                    goingEventIds.includes(selectedEvent.id)
                      ? 'bg-[#2D6A4F] hover:bg-emerald-800 text-white shadow-md'
                      : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${goingEventIds.includes(selectedEvent.id) ? 'text-white' : 'text-[#2D6A4F]'}`} />
                  <span>{goingEventIds.includes(selectedEvent.id) ? 'Going ✓' : "I'm Going"}</span>
                </button>
                <button
                  onClick={() => onBuyEventTicket(selectedEvent)}
                  className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-1.5"
                >
                  <span>{selectedEvent.source ? `Get Tickets on ${getSourceLabel(selectedEvent.source)}` : 'Get Primary Ticket'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAN A DATE MODAL (View All Spots style explorer) */}
      {isPlanDateModalOpen && !datePlanningSpot && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#E0533C]" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Plan a Date: Pick Any Venue</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Search and select any Nairobi spot or hangout to send as a date invite
                  </p>
                </div>
              </div>
              <button 
                onClick={onClosePlanDateModal} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 text-xs">
              <SpotsExplorer
                categoryKey={planDateCategory || 'all'}
                categoryTitle="Select Venue for Date"
                spots={mergeSpots(spots, unclaimedFeed)}
                savedItems={savedItems}
                onToggleSave={onToggleSave}
                onOpenSpot={(spot) => onSelectSpotForDate(spot)}
                userCoords={origin}
                isAdmin={isAdmin}
                onDeleteSpot={(spot) => setSpotToDelete(spot)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. PLAN A DATE: DATE & TIME PICKER */}
      {datePlanningSpot && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">Set Date & Time</h3>
              </div>
              <button onClick={onClosePlanDateModal} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4 flex-1 text-xs">
              <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url('${datePlanningSpot.img}')` }}
                />
                <div>
                  <h4 className="font-black text-sm text-[#E0533C]">{datePlanningSpot.title}</h4>
                  <p className="text-[11px] text-slate-500">{datePlanningSpot.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Choose Date</label>
                  <input
                    type="date"
                    value={chosenDate}
                    onChange={(e) => setChosenDate(e.target.value)}
                    className="w-full p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Choose Time</label>
                  <input
                    type="time"
                    value={chosenTime}
                    onChange={(e) => setChosenTime(e.target.value)}
                    className="w-full p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => onConfirmDateInvite(datePlanningSpot, chosenDate, chosenTime)}
                className="w-full py-3.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-lg transition"
              >
                Send Date Invitation to Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CREATE GROUP MODAL */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Create New Group Chat
              </h3>
              <button onClick={onCloseCreateGroup} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4 flex-1 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-300">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Weekend Hangout Crew"
                  className="w-full p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-600 dark:text-slate-300">Add Members by @username</label>
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Type at least 2 letters of a username"
                  className="w-full p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                />
                {selectedGroupMemberNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGroupMemberNames.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedGroupMemberNames(prev => prev.filter(n => n !== h))}
                        className="px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] dark:text-[#D17A68] text-[11px] font-bold flex items-center gap-1"
                      >
                        <span>{h}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {groupSearching && <p className="text-[11px] text-slate-400 px-1">Searching…</p>}
                  {!groupSearching && groupSearch.trim().replace(/^@/, '').length >= 2 && groupHits.length === 0 && (
                    <p className="text-[11px] text-slate-400 px-1">No members found with that username.</p>
                  )}
                  {groupHits.map((p) => {
                    const handle = '@' + p.username;
                    const isChecked = selectedGroupMemberNames.includes(handle);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center justify-between p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full bg-cover bg-center bg-slate-200 dark:bg-slate-700"
                            style={p.avatar_url ? { backgroundImage: `url('${p.avatar_url}')` } : undefined}
                          />
                          <h5 className="font-bold text-xs">{handle}</h5>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGroupMemberNames(prev => prev.includes(handle) ? prev : [...prev, handle]);
                            else setSelectedGroupMemberNames(prev => prev.filter(n => n !== handle));
                          }}
                          className="w-4 h-4 accent-[#E0533C]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!newGroupName.trim()) {
                    showToast('Enter a group name.');
                    return;
                  }
                  if (selectedGroupMemberNames.length === 0) {
                    showToast('Select at least one member.');
                    return;
                  }
                  onCreateGroup(newGroupName.trim(), selectedGroupMemberNames);
                  setNewGroupName('');
                  setSelectedGroupMemberNames([]);
                  setGroupSearch('');
                  setGroupHits([]);
                }}
                className="w-full py-3 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-black rounded-xl shadow-md transition"
              >
                Create Group Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QR PASS MODAL */}
      {qrPassTitle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-xs rounded-3xl p-5 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">{qrPassTitle}</h3>
            <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-[#121113] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
              <QrCode className="w-28 h-28 text-slate-800 dark:text-slate-200" />
              <span className="text-[10px] font-mono font-bold text-slate-500 mt-2">PASS-{Date.now().toString().slice(-6)}</span>
            </div>
            <p className="text-[11px] text-slate-400">Present this QR code at the door for express gate entry.</p>
            <button
              onClick={onCloseQrModal}
              className="w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* 8. EMERGENCY & SOS OVERLAY */}
      {activeOverlay === 'sosOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#0C0A0E] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider">{translations[appLang].sosHubTitle}</h3>
              </div>
              <button 
                onClick={onCloseOverlay} 
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs flex-1">
              {/* WhatsApp Emergency Alert */}
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="font-bold text-red-700 dark:text-red-300 text-xs">
                    Quick WhatsApp Alert
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                    Share an instant emergency SOS message with your contacts or group chat.
                  </p>
                  <p className="text-[10px] mt-1 font-semibold text-slate-500 dark:text-slate-400">
                    {sosLocStatus === 'locating' && 'Finding your location...'}
                    {sosLocStatus === 'ready' && 'Your current location will be included.'}
                    {sosLocStatus === 'unavailable' && 'Location unavailable. Allow location access so help can find you.'}
                  </p>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🚨 EMERGENCY SOS (RADA): Urgent help needed! ${sosLocationText}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Hotlines */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  National Hotlines & Police
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:999"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold hover:border-red-500 transition"
                  >
                    <span className="text-slate-800 dark:text-slate-200">Police 999</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-lg">999</span>
                  </a>
                  <a
                    href="tel:112"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold hover:border-red-500 transition"
                  >
                    <span className="text-slate-800 dark:text-slate-200">Police 112</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-lg">112</span>
                  </a>
                  <a
                    href="tel:1199"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold hover:border-red-500 transition"
                  >
                    <span className="text-slate-800 dark:text-slate-200">Red Cross Ambulance</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-lg">1199</span>
                  </a>
                  <a
                    href="tel:999"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold hover:border-red-500 transition"
                  >
                    <span className="text-slate-800 dark:text-slate-200">Emergency 999</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-lg">999</span>
                  </a>
                </div>
              </div>

              {/* Hospitals */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  {translations[appLang].hospitalsTitle}
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Aga Khan University Hospital</h5>
                      <p className="text-[10px] text-slate-400">Parklands • 24/7 Casualty & Trauma Unit</p>
                    </div>
                    <a href="tel:+254203662000" className="px-3 py-1.5 bg-[#1E5338] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold shrink-0">
                      Call 020-3662000
                    </a>
                  </div>
                  <div className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">The Nairobi Hospital</h5>
                      <p className="text-[10px] text-slate-400">Argwings Kodhek Rd • Accident & Emergency</p>
                    </div>
                    <a href="tel:+254202845000" className="px-3 py-1.5 bg-[#1E5338] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold shrink-0">
                      Call 020-2845000
                    </a>
                  </div>
                  <div className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">M.P. Shah Hospital</h5>
                      <p className="text-[10px] text-slate-400">Shivachi Rd, Parklands • 24/7 Emergency Wing</p>
                    </div>
                    <a href="tel:+254204291100" className="px-3 py-1.5 bg-[#1E5338] hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold shrink-0">
                      Call 020-4291100
                    </a>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts with Direct SMS & Call actions */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    {translations[appLang].savedEmergencyContacts} ({emergencyContacts.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {emergencyContacts.length === 0 ? (
                    <p className="text-slate-400 text-xs italic p-3 bg-[#F8F8F6] dark:bg-[#151319] rounded-2xl text-center">
                      No emergency contacts saved yet. Add your trusted friends or family below.
                    </p>
                  ) : (
                    emergencyContacts.map((c) => {
                      const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
                      const emergencyDraftMsg = `🚨 EMERGENCY SOS (RADA): Urgent assistance needed! ${sosLocationText} Please check on me immediately.`;
                      return (
                        <div key={c.id} className="p-3 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">{c.name}</span>
                            <span className="text-slate-400 text-[11px] block">{c.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`sms:${cleanPhone}?body=${encodeURIComponent(emergencyDraftMsg)}`}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition"
                              title="Draft Emergency SMS"
                            >
                              <span>Text SMS</span>
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2.5 py-1.5 bg-[#1E5338] hover:bg-emerald-800 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition"
                              title="Call Contact"
                            >
                              <span>Call</span>
                            </a>
                            {onDeleteEmergencyContact && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteEmergencyContact(c.id);
                                  showToast(`Removed ${c.name} from emergency contacts.`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                                title="Remove Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Emergency Contact Form */}
                <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#151319] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{translations[appLang].addEmergencyContact}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder={translations[appLang].contactNamePlaceholder}
                      className="p-2.5 bg-white dark:bg-[#0C0A0E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="tel"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder={translations[appLang].contactPhonePlaceholder}
                      className="p-2.5 bg-white dark:bg-[#0C0A0E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newContactName.trim() || !newContactPhone.trim()) {
                        showToast('Please provide a contact name and valid phone number.');
                        return;
                      }
                      onAddEmergencyContact(newContactName.trim(), newContactPhone.trim());
                      setNewContactName('');
                      setNewContactPhone('');
                      showToast(`Added ${newContactName.trim()} to emergency contacts!`);
                    }}
                    className="w-full py-2.5 bg-[#1E5338] text-white font-bold rounded-xl shadow-xs text-xs hover:bg-emerald-900 transition cursor-pointer"
                  >
                    {translations[appLang].saveContactBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. REDESIGNED SETTINGS (SPEC 6: Redesigned like Instagram / TikTok) */}
      {activeOverlay === 'settingsOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">Settings</h3>
              </div>
              <button onClick={onCloseOverlay} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs flex-1">
              {/* Group 1: Account & Preferences (Instagram/TikTok style) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Preferences & Appearance
                </span>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isDarkMode ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <div>
                        <h4 className="font-bold">Dark Appearance</h4>
                        <p className="text-[10px] text-slate-400">Toggle between Light and Dark mode</p>
                      </div>
                    </div>
                    <button
                      onClick={onToggleTheme}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${isDarkMode ? 'bg-[#E0533C]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-[#E0533C]" />
                      <div>
                        <h4 className="font-bold">Push Notifications</h4>
                        <p className="text-[10px] text-slate-400">Match alerts, event drops & ticket passes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPushNotifications(!pushNotifications);
                        showToast(pushNotifications ? 'Push notifications paused.' : 'Push notifications enabled!');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${pushNotifications ? 'bg-[#2D6A4F]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-[#2D6A4F]" />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{translations[appLang].languageSelect}</h4>
                        <p className="text-[10px] text-slate-400">{appLang === 'sw' ? 'Kiswahili' : 'English (Kenya)'}</p>
                      </div>
                    </div>
                    <select
                      value={appLang}
                      onChange={(e) => {
                        const newLang = e.target.value as AppLanguage;
                        saveStoredLanguage(newLang);
                        setAppLang(newLang);
                        showToast(newLang === 'sw' ? 'Lugha imewekwa kuwa Kiswahili.' : 'Language set to English (Kenya).');
                      }}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="en">English (KE)</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Privacy & Interactions */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Privacy & Interactions
                </span>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <div>
                        <h4 className="font-bold">Discoverable in Socials</h4>
                        <p className="text-[10px] text-slate-400">Show card to RADA community</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDatingDiscoverable(!datingDiscoverable);
                        showToast(datingDiscoverable ? 'Hidden from Discover.' : 'Visible in Discover.');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${datingDiscoverable ? 'bg-[#2D6A4F]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${datingDiscoverable ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <div>
                        <h4 className="font-bold">GPS Location Services</h4>
                        <p className="text-[10px] text-slate-400">Used for spot distances & Uber dropoffs</p>
                      </div>
                    </div>
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <div>
                        <h4 className="font-bold">Two-Factor Authentication (2FA)</h4>
                        <p className="text-[10px] text-slate-400">Account login security protection</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIs2FAEnabled(!is2FAEnabled);
                        showToast(is2FAEnabled ? '2FA disabled.' : '2FA enabled.');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${is2FAEnabled ? 'bg-[#2D6A4F]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Group: Account & Saved Collection */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Account & Data
                </span>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  <button
                    onClick={() => {
                      onCloseOverlay();
                      if (onOpenSaved) onOpenSaved();
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bookmark className="w-4 h-4 text-[#E0533C]" />
                      <div>
                        <h4 className="font-bold">My Saved Items & Moves</h4>
                        <p className="text-[10px] text-slate-400">View bookmarked spots, raves, fits & offers</p>
                      </div>
                    </div>
                    {savedCount !== undefined && savedCount > 0 ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E0533C]/10 text-[#E0533C]">
                        {savedCount}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onCloseOverlay();
                      if (onOpenAccountSettings) onOpenAccountSettings();
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <div>
                        <h4 className="font-bold">Account Details & Security</h4>
                        <p className="text-[10px] text-slate-400">Manage credentials, authentication & password</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Group 3: Support & Information */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Support & About
                </span>
                <div className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/80">
                  <button
                    onClick={() => showToast('Opening RADA Nairobi Help Center & FAQ...')}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span className="font-bold">Help Center & Safety Rules</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => showToast('RADA Nairobi Hangouts v2026.4.2')}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <div>
                        <span className="font-bold">App Version</span>
                        <p className="text-[10px] text-slate-400">RADA 2026.4.2 (Production Build)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Up to date</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. ACCOUNT & SECURITY OVERLAY */}
      {activeOverlay === 'youOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#E9C46A]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Account & Security
                </h3>
              </div>
              <button onClick={onCloseOverlay} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs flex-1">
              <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h4 className="font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Account Credentials
                </h4>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="07XX XXX XXX"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      onCloseOverlay();
                      if (onOpenAccountSettings) onOpenAccountSettings();
                    }}
                    className="w-full py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Security & Change Password</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. PROFILE OVERLAY (SPEC 6: Renamed to Profile, strictly Single or Not single without emojis) */}
      {activeOverlay === 'profileOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#E0533C]">
                <User className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Profile
                </h3>
              </div>
              <button onClick={onCloseOverlay} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs flex-1">
              <div className="p-4 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 text-center">
                <div className="relative w-24 h-24 mx-auto">
                  {profileAvatar ? (
                    <div
                      className="w-24 h-24 rounded-full bg-cover bg-center border-2 border-[#E0533C] shadow-md"
                      style={{ backgroundImage: `url('${profileAvatar}')` }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-md">
                      <User className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E0533C] text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-orange-700 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div>
                  <h4 className="font-black text-base">{currentUserProfile?.name || 'RADA member'}</h4>
                  <p className="text-slate-500 font-bold text-[11px]">{currentUserProfile?.handle || '@explorer'} • Nairobi, Kenya</p>
                </div>

                {/* Relationship Status: Strictly Single or Not single without emojis */}
                <div className="space-y-1.5 text-left pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300">
                      Relationship Status
                    </label>
                    <span className="text-[10px] font-bold text-[#E0533C]">
                      {profileRelationshipStatus === 'single' ? 'Single' : 'Not single'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileRelationshipStatus('single');
                        if (!currentUserProfile?.isLivenessVerified) {
                          showToast('Single status requires photo & camera liveness verification to unlock Discover.');
                          if (onOpenVerificationModal) onOpenVerificationModal();
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        profileRelationshipStatus === 'single'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs'
                          : 'bg-white dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>Single</span>
                        {currentUserProfile?.isLivenessVerified && (
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-[9px] font-normal opacity-80">
                        {currentUserProfile?.isLivenessVerified ? 'Verified Single' : 'Liveness check required'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileRelationshipStatus('not_single')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        profileRelationshipStatus === 'not_single'
                          ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white shadow-xs'
                          : 'bg-white dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>Not single</span>
                      <span className="text-[9px] font-normal opacity-80">Excluded from matching</span>
                    </button>
                  </div>

                  {/* Liveness Verification Notice in Profile */}
                  {profileRelationshipStatus === 'single' && (
                    <div className="p-3 bg-white dark:bg-[#121113] rounded-2xl border border-slate-200 dark:border-slate-800 mt-2 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-500">Liveness Verification:</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          currentUserProfile?.isLivenessVerified
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {currentUserProfile?.isLivenessVerified ? '✓ Verified' : 'Action Required'}
                        </span>
                      </div>
                      {!currentUserProfile?.isLivenessVerified ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenVerificationModal) onOpenVerificationModal();
                          }}
                          className="w-full py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Complete Camera Liveness Check</span>
                        </button>
                      ) : (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Your single profile is verified and active in Discover.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-left pt-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">Personal Bio</label>
                  <textarea
                    rows={2}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Tell everyone what you're into..."
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0533C] resize-none text-xs"
                  />
                  <button
                    onClick={() => {
                      if (profileRelationshipStatus === 'single' && !currentUserProfile?.isLivenessVerified) {
                        showToast('Please complete liveness verification to unlock Discover as Single.');
                        if (onOpenVerificationModal) onOpenVerificationModal();
                      }
                      onUpdateCurrentUserProfile({
                        bio: profileBio,
                        avatar: profileAvatar,
                        relationshipStatus: profileRelationshipStatus
                      });
                      showToast(`Profile saved! Status set to ${profileRelationshipStatus === 'single' ? 'Single' : 'Not single'}.`);
                    }}
                    className="w-full py-2.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow mt-1 transition cursor-pointer"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewAllTitle && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">{viewAllTitle}</h3>
              </div>
              <button onClick={onCloseViewAll} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 text-xs">
              {/* Category-Specific Strict Filtering */}
              {viewAllCategory === 'events' ? (
                /* LIVE EVENTS: search + category + date + price filters over public.external_events */
                <EventsExplorer
                  events={events}
                  savedItems={savedItems}
                  onToggleSave={onToggleSave}
                  onOpenEvent={(evt) => {
                    onCloseViewAll();
                    if (onOpenEventDetails) onOpenEventDetails(evt);
                  }}
                />
              ) : viewAllCategory === 'cinemas' ? (
                /* WHOLE CINEMA EXPLORER (LIKE EVENTS) */
                <CinemaExplorer
                  movies={cinemaMovies || []}
                  onBookMovie={(movie) => {
                    onCloseViewAll();
                    if (onBookCinema) onBookCinema(movie);
                  }}
                  userCoords={origin}
                />
              ) : (viewAllCategory === 'offers' || viewAllCategory === 'promotions') ? (
                /* DISPLAY ALL RUNNING OFFERS & PROMOTIONS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2 flex flex-col justify-between hover:border-[#E0533C] transition"
                    >
                      <div className="space-y-2">
                        <div
                          className="h-32 rounded-xl bg-cover bg-center relative overflow-hidden"
                          style={{ backgroundImage: `url('${offer.posterUrl}')` }}
                        >
                          <span className="absolute top-2 left-2 bg-[#E0533C] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {offer.discount}
                          </span>
                          <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                            {offer.category}
                          </span>
                          <span className="absolute bottom-2 left-2 right-2 text-[10px] text-amber-300 font-bold drop-shadow-md truncate">
                            {offer.validUntil}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{offer.businessName}</p>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">{offer.title}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{offer.description}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <ClaimOfferButton offerId={offer.id} onMessage={showToast} />
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                          {offer.claimCode || 'RADA-DEAL'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (offer.claimCode) {
                              navigator.clipboard?.writeText?.(offer.claimCode);
                              showToast(`Copied promo code: "${offer.claimCode}"!`);
                            }
                            const matched = spots.find(
                              s => (s.businessId && s.businessId === offer.businessId) ||
                                   s.title.toLowerCase().trim() === offer.businessName.toLowerCase().trim() ||
                                   offer.businessName.toLowerCase().includes(s.title.toLowerCase()) ||
                                   s.title.toLowerCase().includes(offer.businessName.toLowerCase())
                            );
                            if (matched) {
                              onCloseViewAll();
                              onOpenSpotDetails(matched);
                            }
                          }}
                          className="px-3 py-1.5 bg-[#E0533C] text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition"
                        >
                          Claim / View Spot
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* WHOLE SPOTS CATEGORY EXPLORER (LIKE EVENTS) */
                <SpotsExplorer
                  categoryKey={localCategoryOverride || viewAllCategory}
                  categoryTitle={viewAllTitle}
                  spots={viewAllTitle === 'Trending Spots'
                    ? pickTrendingSpots(mergeSpots(spots, unclaimedFeed), origin)
                    : mergeSpots(spots, unclaimedFeed)}
                  savedItems={savedItems}
                  onToggleSave={onToggleSave}
                  onOpenSpot={(spot) => {
                    onCloseViewAll();
                    onOpenSpotDetails(spot);
                  }}
                  userCoords={origin}
                  isAdmin={isAdmin}
                  onDeleteSpot={(spot) => setSpotToDelete(spot)}
                />
              )}
            </div>
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
            if (onDeleteSpot) {
              await onDeleteSpot(spotToDelete);
            }
            if (selectedSpot && (String(selectedSpot.id) === String(spotToDelete.id) || selectedSpot.title === spotToDelete.title)) {
              onCloseSpotModal();
            }
            setSpotToDelete(null);
          }}
        />
      )}
    </>
  );
};
