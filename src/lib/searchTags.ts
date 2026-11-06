// Hidden search tags for places. Users never see these: they only widen what a search can find.
// Tags are derived automatically from each spot's own data (category, name, description, price tier),
// plus an optional manual list on the spot (searchTags / search_tags) that you can fill in from the database.

type AnySpot = Record<string, any>;

// [pattern tested against the spot's own text, tags it adds]
const RULES: [RegExp, string[]][] = [
  [/restaurant|grill|kitchen|eatery|diner|bistro|steak|nyama|choma|pizza|burger|sushi|ramen|curry|buffet|food|cuisine|brasserie|tavern|chicken|bbq|barbecue|seafood|noodle|taco|shawarma|kebab|dine/,
    ['restaurant', 'food', 'eat', 'eating', 'meal', 'hungry', 'lunch', 'dinner', 'dine in', 'dining', 'family', 'family friendly', 'kids', 'group', 'date', 'date night', 'takeaway', 'out', 'going out']],
  [/cafe|café|coffee|espresso|roaster|bakery|tea house|patisserie|dessert|ice cream|gelato|juice|smoothie|brunch|breakfast|pancake|waffle|croissant/,
    ['cafe', 'coffee', 'tea', 'brunch', 'breakfast', 'sipper', 'sip', 'sips', 'chill', 'cozy', 'quiet', 'laptop', 'wifi', 'work friendly', 'remote work', 'study', 'dessert', 'sweet', 'cheap date', 'date', 'morning', 'daytime', 'out']],
  [/\bbar\b|pub\b|lounge|taproom|brewery|wine|cocktail|whisk|rooftop bar|sports bar|karaoke|shisha|hookah|liquor|gin\b|beer/,
    ['bar', 'drinks', 'drink', 'alcohol', 'alcoholic', 'booze', 'beer', 'cocktails', 'sipper', 'sip', 'night', 'nightlife', 'out', 'going out', 'hangout', 'vibes', 'date', 'after work', 'happy hour', '21+', '18+', 'adults only']],
  [/club|nightclub|\bdj\b|dance floor|disco|afrobeat|amapiano/,
    ['club', 'party', 'dance', 'dj', 'night', 'nightlife', 'late night', 'alcohol', 'turn up', 'out', 'going out', '21+', '18+', 'adults only']],
  [/rooftop|skyline|sunset|terrace|view\b|views\b|panoram/,
    ['rooftop', 'views', 'scenic', 'sunset', 'romantic', 'classy date', 'date night', 'date', 'photos', 'instagrammable']],
  [/fine dining|luxury|five.?star|5.?star|champagne|tasting menu|chef|michelin|upscale|exclusive|boutique hotel|premium/,
    ['classy date', 'fancy', 'upscale', 'romantic', 'date night', 'anniversary', 'special occasion', 'expensive date', 'luxury', 'fine dining', 'dress up']],
  [/park|garden|nature|trail|hike|forest|zoo|safari|farm|picnic|lake|waterfall|botanical|camp|reserve|sanctuary|outdoor/,
    ['outdoor', 'outdoors', 'nature', 'fresh air', 'walk', 'picnic', 'family', 'family friendly', 'kids', 'free', 'cheap date', 'date', 'weekend', 'daytime', 'out', 'things to do']],
  [/kids|children|playground|play area|amusement|arcade|trampoline|bounce|go.?kart|splash|water park|petting|theme park|play land|playland/,
    ['kids', 'children', 'family', 'family friendly', 'all ages', 'fun', 'weekend', 'play', 'activities', 'out', 'things to do']],
  [/cinema|movie|theatre|theater|imax|bowling|gaming|escape room|mini golf|ice skating|paintball|laser|activity|arcade/,
    ['movie', 'movies', 'cinema', 'date', 'cheap date', 'out', 'fun', 'activity', 'activities', 'group', 'friends', 'family', 'things to do']],
  [/spa\b|massage|salon|sauna|yoga|wellness|pamper|facial|barber/,
    ['spa', 'relax', 'wellness', 'self care', 'pamper', 'treat yourself', 'couples', 'date', 'massage', 'calm']],
  [/hotel|resort|lodge|bnb|villa|getaway|cottage|stay\b|apartment|guest ?house/,
    ['hotel', 'stay', 'staycation', 'getaway', 'weekend', 'romantic', 'couples', 'overnight', 'accommodation', 'family', 'sleep']],
  [/thrift|boutique|store|shop|market|mall|vintage|apparel|fashion|clothes|sneaker|mitumba/,
    ['shopping', 'thrift', 'fashion', 'clothes', 'window shopping', 'mall', 'market', 'out', 'things to do']],
  [/museum|gallery|art\b|culture|heritage|exhibit|library|book ?shop|history|monument/,
    ['culture', 'art', 'museum', 'quiet', 'learn', 'education', 'cheap date', 'date', 'family', 'kids', 'things to do']],
  [/live music|band|jazz|open mic|stage|concert|comedy|stand.?up|performance|acoustic|reggae/,
    ['live music', 'music', 'entertainment', 'concert', 'night', 'out', 'date', 'vibes', 'comedy']],
  [/nyama|choma|kienyeji|ugali|swahili|mandazi|githeri|pilau|local eats|kenyan/,
    ['nyama choma', 'local food', 'kenyan', 'african', 'traditional', 'authentic', 'family', 'group']],
  [/sports bar|football|premier league|\bepl\b|pool table|darts|match day|big screen/,
    ['sports', 'football', 'watch the game', 'match day', 'pool', 'beer', 'friends', 'night']],
  [/24 ?hours|24\/7|late|midnight|night market|after hours/,
    ['late night', 'open late', 'after hours', 'night']],
  [/pet|dog/, ['pet friendly', 'dogs', 'dog friendly']],
  [/wifi|wi-fi|co-?work|laptop/, ['wifi', 'work friendly', 'remote work', 'laptop', 'study']],
  [/halal/, ['halal', 'muslim friendly']],
  [/vegan|vegetarian|plant.?based/, ['vegan', 'vegetarian', 'plant based', 'healthy']],
  [/live band|karaoke/, ['karaoke', 'singing', 'fun', 'friends']],
];

// Always on: very broad terms so "out", "places", "things to do" never come back empty.
const BASE = ['out', 'going out', 'hangout', 'places', 'spots', 'things to do', 'nairobi'];

const BUDGET_TAGS: Record<string, string[]> = {
  free: ['free', 'cheap', 'no cost', 'cheap date', 'budget', 'affordable'],
  low: ['cheap', 'cheap date', 'budget', 'affordable', 'pocket friendly', 'low cost', 'student friendly', 'low priced'],
  mid: ['mid range', 'moderate', 'reasonable', 'date', 'worth it'],
  high: ['expensive', 'expensive date', 'splurge', 'premium', 'luxury', 'high end', 'upscale', 'classy date', 'fancy', 'special occasion'],
};

const FIELDS = ['category', 'subcategory', 'type', 'cuisine', 'vibe', 'amenities', 'landmark', 'exactLocationTag', 'title', 'description'];

const flat = (v: any): string => (Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v));

const cache = new WeakMap<object, string>();

/** All hidden tags for a spot, as one lowercase string (never shown to users). */
export function spotHiddenTags(spot: AnySpot, budget?: string | null): string {
  const hit = cache.get(spot);
  if (hit !== undefined) return hit;

  const text = FIELDS.map((f) => flat(spot[f])).join(' ').toLowerCase();
  const tags = new Set<string>(BASE);
  for (const [re, add] of RULES) if (re.test(text)) add.forEach((t) => tags.add(t));

  const b = String(budget ?? spot.budget ?? '').toLowerCase();
  (BUDGET_TAGS[b] || []).forEach((t) => tags.add(t));

  // Manual tags you add in the database (array or comma/space separated string)
  [spot.searchTags, spot.search_tags, spot.tags].forEach((m) => {
    flat(m).toLowerCase().split(/[,;\n]+/).forEach((t) => t.trim() && tags.add(t.trim()));
  });

  const out = Array.from(tags).join(' | ');
  cache.set(spot, out);
  return out;
}

const STOP = new Set(['the', 'a', 'an', 'for', 'in', 'at', 'near', 'me', 'to', 'and', 'with', 'of', 'best', 'good', 'great', 'nice', 'place', 'places', 'spot', 'spots', 'some', 'any', 'my', 'i', 'want', 'looking', 'find']);

/** Query -> clean tokens ("best brunch spots near me" -> ["brunch"]); plurals folded, "21+" kept. */
export function queryTokens(query: string): string[] {
  const raw = query.toLowerCase().replace(/[^a-z0-9+\s]/g, ' ').split(/\s+/).filter(Boolean);
  const fold = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
  const kept = raw.filter((t) => !STOP.has(t));
  return (kept.length ? kept : raw).map(fold);
}

/**
 * How well a spot matches a search. 0 = no match.
 * Name > area > description > hidden tags. A phrase hit ("cheap date") scores extra.
 * `strict` needs every word to match; relaxed needs any word.
 */
export function spotSearchScore(spot: AnySpot, query: string, budget?: string | null, strict = true): number {
  const tokens = queryTokens(query);
  if (!tokens.length) return 1;

  const title = flat(spot.title).toLowerCase();
  const area = `${flat(spot.neighborhood)} ${flat(spot.address)} ${flat(spot.landmark)}`.toLowerCase();
  const desc = `${flat(spot.description)} ${flat(spot.category)}`.toLowerCase();
  const hidden = spotHiddenTags(spot, budget);

  let total = 0;
  let matched = 0;
  for (const t of tokens) {
    const s = title.includes(t) ? 10 : area.includes(t) ? 6 : desc.includes(t) ? 4 : hidden.includes(t) ? 2 : 0;
    if (s) matched++;
    total += s;
  }
  if (strict ? matched < tokens.length : matched === 0) return 0;

  const phrase = tokens.join(' ');
  if (tokens.length > 1 && hidden.includes(phrase)) total += 3;
  return total;
}

/** Filter + rank (best first). Falls back to "any word" when nothing matches every word. */
export function searchSpots<T extends AnySpot>(spots: T[], query: string, budgetOf?: (s: T) => string | null): T[] {
  const run = (strict: boolean) =>
    spots
      .map((s, i) => ({ s, i, score: spotSearchScore(s, query, budgetOf?.(s), strict) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((x) => x.s);
  const strictHits = run(true);
  return strictHits.length ? strictHits : run(false);
}
