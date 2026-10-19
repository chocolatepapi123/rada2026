/**
 * Category Accent System (10 Main Categories)
 * Defines high-contrast category colors, badges, light tint backgrounds,
 * glowing dark tint backgrounds, borders, and icons for RADA.
 */

import React from 'react';
import {
  UtensilsCrossed,
  Trees,
  Palette,
  Gamepad2,
  Dumbbell,
  Heart,
  Music,
  Coffee,
  Hotel,
  Palmtree,
  Compass
} from 'lucide-react';

export interface CategoryAccent {
  id: string;
  label: string;
  badge: string;
  color: string;           // Hex color
  lightBg: string;         // Light mode tint bg (e.g. #FEF3C7)
  darkBg: string;          // Dark mode glowing tint bg (e.g. #F59E0B20)
  borderColor: string;     // Border color with alpha
  pillClass: string;       // Tailwind classes for category badge/pill
  activeClass: string;     // Tailwind classes for active selection
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  restaurants_dining: {
    id: 'restaurants_dining',
    label: 'Restaurants and dining',
    badge: 'Dining & Kitchens',
    color: '#F59E0B',
    lightBg: '#FEF3C7',
    darkBg: '#F59E0B25',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    pillClass: 'bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-black/50 dark:text-[#FCD34D] dark:border-[#F59E0B]/40 backdrop-blur-md',
    activeClass: 'bg-[#F59E0B] text-white shadow-sm font-black',
    icon: UtensilsCrossed
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    badge: 'Parks & Trails',
    color: '#10B981',
    lightBg: '#D1FAE5',
    darkBg: '#10B98125',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    pillClass: 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 dark:bg-black/50 dark:text-[#6EE7B7] dark:border-[#10B981]/40 backdrop-blur-md',
    activeClass: 'bg-[#10B981] text-white shadow-sm font-black',
    icon: Trees
  },
  creative_leisure: {
    id: 'creative_leisure',
    label: 'Creative and leisure',
    badge: 'Art & Studios',
    color: '#D946EF',
    lightBg: '#FCE7F3',
    darkBg: '#D946EF25',
    borderColor: 'rgba(217, 70, 239, 0.4)',
    pillClass: 'bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-200/80 dark:bg-black/50 dark:text-[#F0ABFC] dark:border-[#D946EF]/40 backdrop-blur-md',
    activeClass: 'bg-[#D946EF] text-white shadow-sm font-black',
    icon: Palette
  },
  tech_gaming: {
    id: 'tech_gaming',
    label: 'Tech and Gaming',
    badge: 'Cyber & Gaming',
    color: '#06B6D4',
    lightBg: '#CFFAFE',
    darkBg: '#06B6D425',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    pillClass: 'bg-cyan-50 text-cyan-900 border border-cyan-200/80 dark:bg-black/50 dark:text-[#67E8F9] dark:border-[#06B6D4]/40 backdrop-blur-md',
    activeClass: 'bg-[#06B6D4] text-white shadow-sm font-black',
    icon: Gamepad2
  },
  action_sports: {
    id: 'action_sports',
    label: 'Action and sports',
    badge: 'Sports & Adrenaline',
    color: '#EF4444',
    lightBg: '#FEE2E2',
    darkBg: '#EF444425',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    pillClass: 'bg-rose-50 text-rose-900 border border-rose-200/80 dark:bg-black/50 dark:text-[#FCA5A5] dark:border-[#EF4444]/40 backdrop-blur-md',
    activeClass: 'bg-[#EF4444] text-white shadow-sm font-black',
    icon: Dumbbell
  },
  date_spots: {
    id: 'date_spots',
    label: 'Date spots',
    badge: 'Romance & Dates',
    color: '#F43F5E',
    lightBg: '#FFE4E6',
    darkBg: '#F43F5E25',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    pillClass: 'bg-pink-50 text-pink-900 border border-pink-200/80 dark:bg-black/50 dark:text-[#FDA4AF] dark:border-[#F43F5E]/40 backdrop-blur-md',
    activeClass: 'bg-[#F43F5E] text-white shadow-sm font-black',
    icon: Heart
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    label: 'Clubs and lounges',
    badge: 'Nightlife & Lounges',
    color: '#8B5CF6',
    lightBg: '#F3E8FF',
    darkBg: '#8B5CF625',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    pillClass: 'bg-purple-50 text-purple-900 border border-purple-200/80 dark:bg-black/50 dark:text-[#D8B4FE] dark:border-[#8B5CF6]/40 backdrop-blur-md',
    activeClass: 'bg-[#8B5CF6] text-white shadow-sm font-black',
    icon: Music
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    label: 'Cafes and Bakeries',
    badge: 'Cafés & Pastries',
    color: '#D97706',
    lightBg: '#FFEDD5',
    darkBg: '#D9770625',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    pillClass: 'bg-orange-50 text-orange-900 border border-orange-200/80 dark:bg-black/50 dark:text-[#FDE68A] dark:border-[#D97706]/40 backdrop-blur-md',
    activeClass: 'bg-[#D97706] text-white shadow-sm font-black',
    icon: Coffee
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    label: 'Hotels and luxury stays',
    badge: 'Stays & Luxury',
    color: '#EAB308',
    lightBg: '#FEF9C3',
    darkBg: '#EAB30825',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    pillClass: 'bg-yellow-50 text-yellow-900 border border-yellow-200/80 dark:bg-black/50 dark:text-[#FEF08A] dark:border-[#EAB308]/40 backdrop-blur-md',
    activeClass: 'bg-[#EAB308] text-white shadow-sm font-black',
    icon: Hotel
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    label: 'Vacation spots and escapes',
    badge: 'Vacation & Getaways',
    color: '#3B82F6',
    lightBg: '#DBEAFE',
    darkBg: '#3B82F625',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    pillClass: 'bg-blue-50 text-blue-900 border border-blue-200/80 dark:bg-black/50 dark:text-[#93C5FD] dark:border-[#3B82F6]/40 backdrop-blur-md',
    activeClass: 'bg-[#3B82F6] text-white shadow-sm font-black',
    icon: Palmtree
  }
};

/**
 * Normalizes any category string (from spots, events, or filters) to one of the 10 main categories
 */
export function normalizeCategoryKey(category?: string, title?: string, description?: string): string {
  const cat = (category || '').toLowerCase();
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  if (cat.includes('restaurant') || cat.includes('dining') || cat === 'food') return 'restaurants_dining';
  if (cat.includes('nature') || cat.includes('park') || cat.includes('trail') || cat.includes('forest') || text.includes('nature') || text.includes('arboretum')) return 'nature';
  if (cat.includes('creative') || cat.includes('art') || cat.includes('leisure') || text.includes('pottery') || text.includes('painting')) return 'creative_leisure';
  if (cat.includes('tech') || cat.includes('gaming') || cat.includes('arcade') || text.includes('vr arena') || text.includes('simulator')) return 'tech_gaming';
  if (cat.includes('sport') || cat.includes('fitness') || cat.includes('action') || text.includes('bowling') || text.includes('paintball')) return 'action_sports';
  if (cat.includes('date') || cat.includes('romance') || text.includes('candlelit') || text.includes('romantic')) return 'date_spots';
  if (cat.includes('club') || cat.includes('lounge') || cat.includes('nightlife') || text.includes('amapiano') || text.includes('dj lounge')) return 'clubs_lounges';
  if (cat.includes('cafe') || cat.includes('café') || cat.includes('bakery') || cat.includes('coffee')) return 'cafes_bakeries';
  if (cat.includes('hotel') || cat.includes('luxury') || cat.includes('stay') || text.includes('resort') || text.includes('luxury stay')) return 'hotels_luxury';
  if (cat.includes('vacation') || cat.includes('escape') || cat.includes('getaway') || text.includes('safari') || text.includes('resort')) return 'vacation_escapes';

  return 'restaurants_dining';
}

/**
 * Gets accent styling for any category string
 */
export function getCategoryAccent(category?: string, title?: string, description?: string): CategoryAccent {
  const key = normalizeCategoryKey(category, title, description);
  return CATEGORY_ACCENTS[key] || CATEGORY_ACCENTS.restaurants_dining;
}

export interface CategoryMoodPalette {
  id: string;
  name: string;
  bgHex: string;             // Deep saturated base hex in dark mode
  lightBgHex: string;        // Clean luxury off-white in light mode
  gradientDark: string;      // Atmospheric background gradient in dark mode
  gradientLight: string;     // Refined ambient warm light gradient in light mode
  ambientGlow: string;       // Radial ambient glow color in dark mode
  ambientGlowLight: string;  // Subtle delicate ambient glow color in light mode
  accentColor: string;       // Vibrant category accent
  description: string;
}

export const CATEGORY_MOODS: Record<string, CategoryMoodPalette> = {
  all: {
    id: 'all',
    name: 'All Categories',
    bgHex: '#0B0F17',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #111A2E 0%, #0D1424 50%, #0B0F17 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FAFAFC 55%, #F1F4FA 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.22)',
    ambientGlowLight: 'rgba(255, 87, 51, 0.05)',
    accentColor: '#FF5733',
    description: 'Clean luxury white canvas with warm Nairobi accents'
  },
  restaurants_dining: {
    id: 'restaurants_dining',
    name: 'Restaurants & Dining',
    bgHex: '#140E0A',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFFDF8 50%, #FAF5EE 100%)',
    ambientGlow: 'rgba(245, 158, 11, 0.22)',
    ambientGlowLight: 'rgba(245, 158, 11, 0.06)',
    accentColor: '#F59E0B',
    description: 'Warm amber glow'
  },
  nature: {
    id: 'nature',
    name: 'Nature & Outdoors',
    bgHex: '#0D2018',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #16382A 0%, #0F271D 50%, #0D2018 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F9FDFB 50%, #F0F9F4 100%)',
    ambientGlow: 'rgba(16, 185, 129, 0.25)',
    ambientGlowLight: 'rgba(16, 185, 129, 0.06)',
    accentColor: '#10B981',
    description: 'Fresh botanic emerald'
  },
  creative_leisure: {
    id: 'creative_leisure',
    name: 'Creative & Leisure',
    bgHex: '#1D0C22',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #36153F 0%, #260E2D 50%, #1D0C22 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FDF9FD 50%, #FAF0FA 100%)',
    ambientGlow: 'rgba(217, 70, 239, 0.25)',
    ambientGlowLight: 'rgba(217, 70, 239, 0.06)',
    accentColor: '#D946EF',
    description: 'Inspiring orchid magenta'
  },
  tech_gaming: {
    id: 'tech_gaming',
    name: 'Tech & Gaming',
    bgHex: '#071923',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #0E2E40 0%, #09202D 50%, #071923 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F8FCFD 50%, #F0F9FA 100%)',
    ambientGlow: 'rgba(6, 182, 212, 0.25)',
    ambientGlowLight: 'rgba(6, 182, 212, 0.06)',
    accentColor: '#06B6D4',
    description: 'Luminous cyber cyan'
  },
  action_sports: {
    id: 'action_sports',
    name: 'Action & Sports',
    bgHex: '#220C0C',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #3F1515 0%, #2D0F0F 50%, #220C0C 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FDF9F9 50%, #FAF0F0 100%)',
    ambientGlow: 'rgba(239, 68, 68, 0.25)',
    ambientGlowLight: 'rgba(239, 68, 68, 0.06)',
    accentColor: '#EF4444',
    description: 'Dynamic energetic crimson'
  },
  date_spots: {
    id: 'date_spots',
    name: 'Date Spots & Romance',
    bgHex: '#0A0C16',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #2E0E2E 0%, #170B23 45%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 75% 0%, #FFFFFF 0%, #FEF8FA 50%, #FAEEF2 100%)',
    ambientGlow: 'rgba(244, 63, 94, 0.25)',
    ambientGlowLight: 'rgba(244, 63, 94, 0.06)',
    accentColor: '#F43F5E',
    description: 'Romantic rose & sunset blush'
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    name: 'Clubs & Lounges',
    bgHex: '#0A0C16',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #2A0F3D 0%, #160A27 40%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 75% 0%, #FFFFFF 0%, #FDF9FF 50%, #F6EEFB 100%)',
    ambientGlow: 'rgba(139, 92, 246, 0.28)',
    ambientGlowLight: 'rgba(139, 92, 246, 0.06)',
    accentColor: '#8B5CF6',
    description: 'Electric violet & twilight vibes'
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    name: 'Cafes & Bakeries',
    bgHex: '#140E0A',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFFDF8 50%, #FAF4EB 100%)',
    ambientGlow: 'rgba(217, 119, 6, 0.22)',
    ambientGlowLight: 'rgba(217, 119, 6, 0.06)',
    accentColor: '#D97706',
    description: 'Artisan roast amber'
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    name: 'Hotels & Luxury',
    bgHex: '#12100A',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2B210B 0%, #1B150A 50%, #12100A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFFEF9 50%, #FAF6EE 100%)',
    ambientGlow: 'rgba(234, 179, 8, 0.22)',
    ambientGlowLight: 'rgba(234, 179, 8, 0.06)',
    accentColor: '#EAB308',
    description: 'Warm champagne gold'
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    name: 'Vacation Escapes',
    bgHex: '#0B0F17',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #122248 0%, #0C1736 50%, #0B0F17 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F8FBFE 50%, #EEF5FB 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.25)',
    ambientGlowLight: 'rgba(59, 130, 246, 0.06)',
    accentColor: '#3B82F6',
    description: 'Tropical azure waters'
  },
  luku: {
    id: 'luku',
    name: 'Luku & Streetwear',
    bgHex: '#120D1A',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2A152E 0%, #1B0F22 50%, #120D1A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFFAF8 50%, #FAF0EC 100%)',
    ambientGlow: 'rgba(255, 87, 51, 0.25)',
    ambientGlowLight: 'rgba(255, 87, 51, 0.06)',
    accentColor: '#FF5733',
    description: 'Urban luxury coral & street style'
  }
};

/**
 * Resolves the CategoryMoodPalette for any category key, tab, or title.
 */
export function getCategoryMood(categoryOrVibe?: string, activeTab?: string): CategoryMoodPalette {
  if (activeTab === 'luku' && (!categoryOrVibe || categoryOrVibe === 'all')) {
    return CATEGORY_MOODS.luku;
  }

  if (!categoryOrVibe || categoryOrVibe === 'all') {
    return CATEGORY_MOODS.all;
  }

  const raw = categoryOrVibe.toLowerCase().trim();

  if (raw === 'luku' || raw === 'thrift' || raw === 'apparel' || raw === 'streetwear') {
    return CATEGORY_MOODS.luku;
  }

  if (raw === 'events' || raw === 'nightlife' || raw === 'concerts' || raw === 'cinemas' || raw === 'party') {
    return CATEGORY_MOODS.clubs_lounges;
  }

  if (raw === 'art') {
    return CATEGORY_MOODS.creative_leisure;
  }

  if (raw === 'gaming') {
    return CATEGORY_MOODS.tech_gaming;
  }

  if (raw === 'adrenaline' || raw === 'sports') {
    return CATEGORY_MOODS.action_sports;
  }

  const key = normalizeCategoryKey(raw);
  return CATEGORY_MOODS[key] || CATEGORY_MOODS.all;
}

