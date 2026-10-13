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
  Send
} from 'lucide-react';
import { 
  SpotItem, 
  EventItem, 
  DatingProfile, 
  EmergencyContact,
  Review,
  UserProfile
} from '../types.ts';

interface OverlaysProps {
  // Overlays state
  activeOverlay: string | null;
  onCloseOverlay: () => void;

  // Wagwan AI
  isWagwanOpen: boolean;
  onCloseWagwan: () => void;
  spots: SpotItem[];
  onOpenSpotDetails: (spot: SpotItem) => void;

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

  // Plan a date workflow
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

  // Dedicated View All
  viewAllTitle: string | null;
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
  onOpenSpotDetails,
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
  onCloseViewAll,
  isGpsBroadcasting,
  onToggleGps,
  emergencyContacts,
  onAddEmergencyContact,
  isDarkMode,
  onToggleTheme,
  showToast
}) => {
  // Wagwan AI Chat State
  const [wagwanInput, setWagwanInput] = useState('');
  const [wagwanMessages, setWagwanMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; spotMatch?: SpotItem }>>([
    { 
      sender: 'ai', 
      text: 'Wagwan! 👋 Tell me your mood, who you are with (date, crew, solo), your budget, or preferred neighborhood in Nairobi and I will find the best spot for you!' 
    }
  ]);

  const handleAskWagwan = (query?: string) => {
    const q = (query || wagwanInput).trim();
    if (!q) return;

    setWagwanMessages(prev => [...prev, { sender: 'user', text: q }]);
    setWagwanInput('');

    // Find best match in spots
    const qLower = q.toLowerCase();
    const matched = spots.find(s => 
      s.title.toLowerCase().includes(qLower) || 
      s.neighborhood.toLowerCase().includes(qLower) ||
      (qLower.includes('date') && parseFloat(s.rating) >= 4.7) ||
      (qLower.includes('cocktail') && s.menuItems?.some(m => m.category === 'Cocktails')) ||
      (qLower.includes('party') && s.category === 'nightlife')
    ) || spots[0];

    setTimeout(() => {
      setWagwanMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Based on your vibe, you should check out ${matched.title} in ${matched.neighborhood}! Rating ★${matched.rating} with rave community reviews.`,
          spotMatch: matched
        }
      ]);
    }, 400);
  };

  // Spot Active Photo Index
  const [activeSpotImgIndex, setActiveSpotImgIndex] = useState(0);

  // Review Submission State
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
      userName: 'Wayne Waweru',
      userHandle: '@lowk3yFX',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewText.trim(),
      images: newReviewImg ? [newReviewImg] : undefined
    };

    onPostReview(selectedSpot.id, review);
    setNewReviewText('');
    setNewReviewImg(null);
    setShowReviewForm(false);
  };

  // Plan a date DateTime picker state
  const [chosenDate, setChosenDate] = useState('2026-10-25');
  const [chosenTime, setChosenTime] = useState('19:00');

  // Create Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMemberNames, setSelectedGroupMemberNames] = useState<string[]>([]);

  // Emergency contact creation
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  // Profile Bio & Relationship Status state
  const [profileBio, setProfileBio] = useState(currentUserProfile?.bio || 'Exploring Nairobi spots, amapiano vibes, and fashion setups. ✨');
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
      {/* 1. WAGWAN AI RECOMMENDER MODAL */}
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
                        <span className="font-black text-[#E0533C] block">Wagwan Assistant ✨</span>
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
                            className="px-2.5 py-1 bg-[#E0533C] text-white font-bold rounded-lg text-[10px]"
                          >
                            View Spot
                          </button>
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
                    placeholder="e.g. Quiet cafe for a coffee date in Westlands..."
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
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium"
                  >
                    ✨ Cozy Date Night
                  </button>
                  <button
                    onClick={() => handleAskWagwan('Latest IMAX cinema movie showtimes')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium"
                  >
                    🎬 Movie Night
                  </button>
                  <button
                    onClick={() => handleAskWagwan('Amapiano party vibe tonight')}
                    className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium"
                  >
                    🔥 Party Vibe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ENRICHED SPOT HUB VIEW MODAL WITH LOTS OF IMAGES & COMMUNITY REVIEWS */}
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
              <div className="w-9" />
            </div>
          </div>

          <div className="max-w-lg mx-auto w-full p-4 space-y-5 flex-1 text-xs pb-20">
            {/* Multi-Photo Carousel Hero */}
            {(() => {
              const allImages = (selectedSpot.images && selectedSpot.images.length > 0)
                ? selectedSpot.images
                : [selectedSpot.img];
              const safeIndex = Math.min(activeSpotImgIndex, allImages.length - 1);
              const activeImg = allImages[safeIndex] || selectedSpot.img;

              return (
                <div className="space-y-2">
                  <div
                    className="h-64 rounded-3xl bg-cover bg-center relative shadow-md overflow-hidden transition-all duration-300"
                    style={{ backgroundImage: `url('${activeImg}')` }}
                  >
                    <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full">
                      {selectedSpot.price}
                    </span>
                    <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      Photo {safeIndex + 1} of {allImages.length}
                    </span>
                  </div>

                  {/* Thumbnail Row to browse lots of images */}
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                    {allImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveSpotImgIndex(i)}
                        className={`w-16 h-12 rounded-xl bg-cover bg-center shrink-0 border-2 transition ${
                          i === safeIndex
                            ? 'border-[#E0533C] scale-105 shadow-sm'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundImage: `url('${img}')` }}
                      />
                    ))}

                    {/* Add More Spot Photos input */}
                    <label className="w-16 h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] flex flex-col items-center justify-center shrink-0 cursor-pointer text-slate-400 hover:text-[#E0533C] transition">
                      <Upload className="w-4 h-4" />
                      <span className="text-[8px] font-bold mt-0.5">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                onAddSpotImage(selectedSpot.id, event.target.result as string);
                                showToast('Photo added to spot gallery!');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Spot Header Details */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#E0533C]">{selectedSpot.title}</h2>
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-black px-2.5 py-1 rounded-xl text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>★ {selectedSpot.rating}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({selectedSpot.reviews?.length || selectedSpot.reviewCount || 45})
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-bold">{selectedSpot.neighborhood}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
                <span>{selectedSpot.address}</span>
              </p>
              {selectedSpot.openingHours && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hours: {selectedSpot.openingHours}</span>
                </p>
              )}
              {selectedSpot.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                  {selectedSpot.description}
                </p>
              )}
            </div>

            {/* Uber & Bolt Ride Hailing Integration */}
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

            {/* COMMUNITY REVIEWS & POST A REVIEW SECTION */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Customer Reviews ({selectedSpot.reviews?.length || 0})</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">Verified community ratings with photos</p>
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
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border-2 border-[#E0533C]/40 rounded-3xl p-4 space-y-3 shadow-md animate-in slide-in-from-top-2 duration-150"
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
                      <span className="text-xs font-bold text-amber-500 ml-1">{newReviewRating} Stars</span>
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
                      <span>Attach Photo to Review (Optional)</span>
                      <span className="text-[10px] text-slate-400">Cocktail, dish, or patio shot</span>
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
                    className="w-full py-2.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Review</span>
                  </button>
                </form>
              )}

              {/* List of Reviews with Images */}
              <div className="space-y-2.5">
                {selectedSpot.reviews && selectedSpot.reviews.length > 0 ? (
                  selectedSpot.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                            style={{ backgroundImage: `url('${rev.userAvatar}')` }}
                          />
                          <div>
                            <h5 className="font-bold text-xs leading-tight">{rev.userName}</h5>
                            <span className="text-[10px] text-slate-400">{rev.userHandle} • {rev.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {rev.comment}
                      </p>

                      {/* Attached review images */}
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-1">
                          {rev.images.map((imgUrl, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgUrl}
                              alt="Review photo"
                              className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs cursor-pointer hover:scale-105 transition"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">No reviews yet. Be the first to post a review!</p>
                )}
              </div>
            </div>

            {/* Menu Section */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wider">
                  Menu & Prices ({selectedSpot.menuItems?.length || 0} items)
                </h4>
                <span className="text-[10px] text-[#2D6A4F] font-bold">Verified Menu</span>
              </div>

              {selectedSpot.menuItems && selectedSpot.menuItems.length > 0 ? (
                <div className="space-y-2">
                  {selectedSpot.menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{item.name}</h5>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-600 dark:text-slate-400">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                      <span className="font-black text-xs text-[#E0533C] shrink-0">{item.price}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-3">Digital menu being finalized by merchant.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ENRICHED EVENT DETAILS HUB MODAL */}
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
                Event Details & Tickets
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
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {selectedEvent.title}
              </h2>
              <p className="text-xs text-[#E0533C] font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{selectedEvent.date} {selectedEvent.time ? `• ${selectedEvent.time}` : ''}</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedEvent.location}</span>
              </p>
              {selectedEvent.dressCode && (
                <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px]">
                  <strong className="text-amber-900 dark:text-amber-200">Dress Code / What to wear:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-300">{selectedEvent.dressCode}</span>
                </div>
              )}
            </div>

            {/* Uber / Bolt to Event */}
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

            {/* Artists */}
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

            {/* Ticket Tiers */}
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
                    : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-[#2D6A4F]'
                }`}
                title={goingEventIds.includes(selectedEvent.id) ? 'Click to remove count' : 'Click to say you are going'}
              >
                <CheckCircle2 className={`w-4 h-4 ${goingEventIds.includes(selectedEvent.id) ? 'text-white' : 'text-[#2D6A4F]'}`} />
                <span>{goingEventIds.includes(selectedEvent.id) ? 'Going ✓' : "I'm Going"}</span>
              </button>
              <button
                onClick={() => onBuyEventTicket(selectedEvent)}
                className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-1.5"
              >
                <span>Get Ticket Pass</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAN A DATE MODAL */}
      {isPlanDateModalOpen && !datePlanningSpot && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E0533C]" />
                <h3 className="font-black text-sm uppercase tracking-wider">Plan a Date: Pick a Spot</h3>
              </div>
              <button onClick={onClosePlanDateModal} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4 flex-1 text-xs">
              <p className="text-slate-500 font-medium">
                Browse Nairobi's top spots below to pick the venue for your date:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {spots.map((spot) => (
                  <div
                    key={spot.id}
                    onClick={() => onSelectSpotForDate(spot)}
                    className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm cursor-pointer hover:border-[#E0533C] transition"
                  >
                    <div
                      className="h-28 rounded-xl mb-2 bg-cover bg-center"
                      style={{ backgroundImage: `url('${spot.img}')` }}
                    />
                    <h4 className="font-black text-xs text-[#E0533C] truncate">{spot.title}</h4>
                    <p className="text-[10px] text-slate-500">{spot.neighborhood} • {spot.price}</p>
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

      {/* 9. SETTINGS & APPEARANCE OVERLAY */}
      {activeOverlay === 'settingsOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider">Settings & Appearance</h3>
              <button onClick={onCloseOverlay} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4 text-xs flex-1">
              <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Color Theme Mode</h4>
                  <p className="text-[11px] text-slate-500">
                    Currently: {isDarkMode ? 'Dark Theme' : 'Light Theme (Default White)'}
                  </p>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="px-4 py-2 bg-[#E0533C] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>Switch to {isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold">App Location Permissions</h4>
                  <p className="text-[11px] text-slate-500">Used for Nairobi spot distances & Uber dropoffs</p>
                </div>
                <span className="text-[#2D6A4F] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Enabled
                </span>
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

              <div className="p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] text-slate-500">Secure sign-in via SMS / Authenticator</p>
                </div>
                <button
                  onClick={() => {
                    setIs2FAEnabled(!is2FAEnabled);
                    showToast(is2FAEnabled ? '2FA disabled.' : '2FA enabled.');
                  }}
                  className={`px-3.5 py-1.5 font-bold rounded-xl shadow ${
                    is2FAEnabled ? 'bg-[#2D6A4F] text-white' : 'bg-slate-400 text-white'
                  }`}
                >
                  {is2FAEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. PROFILE & SAFETY OVERLAY */}
      {activeOverlay === 'profileOverlay' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#E0533C]">
                <User className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Profile & Safety Hub
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

                {/* Relationship Status: Single vs Not Single */}
                <div className="space-y-1.5 text-left pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300">
                      Relationship Status
                    </label>
                    <span className="text-[10px] font-bold text-[#E0533C]">
                      {profileRelationshipStatus === 'single' ? '🟢 Open to Matching' : '🔒 Browsing Only'}
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
                      <span>🟢 Single</span>
                      <span className="text-[9px] font-normal opacity-80">Can receive match requests</span>
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
                      <span>🔒 Not Single</span>
                      <span className="text-[9px] font-normal opacity-80">Matching disabled</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * Users marked as "Single" are the ones who can receive hangout & dating match requests on RADA.
                  </p>
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
                      showToast(`Profile saved! Status set to ${profileRelationshipStatus === 'single' ? 'Single' : 'Not Single'}.`);
                    }}
                    className="w-full py-2.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow mt-1 transition"
                  >
                    Save Profile & Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. DEDICATED VIEW ALL MODAL */}
      {viewAllTitle && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider">{viewAllTitle}</h3>
              <button onClick={onCloseViewAll} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {spots.map((s, idx) => (
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};
