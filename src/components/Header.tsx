import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  Settings, 
  UserCheck, 
  Sparkles, 
  MoreVertical, 
  MapPin,
  IdCard,
  Sun,
  Moon,
  Check,
  RotateCcw,
  Navigation as NavigationIcon
} from 'lucide-react';

interface HeaderProps {
  onOpenOverlay: (overlayId: string) => void;
  onOpenWagwanAI: () => void;
  onSwitchTab: (tabId: string) => void;
  currentLocation: string;
  isGpsActive?: boolean;
  onUpdateLocation: (newLocation: string, isGps: boolean) => void;
  hasBusinessAccount: boolean;
  businessName?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOverlay,
  onOpenWagwanAI,
  onSwitchTab,
  currentLocation,
  isGpsActive = true,
  onUpdateLocation,
  hasBusinessAccount,
  businessName,
  isDarkMode,
  onToggleTheme
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(currentLocation);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocationInput(currentLocation);
  }, [currentLocation]);

  useEffect(() => {
    if (isEditingLocation && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (overlayId: string) => {
    setMenuOpen(false);
    onOpenOverlay(overlayId);
  };

  const handleSaveLocation = () => {
    const trimmed = locationInput.trim();
    if (trimmed) {
      onUpdateLocation(trimmed, false);
    }
    setIsEditingLocation(false);
  };

  const handleResetToGps = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingLocation(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onUpdateLocation('Westlands, Nairobi', true);
        },
        () => {
          onUpdateLocation('Nairobi, Kenya', true);
        },
        { timeout: 5000 }
      );
    } else {
      onUpdateLocation('Westlands, Nairobi', true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => onSwitchTab('home')} 
            className="text-2xl font-black tracking-tighter text-[#E0533C] cursor-pointer hover:opacity-90 transition focus:outline-none shrink-0"
          >
            RADA
          </button>

          {/* Interactive Location Badge: GPS by default, clickable to edit & override GPS */}
          {isEditingLocation ? (
            <div className="flex items-center gap-1 bg-[#F8F8F6] dark:bg-[#1C1A1E] border-2 border-[#E0533C] rounded-full px-2 py-0.5 animate-in fade-in zoom-in-95 duration-150">
              <MapPin className="w-3.5 h-3.5 text-[#E0533C] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLocation();
                  if (e.key === 'Escape') setIsEditingLocation(false);
                }}
                onBlur={handleSaveLocation}
                placeholder="e.g. Kilimani, Nairobi"
                className="text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 font-semibold focus:outline-none w-28 sm:w-36 truncate"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSaveLocation();
                }}
                className="w-5 h-5 rounded-full bg-[#E0533C] text-white flex items-center justify-center shrink-0"
                title="Save Location"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <button
                onClick={() => setIsEditingLocation(true)}
                title="Click to change location (Overrides GPS)"
                className="text-xs bg-[#F8F8F6] dark:bg-[#1C1A1E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 transition cursor-pointer group truncate max-w-[170px]"
              >
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${isGpsActive ? 'text-emerald-500 animate-pulse' : 'text-[#E0533C]'}`} />
                <span className="truncate">{currentLocation}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-[#E0533C] underline shrink-0 font-normal ml-0.5">
                  edit
                </span>
              </button>

              {!isGpsActive && (
                <button
                  onClick={handleResetToGps}
                  title="Reset to Device GPS Location"
                  className="w-6 h-6 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition shrink-0"
                >
                  <NavigationIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="w-9 h-9 rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:scale-105 active:scale-95 transition"
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Wagwan AI Quick Recommender */}
          <button
            onClick={onOpenWagwanAI}
            title="Wagwan AI Hangout Recommender"
            className="w-9 h-9 rounded-full bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center text-sm shadow-md hover:scale-105 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* 3-Dot Overflow Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200 focus:outline-none"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* PRIMARY PROMINENT OPTION: Business & Merchant Hub */}
                <button
                  onClick={() => handleMenuClick('businessHub')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-amber-50/70 dark:hover:bg-amber-950/30 flex items-start gap-3 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 group transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#E0533C]">Business & Merchant Hub</span>
                      <span className="text-[9px] bg-red-100 dark:bg-red-950/80 text-[#E0533C] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Merchant
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
                      {hasBusinessAccount 
                        ? `Managing: ${businessName || 'My Business'}`
                        : 'Create account, spots, events & fits'}
                    </p>
                  </div>
                </button>

                {/* Profile */}
                <button
                  onClick={() => handleMenuClick('profileOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition"
                >
                  <IdCard className="w-4 h-4 text-[#E0533C]" />
                  <span>Profile</span>
                </button>

                {/* Settings & Appearance */}
                <button
                  onClick={() => handleMenuClick('settingsOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition"
                >
                  <Settings className="w-4 h-4 text-[#2D6A4F]" />
                  <span>Settings</span>
                </button>

                {/* Account & Security */}
                <button
                  onClick={() => handleMenuClick('youOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition"
                >
                  <UserCheck className="w-4 h-4 text-[#E9C46A]" />
                  <span>Account & Security</span>
                </button>

                {/* Emergency & SOS */}
                <button
                  onClick={() => handleMenuClick('sosOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-red-600 dark:text-red-400 transition"
                >
                  <ShieldAlert className="w-4 h-4 text-[#E0533C]" />
                  <span>Emergency & SOS Hub</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
