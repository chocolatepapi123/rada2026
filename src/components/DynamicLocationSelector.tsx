import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Bus, 
  Fuel, 
  Building2, 
  Navigation, 
  Plus, 
  Check, 
  X,
  Compass
} from 'lucide-react';
import { NairobiLocationItem, searchNairobiLocations, fetchMapDrivenLocations } from '../data/nairobiLocations.ts';

interface DynamicLocationSelectorProps {
  value: string;
  onChange: (newLocation: string, isGps?: boolean) => void;
  placeholder?: string;
  label?: string;
  isModalMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  showGpsReset?: boolean;
  onResetGps?: () => void;
  className?: string;
}

export const DynamicLocationSelector: React.FC<DynamicLocationSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Search place, stage, mall, or town in Kenya...',
  label,
  isModalMode = false,
  isOpen = true,
  onClose,
  showGpsReset = false,
  onResetGps,
  className = ''
}) => {
  const [searchInput, setSearchInput] = useState(value || '');
  const [searchResults, setSearchResults] = useState<NairobiLocationItem[]>(() => searchNairobiLocations(value || ''));
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchInput(value || '');
  }, [value]);

  // Live map-driven auto-suggestions with debounce
  useEffect(() => {
    // Instant local results
    const instant = searchNairobiLocations(searchInput);
    setSearchResults(instant);

    if (!searchInput.trim() || searchInput.trim().length < 2) {
      setIsLoadingMap(false);
      return;
    }

    setIsLoadingMap(true);
    const timer = setTimeout(async () => {
      try {
        const liveResults = await fetchMapDrivenLocations(searchInput);
        setSearchResults(liveResults);
      } finally {
        setIsLoadingMap(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (isModalMode && isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isModalMode, isOpen]);

  // Click outside listener for inline dropdown
  useEffect(() => {
    if (isModalMode) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalMode]);

  const handleSelectLocation = (locStr: string) => {
    setSearchInput(locStr);
    onChange(locStr, false);
    setIsDropdownOpen(false);
    if (onClose) onClose();
  };

  const handleCustomSubmit = () => {
    const trimmed = searchInput.trim();
    if (trimmed) {
      onChange(trimmed, false);
      setIsDropdownOpen(false);
      if (onClose) onClose();
    }
  };

  const getIconForType = (type: NairobiLocationItem['type']) => {
    switch (type) {
      case 'bus_stop':
        return <Bus className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'petrol_station':
        return <Fuel className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'mall':
        return <Building2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />;
    }
  };

  const quickPills = [
    'Westlands, Nairobi',
    'Kilimani, Nairobi',
    'Roysambu, TRM',
    'Karen, Nairobi',
    'CBD, Nairobi',
    'Kiambu Town',
    'Mombasa, Nyali',
    'Diani Beach',
    'Kisumu CBD',
    'Nakuru Town'
  ];

  const content = (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCustomSubmit();
            }
            if (e.key === 'Escape') {
              setIsDropdownOpen(false);
              if (onClose) onClose();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-[#F8F8F6] dark:bg-[#121113] border-2 border-slate-200 dark:border-slate-800 focus:border-[#E0533C] dark:focus:border-[#E0533C] rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition shadow-inner"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Select Popular Neighborhoods */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#E0533C]" />
          Quick:
        </span>
        {quickPills.map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => handleSelectLocation(pill)}
            className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 font-semibold border transition cursor-pointer ${
              value === pill
                ? 'bg-[#E0533C] text-white border-[#E0533C]'
                : 'bg-white dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {pill.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Live Auto-complete Results List */}
      <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60 rounded-2xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
        {/* Free-form typed custom option (Always accessible) */}
        {searchInput.trim().length > 0 && (
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="w-full text-left p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center justify-between text-xs font-bold text-[#E0533C] transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-[#E0533C] flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-slate-900 dark:text-slate-100 font-extrabold">Use custom location: </span>
                <span className="text-[#E0533C] underline">"{searchInput.trim()}"</span>
              </div>
            </div>
            <span className="text-[10px] bg-[#E0533C] text-white px-2 py-0.5 rounded-full shrink-0 font-extrabold ml-2">
              Select
            </span>
          </button>
        )}

        {/* Dynamic Suggested Landmarks, Bus Stops & Hubs */}
        {searchResults.length > 0 ? (
          searchResults.map((item, idx) => {
            const formattedName = `${item.name}, ${item.neighborhood}`;
            const isSelected = value.toLowerCase() === formattedName.toLowerCase() || value.toLowerCase() === item.name.toLowerCase();
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectLocation(formattedName)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer group ${
                  isSelected
                    ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                    {getIconForType(item.type)}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-[#E0533C] transition">
                        {item.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                        {item.neighborhood}
                      </span>
                    </div>
                    {item.stageOrLandmark && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                        📍 {item.stageOrLandmark}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <Check className="w-4 h-4 text-[#E0533C] shrink-0 ml-2" />
                ) : (
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 font-semibold ml-2">
                    Pick
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-slate-500">No exact preset matching "{searchInput}"</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Press Enter or click "Use custom location" above to save your custom entry.
            </p>
          </div>
        )}
      </div>

      {/* GPS Reset Option */}
      {showGpsReset && onResetGps && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Need live device coordinates?</span>
          <button
            type="button"
            onClick={() => {
              onResetGps();
              if (onClose) onClose();
            }}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Reset to Device GPS</span>
          </button>
        </div>
      )}
    </div>
  );

  // If used in Full Modal View
  if (isModalMode) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E0533C] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{label || 'Select Location (Kenya)'}</span>
                  {isLoadingMap && <span className="text-[9px] text-[#E0533C] font-semibold bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">Searching maps...</span>}
                </h3>
                <p className="text-[10px] text-slate-400">Search sub-locations, landmarks, bus stops or type custom</p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {content}
        </div>
      </div>
    );
  }

  // Inline / Dropdown Mode
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Input / Search Field */}
      <div className="relative">
        <MapPin className="w-4 h-4 text-[#E0533C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs sm:text-sm bg-[#FBFBF9] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-3 font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E0533C]"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setIsDropdownOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Auto-complete Popup */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {content}
        </div>
      )}
    </div>
  );
};
