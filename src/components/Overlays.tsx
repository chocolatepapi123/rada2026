import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Radio, 
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
  Check
} from 'lucide-react';
import { 
  SpotItem, 
  EventItem, 
  CinemaMovie,
  ThriftItem,
  DatingProfile, 
  EmergencyContact,
  Review,
  UserProfile
} from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';
import { shareContent } from '../utils/shareUtils.ts';

interface OverlaysProps {
  // Overlays state
  activeOverlay: string | null;
  onCloseOverlay: () => void;

  // Wagwan AI
  isWagwanOpen: boolean;
  onCloseWagwan: () => void;
  spots: SpotItem[];
  events?: EventItem[];
  cinemaMovies?: CinemaMovie[];
  thriftItems?: ThriftItem[];
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
  goingEventIds: number[];
  onBuyEventTicket: (event: EventItem) => void;

  // Current User Profile
  currentUserProfile: UserProfile;
  onUpdateCurrentUserProfile: (profile: Partial<UserProfile>) => void;

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

  // Theme
  isDarkMode: boolean;
  onToggleTheme: () => void;

  showToast: (msg: string) => void;
}

export const Overlays: React.FC<OverlaysProps> = ({
  activeOverlay,
  onCloseOverlay,
  isWagwanOpen,
  onCloseWagwan,
  spots,
  events = [],
  cinemaMovies = [],
  thriftItems = [],
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
  isDarkMode,
  onToggleTheme,
  showToast
}) => {
  // Wagwan AI Chat State (SPEC 6: Fix Wagwan AI functionality to process custom typed text & suggested chips)
  const [wagwanInput, setWagwanInput] = useState('');
  const [wagwanMessages, setWagwanMessages] = useState<Array<{ 
    sender: 'user' | 'ai'; 
    text: string; 
    spotMatch?: SpotItem;
    eventMatch?: EventItem;
    thriftMatch?: ThriftItem;
  }>>([
    { 
      sender: 'ai', 
      text: 'Wagwan! 👋 I am your Nairobi concierge. You can tap suggested chips below or type any custom request in your own words: "where can I get vintage jeans in CBD", "best rooftop in Westlands", "quiet romantic dinner in Karen", "amapiano rave this weekend", or "budget choma in Ruiru"!' 
    }
  ]);

  const handleAskWagwan = (query?: string) => {
    const q = (query || wagwanInput).trim();
    if (!q) return;

    setWagwanMessages(prev => [...prev, { sender: 'user', text: q }]);
    setWagwanInput('');

    const qLower = q.toLowerCase();

    // 1. Detect if query is asking about clothes / streetwear / vintage / thrift
    const isThriftQuery = 
      qLower.includes('thrift') || 
      qLower.includes('luku') || 
      qLower.includes('streetwear') || 
      qLower.includes('vintage') || 
      qLower.includes('denim') || 
      qLower.includes('jean') || 
      qLower.includes('jacket') || 
      qLower.includes('hoodie') || 
      qLower.includes('bomber') || 
      qLower.includes('cargo') || 
      qLower.includes('sneaker') || 
      qLower.includes('kicks') || 
      qLower.includes('gikomba') || 
      qLower.includes('toi') || 
      qLower.includes('wear') || 
      qLower.includes('fit');

    // 2. Detect if query is looking for an event / party / concert / tickets
    const isEventQuery = 
      qLower.includes('party') || 
      qLower.includes('event') || 
      qLower.includes('rave') || 
      qLower.includes('concert') || 
      qLower.includes('ticket') || 
      qLower.includes('festival') || 
      qLower.includes('amapiano') || 
      qLower.includes('afro-tech') || 
      qLower.includes('tonight') || 
      qLower.includes('weekend') ||
      qLower.includes('blankets');

    // 3. Detect general platform / help questions
    const isHelpQuery = 
      qLower.includes('what is rada') || 
      qLower.includes('how does rada work') || 
      qLower.includes('register business') || 
      qLower.includes('how to post') || 
      qLower.includes('sos') || 
      qLower.includes('emergency');

    setTimeout(() => {
      if (isHelpQuery) {
        if (qLower.includes('register') || qLower.includes('post')) {
          setWagwanMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: 'RADA Business Hub empowers venue owners, event promoters, and thrift stores to verify their brand, publish listings, sell passes, and drop running offers! Tap the Business Hub icon at top right to register or manage your business profile.'
            }
          ]);
        } else if (qLower.includes('sos') || qLower.includes('emergency')) {
          setWagwanMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: 'Safety first in Nairobi! Tap the red SOS shield on the top menu to view your designated emergency contacts, local helpline numbers, or broadcast your live GPS beacon to friends.'
            }
          ]);
        } else {
          setWagwanMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: 'RADA is Nairobi\'s premier lifestyle guide — Where to go (Spots), What to wear (LUKU Thrift), and Who to go with (Socials & Matches). Everything includes direct verified links, tickets, and interactive maps!'
            }
          ]);
        }
        return;
      }

      if (isThriftQuery && thriftItems.length > 0) {
        const thriftMatch = thriftItems.find(t => 
          t.name.toLowerCase().includes(qLower) ||
          t.category.toLowerCase().includes(qLower) ||
          t.condition.toLowerCase().includes(qLower) ||
          t.seller.toLowerCase().includes(qLower) ||
          t.storeLocation.toLowerCase().includes(qLower) ||
          (qLower.includes('jean') && t.category === 'Denim') ||
          (qLower.includes('jacket') && t.category === 'Jackets') ||
          (qLower.includes('sneaker') && t.category === 'Sneakers') ||
          (qLower.includes('tee') && t.category === 'Tees') ||
          (qLower.includes('hoodie') && t.category === 'Hoodies')
        ) || thriftItems[0];

        setWagwanMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `LUKU fit recommendation: "${thriftMatch.name}" from ${thriftMatch.seller} (${thriftMatch.storeLocation}) for ${thriftMatch.price}! Quality: ${thriftMatch.condition}. You can reach the merchant directly below.`,
            thriftMatch
          }
        ]);
        return;
      }

      if (isEventQuery && events.length > 0) {
        const eventMatch = events.find(e => 
          e.title.toLowerCase().includes(qLower) || 
          (e.genre && e.genre.toLowerCase().includes(qLower)) ||
          e.location.toLowerCase().includes(qLower) ||
          (e.description && e.description.toLowerCase().includes(qLower)) ||
          (qLower.includes('amapiano') && (e.title.toLowerCase().includes('amapiano') || e.genre?.toLowerCase().includes('amapiano'))) ||
          (qLower.includes('concert') && e.category === 'concerts') ||
          (qLower.includes('party') && e.category === 'nightlife')
        ) || events[0];

        setWagwanMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `Turn up! "${eventMatch.title}" at ${eventMatch.location} on ${eventMatch.date}! ${eventMatch.goingCount} people going with verified primary ticketing.`,
            eventMatch
          }
        ]);
        return;
      }

      // Default to Spots matching with multi-criteria scoring
      const spotScores = spots.map(s => {
        let score = 0;
        const titleLower = s.title.toLowerCase();
        const neighLower = s.neighborhood.toLowerCase();
        const descLower = (s.description || '').toLowerCase();
        const catLower = s.category.toLowerCase();
        const tagLower = (s.exactLocationTag || '').toLowerCase();

        if (titleLower.includes(qLower)) score += 10;
        if (neighLower.includes(qLower)) score += 8;
        if (tagLower.includes(qLower)) score += 6;
        if (catLower.includes(qLower)) score += 5;
        if (descLower.includes(qLower)) score += 3;

        // Keyword heuristics
        if ((qLower.includes('date') || qLower.includes('romantic')) && (s.category === 'date_spots' || parseFloat(s.rating) >= 4.8)) score += 6;
        if ((qLower.includes('cocktail') || qLower.includes('drinks')) && s.category === 'nightlife') score += 5;
        if ((qLower.includes('choma') || qLower.includes('nyama') || qLower.includes('meat')) && titleLower.includes('choma')) score += 8;
        if ((qLower.includes('coffee') || qLower.includes('cafe') || qLower.includes('work') || qLower.includes('wifi')) && s.category === 'cafes') score += 7;
        if (qLower.includes('rooftop') && (titleLower.includes('rooftop') || descLower.includes('rooftop'))) score += 7;
        if (qLower.includes('westlands') && neighLower.includes('westlands')) score += 7;
        if (qLower.includes('kilimani') && neighLower.includes('kilimani')) score += 7;
        if (qLower.includes('karen') && neighLower.includes('karen')) score += 7;
        if (qLower.includes('cbd') && (neighLower.includes('cbd') || s.address.toLowerCase().includes('cbd'))) score += 7;
        if ((qLower.includes('kiambu') || qLower.includes('thika') || qLower.includes('ruiru')) && (neighLower.includes('kiambu') || neighLower.includes('ruiru') || neighLower.includes('thika'))) score += 8;

        return { spot: s, score };
      });

      spotScores.sort((a, b) => b.score - a.score);
      const matched = (spotScores[0]?.score > 0 ? spotScores[0].spot : spots[0]) || spots[0];

      setWagwanMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `For "${q}", I recommend ${matched.title} in ${matched.neighborhood}! Rating ★${matched.rating} (${matched.price}). Exact spot: ${matched.address}. Vibe: ${matched.description || 'Verified Nairobi hangout.'}`,
          spotMatch: matched
        }
      ]);
    }, 350);
  };

  // Spot Active Photo Index
  const [activeSpotImgIndex, setActiveSpotImgIndex] = useState(0);

  // Review Submission State (SPEC 1: regular users can only upload photos within reviews)
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewImg, setNewReviewImg] = useState<string | null>(null);

  const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewReviewImg(event.target.result as string);
          showToast('Photo attached to review!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot) return;
    if (!newReviewText.trim()) {
      showToast('Please type your review experience.');
      return;
    }

    const review: Review = {
      id: `rev-${Date.now()}`,
      userName: currentUserProfile?.name || 'Wayne Waweru',
      userHandle: currentUserProfile?.handle || '@lowk3yFX',
      userAvatar: currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewText.trim(),
      images: newReviewImg ? [newReviewImg] : undefined
    };

    onPostReview(selectedSpot.id, review);
    setNewReviewText('');
    setNewReviewImg(null);
    setShowReviewForm(false);
    showToast('Review and photo published live on RADA!');
  };

  // Plan a date DateTime picker state
  const [chosenDate, setChosenDate] = useState('2026-10-25');
  const [chosenTime, setChosenTime] = useState('19:00');
  // SPEC 5: Plan a date - free browsing across all categories
  const [planDateCategory, setPlanDateCategory] = useState<string>('all');
  const [planDateSearch, setPlanDateSearch] = useState('');

  // Create Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMemberNames, setSelectedGroupMemberNames] = useState<string[]>([]);

  // Emergency contact creation
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Settings State (SPEC 6: Redesign Settings like Instagram/TikTok)
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [datingDiscoverable, setDatingDiscoverable] = useState(true);
  const [languageSetting, setLanguageSetting] = useState('English (Kenya)');

  // Profile Bio & Relationship Status state (SPEC 6: Rename Profile, strictly Single / Not single)
  const [profileBio, setProfileBio] = useState(currentUserProfile?.bio || 'Exploring Nairobi hangouts, good music and vibes.');
  const [profileAvatar, setProfileAvatar] = useState(currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop');
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
      {/* 1. WAGWAN AI HANGOUT RECOMMENDER MODAL */}
      {isWagwanOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Wagwan AI
                  </h3>
                  <p className="text-[10px] text-slate-400">Personalized Nairobi Hangout Recommender</p>
                </div>
              </div>
              <button onClick={onCloseWagwan} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 text-xs flex flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto min-h-[280px] p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl">
                {wagwanMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-2 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#E0533C] text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.sender === 'ai' && (
                        <span className="font-black text-[#E0533C] block">Wagwan AI ✨</span>
                      )}
                      <p>{msg.text}</p>
                      {msg.spotMatch && (
                        <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                          <div>
                            <h5 className="font-black text-xs text-[#E0533C]">{msg.spotMatch.title}</h5>
                            <p className="text-[10px] text-slate-500">{msg.spotMatch.neighborhood} • ★{msg.spotMatch.rating}</p>
                          </div>
                          <button
                            onClick={() => {
                              onCloseWagwan();
                              onOpenSpotDetails(msg.spotMatch!);
                            }}
                            className="px-2.5 py-1 bg-[#E0533C] text-white font-bold rounded-lg text-[10px] shadow-xs"
                          >
                            View Spot
                          </button>
                        </div>
                      )}
                      {msg.eventMatch && (
                        <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                          <div>
                            <h5 className="font-black text-xs text-[#2D6A4F]">{msg.eventMatch.title}</h5>
                            <p className="text-[10px] text-slate-500">{msg.eventMatch.location} • {msg.eventMatch.date}</p>
                          </div>
                          <button
                            onClick={() => {
                              onCloseWagwan();
                              if (onOpenEventDetails) onOpenEventDetails(msg.eventMatch!);
                            }}
                            className="px-2.5 py-1 bg-[#2D6A4F] text-white font-bold rounded-lg text-[10px] shadow-xs"
                          >
                            View Event
                          </button>
                        </div>
                      )}
                      {msg.thriftMatch && (
                        <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={msg.thriftMatch.img} alt={msg.thriftMatch.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0">
                              <h5 className="font-black text-xs text-[#2D6A4F] truncate">{msg.thriftMatch.name}</h5>
                              <p className="text-[10px] text-slate-500 truncate">{msg.thriftMatch.price} • {msg.thriftMatch.seller}</p>
                            </div>
                          </div>
                          <a
                            href={`https://wa.me/${(msg.thriftMatch.whatsapp || '+254700000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi! I saw "${msg.thriftMatch.name}" on RADA Nairobi. Is it still available?`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-[#2D6A4F] text-white font-bold rounded-lg text-[10px] shadow-xs shrink-0"
                          >
                            Inquire Fit
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wagwanInput}
                    onChange={(e) => setWagwanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskWagwan()}
                    placeholder="e.g. Sushi in Westlands, romantic dinner in Karen..."
                    className="flex-1 p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
                  />
                  <button
                    onClick={() => handleAskWagwan()}
                    className="px-4 py-3 bg-[#E0533C] text-white font-bold rounded-xl hover:bg-orange-700 transition shadow-md"
                  >
                    Ask
                  </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar text-[11px]">
                  <button
                    onClick={() => handleAskWagwan('Romantic date night in Westlands')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C]"
                  >
                    ✨ Cozy Date Night
                  </button>
                  <button
                    onClick={() => handleAskWagwan('Amapiano and cocktails party')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C]"
                  >
                    🔥 Nightlife & Party
                  </button>
                  <button
                    onClick={() => handleAskWagwan('Quiet cafe for coffee & remote work')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C]"
                  >
                    ☕ Coffee & Work
                  </button>
                  <button
                    onClick={() => handleAskWagwan('Choma and beer in Hurlingham')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C]"
                  >
                    🍖 Choma & Chill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SPOT DETAILS MODAL (SPEC 1: Multi-photos carousel & reviews photo upload only) */}
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

              return (
                <div className="space-y-2">
                  <div
                    className="h-64 rounded-3xl bg-cover bg-center relative shadow-md transition-all duration-300"
                    style={{ backgroundImage: `url('${currentHeroImg}')` }}
                  >
                    <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                      {selectedSpot.price}
                    </span>
                    <span className="absolute bottom-3 left-3 bg-white/90 dark:bg-black/90 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{selectedSpot.rating} ({selectedSpot.reviews?.length || 45} reviews)</span>
                    </span>
                    {allImages.length > 1 && (
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {selectedSpot.title}
                  </h2>
                  {(selectedSpot.businessId || !selectedSpot.isUserUploaded) && (
                    <MerchantVerificationBadge category="hospitality" size="xs" />
                  )}
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-100 text-[#E0533C]">
                  {selectedSpot.category}
                </span>
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
                  <span>Hours: {selectedSpot.openingHours}</span>
                </p>
              )}
              {selectedSpot.description && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
                  {selectedSpot.description}
                </p>
              )}
            </div>

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

            {/* Digital Menu Items */}
            {selectedSpot.menuItems && selectedSpot.menuItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Popular Dishes & Drinks</span>
                </h4>
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
            )}

            {/* Ride Hails & Plan Date */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  showToast(`Opening Uber to ${selectedSpot.title}...`);
                  window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(selectedSpot.address)}`, '_blank');
                }}
                className="py-3 bg-black text-white hover:bg-slate-800 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4" />
                <span>Request Uber</span>
              </button>
              <button
                onClick={() => {
                  showToast(`Opening Bolt to ${selectedSpot.title}...`);
                  window.open('https://bolt.eu/', '_blank');
                }}
                className="py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4" />
                <span>Request Bolt</span>
              </button>
            </div>

            <button
              onClick={() => onPlanDateFromSpot(selectedSpot)}
              className="w-full py-3.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Plan Hangout / Date at This Spot</span>
            </button>

            {/* COMMUNITY REVIEWS & POST A REVIEW (SPEC 1: Regular users upload photos only inside reviews) */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Customer Reviews ({selectedSpot.reviews?.length || 0})</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">Verified community ratings with photo upload</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 bg-[#E0533C] text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition"
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

                  {/* Photo attachment for review */}
                  <div className="space-y-1">
                    <label className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Attach Photo to Review</span>
                      <span className="text-[10px] text-slate-400">Regular users upload photos here</span>
                    </label>

                    {newReviewImg ? (
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                        <img src={newReviewImg} alt="Review attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewReviewImg(null)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/75 text-white rounded-full flex items-center justify-center text-[10px]"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer py-2 px-3 bg-white dark:bg-[#121113] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-[#E0533C] flex items-center justify-center gap-1.5 transition">
                        <ImageIcon className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span className="text-[11px] font-bold text-[#E0533C]">Upload Review Photo</span>
                        <input
                          type="file"
                          accept="image/*"
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
                  <p className="text-slate-400 py-3 text-center">No reviews yet. Be the first to share your experience!</p>
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
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">
                Official Event Showcase
              </h3>
              <div className="w-9" />
            </div>
          </div>

          <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-16">
            <div
              className="h-60 rounded-3xl bg-cover bg-center relative shadow-md"
              style={{ backgroundImage: `url('${selectedEvent.img}')` }}
            >
              <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>{selectedEvent.goingCount} people going</span>
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
                <MerchantVerificationBadge category="event_organizer" size="xs" />
              </div>
              <p className="text-xs text-[#E0533C] font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{selectedEvent.date} {selectedEvent.time ? `• ${selectedEvent.time}` : ''}</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedEvent.location}</span>
              </p>
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
                  window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(selectedEvent.location)}`, '_blank');
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

            {/* Ticket Tier Options */}
            {selectedEvent.tiers && selectedEvent.tiers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider">
                  Ticket Tier Options
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedEvent.tiers.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs block">{t.name}</span>
                        {t.perks && <span className="text-[9px] text-slate-400 block">{t.perks}</span>}
                      </div>
                      <span className="font-black text-xs text-[#E0533C]">{t.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
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
                <span>Get Primary Ticket</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAN A DATE MODAL (SPEC 5: Allow free browsing across ALL categories) */}
      {isPlanDateModalOpen && !datePlanningSpot && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">Plan a Date: Pick Any Venue</h3>
              </div>
              <button onClick={onClosePlanDateModal} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 text-xs">
              <p className="text-slate-500 font-medium">
                Browse freely across all Nairobi categories to pick the perfect date destination:
              </p>

              {/* Category Filter Pills for Plan a Date */}
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Venues' },
                  { id: 'date_spots', label: 'Romantic Date Spots' },
                  { id: 'restaurants', label: 'Restaurants' },
                  { id: 'nightlife', label: 'Nightlife' },
                  { id: 'cafes', label: 'Cafes & Bakeries' },
                  { id: 'hotels', label: 'Hotels & Stays' },
                  { id: 'vacation', label: 'Vacation Spots' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPlanDateCategory(c.id)}
                    className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition text-xs ${
                      planDateCategory === c.id
                        ? 'bg-[#E0533C] text-white shadow-xs'
                        : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Free Browsing Venue Grid */}
              <div className="grid grid-cols-2 gap-3">
                {spots
                  .filter(s => planDateCategory === 'all' || s.category === planDateCategory)
                  .map((spot) => (
                    <div
                      key={spot.id}
                      onClick={() => onSelectSpotForDate(spot)}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm cursor-pointer hover:border-[#E0533C] transition flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="h-28 rounded-xl mb-2 bg-cover bg-center"
                          style={{ backgroundImage: `url('${spot.img}')` }}
                        />
                        <h4 className="font-black text-xs text-[#E0533C] truncate">{spot.title}</h4>
                        <p className="text-[10px] text-slate-500">{spot.neighborhood} • {spot.price}</p>
                      </div>
                      <button className="w-full mt-2 py-1.5 bg-[#E0533C] text-white font-bold rounded-lg text-[10px]">
                        Select for Date
                      </button>
                    </div>
                  ))}
              </div>
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
                <label className="font-bold text-slate-600 dark:text-slate-300">Select Members</label>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {discoveryProfiles.map((p) => {
                    const isChecked = selectedGroupMemberNames.includes(p.name);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center justify-between p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full bg-cover bg-center"
                            style={{ backgroundImage: `url('${p.img}')` }}
                          />
                          <div>
                            <h5 className="font-bold text-xs">{p.name}</h5>
                            <p className="text-[10px] text-slate-400">{p.handle}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGroupMemberNames(prev => [...prev, p.name]);
                            else setSelectedGroupMemberNames(prev => prev.filter(n => n !== p.name));
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
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider">Emergency & SOS Hub</h3>
              </div>
              <button onClick={onCloseOverlay} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs flex-1">
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-red-700 dark:text-red-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4" /> Live Emergency GPS Broadcast
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Broadcasts your real-time coordinates on posts and emergency logs.
                    </p>
                  </div>
                  <button
                    onClick={onToggleGps}
                    className={`px-3.5 py-1.5 font-black rounded-xl shadow text-xs ${
                      isGpsBroadcasting ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {isGpsBroadcasting ? 'Disable' : 'Enable'}
                  </button>
                </div>

                <button
                  onClick={() => showToast('🚨 EMERGENCY SOS BROADCAST SENT TO ALL TRUSTED CONTACTS & SECURITY')}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow transition"
                >
                  🚨 Broadcast SOS Panic Alert Now
                </button>
              </div>

              {/* Hotlines */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  Hotlines & Police
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:999"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between font-bold"
                  >
                    <span>Police Hotline</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md">999 / 112</span>
                  </a>
                  <a
                    href="tel:999"
                    className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between font-bold"
                  >
                    <span>Ambulance</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md">999</span>
                  </a>
                </div>
              </div>

              {/* Hospitals */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  Nearby Hospitals (Nairobi)
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs">The Aga Khan University Hospital</h5>
                      <p className="text-[10px] text-slate-400">Parklands • 24/7 Casualty Emergency</p>
                    </div>
                    <a href="tel:0203662000" className="px-2.5 py-1.5 bg-[#2D6A4F] text-white rounded-lg text-[11px] font-bold">
                      Call 020-3662000
                    </a>
                  </div>
                  <div className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs">The Nairobi Hospital</h5>
                      <p className="text-[10px] text-slate-400">Argwings Kodhek Rd • Accident & Emergency</p>
                    </div>
                    <a href="tel:0202845000" className="px-2.5 py-1.5 bg-[#2D6A4F] text-white rounded-lg text-[11px] font-bold">
                      Call 020-2845000
                    </a>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                  My Saved Emergency Contacts
                </h4>
                <div className="space-y-2">
                  {emergencyContacts.map((c) => (
                    <div key={c.id} className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-xs">{c.name}</span>
                      <span className="text-slate-400 text-[11px]">{c.phone}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <p className="font-bold text-[11px]">Add Trusted Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Name / Relation"
                      className="p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                      className="p-2 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!newContactName.trim() || !newContactPhone.trim()) return;
                      onAddEmergencyContact(newContactName.trim(), newContactPhone.trim());
                      setNewContactName('');
                      setNewContactPhone('');
                    }}
                    className="w-full py-2 bg-[#2D6A4F] text-white font-bold rounded-xl shadow text-xs hover:bg-emerald-800 transition"
                  >
                    Save Emergency Contact
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
                        <h4 className="font-bold">Language / Lugha</h4>
                        <p className="text-[10px] text-slate-400">{languageSetting}</p>
                      </div>
                    </div>
                    <select
                      value={languageSetting}
                      onChange={(e) => {
                        setLanguageSetting(e.target.value);
                        showToast(`Language set to ${e.target.value}`);
                      }}
                      className="bg-transparent font-bold text-xs text-[#E0533C] focus:outline-none"
                    >
                      <option value="English (Kenya)">English (KE)</option>
                      <option value="Kiswahili">Kiswahili</option>
                      <option value="Sheng Urban">Sheng</option>
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
                        <p className="text-[10px] text-slate-400">Show card to Nairobi community</p>
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
                    defaultValue="wayne.waititu@student.jkuat.ac.ke"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    defaultValue="+254 712 345 678"
                    className="w-full p-2.5 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => showToast('Account details saved!')}
                  className="w-full py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl shadow transition"
                >
                  Update Account Info
                </button>
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
                  <div
                    className="w-24 h-24 rounded-full bg-cover bg-center border-2 border-[#E0533C] shadow-md"
                    style={{ backgroundImage: `url('${profileAvatar}')` }}
                  />
                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E0533C] text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-orange-700 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div>
                  <h4 className="font-black text-base">{currentUserProfile?.name || 'Wayne Waweru'}</h4>
                  <p className="text-slate-500 font-bold text-[11px]">{currentUserProfile?.handle || '@lowk3yFX'} • Nairobi, Kenya</p>
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
                      onClick={() => setProfileRelationshipStatus('single')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition ${
                        profileRelationshipStatus === 'single'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs'
                          : 'bg-white dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>Single</span>
                      <span className="text-[9px] font-normal opacity-80">Visible in matching queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileRelationshipStatus('not_single')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition ${
                        profileRelationshipStatus === 'not_single'
                          ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white shadow-xs'
                          : 'bg-white dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>Not single</span>
                      <span className="text-[9px] font-normal opacity-80">Excluded from matching</span>
                    </button>
                  </div>
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
                      onUpdateCurrentUserProfile({
                        bio: profileBio,
                        avatar: profileAvatar,
                        relationshipStatus: profileRelationshipStatus
                      });
                      showToast(`Profile saved! Status set to ${profileRelationshipStatus === 'single' ? 'Single' : 'Not single'}.`);
                    }}
                    className="w-full py-2.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow mt-1 transition"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. DEDICATED VIEW ALL MODAL (SPEC 3: Strictly display items matching that category only) */}
      {viewAllTitle && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">{viewAllTitle}</h3>
              </div>
              <button onClick={onCloseViewAll} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 text-xs">
              {/* Category-Specific Strict Filtering */}
              {viewAllCategory === 'events' ? (
                /* STRICTLY DISPLAY EVENTS */
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => {
                        onCloseViewAll();
                        if (onOpenEventDetails) onOpenEventDetails(evt);
                      }}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:border-[#E0533C] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${evt.img}')` }} />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate">{evt.title}</h4>
                          <p className="text-[10px] text-[#E0533C] font-semibold">{evt.date}</p>
                          <p className="text-[10px] text-slate-400 truncate">{evt.location}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-[#E0533C] text-white rounded-xl text-xs font-bold shrink-0">
                        View Event
                      </button>
                    </div>
                  ))}
                </div>
              ) : viewAllCategory === 'cinemas' ? (
                /* STRICTLY DISPLAY CINEMA MOVIES */
                <div className="grid grid-cols-2 gap-3">
                  {cinemaMovies.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        onCloseViewAll();
                        if (onBookCinema) onBookCinema(movie);
                      }}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs cursor-pointer hover:border-[#2D6A4F] transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-44 rounded-xl bg-cover bg-center mb-2" style={{ backgroundImage: `url('${movie.img}')` }} />
                        <h4 className="font-bold text-xs truncate">{movie.title}</h4>
                        <p className="text-[10px] text-[#2D6A4F] font-semibold">{movie.locationName}</p>
                        <p className="text-[9px] text-slate-400">{movie.format}</p>
                      </div>
                      <button className="w-full mt-2 py-1.5 bg-[#2D6A4F] text-white rounded-lg text-[10px] font-bold">
                        Book Movie
                      </button>
                    </div>
                  ))}
                </div>
              ) : viewAllCategory === 'thrift' ? (
                /* STRICTLY DISPLAY THRIFT LUKU ITEMS */
                <div className="grid grid-cols-2 gap-3">
                  {thriftItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs"
                    >
                      <div className="h-36 rounded-xl bg-cover bg-center mb-2" style={{ backgroundImage: `url('${item.img}')` }} />
                      <h4 className="font-bold text-xs truncate">{item.name}</h4>
                      <p className="text-[10px] text-[#E0533C] font-black">{item.price} • {item.size}</p>
                      <p className="text-[9px] text-slate-400 truncate">{item.seller}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* STRICTLY DISPLAY MATCHING SPOTS */
                <div className="grid grid-cols-2 gap-3">
                  {spots
                    .filter(s => !viewAllCategory || viewAllCategory === 'spots' || s.category === viewAllCategory)
                    .map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onCloseViewAll();
                          onOpenSpotDetails(s);
                        }}
                        className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm space-y-1.5 cursor-pointer hover:border-[#E0533C] transition"
                      >
                        <div
                          className="h-28 rounded-xl bg-cover bg-center"
                          style={{ backgroundImage: `url('${s.img}')` }}
                        />
                        <h4 className="font-bold text-xs truncate text-[#E0533C]">{s.title}</h4>
                        <p className="text-[10px] text-slate-500">{s.neighborhood} • ★{s.rating}</p>
                        <button className="w-full py-1.5 bg-[#E0533C] text-white rounded-lg text-[11px] font-bold">
                          View Details
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
