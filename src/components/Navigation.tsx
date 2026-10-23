import React from 'react';
import { Home, MapPin, CalendarPlus, Users, Wallet } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'spots', label: 'Spots', icon: MapPin },
    { id: 'outings', label: 'Outings', icon: CalendarPlus },
    { id: 'socials', label: 'Socials', icon: Users },
    { id: 'vault', label: 'Vault', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-[#121113] border-t border-slate-200 dark:border-slate-800 px-2 py-2.5 flex items-center justify-around z-40 shadow-xl transition-colors duration-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || 
          (tab.id === 'vault' && activeTab === 'calendar') ||
          (tab.id === 'outings' && activeTab === 'plans');
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn relative flex flex-col items-center gap-1 flex-1 py-1 transition-all duration-200 cursor-pointer ${
              isActive 
                ? 'text-[#FF5733] dark:text-[#D17A68] font-black scale-105' 
                : 'text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5733] dark:bg-[#A94F3E] shadow-xs" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
