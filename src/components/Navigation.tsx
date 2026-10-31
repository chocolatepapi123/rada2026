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
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto rada-nav border-t px-2 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around z-40 shadow-xl transition-colors duration-200 min-[900px]:top-[65px] min-[900px]:right-auto min-[900px]:w-60 min-[900px]:max-w-none min-[900px]:mx-0 min-[900px]:flex-col min-[900px]:justify-start min-[900px]:items-stretch min-[900px]:gap-1 min-[900px]:border-t-0 min-[900px]:border-r min-[900px]:px-3 min-[900px]:py-5 min-[900px]:shadow-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
          (tab.id === 'vault' && activeTab === 'calendar') ||
          (tab.id === 'outings' && activeTab === 'plans');
        return (
          <button
            key={tab.id}
            type="button"
            onPointerDown={() => onPrefetchTab?.(tab.id)}
            onMouseEnter={() => onPrefetchTab?.(tab.id)}
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn relative flex flex-col items-center gap-1 flex-1 py-1 transition-all duration-200 cursor-pointer min-[900px]:flex-none min-[900px]:flex-row min-[900px]:justify-start min-[900px]:gap-3 min-[900px]:px-4 min-[900px]:py-3 min-[900px]:rounded-xl ${
              isActive 
                ? 'rada-nav-btn-active font-black scale-105 min-[900px]:scale-100' 
                : 'rada-nav-btn-idle font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight min-[900px]:text-sm min-[900px]:tracking-normal">{tab.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full rada-nav-dot shadow-xs min-[900px]:hidden" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
