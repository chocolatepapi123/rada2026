export interface CategoryAccent {
  color: string;
  badge: string;
  pillClass: string;
  gradient?: string;
}

export function getCategoryAccent(category?: string, _title?: string, genre?: string): CategoryAccent {
  const cat = (category || '').toLowerCase();
  const gen = (genre || '').toLowerCase();

  if (cat.includes('night') || cat.includes('club') || gen.includes('dj') || gen.includes('electronic')) {
    return {
      color: '#A855F7',
      badge: 'Nightlife',
      pillClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      gradient: 'from-purple-500 to-indigo-500',
    };
  }

  if (cat.includes('music') || cat.includes('concert') || gen.includes('live')) {
    return {
      color: '#FF5733',
      badge: 'Music',
      pillClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      gradient: 'from-[#FF5733] to-[#FF8C00]',
    };
  }

  if (cat.includes('art') || cat.includes('cultural') || cat.includes('creative')) {
    return {
      color: '#EC4899',
      badge: 'Arts & Culture',
      pillClass: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
      gradient: 'from-pink-500 to-rose-500',
    };
  }

  if (cat.includes('food') || cat.includes('dining') || cat.includes('drinks')) {
    return {
      color: '#F59E0B',
      badge: 'Food & Drink',
      pillClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      gradient: 'from-amber-500 to-yellow-500',
    };
  }

  if (cat.includes('tech') || cat.includes('hackathon')) {
    return {
      color: '#3B82F6',
      badge: 'Tech',
      pillClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      gradient: 'from-blue-500 to-cyan-500',
    };
  }

  return {
    color: '#FF5733',
    badge: category || 'Event',
    pillClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    gradient: 'from-[#FF5733] to-[#FF8C00]',
  };
}

// Spot (venue) accents for the 17 categories: lib/spotAccentTheme.ts wraps lib/spotAccents.ts
// (tuned colours + dark-mode variables) and re-exports everything from it.
// Adjust the relative path if this file is not in src/utils/.
export * from '../lib/spotAccentTheme.ts';
