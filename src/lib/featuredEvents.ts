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
  lat?: number; lng?: number;
  url: string; host?: string; source?: string; description: string; tags: string[];
  /** exact start/end (ISO, +03:00) when the real times are known; otherwise the whole day(s) */
  at?: [string, string];
  img?: string;
  /** [name, price label, numeric price, optional status, optional note] */
  tiers?: Array<[string, string, number | null, ('available' | 'sold_out' | 'upcoming')?, string?]>;
}

/** Builds a featured card from compact data. Without exact times, events run 00:00-23:59 Nairobi time. */
const extra = (x: Extra): EventItem => {
  const legacy = x.cat === 'concerts' ? 'concerts' : x.cat === 'nightlife' ? 'nightlife' : x.cat === 'sports' ? 'sports' : 'art';
  const availablePriced = (x.tiers || [])
    .filter(t => (t[3] || 'available') !== 'sold_out')
    .map(t => t[2])
    .filter((n): n is number => typeof n === 'number');
  const anyPriced = (x.tiers || []).map(t => t[2]).filter((n): n is number => typeof n === 'number');
  const minPrices = availablePriced.length ? availablePriced : anyPriced;
  return featured({
    id: x.id, title: x.title, category: legacy, genre: x.genre, date: x.label, time: x.time,
    location: x.location, lat: x.lat ?? Number.NaN, lng: x.lng ?? Number.NaN, img: x.img || '', goingCount: 0, url: x.url,
    artists: [],
    tiers: (x.tiers || []).map(([name, price, value, status, note]) => {
      const st = status || 'available';
      const perks = [st === 'sold_out' ? 'Sold Out' : st === 'upcoming' ? 'Opens soon' : null, note].filter(Boolean).join(' · ') || undefined;
      return { name, price, priceValue: value, currency: 'KES', status: st, perks };
    }),
    description: x.description,
    startAt: x.at ? x.at[0] : `${x.start}T00:00:00+03:00`,
    endAt: x.at ? x.at[1] : `${x.end || x.start}T23:59:00+03:00`,
    source: x.source || 'manual', host: x.host, currency: 'KES', country: 'KE', radaCategory: x.cat,
    priceMin: minPrices.length ? Math.min(...minPrices) : null, tags: ['trending', ...x.tags],
  });
};

const EXTRA_EVENTS: Extra[] = [
  {
    id: 'rada-featured-rong-experience-2026',
    title: 'The Rong Experience 2026 • Wakadinali Live',
    match: /rong\s*experience|wakadinali/i,
    cat: 'concerts',
    genre: 'Hip-Hop & Gengetone',
    start: '2026-11-28',
    at: ['2026-11-28T16:20:00+03:00', '2026-11-29T04:20:00+03:00'],
    label: 'Sat, 28 Nov 2026',
    time: '04:20 PM – 04:20 AM',
    location: 'Kastemill Gardens, Seasons Road, Kasarani',
    lat: -1.2210,
    lng: 36.8970,
    url: 'https://zozanation.hustlesasa.shop/',
    host: 'Zozanation / Rong Rende',
    img: '/posters/rong-experience-wakadinali.jpg',
    tiers: [['Regular Ticket', 'KES 1,500', 1500, 'available', 'Admits 1']],
    description: 'The Rong Experience 2026 featuring Wakadinali live at Kastemill Gardens, Seasons Road, Kasarani. A celebration of Kenyan urban hip-hop culture.',
    tags: ['hip-hop', 'gengetone', 'wakadinali', 'kasarani'],
  },
  {
    id: 'rada-featured-black-coffee-2026',
    title: 'Black Coffee LIVE • MUZE Open Air',
    match: /black\s*coffee/i,
    cat: 'concerts',
    genre: 'Afro House & Electronic',
    start: '2026-12-04',
    at: ['2026-12-04T21:00:00+03:00', '2026-12-05T05:00:00+03:00'],
    label: 'Fri, 4 Dec 2026',
    time: '09:00 PM – 05:00 AM',
    location: 'Muze Club Nairobi (MUZE Open Air)',
    lat: -1.2647,
    lng: 36.8035,
    url: 'https://muze.hustlesasa.shop/',
    host: 'Muze Club',
    img: '/posters/black-coffee-muze.jpg',
    tiers: [
      ['Regular · Early Bird', 'KES 5,000', 5000, 'sold_out', 'Admits 1'],
      ['Regular · Phase 1', 'KES 6,500', 6500, 'sold_out', 'Admits 1'],
      ['Regular · Phase 2', 'KES 7,500', 7500, 'sold_out', 'Admits 1'],
      ['Regular · Phase 3', 'KES 8,500', 8500, 'available', 'Admits 1'],
      ['VIP Standing · Tier 1', 'KES 15,000', 15000, 'sold_out', 'Admits 1'],
      ['VIP Standing · Tier 2', 'KES 20,000', 20000, 'sold_out', 'Admits 1'],
      ['VIP Standing · Tier 3', 'KES 25,000', 25000, 'sold_out', 'Admits 1'],
      ['VIP Standing · Tier 4', 'KES 30,000', 30000, 'available', 'Admits 1'],
    ],
    description: 'NAIROBI. THIS IS YOUR MOMENT. Join BLACK COFFEE on Friday, 4th Dec in Nairobi and witness a global icon. An African powerhouse. A Grammy Award winner and one of the most influential artists in electronic music history! #TwendeOpenAir',
    tags: ['afro house', 'electronic', 'black coffee', 'muze', 'nightlife'],
  },
  {
    id: 'rada-featured-ferre-gola-2026',
    title: 'Ferre Gola LIVE | Dala Festival',
    match: /ferre\s*gol+a|dala\s*festival/i,
    cat: 'concerts',
    genre: 'Congolese Rhumba',
    start: '2026-12-12',
    at: ['2026-12-12T15:00:00+03:00', '2026-12-13T04:00:00+03:00'],
    label: 'Sat, 12 Dec 2026',
    time: '03:00 PM – 04:00 AM',
    location: 'ASK Arena (Nairobi Showground), Nairobi',
    lat: -1.3005,
    lng: 36.7590,
    url: 'https://mookh.com/ferregolaliveinnairobi/',
    host: 'Dala Festival',
    source: 'mookh',
    img: '/posters/ferre-gola-dala.jpg',
    tiers: [
      ['Die Hard', 'KES 3,500', 3500, 'available', 'Admits 1'],
      ['VIP Ticket', 'KES 8,000', 8000, 'available', 'Admits 1'],
      ['VVIP Ticket', 'KES 25,000', 25000, 'available', 'Admits 1'],
      ['Table of 4', 'KES 100,000', 100000, 'available', 'Admits 4'],
      ['Table of 8', 'KES 200,000', 200000, 'available', 'Admits 8'],
    ],
    description: 'The legendary Congolese rhumba maestro Ferre Gola headlines the Dala Festival live in Nairobi on Jamhuri Day for an unforgettable night of music and culture.',
    tags: ['rhumba', 'ferre gola', 'dala festival'],
  },
  {
    id: 'rada-featured-konshens-2026',
    title: 'Dancehall Detention – Konshens LIVE',
    match: /konshens|dancehall\s*detention/i,
    cat: 'concerts',
    genre: 'Dancehall & Reggae',
    start: '2026-12-18',
    at: ['2026-12-18T15:00:00+03:00', '2026-12-19T03:00:00+03:00'],
    label: 'Fri, 18 Dec 2026',
    time: '03:00 PM – 03:00 AM',
    location: 'Sarit Expo Centre, Westlands, Nairobi',
    lat: -1.2610,
    lng: 36.8020,
    url: 'https://tikiti.co.ke/e/dancehall-detention-with-konshens',
    host: 'Talent Africa Group & Homeboyz Entertainment',
    source: 'tikiti',
    img: '/posters/dancehall-detention-konshens.jpg',
    tiers: [
      ['Detention Pass (Regular)', 'KES 5,000', 5000, 'available', 'First Bell · Admits 1 · 18+'],
      ['Honour Roll (VIP)', 'KES 10,000', 10000, 'available', 'Admits 1 · 18+'],
    ],
    description: 'Dancehall Detention with Konshens – The Highschool Reunion is on Friday, 18 December 2026 at Sarit Expo Centre, Nairobi. Talent Africa Group Kenya and Homeboyz Entertainment present Konshens live in Nairobi. Strictly 18+ • Each ticket admits one person • Tickets are non-refundable • No outside food or drink permitted.',
    tags: ['dancehall', 'reggae', 'konshens', 'westlands'],
  },
  { id: 'rada-featured-amapianoland-2026', title: 'AMAPIANOLAND in Nairobi | Detty December Festival', match: /amapiano\s*land/i, cat: 'concerts', genre: 'Amapiano & Afrobeats', start: '2026-12-05', at: ['2026-12-05T16:00:00+03:00', '2026-12-06T01:00:00+03:00'], label: 'Sat, 5 Dec 2026', time: '04:00 PM – 01:00 AM', location: 'MASSHOUSE, Ngong Racecourse, Nairobi', url: 'https://www.eventbrite.com/e/amapianoland-in-nairobi-detty-december-afrobeats-amapiano-festival-tickets-2003667266732', host: 'WhatsTheMotiveAFRICA', img: 'https://www.eventbrite.com/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1196195361%252F232855692231%252F1%252Foriginal.20261020-151655%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D940%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.504%26fp-y%3D0.097%26s%3Dbe357e28aa61796ff3f7bc3c7cee029a&w=940&q=75', description: 'Outdoor Amapiano and Afrobeats day festival with Kabza De Small, Uncle Waffles, DJ Maphorisa and Groove. No refunds. Ticket prices are on the Eventbrite page.', tags: ['amapiano', 'afrobeats'] },
  { id: 'rada-featured-fatboy-slim-2026', title: 'Fatboy Slim LIVE | MUZE Open Air', match: /fat\s*boy\s*slim/i, cat: 'nightlife', genre: 'Big Beat & Electronic', start: '2026-12-11', at: ['2026-12-11T20:00:00+03:00', '2026-12-12T05:00:00+03:00'], label: 'Fri, 11 Dec 2026', time: '08:00 PM – 05:00 AM', location: 'MUZE Open Air, Hangar 16, Wilson Airport, Nairobi', url: 'https://mookh.com/muzeclubpresfatboyslimliveinnairobi/', host: 'MUZE Club', tiers: [['Phase 5', 'KES 5,000', 5000]], description: 'Fatboy Slim moved from the MUZE club to an open-air hangar at Wilson Airport. Earlier phases (KES 1,000 to 4,000) had sold out when last checked; Phase 5 at KES 5,000 was the open tier. No support acts announced.', tags: ['electronic', 'dj', 'muze'] },
  { id: 'rada-featured-sondela-2026', title: 'Sondela Nairobi 2026', match: /sondela/i, cat: 'nightlife', genre: 'Afro House', start: '2026-12-04', at: ['2026-12-04T21:00:00+03:00', '2026-12-05T06:00:00+03:00'], label: 'Fri, 4 Dec 2026', time: '09:00 PM – 06:00 AM', location: 'KODA, Kenrail Towers, Westlands', url: 'https://ra.co/events/2576975', img: 'https://images.ra.co/6a28bcd7898c4e42200d8fdf6ed99dc4e7bb2e28.jpg', description: 'AfroKillerz, Argento Dust, CLEIDO, Ghedi, Hiribae, Tina Ardor and Vidza. 21+ only. Check ticket prices on the RA page.', tags: ['afro house', 'koda', 'sondela'] },
  { id: 'rada-featured-solfest-safari-2026', title: 'SolFest 2026 | Safari Oontz', match: /sol\s*fest.*safari|safari\s*oontz/i, cat: 'concerts', genre: 'Music Festival', start: '2026-12-18', label: 'Fri, 18 Dec 2026', location: 'Uhuru Gardens, Nairobi', url: 'https://www.weareafr0.co.ke/events/solfest-safari', host: 'SolFest', img: 'https://weareafr0.co.ke/solfestpics/solfestsafari.png', tiers: [['Safari Oontz', 'KES 1,500', 1500]], description: 'Day two of SolFest 2026 at Uhuru Gardens. Check the ticket page for gate times.', tags: ['music festival', 'solfest'] },
  { id: 'rada-featured-solfest-fan-2026', title: 'SolFest 2026 | Fan Show', match: /sol\s*fest.*fan\s*show/i, cat: 'concerts', genre: 'Music Festival', start: '2026-12-19', label: 'Sat, 19 Dec 2026', location: 'Nairobi, Kenya', url: 'https://www.weareafr0.co.ke/events/solfest-fan-show', host: 'SolFest', img: 'https://weareafr0.co.ke/solfestpics/solfestfanshow.png', tiers: [['Fan Show', 'KES 2,026', 2026]], description: 'The SolFest 2026 Fan Show. Check the ticket page for venue and gate times.', tags: ['music festival', 'solfest'] },
  { id: 'rada-featured-naya-nights-2026', title: 'NAYÄ NIGHTS', match: /nay[aä]\s*nights/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-19', at: ['2026-11-19T21:00:00+03:00', '2026-11-20T03:00:00+03:00'], label: 'Thu, 19 Nov 2026', time: '09:00 PM – 03:00 AM', location: 'KODA, Kenrail Towers, Westlands', url: 'https://ra.co/events/2586587', img: 'https://images.ra.co/5cc28ee391f4f4ac444011d3631c8b7ecc7ee2d8.png', tiers: [['Entry', 'From KES 500', 500]], description: 'karbz and Wayo at KODA. 21+ only.', tags: ['club night', 'koda'] },
  { id: 'rada-featured-maya-amolo-tgblk-2026', title: 'Maya Amolo & TG.BLK | Sweet November Special', match: /maya\s*amolo/i, cat: 'nightlife', genre: 'Live & R&B', start: '2026-11-20', label: 'Fri, 20 Nov 2026', location: 'KODA, Kenrail Towers, Westlands', url: 'https://www.weareafr0.co.ke/', description: 'Sweet November special at KODA. KODA is 21+. Confirm time and tickets with the venue.', tags: ['koda', 'maya amolo'] },
  { id: 'rada-featured-koda-continuum-2026', title: 'KODA Presents Continuum', match: /continuum/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-21', label: 'Sat, 21 Nov 2026', location: 'KODA, Kenrail Towers, Westlands', url: 'https://www.weareafr0.co.ke/', description: 'KODA presents Continuum. KODA is 21+. Confirm time and tickets with the venue.', tags: ['koda', 'continuum'] },
  { id: 'rada-featured-friends-of-mongoma-2026', title: 'Friends of Mongoma', match: /friends\s*of\s*mongoma/i, cat: 'nightlife', genre: 'Club Night', start: '2026-11-27', label: 'Fri, 27 Nov 2026', location: 'KODA, Kenrail Towers, Westlands', url: 'https://www.weareafr0.co.ke/', description: 'Friends of Mongoma at KODA. KODA is 21+. Confirm time and tickets with the venue.', tags: ['koda', 'mongoma'] },
  { id: 'rada-featured-nairobi-sports-festival-2026', title: 'Nairobi Sports Festival', match: /nairobi\s*sports\s*festival/i, cat: 'sports', genre: 'Multi-sport', start: '2026-11-20', end: '2026-11-21', label: 'Fri 20 – Sat 21 Nov 2026', location: 'University of Nairobi Sports Ground', url: 'https://www.nairobisportsfestival.org/', tiers: [['Entry', 'Free', 0]], description: 'Multi-sport activities, competitions and family activities. Listed as free for public-school and community teams. Confirm details on the official site.', tags: ['sports', 'free', 'family'] },
  { id: 'rada-featured-rafiki-alphabet-2026', title: 'RAFIKI ALPHABET', match: /rafiki\s*alphabet/i, cat: 'community', genre: 'Community', start: '2026-11-28', label: 'Sat, 28 Nov 2026', location: 'KICC, Nairobi', url: 'https://egotickets.com/events?category=nightlife-party-concert&city%5B%5D=ke%3Anairobi', tiers: [['Entry', 'Free', 0]], description: 'Listed as free. Check the listing for entry and programme details.', tags: ['free'] },
  { id: 'rada-featured-dezemba-kids-2026', title: 'Dezemba Kids Festival', match: /dezemba\s*kids/i, cat: 'community', genre: 'Family', start: '2026-12-05', label: 'Sat, 5 Dec 2026', location: 'Sportsview Hotel, Kasarani', url: 'https://stayhappening.com/nairobi--festivals', tiers: [['Entry', 'Free', 0]], description: 'Family-oriented festival, listed as free. Confirm details with the organiser.', tags: ['kids', 'family', 'free'] },
  { id: 'rada-featured-colour-festival-2026', title: 'Nairobi Colour Festival 2026', match: /nairobi\s*colou?r\s*(festival|fest)/i, cat: 'community', genre: 'Festival', start: '2026-12-06', label: 'Sun, 6 Dec 2026', location: 'Nairobi', url: 'https://stayhappening.com/nairobi--festivals', description: 'Festival listing; entry price not confirmed.', tags: ['festival'] },
  { id: 'rada-featured-artisan-souk-2026', title: 'Artisan Makers Market | Christmas Souk', match: /artisan\s*makers|christmas\s*souk/i, cat: 'arts', genre: 'Market', start: '2026-12-05', end: '2026-12-06', label: 'Sat 5 – Sun 6 Dec 2026', location: 'Shamba Events, Loresho', url: 'https://www.tipsitickets.com/blog/nairobi-markets-shopping-events-december-2026', description: 'Christmas market with local makers and artisans. Confirm entry and hours with the organiser.', tags: ['market', 'christmas'] },
  { id: 'rada-featured-bizarre-bazaar-2026', title: 'Bizarre Bazaar Christmas Festival', match: /bizarre\s*bazaar/i, cat: 'food', genre: 'Festival & Market', start: '2026-12-11', end: '2026-12-13', label: 'Fri 11 – Sun 13 Dec 2026', location: 'KSTVET, Gigiri', url: 'https://bizbazevents.com/eventpage', tiers: [['Adult (per day)', 'KES 500', 500], ['Under 18 (per day)', 'KES 200', 200]], description: 'Annual Christmas market and festival at KSTVET. Prices are from the organiser listing; confirm before going.', tags: ['market', 'christmas'] },
  { id: 'rada-featured-nutcracker-2026', title: 'The Nutcracker', match: /nutcracker/i, cat: 'arts', genre: 'Ballet & Theatre', start: '2026-11-20', end: '2026-11-29', label: '20–22 & 28–29 Nov 2026', location: 'Kenya National Theatre, Nairobi', url: 'https://tic.magicalkenya.com/whats-on/', description: 'Shows on 20–22 and 28–29 November. Confirm times and tickets with the venue.', tags: ['theatre', 'ballet'] },
  { id: 'rada-featured-beats-brunch-2026', title: 'Beats & Brunch', match: /beats\s*(&|and)\s*brunch/i, cat: 'food', genre: 'Brunch', start: '2026-11-29', label: 'Sun, 29 Nov 2026', location: 'The Wine & Bottle, Nairobi', url: 'https://tic.magicalkenya.com/whats-on/', description: 'Brunch with music. Confirm time and tickets with the venue.', tags: ['brunch'] },
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
    url: 'https://www.weareafr0.co.ke/events/solfest-vip',
    artists: [],
    tiers: [
      { name: 'Die Hard', price: 'KES 12,026', priceValue: 12026, currency: 'KES' },
      { name: 'Early Bird | Wave One', price: 'KES 15,026', priceValue: 15026, currency: 'KES' },
      { name: 'Wave Three', price: 'KES 25,026', priceValue: 25026, currency: 'KES' },
    ],
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
    tiers: [
      { name: 'Regular Advance 2', price: 'KES 5,000', priceValue: 5000, currency: 'KES' },
      { name: 'Diamonds', price: 'KES 25,000', priceValue: 25000, currency: 'KES' },
    ],
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
    url: 'https://www.weareafr0.co.ke/events/detty-dezemba',
    artists: [],
    tiers: [
      { name: 'General Access II', price: 'KES 3,500', priceValue: 3500, currency: 'KES' },
      { name: 'General Access III', price: 'KES 4,000', priceValue: 4000, currency: 'KES' },
      { name: 'Duo', price: 'KES 6,800', priceValue: 6800, currency: 'KES' },
      { name: 'Premium Access II', price: 'KES 10,000', priceValue: 10000, currency: 'KES' },
      { name: 'Premium Access for Two', price: 'KES 17,999', priceValue: 17999, currency: 'KES' },
      { name: 'Squad Pass (x5)', price: 'KES 19,000', priceValue: 19000, currency: 'KES' },
    ],
    description: 'A Jamhuri Day music festival headlined by Wizkid, with Uncle Waffles and other announced acts. Doors open 2:00 PM. Organised by KOLACOPIA and Active Vibes. 18+, smart dress code, all ticket sales final.',
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
    url: 'https://qkt.io/Keinemusik',
    artists: [],
    tiers: [],
    description: 'Keinemusik makes its Kenya debut with Adam Port, &ME and Rampa. Tickets and tables are sold through Quicket. 18+.',
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

const CORE_MATCHERS: RegExp[] = [
  /black\s*coffee/i,
  /rong\s*experience|wakadinali/i,
  /ferre\s*gol+a|dala\s*festival/i,
  /konshens|dancehall\s*detention/i,
  /sol\s*fest.*vip|vip.*sol\s*fest/i,
  /all hands on deck|house of kodong/i,
  /detty\s*dezemba/i,
  /keinemusik/i,
];
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
    .filter(event => !FEATURED_MATCHERS.some(pattern => pattern.test(event.title)) && !/sol\s*fest/i.test(event.title))
    .map(withEventPoster);
  return [...FEATURED_EVENTS, ...remaining];
}
