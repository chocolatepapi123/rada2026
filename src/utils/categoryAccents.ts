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
