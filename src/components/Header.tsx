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

  const singleLocality = React.useMemo(() => {
    if (!currentLocation || typeof currentLocation !== 'string') return '';
    const trimmed = currentLocation.trim();
    if (!trimmed) return '';
    const area = trimmed.split(',')[0]?.trim();
    return area || '';
  }, [currentLocation]);

  return (
    <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-xs transition-colors duration-700 ease-in-out">
      <div className="max-w-lg mx-auto w-full px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 flex-nowrap">
        {/* Left Side: Brand Logo & Truncated Location Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <button 
            type="button"
            onClick={() => onSwitchTab('home')} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all focus:outline-none shrink-0"
            title="RADA Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#FF5733] text-white flex items-center justify-center shadow-xs shrink-0">
              <svg viewBox="0 0 100 130" className="w-4.5 h-4.5 fill-none stroke-white" strokeLinejoin="round">
                <path d="M50 6 C26 6 10 26 10 50 C10 76 45 116 48.5 120 C49.3 121 50.7 121 51.5 120 C55 116 90 76 90 50 C90 26 74 6 50 6 Z" strokeWidth="8" />
                <path d="M22 35 C15 45 16 58 25 74 C34 90 46 106 50 112" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="48" r="17" strokeWidth="8" />
              </svg>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#FF5733] shrink-0">
              RADA
            </span>
          </button>

          {/* Dynamic Detected Current Location: ONLY single locality name, hidden if unavailable or null */}
          {singleLocality && (
            <div 
              className="min-w-0 shrink text-xs bg-black/50 text-slate-200 font-semibold px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 sm:gap-1.5 border border-white/10 select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] cursor-default shadow-2xs overflow-hidden backdrop-blur-md"
              title={`Location: ${singleLocality}`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#FF5733]" />
              <span className="truncate text-[10px] sm:text-[11px] font-bold min-w-0">{singleLocality}</span>
            </div>
          )}
        </div>

        {/* Right Side: Sign In Button (Guest Mode) + Wagwan AI + 3-Dot Overflow Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Guest Mode: Compact circular icon button matching size & style of other header icons with hover tooltip */}
          {isGuestMode && onOpenAuth && (
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full bg-black/50 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30 backdrop-blur-md"
                aria-label="Sign In"
                title="Sign In"
              >
                <LogIn className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
              </button>
              {/* Tooltip on hover/active */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50">
                <div className="bg-black/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap border border-white/10">
                  Sign In
                </div>
              </div>
            </div>
          )}

          {/* Wagwan AI Quick Recommender: Styled in Violet-to-Coral Gradient */}
          <button
            type="button"
            onClick={onOpenWagwanAI}
            title="Wagwan AI Hangout Recommender"
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-gradient-to-r from-[#8B5CF6] via-purple-600 to-[#FF5733] text-white flex items-center justify-center text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-transform focus:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* 3-Dot Overflow Menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full bg-black/50 border border-white/10 hover:bg-white/10 transition-colors text-slate-200 focus:outline-none backdrop-blur-md"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-[#0A1128]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
                {/* PRIMARY PROMINENT OPTION: Business & Merchant Hub */}
                <button
                  onClick={() => handleMenuClick('businessHub')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/10 flex items-start gap-3 text-white border-b border-white/10 group transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF5733] to-[#FF6B4A] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#FF5733]">Business & Merchant Hub</span>
                      <span className="text-[9px] bg-red-950/80 text-[#FF5733] border border-[#FF5733]/30 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Merchant
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">
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
                  className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-white/10 flex items-center justify-between text-slate-200 border-b border-white/10 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Bookmark className="w-4 h-4 text-[#FF5733] fill-[#FF5733]/20 group-hover:fill-[#FF5733] transition" />
                    <span>Saved Items</span>
                  </div>
                  {savedCount !== undefined && savedCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FF5733]/10 text-[#FF5733]">
                      {savedCount}
                    </span>
                  )}
                </button>

                {/* Profile */}
                <button
                  onClick={() => handleMenuClick('profileOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 flex items-center gap-3 text-slate-200 border-b border-white/10 transition cursor-pointer"
                >
                  <IdCard className="w-4 h-4 text-[#FF5733]" />
                  <span>Profile</span>
                </button>

                {/* Settings & Appearance */}
                <button
                  onClick={() => handleMenuClick('settingsOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 flex items-center gap-3 text-slate-200 border-b border-white/10 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Settings</span>
                </button>

                {/* Theme Mode Option (Moved exclusively to menu/settings) */}
                <button
                  onClick={() => {
                    onToggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 flex items-center justify-between text-slate-200 border-b border-white/10 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span>Theme: {isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
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
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 flex items-center gap-3 text-slate-200 border-b border-white/10 transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Account & Security</span>
                </button>

                {/* Emergency & SOS */}
                <button
                  onClick={() => handleMenuClick('sosOverlay')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 flex items-center gap-3 text-red-400 transition"
                >
                  <ShieldAlert className="w-4 h-4 text-[#FF5733]" />
                  <span>Emergency & SOS Hub</span>
                </button>
                {userRole === 'admin' && onOpenAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-purple-950/40 flex items-center gap-3 text-purple-300 border-t border-white/10 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                {isGuestMode && onOpenAuth ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-amber-950/40 flex items-center gap-3 text-amber-400 border-t border-white/10 transition cursor-pointer"
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
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-red-950/40 flex items-center gap-3 text-red-400 border-t border-white/10 transition"
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
