/**
 * Showcase mode: fills Movies, Events/Tickets, Outings and My Tickets with sample data so the app
 * looks alive in a demo or investor pitch when Supabase is unavailable (e.g. usage limit hit).
 *
 *   Turn on : open the app with  ?showcase=1   (remembered on that device)
 *   Turn off: open the app with  ?showcase=0
 *
 * It works in production builds too, but only on devices where you switched it on, so real
 * customers never see sample data. Nothing is written to Supabase. Real data always wins:
 * the samples are only used when the live fetch returns nothing.
 */
import type { CinemaMovie, CinemaShowtime, CinemaVenueLink, EventItem, OutingPlan, OutingAttendee } from '../types.ts';
import { mapExternalRow, type ExternalEventRow } from '../utils/eventUtils.ts';
import { VENUE_LABELS } from './cinemaProviders.ts';
import type { MyTicket, PublicTicketType, PublicTicketView, TicketSummary } from './ticketsBuyer.ts';

const KEY = 'rada_showcase';

function readFlag(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search).get('showcase');
    if (p === '1') localStorage.setItem(KEY, '1');
    if (p === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
const ON = readFlag();
export const isShowcase = (): boolean => ON;

// ───────────────────────── dates ─────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (offset: number) => {
  const d = new Date(Date.now() + offset * 864e5);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ───────────────────────── generated artwork ─────────────────────────
// Posters are drawn as inline SVG so they load instantly, offline, on bad venue wifi.
// To use a real poster for any film, add its slug to POSTER_OVERRIDES (a URL or /public path).
export const POSTER_OVERRIDES: Record<string, string> = {
  // 'project-hail-mary': '/posters/project-hail-mary.jpg',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function poster(slug: string, title: string, tag: string, c1: string, c2: string, accent: string): string {
  if (POSTER_OVERRIDES[slug]) return POSTER_OVERRIDES[slug];
  const lines = wrap(title.toUpperCase(), 13).slice(0, 4);
  const size = lines.length > 2 ? 46 : 54;
  const startY = 330 - ((lines.length - 1) * (size + 6)) / 2;
  const text = lines
    .map((l, i) => `<text x="200" y="${startY + i * (size + 6)}" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="${size}" fill="#fff" letter-spacing="2">${esc(l)}</text>`)
    .join('');
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` +
    `<radialGradient id="r" cx="0.5" cy="0.28" r="0.55"><stop offset="0" stop-color="${accent}" stop-opacity="0.75"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></linearGradient></defs>` +
    `<rect width="400" height="600" fill="url(#g)"/><rect width="400" height="600" fill="url(#r)"/>` +
    `<circle cx="300" cy="120" r="70" fill="#fff" fill-opacity="0.08"/><circle cx="90" cy="210" r="110" fill="#fff" fill-opacity="0.05"/>` +
    `<path d="M0 470 L90 380 L170 450 L260 350 L400 480 L400 600 L0 600Z" fill="#000" fill-opacity="0.28"/>` +
    `<rect width="400" height="600" fill="url(#f)"/>` +
    text +
    `<text x="200" y="${startY + lines.length * (size + 6) + 10}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#fff" fill-opacity="0.85" letter-spacing="5">${esc(tag.toUpperCase())}</text>` +
    `<rect x="150" y="555" width="100" height="3" rx="1.5" fill="${accent}"/></svg>`
  );
}

function banner(title: string, tag: string, c1: string, c2: string, accent: string): string {
  const lines = wrap(title, 22).slice(0, 2);
  const text = lines
    .map((l, i) => `<text x="40" y="${250 + i * 54}" font-family="Arial Black,Impact,sans-serif" font-size="44" font-weight="900" fill="#fff">${esc(l)}</text>`)
    .join('');
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` +
    `<radialGradient id="r" cx="0.8" cy="0.2" r="0.6"><stop offset="0" stop-color="${accent}" stop-opacity="0.8"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient></defs>` +
    `<rect width="800" height="500" fill="url(#g)"/><rect width="800" height="500" fill="url(#r)"/>` +
    `<circle cx="640" cy="120" r="150" fill="#fff" fill-opacity="0.06"/><circle cx="120" cy="420" r="120" fill="#fff" fill-opacity="0.05"/>` +
    `<rect width="800" height="500" fill="url(#f)"/>` +
    `<text x="40" y="${250 - 56}" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="${accent}" letter-spacing="6">${esc(tag.toUpperCase())}</text>` +
    text + `</svg>`
  );
}

// ───────────────────────── movies ─────────────────────────
type ProviderKey = 'century' | 'anga' | 'unseen';

interface FilmSpec {
  slug: string;
  title: string;
  genre: string;
  rating: string;
  runtimeMin?: number;
  language: string;
  synopsis: string;
  tag: string;
  colors: [string, string, string];
  formats: ('2D' | '3D' | 'IMAX')[];
  status: 'now_showing' | 'coming_soon';
  release?: string;
  /** provider → venue keys */
  where: Partial<Record<ProviderKey, string[]>>;
  times: string[];
  price: number;
}

const FILMS: FilmSpec[] = [
  {
    slug: 'project-hail-mary', title: 'Project Hail Mary', genre: 'Sci-Fi', rating: 'PG-13', runtimeMin: 156, language: 'English',
    synopsis: 'A lone astronaut wakes up on a spacecraft with no memory of who he is or why he is there, and slowly realises the survival of Earth rests on him. Help arrives from the most unexpected place.',
    tag: 'Survive. Discover. Save us all.', colors: ['#0B1D3A', '#1B6CA8', '#FFB84D'], formats: ['IMAX', '2D'], status: 'now_showing',
    where: { century: ['century_garden_city', 'century_two_rivers', 'century_sarit'], anga: ['anga_diamond', 'anga_panari'] },
    times: ['11:30', '14:45', '18:10', '21:20'], price: 1000,
  },
  {
    slug: 'the-super-mario-galaxy-movie', title: 'The Super Mario Galaxy Movie', genre: 'Animation', rating: 'PG', language: 'English',
    synopsis: 'Mario and Luigi blast off beyond the Mushroom Kingdom on a colourful cosmic adventure. A fun, loud, family-friendly outing.',
    tag: 'A cosmic adventure', colors: ['#1E1B6B', '#D6336C', '#FFD43B'], formats: ['2D', '3D'], status: 'now_showing',
    where: { century: ['century_junction', 'century_garden_city'], anga: ['anga_diamond', 'anga_panari'] },
    times: ['10:00', '12:30', '15:00', '17:30'], price: 800,
  },
  {
    slug: 'toy-story-5', title: 'Toy Story 5', genre: 'Animation', rating: 'PG', language: 'English',
    synopsis: 'Woody, Buzz and the gang face a new kind of rival in a world full of screens, and learn what it means to be there for the kid who loves them.',
    tag: 'To infinity, again', colors: ['#0F3D7A', '#2F9BE8', '#FFC93C'], formats: ['2D', '3D'], status: 'now_showing',
    where: { century: ['century_two_rivers', 'century_sarit', 'century_junction'], anga: ['anga_panari'] },
    times: ['09:45', '12:15', '14:40', '17:00'], price: 800,
  },
  {
    slug: 'moana', title: 'Moana', genre: 'Adventure', rating: 'PG', language: 'English',
    synopsis: 'A spirited young woman sets sail across the open ocean to save her island and discover who she is, with a demigod who talks too much.',
    tag: 'The voyage begins', colors: ['#06403F', '#0FA3A3', '#FF8A5B'], formats: ['3D', '2D'], status: 'now_showing',
    where: { century: ['century_garden_city', 'century_sarit'], anga: ['anga_diamond'] },
    times: ['10:30', '13:00', '15:40', '18:20'], price: 900,
  },
  {
    slug: 'the-mandalorian-and-grogu', title: 'The Mandalorian & Grogu', genre: 'Action', rating: 'PG-13', language: 'English',
    synopsis: 'A bounty hunter and his small, powerful companion take on a new mission as the galaxy rebuilds. Big Star Wars action for the big screen.',
    tag: 'This is the way', colors: ['#1A1A1A', '#7A4B1F', '#E8B04A'], formats: ['3D', 'IMAX'], status: 'now_showing',
    where: { century: ['century_garden_city', 'century_two_rivers'], anga: ['anga_diamond', 'anga_panari'] },
    times: ['12:00', '15:15', '18:30', '21:45'], price: 1000,
  },
  {
    slug: 'the-fisherman', title: 'The Fisherman', genre: 'Comedy', rating: 'PG', language: 'English',
    synopsis: 'A Ghanaian fisherman teams up with a talking fish and a few unlikely companions to chase his dream of owning a boat. Warm, funny and award-winning.',
    tag: 'Dream big. Fish bigger.', colors: ['#0B3C5D', '#328CC1', '#F4D35E'], formats: ['2D'], status: 'now_showing',
    where: { century: ['century_junction', 'century_two_rivers'], unseen: ['unseen'] },
    times: ['13:20', '16:00', '19:00'], price: 700,
  },
  {
    slug: 'reminders-of-him', title: 'Reminders of Him', genre: 'Romance', rating: 'PG-13', language: 'English',
    synopsis: 'Fresh out of prison and trying to rebuild her life, a young mother fights for a second chance to know her daughter. A tender, emotional drama.',
    tag: 'Second chances', colors: ['#3D1A2E', '#B5446E', '#FFC8A2'], formats: ['2D'], status: 'now_showing',
    where: { century: ['century_sarit', 'century_junction'], anga: ['anga_diamond'] },
    times: ['14:10', '17:00', '19:50'], price: 800,
  },
  {
    slug: 'avengers-doomsday', title: 'Avengers: Doomsday', genre: 'Action', rating: 'PG-13', language: 'English',
    synopsis: 'Earth’s mightiest heroes face their biggest threat yet.',
    tag: 'Coming 18 December', colors: ['#12121C', '#5B2A86', '#4DD0E1'], formats: ['IMAX', '3D'], status: 'coming_soon', release: '2026-12-18',
    where: { century: ['century_garden_city'], anga: ['anga_diamond'] }, times: [], price: 1200,
  },
  {
    slug: 'dune-part-three', title: 'Dune: Part Three', genre: 'Sci-Fi', rating: 'PG-13', language: 'English',
    synopsis: 'The saga of Paul Atreides reaches its final chapter on the sands of Arrakis.',
    tag: 'Coming 18 December', colors: ['#2B1B0E', '#B7672B', '#F2C078'], formats: ['IMAX', '2D'], status: 'coming_soon', release: '2026-12-18',
    where: { century: ['century_garden_city', 'century_two_rivers'] }, times: [], price: 1200,
  },
];

const BOOK_URL: Record<ProviderKey, string> = {
  century: 'https://centurycinemax.co.ke',
  anga: 'https://cinema.angacinemas.com',
  unseen: 'https://www.unseen-nairobi.com',
};

function buildEntry(f: FilmSpec, provider: ProviderKey, venueKeys: string[]): CinemaMovie {
  const venues: CinemaVenueLink[] = venueKeys.map(k => ({ venue: VENUE_LABELS[k] || k, venueKey: k, bookingUrl: BOOK_URL[provider] }));
  const showtimes: CinemaShowtime[] = [];
  if (f.status === 'now_showing') {
    for (let d = 0; d < 6; d++) {
      const date = isoDay(d);
      venueKeys.forEach((k, vi) => {
        // each venue runs a slightly different slice of the day so the schedule feels real
        f.times.forEach((t, ti) => {
          if ((ti + vi + d) % 4 === 3 && f.times.length > 3) return;
          const fmt = f.formats[(ti + vi) % f.formats.length];
          const bump = fmt === 'IMAX' ? 500 : fmt === '3D' ? 200 : 0;
          showtimes.push({
            id: `showcase-st-${f.slug}-${provider}-${k}-${date}-${t}`,
            venue: VENUE_LABELS[k] || k, venueKey: k, date, time: t,
            startsAt: `${date}T${t}:00+03:00`, format: fmt, screen: `Screen ${((ti + vi) % 4) + 1}`,
            priceKes: f.price + bump, bookingUrl: BOOK_URL[provider],
          });
        });
      });
    }
  }
  const first = showtimes[0];
  return {
    id: `showcase-m-${f.slug}-${provider}`,
    title: f.title,
    genre: f.genre,
    date: f.release || isoDay(-7),
    format: f.formats[0],
    img: poster(f.slug, f.title, f.tag, f.colors[0], f.colors[1], f.colors[2]),
    url: BOOK_URL[provider],
    bookingUrl: BOOK_URL[provider],
    location: venues.map(v => v.venue).join(', '),
    locationName: venues.length > 1 ? `${venues.length} cinemas` : venues[0]?.venue,
    times: first && first.time ? `${first.date} ${first.time}` : undefined,
    provider,
    synopsis: f.synopsis,
    rating: f.rating,
    runtimeMin: f.runtimeMin,
    language: f.language,
    status: f.status,
    venues,
    showtimes,
  };
}

export function buildShowcaseMovies(): CinemaMovie[] {
  const out: CinemaMovie[] = [];
  for (const f of FILMS) {
    (Object.keys(f.where) as ProviderKey[]).forEach(p => out.push(buildEntry(f, p, f.where[p]!)));
  }
  return out;
}

// ───────────────────────── events & tickets ─────────────────────────
interface EvSpec {
  slug: string; title: string; cat: string; genre: string; venue: string; host: string;
  lat: number; lng: number; day: number; hour: number; durH: number;
  tiers: { name: string; price: number; left?: number; status?: string; note?: string }[];
  desc: string; going: number; colors: [string, string, string]; tag: string; tags: string[];
}

const EVENTS: EvSpec[] = [
  {
    slug: 'sunset-rooftop', title: 'Sunset Rooftop Sessions', cat: 'nightlife', genre: 'Nightlife', venue: 'The Alchemist, Westlands', host: 'Rooftop Collective',
    lat: -1.2641, lng: 36.8030, day: 1, hour: 17, durH: 7,
    tiers: [{ name: 'Early Bird', price: 800, left: 12 }, { name: 'Regular', price: 1200, left: 140 }, { name: 'VIP Table (4)', price: 8000, left: 6 }],
    desc: 'Golden hour, afrohouse and amapiano above the Nairobi skyline. Dress code: smart casual.', going: 214,
    colors: ['#3B1C5A', '#E0533C', '#FFC857'], tag: 'Nightlife', tags: ['rooftop', 'amapiano'],
  },
  {
    slug: 'jazz-in-the-park', title: 'Jazz in the Park', cat: 'concerts', genre: 'Live Music', venue: 'Karura Forest Picnic Lawn', host: 'Nairobi Jazz Society',
    lat: -1.2406, lng: 36.8352, day: 3, hour: 14, durH: 6,
    tiers: [{ name: 'General', price: 1500, left: 300 }, { name: 'Family Pack (4)', price: 4800, left: 40 }, { name: 'Under 12', price: 0, left: 100 }],
    desc: 'Live jazz, food trucks and picnic blankets under the trees. Bring friends, bring family.', going: 389,
    colors: ['#0F3D2E', '#2D6A4F', '#F4D35E'], tag: 'Live Music', tags: ['jazz', 'family'],
  },
  {
    slug: 'nairobi-ai-night', title: 'Nairobi AI & Startup Night', cat: 'business', genre: 'Tech', venue: 'iHub, Ngong Road', host: 'Nairobi Builders',
    lat: -1.2995, lng: 36.7870, day: 2, hour: 18, durH: 4,
    tiers: [{ name: 'Community', price: 0, left: 80 }, { name: 'Founder Pass', price: 1000, left: 25, note: 'Includes dinner and investor mixer' }],
    desc: 'Demos, lightning talks and networking with founders, engineers and investors building in Kenya.', going: 163,
    colors: ['#0B1D3A', '#1B6CA8', '#7CF5C6'], tag: 'Tech', tags: ['startups', 'ai'],
  },
  {
    slug: 'comedy-night', title: 'Laugh Factory: Stand-up Night', cat: 'art', genre: 'Comedy', venue: 'Alliance Française, Loita St', host: 'Laugh Factory KE',
    lat: -1.2899, lng: 36.8168, day: 4, hour: 19, durH: 3,
    tiers: [{ name: 'Standard', price: 1000, left: 90 }, { name: 'Front Row', price: 2000, left: 10 }],
    desc: 'Five of Nairobi’s sharpest comedians in one room. Two hours of laughs, one very honest host.', going: 142,
    colors: ['#5A1A1A', '#D6453D', '#FFE08A'], tag: 'Comedy', tags: ['comedy'],
  },
  {
    slug: 'food-festival', title: 'Taste of Nairobi Food Fest', cat: 'food', genre: 'Food & Drink', venue: 'Two Rivers Mall Grounds', host: 'Taste Nairobi',
    lat: -1.2057, lng: 36.7745, day: 6, hour: 11, durH: 9,
    tiers: [{ name: 'Day Pass', price: 500, left: 800 }, { name: 'Tasting Pass', price: 2500, left: 120, note: '8 tasting tokens included' }],
    desc: 'Over 60 vendors, live cooking stages and a craft beer garden. Bring an appetite.', going: 527,
    colors: ['#5C2A0B', '#E0733C', '#FFD166'], tag: 'Food & Drink', tags: ['food', 'festival'],
  },
  {
    slug: 'art-walk', title: 'Gallery Night: Art Walk', cat: 'art', genre: 'Art', venue: 'Karen Arts District', host: 'Nairobi Art Collective',
    lat: -1.3190, lng: 36.7110, day: 5, hour: 17, durH: 4,
    tiers: [{ name: 'Walk Pass', price: 700, left: 60 }],
    desc: 'Open studios, live painting and gallery openings across five spaces, with a shuttle between them.', going: 96,
    colors: ['#2A1B3D', '#8E44AD', '#FFB3C1'], tag: 'Art', tags: ['art', 'gallery'],
  },
  {
    slug: 'run-club-5k', title: 'Saturday Social 5K', cat: 'sports', genre: 'Sports', venue: 'Uhuru Gardens', host: 'Nairobi Run Club',
    lat: -1.3243, lng: 36.8010, day: 7, hour: 7, durH: 3,
    tiers: [{ name: 'Free Entry', price: 0, left: 200 }, { name: 'Entry + Medal', price: 600, left: 150 }],
    desc: 'A relaxed 5K run or walk followed by coffee and stretching. All paces welcome.', going: 311,
    colors: ['#0B3C2D', '#1FAB89', '#E9F5DB'], tag: 'Sports', tags: ['running', 'fitness'],
  },
  {
    slug: 'afro-night', title: 'Afrobeats Night: Sold Out Edition', cat: 'nightlife', genre: 'Nightlife', venue: 'Brew Bistro, Westlands', host: 'Night Owls KE',
    lat: -1.2670, lng: 36.8110, day: 2, hour: 21, durH: 6,
    tiers: [{ name: 'Regular', price: 1000, status: 'sold_out' }, { name: 'Late Entry', price: 1500, left: 8 }],
    desc: 'Afrobeats, amapiano and dancehall until sunrise. Tickets are almost gone.', going: 450,
    colors: ['#14142B', '#E0533C', '#FF9F1C'], tag: 'Nightlife', tags: ['afrobeats'],
  },
];

function eventRow(e: EvSpec): ExternalEventRow {
  const date = isoDay(e.day);
  const start = `${date}T${pad(e.hour)}:00:00+03:00`;
  const endDate = new Date(new Date(start).getTime() + e.durH * 3600 * 1000).toISOString();
  return {
    id: `showcase-ev-${e.slug}`,
    source: 'rada',
    source_url: 'https://rada2026-omega.vercel.app',
    title: e.title,
    category: e.genre,
    rada_category: e.cat,
    start_at: start,
    end_at: endDate,
    has_time: true,
    venue: e.venue,
    host: e.host,
    image_url: banner(e.title, e.tag, e.colors[0], e.colors[1], e.colors[2]),
    price_min: Math.min(...e.tiers.filter(t => t.status !== 'sold_out').map(t => t.price)),
    currency: 'KES',
    country: 'KE',
    tiers: e.tiers.map(t => ({ name: t.name, price: t.price, status: t.status || 'available', left: t.left, note: t.note })),
    description: e.desc,
    address: e.venue,
    lat: e.lat,
    lng: e.lng,
    gallery: null,
    tags: e.tags,
    place_id: null,
  } as unknown as ExternalEventRow;
}

export function buildShowcaseEvents(): EventItem[] {
  return EVENTS.map(e => ({ ...mapExternalRow(eventRow(e)), goingCount: e.going }))
    .sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
}

/** Tickets that show up in "My Tickets" (valid, with QR codes, plus one already used). */
export function buildShowcaseMyTickets(): MyTicket[] {
  const mk = (i: number, e: EvSpec, type: string, price: number, status: 'valid' | 'used'): MyTicket => ({
    id: `showcase-tk-${i}`,
    code: `RADA${String(7000 + i * 137)}SHOW${i}`,
    status,
    created_at: new Date(Date.now() - i * 864e5).toISOString(),
    checked_in_at: status === 'used' ? new Date(Date.now() - 36e5).toISOString() : null,
    type_name: type,
    price_kes: price,
    source_kind: 'event',
    source_id: `showcase-ev-${e.slug}`,
    title: e.title,
    event_date: new Date(`${isoDay(e.day)}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    event_time: `${e.hour % 12 || 12}:00 ${e.hour >= 12 ? 'PM' : 'AM'}`,
    place: e.venue,
  });
  return [
    mk(1, EVENTS[0], 'Regular', 1200, 'valid'),
    mk(2, EVENTS[1], 'Family Pack (4)', 4800, 'valid'),
    mk(3, EVENTS[2], 'Founder Pass', 1000, 'valid'),
    mk(4, EVENTS[7], 'Late Entry', 1500, 'used'),
  ];
}

// ───────────────────────── outings (hangouts) with tickets ─────────────────────────
interface OutSpec {
  n: number; title: string; address: string; cat: string; day: number; time: string; max: number;
  desc: string; tag: string; colors: [string, string, string]; host: string; tags: string[];
  going: string[];
  tickets: { name: string; price: number; left: number; desc?: string }[];
}

const OUTINGS: OutSpec[] = [
  {
    n: 1, title: 'Karura Forest Sunrise Walk', address: 'Karura Forest, Gate B (Limuru Road)', cat: 'nature_trails', day: 3, time: '06:45', max: 12,
    desc: 'An easy 5km loop through the forest, then chai and mandazi at the cafe. All fitness levels welcome.', tag: 'Outdoors',
    colors: ['#0F3D2E', '#2D6A4F', '#B7E4C7'], host: 'amani_k', tags: ['All Plans', 'Group Hangouts', 'Outdoors'],
    going: ['brian_o', 'chebet_r', 'otieno_j'], tickets: [{ name: 'RSVP (free)', price: 0, left: 6, desc: 'Entry fee to the forest not included' }],
  },
  {
    n: 2, title: 'Rooftop Sundowner', address: 'Skyline Rooftop, Westlands', cat: 'nightlife', day: 2, time: '17:30', max: 20,
    desc: 'Sunset drinks, a good playlist and great company. Dress smart-casual.', tag: 'Nightlife',
    colors: ['#3B1C5A', '#E0533C', '#FFC857'], host: 'wanjiru_m', tags: ['All Plans', 'Group Hangouts', 'Nightlife'],
    going: ['kevo_254', 'zawadi_n', 'faith_a', 'achieng_l'],
    tickets: [{ name: 'Early Bird', price: 600, left: 8 }, { name: 'Regular', price: 900, left: 24 }],
  },
  {
    n: 3, title: 'Street Food Crawl: Kilimani', address: 'Kilimani, Nairobi', cat: 'food_dining', day: 4, time: '13:00', max: 10,
    desc: 'Five stops, five bites each. Come hungry, we split nothing but the fun.', tag: 'Food',
    colors: ['#5C2A0B', '#E0733C', '#FFD166'], host: 'nyambura_w', tags: ['All Plans', 'Group Hangouts', 'Food'],
    going: ['nyambura_w', 'kevo_254', 'otieno_j'], tickets: [{ name: 'Crawl Pass', price: 1500, left: 4, desc: 'Includes all five tastings' }],
  },
  {
    n: 4, title: 'Sunset at Ngong Hills', address: 'Ngong Hills, Kajiado', cat: 'nature_trails', day: 5, time: '15:30', max: 15,
    desc: 'Golden hour hike and photos along the ridge. Bring a jacket and water.', tag: 'Outdoors',
    colors: ['#1B3A5C', '#E08A3C', '#FFE0A3'], host: 'mwas_d', tags: ['All Plans', 'Group Hangouts', 'Outdoors'],
    going: ['mwas_d', 'faith_a', 'brian_o', 'chebet_r', 'zawadi_n'], tickets: [{ name: 'Hike + Guide', price: 500, left: 14 }],
  },
  {
    n: 5, title: 'Afrobeats Night Out', address: 'Westlands, Nairobi', cat: 'nightlife', day: 6, time: '21:00', max: 40,
    desc: 'Dance floor, good music and good company. Meet at the entrance at 9.', tag: 'Nightlife',
    colors: ['#14142B', '#E0533C', '#FF9F1C'], host: 'kevo_254', tags: ['All Plans', 'Group Hangouts', 'Nightlife'],
    going: ['kevo_254', 'achieng_l', 'wanjiru_m', 'amani_k', 'nyambura_w'], tickets: [{ name: 'Entry', price: 1000, left: 3 }],
  },
  {
    n: 6, title: 'Board Games & Coffee', address: 'Kileleshwa, Nairobi', cat: 'food_dining', day: 1, time: '15:00', max: 8,
    desc: 'Relaxed afternoon of board games and good coffee. Beginners welcome.', tag: 'Social',
    colors: ['#3A2A1B', '#8A5A2B', '#F4D9A6'], host: 'zawadi_n', tags: ['All Plans', 'Group Hangouts'],
    going: ['zawadi_n', 'chebet_r'], tickets: [{ name: 'RSVP (free)', price: 0, left: 5 }],
  },
];

const AVATAR_COLORS = ['#E0533C', '#2D6A4F', '#1B6CA8', '#8E44AD', '#D6453D', '#0FA3A3', '#B5446E'];
const avatar = (handle: string) => {
  const c = AVATAR_COLORS[handle.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c}"/><text x="50" y="66" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#fff">${esc(handle[0].toUpperCase())}</text></svg>`);
};

export const isShowcaseOuting = (id: unknown) => String(id ?? '').startsWith('showcase-out-');

export function buildShowcaseOutings(): OutingPlan[] {
  return OUTINGS.map(o => {
    const id = `showcase-out-${o.n}`;
    const attendees: OutingAttendee[] = o.going.map((h, i) => ({
      id: `showcase-att-${o.n}-${i}`, outingId: id, userId: `showcase-u-${h}`, userName: `@${h}`, userHandle: `@${h}`,
      userAvatar: avatar(h), status: 'approved', isVerified: true, requestedAt: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
    }));
    return {
      id, hostId: `showcase-u-${o.host}`, hostName: `@${o.host}`, hostHandle: `@${o.host}`, hostAvatar: avatar(o.host),
      isHostVerified: true, spotTitle: o.title, spotAddress: o.address,
      spotImage: banner(o.title, o.tag, o.colors[0], o.colors[1], o.colors[2]), spotCategory: o.cat,
      date: isoDay(o.day), time: o.time, maxAttendees: o.max, currentAttendeesCount: attendees.length + 1,
      description: o.desc, accessType: 'open', tags: o.tags, status: 'active', createdAt: new Date(Date.now() - 864e5).toISOString(), attendees,
    } as OutingPlan;
  });
}

export function showcaseTicketSummaries(ids: string[]): Record<string, TicketSummary> {
  const out: Record<string, TicketSummary> = {};
  for (const id of ids) {
    const o = OUTINGS.find(x => `showcase-out-${x.n}` === id);
    if (!o) continue;
    out[id] = { min_price: Math.min(...o.tickets.map(t => t.price)), left: o.tickets.reduce((a, t) => a + t.left, 0) };
  }
  return out;
}

export function showcasePublicTickets(source: string): PublicTicketView | null {
  const o = OUTINGS.find(x => `showcase-out-${x.n}` === source);
  if (!o) return null;
  return {
    title: o.title, date: isoDay(o.day), time: o.time, place: o.address,
    image: banner(o.title, o.tag, o.colors[0], o.colors[1], o.colors[2]), host: `@${o.host}`, paid_enabled: true,
    types: o.tickets.map((t, i) => ({
      id: `showcase-tt-${o.n}-${i}`, name: t.name, description: t.desc ?? null, price_kes: t.price, left: t.left,
      max_per_order: 4, sales_end: null, closed: false,
    })),
  };
}

// Tickets "bought" during the demo. In memory only, so they vanish on refresh.
const bought: MyTicket[] = [];
export function showcaseBuy(type: PublicTicketType, qty: number): void {
  const n = Number(type.id.split('-')[2]);
  const o = OUTINGS.find(x => x.n === n);
  for (let i = 0; i < qty; i++) {
    bought.unshift({
      id: `showcase-bought-${Date.now()}-${i}`, code: `RADA${Date.now().toString().slice(-6)}BUY${i}`, status: 'valid',
      created_at: new Date().toISOString(), checked_in_at: null, type_name: type.name, price_kes: type.price_kes,
      source_kind: 'outing', source_id: `showcase-out-${n}`, title: o?.title ?? 'Outing',
      event_date: o ? new Date(`${isoDay(o.day)}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : null,
      event_time: o?.time ?? null, place: o?.address ?? null,
    });
  }
}
export const showcaseBoughtTickets = (): MyTicket[] => [...bought];
