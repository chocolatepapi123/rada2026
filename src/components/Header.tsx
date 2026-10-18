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
  Bookmark,
  LogIn
} from 'lucide-react';

interface HeaderProps {
  onOpenOverlay: (overlayId: string) => void;
  onOpenWagwanAI: () => void;
  onSwitchTab: (tabId: string) => void;
  currentLocation: string;
  isGpsActive?: boolean;
  onUpdateLocation?: (newLocation: string, isGps: boolean) => void;
  hasBusinessAccount: boolean;
  businessName?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isGuestMode?: boolean;
  onOpenAuth?: () => void;

  onOpenAdmin?: () => void;
  userRole?: 'user' | 'merchant' | 'admin';
  onLogout?: () => void;
  onOpenSaved?: () => void;
  savedCount?: number;
  onOpenAccountSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOverlay,
  onOpenWagwanAI,
  onSwitchTab,
  currentLocation,
  isGpsActive = true,
  hasBusinessAccount,
  businessName,
  isDarkMode,
  onToggleTheme,
  isGuestMode,
  onOpenAuth,
  onOpenAdmin,
  userRole,
  onLogout,
  onOpenSaved,
  savedCount,
  onOpenAccountSettings
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-lg mx-auto w-full px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 flex-nowrap">
        {/* Left Side: Brand Logo & Truncated Location Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <button 
            type="button"
            onClick={() => onSwitchTab('home')} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all focus:outline-none shrink-0"
            title="RADA Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#E0533C] text-white flex items-center justify-center shadow-xs shrink-0">
              <svg viewBox="0 0 100 130" className="w-4.5 h-4.5 fill-none stroke-white" strokeLinejoin="round">
                <path d="M50 6 C26 6 10 26 10 50 C10 76 45 116 48.5 120 C49.3 121 50.7 121 51.5 120 C55 116 90 76 90 50 C90 26 74 6 50 6 Z" strokeWidth="8" />
                <path d="M22 35 C15 45 16 58 25 74 C34 90 46 106 50 112" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="48" r="17" strokeWidth="8" />
              </svg>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#E0533C] shrink-0">
              RADA
            </span>
          </button>

          {/* Dynamic Detected Current Location (Gracefully shrinks and truncates without collision) */}
          <div 
            className="min-w-0 shrink text-xs bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 sm:gap-1.5 border border-slate-200 dark:border-slate-800 select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] cursor-default shadow-2xs overflow-hidden"
            title={`Location: ${currentLocation}`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E05328]" />
            <span className="truncate text-[10px] sm:text-[11px] font-bold min-w-0">{currentLocation}</span>
          </div>
        </div>

        {/* Right Side: Sign In Button (Guest Mode) + Wagwan AI + 3-Dot Overflow Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Guest Mode: Compact circular icon button matching size & style of other header icons with hover tooltip */}
          {isGuestMode && onOpenAuth && (
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-amber-500/40 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                aria-label="Sign In"
                title="Sign In"
              >
                <LogIn className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
              </button>
              {/* Tooltip on hover/active */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50">
                <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">
                  Sign In
                </div>
              </div>
            </div>
          )}

          {/* Wagwan AI Quick Recommender */}
          <button
            type="button"
            onClick={onOpenWagwanAI}
            title="Wagwan AI Hangout Recommender"
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-gradient-to-r from-[#E0533C] to-[#E9C46A] text-white flex items-center justify-center text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-transform focus:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* 3-Dot Overflow Menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full bg-[#F8F8F6] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 focus:outline-none"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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

                {/* Prominent Saved Items */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (onOpenSaved) {
                      onOpenSaved();
                    } else {
                      handleMenuClick('savedOverlay');
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-orange-50/80 dark:hover:bg-orange-950/20 flex items-center justify-between text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Bookmark className="w-4 h-4 text-[#E0533C] fill-[#E0533C]/20 group-hover:fill-[#E0533C] transition" />
                    <span>Saved Items</span>
                  </div>
                  {savedCount !== undefined && savedCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E0533C]/10 text-[#E0533C]">
                      {savedCount}
                    </span>
                  )}
                </button>

                {/* Profile */}
                <button
                  onClick={() => handleMenuClick('profileOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                >
                  <IdCard className="w-4 h-4 text-[#E0533C]" />
                  <span>Profile</span>
                </button>

                {/* Settings & Appearance */}
                <button
                  onClick={() => handleMenuClick('settingsOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#2D6A4F]" />
                  <span>Settings</span>
                </button>

                {/* Theme Mode Option (Moved exclusively to menu/settings) */}
                <button
                  onClick={() => {
                    onToggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span>Theme: {isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Toggle
                  </span>
                </button>

                {/* Account & Security */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (onOpenAccountSettings) {
                      onOpenAccountSettings();
                    } else {
                      handleMenuClick('youOverlay');
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
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
                {userRole === 'admin' && onOpenAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-3 text-purple-700 dark:text-purple-300 border-t border-slate-100 dark:border-slate-800/80 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                {isGuestMode && onOpenAuth ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-3 text-amber-600 dark:text-amber-400 border-t border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    <span>Log In / Sign Up</span>
                  </button>
                ) : (
                  onLogout && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-3 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-800/80 transition"
                    >
                      <span className="text-base">↪</span>
                      <span>Log Out</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
