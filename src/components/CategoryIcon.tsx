import React from 'react';
import {
  Sparkles, Music, Mic, Palette, Utensils, Dumbbell, Briefcase, Users, BookOpen, Clapperboard,
  Coffee, Wine, Heart, TreePine, Gamepad2, Trophy, Hotel, Sun, Folder, Cake, Gift, ShoppingBag,
  Car, PartyPopper, MapPin, Camera, Tent, Pizza, type LucideIcon,
} from 'lucide-react';

/** One place that maps short keys to line icons, so the app never shows emoji in its UI. */
const ICONS: Record<string, LucideIcon> = {
  all: Sparkles, nightlife: Music, music: Mic, arts: Palette, food: Utensils, sports: Dumbbell,
  tech: Briefcase, community: Users, learn: BookOpen, cinema: Clapperboard,
  dining: Utensils, cafe: Coffee, bar: Wine, date: Heart, nature: TreePine, creative: Palette,
  gaming: Gamepad2, action: Trophy, hotel: Hotel, vacation: Sun,
  folder: Folder, cake: Cake, gift: Gift, shopping: ShoppingBag, car: Car, party: PartyPopper,
  pin: MapPin, camera: Camera, camp: Tent, pizza: Pizza, heart: Heart, sun: Sun, tree: TreePine,
};

export const FOLDER_ICON_KEYS = ['cake', 'cafe', 'heart', 'sun', 'pizza', 'music', 'shopping', 'camp', 'creative', 'party', 'car', 'bar'];

export const CategoryIcon: React.FC<{ name?: string | null; className?: string }> = ({ name, className = 'w-3.5 h-3.5' }) => {
  const Icon = (name && ICONS[name]) || Folder; // old saved emoji values fall back to a folder icon
  return <Icon aria-hidden="true" className={className} />;
};

export default CategoryIcon;
