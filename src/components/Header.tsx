import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  Settings, 
  UserCheck, 
  Menu, 
  MapPin,
  Sun,
  Moon,
  Bookmark,
  LogIn,
  Crown,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { isPlatformAdmin } from '../types';
import type { ToastOptions } from './Toast.tsx';

// Account & security settings live inside the 3-dot menu; loaded only when the menu is first opened.
const MenuAccountSection = lazy(() =>
  import('./MenuAccountSection').then((m) => ({ default: m.MenuAccountSection }))
);

// Shared look for rows inside the 3-dot menu (big tap targets, soft rounded tiles).
const MENU_ROW =
  'w-full text-left flex items-center gap-3.5 px-4 py-3.5 min-h-[60px] transition cursor-pointer focus:outline-none hover:bg-white dark:hover:bg-white/[0.06] active:bg-slate-100 dark:active:bg-white/10';
const MENU_TILE = 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0';
const MENU_TITLE = 'block text-[15px] font-bold leading-tight text-slate-900 dark:text-slate-100';
const MENU_SUB = 'block text-xs font-normal leading-snug text-slate-500 dark:text-slate-400 mt-0.5';
const MENU_GROUP =
  'rounded-3xl overflow-hidden bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 divide-y divide-slate-200/70 dark:divide-white/5';

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
  onToggleTheme: () => void;
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
  onToggleTheme,
  isGuestMode,
  onOpenAuth,
  onOpenAdmin,
  userRole,
  userEmail,
  userId,
  onLogout,
  onOpenSaved,
  savedCount,
  onOpenSuggestSpot,
  avatar,
  displayName,
  onOpenProfile,
  showToast,
  isHome = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
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
  useEffect(() => {
    if (!isHome) { setHidden(false); return; }
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastY.current;
      if (y <= 8) setHidden(false);
      else if (d > 6) { setHidden(true); setMenuOpen(false); }
      else if (d < -6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const initial = (displayName || userEmail || 'R').replace(/^@/, '').trim().charAt(0).toUpperCase() || 'R';

  return (
    <header className={`${isHome ? "sticky top-0 transition-transform duration-200 will-change-transform " + (hidden ? "-translate-y-full" : "translate-y-0") : "relative"} z-40 rada-header bg-white dark:bg-[#121113] border-b border-slate-200 dark:border-slate-800 shadow-xs`}>
      <div className="max-w-lg min-[900px]:max-w-none mx-auto w-full px-3.5 sm:px-4 min-[900px]:px-8 py-2.5 min-h-[60px] sm:min-h-[64px] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Left: profile (or sign-in for guests) */}
        <div className="justify-self-start">
          {isGuestMode && onOpenAuth ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1C1A1E] border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none"
              aria-label="Sign In"
              title="Sign In"
            >
              <LogIn className="w-4.5 h-4.5 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenProfile}
              className="relative w-10 h-10 rounded-full active:scale-95 transition-transform cursor-pointer focus:outline-none"
              aria-label="Your profile"
              title="Your profile"
            >
              <span className="block w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center rounded-full bg-[#E0533C]/12 text-[#E0533C] font-black text-base">{initial}</span>
                )}
              </span>
            </button>
          )}
        </div>
        {/* Middle: logo + name */}
        <button
          type="button"
          onClick={() => onSwitchTab('home')}
          className="justify-self-center flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all focus:outline-none"
          title="RADA Home"
        >
          <div className="w-8 h-8 rounded-xl bg-[#E0533C] text-white flex items-center justify-center shadow-xs shrink-0">
            <svg viewBox="0 0 100 130" className="w-5 h-5 fill-none stroke-white" strokeLinejoin="round">
              <path d="M50 6 C26 6 10 26 10 50 C10 76 45 116 48.5 120 C49.3 121 50.7 121 51.5 120 C55 116 90 76 90 50 C90 26 74 6 50 6 Z" strokeWidth="8" />
              <path d="M22 35 C15 45 16 58 25 74 C34 90 46 106 50 112" strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="48" r="17" strokeWidth="8" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-[#E0533C] leading-none">RADA</span>
        </button>

        {/* Right: menu (three lines) */}
        <div className="relative justify-self-end" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer ${menuOpen ? "bg-slate-100 dark:bg-slate-800" : ""}`}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Menu className="w-6 h-6" strokeWidth={2.25} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-3 w-[21rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10 rounded-[28px] shadow-[0_24px_60px_-16px_rgba(18,17,19,0.35)] z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200"
            >
              {menuView === 'account' && !isGuestMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuView('main')}
                    className="w-full text-left px-4 py-3.5 text-[15px] font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.06] border-b border-slate-100 dark:border-white/5 cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                      <ArrowLeft className="w-4.5 h-4.5" />
                    </span>
                    <span>Menu</span>
                  </button>
                  <Suspense fallback={<p className="px-4 py-4 text-xs text-slate-400">Loading account…</p>}>
                    <MenuAccountSection
                      userId={userId}
                      showToast={showToast}
                      onOpenAuth={onOpenAuth}
                      onLogout={onLogout}
                      onDone={() => setMenuOpen(false)}
                    />
                  </Suspense>
                </>
              ) : (
                <div className="p-2.5 space-y-2.5">
                  {/* ADMIN ONLY: Admin Control Hub */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAdminHub}
                      className="relative overflow-hidden w-full text-left rounded-3xl p-4 flex items-center gap-3.5 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-600/25 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                    >
                      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
                      <span className="relative w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <Crown className="w-6 h-6" />
                      </span>
                      <span className="relative flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-1">Admin</span>
                        <span className="block text-base font-extrabold leading-tight">Admin Control Hub</span>
                        <span className="block text-xs text-white/85 mt-0.5">Spots, verification, users &amp; revenue</span>
                      </span>
                      <ChevronRight className="relative w-5 h-5 text-white/80 shrink-0" />
                    </button>
                  )}

                  {/* Business & Merchant Hub (hero card) */}
                  <button
                    type="button"
                    onClick={() => handleMenuClick('businessHub')}
                    className="relative overflow-hidden w-full text-left rounded-3xl p-4 flex items-center gap-3.5 bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white shadow-lg shadow-[#E0533C]/30 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                  >
                    <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
                    <span className="relative w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6" />
                    </span>
                    <span className="relative flex-1 min-w-0">
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-1">Merchant</span>
                      <span className="block text-base font-extrabold leading-tight">Business &amp; Merchant Hub</span>
                      <span className="block text-xs text-white/85 mt-0.5 truncate">
                        {hasBusinessAccount
                          ? `Managing: ${businessName || 'My Business'}`
                          : 'Create account, spots, events & fits'}
                      </span>
                    </span>
                    <ChevronRight className="relative w-5 h-5 text-white/80 shrink-0" />
                  </button>

                  {/* Everyday actions */}
                  <div className={MENU_GROUP}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onOpenSaved) onOpenSaved();
                        else handleMenuClick('savedOverlay');
                      }}
                      className={MENU_ROW}
                    >
                      <span className={`${MENU_TILE} bg-[#E0533C]/10 text-[#E0533C]`}>
                        <Bookmark className="w-5 h-5 fill-[#E0533C]/25" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>Saved Items</span>
                      </span>
                      {savedCount !== undefined && savedCount > 0 && (
                        <span className="min-w-7 h-7 px-2 rounded-full bg-[#E0533C] text-white text-xs font-black flex items-center justify-center shadow-sm shadow-[#E0533C]/30">
                          {savedCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onOpenSuggestSpot) onOpenSuggestSpot();
                      }}
                      className={MENU_ROW}
                    >
                      <span className={`${MENU_TILE} bg-[#E9C46A]/20 text-[#C98A12] dark:text-[#E9C46A]`}>
                        <MapPin className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>Suggest a Spot</span>
                        <span className={MENU_SUB}>Recommend a hangout or venue</span>
                      </span>
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] shrink-0">
                        + Add
                      </span>
                    </button>

                    <button type="button" onClick={() => handleMenuClick('settingsOverlay')} className={MENU_ROW}>
                      <span className={`${MENU_TILE} bg-[#2D6A4F]/10 text-[#2D6A4F] dark:text-emerald-400`}>
                        <Settings className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>App settings</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!isDarkMode}
                      onClick={onToggleTheme}
                      className={MENU_ROW}
                    >
                      <span className={`${MENU_TILE} ${isDarkMode ? 'bg-[#E9C46A]/20 text-[#E9C46A]' : 'bg-slate-200/70 text-slate-600'}`}>
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={MENU_TITLE}>Dark mode</span>
                      </span>
                      <span className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${isDarkMode ? 'bg-[#E0533C]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                      </span>
                    </button>
                  </div>

                  {/* Emergency & SOS Hub */}
                  <button
                    type="button"
                    onClick={() => handleMenuClick('sosOverlay')}
                    className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 min-h-[64px] rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-950/50 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                  >
                    <span className={`${MENU_TILE} bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400`}>
                      <ShieldAlert className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-extrabold leading-tight text-red-600 dark:text-red-400">Emergency &amp; SOS Hub</span>
                      <span className="block text-xs font-normal leading-snug text-red-500/80 dark:text-red-400/70 mt-0.5">Helplines &amp; emergency contacts</span>
                    </span>
                    <span className="text-[11px] font-black tracking-wider px-2.5 py-1 rounded-full bg-red-600 text-white shrink-0">
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
                      className="w-full rounded-full bg-[#E0533C] text-white text-[15px] font-extrabold py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition cursor-pointer focus:outline-none"
                    >
                      <UserCheck className="w-5 h-5" />
                      <span>Log In / Sign Up</span>
                    </button>
                  ) : (
                    <div className={MENU_GROUP}>
                      <button type="button" onClick={() => setMenuView('account')} className={MENU_ROW}>
                        <span className={`${MENU_TILE} bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300`}>
                          <ShieldCheck className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={MENU_TITLE}>Account &amp; security</span>
                          <span className={MENU_SUB}>Email, password, accounts, log out</span>
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
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
