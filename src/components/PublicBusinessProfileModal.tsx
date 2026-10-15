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
  Shirt, 
  Percent, 
  Copy, 
  Check, 
  Clock, 
  UtensilsCrossed, 
  Share2 
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessOffer, 
  SpotItem, 
  EventItem, 
  ThriftItem 
} from '../types.ts';
import { MerchantVerificationBadge } from './MerchantVerificationBadge.tsx';
import { isBusinessApproved } from './BusinessBadge.tsx';

import { shareContent } from '../utils/shareUtils.ts';

interface PublicBusinessProfileModalProps {
  business: BusinessAccount | null;
  onClose: () => void;
  offers: BusinessOffer[];
  spots: SpotItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  onOpenSpotDetails?: (spot: SpotItem) => void;
  onOpenEventDetails?: (event: EventItem) => void;
  showToast: (msg: string) => void;
}

export const PublicBusinessProfileModal: React.FC<PublicBusinessProfileModalProps> = ({
  business,
  onClose,
  offers,
  spots,
  events,
  thriftItems,
  onOpenSpotDetails,
  onOpenEventDetails,
  showToast
}) => {
 const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  if (!business) return null;

  // Filter offers for this business
  const businessOffers = offers.filter(o => o.businessId === business.id);

  // Filter spots, events, or thrift items for this business
  const businessSpots = spots.filter(s => s.businessId === business.id);
  const businessEvents = events.filter(e => e.businessId === business.id);
  const businessThrift = thriftItems.filter(t => t.businessId === business.id || t.seller === business.name);

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
      text: `Check out ${business.name} in ${business.neighborhood}, Nairobi! ${business.bio}`,
      url: window.location.href,
      onSuccess: showToast,
      onError: showToast
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 overflow-hidden">
        
        {/* Cover Photo & Header Buttons */}
        <div className="relative h-44 w-full bg-slate-900 shrink-0">
          <img 
            src={business.coverImage || business.logo} 
            alt={business.name} 
            className="w-full h-full object-cover opacity-90" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button 
              type="button"
              onClick={handleShareProfile}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
              title="Share Profile / Link"
              aria-label="Share Profile"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Business Type Badge */}
          <div className="absolute top-3 left-3">
            {isBusinessApproved(business) && (
              <MerchantVerificationBadge category={business.category} size="sm" />
            )}
          </div>
        </div>

        {/* Scrollable Profile Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Main Info */}
          <div className="relative -mt-12 flex items-end gap-3.5">
            <img 
              src={business.logo} 
              alt={business.name} 
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-[#1C1A1E] shadow-xl shrink-0" 
            />
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-black tracking-tight leading-tight truncate">
                {business.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                <span className="truncate">{business.address || `${business.neighborhood}, Nairobi`}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-[#FBFBF9] dark:bg-[#121113] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {business.bio}
            </p>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 transition"
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
                className="p-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-700 dark:text-pink-400 border border-pink-500/30 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 transition truncate"
              >
                <Instagram className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{business.instagram}</span>
              </a>
            )}
          </div>

          {/* ========================================================
              ACTIVE PROMOTIONS & OFFERS SHOWCASE (SPEC 4)
              ======================================================== */}
          {businessOffers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Running Offers & Deals ({businessOffers.length})</span>
                </h3>
                <span className="text-[10px] font-bold text-rose-500">Live Promotions</span>
              </div>

              <div className="space-y-3">
                {businessOffers.map(offer => (
                  <div 
                    key={offer.id}
                    className="bg-white dark:bg-[#121113] border border-rose-500/30 dark:border-rose-500/20 rounded-2xl overflow-hidden shadow-xs"
                  >
                    {offer.posterUrl && (
                      <div className="h-32 w-full relative">
                        <img src={offer.posterUrl} alt={offer.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <span className="absolute top-2 left-2 bg-[#E0533C] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                          {offer.discount}
                        </span>
                        <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                          {offer.category}
                        </span>
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-[10px] text-amber-300 font-semibold">{offer.validUntil}</p>
                          <h4 className="text-xs font-black text-white">{offer.title}</h4>
                        </div>
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {offer.description}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          Code: {offer.claimCode || 'RADADEAL'}
                        </span>

                        <button
                          onClick={() => handleCopyCode(offer.id, offer.claimCode || 'RADADEAL')}
                          className="px-3 py-1 bg-[#E0533C] hover:bg-[#c9432d] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition"
                        >
                          {copiedCodeId === offer.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
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

          {/* ========================================================
              VERTICAL-SPECIFIC SHOWCASE
              ======================================================== */}
          {/* Spots Showcase */}
          {business.category === 'hospitality' && businessSpots.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-500" />
                <span>Verified Spots ({businessSpots.length})</span>
              </h3>
              <div className="space-y-2">
                {businessSpots.map(spot => (
                  <div 
                    key={spot.id}
                    onClick={() => {
                      onClose();
                      onOpenSpotDetails && onOpenSpotDetails(spot);
                    }}
                    className="p-3 bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={spot.img} alt={spot.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs truncate">{spot.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{spot.exactLocationTag || spot.address}</p>
                        <p className="text-[10px] text-amber-600 font-bold">★ {spot.rating} • {spot.menuItems?.length || 0} menu items</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#E0533C] shrink-0">View Spot →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Showcase */}
          {business.category === 'event_organizer' && businessEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-purple-500" />
                <span>Upcoming Events ({businessEvents.length})</span>
              </h3>
              <div className="space-y-2">
                {businessEvents.map(evt => (
                  <div 
                    key={evt.id}
                    onClick={() => {
                      onClose();
                      onOpenEventDetails && onOpenEventDetails(evt);
                    }}
                    className="p-3 bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-purple-400 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={evt.img} alt={evt.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs truncate">{evt.title}</h4>
                        <p className="text-[10px] text-purple-600 font-bold">{evt.date}</p>
                        <p className="text-[10px] text-slate-400 truncate">{evt.location}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 shrink-0">Tickets →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thrift Showcase */}
          {business.category === 'thrift_store' && businessThrift.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-emerald-500" />
                <span>LUKU Catalog ({businessThrift.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {businessThrift.map(item => (
                  <div 
                    key={item.id}
                    className="p-2.5 bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl"
                  >
                    <img src={item.img} alt={item.name} className="w-full aspect-square rounded-xl object-cover mb-1.5" />
                    <h5 className="font-bold text-[11px] truncate">{item.name}</h5>
                    <p className="text-xs font-black text-[#E0533C]">{item.price}</p>
                    <span className="text-[9px] text-slate-400 block">{item.size} • {item.condition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discography / Lookbook media */}
          {business.discography && business.discography.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Media & Curated Discography
              </h3>
              <div className="space-y-1.5">
                {business.discography.map((disco, i) => (
                  <div key={i} className="p-2.5 bg-[#FBFBF9] dark:bg-[#121113] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{disco}</span>
                    <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded">
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
  );
};
