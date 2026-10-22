import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.ts';

/** The 10 RADA spot categories. Category filters match ONLY against these. */
export const RADA_CATEGORIES = [
  'restaurants_dining',
  'nature',
  'creative_leisure',
  'tech_gaming',
  'action_sports',
  'date_spots',
  'clubs_lounges',
  'cafes_bakeries',
  'hotels_luxury',
  'vacation_escapes',
] as const;
export type RadaCategory = (typeof RADA_CATEGORIES)[number];

/** Legacy / alias values -> canonical RADA category. */
const ALIASES: Record<string, RadaCategory> = {
  restaurants: 'restaurants_dining', dining: 'restaurants_dining', restaurants_dining: 'restaurants_dining',
  nature: 'nature', connect_with_nature: 'nature', outdoors: 'nature',
  creative_leisure: 'creative_leisure', creative_arts: 'creative_leisure', creative: 'creative_leisure', social_activities: 'creative_leisure',
  tech_gaming: 'tech_gaming', tech: 'tech_gaming', gaming: 'tech_gaming',
  action_sports: 'action_sports', outdoor_fitness: 'action_sports', sports: 'action_sports', action: 'action_sports',
  date_spots: 'date_spots', date: 'date_spots',
  clubs_lounges: 'clubs_lounges', nightlife: 'clubs_lounges', clubs: 'clubs_lounges', lounges: 'clubs_lounges', bars: 'clubs_lounges',
  cafes_bakeries: 'cafes_bakeries', cafes: 'cafes_bakeries', bakeries: 'cafes_bakeries',
  hotels_luxury: 'hotels_luxury', hotels: 'hotels_luxury', luxury: 'hotels_luxury', stays: 'hotels_luxury',
  vacation_escapes: 'vacation_escapes', vacation: 'vacation_escapes', escapes: 'vacation_escapes',
};

export function toCanonicalCategory(raw?: string | null): RadaCategory | null {
  return ALIASES[(raw || '').toLowerCase().trim()] ?? null;
}

/** True when the key means "no filter / everything" (used by View All for the trending list). */
export function isAllKey(key?: string | null): boolean {
  const k = (key || '').toLowerCase().trim();
  return !k || k === 'all' || k === 'spots' || k === 'trending';
}

/** Strict category match: the spot's own category must resolve to the requested RADA category. */
export function spotInCategory(spot: { category?: string | null }, key?: string | null): boolean {
  if (isAllKey(key)) return true;
  const want = toCanonicalCategory(key);
  if (!want) return false;
  return toCanonicalCategory(spot.category) === want;
}

/** Maps a Google-style label from `unclaimedspots.category` to a RADA category. Label first, name only as fallback. */
export function mapUnclaimedCategory(raw?: string | null, name?: string | null): string {
  const c = (raw || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const test = (re: RegExp) => re.test(c);

  if (test(/night ?club|lounge|\bbar\b|^bar|\bpub\b|liquor|casino|disco|karaoke|hookah|shisha/)) return 'clubs_lounges';
  if (test(/cafe|café|coffee|bakery|dessert|ice cream|tea house|patisserie|juice/)) return 'cafes_bakeries';
  if (test(/resort|campground|camp\b|safari|getaway|vacation|beach|retreat|eco ?lodge|cottage/)) return 'vacation_escapes';
  if (test(/hotel|lodging|guest ?house|accommodation|apartment|villa|hostel|\binn\b|motel|extended stay|serviced/)) return 'hotels_luxury';
  if (test(/restaurant|food|grill|diner|eatery|pizza|burger|steak|barbecue|bbq|nyama|kitchen|bistro|takeaway|meal/)) return 'restaurants_dining';
  if (test(/game|gaming|arcade|virtual reality|\bvr\b|esports|escape room/)) return 'tech_gaming';
  if (test(/sport|fitness|gym|kart|bowling|paintball|archery|swimming|golf|stadium|climbing|racing|trampoline/)) return 'action_sports';
  if (test(/art |art$|gallery|museum|pottery|craft|studio|paint|cultural|theatre|theater|cinema|workshop|library/)) return 'creative_leisure';
  if (test(/park|forest|garden|hiking|trail|wildlife|national|woods|nature|tourist|attraction|tour|travel agency|outdoor|cycling|waterfall|nature reserve|sanctuary/)) return 'nature';
  if (test(/rooftop|romantic|wine bar/)) return 'date_spots';

  // Label gave no signal: fall back to the venue name.
  if (/lounge|liquor|nightclub|night club|\bclub\b|\bpub\b/.test(n)) return 'clubs_lounges';
  if (/cafe|café|coffee|bakery/.test(n)) return 'cafes_bakeries';
  if (/hotel|suites|lodge|apartments/.test(n)) return 'hotels_luxury';
  if (/restaurant|grill|kitchen|bistro|eatery|pizza|burger/.test(n)) return 'restaurants_dining';
  return 'activities';
}

/** Best-effort area name from a Google-style address ("Street, Area, City, Country"). */
export function neighborhoodFromAddress(address?: string | null): string {
  const parts = String(address || '').split(',').map(p => p.trim()).filter(Boolean)
    .filter(p => !/^(nairobi|kenya|\d[\d\s-]*|.*\bcounty\b|\d{5}.*)$/i.test(p));
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Safely parses any openingHours format (string, array of { day, hours }, etc.) into a clean string.
 * Prevents React child render crashes when openingHours is an object or array of objects.
 */
export function formatOpeningHours(rawHours: any): string {
  if (!rawHours) return '';
  if (typeof rawHours === 'string') return rawHours.trim();
  if (Array.isArray(rawHours)) {
    if (rawHours.length === 0) return '';
    // If array of { day, hours } objects from Google Places scraper or database
    if (typeof rawHours[0] === 'object' && rawHours[0] !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      const todayEntry = rawHours.find((h: any) => h && String(h.day).toLowerCase() === today.toLowerCase());
      if (todayEntry && todayEntry.hours) {
        return `Today: ${todayEntry.hours}`;
      }
      const firstValid = rawHours.find((h: any) => h && h.hours);
      if (firstValid && firstValid.hours) {
        return `${firstValid.hours} (Daily)`;
      }
      return '';
    }
    // If array of strings
    if (typeof rawHours[0] === 'string') {
      return rawHours.filter(Boolean).join(' • ');
    }
  }
  if (typeof rawHours === 'object' && rawHours !== null) {
    if (rawHours.hours) return String(rawHours.hours);
  }
  return '';
}

/**
 * Dynamically enriches a spot with realistic, category-specific details (equipment needed/provided,
 * what to bring, skill level, consoles, work-friendly tags, dishes, etc.) matching the fields
 * that users/merchants provide when creating a spot listing.
 */
export function enrichSpotDetails(category: string, title: string = '', raw: any = {}) {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  const formattedRawHours = formatOpeningHours(raw.openingHours || raw.opening_hours);

  // If already specified on raw row, preserve it
  const base: Record<string, any> = {};

  if (c === 'nature' || c === 'connect_with_nature' || c === 'outdoors') {
    const isForestOrHike = /trail|hike|forest|falls|waterfall|cave|ridge|peak|mountain/.test(t);
    base.activityType = isForestOrHike ? 'Forest Trail & Hiking Expedition' : 'Nature Walk & Scenic Park';
    base.equipmentProvided = raw.equipmentProvided || raw.equipment_provided || 'Trail route maps at entry gate, walking poles/hiking sticks, rest stop benches, ranger on-call patrol';
    base.equipmentNeeded = raw.equipmentNeeded || raw.equipment_needed || 'Sturdy trail shoes or hiking boots, lightweight waterproof jacket, small daypack, reusable hydration bottle';
    base.whatToBring = raw.whatToBring || raw.what_to_bring || 'National ID/Passport for gate check-in, sunscreen, sunglasses, camera, power bank, trail energy snacks';
    base.skillLevel = raw.skillLevel || raw.skill_level || (isForestOrHike ? 'Moderate (Steep inclines & natural terrain)' : 'All Levels Welcome (Leisurely)');
    base.difficulty = isForestOrHike ? 'Moderate' : 'Easy';
    base.distanceDuration = isForestOrHike ? '5km - 15km marked trail loops • 2 to 4 hours' : '1.5km - 3km paved nature paths • 1 to 2 hours';
    base.meetingPoint = 'Main Visitors Center & Gate Ranger Station';
    base.openingHours = formattedRawHours || '06:00 AM - 06:00 PM Daily';
    base.tags = ['Nature Trail', 'Fresh Air', 'Scenic Views', 'Hiking', 'Bird Watching', 'Photography'];
    base.vibes = ['Peaceful', 'Scenic', 'Active', 'Outdoors'];
  } else if (c === 'action_sports' || c === 'activities' || c === 'outdoor_fitness') {
    const isBowling = /bowl/.test(t);
    const isKarting = /kart/.test(t);
    const isCombat = /paintball|archery|laser/.test(t);

    base.activityType = isBowling ? '10-Pin Bowling & Lounge Games' : isKarting ? 'Go-Karting Racing Circuit' : isCombat ? 'Tactical Action & Combat Arena' : 'Recreational Sports & Fitness';
    base.equipmentProvided = raw.equipmentProvided || raw.equipment_provided || (
      isBowling ? 'Professional bowling balls in all weights, sanitized rental bowling shoes' :
      isKarting ? 'DOT-certified racing helmets, neck braces, racing overalls, high-performance karts' :
      isCombat ? 'Tactical face masks, body armor, pressurized markers/bows, unlimited CO2 refills' :
      'All standard safety gear, balls, rackets, and play gear provided on-site'
    );
    base.equipmentNeeded = raw.equipmentNeeded || raw.equipment_needed || 'Athletic gym wear or comfortable sportswear, clean non-marking trainers, personal sweat towel, hydration flask';
    base.skillLevel = raw.skillLevel || raw.skill_level || 'All Levels Welcome (Inclusive & Beginner Friendly)';
    base.pricePerHour = raw.pricePerHour || raw.price_per_hour || (isBowling ? 'KES 500 / game / person' : isKarting ? 'KES 1,500 / 10-lap heat' : 'KES 1,000 / session');
    base.timeSlots = '45 - 60 min standard lane/court slots • Walk-in or reservation';
    base.openingHours = formattedRawHours || '09:00 AM - 10:00 PM Daily';
    base.tags = ['Sports', 'Fitness', 'Equipment Provided', 'Group Friendly', 'High Energy'];
    base.vibes = ['Active', 'Social', 'Competitive', 'Fun'];
  } else if (c === 'tech_gaming') {
    const isVR = /vr|virtual/.test(t);
    base.activityType = isVR ? 'Virtual Reality & Simulator Arena' : 'Console Gaming & Esports Lounge';
    base.gameConsoles = raw.gameConsoles || raw.game_consoles || 'PlayStation 5 Pro, Xbox Series X, High-End RTX 4080 Gaming Rigs, Meta Quest 3 VR, Logitech Racing Cockpits';
    base.availableGames = raw.availableGames || raw.available_games || 'EA FC 25, Tekken 8, Mortal Kombat 1, Call of Duty MW3, Gran Turismo 7, Beat Saber VR, Super Smash Bros';
    base.equipmentProvided = raw.equipmentProvided || raw.equipment_provided || 'Wireless DualSense controllers, noise-canceling headsets, sanitized VR face cushions, ultra-fast fibre Wi-Fi';
    base.equipmentNeeded = raw.equipmentNeeded || raw.equipment_needed || 'Personal gaming enthusiasm; optional login with your own PSN/Xbox live profiles';
    base.pricePerHour = raw.pricePerHour || raw.price_per_hour || (isVR ? 'KES 800 / 30-min VR pass' : 'KES 400 / hr console station');
    base.timeSlots = '30-min & 60-min sessions • Online and walk-in stations';
    base.openingHours = formattedRawHours || '10:00 AM - 11:00 PM Daily';
    base.tags = ['Console Gaming', 'VR Experience', 'Fast Wi-Fi', 'Esports', 'Multiplayer'];
    base.vibes = ['Gaming', 'High Tech', 'Chill', 'Interactive'];
  } else if (c === 'creative_leisure' || c === 'creative_arts') {
    const isPottery = /pottery|clay|ceramic/.test(t);
    base.activityType = isPottery ? 'Pottery Wheel & Glazing Studio' : 'Paint & Sip Acrylic Canvas Studio';
    base.craftActivities = raw.craftActivities || raw.craft_activities || (isPottery ? 'Clay wheel throwing, hand-building, ceramic trimming, underglaze painting' : 'Guided step-by-step canvas painting, fluid acrylic pouring, tote bag design');
    base.equipmentProvided = raw.equipmentProvided || raw.equipment_provided || 'Premium stretched canvases, acrylic paints, brushes, clay, pottery wheels, sculpting tools, artist aprons';
    base.equipmentNeeded = raw.equipmentNeeded || raw.equipment_needed || 'Casual clothing you do not mind getting paint or clay on; tote bag to take your dry artwork home';
    base.workshopDetails = raw.workshopDetails || raw.workshop_details || '2-hour relaxed studio session led by resident Kenyan artists; complimentary welcome drink included';
    base.activitySchedule = 'Daily workshops at 11:00 AM, 2:30 PM & 5:00 PM';
    base.openingHours = formattedRawHours || '10:00 AM - 08:00 PM Daily';
    base.tags = ['Art Studio', 'Painting', 'Pottery', 'Hands-On', 'Beginner Friendly'];
    base.vibes = ['Creative', 'Relaxing', 'Artistic', 'Inspiring'];
  } else if (c === 'cafes_bakeries' || c === 'cafes') {
    base.diningTypes = 'Artisan Bakery & Specialty Coffee Roastery';
    base.workFriendlyTags = raw.workFriendlyTags || raw.work_friendly_tags || [
      'High-Speed Wi-Fi (50+ Mbps)',
      'Plentiful Power Outlets',
      'Quiet Workspaces',
      'Specialty Coffee Roastery',
      'Outdoor Garden Seating'
    ];
    base.featuredDishes = raw.featuredDishes || raw.featured_dishes || [
      'Single Origin Kenyan AA Pour-Over',
      'Flaky Almond Croissant',
      'Sourdough Avocado & Poached Eggs',
      'Spiced Cardamom Nairobi Chai',
      'Toasted Chicken Pesto Panini'
    ];
    base.openingHours = formattedRawHours || '07:00 AM - 08:30 PM Daily';
    base.tags = ['Work Friendly', 'Fast Wi-Fi', 'Specialty Coffee', 'Quiet Workspace', 'Bakery'];
    base.vibes = ['Cozy', 'Productive', 'Aesthetic', 'Warm'];
  } else if (c === 'restaurants_dining' || c === 'restaurants') {
    base.diningTypes = 'Full Service Dining & Terrace Grill';
    base.cuisineTypes = raw.cuisineTypes || raw.cuisine_types || ['Contemporary Kenyan', 'Nyama Choma & Grills', 'Swahili Fusion', 'Continental & Steaks'];
    base.featuredDishes = raw.featuredDishes || raw.featured_dishes || [
      'Charcoal-Grilled Prime Ribeye',
      'Swahili Coconut Fish Curry',
      'Slow-Roasted Mbuzi Choma Platter',
      'Truffle Parmesan Herb Fries',
      'Signature Passion & Mint House Cooler'
    ];
    base.openingHours = formattedRawHours || '11:00 AM - 11:00 PM Daily';
    base.tags = ['Great Food', 'Outdoor Seating', 'Cocktails & Wine', 'Group Dining', 'Nyama Choma'];
    base.vibes = ['Delicious Food', 'Buzzing', 'Social', 'Welcoming'];
  } else if (c === 'date_spots') {
    base.diningTypes = 'Intimate Dining & Cocktail Terrace';
    base.atmosphereTags = raw.atmosphereTags || raw.atmosphere_tags || [
      'Romantic Candlelight',
      'Intimate Garden Seating',
      'Scenic Sunset Terrace',
      'Curated Wine & Cocktail Cellar',
      'Subtle Acoustic Ambience'
    ];
    base.bookingOptions = raw.bookingOptions || raw.booking_options || 'Table reservations recommended for dinner & sunset golden-hour slots';
    base.featuredDishes = raw.featuredDishes || raw.featured_dishes || [
      'Chef Curated 3-Course Tasting Menu',
      'Artisan Cheese & Charcuterie Board',
      'Pan-Seared Salmon on Asparagus',
      'Molten Chocolate Lava Fondant'
    ];
    base.openingHours = formattedRawHours || '12:00 PM - 11:30 PM Daily';
    base.tags = ['Romantic', 'Date Night', 'Candlelit', 'Scenic Views', 'Intimate'];
    base.vibes = ['Romantic', 'Intimate', 'Classy', 'Charming'];
  } else if (c === 'clubs_lounges' || c === 'nightlife') {
    base.diningTypes = 'Cocktail Lounge & Nightclub';
    base.nightlifeOptions = raw.nightlifeOptions || raw.nightlife_options || 'Resident & Guest DJs, Afro-House & Amapiano Sets, VIP Bottle Service, Open-Air Deck, Shisha Lounge';
    base.bottleServiceOptions = raw.bottleServiceOptions || raw.bottle_service_options || 'VIP Booth reservations with dedicated hostess service, premium spirits and sparklers';
    base.openingHours = formattedRawHours || '04:00 PM - 04:00 AM';
    base.tags = ['Nightlife', 'DJ Sets', 'Cocktails', 'Bottle Service', 'Weekend Vibes'];
    base.vibes = ['Upbeat', 'Electric', 'Party', 'Trendy'];
  } else if (c === 'hotels_luxury' || c === 'hotels') {
    base.roomTypes = raw.roomTypes || raw.room_types || 'Deluxe King Suite, Executive Balcony Room, Garden Villa, Penthouse Skyline View';
    base.amenitiesList = raw.amenitiesList || raw.amenities_list || [
      'Heated Infinity Pool',
      '24/7 Room & Concierge Service',
      'Luxury Spa & Wellness Sanctuary',
      'State-of-the-Art Fitness Center',
      'High-Speed Wi-Fi',
      'Airport Concierge Transfer'
    ];
    base.openingHours = formattedRawHours || '24 Hours Front Desk';
    base.tags = ['Luxury Stay', 'Heated Pool', 'Spa & Wellness', 'Fine Dining', 'Concierge'];
    base.vibes = ['Luxurious', 'Serene', 'Upscale', 'Pampering'];
  } else if (c === 'vacation_escapes' || c === 'vacation') {
    base.weekendGetawayDetails = raw.weekendGetawayDetails || raw.weekend_getaway_details || 'Secluded safari cottages, eco-lodges, outdoor evening bonfire pit, guided dawn bird walks, nature cycling';
    base.dayPassDetails = raw.dayPassDetails || raw.day_pass_details || 'Day passes available covering swimming pool, manicured gardens, nature trails, and poolside restaurant';
    base.openingHours = formattedRawHours || '24 Hours Guest Lodge';
    base.tags = ['Weekend Getaway', 'Nature Escape', 'Bonfire', 'Swimming Pool', 'Scenic Retreat'];
    base.vibes = ['Tranquil', 'Scenic', 'Escape', 'Rejuvenating'];
  }

  return base;
}

export function unclaimedRowToSpot(r: any) {
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((g: any) => typeof g === 'string' && g) : [];
  const cover = r.thumbnail || gallery[0] || '';
  const img = cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
  const category = mapUnclaimedCategory(r.category, r.name);
  const extraDetails = enrichSpotDetails(category, r.name, r);

  return {
    id: `unclaimed-${r.id}`,
    title: r.name || 'Untitled Spot',
    category,
    subcategory: r.category || undefined,
    neighborhood: neighborhoodFromAddress(r.address),
    address: r.address || '',
    description: r.description || r.category || 'Popular local spot in Nairobi.',
    lat: r.latitude ?? -1.2921,
    lng: r.longitude ?? 36.8219,
    price: r.price || 'Mid',
    img,
    images: gallery.length ? gallery : [img],
    hasRealPhoto: Boolean(cover),
    phone: r.phone || undefined,
    createdAt: r.created_at || undefined,
    is_claimed: false,
    status: 'approved',
    isUnclaimedImport: true,
    reviews: [],
    ...extraDetails,
    openingHours: formatOpeningHours(r.openingHours || r.opening_hours || extraDetails.openingHours) || 'Open Daily',
  };
}

// ---- Shared, cached loader so Home, Spots and View All all see the SAME full list ----
let cache: any[] | null = null;
let inflight: Promise<any[]> | null = null;
const listeners = new Set<(rows: any[]) => void>();

const PAGE = 1000;
const MAX_ROWS = 10000;

export async function loadUnclaimedSpots(force = false): Promise<any[]> {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows: any[] = [];
    let failed = false;
    try {
      if (supabase && isSupabaseConfigured) {
        // PostgREST caps a single response (usually 1000 rows), so page through the table.
        for (let from = 0; from < MAX_ROWS; from += PAGE) {
          const { data, error } = await supabase
            .from('unclaimedspots')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE - 1);
          if (error) {
            console.warn('unclaimedspots fetch error:', error.message);
            failed = true;
            break;
          }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < PAGE) break;
        }
      }

      // If Supabase returned rows, convert them
      if (rows.length > 0) {
        cache = rows.map(unclaimedRowToSpot);
        listeners.forEach(l => l(cache!));
      } else {
        // Fallback: load scraped places json if available
        try {
          const scrapedMod = await import('../../scraped_places.json');
          const rawPlaces = (scrapedMod.default || scrapedMod) as any[];
          if (Array.isArray(rawPlaces) && rawPlaces.length > 0) {
            cache = rawPlaces.map((p, idx) => {
              const category = mapUnclaimedCategory(p.categoryName || (p.categories && p.categories[0]), p.title);
              const extraDetails = enrichSpotDetails(category, p.title, p);
              const lat = p.location?.lat ?? -1.2921;
              const lng = p.location?.lng ?? 36.8219;
              const address = p.address || 'Nairobi, Kenya';
              const img = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop';
              return {
                id: `unclaimed-scraped-${idx + 1}`,
                title: p.title || 'Untitled Spot',
                category,
                subcategory: p.categoryName || undefined,
                neighborhood: p.neighborhood || neighborhoodFromAddress(address) || 'Nairobi',
                address,
                description: p.description || p.categoryName || 'Popular local spot in Nairobi.',
                lat,
                lng,
                price: p.price || 'Mid',
                rating: p.totalScore ? String(p.totalScore) : '4.4',
                img,
                images: [img],
                hasRealPhoto: false,
                phone: p.phone || undefined,
                is_claimed: false,
                status: 'approved',
                isUnclaimedImport: true,
                reviews: [],
                ...extraDetails,
                openingHours: formatOpeningHours(p.openingHours || extraDetails.openingHours) || 'Open Daily',
              };
            });
            listeners.forEach(l => l(cache!));
          }
        } catch (scrapedErr) {
          console.warn('Fallback scraped places import error:', scrapedErr);
        }
      }
    } finally {
      inflight = null;
    }
    return cache ?? [];
  })();
  return inflight;
}

/** React hook: all real spots from Supabase `unclaimedspots`, already mapped to SpotItem shape. */
export function useUnclaimedSpots(): { spots: any[]; loading: boolean; refresh: () => Promise<void> } {
  const [spots, setSpots] = useState<any[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const l = (rows: any[]) => { setSpots(rows); setLoading(false); };
    listeners.add(l);
    loadUnclaimedSpots().then(rows => { setSpots(rows); setLoading(false); });
    return () => { listeners.delete(l); };
  }, []);

  return { spots, loading, refresh: async () => { await loadUnclaimedSpots(true); } };
}

/** Merge merchant/user-created spots with real imported ones, de-duplicated by id and title. */
export function mergeSpots(local: any[], unclaimed: any[]): any[] {
  const ids = new Set(local.map(s => String(s.id)));
  const titles = new Set(local.map(s => (s.title || '').trim().toLowerCase()));
  const extra = unclaimed.filter(u => !ids.has(String(u.id)) && !titles.has((u.title || '').trim().toLowerCase()));
  return [...local, ...extra];
}

/** Trending order: spots with real photos first, newest first within each group. */
export function sortTrending<T extends { hasRealPhoto?: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(Boolean(b.hasRealPhoto)) - Number(Boolean(a.hasRealPhoto)));
}
