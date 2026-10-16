import React, { useState } from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Shirt,
  UtensilsCrossed,
  Tag,
  Star
} from 'lucide-react';
import { SpotItem, ExperienceItem, EventItem, ThriftItem, BusinessOffer, SavedItem } from '../types.ts';

interface SavedMovesModalProps {
  isOpen: boolean;
  savedItems: SavedItem[];
  spots: SpotItem[];
  experiences: ExperienceItem[];
  events: EventItem[];
  thriftItems: ThriftItem[];
  offers: BusinessOffer[];
  onRemoveSaved: (id: string | number, kind: string) => void;
  onOpenSpotDetails: (spot: SpotItem) => void;
  onOpenExperienceDetails: (exp: ExperienceItem) => void;
  onOpenEventDetails: (event: EventItem) => void;
  onOpenThriftDetails?: (item: ThriftItem) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const SavedMovesModal: React.FC<SavedMovesModalProps> = ({
  isOpen,
  savedItems,
  spots,
  experiences,
  events,
  thriftItems,
  offers,
  onRemoveSaved,
  onOpenSpotDetails,
  onOpenExperienceDetails,
  onOpenEventDetails,
  onOpenThriftDetails,
  onClose,
  showToast
}) => {
  const [filterKind, setFilterKind] = useState<'all' | 'spot' | 'experience' | 'event' | 'thrift'>('all');

  if (!isOpen) return null;

  // Resolve saved items to full objects
  const resolvedList = savedItems.map(item => {
    if (item.kind === 'spot') {
      const found = spots.find(s => String(s.id) === String(item.id));
      return found ? { kind: 'spot' as const, data: found, savedAt: item.savedAt } : null;
    }
    if (item.kind === 'experience') {
      const found = experiences.find(e => String(e.id) === String(item.id));
      return found ? { kind: 'experience' as const, data: found, savedAt: item.savedAt } : null;
    }
    if (item.kind === 'event') {
      const found = events.find(e => String(e.id) === String(item.id));
      return found ? { kind: 'event' as const, data: found, savedAt: item.savedAt } : null;
    }
    if (item.kind === 'thrift') {
      const found = thriftItems.find(t => String(t.id) === String(item.id));
      return found ? { kind: 'thrift' as const, data: found, savedAt: item.savedAt } : null;
    }
    return null;
  }).filter(Boolean) as { kind: 'spot' | 'experience' | 'event' | 'thrift'; data: any; savedAt: string }[];

  const filtered = filterKind === 'all' 
    ? resolvedList 
    : resolvedList.filter(item => item.kind === filterKind);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center font-bold">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Saved Moves & Places
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {resolvedList.length} bookmarks saved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="max-w-lg mx-auto px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-xs">
          {[
            { id: 'all', label: `All (${resolvedList.length})` },
            { id: 'spot', label: `Places (${resolvedList.filter(i => i.kind === 'spot').length})` },
            { id: 'experience', label: `Experiences (${resolvedList.filter(i => i.kind === 'experience').length})` },
            { id: 'event', label: `Events (${resolvedList.filter(i => i.kind === 'event').length})` },
            { id: 'thrift', label: `Luku Fits (${resolvedList.filter(i => i.kind === 'thrift').length})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterKind(f.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition whitespace-nowrap ${
                filterKind === f.id
                  ? 'bg-[#E0533C] text-white shadow-xs'
                  : 'bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div className="max-w-lg mx-auto w-full p-4 space-y-3 flex-1 text-xs pb-24">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Bookmark className="w-6 h-6" />
            </div>
            <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
              No saved moves yet
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tap the bookmark icon on any Place, Experience, Event, or Luku thrift fit to save it here for quick access!
            </p>
          </div>
        ) : (
          filtered.map(({ kind, data }) => (
            <div
              key={`${kind}-${data.id}`}
              className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center gap-3 transition hover:shadow-md"
            >
              <img
                src={data.img || data.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop'}
                alt={data.title || data.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-pointer"
                onClick={() => {
                  onClose();
                  if (kind === 'spot') onOpenSpotDetails(data);
                  else if (kind === 'experience') onOpenExperienceDetails(data);
                  else if (kind === 'event') onOpenEventDetails(data);
                  else if (kind === 'thrift' && onOpenThriftDetails) onOpenThriftDetails(data);
                }}
              />

              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  onClose();
                  if (kind === 'spot') onOpenSpotDetails(data);
                  else if (kind === 'experience') onOpenExperienceDetails(data);
                  else if (kind === 'event') onOpenEventDetails(data);
                  else if (kind === 'thrift' && onOpenThriftDetails) onOpenThriftDetails(data);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#E0533C]">
                    {kind === 'spot' ? 'Place' : kind === 'experience' ? 'Experience' : kind === 'event' ? 'Event' : 'Luku'}
                  </span>
                  {data.rating && (
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {data.rating}
                    </span>
                  )}
                </div>

                <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {data.title || data.name}
                </h4>

                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                  <span>{data.neighborhood || data.location || data.storeLocation || 'Nairobi'}</span>
                  {data.price && <span className="font-bold text-slate-700 dark:text-slate-300">· {data.price}</span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    onRemoveSaved(data.id, kind);
                    showToast('Removed from saved moves');
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Remove Bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (kind === 'spot') onOpenSpotDetails(data);
                    else if (kind === 'experience') onOpenExperienceDetails(data);
                    else if (kind === 'event') onOpenEventDetails(data);
                    else if (kind === 'thrift' && onOpenThriftDetails) onOpenThriftDetails(data);
                  }}
                  className="p-2 text-[#E0533C] hover:text-orange-600 transition"
                  title="View Details"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
