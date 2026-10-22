import { SpotItem } from '../types';

/**
 * In-app tags automatically assigned to spots for intelligent search matching.
 * NOTE: These tags are strictly indexing metadata and must NEVER be displayed or visible to users.
 */

const INTENT_TAG_MAP: Record<string, string[]> = {
  date: [
    'date', 'dates', 'date night', 'romantic', 'couples', 'cozy', 'intimate',
    'candlelight', 'dinner date', 'coffee date', 'anniversary', 'first date',
    'valentines', 'two people', 'lovers', 'romantic dinner'
  ],
  work: [
    'work', 'working', 'remote work', 'laptop', 'laptop friendly', 'study',
    'studying', 'wifi', 'quiet', 'plugs', 'sockets', 'coffee shop', 'coworking',
    'productive', 'reading', 'fast wifi'
  ],
  drinks: [
    'drinks', 'drinking', 'cocktails', 'cocktail', 'beer', 'beers', 'wine',
    'bar', 'club', 'party', 'nightlife', 'rave', 'turn up', 'happy hour',
    'shots', 'dj', 'dance', 'weekend', 'vibes', 'amapiano', 'afrobeat', 'shisha'
  ],
  budget: [
    'cheap', 'budget', 'affordable', 'budget friendly', 'cheap eats',
    'student friendly', 'pocket friendly', 'low price', 'economical'
  ],
  luxury: [
    'luxury', 'fancy', 'upscale', 'fine dining', 'expensive', 'high end',
    'classy', 'aesthetic', 'instagrammable', 'bougie', 'vip', 'rooftop', 'premium'
  ],
  nature: [
    'nature', 'outdoor', 'outdoors', 'green', 'chill', 'relaxing', 'peaceful',
    'calm', 'fresh air', 'scenic', 'view', 'views', 'park', 'picnic', 'forest',
    'walk', 'hike', 'hiking', 'trail', 'waterfall', 'garden'
  ],
  sports: [
    'sports', 'games', 'gaming', 'action', 'bowling', 'arcade', 'pool',
    'snooker', 'padel', 'paintball', 'karting', 'active', 'play', 'squad',
    'vr', 'ps5', 'gym'
  ],
  family: [
    'family', 'kids', 'family friendly', 'children', 'playground', 'all ages', 'sunday family'
  ],
  brunch: [
    'brunch', 'breakfast', 'pancakes', 'waffles', 'eggs benedict', 'pastries', 'croissant'
  ],
};

const CUISINE_TAG_MAP: Record<string, string[]> = {
  pizza: ['pizza', 'pasta', 'italian'],
  sushi: ['sushi', 'japanese', 'ramen', 'asian'],
  burger: ['burger', 'burgers', 'fries', 'fast food', 'wings'],
  nyama: ['nyama choma', 'choma', 'ugali', 'local food', 'african', 'swahili', 'kenyan'],
  seafood: ['seafood', 'fish', 'prawns', 'calamari'],
  indian: ['indian', 'curry', 'naan', 'tikka', 'biryani'],
  ethiopian: ['ethiopian', 'injera', 'habesha'],
  mexican: ['mexican', 'tacos', 'nachos'],
  dessert: ['dessert', 'cake', 'ice cream', 'gelato', 'bakery'],
};

export function getSpotSearchTags(spot: Partial<SpotItem>): string[] {
  const tags = new Set<string>();

  if (Array.isArray((spot as any)?.searchTags)) {
    (spot as any).searchTags.forEach((t: string) => tags.add(String(t).toLowerCase().trim()));
  }
  if (Array.isArray((spot as any)?.hiddenTags)) {
    (spot as any).hiddenTags.forEach((t: string) => tags.add(String(t).toLowerCase().trim()));
  }

  const category = (spot.category || '').toLowerCase();
  const title = (spot.title || '').toLowerCase();
  const desc = (spot.description || '').toLowerCase();
  const neighborhood = (spot.neighborhood || '').toLowerCase();
  const price = (spot.price || '').toLowerCase();
  const activity = (spot.activityType || '').toLowerCase();
  const equip = (spot.equipmentProvided || '').toLowerCase();
  const combined = `${title} ${desc} ${neighborhood} ${price} ${activity} ${equip}`;

  if (
    category === 'restaurants' ||
    category === 'restaurants_dining' ||
    category === 'cafes_bakeries' ||
    category === 'hotels_luxury' ||
    combined.includes('romantic') ||
    combined.includes('intimate') ||
    combined.includes('wine') ||
    combined.includes('candle') ||
    combined.includes('cozy') ||
    combined.includes('view') ||
    combined.includes('rooftop') ||
    combined.includes('date') ||
    combined.includes('cocktail') ||
    combined.includes('garden') ||
    combined.includes('sunset') ||
    combined.includes('italian') ||
    combined.includes('fine dining')
  ) {
    INTENT_TAG_MAP.date.forEach(t => tags.add(t));
  }

  if (
    category === 'cafes_bakeries' ||
    category === 'creative_leisure' ||
    combined.includes('coffee') ||
    combined.includes('wifi') ||
    combined.includes('wi-fi') ||
    combined.includes('laptop') ||
    combined.includes('work') ||
    combined.includes('socket') ||
    combined.includes('plug') ||
    combined.includes('quiet') ||
    combined.includes('brew') ||
    combined.includes('bakery') ||
    combined.includes('workspace') ||
    combined.includes('study')
  ) {
    INTENT_TAG_MAP.work.forEach(t => tags.add(t));
  }

  if (
    category === 'clubs_lounges' ||
    combined.includes('bar') ||
    combined.includes('lounge') ||
    combined.includes('cocktail') ||
    combined.includes('beer') ||
    combined.includes('dj') ||
    combined.includes('party') ||
    combined.includes('dance') ||
    combined.includes('nightlife') ||
    combined.includes('shots') ||
    combined.includes('amapiano') ||
    combined.includes('shisha')
  ) {
    INTENT_TAG_MAP.drinks.forEach(t => tags.add(t));
  }

  if (
    combined.includes('budget') ||
    combined.includes('cheap') ||
    combined.includes('affordable') ||
    combined.includes('pocket friendly') ||
    price.includes('budget') ||
    price.includes('kes 500') ||
    price.includes('kes 700') ||
    price.includes('kes 1,000') ||
    price.includes('0 - 1,000')
  ) {
    INTENT_TAG_MAP.budget.forEach(t => tags.add(t));
  }

  if (
    category === 'hotels_luxury' ||
    combined.includes('luxury') ||
    combined.includes('upscale') ||
    combined.includes('fine dining') ||
    combined.includes('chic') ||
    combined.includes('rooftop') ||
    price.includes('luxury') ||
    price.includes('3,000+')
  ) {
    INTENT_TAG_MAP.luxury.forEach(t => tags.add(t));
  }

  if (
    category === 'nature' ||
    category === 'connect_with_nature' ||
    category === 'vacation_escapes' ||
    combined.includes('nature') ||
    combined.includes('forest') ||
    combined.includes('trail') ||
    combined.includes('waterfall') ||
    combined.includes('park') ||
    combined.includes('green') ||
    combined.includes('trees') ||
    combined.includes('picnic') ||
    combined.includes('outdoor') ||
    combined.includes('chill')
  ) {
    INTENT_TAG_MAP.nature.forEach(t => tags.add(t));
  }

  if (
    category === 'action_sports' ||
    category === 'tech_gaming' ||
    combined.includes('bowling') ||
    combined.includes('arcade') ||
    combined.includes('gaming') ||
    combined.includes('sports') ||
    combined.includes('pool') ||
    combined.includes('snooker') ||
    combined.includes('padel') ||
    combined.includes('karting') ||
    combined.includes('paintball') ||
    combined.includes('ps5') ||
    combined.includes('vr')
  ) {
    INTENT_TAG_MAP.sports.forEach(t => tags.add(t));
  }

  if (
    combined.includes('family') ||
    combined.includes('kids') ||
    combined.includes('children') ||
    combined.includes('playground')
  ) {
    INTENT_TAG_MAP.family.forEach(t => tags.add(t));
  }

  if (
    combined.includes('brunch') ||
    combined.includes('breakfast') ||
    combined.includes('pancake') ||
    combined.includes('pastry') ||
    combined.includes('waffle')
  ) {
    INTENT_TAG_MAP.brunch.forEach(t => tags.add(t));
  }

  Object.entries(CUISINE_TAG_MAP).forEach(([key, cuisineTags]) => {
    if (combined.includes(key)) {
      cuisineTags.forEach(t => tags.add(t));
    }
  });

  return Array.from(tags);
}

export function spotMatchesSearchWithTags(spot: SpotItem, searchQuery: string): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const q = searchQuery.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length > 1 && !['in', 'at', 'near', 'the', 'for', 'and'].includes(w));
  if (words.length === 0) return true;

  const title = (spot.title || '').toLowerCase();
  const neighborhood = (spot.neighborhood || '').toLowerCase();
  const address = (spot.address || '').toLowerCase();
  const exactLocationTag = (spot.exactLocationTag || '').toLowerCase();
  const landmark = (spot.landmark || '').toLowerCase();
  const desc = (spot.description || '').toLowerCase();
  const cat = (spot.category || '').toLowerCase();
  const price = (spot.price || '').toLowerCase();

  const cuisineTypes = (spot.cuisineTypes || []).map(c => String(c).toLowerCase());
  const featuredDishes = (spot.featuredDishes || []).map(d => String(d).toLowerCase());
  const amenitiesAV = (spot.amenitiesAV || []).map(a => String(a).toLowerCase());
  const menuItems = (spot.menuItems || []).map(m => `${m.name || ''} ${m.description || ''}`.toLowerCase());

  // In-app tags automatically assigned (never shown in UI)
  const hiddenTags = getSpotSearchTags(spot);

  if (
    title.includes(q) ||
    neighborhood.includes(q) ||
    address.includes(q) ||
    exactLocationTag.includes(q) ||
    landmark.includes(q) ||
    desc.includes(q) ||
    cat.includes(q) ||
    price.includes(q) ||
    hiddenTags.some(t => t.includes(q) || q.includes(t)) ||
    cuisineTypes.some(c => c.includes(q)) ||
    featuredDishes.some(d => d.includes(q)) ||
    amenitiesAV.some(a => a.includes(q)) ||
    menuItems.some(m => m.includes(q))
  ) {
    return true;
  }

  return words.every(word => {
    return (
      title.includes(word) ||
      neighborhood.includes(word) ||
      address.includes(word) ||
      exactLocationTag.includes(word) ||
      landmark.includes(word) ||
      desc.includes(word) ||
      cat.includes(word) ||
      price.includes(word) ||
      hiddenTags.some(t => t.includes(word)) ||
      cuisineTypes.some(c => c.includes(word)) ||
      featuredDishes.some(d => d.includes(word)) ||
      amenitiesAV.some(a => a.includes(word)) ||
      menuItems.some(m => m.includes(word))
    );
  });
}
