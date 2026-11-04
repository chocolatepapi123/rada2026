import React, { useState, useEffect } from 'react';
import { Home, MapPin, CalendarPlus, Users, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStoredLanguage, translations, type AppLanguage } from '../utils/i18n.ts';
import { useUnreadChatCount } from '../lib/unreadChats.ts';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Called on press-down / hover so the tab's code chunk starts downloading before the click lands. */
  onPrefetchTab?: (tabId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onPrefetchTab }) => {
  const [appLang, setAppLang] = useState<AppLanguage>(() => getStoredLanguage());
  const unreadChats = useUnreadChatCount();

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setAppLang(e.detail);
    };
    window.addEventListener('rada_language_changed', handleLangChange);
    return () => window.removeEventListener('rada_language_changed', handleLangChange);
  }, []);

  const t = translations[appLang];

  const tabs = [
    { id: 'home', label: t.tabHome, icon: Home, badge: 0 },
    { id: 'spots', label: t.tabSpots, icon: MapPin, badge: 0 },
    { id: 'outings', label: t.tabOutings, icon: CalendarPlus, badge: 0 },
    { id: 'socials', label: t.tabSocials, icon: Users, badge: unreadChats },
    { id: 'vault', label: t.tabVault, icon: Wallet, badge: 0 },
  ];

  return (
    <nav
      className="fixed left-3 right-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] max-w-[21.5rem] mx-auto rada-nav rounded-full border px-1.5 py-1 flex items-center justify-around z-40 transition-colors duration-200 min-[900px]:top-[65px] min-[900px]:bottom-0 min-[900px]:left-0 min-[900px]:right-auto min-[900px]:w-60 min-[900px]:max-w-none min-[900px]:mx-0 min-[900px]:rounded-none min-[900px]:flex-col min-[900px]:justify-start min-[900px]:items-stretch min-[900px]:gap-1 min-[900px]:border-t-0 min-[900px]:border-b-0 min-[900px]:border-l-0 min-[900px]:border-r min-[900px]:px-3 min-[900px]:py-5"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
          (tab.id === 'vault' && activeTab === 'calendar') ||
          (tab.id === 'outings' && activeTab === 'plans');
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.badge > 0 ? `${tab.label}, ${tab.badge} unread` : tab.label}
            onPointerDown={() => onPrefetchTab?.(tab.id)}
            onMouseEnter={() => onPrefetchTab?.(tab.id)}
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn relative flex flex-col items-center gap-0.5 flex-1 py-0.5 transition-colors duration-300 cursor-pointer select-none [-webkit-tap-highlight-color:transparent] min-[900px]:flex-none min-[900px]:flex-row min-[900px]:justify-start min-[900px]:gap-3 min-[900px]:px-4 min-[900px]:py-3 min-[900px]:rounded-xl ${
              isActive 
                ? 'rada-nav-btn-active font-bold' 
                : 'rada-nav-btn-idle font-medium'
            }`}
          >
            {/* Desktop sidebar: highlight the whole row */}
            {isActive && (
              <motion.span
                layoutId="rada-nav-row"
                aria-hidden="true"
                className="rada-nav-row absolute inset-0 rounded-xl hidden min-[900px]:block"
                transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
              />
            )}
            {/* Icon holder: on phones only this gets the highlight */}
            <span className="relative grid place-items-center h-7 w-12 min-[900px]:h-5 min-[900px]:w-5 transition-transform duration-150 ease-out active:scale-90 min-[900px]:active:scale-100">
              {isActive && (
                <motion.span
                  layoutId="rada-nav-pill"
                  aria-hidden="true"
                  className="rada-nav-pill absolute inset-0 rounded-full min-[900px]:hidden"
                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
                />
              )}
              <Icon className={`relative w-[22px] h-[22px] min-[900px]:w-5 min-[900px]:h-5 transition-all duration-300 ease-out ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
              <AnimatePresence>
                {tab.badge > 0 && (
                  <motion.span
                    key="badge"
                    aria-hidden="true"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                    className="rada-nav-badge absolute -top-px right-1 min-[900px]:-top-1.5 min-[900px]:-right-2 min-w-[16px] h-4 px-1 rounded-full text-center text-[10px] leading-4 font-bold text-white"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="relative text-[10px] leading-none tracking-tight min-[900px]:text-sm min-[900px]:leading-normal min-[900px]:tracking-normal">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
