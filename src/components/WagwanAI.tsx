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
  ExternalLink
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
  const [messages, setMessages] = useState<WagwanAIMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Wagwan! 👋 I'm your local hangouts concierge on RADA. Ask me anything — quiet cafés with good Wi-Fi, indoor bowling and sports, hidden date night spots, weekend Amapiano raves, or curated thrift fits in your neighborhood!`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        selectedLocation,
        activeCategory,
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
        text: "Wagwan! I couldn't reach the AI server right now, but explore our verified spots and events tab for fresh listings!",
        source: 'smart-fallback',
      } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-bold text-xs shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Wagwan AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  Lifestyle Concierge
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {selectedLocation ? (
                  <span className="flex items-center gap-0.5 text-[#E0533C] font-semibold">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>In {selectedLocation}</span>
                  </span>
                ) : (
                  <span>Nairobi Vibes</span>
                )}
                <span>•</span>
                <span>Context-Aware Assistant</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Close"
            aria-label="Close Wagwan AI"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="py-3 space-y-4 flex-1 text-xs flex flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto min-h-[320px] p-3 sm:p-4 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-inner">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] sm:max-w-[88%] p-3.5 sm:p-4 rounded-3xl text-xs space-y-2.5 shadow-sm transition-all ${
                    msg.sender === 'user'
                      ? 'bg-[#E0533C] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="font-black text-[#E0533C] flex items-center gap-1.5 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Wagwan AI</span>
                      </span>
                      {msg.source && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {msg.source === 'gemini' || msg.source === 'gemini-stream' ? 'Gemini 3.8 Flash' : 'Smart Concierge'}
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
                    <div className="flex items-center gap-2 py-1 text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E0533C]" />
                      <span className="text-[11px] font-medium">Wagwan AI is checking spots & events...</span>
                    </div>
                  ) : null}

                  {/* RICH RECOMMENDATION CARDS: SPOTS */}
                  {msg.recommendedSpots && msg.recommendedSpots.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Sparkles className="w-3 h-3 text-[#E0533C]" />
                        <span>Recommended Hangouts</span>
                      </div>
                      {msg.recommendedSpots.map((spot) => {
                        const catInfo = getCategoryDisplay(spot.category);
                        const coverImg = spot.img || spot.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop';
                        return (
                          <div
                            key={spot.id}
                            className="p-3 bg-[#F8F8F6] dark:bg-[#1A181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#E0533C]/60 transition flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                          >
                            {/* Cover Image Thumbnail */}
                            <div
                              className="w-full sm:w-20 h-24 sm:h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative overflow-hidden"
                              style={{ backgroundImage: `url('${coverImg}')` }}
                            >
                              <div className="absolute top-1.5 left-1.5 sm:hidden">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-black/70 backdrop-blur-xs text-white">
                                  <span>{catInfo.icon}</span>
                                  <span>{catInfo.label}</span>
                                </span>
                              </div>
                            </div>

                            {/* Details Column */}
                            <div className="min-w-0 flex-1 space-y-1 w-full">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-950/80 text-[#E0533C] dark:text-orange-300">
                                  <span>{catInfo.icon}</span>
                                  <span>{catInfo.label}</span>
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{spot.rating}</span>
                                  </span>
                                  <span>•</span>
                                  <span>{spot.price}</span>
                                  <span>•</span>
                                  <span>{spot.neighborhood}</span>
                                </div>
                              </div>

                              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                {spot.title}
                              </h4>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {spot.activityType || spot.description || spot.address}
                              </p>

                              {/* Direct "View Details" button */}
                              <div className="pt-1 flex items-center justify-between gap-2">
                                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Verified Spot</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenSpotDetails(spot);
                                  }}
                                  className="px-3 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-xl text-[11px] shadow-sm transition flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <span>View Details</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* RICH RECOMMENDATION CARDS: EVENTS */}
                  {msg.recommendedEvents && msg.recommendedEvents.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Calendar className="w-3 h-3 text-[#2D6A4F]" />
                        <span>Recommended Event</span>
                      </div>
                      {msg.recommendedEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3 bg-[#F8F8F6] dark:bg-[#1A181C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#2D6A4F]/60 transition flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                        >
                          <div
                            className="w-full sm:w-20 h-24 sm:h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                            style={{ backgroundImage: `url('${evt.img}')` }}
                          />
                          <div className="min-w-0 flex-1 space-y-1 w-full">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-[#2D6A4F] dark:text-emerald-300">
                                <span>🎉</span>
                                <span>{evt.genre || 'Party & Event'}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {evt.goingCount}+ Going
                              </span>
                            </div>
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                              {evt.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {evt.location} • {evt.date}
                            </p>
                            <div className="pt-1 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  if (onOpenEventDetails) onOpenEventDetails(evt);
                                }}
                                className="px-3 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-black rounded-xl text-[11px] shadow-sm transition flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <span>View Details</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RICH RECOMMENDATION CARDS: THRIFT LUKU */}
                  {msg.recommendedThrift && msg.recommendedThrift.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <ShoppingBag className="w-3 h-3 text-[#E0533C]" />
                        <span>Curated Streetwear Fit</span>
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
                placeholder="Ask Wagwan AI: 'quiet café with good Wi-Fi', 'indoor sports', 'romantic date'..."
                disabled={isLoading}
                className="flex-1 p-3.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] disabled:opacity-60 placeholder:text-slate-400 font-medium"
              />
              <button
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

            {/* Quick Suggestion Chips */}
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar text-[11px] pt-1 pb-0.5">
              <button
                type="button"
                onClick={() => handleAsk('Find me a quiet café with good Wi-Fi and specialty coffee')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                ☕ Quiet Café with Wi-Fi
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Where can we do indoor sports or bowling in Nairobi?')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                🎳 Indoor Sports & Bowling
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Romantic candlelit date night spot with good wine')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                ✨ Cozy Date Night
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Amapiano or afro-house party with cocktails this weekend')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                🔥 Nightlife & Raves
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Nature trails or scenic outdoor waterfall hike')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                🌿 Nature & Trails
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Vintage denim jacket or streetwear thrift sellers')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-bold hover:border-[#E0533C] transition cursor-pointer text-slate-700 dark:text-slate-200"
              >
                👕 Streetwear Luku
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
