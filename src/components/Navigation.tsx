import React, { useState, useEffect } from 'react';
import { Home, MapPin, CalendarPlus, Users, Wallet } from 'lucide-react';
import { getStoredLanguage, translations, type AppLanguage } from '../utils/i18n.ts';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
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
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-[#0C0A0E] border-t border-slate-200 dark:border-slate-800/80 px-2 py-2.5 flex items-center justify-around z-40 shadow-xl transition-colors duration-200 lg:top-[65px] lg:right-auto lg:w-60 lg:max-w-none lg:mx-0 lg:flex-col lg:justify-start lg:items-stretch lg:gap-1 lg:border-t-0 lg:border-r lg:px-3 lg:py-5 lg:shadow-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
          (tab.id === 'vault' && activeTab === 'calendar') ||
          (tab.id === 'outings' && activeTab === 'plans');
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn relative flex flex-col items-center gap-1 flex-1 py-1 transition-all duration-200 cursor-pointer lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:rounded-xl ${
              isActive 
                ? 'text-[#B83D26] dark:text-[#E0533C] font-black scale-105 lg:scale-100 lg:bg-[#B83D26]/10 dark:lg:bg-[#E0533C]/15' 
                : 'text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium lg:hover:bg-slate-100 dark:lg:hover:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight lg:text-sm lg:tracking-normal">{tab.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#B83D26] dark:bg-[#E0533C] shadow-xs lg:hidden" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
