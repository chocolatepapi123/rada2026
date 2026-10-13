import React from 'react';
import { Home, MapPin, Shirt, Users, Wallet } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'spots', label: 'Spots', icon: MapPin },
    { id: 'luku', label: 'Luku', icon: Shirt },
    { id: 'socials', label: 'Socials', icon: Users },
    { id: 'vault', label: 'Vault', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#FBFBF9]/95 dark:bg-[#121113]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-btn flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
              isActive 
                ? 'text-[#E0533C] font-extrabold scale-105' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
