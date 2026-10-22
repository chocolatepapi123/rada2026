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
  Sparkles,
  FolderPlus,
  Folder,
  ChevronDown,
  Plus,
  Check,
  Compass,
  UtensilsCrossed,
  Trees
} from 'lucide-react';
import { 
  SavedItem, 
  SpotItem, 
  EventItem, 
  BusinessOffer,
  CollectionFolder
} from '../types.ts';

export type SavedCategoryFilter = 'all' | 'places' | 'experiences' | 'events' | 'deals';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedItem[];
  savedFolders?: CollectionFolder[];
  spots: SpotItem[];
  events: EventItem[];
  offers?: BusinessOffer[];
  onToggleSave: (item: any, kind: 'spot' | 'event' | 'offer' | 'thrift') => void;
  onOpenSpot: (spot: SpotItem) => void;
  onOpenEvent: (event: EventItem) => void;
  onOpenOffer?: (offer: BusinessOffer) => void;
  onCreateFolder?: (name: string, emoji?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onAssignItemFolder?: (itemId: string | number, kind: string, folderId: string | undefined) => void;
  showToast: (msg: string) => void;
}

const EMOJI_OPTIONS = ['🎂', '☕', '✨', '🌴', '🍕', '🎵', '🛍️', '🏕️', '🎨', '💃', '🚗', '🥂'];

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  savedItems,
  savedFolders = [],
  spots,
  events,
  offers = [],
  onToggleSave,
  onOpenSpot,
  onOpenEvent,
  onOpenOffer,
  onCreateFolder,
  onDeleteFolder,
  onAssignItemFolder,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<SavedCategoryFilter>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Folder Creation UI State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('✨');

  // Active Dropdown for assigning an item to a folder
  const [activeFolderMenuForItemId, setActiveFolderMenuForItemId] = useState<string | null>(null);

  // Hydrate saved items with full details
  const hydratedItems = useMemo(() => {
    return savedItems.map(saved => {
      let data: any = null;
      let calculatedCategory: 'places' | 'experiences' | 'events' | 'deals' = 'places';

      if (saved.kind === 'spot') {
        const spot = spots.find(s => 
          String(s.id) === String(saved.id) ||
          (String(s.id).replace(/^unclaimed-/, '') === String(saved.id).replace(/^unclaimed-/, ''))
        );
        if (spot) {
          data = spot;
          const expCats = ['nature', 'creative_leisure', 'tech_gaming', 'action_sports', 'vacation_escapes', 'outdoors', 'social_activities', 'activities', 'vacation'];
          if (expCats.includes(spot.category)) {
            calculatedCategory = 'experiences';
          } else {
            calculatedCategory = 'places';
          }
        }
      } else if (saved.kind === 'event') {
        data = events.find(e => String(e.id) === String(saved.id));
        calculatedCategory = 'events';
      } else if (saved.kind === 'offer' || (saved as any).kind === 'thrift') {
        data = offers.find(o => String(o.id) === String(saved.id));
        calculatedCategory = 'deals';
      }

      const assignedFolder = savedFolders.find(f => f.id === saved.folderId);

      return {
        ...saved,
        data,
        calculatedCategory,
        assignedFolder
      };
    }).filter(item => item.data !== null);
  }, [savedItems, savedFolders, spots, events, offers]);

  // Filtered items by category, folder, and search query
  const filteredItems = useMemo(() => {
    let result = hydratedItems;

    // Filter by Tab: [All, Places, Experiences, Events, Deals]
    if (activeTab !== 'all') {
      result = result.filter(item => item.calculatedCategory === activeTab);
    }

    // Filter by Folder
    if (selectedFolderId !== 'all') {
      result = result.filter(item => item.folderId === selectedFolderId);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const title = item.data?.title || item.data?.name || '';
        const desc = item.data?.neighborhood || item.data?.location || item.data?.category || item.data?.description || '';
        return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      });
    }

    return result;
  }, [hydratedItems, activeTab, selectedFolderId, searchQuery]);

  const counts = {
    all: hydratedItems.length,
    places: hydratedItems.filter(i => i.calculatedCategory === 'places').length,
    experiences: hydratedItems.filter(i => i.calculatedCategory === 'experiences').length,
    events: hydratedItems.filter(i => i.calculatedCategory === 'events').length,
    deals: hydratedItems.filter(i => i.calculatedCategory === 'deals').length,
  };

  const handleCardClick = (item: any) => {
    if (item.kind === 'spot') {
      onOpenSpot(item.data);
      onClose();
    } else if (item.kind === 'event') {
      onOpenEvent(item.data);
      onClose();
    } else if (item.kind === 'offer') {
      if (onOpenOffer) {
        onOpenOffer(item.data);
        onClose();
      } else {
        showToast(`Offer: "${item.data.title}" (${item.data.discount || 'Special Deal'})`);
      }
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      showToast('Please enter a folder name.');
      return;
    }
    if (onCreateFolder) {
      onCreateFolder(newFolderName.trim(), newFolderEmoji);
      showToast(`Created folder "${newFolderEmoji} ${newFolderName.trim()}"!`);
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={() => {
          setActiveFolderMenuForItemId(null);
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#E0533C] flex items-center justify-center shadow-xs">
              <Bookmark className="w-5 h-5 fill-[#E0533C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Saved & Collections</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E0533C]/10 text-[#E0533C]">
                  {counts.all} saved
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Organize your bookmarked spots, experiences, fits & tickets into custom folders
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

        {/* Search, Categorized Filter Tabs, and Custom Collection Folders */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-[#F8F8F6] dark:bg-[#121113]">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search saved spots, outdoor activities, events, or fits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Categorized Filter Tabs: [All, Places, Experiences, Events, Deals] */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'places', label: 'Places', count: counts.places },
              { id: 'experiences', label: 'Experiences', count: counts.experiences },
              { id: 'events', label: 'Events', count: counts.events },
              { id: 'deals', label: 'Deals', count: counts.deals },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SavedCategoryFilter)}
                className={`text-[11px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  activeTab === tab.id
                    ? 'bg-[#E0533C] text-white'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Collection Folders Bar */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Folder className="w-3 h-3 text-amber-500" />
                <span>Custom Folders ({savedFolders.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(prev => !prev)}
                className="text-[10px] font-bold text-[#E0533C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isCreatingFolder ? 'Cancel' : 'New Folder'}</span>
              </button>
            </div>

            {/* Folder Creation Form */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolderSubmit} className="p-2.5 bg-white dark:bg-[#1C1A1E] border border-orange-200 dark:border-orange-950/60 rounded-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="text-lg p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 inline-block border border-orange-200 dark:border-orange-900">
                      {newFolderEmoji}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Birthday Move, Sunday Chill, Date Ideas"
                    className="flex-1 px-3 py-1.5 text-xs bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#E0533C]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#E0533C] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-orange-700 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>

                {/* Quick Emoji Picker */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Icon:</span>
                  {EMOJI_OPTIONS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewFolderEmoji(em)}
                      className={`text-sm p-1 rounded-md transition ${newFolderEmoji === em ? 'bg-orange-100 dark:bg-orange-950 ring-2 ring-[#E0533C]' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </form>
            )}

            {/* Folder Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedFolderId('all')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  selectedFolderId === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold'
                    : 'bg-white dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Folders
              </button>

              {savedFolders.map(folder => {
                const count = hydratedItems.filter(i => i.folderId === folder.id).length;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                      selectedFolderId === folder.id
                        ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                        : 'bg-white dark:bg-[#1C1A1E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-amber-400'
                    }`}
                  >
                    <span>{folder.emoji || '📁'}</span>
                    <span>{folder.name}</span>
                    <span className="opacity-75 text-[9px]">({count})</span>
                  </button>
                );
              })}
            </div>
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
                {searchQuery 
                  ? 'No saved items match your search' 
                  : selectedFolderId !== 'all' 
                    ? 'This collection folder is currently empty' 
                    : 'No items saved in this category yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tap the bookmark icon on any Nairobi spot, outdoor activity, concert pass, or promo deal to save it.
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const d = item.data;
              const title = d.title || d.name || 'Untitled Item';
              const img = d.image || d.imageUrl || d.images?.[0] || d.coverImage || d.posterUrl || d.img || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
              const locationStr = d.neighborhood || d.location || d.address || 'Nairobi';
              const tagStr = d.category || (item.kind === 'event' ? 'Concert / Rave' : 'Promotion');
              const itemKey = `${item.kind}-${item.id}`;
              const isMenuOpen = activeFolderMenuForItemId === itemKey;

              return (
                <div
                  key={itemKey}
                  className="bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-[#E0533C]/40 transition shadow-2xs cursor-pointer relative"
                  onClick={() => handleCardClick(item)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={img}
                      alt={title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category badge */}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.calculatedCategory === 'places' 
                            ? 'bg-orange-500/10 text-[#E0533C]' 
                            : item.calculatedCategory === 'experiences'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : item.calculatedCategory === 'events'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.calculatedCategory}
                        </span>

                        {/* Folder assignment label */}
                        {item.assignedFolder && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                            {item.assignedFolder.emoji || '📁'} {item.assignedFolder.name}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 truncate">{tagStr}</span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate mt-1">
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

                  {/* Actions: Organize Folder, 1-tap Unbookmark, and Direct Detail Launcher */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                    {/* Folder Assignment Button & Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveFolderMenuForItemId(isMenuOpen ? null : itemKey)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                          item.assignedFolder
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300/60'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                        title="Organize into folder"
                      >
                        <Folder className="w-3 h-3 text-amber-500" />
                        <span className="max-w-[70px] truncate">{item.assignedFolder ? item.assignedFolder.name : 'Folder'}</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-48 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                            Assign to Collection:
                          </p>
                          
                          {/* Remove from folder option */}
                          {item.folderId && (
                            <button
                              type="button"
                              onClick={() => {
                                onAssignItemFolder?.(item.id, item.kind, undefined);
                                setActiveFolderMenuForItemId(null);
                                showToast('Removed from collection folder.');
                              }}
                              className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center justify-between"
                            >
                              <span>Remove from folder</span>
                              <X className="w-3 h-3" />
                            </button>
                          )}

                          {savedFolders.map(folder => (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => {
                                onAssignItemFolder?.(item.id, item.kind, folder.id);
                                setActiveFolderMenuForItemId(null);
                                showToast(`Moved to "${folder.emoji || '📁'} ${folder.name}"!`);
                              }}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-between ${
                                item.folderId === folder.id 
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span>{folder.emoji || '📁'}</span>
                                <span className="truncate">{folder.name}</span>
                              </span>
                              {item.folderId === folder.id && <Check className="w-3 h-3 text-amber-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 1-Tap Unbookmark Action */}
                    <button
                      type="button"
                      onClick={() => onToggleSave(d, item.kind)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                      title="1-tap remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Direct Launcher to Open Detail Modal */}
                    <button
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="px-3 py-1.5 rounded-xl bg-[#E0533C] text-white hover:bg-orange-700 transition cursor-pointer shadow-xs text-xs font-bold flex items-center gap-1"
                      title="Launch details"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
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
