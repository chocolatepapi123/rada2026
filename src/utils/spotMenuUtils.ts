import { SpotItem } from '../types.ts';

export interface SpotMenuHeading {
  title: string;
  subtitle: string;
  badge: string;
  itemFallbackName: string;
}

export function getSpotMenuHeading(spot: Partial<SpotItem>): SpotMenuHeading {
  const cat = (spot.category || '').toLowerCase();
  const title = (spot.title || '').toLowerCase();

  // 1. Gaming / VR / Arcade / Simulator
  if (
    title.includes('vr') ||
    title.includes('simulator') ||
    title.includes('arcade') ||
    title.includes('virtual reality') ||
    (cat === 'social_activities' && (title.includes('game') || title.includes('gaming')))
  ) {
    return {
      title: 'Gaming Sessions & Rates',
      subtitle: 'VR experiences, motion simulators & multiplayer packages',
      badge: 'Game Rates',
      itemFallbackName: 'VR / Game Session'
    };
  }

  // 2. Tactical Paintball & Archery
  if (
    title.includes('paintball') ||
    title.includes('archery') ||
    title.includes('tactical') ||
    title.includes('laser tag')
  ) {
    return {
      title: 'Activity Packages & Battle Rates',
      subtitle: 'Combat rounds, gear rentals & squad elimination passes',
      badge: 'Field Rates',
      itemFallbackName: 'Combat Package'
    };
  }

  // 3. Paint & Sip / Creative Art Studios
  if (
    title.includes('paint & sip') ||
    title.includes('paint') ||
    title.includes('pottery') ||
    title.includes('canvas') ||
    title.includes('art studio')
  ) {
    return {
      title: 'Art Experiences, Packages & Sips',
      subtitle: 'Canvas materials, guided step-by-step sessions & refreshments',
      badge: 'Experiences',
      itemFallbackName: 'Sip & Paint Session'
    };
  }

  // 4. Outdoor Activities, Forests, Parks & Trails
  if (
    cat === 'outdoors' ||
    title.includes('forest') ||
    title.includes('trail') ||
    title.includes('arboretum') ||
    title.includes('nature') ||
    title.includes('biking') ||
    title.includes('canopy') ||
    title.includes('waterfall')
  ) {
    return {
      title: 'Entry Passes, Rentals & Trail Activities',
      subtitle: 'Park permits, mountain bike hire & guided nature tours',
      badge: 'Passes & Hire',
      itemFallbackName: 'Park Pass / Activity'
    };
  }

  // 5. General Social Activities
  if (cat === 'social_activities') {
    return {
      title: 'Popular Experiences & Group Packages',
      subtitle: 'Squad sessions, tickets & group rates',
      badge: 'Experiences',
      itemFallbackName: 'Experience Package'
    };
  }

  // 6. Cafes & Coffee Shops
  if (cat === 'cafes' || title.includes('cafe') || title.includes('coffee')) {
    return {
      title: 'Specialty Coffees, Brunch & Bakery',
      subtitle: 'Barista specialty brews, breakfast plates & artisan pastries',
      badge: 'Coffee & Brunch',
      itemFallbackName: 'Signature Brew'
    };
  }

  // 7. Nightlife, Clubs & Cocktail Bars
  if (cat === 'nightlife' || title.includes('bar') || title.includes('lounge') || title.includes('club')) {
    return {
      title: 'Signature Cocktails, Drinks & Bar Bites',
      subtitle: 'Handcrafted dawa cocktails, spirits & shared platters',
      badge: 'Drinks & Cocktails',
      itemFallbackName: 'Cocktail / Drink'
    };
  }

  // 8. Hotels & Resorts
  if (cat === 'hotels' || cat === 'vacation') {
    return {
      title: 'Dining Highlights & Leisure Offerings',
      subtitle: 'Chef specialties, day pass access & signature refreshments',
      badge: 'Dining & Leisure',
      itemFallbackName: 'Resort Specialty'
    };
  }

  // 9. Standard Food & Dining
  return {
    title: 'Popular Dishes & Drinks',
    subtitle: 'Signature culinary specialties, drinks & desserts',
    badge: 'Menu Highlights',
    itemFallbackName: 'Signature Dish'
  };
}
