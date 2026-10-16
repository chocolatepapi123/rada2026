import React, { useState, useMemo } from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  MapPin, 
  Calendar, 
  Tag, 
  Star, 
  Shirt, 
  Ticket, 
  ArrowRight,
  Search,
  Sparkles
} from 'lucide-react';
import { 
  SavedItem, 
  SpotItem, 
  EventItem, 
  ThriftItem, 
  BusinessOffer 
} from '../types.ts';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedItem[];
  spots: SpotItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  offers?: BusinessOffer[];
  onToggleSave: (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpot: (spot: SpotItem) => void;
  onOpenEvent: (event: EventItem) => void;
  showToast: (msg: string) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  savedItems,
  spots,
  events,
  thriftItems,
  offers = [],
  onToggleSave,
  onOpenSpot,
  onOpenEvent,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'spot' | 'event' | 'thrift' | 'offer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Hydrate saved items with full details
  const hydratedItems = useMemo(() => {
    return savedItems.map(saved => {
      let data: any = null;
      if (saved.kind === 'spot') {
        data = spots.find(s => String(s.id) === String(saved.id));
      } else if (saved.kind === 'event') {
        data = events.find(e => String(e.id) === String(saved.id));
      } else if (saved.kind === 'thrift') {
        data = thriftItems.find(t => String(t.id) === String(saved.id));
      } else if (saved.kind === 'offer') {
        data = offers.find(o => String(o.id) === String(saved.id));
      }

      return {
        ...saved,
        data,
      };
    }).filter(item => item.data !== null);
  }, [savedItems, spots, events, thriftItems, offers]);

  // Filtered by tab and search query
  const filteredItems = useMemo(() => {
    let result = hydratedItems;
    if (activeTab !== 'all') {
      result = result.filter(item => item.kind === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const title = item.data?.title || item.data?.name || '';
        const desc = item.data?.neighborhood || item.data?.location || item.data?.category || '';
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      });
    }
    return result;
  }, [hydratedItems, activeTab, searchQuery]);

  const counts = {
    all: hydratedItems.length,
    spot: hydratedItems.filter(i => i.kind === 'spot').length,
    event: hydratedItems.filter(i => i.kind === 'event').length,
    thrift: hydratedItems.filter(i => i.kind === 'thrift').length,
    offer: hydratedItems.filter(i => i.kind === 'offer').length,
  };

  const handleCardClick = (item: any) => {
    if (item.kind === 'spot') {
      onOpenSpot(item.data);
      onClose();
    } else if (item.kind === 'event') {
      onOpenEvent(item.data);
      onClose();
    } else if (item.kind === 'thrift') {
      showToast(`Selected LUKU item: "${item.data.name || item.data.title}"`);
    } else if (item.kind === 'offer') {
      showToast(`Offer: "${item.data.title}" (${item.data.discount || 'Active Deal'})`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#E0533C] flex items-center justify-center shadow-xs">
              <Bookmark className="w-5 h-5 fill-[#E0533C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Saved Items & Moves</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E0533C]/10 text-[#E0533C]">
                  {counts.all} saved
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Your bookmarked spots, upcoming raves, fits & promo deals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-[#F8F8F6] dark:bg-[#121113]">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search saved spots, events, or fits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#E0533C]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'spot', label: 'Spots', count: counts.spot },
              { id: 'event', label: 'Events', count: counts.event },
              { id: 'thrift', label: 'LUKU Fits', count: counts.thrift },
              { id: 'offer', label: 'Offers', count: counts.offer },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-[11px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#E0533C] text-white shadow-sm'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 text-[#E0533C] flex items-center justify-center mx-auto">
                <Bookmark className="w-7 h-7" />
              </div>
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No saved items match your search' : 'No items saved in this category yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tap the bookmark icon on any Nairobi spot, concert pass, thrift outfit, or drink offer to keep it handy here.
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const d = item.data;
              const title = d.title || d.name || 'Untitled Item';
              const img = d.image || d.imageUrl || d.images?.[0] || d.coverImage || d.posterUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
              const locationStr = d.neighborhood || d.location || d.address || d.seller || 'Nairobi';
              const tagStr = d.category || (item.kind === 'event' ? 'Concert / Rave' : item.kind === 'thrift' ? 'Streetwear' : 'Promotion');

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 group hover:border-[#E0533C]/40 transition shadow-2xs cursor-pointer"
                  onClick={() => handleCardClick(item)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={img}
                      alt={title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.kind === 'spot' 
                            ? 'bg-orange-500/10 text-[#E0533C]' 
                            : item.kind === 'event'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : item.kind === 'thrift'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.kind}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">{tagStr}</span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5">
                        {title}
                      </h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                        <span className="truncate">{locationStr}</span>
                        {d.price && (
                          <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">
                            • {typeof d.price === 'number' ? `KES ${d.price.toLocaleString()}` : d.price}
                          </span>
                        )}
                        {d.discount && (
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 ml-1">
                            • {d.discount}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleSave(d, item.kind)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="p-2 rounded-xl bg-[#E0533C] text-white hover:bg-orange-700 transition cursor-pointer shadow-xs"
                      title="View details"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
