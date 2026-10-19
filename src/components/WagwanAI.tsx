import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  Compass, 
  Heart, 
  Music, 
  Coffee, 
  UtensilsCrossed, 
  MapPin, 
  Star, 
  ArrowRight, 
  Calendar, 
  Ticket, 
  ShoppingBag,
  Gamepad2,
  Trees,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Clock,
  Navigation as NavIcon
} from 'lucide-react';
import { SpotItem, EventItem, ThriftItem } from '../types';
import { sendWagwanChatMessage, WagwanAIResponse } from '../services/aiChatService';

export interface WagwanAIMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  spotMatch?: SpotItem;
  eventMatch?: EventItem;
  thriftMatch?: ThriftItem;
  recommendedSpots?: SpotItem[];
  recommendedEvents?: EventItem[];
  recommendedThrift?: ThriftItem[];
  source?: string;
  isStreaming?: boolean;
}

export interface WagwanAIProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation?: string;
  activeCategory?: string;
  activeCategories?: string[];
  spots: SpotItem[];
  events?: EventItem[];
  thriftItems?: ThriftItem[];
  onOpenSpotDetails: (spot: SpotItem) => void;
  onOpenEventDetails?: (event: EventItem) => void;
}

const NAIROBI_NEIGHBORHOODS = [
  'Westlands',
  'Kilimani',
  'Karen',
  'Nairobi CBD',
  'Lavington',
  'Parklands',
  'Gigiri',
  'Ruiru',
  'Kiambu Town',
  'Thika'
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  cafes: { label: 'Café & Coffee', icon: '☕' },
  cafes_bakeries: { label: 'Café & Bakery', icon: '☕' },
  restaurants: { label: 'Restaurant & Dining', icon: '🍽️' },
  restaurants_dining: { label: 'Restaurant & Dining', icon: '🍽️' },
  nightlife: { label: 'Nightlife & Lounge', icon: '🍸' },
  clubs_lounges: { label: 'Nightlife & Club', icon: '🎉' },
  date_spots: { label: 'Date Spot', icon: '🍷' },
  connect_with_nature: { label: 'Nature & Outdoors', icon: '🌿' },
  nature: { label: 'Nature & Outdoors', icon: '🌿' },
  outdoors: { label: 'Outdoors', icon: '🌿' },
  action_sports: { label: 'Action & Sports', icon: '🎯' },
  tech_gaming: { label: 'Tech & Gaming', icon: '🎮' },
  creative_leisure: { label: 'Creative Leisure', icon: '🎨' },
  hotels: { label: 'Hotels & Stay', icon: '🏨' },
  hotels_luxury: { label: 'Hotels & Luxury', icon: '🏨' },
  vacation: { label: 'Vacation Escape', icon: '🌴' },
  vacation_escapes: { label: 'Vacation Escape', icon: '🌴' },
};

function getCategoryDisplay(cat: string) {
  const normalized = (cat || '').toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_LABELS[normalized] || { label: cat || 'Hangout', icon: '✨' };
}

export const WagwanAI: React.FC<WagwanAIProps> = ({
  isOpen,
  onClose,
  selectedLocation = '',
  activeCategory = '',
  activeCategories = [],
  spots,
  events = [],
  thriftItems = [],
  onOpenSpotDetails,
  onOpenEventDetails,
}) => {
  const [wagwanInput, setWagwanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSelectedLocation, setCurrentSelectedLocation] = useState<string>(selectedLocation || 'Westlands');
  const [currentActiveCategory, setCurrentActiveCategory] = useState<string>(activeCategory || 'All Hangout Categories');
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);

  const [messages, setMessages] = useState<WagwanAIMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Wagwan fam! 👋 I'm Wagwan AI, Nairobi's premier hangouts & nightlife concierge on RADA. Ask me anything — quiet cafés with good Wi-Fi, indoor bowling and sports, hidden date night courtyards, weekend Amapiano raves, or fresh thrift drip in your neighborhood!`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync incoming props
  useEffect(() => {
    if (selectedLocation) {
      setCurrentSelectedLocation(selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (activeCategory) {
      setCurrentActiveCategory(activeCategory);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleAsk = async (query?: string) => {
    const q = (query || wagwanInput).trim();
    if (!q || isLoading) return;

    const userMessage: WagwanAIMessage = { 
      id: `user-${Date.now()}`,
      sender: 'user', 
      text: q 
    };

    const aiMessageId = `ai-${Date.now()}`;
    const initialAiMessage: WagwanAIMessage = {
      id: aiMessageId,
      sender: 'ai',
      text: '',
      isStreaming: true,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages([...updatedHistory, initialAiMessage]);
    setWagwanInput('');
    setIsLoading(true);

    try {
      const response: WagwanAIResponse = await sendWagwanChatMessage({
        message: q,
        conversationHistory: updatedHistory.map(m => ({ sender: m.sender, text: m.text })),
        selectedLocation: currentSelectedLocation,
        activeCategory: currentActiveCategory,
        activeCategories,
        spots,
        events,
        thriftItems,
        onStreamChunk: (_chunk, accumulated) => {
          setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, text: accumulated } : m));
        },
      });

      const resolvedSpots = response.recommendedSpots && response.recommendedSpots.length > 0
        ? response.recommendedSpots
        : (response.spotMatch ? [response.spotMatch] : []);

      const resolvedEvents = response.recommendedEvents && response.recommendedEvents.length > 0
        ? response.recommendedEvents
        : (response.eventMatch ? [response.eventMatch] : []);

      const resolvedThrift = response.recommendedThrift && response.recommendedThrift.length > 0
        ? response.recommendedThrift
        : (response.thriftMatch ? [response.thriftMatch] : []);

      setMessages(prev => prev.map(m => m.id === aiMessageId ? {
        ...m,
        text: response.text,
        isStreaming: false,
        spotMatch: response.spotMatch,
        eventMatch: response.eventMatch,
        thriftMatch: response.thriftMatch,
        recommendedSpots: resolvedSpots,
        recommendedEvents: resolvedEvents,
        recommendedThrift: resolvedThrift,
        source: response.source,
      } : m));
    } catch (err) {
      console.warn('Wagwan AI turn error:', err);
      setMessages(prev => prev.map(m => m.id === aiMessageId ? {
        ...m,
        isStreaming: false,
        text: "Wagwan! I'm temporarily unable to reach the server, but explore our verified spots and events tab for fresh Nairobi listings!",
        source: 'smart-fallback',
      } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Wagwan AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] dark:text-orange-400">
                  Nairobi Concierge
                </span>
              </div>
              
              {/* Dynamic Context Ingestion Indicators */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="flex items-center gap-1 font-bold text-[#E0533C] hover:underline cursor-pointer bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md"
                    title="Change location context"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    <span>In {currentSelectedLocation || 'Nairobi'}</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>

                  {/* Location Switcher Dropdown */}
                  {showLocationPicker && (
                    <div className="absolute top-full left-0 mt-1.5 z-30 w-48 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                        Select Location Context
                      </div>
                      {NAIROBI_NEIGHBORHOODS.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setCurrentSelectedLocation(loc);
                            setShowLocationPicker(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                            currentSelectedLocation === loc
                              ? 'bg-[#E0533C] text-white'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{loc}</span>
                          {currentSelectedLocation === loc && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span>•</span>
                <span className="truncate max-w-[140px] text-slate-500 font-medium">
                  {currentActiveCategory === 'All Hangout Categories' ? 'All Categories' : currentActiveCategory}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0 ml-2"
            title="Close"
            aria-label="Close Wagwan AI"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Context Ingestion Category Selector Pills */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-[10px]">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0">Filter:</span>
          {[
            'All Categories',
            'Cafés & Bakeries',
            'Action & Sports',
            'Date Spots',
            'Connect with Nature',
            'Clubs & Lounges',
            'Restaurants & Dining'
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCurrentActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${
                currentActiveCategory === cat || (cat === 'All Categories' && currentActiveCategory === 'All Hangout Categories')
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="py-2 space-y-4 flex-1 text-xs flex flex-col min-h-0">
          <div className="flex-1 space-y-3.5 overflow-y-auto min-h-[300px] p-3 sm:p-4 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-inner">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[94%] sm:max-w-[90%] p-3.5 sm:p-4 rounded-3xl text-xs space-y-2.5 shadow-sm transition-all ${
                    msg.sender === 'user'
                      ? 'bg-[#E0533C] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="font-black text-[#E0533C] flex items-center gap-1.5 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Wagwan AI Concierge</span>
                      </span>
                      {msg.source && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {msg.source === 'gemini' || msg.source === 'gemini-stream' ? 'Gemini 3.8 Flash' : 'RADA Concierge'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Text Content */}
                  {msg.text ? (
                    <p className="leading-relaxed whitespace-pre-wrap text-xs font-normal">
                      {msg.text}
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#E0533C] animate-pulse align-middle" />
                      )}
                    </p>
                  ) : msg.isStreaming ? (
                    <div className="flex items-center gap-2 py-1.5 text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E0533C]" />
                      <span className="text-[11px] font-medium">Wagwan AI is scouting Nairobi database...</span>
                    </div>
                  ) : null}

                  {/* ============================================================== */}
                  {/* RICH RECOMMENDATION CARDS: SPOTS (Requirement 2) */}
                  {/* ============================================================== */}
                  {msg.recommendedSpots && msg.recommendedSpots.length > 0 && (
                    <div className="space-y-2 pt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <Sparkles className="w-3 h-3 text-[#E0533C]" />
                        <span>Recommended Hangouts ({msg.recommendedSpots.length})</span>
                      </div>

                      {msg.recommendedSpots.map((spot) => {
                        const catInfo = getCategoryDisplay(spot.category);
                        const coverImg = spot.img || spot.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop';
                        
                        return (
                          <div
                            key={spot.id}
                            className="bg-[#F8F8F6] dark:bg-[#1A181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#E0533C]/70 transition overflow-hidden group/card"
                          >
                            <div className="p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              {/* Cover Image Thumbnail */}
                              <div
                                className="w-full sm:w-24 h-32 sm:h-24 rounded-xl bg-cover bg-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden group-hover/card:scale-[1.01] transition-transform duration-200"
                                style={{ backgroundImage: `url('${coverImg}')` }}
                              >
                                <div className="absolute top-2 left-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-black/75 backdrop-blur-xs text-white">
                                    <span>{catInfo.icon}</span>
                                    <span>{catInfo.label}</span>
                                  </span>
                                </div>
                                <div className="absolute bottom-2 left-2">
                                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[#E0533C] text-white">
                                    {spot.price || '$$'}
                                  </span>
                                </div>
                              </div>

                              {/* Details Column */}
                              <div className="min-w-0 flex-1 space-y-1 w-full">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover/card:text-[#E0533C] transition truncate">
                                    {spot.title}
                                  </h4>
                                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-500">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{spot.rating}</span>
                                  </div>
                                </div>

                                {/* Location & Landmark */}
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate font-medium">
                                  <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                                  <span className="truncate">{spot.neighborhood} • {spot.exactLocationTag || spot.address}</span>
                                </p>

                                {/* Activity / Features / Description */}
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                  {spot.activityType || spot.description || 'Verified Nairobi hangout.'}
                                </p>

                                {/* Card Action Row: Direct "View Details" button */}
                                <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/80 mt-1">
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Verified Spot</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenSpotDetails(spot);
                                    }}
                                    className="px-3.5 py-1.5 bg-[#E0533C] hover:bg-orange-700 active:scale-95 text-white font-black rounded-xl text-[11px] shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    <span>View Details</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* RICH RECOMMENDATION CARDS: EVENTS */}
                  {/* ============================================================== */}
                  {msg.recommendedEvents && msg.recommendedEvents.length > 0 && (
                    <div className="space-y-2 pt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3 h-3 text-[#2D6A4F]" />
                        <span>Recommended Event ({msg.recommendedEvents.length})</span>
                      </div>

                      {msg.recommendedEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="bg-[#F8F8F6] dark:bg-[#1A181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#2D6A4F]/70 transition overflow-hidden group/event"
                        >
                          <div className="p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div
                              className="w-full sm:w-24 h-32 sm:h-24 rounded-xl bg-cover bg-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden"
                              style={{ backgroundImage: `url('${evt.img}')` }}
                            >
                              <div className="absolute top-2 left-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600/90 text-white">
                                  <span>🎉</span>
                                  <span>{evt.genre || 'Live Event'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1 w-full">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-event:text-[#2D6A4F] transition truncate">
                                  {evt.title}
                                </h4>
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0">
                                  {evt.goingCount}+ Going
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{evt.date} • {evt.time || 'Evening'}</span>
                              </p>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate font-medium">
                                <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                                <span className="truncate">{evt.location}</span>
                              </p>

                              <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/80 mt-1">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                  {evt.tiers?.[0]?.price ? `From ${evt.tiers[0].price}` : 'Verified Event'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onOpenEventDetails) onOpenEventDetails(evt);
                                  }}
                                  className="px-3.5 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 active:scale-95 text-white font-black rounded-xl text-[11px] shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                                >
                                  <span>View Details</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* RICH RECOMMENDATION CARDS: THRIFT / LUKU */}
                  {/* ============================================================== */}
                  {msg.recommendedThrift && msg.recommendedThrift.length > 0 && (
                    <div className="space-y-2 pt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <ShoppingBag className="w-3 h-3 text-[#E0533C]" />
                        <span>Curated Streetwear Luku</span>
                      </div>

                      {msg.recommendedThrift.map((th) => (
                        <div
                          key={th.id}
                          className="p-3 bg-[#F8F8F6] dark:bg-[#1A181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3"
                        >
                          <img
                            src={th.img}
                            alt={th.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                              👕 Vintage Luku
                            </span>
                            <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                              {th.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              {th.price} • {th.seller} ({th.storeLocation})
                            </p>
                            <a
                              href={`https://wa.me/${(th.whatsapp || '+254700000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hi! I saw "${th.name}" on RADA Wagwan AI. Is it still available?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-0.5"
                            >
                              <span>Chat with Merchant on WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={wagwanInput}
                onChange={(e) => setWagwanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleAsk()}
                placeholder="Ask Wagwan AI: 'quiet café with good Wi-Fi', 'where can we do indoor sports?'..."
                disabled={isLoading}
                className="flex-1 p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] disabled:opacity-60 placeholder:text-slate-400 font-medium text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => handleAsk()}
                disabled={isLoading || !wagwanInput.trim()}
                className="px-4 py-3.5 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-2xl transition shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestion Chips Covering All Specific Requirements */}
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar text-[11px] pt-1 pb-0.5">
              <button
                type="button"
                onClick={() => handleAsk('Find me a quiet café with good Wi-Fi')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>☕</span>
                <span>Quiet Café with Wi-Fi</span>
              </button>

              <button
                type="button"
                onClick={() => handleAsk('Where can we do indoor sports?')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>🎳</span>
                <span>Indoor Sports & Bowling</span>
              </button>

              <button
                type="button"
                onClick={() => handleAsk('Romantic candlelit date night spot with good wine')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>✨</span>
                <span>Romantic Date Night</span>
              </button>

              <button
                type="button"
                onClick={() => handleAsk('Amapiano rave or party with cocktails this weekend')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>🔥</span>
                <span>Amapiano Raves & Parties</span>
              </button>

              <button
                type="button"
                onClick={() => handleAsk('Nature trails or scenic outdoor waterfall hike')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>🌿</span>
                <span>Nature Trails & Hikes</span>
              </button>

              <button
                type="button"
                onClick={() => handleAsk('Vintage denim jacket or streetwear thrift sellers')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <span>👕</span>
                <span>Streetwear & Luku Fits</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
