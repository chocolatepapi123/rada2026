import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, X, Check, Plus } from 'lucide-react';
import { SpotItem } from '../types.ts';
import { searchNairobiLocations } from '../data/nairobiLocations.ts';

interface LocationComboboxProps {
  value: string;
  onChange: (val: string) => void;
  spots?: SpotItem[];
  placeholder?: string;
  label?: string;
  allowAll?: boolean;
  showSelectedChip?: boolean;
  className?: string;
}

export const LocationCombobox: React.FC<LocationComboboxProps> = ({
  value,
  onChange,
  spots = [],
  placeholder = 'Search exact location or neighborhood...',
  label,
  allowAll = false,
  showSelectedChip = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value === 'all' ? '' : (value || ''));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value === 'all' || !value) {
      setQuery('');
    } else {
      setQuery(value);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggregate suggestions from existing spots + nairobiLocationsData
  const suggestions = useMemo(() => {
    const spotNeighborhoods = spots
      .map(s => s.neighborhood?.trim())
      .filter((n): n is string => Boolean(n && n.length > 0));

    const POPULAR_AREAS = [
      'Westlands', 'Kilimani', 'Karen', 'CBD', 'Lavington',
      'Kileleshwa', 'Gigiri', 'Parklands', 'Ngong Road', 'Thika Road', 'Ruaka'
    ];

    if (!query.trim()) {
      return Array.from(new Set([...POPULAR_AREAS, ...spotNeighborhoods])).slice(0, 10);
    }

    const nairobiPlaces: string[] = [];
    for (const item of searchNairobiLocations(query)) {
      if (item.name) nairobiPlaces.push(item.name);
      if (item.neighborhood) nairobiPlaces.push(item.neighborhood);
    }

    const combined = Array.from(new Set([...spotNeighborhoods, ...nairobiPlaces]));
    const q = query.toLowerCase();
    return combined
      .filter(item => item.toLowerCase().includes(q))
      .slice(0, 15);
  }, [spots, query]);

  const handleSelect = (selectedVal: string) => {
    onChange(selectedVal);
    setQuery(selectedVal);
    setIsOpen(false);
  };

  const handleClear = () => {
    const resetVal = allowAll ? 'all' : '';
    onChange(resetVal);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const isSelected = Boolean(value && value !== 'all');

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Combobox Search Input */}
      <div className="relative flex items-center">
        <MapPin className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68] absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const newVal = e.target.value;
            setQuery(newVal);
            setIsOpen(true);
            if (!newVal.trim() && allowAll) {
              onChange('all');
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (query.trim()) {
                handleSelect(query.trim());
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0533C] dark:focus:ring-[#D17A68]"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected Location Chip with clear 'x' */}
      {showSelectedChip && isSelected && (
        <div className="flex items-center gap-1.5 bg-[#E0533C]/10 dark:bg-[#A94F3E]/10 border border-[#E0533C]/30 dark:border-[#D17A68]/30 text-[#E0533C] dark:text-[#D17A68] px-3 py-1 rounded-full text-xs font-bold w-fit animate-in fade-in duration-150">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[200px]">{value}</span>
          <button
            type="button"
            onClick={handleClear}
            className="hover:bg-[#E0533C]/20 dark:hover:bg-[#A94F3E]/20 p-0.5 rounded-full transition ml-0.5"
            title="Clear location"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Suggestions Dropdown */}
      {isOpen && (suggestions.length > 0 || query.trim().length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          {/* Free-typed custom location option */}
          {query.trim().length > 0 && !suggestions.some(s => s.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleSelect(query.trim())}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-[#E0533C] dark:text-[#D17A68] bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Use custom location: "{query.trim()}"</span>
              </div>
              <span className="text-[10px] bg-[#E0533C] dark:bg-[#A94F3E] text-white px-2 py-0.5 rounded-full shrink-0 font-extrabold ml-1">
                Select
              </span>
            </button>
          )}

          {/* Suggestions List */}
          {suggestions.map((loc) => {
            const isItemActive = value.toLowerCase() === loc.toLowerCase();
            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isItemActive
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-[#E0533C] dark:text-[#D17A68] font-bold border border-orange-200 dark:border-orange-900/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{loc}</span>
                </div>
                {isItemActive && <Check className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68] shrink-0 ml-1" />}
              </button>
            );
          })}

        </div>
      )}
    </div>
  );
};
