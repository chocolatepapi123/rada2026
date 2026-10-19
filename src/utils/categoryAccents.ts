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
    lightBg: '#140E0A',
    darkBg: '#F59E0B25',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    pillClass: 'bg-black/50 text-[#FCD34D] border border-[#F59E0B]/40 backdrop-blur-md',
    activeClass: 'bg-[#F59E0B] text-white shadow-sm font-black',
    icon: UtensilsCrossed
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    badge: 'Parks & Trails',
    color: '#10B981',
    lightBg: '#0D2018',
    darkBg: '#10B98125',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    pillClass: 'bg-black/50 text-[#6EE7B7] border border-[#10B981]/40 backdrop-blur-md',
    activeClass: 'bg-[#10B981] text-white shadow-sm font-black',
    icon: Trees
  },
  creative_leisure: {
    id: 'creative_leisure',
    label: 'Creative and leisure',
    badge: 'Art & Studios',
    color: '#D946EF',
    lightBg: '#1D0C22',
    darkBg: '#D946EF25',
    borderColor: 'rgba(217, 70, 239, 0.4)',
    pillClass: 'bg-black/50 text-[#F0ABFC] border border-[#D946EF]/40 backdrop-blur-md',
    activeClass: 'bg-[#D946EF] text-white shadow-sm font-black',
    icon: Palette
  },
  tech_gaming: {
    id: 'tech_gaming',
    label: 'Tech and Gaming',
    badge: 'Cyber & Gaming',
    color: '#06B6D4',
    lightBg: '#071923',
    darkBg: '#06B6D425',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    pillClass: 'bg-black/50 text-[#67E8F9] border border-[#06B6D4]/40 backdrop-blur-md',
    activeClass: 'bg-[#06B6D4] text-white shadow-sm font-black',
    icon: Gamepad2
  },
  action_sports: {
    id: 'action_sports',
    label: 'Action and sports',
    badge: 'Sports & Adrenaline',
    color: '#EF4444',
    lightBg: '#220C0C',
    darkBg: '#EF444425',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    pillClass: 'bg-black/50 text-[#FCA5A5] border border-[#EF4444]/40 backdrop-blur-md',
    activeClass: 'bg-[#EF4444] text-white shadow-sm font-black',
    icon: Dumbbell
  },
  date_spots: {
    id: 'date_spots',
    label: 'Date spots',
    badge: 'Romance & Dates',
    color: '#F43F5E',
    lightBg: '#0A0C16',
    darkBg: '#F43F5E25',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    pillClass: 'bg-black/50 text-[#FDA4AF] border border-[#F43F5E]/40 backdrop-blur-md',
    activeClass: 'bg-[#F43F5E] text-white shadow-sm font-black',
    icon: Heart
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    label: 'Clubs and lounges',
    badge: 'Nightlife & Lounges',
    color: '#A855F7',
    lightBg: '#0A0C16',
    darkBg: '#A855F725',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    pillClass: 'bg-black/50 text-[#D8B4FE] border border-[#A855F7]/40 backdrop-blur-md',
    activeClass: 'bg-[#A855F7] text-white shadow-sm font-black',
    icon: Music
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    label: 'Cafes and Bakeries',
    badge: 'Cafés & Pastries',
    color: '#D97706',
    lightBg: '#140E0A',
    darkBg: '#D9770625',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    pillClass: 'bg-black/50 text-[#FDE68A] border border-[#D97706]/40 backdrop-blur-md',
    activeClass: 'bg-[#D97706] text-white shadow-sm font-black',
    icon: Coffee
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    label: 'Hotels and luxury stays',
    badge: 'Stays & Luxury',
    color: '#EAB308',
    lightBg: '#12100A',
    darkBg: '#EAB30825',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    pillClass: 'bg-black/50 text-[#FEF08A] border border-[#EAB308]/40 backdrop-blur-md',
    activeClass: 'bg-[#EAB308] text-white shadow-sm font-black',
    icon: Hotel
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    label: 'Vacation spots and escapes',
    badge: 'Vacation & Getaways',
    color: '#3B82F6',
    lightBg: '#0A1128',
    darkBg: '#3B82F625',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    pillClass: 'bg-black/50 text-[#93C5FD] border border-[#3B82F6]/40 backdrop-blur-md',
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
  bgHex: string;             // Deep saturated base hex
  lightBgHex: string;        // Rich saturated tone (no pale tint)
  gradientDark: string;      // Atmospheric background gradient in dark mode
  gradientLight: string;     // Atmospheric background gradient
  ambientGlow: string;       // Radial ambient glow color
  accentColor: string;       // Vibrant category accent
  description: string;
}

export const CATEGORY_MOODS: Record<string, CategoryMoodPalette> = {
  all: {
    id: 'all',
    name: 'All Categories',
    bgHex: '#0A1128',
    lightBgHex: '#0A1128',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #121F48 0%, #0D1736 50%, #0A1128 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #121F48 0%, #0D1736 50%, #0A1128 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.22)',
    accentColor: '#FF5733',
    description: 'Deep midnight electric blue'
  },
  restaurants_dining: {
    id: 'restaurants_dining',
    name: 'Restaurants & Dining',
    bgHex: '#140E0A',
    lightBgHex: '#140E0A',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    ambientGlow: 'rgba(245, 158, 11, 0.22)',
    accentColor: '#F59E0B',
    description: 'Deep amber-bronze charcoal'
  },
  nature: {
    id: 'nature',
    name: 'Nature & Outdoors',
    bgHex: '#0D2018',
    lightBgHex: '#0D2018',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #16382A 0%, #0F271D 50%, #0D2018 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #16382A 0%, #0F271D 50%, #0D2018 100%)',
    ambientGlow: 'rgba(16, 185, 129, 0.25)',
    accentColor: '#10B981',
    description: 'Rich jungle olive green'
  },
  creative_leisure: {
    id: 'creative_leisure',
    name: 'Creative & Leisure',
    bgHex: '#1D0C22',
    lightBgHex: '#1D0C22',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #36153F 0%, #260E2D 50%, #1D0C22 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #36153F 0%, #260E2D 50%, #1D0C22 100%)',
    ambientGlow: 'rgba(217, 70, 239, 0.25)',
    accentColor: '#D946EF',
    description: 'Deep moody violet & magenta'
  },
  tech_gaming: {
    id: 'tech_gaming',
    name: 'Tech & Gaming',
    bgHex: '#071923',
    lightBgHex: '#071923',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #0E2E40 0%, #09202D 50%, #071923 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #0E2E40 0%, #09202D 50%, #071923 100%)',
    ambientGlow: 'rgba(6, 182, 212, 0.25)',
    accentColor: '#06B6D4',
    description: 'Cyber dark cyan & deep obsidian blue'
  },
  action_sports: {
    id: 'action_sports',
    name: 'Action & Sports',
    bgHex: '#220C0C',
    lightBgHex: '#220C0C',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #3F1515 0%, #2D0F0F 50%, #220C0C 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #3F1515 0%, #2D0F0F 50%, #220C0C 100%)',
    ambientGlow: 'rgba(239, 68, 68, 0.25)',
    accentColor: '#EF4444',
    description: 'Deep saturated crimson & charcoal'
  },
  date_spots: {
    id: 'date_spots',
    name: 'Date Spots & Romance',
    bgHex: '#0A0C16',
    lightBgHex: '#0A0C16',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #2E0E2E 0%, #170B23 45%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 75% 0%, #2E0E2E 0%, #170B23 45%, #0A0C16 100%)',
    ambientGlow: 'rgba(244, 63, 94, 0.25)',
    accentColor: '#F43F5E',
    description: 'Rich midnight blue with electric violet & sunset rose'
  },
  clubs_lounges: {
    id: 'clubs_lounges',
    name: 'Clubs & Lounges',
    bgHex: '#0A0C16',
    lightBgHex: '#0A0C16',
    gradientDark: 'radial-gradient(ellipse at 75% 0%, #2A0F3D 0%, #160A27 40%, #0A0C16 100%)',
    gradientLight: 'radial-gradient(ellipse at 75% 0%, #2A0F3D 0%, #160A27 40%, #0A0C16 100%)',
    ambientGlow: 'rgba(139, 92, 246, 0.28)',
    accentColor: '#8B5CF6',
    description: 'Rich midnight blue with glowing electric violet & sunset orange'
  },
  cafes_bakeries: {
    id: 'cafes_bakeries',
    name: 'Cafes & Bakeries',
    bgHex: '#140E0A',
    lightBgHex: '#140E0A',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #2D190B 0%, #1C110C 50%, #140E0A 100%)',
    ambientGlow: 'rgba(217, 119, 6, 0.22)',
    accentColor: '#D97706',
    description: 'Deep roasted amber & dark charcoal'
  },
  hotels_luxury: {
    id: 'hotels_luxury',
    name: 'Hotels & Luxury',
    bgHex: '#12100A',
    lightBgHex: '#12100A',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2B210B 0%, #1B150A 50%, #12100A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #2B210B 0%, #1B150A 50%, #12100A 100%)',
    ambientGlow: 'rgba(234, 179, 8, 0.22)',
    accentColor: '#EAB308',
    description: 'Royal obsidian with warm gold undertones'
  },
  vacation_escapes: {
    id: 'vacation_escapes',
    name: 'Vacation Escapes',
    bgHex: '#0A1128',
    lightBgHex: '#0A1128',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #122248 0%, #0C1736 50%, #0A1128 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #122248 0%, #0C1736 50%, #0A1128 100%)',
    ambientGlow: 'rgba(59, 130, 246, 0.25)',
    accentColor: '#3B82F6',
    description: 'Deep oceanic azure & midnight blue'
  },
  luku: {
    id: 'luku',
    name: 'Luku & Streetwear',
    bgHex: '#120D1A',
    lightBgHex: '#120D1A',
    gradientDark: 'radial-gradient(ellipse at 50% 0%, #2A152E 0%, #1B0F22 50%, #120D1A 100%)',
    gradientLight: 'radial-gradient(ellipse at 50% 0%, #2A152E 0%, #1B0F22 50%, #120D1A 100%)',
    ambientGlow: 'rgba(255, 87, 51, 0.25)',
    accentColor: '#FF5733',
    description: 'Deep urban asphalt with neon coral warmth'
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

