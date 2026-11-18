import type { EventItem } from '../types.ts';

const POSTERS = {
  solfest: 'https://weareafr0.co.ke/solfestpics/solfestvip.png',
  kodong: 'https://houseofkodong.africa/assets/img/poster-ahod-1200.ce2c31ce.webp',
  detty: 'https://weareafr0.co.ke/DettyDezembaFestPoster.jpeg',
  keinemusik: 'https://images.ra.co/971dbfd1726eb2ca9a5d87df2d182901cfea07d1.png',
};

const featured = (event: EventItem): EventItem => ({
  ...event,
  tags: [...(event.tags || []), 'rada-featured'],
  images: event.images?.length ? event.images : [event.img],
});

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
];

const FEATURED_MATCHERS: Array<[RegExp, number]> = [
  [/sol\s*fest/i, 0],
  [/all hands on deck|house of kodong/i, 1],
  [/detty\s*dezemba/i, 2],
  [/keinemusik/i, 3],
];

export function featuredEventOrder(event: EventItem): number {
  const match = FEATURED_MATCHERS.find(([pattern]) => pattern.test(event.title));
  return match ? match[1] : 100;
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
  const curatedPatterns = [/sol\s*fest/i, /all hands on deck|house of kodong/i, /detty\s*dezemba/i, /keinemusik/i];
  const remaining = liveEvents
    .filter(event => !curatedPatterns.some(pattern => pattern.test(event.title)))
    .map(withEventPoster);
  return [...FEATURED_EVENTS, ...remaining];
}
