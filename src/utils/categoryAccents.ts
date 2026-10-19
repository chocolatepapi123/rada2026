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
    darkBg: '#F59E0B20',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    pillClass: 'bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 dark:bg-[#F59E0B20] dark:text-[#FCD34D] dark:border-[#F59E0B]/40',
    activeClass: 'bg-[#F59E0B] text-white shadow-sm font-black',
    icon: UtensilsCrossed
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    badge: 'Parks & Trails',
    color: '#10B981',
    lightBg: '#D1FAE5',
    darkBg: '#10B98120',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    pillClass: 'bg-[#D1FAE5] text-[#047857] border border-[#10B981]/30 dark:bg-[#10B98120] dark:text-[#6EE7B7] dark:border-[#10B981]/40',
    activeClass: 'bg-[#10B981] text-white shadow-sm font-black',
    icon: Trees
  },
  creative_leisure: {
    id: 'creative_leisure',
    label: 'Creative and leisure',
    badge: 'Art & Studios',
    color: '#D946EF',
    lightBg: '#FAE8FF',
    darkBg: '#D946EF20',
    borderColor: 'rgba(217, 70, 239, 0.4)',
    pillClass: 'bg-[#FAE8FF] text-[#A21CAF] border border-[#D946EF]/30 dark:bg-[#D946EF20] dark:text-[#F0ABFC] dark:border-[#D946EF]/40',
    activeClass: 'bg-[#D946EF] text-white shadow-sm font-black',
    icon: Palette
  },
  tech_gaming: {
    id: 'tech_gaming',
    label: 'Tech and Gaming',
    badge: 'Cyber & Gaming',
    color: '#06B6D4',
    lightBg: '#CFFAFE',
    darkBg: '#06B6D420',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    pillClass: 'bg-[#CFFAFE] text-[#0E7490] border border-[#06B6D4]/30 dark:bg-[#06B6D420] dark:text-[#67E8F9] dark:border-[#06B6D4]/40',
    activeClass: 'bg-[#06B6D4] text-white shadow-sm font-black',
    icon: Gamepad2
  },
  action_sports: {
    id: 'action_sports',
    label: 'Action and sports',
    badge: 'Sports & Adrenaline',
    color: '#EF4444',
    lightBg: '#FEE2E2',
    darkBg: '#EF444420',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    pillClass: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#EF4444]/30 dark:bg-[#EF444420] dark:text-[#FCA5A5] dark:border-[#EF4444]/40',
    activeClass: 'bg-[#EF4444] text-white shadow-sm font-black',
    icon: Dumbbell
  },
  date_spots: {
    id: 'date_spots',
    label: 'Date spots',
    badge: 'Romance & Dates',
    color: '#F43F5E',
    lightBg: '#FFE4E6',
    darkBg: '#F43F5E20',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    pillClass: 'bg-[#FFE4E6] text-[#BE123C] border border-[#F43F5E]/30 dark:bg-[#F43F5E20] dark:text-[#FDA4AF] dark:border-[#F43F5E]/40',
    activeClass: 'bg-[#F43F5E] text-white shadow-sm font-black',
    icon: Heart
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    label: 'Clubs and lounges',
    badge: 'Nightlife & Lounges',
    color: '#A855F7',
    lightBg: '#F3E8FF',
    darkBg: '#A855F720',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    pillClass: 'bg-[#F3E8FF] text-[#7E22CE] border border-[#A855F7]/30 dark:bg-[#A855F720] dark:text-[#D8B4FE] dark:border-[#A855F7]/40',
    activeClass: 'bg-[#A855F7] text-white shadow-sm font-black',
    icon: Music
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    label: 'Cafes and Bakeries',
    badge: 'Cafés & Pastries',
    color: '#D97706',
    lightBg: '#FEF3C7',
    darkBg: '#D9770620',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    pillClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/30 dark:bg-[#D9770620] dark:text-[#FDE68A] dark:border-[#D97706]/40',
    activeClass: 'bg-[#D97706] text-white shadow-sm font-black',
    icon: Coffee
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    label: 'Hotels and luxury stays',
    badge: 'Stays & Luxury',
    color: '#EAB308',
    lightBg: '#FEF9C3',
    darkBg: '#EAB30820',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    pillClass: 'bg-[#FEF9C3] text-[#854D0E] border border-[#EAB308]/30 dark:bg-[#EAB30820] dark:text-[#FEF08A] dark:border-[#EAB308]/40',
    activeClass: 'bg-[#EAB308] text-white shadow-sm font-black',
    icon: Hotel
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    label: 'Vacation spots and escapes',
    badge: 'Vacation & Getaways',
    color: '#3B82F6',
    lightBg: '#DBEAFE',
    darkBg: '#3B82F620',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    pillClass: 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#3B82F6]/30 dark:bg-[#3B82F620] dark:text-[#93C5FD] dark:border-[#3B82F6]/40',
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
  bgHex: string;             // Dark base hex
  lightBgHex: string;        // Light base hex
  gradientDark: string;      // Atmospheric background gradient in dark mode
  gradientLight: string;     // Atmospheric background gradient in light mode
  ambientGlow: string;       // Radial ambient glow color
  accentColor: string;       // Vibrant category accent
  description: string;
}

export const CATEGORY_MOODS: Record<string, CategoryMoodPalette> = {
  all: {
    id: 'all',
    name: 'All Categories',
    bgHex: '#0B0D13',
    lightBgHex: '#FAFAFC',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #151926 0%, #0E111A 55%, #0B0D13 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F6F8FB 55%, #ECEFF5 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.08)',
    accentColor: '#FF5733',
    description: 'Deep urban obsidian & midnight slate'
  },
  restaurants_dining: {
    id: 'restaurants_dining',
    name: 'Restaurants & Dining',
    bgHex: '#120E0A',
    lightBgHex: '#FFFBF5',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #251B12 0%, #19120D 55%, #120E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFF8EE 55%, #FEF3C7 100%)',
    ambientGlow: 'rgba(245, 158, 11, 0.12)',
    accentColor: '#F59E0B',
    description: 'Deep charcoal with a warm amber-bronze undertone'
  },
  nature: {
    id: 'nature',
    name: 'Nature & Outdoors',
    bgHex: '#0B1410',
    lightBgHex: '#F4FBF7',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #13271E 0%, #0E1B15 55%, #0B1410 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #EEF9F2 55%, #D1FAE5 100%)',
    ambientGlow: 'rgba(16, 185, 129, 0.12)',
    accentColor: '#10B981',
    description: 'Rich jungle olive & deep forest teal'
  },
  creative_leisure: {
    id: 'creative_leisure',
    name: 'Creative & Leisure',
    bgHex: '#140B13',
    lightBgHex: '#FDF4FF',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2A1227 0%, #1A0E1A 55%, #140B13 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FAF0FD 55%, #FAE8FF 100%)',
    ambientGlow: 'rgba(217, 70, 239, 0.12)',
    accentColor: '#D946EF',
    description: 'Deep midnight magenta & violet'
  },
  tech_gaming: {
    id: 'tech_gaming',
    name: 'Tech & Gaming',
    bgHex: '#0B1317',
    lightBgHex: '#F2FCFE',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #11252E 0%, #0D181D 55%, #0B1317 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #ECFAFD 55%, #CFFAFE 100%)',
    ambientGlow: 'rgba(6, 182, 212, 0.12)',
    accentColor: '#06B6D4',
    description: 'Electric cyber blue & deep navy'
  },
  action_sports: {
    id: 'action_sports',
    name: 'Action & Sports',
    bgHex: '#140A0A',
    lightBgHex: '#FFF5F5',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2A1010 0%, #1A0D0D 55%, #140A0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFF0F0 55%, #FEE2E2 100%)',
    ambientGlow: 'rgba(239, 68, 68, 0.12)',
    accentColor: '#EF4444',
    description: 'High-energy dark crimson & charcoal'
  },
  date_spots: {
    id: 'date_spots',
    name: 'Date Spots & Romance',
    bgHex: '#0A0C16',
    lightBgHex: '#F8F6FF',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #2B1138 0%, #160B24 45%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F5EEFF 55%, #EADBFF 100%)',
    ambientGlow: 'rgba(244, 63, 94, 0.14)',
    accentColor: '#F43F5E',
    description: 'Moody neon purple, deep rose & midnight blue'
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    name: 'Clubs & Lounges',
    bgHex: '#0A0C16',
    lightBgHex: '#F8F6FF',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #250F3B 0%, #140A26 40%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #F3ECFF 55%, #E9DEFF 100%)',
    ambientGlow: 'rgba(139, 92, 246, 0.15)',
    accentColor: '#8B5CF6',
    description: 'Moody neon purple, deep rose & midnight blue gradients'
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    name: 'Cafes & Bakeries',
    bgHex: '#120E0A',
    lightBgHex: '#FFFBF3',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #241A11 0%, #18120C 55%, #120E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFF7EC 55%, #FEF3C7 100%)',
    ambientGlow: 'rgba(217, 119, 6, 0.12)',
    accentColor: '#D97706',
    description: 'Deep roasted amber & dark charcoal'
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    name: 'Hotels & Luxury',
    bgHex: '#12100A',
    lightBgHex: '#FFFCF0',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #262111 0%, #19150D 55%, #12100A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FFFCE8 55%, #FEF9C3 100%)',
    ambientGlow: 'rgba(234, 179, 8, 0.12)',
    accentColor: '#EAB308',
    description: 'Royal obsidian with warm gold undertones'
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    name: 'Vacation Escapes',
    bgHex: '#0A1017',
    lightBgHex: '#F3F8FF',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #112136 0%, #0D1620 55%, #0A1017 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #EBF3FF 55%, #DBEAFE 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.12)',
    accentColor: '#3B82F6',
    description: 'Deep oceanic azure'
  },
  luku: {
    id: 'luku',
    name: 'Luku & Streetwear',
    bgHex: '#0E0C12',
    lightBgHex: '#FCF8FD',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #241421 0%, #160D17 55%, #0E0C12 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, #FAF0F9 55%, #F5E6F3 100%)',
    ambientGlow: 'rgba(255, 87, 51, 0.12)',
    accentColor: '#FF5733',
    description: 'Deep urban asphalt with neon coral/terracotta warmth'
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

