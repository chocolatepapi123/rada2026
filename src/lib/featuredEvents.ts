import type { EventItem } from '../types.ts';

const POSTERS = {
  solfest: 'https://weareafr0.co.ke/solfestpics/solfestvip.png',
  kodong: 'https://houseofkodong.africa/assets/img/poster-ahod-1200.ce2c31ce.webp',
  detty: 'https://weareafr0.co.ke/DettyDezembaFestPoster.jpeg',
  keinemusik: 'https://images.ra.co/971dbfd1726eb2ca9a5d87df2d182901cfea07d1.png',
};

const featured = (raw: EventItem): EventItem => {
  const event = withEventPoster(raw);
  return {
    ...event,
    tags: [...(event.tags || []), 'rada-featured'],
    images: event.images?.length ? event.images : [event.img],
  };
};

interface Extra {
  id: string; title: string; match: RegExp; cat: 'concerts' | 'nightlife' | 'arts' | 'food' | 'community' | 'sports';
  genre: string; start: string; end?: string; label: string; time?: string; location: string;
  url: string; host?: string; price?: number | null; tier?: string; description: string; tags: string[];
}

/** Builds a featured card from compact data. Day-only events run 00:00-23:59 Nairobi time. */
const extra = (x: Extra): EventItem => {
  const legacy = x.cat === 'concerts' ? 'concerts' : x.cat === 'nightlife' ? 'nightlife' : x.cat === 'sports' ? 'sports' : 'art';
  return featured({
    id: x.id, title: x.title, category: legacy, genre: x.genre, date: x.label, time: x.time,
    location: x.location, lat: Number.NaN, lng: Number.NaN, img: '', goingCount: 0, url: x.url,
    artists: [],
    tiers: x.tier ? [{ name: 'Tickets', price: x.tier, priceValue: x.price ?? null, currency: 'KES' }] : [],
    description: x.description,
    startAt: `${x.start}T00:00:00+03:00`, endAt: `${x.end || x.start}T23:59:00+03:00`,
    source: 'manual', host: x.host, currency: 'KES', country: 'KE', radaCategory: x.cat,
    priceMin: x.price ?? null, tags: ['trending', ...x.tags],
  });
};

const EXTRA_EVENTS: Extra[] = [
  { id: 'rada-featured-amapianoland-2026', title: 'Amapianoland Nairobi', match: /amapiano\s*land/i, cat: 'concerts', genre: 'Amapiano', start: '2026-12-05', label: 'Sat, 5 Dec 2026', location: 'MASSHOUSE, Nairobi', url: 'https://ra.co/events/ke/nairobi', description: 'Kabza De Small, Uncle Waffles, DJ Maphorisa and more. Confirm tickets and timings with the organiser.', tags: ['amapiano'] },
  { id: 'rada-featured-ferre-gola-2026', title: 'Ferre Gola LIVE', match: /ferre\s*gola/i, cat: 'concerts', genre: 'Congolese Rhumba', start: '2026-12-12', label: 'Sat, 12 Dec 2026', location: 'ASK Showgrounds, Jamhuri Park, Nairobi', url: 'https://nairobieventsguide.com/event-type/concerts-music/', description: 'Congolese rhumba concert. Confirm ticket prices and timings with the organiser.', tags: ['rhumba', 'ferre gola'] },
  { id: 'rada-featured-fatboy-slim-2026', title: 'Fatboy Slim LIVE', match: /fat\s*boy\s*slim/i, cat: 'nightlife', genre: 'Electronic', start: '2026-12-11', label: 'Fri, 11 Dec 2026', location: 'MUZE Club, Nairobi', url: 'https://nairobieventsguide.com/event-type/concerts-music/', description: 'International DJ and electronic music night. Confirm details with the organiser.', tags: ['electronic', 'dj'] },
  { id: 'rada-featured-black-coffee-2026', title: 'Black Coffee', match: /black\s*coffee/i, cat: 'nightlife', genre: 'Afro House', start: '2026-12-04', label: 'Fri, 4 Dec 2026', location: 'Nairobi (venue TBA)', url: 'https://ra.co/events/ke/nairobi', description: 'Black Coffee in Nairobi. Venue to be announced; check the listing for updates.', tags: ['afro house', 'dj'] },
  { id: 'rada-featured-sondela-2026', title: 'Sondela Nairobi', match: /sondela/i, cat: 'nightlife', genre: 'Club Night', start: '2026-12-04', label: 'Fri, 4 Dec 2026', location: 'KODA, Nairobi', url: 'https://www.weareafr0.co.ke/', description: '21+ event. Check the official listing before booking.', tags: ['club night', 'koda'] },
  { id: 'rada-featured-naya-nights-2026', title: 'NAYÄ NIGHTS', match: /nay[aä]\s*nights/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-19', label: 'Thu, 19 Nov 2026', location: 'KODA, Nairobi', url: 'https://www.weareafr0.co.ke/', price: 500, tier: 'From KES 500', description: 'Club night at KODA. Admission listed from KES 500.', tags: ['club night', 'koda'] },
  { id: 'rada-featured-maya-amolo-tgblk-2026', title: 'Maya Amolo & TG.BLK | Sweet November Special', match: /maya\s*amolo/i, cat: 'nightlife', genre: 'Live & DJ', start: '2026-11-20', label: 'Fri, 20 Nov 2026', location: 'KODA, Nairobi', url: 'https://www.weareafr0.co.ke/', description: 'Sweet November special at KODA.', tags: ['koda', 'maya amolo'] },
  { id: 'rada-featured-koda-continuum-2026', title: 'KODA Presents Continuum', match: /continuum/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-21', label: 'Sat, 21 Nov 2026', location: 'KODA, Nairobi', url: 'https://www.weareafr0.co.ke/', description: 'KODA presents Continuum.', tags: ['koda', 'continuum'] },
  { id: 'rada-featured-friends-of-mongoma-2026', title: 'Friends of Mongoma', match: /friends\s*of\s*mongoma/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-27', label: 'Fri, 27 Nov 2026', location: 'KODA, Nairobi', url: 'https://www.weareafr0.co.ke/', description: 'Friends of Mongoma at KODA.', tags: ['koda', 'mongoma'] },
  { id: 'rada-featured-nairobi-sports-festival-2026', title: 'Nairobi Sports Festival', match: /nairobi\s*sports\s*festival/i, cat: 'sports', genre: 'Multi-sport', start: '2026-11-20', end: '2026-11-21', label: 'Fri 20 – Sat 21 Nov 2026', location: 'University of Nairobi Sports Ground', url: 'https://www.nairobisportsfestival.org/', price: 0, tier: 'Free', description: 'Multi-sport activities, competitions and family activities. Free entry for public-school and community teams.', tags: ['sports', 'free', 'family'] },
  { id: 'rada-featured-rafiki-alphabet-2026', title: 'RAFIKI ALPHABET', match: /rafiki\s*alphabet/i, cat: 'community', genre: 'Community', start: '2026-11-28', label: 'Sat, 28 Nov 2026', location: 'KICC, Nairobi', url: 'https://egotickets.com/events?category=nightlife-party-concert&city%5B%5D=ke%3Anairobi', price: 0, tier: 'Free', description: 'Listed as free. Check the listing for entry and programme details.', tags: ['free'] },
  { id: 'rada-featured-dezemba-kids-2026', title: 'Dezemba Kids Festival', match: /dezemba\s*kids/i, cat: 'community', genre: 'Family', start: '2026-12-05', label: 'Sat, 5 Dec 2026', location: 'Sportsview Hotel, Kasarani', url: 'https://stayhappening.com/nairobi--festivals', price: 0, tier: 'Free', description: 'Family-oriented festival, listed as free.', tags: ['kids', 'family', 'free'] },
  { id: 'rada-featured-colour-festival-2026', title: 'Nairobi Colour Festival 2026', match: /nairobi\s*colou?r\s*festival/i, cat: 'community', genre: 'Festival', start: '2026-12-06', label: 'Sun, 6 Dec 2026', location: 'Nairobi', url: 'https://stayhappening.com/nairobi--festivals', description: 'Festival listing; entry price not confirmed.', tags: ['festival'] },
  { id: 'rada-featured-artisan-souk-2026', title: 'Artisan Makers Market | Christmas Souk', match: /artisan\s*makers|christmas\s*souk/i, cat: 'arts', genre: 'Market', start: '2026-12-05', end: '2026-12-06', label: 'Sat 5 – Sun 6 Dec 2026', location: 'Shamba Events, Loresho', url: 'https://www.tipsitickets.com/blog/nairobi-markets-shopping-events-december-2026', description: 'Christmas market with local makers and artisans.', tags: ['market', 'christmas'] },
  { id: 'rada-featured-bizarre-bazaar-2026', title: 'Bizarre Bazaar Christmas Festival', match: /bizarre\s*bazaar/i, cat: 'food', genre: 'Festival & Market', start: '2026-12-11', end: '2026-12-13', label: 'Fri 11 – Sun 13 Dec 2026', location: 'KSTVET, Gigiri', url: 'https://bizbazevents.com/eventpage', price: 200, tier: 'Adults KES 500 · Under 18 KES 200', description: 'Adult entry KES 500 per day; under-18s KES 200.', tags: ['market', 'christmas'] },
  { id: 'rada-featured-nutcracker-2026', title: 'The Nutcracker', match: /nutcracker/i, cat: 'arts', genre: 'Ballet & Theatre', start: '2026-11-20', end: '2026-11-29', label: '20–22 & 28–29 Nov 2026', location: 'Kenya National Theatre, Nairobi', url: 'https://tic.magicalkenya.com/whats-on/', description: 'Shows on 20–22 and 28–29 November. Confirm times with the venue.', tags: ['theatre', 'ballet'] },
  { id: 'rada-featured-beats-brunch-2026', title: 'Beats & Brunch', match: /beats\s*(&|and)\s*brunch/i, cat: 'food', genre: 'Brunch', start: '2026-11-29', label: 'Sun, 29 Nov 2026', location: 'The Wine & Bottle, Nairobi', url: 'https://tic.magicalkenya.com/whats-on/', description: 'Brunch with music.', tags: ['brunch'] },
];

export const FEATURED_EVENTS: EventItem[] = [
  featured({
    id: 'rada-featured-solfest-2026',
    title: 'SolFest 2026 | VIP Show',
    category: 'concerts',
    genre: 'Music Festival',
    date: 'Thu, 17 Dec 2026',
    time: '04:00 PM – 03:00 AM',
    location: 'Nairobi, Kenya',
    lat: Number.NaN,
    lng: Number.NaN,
    img: POSTERS.solfest,
    goingCount: 0,
    url: 'https://solfest.hustlesasa.shop/products/694d23b71f68b6012b2f8021',
    artists: [],
    tiers: [{ name: 'VIP Show', price: 'KES 25,026', priceValue: 25026, currency: 'KES' }],
    description: 'SolFest returns for three days of music in Nairobi. The VIP Show opens the 2026 festival on 17 December. Confirm ticket tiers and venue details with the organiser before attending.',
    startAt: '2026-12-17T16:00:00+03:00',
    endAt: '2026-12-18T03:00:00+03:00',
    source: 'manual',
    host: 'SolFest',
    currency: 'KES',
    country: 'KE',
    radaCategory: 'concerts',
    priceMin: 12026,
    tags: ['trending', 'music festival', 'solfest'],
  }),
  featured({
    id: 'rada-featured-kodong-all-hands-2026',
    title: 'The House of Kodong Presents: All Hands On Deck',
    category: 'concerts',
    genre: 'Live Music',
    date: 'Sat, 28 Nov 2026',
    time: '04:00 PM – 03:30 AM',
    location: 'A.S.K. Dome, Nairobi',
    lat: Number.NaN,
    lng: Number.NaN,
    img: POSTERS.kodong,
    goingCount: 0,
    url: 'https://mookh.com/the-house-of-kodong-presents-all-hands-on-deck/',
    artists: [],
    tiers: [{ name: 'Advance 2', price: 'KES 5,000', priceValue: 5000, currency: 'KES' }],
    description: 'Kodong Klan brings all seven members together for individual performances and a collective finale. Saturday 28 November at A.S.K. Dome, Nairobi.',
    startAt: '2026-11-28T16:00:00+03:00',
    endAt: '2026-11-29T03:30:00+03:00',
    source: 'manual',
    host: 'Kodong Klan',
    currency: 'KES',
    country: 'KE',
    radaCategory: 'concerts',
    priceMin: 5000,
    tags: ['trending', 'live music', 'kodong klan'],
  }),
  featured({
    id: 'rada-featured-detty-dezemba-2026',
    title: 'Detty Dezemba Festival | Wizkid, Uncle Waffles & Friends',
    category: 'concerts',
    genre: 'Afrobeats & Amapiano',
    date: 'Sat, 12 Dec 2026',
    time: '02:00 PM – 05:00 AM',
    location: 'Laureate Gardens, Nairobi',
    lat: Number.NaN,
    lng: Number.NaN,
    img: POSTERS.detty,
    goingCount: 0,
    url: 'https://dettydezemba.com/',
    artists: [],
    tiers: [{ name: 'General Access', price: 'From KES 3,500', priceValue: 3500, currency: 'KES' }],
    description: 'A Jamhuri Day music festival headlined by Wizkid, with Uncle Waffles and other announced acts. Organised by KOLACOPIA and Active Vibes. 18+; check the official event page for updates.',
    startAt: '2026-12-12T14:00:00+03:00',
    endAt: '2026-12-13T05:00:00+03:00',
    source: 'manual',
    host: 'KOLACOPIA x Active Vibes KE',
    currency: 'KES',
    country: 'KE',
    radaCategory: 'concerts',
    priceMin: 3500,
    tags: ['trending', 'afrobeats', 'amapiano', 'detty dezemba'],
  }),
  featured({
    id: 'rada-featured-keinemusik-2026',
    title: 'Keinemusik Nairobi',
    category: 'concerts',
    genre: 'Afro House',
    date: 'Sat, 21 Nov 2026',
    time: '04:00 PM – 02:00 AM',
    location: 'Uhuru Gardens, Nairobi',
    lat: Number.NaN,
    lng: Number.NaN,
    img: POSTERS.keinemusik,
    goingCount: 0,
    url: 'https://ra.co/events/2516588',
    artists: [],
    tiers: [],
    description: 'Keinemusik makes its Kenya debut with Adam Port, &ME and Rampa. Tickets are available through the event’s official ticket link. 18+.',
    startAt: '2026-11-21T16:00:00+03:00',
    endAt: '2026-11-22T02:00:00+03:00',
    source: 'manual',
    host: 'AnythingGoes x We Are Music People',
    currency: 'KES',
    country: 'KE',
    radaCategory: 'concerts',
    priceMin: null,
    tags: ['trending', 'afro house', 'keinemusik'],
  }),
  ...EXTRA_EVENTS.map(extra),
];

const CORE_MATCHERS: RegExp[] = [/sol\s*fest/i, /all hands on deck|house of kodong/i, /detty\s*dezemba/i, /keinemusik/i];
const FEATURED_MATCHERS: RegExp[] = [...CORE_MATCHERS, ...EXTRA_EVENTS.map(x => x.match)];

/** 0.. = pinned position (our featured list, in order); 1000 = not featured. */
export function featuredEventOrder(event: EventItem): number {
  const idx = FEATURED_MATCHERS.findIndex(pattern => pattern.test(event.title));
  return idx === -1 ? 1000 : idx;
}

/** Stable: keeps the incoming order inside each group, featured first. */
export function pinFeaturedEvents(events: EventItem[]): EventItem[] {
  return events
    .map((event, i) => ({ event, i, o: featuredEventOrder(event) }))
    .sort((a, b) => a.o - b.o || a.i - b.i)
    .map(x => x.event);
}

function escapeSvg(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** RADA-branded artwork fallback so every event card has a visual, even when a source has no poster. */
export function withEventPoster(event: EventItem): EventItem {
  if (event.img && event.img.trim()) return event;
  const title = escapeSvg(event.title || 'Upcoming event');
  const category = escapeSvg(event.genre || event.radaCategory || 'Nairobi event');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101827"/><stop offset="1" stop-color="#164e48"/></linearGradient><radialGradient id="r"><stop stop-color="#10b981" stop-opacity=".7"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></radialGradient></defs><rect width="600" height="800" fill="url(#g)"/><circle cx="480" cy="170" r="260" fill="url(#r)"/><path d="M0 610 160 470 300 590 460 390 600 520V800H0Z" fill="#000" opacity=".25"/><text x="44" y="90" fill="#6ee7b7" font-family="Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="8">RADA EVENTS</text><text x="44" y="610" fill="#fff" font-family="Arial,sans-serif" font-size="42" font-weight="800">${title}</text><text x="44" y="690" fill="#a7f3d0" font-family="Arial,sans-serif" font-size="24">${category}</text><text x="44" y="752" fill="#fff" opacity=".7" font-family="Arial,sans-serif" font-size="20">WHAT'S THE MOVE?</text></svg>`;
  const poster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return { ...event, img: poster, images: [poster] };
}

export function mergeFeaturedEvents(liveEvents: EventItem[]): EventItem[] {
  const remaining = liveEvents
    .filter(event => !FEATURED_MATCHERS.some(pattern => pattern.test(event.title)))
    .map(withEventPoster);
  return [...FEATURED_EVENTS, ...remaining];
}
