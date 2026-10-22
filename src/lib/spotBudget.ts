// Derives a budget tier for a spot when no real price is stored.
//
// Tiers keep the app's existing ids ('Low' | 'Mid' | 'High') so the Budget filter
// in SpotsTab keeps working. They are shown to users as Budget $ / Mid $$ / Luxury $$$.
//
// Rough per-person anchors in Nairobi (KES), from public cost guides:
//   Low  ($)   : kibanda / canteen meals ~200-500, casual cafes, free or cheap outdoors
//   Mid  ($$)  : sit-down restaurants ~1,000-3,500, typical bars, mid-range hotels
//   High ($$$) : fine dining ~5,000+, 5-star hotels, resorts and safari lodges

import { toBudget } from './budget.ts';

export type BudgetTier = 'Low' | 'Mid' | 'High';

type CatKey =
  | 'restaurants' | 'clubs' | 'cafes' | 'nature' | 'action'
  | 'tech' | 'hotels' | 'date' | 'creative' | 'vacation' | 'unknown';

const TIERS: BudgetTier[] = ['Low', 'Mid', 'High'];

function catKey(category: unknown): CatKey {
  const c = String(category ?? '').toLowerCase();
  if (/hotel|luxury/.test(c)) return 'hotels';
  if (/vacation|escape/.test(c)) return 'vacation';
  if (/club|lounge|night/.test(c)) return 'clubs';
  if (/cafe|café|bakery|bakeries|coffee/.test(c)) return 'cafes';
  if (/nature|outdoor|trail|hik/.test(c)) return 'nature';
  if (/action|sport|adrenaline/.test(c)) return 'action';
  if (/tech|gaming|game/.test(c)) return 'tech';
  if (/date/.test(c)) return 'date';
  if (/creative|leisure|art/.test(c)) return 'creative';
  if (/restaurant|dining|food|eat/.test(c)) return 'restaurants';
  return 'unknown';
}

const BASE: Record<CatKey, BudgetTier> = {
  restaurants: 'Mid',
  clubs: 'Mid',
  cafes: 'Low',
  nature: 'Low',
  action: 'Mid',
  tech: 'Mid',
  hotels: 'High',
  date: 'Mid',
  creative: 'Low',
  vacation: 'Mid',
  unknown: 'Mid',
};

const HIGH_WORDS = [
  'fine dining', 'steakhouse', 'steak house', 'sushi', 'omakase', 'nikkei', 'tasting menu',
  'michelin', 'five star', '5 star', '5-star', 'luxury', 'upscale', 'boutique', 'private villa',
  'resort', 'safari lodge', 'tented camp', 'villa', 'serena', 'hilton', 'marriott', 'sheraton',
  'hyatt', 'intercontinental', 'kempinski', 'radisson blu', 'sankara', 'ritz', 'four seasons',
  'giraffe manor', 'fairmont', 'sarova', 'sky lounge', 'skybar', 'champagne',
  'tribe hotel', 'hemingways', 'crowne plaza', 'ole-sereni', 'ole sereni', 'mgallery', 'curio collection',
  'autograph collection', 'hermosa', 'hidden hills', 'drexel', 'trademark hotel', 'four points',
];

const LOW_WORDS = [
  'kibanda', 'nyama choma', 'canteen', 'kienyeji', 'street food', 'fast food', 'food court',
  'eatery', 'juice', 'mama ', 'hostel', 'backpacker', 'guest house', 'guesthouse', 'lodging',
  'campsite', 'camp site', 'budget', 'cheap', 'affordable', 'public park', 'free entry',
  'kfc', 'chicken inn', 'pizza inn', 'java house', 'artcaffe', 'dormans',
];

// Areas where venues of the same type usually charge more / less.
const PREMIUM_AREAS = ['karen', 'runda', 'gigiri', 'muthaiga', 'kitisuru', 'rosslyn', 'loresho', 'two rivers', 'the hub'];
const VALUE_AREAS = ['eastleigh', 'kayole', 'umoja', 'donholm', 'githurai', 'kasarani', 'ruaka', 'rongai', 'kahawa', 'zimmerman', 'embakasi', 'roysambu', 'mirema', 'syokimau'];

function shift(tier: BudgetTier, by: number): BudgetTier {
  const i = Math.min(2, Math.max(0, TIERS.indexOf(tier) + by));
  return TIERS[i];
}

/** Derive a tier from category + name/description/area cues. Never returns undefined. */
export function deriveBudget(spot: any): BudgetTier {
  const key = catKey(spot?.category);
  let tier = BASE[key];

  const text = [spot?.title, spot?.name, spot?.description, spot?.address]
    .filter(Boolean).join(' ').toLowerCase();
  const area = String(spot?.neighborhood ?? '').toLowerCase();

  const hitsHigh = HIGH_WORDS.some(w => text.includes(w));
  const hitsLow = LOW_WORDS.some(w => text.includes(w));

  if (hitsHigh && !hitsLow) tier = 'High';
  else if (hitsLow && !hitsHigh) tier = 'Low';
  else if (!hitsHigh && !hitsLow) {
    // Nothing in the name told us, so nudge by area for categories where price varies a lot.
    const premium = PREMIUM_AREAS.some(a => area.includes(a) || text.includes(a));
    const value = VALUE_AREAS.some(a => area.includes(a) || text.includes(a));
    if (premium && ['date', 'clubs', 'cafes'].includes(key)) tier = shift(tier, 1);
    else if (value && ['restaurants', 'clubs', 'date', 'cafes', 'action'].includes(key)) tier = shift(tier, -1);
  }

  if (key === 'hotels') {
    // Hostels/guest houses are cheap, named luxury brands and premium areas are High, the rest Mid.
    if (hitsLow && !hitsHigh) tier = 'Low';
    else if (hitsHigh || PREMIUM_AREAS.some(a => area.includes(a))) tier = 'High';
    else tier = 'Mid';
  }

  // Activities and attractions rarely read as "luxury" even when the name says resort/villa.
  if (['nature', 'creative', 'tech', 'action'].includes(key) && tier === 'High') tier = 'Mid';

  return tier;
}

function isUnclaimed(spot: any): boolean {
  return Boolean(
    spot?.isUnclaimed || spot?.unclaimed ||
    spot?.is_claimed === false || spot?.isClaimed === false ||
    spot?.status === 'unclaimed' || spot?.source === 'unclaimed'
  );
}

/**
 * The budget tier to show for a spot.
 * Real merchant prices win; unclaimed/unpriced spots get a derived tier instead of a blanket "Mid".
 */
export function resolveSpotBudget(spot: any): BudgetTier {
  const explicit = String(toBudget(spot?.price) ?? '') as BudgetTier;
  if (TIERS.includes(explicit) && !isUnclaimed(spot)) return explicit;
  return deriveBudget(spot);
}

/** Label shown on badges. */
export function budgetBadge(tier: string | undefined | null): string {
  switch (tier) {
    case 'Low': return 'Budget $';
    case 'High': return 'Luxury $$$';
    case 'Mid': return 'Mid $$';
    default: return '';
  }
}
