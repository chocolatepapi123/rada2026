import React, { useState, useEffect } from 'react';
import { Home, MapPin, CalendarPlus, Users, Wallet } from 'lucide-react';
import { getStoredLanguage, translations, type AppLanguage } from '../utils/i18n.ts';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Called on press-down / hover so the tab's code chunk starts downloading before the click lands. */
  onPrefetchTab?: (tabId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onPrefetchTab }) => {
  const [appLang, setAppLang] = useState<AppLanguage>(() => getStoredLanguage());

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setAppLang(e.detail);
    };
    window.addEventListener('rada_language_changed', handleLangChange);
    return () => window.removeEventListener('rada_language_changed', handleLangChange);
  }, []);

  const t = translations[appLang];

  const tabs = [
    { id: 'home', label: t.tabHome, icon: Home },
    { id: 'spots', label: t.tabSpots, icon: MapPin },
    { id: 'outings', label: t.tabOutings, icon: CalendarPlus },
    { id: 'socials', label: t.tabSocials, icon: Users },
    { id: 'vault', label: t.tabVault, icon: Wallet },
  ];

  return (
    <nav
      className="fixed left-3 right-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] max-w-lg mx-auto rada-nav rounded-full border px-2 py-2 flex items-center justify-around z-40 transition-colors duration-200 min-[900px]:top-[65px] min-[900px]:bottom-0 min-[900px]:left-0 min-[900px]:right-auto min-[900px]:w-60 min-[900px]:max-w-none min-[900px]:mx-0 min-[900px]:rounded-none min-[900px]:flex-col min-[900px]:justify-start min-[900px]:items-stretch min-[900px]:gap-1 min-[900px]:border-t-0 min-[900px]:border-b-0 min-[900px]:border-l-0 min-[900px]:border-r min-[900px]:px-3 min-[900px]:py-5"
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
            onPointerDown={() => onPrefetchTab?.(tab.id)}
            onMouseEnter={() => onPrefetchTab?.(tab.id)}
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn relative flex flex-col items-center gap-1 flex-1 py-1.5 transition-colors duration-200 cursor-pointer active:scale-95 min-[900px]:active:scale-100 min-[900px]:flex-none min-[900px]:flex-row min-[900px]:justify-start min-[900px]:gap-3 min-[900px]:px-4 min-[900px]:py-3 min-[900px]:rounded-xl ${
              isActive 
                ? 'rada-nav-btn-active font-bold' 
                : 'rada-nav-btn-idle font-medium'
            }`}
          >
            <Icon className={`w-6 h-6 min-[900px]:w-5 min-[900px]:h-5 transition-transform ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
            <span className="text-[11px] leading-none tracking-tight min-[900px]:text-sm min-[900px]:leading-normal min-[900px]:tracking-normal">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
