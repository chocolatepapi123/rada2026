import React, { useState } from 'react';
import { Smile, Heart, Coffee, Sun, Activity, MapPin, Sparkles, X } from 'lucide-react';

export interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  isOpen: boolean;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🥹', '😊', 
      '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', 
      '😝', '🤑', '🤗', '🫣', '🤫', '🤔', '🤐', '🤨', '😐', '😏', 
      '😒', '🙄', '😬', '🤥', '😪', '🤤', '😴', '😷', '🥵', '🥶', 
      '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '🥺', 
      '😢', '😭', '😱', '😖', '😤', '😡', '🤬', '💀', '💩', '🤡'
    ]
  },
  {
    id: 'gestures',
    name: 'People',
    icon: Heart,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', 
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👍', '👎', 
      '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', 
      '🙏', '✍️', '💅', '🤳', '💪', '🧠', '🫂', '💃', '🕺', '🏃'
    ]
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: Sun,
    emojis: [
      '🦁', '🦒', '🐘', '🦓', '🐆', '🐅', '🦍', '🐒', '🐕', '🐈', 
      '🐎', '🐝', '🦋', '🌺', '🌸', '🌼', '🌻', '🌴', '🌲', '🍀', 
      '☀️', '🌤️', '🌧️', '⛈️', '❄️', '🌙', '⭐', '🌟', '⚡', '🔥', 
      '🌈', '🌊'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '☕', '🍵', '🧃', '🥤', '🧋', '🍹', '🍸', '🍷', '🍾', '🍺', 
      '🍻', '🥂', '🥩', '🍗', '🍖', '🍔', '🍟', '🍕', '🌭', '🥪', 
      '🌮', '🌯', '🥗', '🥘', '🍣', '🍜', '🍲', '🍩', '🍦', '🍰', 
      '🥑', '🥭', '🍍', '🍉', '🍓', '🍌'
    ]
  },
  {
    id: 'activities',
    name: 'Outings',
    icon: Activity,
    emojis: [
      '🎉', '🎊', '🎈', '🎟️', '🎫', '🏆', '🥇', '⚽', '🏀', '🏈', 
      '🎾', '🥊', '🎳', '🎮', '🕹️', '🎲', '🎭', '🎨', '🎬', '🎤', 
      '🎧', '🎼', '🎵', '🎶', '🎸', '🎹', '🎷', '🎺', '🥁'
    ]
  },
  {
    id: 'places',
    name: 'Travel',
    icon: MapPin,
    emojis: [
      '📍', '🗺️', '🧭', '✈️', '🚀', '🚗', '🚕', '🚙', '🚌', '🛵', 
      '🏍️', '🚲', '🛴', '🛥️', '🚢', '🏖️', '🏝️', '🏕️', '⛺', '🏙️', 
      '🌆', '🌇', '🌃', '🌅', '🌉'
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: Sparkles,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', 
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '💥', 
      '💫', '✨', '⚡', '🔔', '💡', '🏷️', '📸', '📱', '🕶️', '👑'
    ]
  }
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  isOpen
}) => {
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id);

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];

  return (
    <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150 z-50">
      {/* Category Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 px-1">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                title={cat.name}
                className={`p-1.5 rounded-lg transition text-xs flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#E0533C] dark:bg-[#A94F3E] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Name Label */}
      <div className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-wider">
        {currentCategory.name}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-44 overflow-y-auto p-1 text-xl select-none">
        {currentCategory.emojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
