import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Instagram, 
  ExternalLink, 
  MessageCircle, 
  Calendar, 
  Tag, 
  Sparkles, 
  Store, 
  Ticket, 
  Percent, 
  Copy, 
  Check, 
  Clock, 
  UtensilsCrossed, 
  Share2,
  Car,
  Palette,
  Maximize2,
  Minimize2,
  Globe,
  Music,
  CheckCircle2,
  Eye,
  FileText,
  Star,
  Compass
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessOffer, 
  SpotItem, 
  EventItem,
  CustomLink,
  PinnedHighlight
} from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';
import { isBusinessApproved } from './BusinessBadge.tsx';
import { shareContent } from '../utils/shareUtils.ts';
import { PersonalizationKitModal } from './PersonalizationKitModal.tsx';

interface PublicBusinessProfileModalProps {
  business: BusinessAccount | null;
  onClose: () => void;
  offers: BusinessOffer[];
  spots: SpotItem[];
  events: EventItem[];
  onOpenSpotDetails?: (spot: SpotItem) => void;
  onOpenEventDetails?: (event: EventItem) => void;
  onUpdateBusiness?: (updated: BusinessAccount) => void;
  currentUserId?: string;
  showToast: (msg: string) => void;
}

export const PublicBusinessProfileModal: React.FC<PublicBusinessProfileModalProps> = ({
  business,
  onClose,
  offers,
  spots,
  events,
  onOpenSpotDetails,
  onOpenEventDetails,
  onUpdateBusiness,
  currentUserId,
  showToast
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isKitOpen, setIsKitOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<PinnedHighlight | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'spots' | 'events'>('overview');

  if (!business) return null;

  // Filter offers for this business
  const businessOffers = offers.filter(o => o.businessId === business.id);

  // Filter spots and events for this business
  const businessSpots = spots.filter(s => s.businessId === business.id || (business.name && s.title.toLowerCase() === business.name.toLowerCase()));
  const businessEvents = events.filter(e => e.businessId === business.id || (business.name && e.location?.toLowerCase().includes(business.name.toLowerCase())));

  // Accent theme color (customizable via Personalization Kit, default Terracotta)
  const accent = business.accentColor || '#E0533C';

  // Check if current logged-in user is the owner of this business profile
  const isOwner = Boolean(
    currentUserId && 
    (business.ownerId === currentUserId || business.id === 'biz-1' || business.id.startsWith('biz-local-'))
  );

  const handleCopyCode = (offerId: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(offerId);
    showToast(`Claim code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleShareProfile = () => {
    shareContent({
      title: `${business.name} on RADA`,
      text: `${business.name} (${business.businessTypeLabel || business.category}): ${business.tagline || business.bio} in ${business.neighborhood}, Nairobi!`,
      url: window.location.href,
      onSuccess: showToast,
      onError: showToast
    });
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'spotify': return <Music className="w-4 h-4 text-emerald-500" />;
      case 'youtube': return <ExternalLink className="w-4 h-4 text-red-500" />;
      case 'tiktok': return <Music className="w-4 h-4 text-slate-800 dark:text-slate-200" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'menu': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'booking': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <Globe className="w-4 h-4" style={{ color: accent }} />;
    }
  };

  return (
    <>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={`${business.name} Profile`}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
      >
        {/* Full-Screen Card Container */}
        <div 
          className="bg-white dark:bg-[#121113] text-slate-900 dark:text-slate-100 w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Top Sticky Bar with Actions & Branding */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span 
                className="w-3 h-3 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: accent }}
              />
              <div className="min-w-0">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">
                  {business.name}
                </h3>
                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                  <span>{business.businessTypeLabel || (business.category === 'hospitality' ? 'Hospitality & Dining' : 'Event Organizer')}</span>
                  <span>•</span>
                  <span>{business.neighborhood}, Nairobi</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Owner Edit / Personalization Kit Button */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsKitOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  style={{ backgroundColor: accent }}
                  title="Open Personalization Kit (Colors, Links, Highlights)"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Personalization Kit</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareProfile}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Share Profile"
                aria-label="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Card Body */}
          <div className="flex-1 overflow-y-auto pb-12">
            
            {/* Widescreen Cinematic Cover Hero */}
            <div className="relative h-56 sm:h-72 w-full bg-slate-900 overflow-hidden shrink-0">
              <img 
                src={business.coverImage || business.logo} 
                alt={business.name} 
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              {/* Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-2">
                  {isBusinessApproved(business) && (
                    <MerchantVerificationBadge category={business.category} size="md" />
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-black/60 backdrop-blur-md border border-white/20">
                    {business.category === 'hospitality' ? 'Venue Partner' : 'Official Promoter'}
                  </span>
                </div>

                {business.businessTypeLabel && (
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-black text-white shadow-md backdrop-blur-md"
                    style={{ backgroundColor: accent }}
                  >
                    {business.businessTypeLabel}
                  </span>
                )}
              </div>

              {/* Bottom Identity Block inside Cover */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
                <div className="flex items-end gap-3.5 min-w-0">
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-[#121113] shadow-2xl shrink-0 bg-white"
                    style={{ outline: `2px solid ${accent}` }}
                  >
                    <img 
                      src={business.logo} 
                      alt={business.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 pb-1 text-white">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-md truncate">
                      {business.name}
                    </h1>
                    {business.tagline && (
                      <p className="text-xs text-white/90 font-semibold drop-shadow-sm truncate mt-0.5">
                        {business.tagline}
                      </p>
                    )}
                    <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                      <span className="truncate">{business.address || `${business.neighborhood}, Nairobi`}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats / Action Bar */}
            <div className="bg-[#FBFBF9] dark:bg-[#18161B] border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
                {/* Contact Quick Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {business.whatsapp && (
                    <a
                      href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Venue</span>
                    </a>
                  )}

                  {business.instagram && (
                    <a
                      href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-700 dark:text-pink-400 border border-pink-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition truncate"
                    >
                      <Instagram className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{business.instagram}</span>
                    </a>
                  )}
                </div>

                {/* Ride Booking Direct Actions (Uber & Bolt) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      showToast(`Opening Uber to ${business.name}...`);
                      window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(business.address || business.neighborhood)}`, '_blank');
                    }}
                    className="px-3 py-2 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Uber</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast(`Opening Bolt to ${business.name}...`);
                      window.open('https://bolt.eu/', '_blank');
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Bolt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

              {/* Bio & Details Section */}
              <div className="bg-[#FBFBF9] dark:bg-[#18161B] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" style={{ color: accent }} />
                    <span>About {business.name}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    Est. {business.createdDate ? new Date(business.createdDate).getFullYear() : '2026'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {business.bio}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>{business.address || `${business.neighborhood}, Nairobi`}</span>
                  </span>
                  {business.email && (
                    <span className="flex items-center gap-1">
                      <span>✉️</span>
                      <a href={`mailto:${business.email}`} className="hover:underline">{business.email}</a>
                    </span>
                  )}
                </div>
              </div>

              {/* =========================================================
                  FEATURE 1: PERSONALIZED UNLIMITED LINKS HUB
                  ========================================================= */}
              {business.customLinks && business.customLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" style={{ color: accent }} />
                      <span>Official Links & Portals ({business.customLinks.length})</span>
                    </h4>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setIsKitOpen(true)}
                        className="text-[11px] font-bold text-[#E0533C] hover:underline"
                      >
                        + Manage Links
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {business.customLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18161B] hover:border-slate-400 transition flex items-center justify-between gap-3 group shadow-2xs cursor-pointer"
                        style={{ borderLeftWidth: '3px', borderLeftColor: accent }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {getPlatformIcon(link.platform)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate group-hover:text-[#E0533C] transition">
                              {link.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {link.url.replace(/^https?:\/\//, '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 2: PINNED HIGHLIGHTS & VISUAL SHOWCASE
                  ========================================================= */}
              {business.pinnedHighlights && business.pinnedHighlights.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pinned Highlights & Features ({business.pinnedHighlights.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">Curated Showcase</span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {business.pinnedHighlights.map((hl) => (
                      <div
                        key={hl.id}
                        onClick={() => setSelectedHighlight(hl)}
                        className="w-44 sm:w-52 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18161B] shrink-0 shadow-sm hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="h-28 w-full relative overflow-hidden bg-slate-900">
                          <img
                            src={hl.imageUrl}
                            alt={hl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span 
                            className="absolute bottom-2 left-2 right-2 text-xs font-black text-white truncate drop-shadow-md"
                          >
                            {hl.title}
                          </span>
                        </div>
                        {hl.description && (
                          <div className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {hl.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 3: RUNNING DEALS, PROMOS & OFFERS
                  ========================================================= */}
              {businessOffers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-rose-500" />
                      <span>Live Deals & Promotions ({businessOffers.length})</span>
                    </h4>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                      Claim Codes Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {businessOffers.map(offer => (
                      <div 
                        key={offer.id}
                        className="bg-white dark:bg-[#18161B] border border-rose-500/30 dark:border-rose-500/20 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        {offer.posterUrl && (
                          <div className="h-36 w-full relative overflow-hidden">
                            <img src={offer.posterUrl} alt={offer.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <span 
                              className="absolute top-2.5 left-2.5 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-xs"
                              style={{ backgroundColor: accent }}
                            >
                              {offer.discount}
                            </span>
                            <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {offer.category}
                            </span>
                            <div className="absolute bottom-2.5 left-2.5 right-2.5">
                              <p className="text-[10px] text-amber-300 font-bold">{offer.validUntil}</p>
                              <h5 className="text-sm font-black text-white truncate drop-shadow-sm">{offer.title}</h5>
                            </div>
                          </div>
                        )}

                        <div className="p-3.5 space-y-2.5">
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {offer.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                              {offer.claimCode || 'RADADEAL'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCopyCode(offer.id, offer.claimCode || 'RADADEAL')}
                              className="px-3.5 py-1.5 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                              style={{ backgroundColor: accent }}
                            >
                              {copiedCodeId === offer.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Claim Code</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 4: VERIFIED SPOTS & LOCATIONS
                  ========================================================= */}
              {businessSpots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-amber-500" />
                      <span>Verified Spot Locations ({businessSpots.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">Tap to view full spot details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {businessSpots.map(spot => (
                      <div 
                        key={spot.id}
                        onClick={() => {
                          onClose();
                          onOpenSpotDetails && onOpenSpotDetails(spot);
                        }}
                        className="p-3.5 bg-white dark:bg-[#18161B] border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={spot.img} 
                            alt={spot.title} 
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                          />
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition truncate">
                              {spot.title}
                            </h5>
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                              <span className="truncate">{spot.exactLocationTag || spot.address}</span>
                            </p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                              ★ {spot.rating} • {spot.menuItems?.length || 0} menu items
                            </p>
                          </div>
                        </div>
                        <span 
                          className="text-[11px] font-bold shrink-0"
                          style={{ color: accent }}
                        >
                          View Spot →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================
                  FEATURE 5: UPCOMING EVENTS & CONCERTS
                  ========================================================= */}
              {businessEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-purple-500" />
                      <span>Upcoming Events & Ticket Passes ({businessEvents.length})</span>
                    </h4>
                    <span className="text-[10px] text-purple-600 font-bold">Official Tickets</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {businessEvents.map(evt => (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          onClose();
                          onOpenEventDetails && onOpenEventDetails(evt);
                        }}
                        className="p-3.5 bg-white dark:bg-[#18161B] border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-between gap-3 cursor-pointer hover:border-purple-400 transition group shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={evt.img} 
                            alt={evt.title} 
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                          />
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition truncate">
                              {evt.title}
                            </h5>
                            <p className="text-[10px] text-purple-600 font-bold mt-0.5">{evt.date}</p>
                            <p className="text-[10px] text-slate-400 truncate">{evt.location}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-purple-600 shrink-0">
                          Tickets →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discography / Media Mix Showcase */}
              {business.discography && business.discography.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-blue-500" />
                    <span>Media, Podcasts & DJ Sets</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {business.discography.map((disco, i) => (
                      <div key={i} className="p-3 bg-[#FBFBF9] dark:bg-[#18161B] rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{disco}</span>
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md shrink-0">
                          Showcase
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Highlight Details Modal */}
      {selectedHighlight && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedHighlight(null)}
        >
          <div 
            className="bg-white dark:bg-[#1C1A1E] rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-56 w-full relative bg-slate-900">
              <img src={selectedHighlight.imageUrl} alt={selectedHighlight.title} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setSelectedHighlight(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">{selectedHighlight.title}</h4>
              {selectedHighlight.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedHighlight.description}</p>
              )}
              {selectedHighlight.linkUrl && (
                <a
                  href={selectedHighlight.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  style={{ backgroundColor: accent }}
                >
                  <span>Explore Feature</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personalization Kit Modal */}
      {isKitOpen && (
        <PersonalizationKitModal
          isOpen={isKitOpen}
          onClose={() => setIsKitOpen(false)}
          mode="business"
          business={business}
          onSaveBusiness={(updated) => {
            onUpdateBusiness?.(updated);
            setIsKitOpen(false);
          }}
          showToast={showToast}
        />
      )}
    </>
  );
};
