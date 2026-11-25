import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Settings, 
  UserCheck, 
  MoreVertical, 
  MapPin,
  Crown,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  CalendarPlus
} from 'lucide-react';
import { isPlatformAdmin } from '../types';
import { useIntents } from '../lib/userIntent';
import type { ToastOptions } from './Toast.tsx';
import { MenuAccountSection } from './MenuAccountSection';

// Shared look for rows inside the 3-dot menu (big tap targets, soft rounded tiles).
const MENU_ROW =
  'w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[46px] transition cursor-pointer focus:outline-none hover:bg-white dark:hover:bg-white/[0.06] active:bg-slate-100 dark:active:bg-white/10';
const MENU_TILE = 'w-8 h-8 rounded-xl flex items-center justify-center shrink-0';
const MENU_TITLE = 'block text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100';
const MENU_SUB = 'block text-[11px] font-normal leading-snug text-slate-500 dark:text-slate-400 mt-px';
const MENU_GROUP =
  'rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 divide-y divide-slate-200/70 dark:divide-white/5';

interface HeaderProps {
  onOpenOverlay: (overlayId: string) => void;
  onSwitchTab: (tabId: string) => void;
  /** @deprecated The header no longer shows a location indicator. Accepted so existing callers still compile. */
  currentLocation?: string;
  /** @deprecated See currentLocation. */
  isGpsActive?: boolean;
  /** @deprecated See currentLocation. */
  onUpdateLocation?: (newLocation: string, isGps: boolean) => void;
  hasBusinessAccount: boolean;
  businessName?: string;
  isDarkMode: boolean;
  isGuestMode?: boolean;
  onOpenAuth?: () => void;

  onOpenAdmin?: () => void;
  userRole?: 'user' | 'merchant' | 'admin';
  /** Signed-in user's email. Together with userRole it decides whether the Admin Control Hub shows. */
  userEmail?: string | null;
  /** Signed-in user's id; powers the notification bell. */
  userId?: string | null;
  onLogout?: () => void;
  onOpenSaved?: () => void;
  savedCount?: number;
  /** @deprecated Account settings now live inside the 3-dot menu. Accepted so existing callers still compile. */
  onOpenAccountSettings?: () => void;
  onOpenSuggestSpot?: () => void;
  onOpenCreateEvent?: () => void;
  /** Profile photo for the round button on the right. */
  avatar?: string;
  /** Used for the initial when there is no photo. */
  displayName?: string;
  /** Opens the full profile page. */
  onOpenProfile?: () => void;
  showToast?: (msg: string, options?: ToastOptions) => void;
  /** True on the home tab: the header hides when you scroll down and comes back as soon as you scroll up. Other tabs: it scrolls away normally. */
  isHome?: boolean;
  /** @deprecated The header no longer renders a refresh button. Accepted so existing callers still compile. */
  onRefresh?: () => void;
  /** @deprecated See onRefresh. */
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOverlay,
  onSwitchTab,
  hasBusinessAccount,
  businessName,
  isDarkMode,
  isGuestMode,
  onOpenAuth,
  onOpenAdmin,
  userRole,
  userEmail,
  userId,
  onLogout,
  onOpenSuggestSpot,
  onOpenCreateEvent,
  avatar,
  displayName,
  onOpenProfile,
  showToast,
  isHome = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  // Keep the menu relevant: rows that don't fit what this person said they use RADA for are hidden.
  // Nothing is hidden until they have answered (or for guests / people who already run a business).
  const { intents } = useIntents(userId);
  const intentsKnown = Array.isArray(intents) && intents.length > 0;
  const showSuggestSpot = !intentsKnown || intents!.some((i) => i !== 'business');
  // The menu has two pages: the main list, and "Account & security" (its own page inside the menu).
  const [menuView, setMenuView] = useState<'main' | 'account'>('main');
  useEffect(() => { if (!menuOpen) setMenuView('main'); }, [menuOpen]);
  const menuRef = useRef<HTMLDivElement>(null);

  // hello.rada.app@gmail.com OR role === 'admin'. Guests never qualify.
  const isAdmin = !isGuestMode && isPlatformAdmin({ email: userEmail, role: userRole });

  const openAdminHub = () => {
    setMenuOpen(false);
    if (onOpenAdmin) onOpenAdmin();
    else onOpenOverlay('adminDashboard');
  };

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

  // Home only: hide on scroll down, show again the moment you scroll up. Other tabs: header just scrolls with the page.
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const menuOpenRef = useRef(menuOpen);
  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);
  useEffect(() => {
    if (!isHome) { setHidden(false); return; }
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (menuOpenRef.current) { lastY.current = y; return; }
      const d = y - lastY.current;
      if (y <= 8) setHidden(false);
      else if (d > 10) { setHidden(true); }
      else if (d < -6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const initial = (displayName || userEmail || 'R').replace(/^@/, '').trim().charAt(0).toUpperCase() || 'R';

  return (
    <header className={`${isHome ? "sticky top-0 transition-transform duration-200 " + (hidden && !menuOpen ? "-translate-y-full" : "") : "relative"} z-[45] rada-header bg-white dark:bg-[#121113] border-b border-slate-200 dark:border-slate-800 shadow-xs`}>
      <div className="max-w-lg min-[900px]:max-w-none mx-auto w-full px-3.5 sm:px-4 min-[900px]:px-8 py-2.5 min-h-[60px] sm:min-h-[64px] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Left: profile */}
        <div className="justify-self-start">
          <button
            type="button"
            onClick={onOpenProfile || onOpenAuth}
            className="relative w-10 h-10 rounded-full active:scale-95 transition-transform cursor-pointer focus:outline-none"
            aria-label="Your profile"
            title="Your profile"
          >
            <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <span className="w-full h-full flex items-center justify-center rounded-full bg-[#E0533C]/12 text-[#E0533C] font-black text-base">{initial}</span>
              )}
            </span>
          </button>
        </div>
        {/* Middle: logo */}
        <button
          type="button"
          onClick={() => onSwitchTab('home')}
          className="justify-self-center flex items-center cursor-pointer hover:opacity-90 active:scale-95 transition-all focus:outline-none dark:bg-[#E05328] dark:px-2.5 dark:py-1 dark:rounded-xl"
          title="RADA PULSE Home"
        >
          <img
            src="/assets/aistudio/RADAPULSE_Logo_Transparent_9a9a4145.png"
            alt="RADA PULSE"
            className="h-9 sm:h-10 w-auto object-contain block"
            draggable={false}
          />
        </button>

        {/* Right: 3-dot menu */}
        <div className="relative justify-self-end" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer ${menuOpen ? "bg-slate-100 dark:bg-slate-800" : ""}`}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-6 h-6" strokeWidth={2.25} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-[20rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-[0_16px_40px_-12px_rgba(18,17,19,0.3)] z-[60] origin-top-right animate-in fade-in zoom-in-95 duration-200"
            >
              {menuView === 'account' && !isGuestMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuView('main')}
                    className="w-full text-left px-3 py-2.5 text-[13px] font-bold flex items-center gap-2.5 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.06] border-b border-slate-100 dark:border-white/5 cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4" />
                    </span>
                    <span>Menu</span>
                  </button>
                  <MenuAccountSection
                    userId={userId}
                    showToast={showToast}
                    onOpenAuth={onOpenAuth}
                    onLogout={onLogout}
                    onDone={() => setMenuOpen(false)}
                  />
                </>
              ) : (
                <div className="p-2 space-y-1.5">
                  {/* ADMIN ONLY: Admin Control Hub */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAdminHub}
                      className="relative overflow-hidden w-full text-left rounded-2xl p-3 flex items-center gap-3 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-600/25 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                    >
                      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
                      <span className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5" />
                      </span>
                      <span className="relative flex-1 min-w-0">
                        <span className="block text-sm font-extrabold leading-tight">Admin Control Hub</span>
                        <span className="block text-[11px] text-white/85 mt-px">Spots, verification, users &amp; revenue</span>
                      </span>
                      <span className="relative text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full shrink-0">Admin</span>
                    </button>
                  )}

                  {/* Everyday actions */}
                  <div className={MENU_GROUP}>
                    {showSuggestSpot && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onOpenSuggestSpot) onOpenSuggestSpot();
                      }}
                      className={MENU_ROW}
                    >
                      <span className={`${MENU_TILE} bg-[#E9C46A]/20 text-[#C98A12] dark:text-[#E9C46A]`}>
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>Suggest a Spot</span>
                        <span className={MENU_SUB}>Recommend a hangout or venue</span>
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] shrink-0">
                        + Add
                      </span>
                    </button>
                    )}

                    {onOpenCreateEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCreateEvent();
                      }}
                      className={MENU_ROW}
                    >
                      <span className={`${MENU_TILE} bg-sky-500/12 text-sky-600 dark:text-sky-400`}>
                        <CalendarPlus className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>Add an Event</span>
                        <span className={MENU_SUB}>Host an in-person or online event</span>
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-sky-500/12 text-sky-600 dark:text-sky-400 shrink-0">
                        + Event
                      </span>
                    </button>
                    )}

                    <button type="button" onClick={() => handleMenuClick('settingsOverlay')} className={MENU_ROW}>
                      <span className={`${MENU_TILE} bg-[#2D6A4F]/10 text-[#2D6A4F] dark:text-emerald-400`}>
                        <Settings className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>App settings</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  </div>

                  {/* Emergency & SOS Hub */}
                  <button
                    type="button"
                    onClick={() => handleMenuClick('sosOverlay')}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[50px] rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-950/50 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                  >
                    <span className={`${MENU_TILE} bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400`}>
                      <ShieldAlert className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-extrabold leading-tight text-red-600 dark:text-red-400">Emergency &amp; SOS Hub</span>
                      <span className="block text-[11px] font-normal leading-snug text-red-500/80 dark:text-red-400/70 mt-px">Helplines &amp; emergency contacts</span>
                    </span>
                    <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shrink-0">
                      SOS
                    </span>
                  </button>

                  {/* Account */}
                  {isGuestMode && onOpenAuth ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full rounded-full bg-[#E0533C] text-white text-sm font-extrabold py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Log In / Sign Up</span>
                    </button>
                  ) : (
                    <div className={MENU_GROUP}>
                      <button type="button" onClick={() => setMenuView('account')} className={MENU_ROW}>
                        <span className={`${MENU_TILE} bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300`}>
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={MENU_TITLE}>Account &amp; security</span>
                          <span className={MENU_SUB}>Email, password, accounts, log out</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
