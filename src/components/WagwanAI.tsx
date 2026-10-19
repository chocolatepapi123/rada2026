import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Compass, Heart, Music, Coffee, UtensilsCrossed } from 'lucide-react';
import { SpotItem, EventItem, ThriftItem } from '../types';
import { sendWagwanChatMessage, WagwanAIResponse } from '../services/aiChatService';

export interface WagwanAIMessage {
  sender: 'user' | 'ai';
  text: string;
  spotMatch?: SpotItem;
  eventMatch?: EventItem;
  thriftMatch?: ThriftItem;
  source?: string;
}

export interface WagwanAIProps {
  isOpen: boolean;
  onClose: () => void;
  spots: SpotItem[];
  events?: EventItem[];
  thriftItems?: ThriftItem[];
  onOpenSpotDetails: (spot: SpotItem) => void;
  onOpenEventDetails?: (event: EventItem) => void;
}

export const WagwanAI: React.FC<WagwanAIProps> = ({
  isOpen,
  onClose,
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
      sender: 'ai',
      text: 'Wagwan! 👋 I am your personal lifestyle & hangouts concierge. Ask me anything — date night spots, hidden brunch gems, rooftop cocktails, weekend raves, or vintage thrift fits in your city!',
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

    const userMessage: WagwanAIMessage = { sender: 'user', text: q };
    const updatedHistory = [...messages, userMessage];

    setMessages(updatedHistory);
    setWagwanInput('');
    setIsLoading(true);

    try {
      const response: WagwanAIResponse = await sendWagwanChatMessage({
        message: q,
        conversationHistory: updatedHistory.map(m => ({ sender: m.sender, text: m.text })),
        spots,
        events,
        thriftItems,
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: response.text,
          spotMatch: response.spotMatch,
          eventMatch: response.eventMatch,
          thriftMatch: response.thriftMatch,
          source: response.source,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: "Wagwan! I couldn't reach the AI server right now, but explore our verified spots and events tab for fresh listings!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] flex flex-col p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Wagwan AI
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  Live Concierge
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Personalized local hangouts & experiences assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="py-4 space-y-4 flex-1 text-xs flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto min-h-[300px] p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs space-y-2 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#E0533C] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#E0533C] flex items-center gap-1 text-[11px]">
                        Wagwan AI <Sparkles className="w-3 h-3 inline text-amber-500" />
                      </span>
                      {msg.source === 'gemini' && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Gemini 3.8 Flash
                        </span>
                      )}
                    </div>
                  )}

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Matched Spot Card */}
                  {msg.spotMatch && (
                    <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-black text-xs text-[#E0533C] truncate">{msg.spotMatch.title}</h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {msg.spotMatch.neighborhood} • ★{msg.spotMatch.rating} • {msg.spotMatch.price}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSpotDetails(msg.spotMatch!);
                        }}
                        className="px-2.5 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-lg text-[10px] shadow-xs cursor-pointer shrink-0 transition"
                      >
                        View Spot
                      </button>
                    </div>
                  )}

                  {/* Matched Event Card */}
                  {msg.eventMatch && (
                    <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-black text-xs text-[#2D6A4F] truncate">{msg.eventMatch.title}</h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {msg.eventMatch.location} • {msg.eventMatch.date}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenEventDetails) onOpenEventDetails(msg.eventMatch!);
                        }}
                        className="px-2.5 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] shadow-xs cursor-pointer shrink-0 transition"
                      >
                        View Event
                      </button>
                    </div>
                  )}

                  {/* Matched Thrift Item Card */}
                  {msg.thriftMatch && (
                    <div className="p-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={msg.thriftMatch.img}
                          alt={msg.thriftMatch.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-black text-xs text-[#2D6A4F] truncate">{msg.thriftMatch.name}</h5>
                          <p className="text-[10px] text-slate-500 truncate">
                            {msg.thriftMatch.price} • {msg.thriftMatch.seller}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/${(msg.thriftMatch.whatsapp || '+254700000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hi! I saw "${msg.thriftMatch.name}" on RADA. Is it still available?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-[#2D6A4F] hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] shadow-xs shrink-0 transition"
                      >
                        Inquire Fit
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E0533C]" />
                  <span className="text-[11px] font-medium">Wagwan AI is thinking...</span>
                </div>
              </div>
            )}

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
                placeholder="Ask anything: cozy romantic date, budget choma, vinyl cafe, rooftop vibes..."
                disabled={isLoading}
                className="flex-1 p-3 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] disabled:opacity-60"
              />
              <button
                onClick={() => handleAsk()}
                disabled={isLoading || !wagwanInput.trim()}
                className="px-4 py-3 bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
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
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar text-[11px] pt-1">
              <button
                type="button"
                onClick={() => handleAsk('Romantic date night spot with good wine and intimate vibe')}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C] transition cursor-pointer"
              >
                ✨ Cozy Date Night
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Amapiano or afro-house party with cocktails this weekend')}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C] transition cursor-pointer"
              >
                🔥 Nightlife & Raves
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Quiet laptop-friendly cafe with specialty coffee and fast wifi')}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C] transition cursor-pointer"
              >
                ☕ Coffee & Remote Work
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Nature trails or scenic outdoor weekend escape')}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C] transition cursor-pointer"
              >
                🌿 Nature & Outings
              </button>
              <button
                type="button"
                onClick={() => handleAsk('Vintage denim jacket or streetwear thrift sellers')}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-full shrink-0 font-medium hover:border-[#E0533C] transition cursor-pointer"
              >
                👕 Vintage Luku Fits
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
