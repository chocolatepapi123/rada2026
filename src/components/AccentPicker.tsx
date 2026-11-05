import React from 'react';
import { Check } from 'lucide-react';
import { THEMES } from '../lib/profileLook';
import { setAppAccent, useAppAccent } from '../lib/appAccent';

/** Colour swatches that change the colour of the whole app (this phone only). */
export const AccentPicker: React.FC<{ isDarkMode?: boolean; className?: string }> = ({ isDarkMode, className = '' }) => {
  const current = useAppAccent();
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setAppAccent(t.id)}
          aria-label={`${t.name} app colour`}
          title={t.name}
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition"
          style={{
            background: t.color,
            boxShadow: current === t.id ? `0 0 0 2px ${isDarkMode ? '#1C1A1E' : '#fff'}, 0 0 0 4px ${t.color}` : 'none',
          }}
        >
          {current === t.id && <Check className="w-4 h-4 text-white" />}
        </button>
      ))}
    </div>
  );
};
