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
  Moon
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

  onOpenAdmin?: () => void;
  userRole?: 'user' | 'merchant' | 'admin';
  onLogout?: () => void;
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
  onOpenAdmin,
  userRole,
  onLogout
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
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            onClick={() => onSwitchTab('home')} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition focus:outline-none shrink-0"
            title="RADA Home"
          >
            <div className="w-7 h-7 rounded-lg bg-[#E0533C] text-white flex items-center justify-center shadow-xs shrink-0">
              <svg viewBox="0 0 100 130" className="w-4.5 h-4.5 fill-none stroke-white" strokeLinejoin="round">
                <path d="M50 6 C26 6 10 26 10 50 C10 76 45 116 48.5 120 C49.3 121 50.7 121 51.5 120 C55 116 90 76 90 50 C90 26 74 6 50 6 Z" strokeWidth="8" />
                <path d="M22 35 C15 45 16 58 25 74 C34 90 46 106 50 112" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="48" r="17" strokeWidth="8" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tighter text-[#E0533C]">
              RADA
            </span>
          </button>

          {/* Dynamic Detected Current Location (Clean badge without green glowing ping) */}
          <div 
            className="text-xs bg-[#F8F8F6] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 select-none max-w-[190px] cursor-default shadow-2xs"
            title={`Location: ${currentLocation}`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E05328]" />
            <span className="truncate text-[11px] font-bold">{currentLocation}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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

                {/* Theme Mode Option (Moved exclusively to menu/settings) */}
                <button
                  onClick={() => {
                    onToggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 transition"
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

                {onLogout && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
