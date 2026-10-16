import React, { useState, useMemo } from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  Compass, 
  MapPin, 
  Calendar, 
  Tag, 
  Star, 
  Shirt, 
  Ticket, 
  ArrowRight,
  Search,
  Flame
} from 'lucide-react';
import { 
  SavedItem, 
  SpotItem, 
  ExperienceItem, 
  EventItem, 
  ThriftItem, 
  BusinessOffer 
} from '../types.ts';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedItem[];
  spots: SpotItem[];
  experiences: ExperienceItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  offers?: BusinessOffer[];
  onToggleSave: (item: any, kind: 'spot' | 'experience' | 'event' | 'thrift' | 'offer') => void;
  onOpenSpot: (spot: SpotItem) => void;
  onOpenExperience: (exp: ExperienceItem) => void;
  onOpenEvent: (event: EventItem) => void;
  onOpenThrift?: (item: ThriftItem) => void;
  onOpenOffer?: (offer: BusinessOffer) => void;
  onExploreMoves?: () => void;
  showToast: (msg: string) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  savedItems,
  spots,
  experiences,
  events,
  thriftItems,
  offers = [],
  onToggleSave,
  onOpenSpot,
  onOpenExperience,
  onOpenEvent,
  onOpenThrift,
  onOpenOffer,
  onExploreMoves,
  showToast
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'spot' | 'experience' | 'event' | 'thrift' | 'offer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hydrate saved items to actual entities
  const hydratedItems = useMemo(() => {
    return savedItems.map(s => {
      if (s.kind === 'spot') {
        const item = spots.find(x => String(x.id) === String(s.id));
        return item ? { kind: 'spot', item, savedAt: s.savedAt } : null;
      }
      if (s.kind === 'experience') {
        const item = experiences.find(x => String(x.id) === String(s.id));
        return item ? { kind: 'experience', item, savedAt: s.savedAt } : null;
      }
      if (s.kind === 'event') {
        const item = events.find(x => String(x.id) === String(s.id));
        return item ? { kind: 'event', item, savedAt: s.savedAt } : null;
      }
      if (s.kind === 'thrift') {
        const item = thriftItems.find(x => String(x.id) === String(s.id));
        return item ? { kind: 'thrift', item, savedAt: s.savedAt } : null;
      }
      if (s.kind === 'offer') {
        const item = offers.find(x => String(x.id) === String(s.id));
        return item ? { kind: 'offer', item, savedAt: s.savedAt } : null;
      }
      return null;
    }).filter(Boolean) as { kind: 'spot' | 'experience' | 'event' | 'thrift' | 'offer'; item: any; savedAt: string }[];
  }, [savedItems, spots, experiences, events, thriftItems, offers]);

  // Counts per category
  const counts = useMemo(() => {
    return {
      all: hydratedItems.length,
      spot: hydratedItems.filter(h => h.kind === 'spot').length,
      experience: hydratedItems.filter(h => h.kind === 'experience').length,
      event: hydratedItems.filter(h => h.kind === 'event').length,
      thrift: hydratedItems.filter(h => h.kind === 'thrift').length,
      offer: hydratedItems.filter(h => h.kind === 'offer').length
    };
  }, [hydratedItems]);

  // Filtered by category and search
  const filteredItems = useMemo(() => {
    return hydratedItems.filter(({ kind, item }) => {
      if (selectedCategory !== 'all' && kind !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (item.title || item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const loc = (item.neighborhood || item.location || item.storeLocation || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || loc.includes(q);
      }
      return true;
    });
  }, [hydratedItems, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#E0533C]">
            <Bookmark className="w-5 h-5 fill-[#E0533C]" />
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Saved Moves & Bookmarks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-lg mx-auto w-full p-4 space-y-4 flex-1 text-xs pb-24">
        {/* Search within saved */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your saved moves..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'spot', label: `Places (${counts.spot})` },
            { id: 'experience', label: `Experiences (${counts.experience})` },
            { id: 'event', label: `Events (${counts.event})` },
            { id: 'thrift', label: `Luku (${counts.thrift})` },
            { id: 'offer', label: `Deals (${counts.offer})` }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* List of saved items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-200">
              No saved moves found
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Tap the bookmark icon on any spot, experience, weekend event, or running offer to collect your plans here!
            </p>
            {onExploreMoves && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreMoves();
                }}
                className="mt-2 px-4 py-2 bg-[#E0533C] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-700 transition"
              >
                Browse What's the Move
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(({ kind, item }) => {
              const imgUrl = item.img || item.posterUrl || (item.images && item.images[0]);
              const title = item.title || item.name;
              const locationStr = item.neighborhood || item.location || item.storeLocation || item.address;
              const subStr = kind === 'event' ? item.date : (item.price || item.discount);

              const handleItemClick = () => {
                onClose();
                if (kind === 'spot') onOpenSpot(item);
                else if (kind === 'experience') onOpenExperience(item);
                else if (kind === 'event') onOpenEvent(item);
                else if (kind === 'thrift' && onOpenThrift) onOpenThrift(item);
                else if (kind === 'offer' && onOpenOffer) onOpenOffer(item);
                else if (kind === 'offer') onOpenSpot(spots[0]);
              };

              return (
                <div
                  key={`${kind}-${item.id}`}
                  onClick={handleItemClick}
                  className="bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:border-[#E0533C] transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 border border-slate-200 dark:border-slate-700"
                      style={{ backgroundImage: `url('${imgUrl}')` }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {kind}
                        </span>
                        {item.rating && (
                          <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                            ★ {item.rating}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-[#E0533C] transition">
                        {title}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        {locationStr} {subStr ? `• ${subStr}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(item, kind);
                        showToast(`Removed "${title}" from saved moves.`);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#E0533C] transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
