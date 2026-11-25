/**
 * Showcase mode: fills Movies, Events and Outings with curated Kenyan data when Supabase is
 * unavailable or unconfigured.
 *
 *   Turn off on a device: open the app with  ?showcase=0
 *   Turn back on         : open the app with  ?showcase=1
 */
const SHOWCASE_DEFAULT_ON = true;

import type { CinemaMovie, CinemaShowtime, CinemaVenueLink, EventItem, OutingPlan, OutingAttendee } from '../types.ts';
import { mapExternalRow, type ExternalEventRow } from '../utils/eventUtils.ts';
import { VENUE_LABELS } from './cinemaProviders.ts';
import { isDemoMode } from './demoMode.ts';
import type { MyTicket, PublicTicketType, PublicTicketView, TicketSummary } from './ticketsBuyer.ts';

const KEY = 'rada_showcase';

function readFlag(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search).get('showcase');
    if (p === '1') localStorage.setItem(KEY, '1');
    if (p === '0') localStorage.setItem(KEY, 'off');
    const v = localStorage.getItem(KEY);
    return v === 'off' ? false : v === '1' || SHOWCASE_DEFAULT_ON;
  } catch {
    return SHOWCASE_DEFAULT_ON;
  }
}
const ON = readFlag();
export const isShowcase = (): boolean => ON || isDemoMode();

// ───────────────────────── dates ─────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (offset: number) => {
  const d = new Date(Date.now() + offset * 864e5);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ───────────────────────── verified real posters ─────────────────────────
export const POSTER_OVERRIDES: Record<string, string> = {
  'project-hail-mary': '/posters/project-hail-mary.jpg',
  'the-super-mario-galaxy-movie': '/posters/super-mario-galaxy.jpg',
  'toy-story-5': '/posters/toy-story-5.jpg',
  'moana': '/posters/moana.jpg',
  'the-mandalorian-and-grogu': '/posters/mandalorian-grogu.jpg',
  'the-fisherman': '/posters/the-fisherman.jpg',
  'reminders-of-him': '/posters/reminders-of-him.jpg',
  'avengers-doomsday': '/posters/avengers-doomsday.jpg',
  'dune-part-three': '/posters/dune-part-three.webp',
  'the-hunger-games-sunrise-on-the-reaping': 'https://m.media-amazon.com/images/M/MV5BNjEzYTE2ODEtNzY5Zi00ZmVmLWEyYzEtYjdlZWU2NjcyYzMzXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
  'spider-man-brand-new-day': 'https://m.media-amazon.com/images/M/MV5BOWNjYWM3NWItOGE0ZS00MWRjLThiZWEtYjc4ZmNmMmU5ZTVmXkEyXkFqcGc@._V1_.jpg',
  'clayface': 'https://m.media-amazon.com/images/M/MV5BYTAyMjgxZjctMjRjNC00Zjg1LWJiNzctMDkxYzk0NWVmODMwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
  'how-to-rob-a-bank': 'https://d9s3e2ooa0od7.cloudfront.net/assets/how-to-rob-a-bank-2026/a01acb60-dcfc-4330-9e22-701ac33a533f/a01acb60-dcfc-4330-9e22-701ac33a533f.jpg',
  'ghost-soldier': 'https://assets-in.bmscdn.com/iedb/movies/images/mobile/thumbnail/xlarge/ghost-soldier-et00518333-1789986369.jpg',
  'wild-horse-9': '/posters/wild-horse-9.jpg',
  'focker-in-law': 'https://m.media-amazon.com/images/M/MV5BOGI0NjhmMmEtNDAxZC00MDFjLThlNzUtYTUwMDkzMjMxNGIzXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
  'the-cat-in-the-hat': '/posters/cat-in-the-hat.png',
  'hexed': 'https://lumiere-a.akamaihd.net/v1/images/ohio_domestic_teaser_united_kingdom_3b9e3c1c.jpeg?region=0,0,743,1100',
  'ramayana-rise-of-a-legend': 'https://all.web.img.acsta.net/img/36/e4/36e4fc3b64a86dfc792bfed6c5455d88.jpg',
  'gun-maaster-g9': 'https://m.media-amazon.com/images/M/MV5BMDBmNzcwMzEtZmFkNS00ZTJlLWEyZTEtZjgzYzBhNTFmYWI4XkEyXkFqcGc@._V1_.jpg',
  'yeh-prem-mol-liya': 'https://m.media-amazon.com/images/M/MV5BYmE3ODc1YWItZDYzZi00ZTk1LTg5MDQtMWNhMzQzNTAyN2E5XkEyXkFqcGc@._V1_.jpg',
  'king-of-salangpur': 'https://cdn.district.in/movies-assets/images/cinema/king-of-salangpur-5454bf30-d35f-11f1-950a-c322dd6a4f0f.jpg?im=Resize,width=400',
  'street-fighter': 'https://centurycinemax.co.ke/storage/uploads/FntFP9ao.jpg',
  'how-to-build-a-library': 'https://centurycinemax.co.ke/storage/uploads/PN8m0nnW.jpg',
  'bien-alusa-continua': 'https://centurycinemax.co.ke/storage/uploads/6YobcWG0.jpg',
  'the-odyssey': '/posters/the-odyssey.jpg',
  'avengers-endgame-encore': 'https://centurycinemax.co.ke/storage/sliders/3qEwGxra.jpg',
  'violent-night-2': 'https://centurycinemax.co.ke/storage/sliders/s1VJrqAd.jpg',
  'zero-a-d': 'https://centurycinemax.co.ke/storage/sliders/6SvuRrvF.jpg',
  'jumanji-open-world': 'https://centurycinemax.co.ke/storage/sliders/xYARVKy8.jpg',
  'east-west-love': '/posters/east-west-love.jpg',
  'kibera-hustle': '/posters/kibera-hustle.jpg',
  'verity': '/posters/verity.jpg',
  'resident-evil': '/posters/resident-evil.jpg',
  'drishyam-the-conclusion': '/posters/drishyam-conclusion.jpg',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// ───────────────────────── movies ─────────────────────────
type ProviderKey = 'century' | 'anga' | 'unseen' | 'westgate' | 'gig' | 'visitnairobi' | 'mydorpie';

interface FilmSpec {
  slug: string;
  title: string;
  genre: string;
  rating: string;
  runtimeMin?: number;
  language: string;
  synopsis: string;
  trailerUrl?: string;
  posterUrl?: string;
  formats: ('2D' | '3D' | 'IMAX')[];
  status: 'now_showing' | 'coming_soon';
  release?: string;
  /** provider → venue keys */
  where: Partial<Record<ProviderKey, string[]>>;
  times: string[];
  price: number;
}

const FILMS: FilmSpec[] = [
  // ── Westgate Cinema + GiG + Visit Nairobi + MyDorpie + Century/Anga Lineup ──
  {
    slug: 'dune-part-three',
    title: 'Dune: Part Three',
    genre: 'Sci-Fi',
    rating: '16+',
    runtimeMin: 151,
    language: 'English',
    synopsis: 'Emperor Paul Atreides faces the fallout from his ascent to power as political plots and a galaxy-wide holy war endanger the future only he can see.',
    trailerUrl: 'https://www.youtube.com/watch?v=3_9vCamtuPY',
    formats: ['IMAX', '2D'],
    status: 'now_showing',
    release: '2026-12-15',
    where: {
      westgate: ['westgate'],
      gig: ['century_garden_city', 'century_two_rivers', 'century_sarit'],
      visitnairobi: ['20th_century'],
    },
    times: ['11:00', '14:00', '19:00', '21:15'],
    price: 1000,
  },
  {
    slug: 'spider-man-brand-new-day',
    title: 'Spider-Man: Brand New Day',
    genre: 'Action',
    rating: 'PG',
    runtimeMin: 144,
    language: 'English',
    synopsis: 'A forgotten Peter Parker lives alone as a full-time Spider-Man until mounting pressure triggers a dangerous change and a powerful new enemy emerges.',
    trailerUrl: 'https://youtu.be/8TZMtslA3UY',
    formats: ['3D', '2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_garden_city', 'century_junction'],
      visitnairobi: ['prestige'],
    },
    times: ['12:15', '15:20', '18:30', '21:10'],
    price: 900,
  },
  {
    slug: 'the-hunger-games-sunrise-on-the-reaping',
    title: 'The Hunger Games: Sunrise on the Reaping',
    genre: 'Sci-Fi',
    rating: '16+',
    runtimeMin: 158,
    language: 'English',
    synopsis: 'Revisit the world of Panem 24 years before the events of The Hunger Games, starting on the morning of the reaping of the 50th Hunger Games.',
    trailerUrl: 'https://youtu.be/lYXtL5TreOE',
    formats: ['IMAX', '2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit', 'century_garden_city'],
    },
    times: ['13:30', '17:00', '21:10'],
    price: 1000,
  },
  {
    slug: 'avengers-doomsday',
    title: 'Avengers: Doomsday',
    genre: 'Action',
    rating: 'PG-13',
    runtimeMin: 165,
    language: 'English',
    synopsis: 'Earth’s mightiest heroes face Doctor Doom and a multiversal threat that reshapes the fate of every reality.',
    trailerUrl: 'https://www.youtube.com/watch?v=irVNGjRFZGk',
    formats: ['3D', 'IMAX'],
    status: 'now_showing',
    release: '2026-12-17',
    where: {
      westgate: ['westgate'],
      gig: ['century_two_rivers', 'century_sarit'],
      mydorpie: ['prestige', '20th_century'],
    },
    times: ['11:20', '14:55', '19:00', '21:05'],
    price: 1100,
  },
  {
    slug: 'clayface',
    title: 'Clayface',
    genre: 'Horror',
    rating: '18+',
    runtimeMin: 110,
    language: 'English',
    synopsis: 'Rising Hollywood star Matt Hagen descends into a horrifying revenge-filled monster when scientific ambition strips him of his identity and humanity.',
    trailerUrl: 'https://youtu.be/W9bNA42dPgQ',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_two_rivers'],
    },
    times: ['16:40', '19:30', '21:50'],
    price: 900,
  },
  {
    slug: 'how-to-rob-a-bank',
    title: 'How to Rob a Bank',
    genre: 'Action',
    rating: '16+',
    runtimeMin: 122,
    language: 'English',
    synopsis: 'Audacious bank robbers broadcast their high-stakes heists live on social media, turning a nationwide police manhunt into viral spectacle.',
    trailerUrl: 'https://youtu.be/JuT1zUG_gvg',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit'],
    },
    times: ['11:10', '16:20', '21:40'],
    price: 850,
  },
  {
    slug: 'ghost-soldier',
    title: 'Ghost Soldier',
    genre: 'Action',
    rating: '16+',
    runtimeMin: 90,
    language: 'English',
    synopsis: 'A weapon systems engineer and former Green Beret protects his rural community against a ruthless paramilitary corporation.',
    trailerUrl: 'https://youtu.be/moaNp8CXo40',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_two_rivers'],
    },
    times: ['11:30', '18:40', '22:00'],
    price: 850,
  },
  {
    slug: 'wild-horse-9',
    title: 'Wild Horse 9',
    genre: 'Thriller',
    rating: 'R',
    runtimeMin: 116,
    language: 'English',
    synopsis: 'Two intelligence operatives face a high-stakes, trust-testing covert mission stretching from Santiago to Easter Island in 1973.',
    trailerUrl: 'https://youtu.be/Haw_sznA5aQ',
    formats: ['2D'],
    status: 'now_showing',
    where: { westgate: ['westgate'] },
    times: ['14:15', '19:20'],
    price: 850,
  },
  {
    slug: 'focker-in-law',
    title: 'Focker-In-Law',
    genre: 'Comedy',
    rating: 'PG-13',
    runtimeMin: 105,
    language: 'English',
    synopsis: 'Henry Focker faces escalating family chaos when he plans to marry a strong-willed woman whose family tests every nerve of Greg and Pam.',
    trailerUrl: 'https://youtu.be/vyISuWUWcFs',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit'],
    },
    times: ['11:20', '14:20', '17:15', '22:00'],
    price: 850,
  },
  {
    slug: 'the-cat-in-the-hat',
    title: 'The Cat in the Hat',
    genre: 'Animation',
    rating: 'PG',
    runtimeMin: 99,
    language: 'English',
    synopsis: 'An epic animated family adventure where mischief, magic and mayhem reign supreme when the iconic Cat shows up uninvited.',
    trailerUrl: 'https://youtu.be/V4boBkQL-1w',
    formats: ['3D', '2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_two_rivers', 'century_sarit'],
    },
    times: ['10:30', '14:10', '16:45'],
    price: 900,
  },
  {
    slug: 'hexed',
    title: 'Hexed',
    genre: 'Animation',
    rating: 'PG',
    runtimeMin: 103,
    language: 'English',
    synopsis: 'An awkward teenager and her meticulous mother discover her quirks are real magical powers, unlocking a hidden enchanted realm.',
    trailerUrl: 'https://youtu.be/KXO21xZdUaM',
    formats: ['3D', '2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_garden_city'],
    },
    times: ['11:00', '14:00', '16:05'],
    price: 900,
  },
  {
    slug: 'ramayana-rise-of-a-legend',
    title: 'Ramayana: Rise of a Legend (Hindi)',
    genre: 'Adventure',
    rating: 'R16',
    runtimeMin: 195,
    language: 'Hindi',
    synopsis: 'An ancient mythical epic following Prince Rama and Sita whose exile sparks an unforgettable journey of love, duty and triumph.',
    trailerUrl: 'https://www.youtube.com/watch?v=1zip1rNaNYs',
    formats: ['2D', '3D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit'],
      mydorpie: ['nyali'],
    },
    times: ['13:00', '17:00', '20:30'],
    price: 950,
  },
  {
    slug: 'gun-maaster-g9',
    title: 'Gun Maaster G9 (Hindi)',
    genre: 'Action',
    rating: '18+',
    runtimeMin: 151,
    language: 'Hindi',
    synopsis: 'A man in love goes to extraordinary lengths to protect the woman he desires while facing off against a ruthless criminal syndicate.',
    trailerUrl: 'https://www.youtube.com/watch?v=uwL2o2GnCrg',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit'],
    },
    times: ['11:10', '19:00', '21:15'],
    price: 850,
  },
  {
    slug: 'yeh-prem-mol-liya',
    title: 'Yeh Prem Mol Liya (Hindi)',
    genre: 'Romance',
    rating: 'PG-13',
    runtimeMin: 183,
    language: 'Hindi',
    synopsis: 'A charming romantic family comedy about a bachelor trying to dodge marriage who inadvertently finds love where he least expects it.',
    trailerUrl: 'https://www.youtube.com/watch?v=vdhNar4uxm4',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      westgate: ['westgate'],
      gig: ['century_sarit'],
    },
    times: ['11:10', '15:10'],
    price: 850,
  },
  {
    slug: 'king-of-salangpur',
    title: 'King of Salangpur',
    genre: 'Drama',
    rating: 'PG',
    runtimeMin: 124,
    language: 'Gujarati',
    synopsis: 'Four young people battling failure, loneliness and despair discover renewed purpose through an unexpected spiritual journey.',
    trailerUrl: 'https://www.youtube.com/watch?v=PHUgP4h83_g',
    formats: ['2D'],
    status: 'now_showing',
    where: { westgate: ['westgate'] },
    times: ['11:00', '18:20'],
    price: 850,
  },
  {
    slug: 'street-fighter',
    title: 'Street Fighter',
    genre: 'Action',
    rating: '16+',
    runtimeMin: 119,
    language: 'English',
    synopsis: 'Estranged fighters Ryu and Ken Masters are drawn back into combat by Chun-Li for the World Warrior Tournament in a brutal clash of fate and fury.',
    trailerUrl: 'https://www.youtube.com/watch?v=U6sbm1OaJb8',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      gig: ['century_two_rivers'],
      visitnairobi: ['anga_diamond', 'century_two_rivers'],
    },
    times: ['13:15', '16:30', '19:45'],
    price: 900,
  },
  {
    slug: 'how-to-build-a-library',
    title: 'How to Build a Library',
    genre: 'Drama',
    rating: 'PG',
    runtimeMin: 101,
    language: 'English & Swahili',
    synopsis: 'Kenyan documentary following Book Bunk co-founders Shiro Koinange and Angela Wachuka over eight years as they transform Nairobi’s historic McMillan Library into vibrant public cultural spaces.',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      gig: ['century_two_rivers'],
      unseen: ['unseen'],
    },
    times: ['14:00', '17:30'],
    price: 750,
  },
  {
    slug: 'bien-alusa-continua',
    title: 'BIEN: ALUSA CONTINUA | The Visual Experience',
    genre: 'Drama',
    rating: 'PG',
    runtimeMin: 50,
    language: 'English & Swahili',
    synopsis: 'The cinematic visual project accompanying Bien-Aimé Baraza’s acclaimed solo album Alusa Continua, blending Kenyan soundscapes, identity and storytelling.',
    formats: ['2D'],
    status: 'now_showing',
    where: { gig: ['century_garden_city'] },
    times: ['16:00', '18:30', '20:30'],
    price: 800,
  },
  {
    slug: 'the-odyssey',
    title: 'The Odyssey',
    genre: 'Adventure',
    rating: '15A',
    runtimeMin: 173,
    language: 'English',
    synopsis: 'Odysseus, the legendary King of Ithaca, embarks on a perilous journey home after the Trojan War, confronting mythological monsters, gods and fate.',
    trailerUrl: 'https://www.youtube.com/watch?v=Mzw2ttJD2qQ',
    formats: ['IMAX', '2D'],
    status: 'now_showing',
    where: {
      gig: ['century_garden_city'],
      visitnairobi: ['anga_panari'],
    },
    times: ['12:30', '16:15', '20:00'],
    price: 1000,
  },
  {
    slug: 'avengers-endgame-encore',
    title: 'Avengers Endgame: Encore',
    genre: 'Action',
    rating: 'PG-13',
    runtimeMin: 181,
    language: 'English',
    synopsis: 'Special theatrical encore presentation of Avengers: Endgame returning to Kenyan big screens ahead of Doomsday.',
    trailerUrl: 'https://www.youtube.com/watch?v=L2NAh3CIdig',
    formats: ['2D', 'IMAX'],
    status: 'now_showing',
    where: {
      gig: ['century_junction', 'century_garden_city'],
      visitnairobi: ['20th_century'],
    },
    times: ['14:30', '19:15'],
    price: 850,
  },
  {
    slug: 'verity',
    title: 'Verity',
    genre: 'Thriller',
    rating: 'R',
    runtimeMin: 117,
    language: 'English',
    synopsis: 'Struggling writer Lowen Ashleigh is hired to complete bestselling author Verity Crawford’s book series, only to uncover chilling secrets hidden inside the Crawford estate.',
    trailerUrl: 'https://www.youtube.com/watch?v=xdPMKhjMSFs',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      visitnairobi: ['anga_diamond', 'prestige'],
      anga: ['anga_diamond', 'anga_panari'],
    },
    times: ['15:00', '18:00', '20:45'],
    price: 850,
  },
  {
    slug: 'east-west-love',
    title: 'East West Love',
    genre: 'Romance',
    rating: 'PG-13',
    runtimeMin: 104,
    language: 'English & Swahili',
    synopsis: 'After catching her boyfriend cheating, Tito’s coastal trip to Mombasa turns into an unforgettable girls’ getaway packed with music, sun and unexpected romance.',
    trailerUrl: 'https://www.youtube.com/watch?v=EPBXwOnk9c4',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      visitnairobi: ['anga_cbd', 'prestige'],
      mydorpie: ['nyali'],
    },
    times: ['13:30', '16:15', '19:00'],
    price: 750,
  },
  {
    slug: 'kibera-hustle',
    title: 'Kibera Hustle',
    genre: 'Drama',
    rating: '16+',
    runtimeMin: 108,
    language: 'English & Swahili',
    synopsis: 'A gripping Kenyan thriller filmed in the heart of Kibera: when his estranged half-brother is kidnapped, a young hustler races against time across Nairobi.',
    trailerUrl: 'https://www.youtube.com/watch?v=VbkaatunLms',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      visitnairobi: ['anga_cbd', 'unseen'],
      unseen: ['unseen'],
    },
    times: ['15:30', '18:30'],
    price: 750,
  },
  {
    slug: 'resident-evil',
    title: 'Resident Evil',
    genre: 'Horror',
    rating: '18+',
    runtimeMin: 90,
    language: 'English',
    synopsis: 'Medical courier Bryan fights to survive one terrifying night as an outbreak collapses an isolated research city into chaos.',
    trailerUrl: 'https://www.youtube.com/watch?v=mNd1gb19A-c',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      visitnairobi: ['anga_panari', 'prestige'],
      anga: ['anga_panari'],
    },
    times: ['17:45', '21:15'],
    price: 850,
  },
  {
    slug: 'drishyam-the-conclusion',
    title: 'Drishyam: The Conclusion',
    genre: 'Thriller',
    rating: '16+',
    runtimeMin: 150,
    language: 'Hindi',
    synopsis: 'Years after outsmarting the police, Vijay Salgaonkar’s past resurfaces when new evidence threatens to expose everything he fought to protect.',
    trailerUrl: 'https://www.youtube.com/watch?v=BSZZwBaNQAA',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      visitnairobi: ['anga_diamond', 'prestige'],
      mydorpie: ['megacity'],
    },
    times: ['14:00', '17:30', '20:45'],
    price: 850,
  },
  {
    slug: 'project-hail-mary',
    title: 'Project Hail Mary',
    genre: 'Sci-Fi',
    rating: 'PG-13',
    runtimeMin: 156,
    language: 'English',
    synopsis: 'A lone astronaut wakes up on a spacecraft with no memory of who he is, and slowly realises the survival of Earth rests on an unlikely interstellar alliance.',
    formats: ['IMAX', '2D'],
    status: 'now_showing',
    where: {
      century: ['century_garden_city', 'century_two_rivers', 'century_sarit'],
      anga: ['anga_diamond', 'anga_panari'],
    },
    times: ['11:30', '14:45', '18:10', '21:20'],
    price: 1000,
  },
  {
    slug: 'the-super-mario-galaxy-movie',
    title: 'The Super Mario Galaxy Movie',
    genre: 'Animation',
    rating: 'PG',
    runtimeMin: 98,
    language: 'English',
    synopsis: 'Mario and Luigi blast off beyond the Mushroom Kingdom on a colourful cosmic adventure for the whole family.',
    formats: ['2D', '3D'],
    status: 'now_showing',
    where: {
      century: ['century_junction', 'century_garden_city'],
      anga: ['anga_diamond', 'anga_panari'],
    },
    times: ['10:00', '12:30', '15:00', '17:30'],
    price: 800,
  },
  {
    slug: 'toy-story-5',
    title: 'Toy Story 5',
    genre: 'Animation',
    rating: 'PG',
    runtimeMin: 102,
    language: 'English',
    synopsis: 'Woody, Buzz and the gang face a new kind of rival in a world full of screens and learn what it means to be there for the kid who loves them.',
    formats: ['2D', '3D'],
    status: 'now_showing',
    where: {
      century: ['century_two_rivers', 'century_sarit', 'century_junction'],
      anga: ['anga_panari'],
    },
    times: ['09:45', '12:15', '14:40', '17:00'],
    price: 800,
  },
  {
    slug: 'moana',
    title: 'Moana',
    genre: 'Adventure',
    rating: 'PG',
    runtimeMin: 112,
    language: 'English',
    synopsis: 'A spirited young navigator sets sail across the open ocean to save her island and discover who she is.',
    formats: ['3D', '2D'],
    status: 'now_showing',
    where: {
      century: ['century_garden_city', 'century_sarit'],
      anga: ['anga_diamond'],
    },
    times: ['10:30', '13:00', '15:40', '18:20'],
    price: 900,
  },
  {
    slug: 'the-mandalorian-and-grogu',
    title: 'The Mandalorian & Grogu',
    genre: 'Action',
    rating: 'PG-13',
    runtimeMin: 132,
    language: 'English',
    synopsis: 'Din Djarin and Grogu take on a high-stakes mission across the New Republic frontier in big-screen Star Wars action.',
    formats: ['3D', 'IMAX'],
    status: 'now_showing',
    where: {
      century: ['century_garden_city', 'century_two_rivers'],
      anga: ['anga_diamond', 'anga_panari'],
    },
    times: ['12:00', '15:15', '18:30', '21:45'],
    price: 1000,
  },
  {
    slug: 'the-fisherman',
    title: 'The Fisherman',
    genre: 'Comedy',
    rating: 'PG',
    runtimeMin: 108,
    language: 'English',
    synopsis: 'A Ghanaian fisherman teams up with a talking fish and unlikely companions to chase his dream of owning a boat.',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      century: ['century_junction', 'century_two_rivers'],
      unseen: ['unseen'],
    },
    times: ['13:20', '16:00', '19:00'],
    price: 700,
  },
  {
    slug: 'reminders-of-him',
    title: 'Reminders of Him',
    genre: 'Romance',
    rating: 'PG-13',
    runtimeMin: 115,
    language: 'English',
    synopsis: 'Trying to rebuild her life after prison, a young mother fights for a second chance to reconnect with her daughter.',
    formats: ['2D'],
    status: 'now_showing',
    where: {
      century: ['century_sarit', 'century_junction'],
      anga: ['anga_diamond'],
    },
    times: ['14:10', '17:00', '19:50'],
    price: 800,
  },
  // ── Coming Soon December Releases (GiG / Century) ──
  {
    slug: 'violent-night-2',
    title: 'Violent Night 2',
    genre: 'Action',
    rating: 'R',
    runtimeMin: 110,
    language: 'English',
    synopsis: 'Santa Claus teams up with Mrs. Claus to save a shopping mall full of families held hostage by ruthless gangsters on Christmas Eve.',
    formats: ['2D'],
    status: 'coming_soon',
    release: '2026-12-04',
    where: { gig: ['century_garden_city', 'century_two_rivers'] },
    times: [],
    price: 900,
  },
  {
    slug: 'zero-a-d',
    title: 'Zero A.D.',
    genre: 'Drama',
    rating: 'PG-13',
    runtimeMin: 115,
    language: 'English',
    synopsis: 'A historical drama following Mary and Joseph as they protect the newborn Jesus from King Herod’s ruthless purge.',
    formats: ['2D'],
    status: 'coming_soon',
    release: '2026-12-11',
    where: { gig: ['century_junction', 'century_sarit'] },
    times: [],
    price: 900,
  },
  {
    slug: 'jumanji-open-world',
    title: 'Jumanji: Open World',
    genre: 'Adventure',
    rating: 'PG-13',
    runtimeMin: 128,
    language: 'English',
    synopsis: 'The console breaks wide open in the blockbuster final chapter of the Jumanji trilogy as the jungle spills into the real world.',
    formats: ['3D', '2D'],
    status: 'coming_soon',
    release: '2026-12-25',
    where: { gig: ['century_garden_city', 'century_two_rivers', 'century_sarit'] },
    times: [],
    price: 1000,
  },
];

const BOOK_URL: Record<ProviderKey, string> = {
  century: 'https://centurycinemax.co.ke',
  anga: 'https://cinema.angacinemas.com',
  unseen: 'https://www.unseen-nairobi.com',
  westgate: 'https://westgate.co.ke/movies',
  gig: 'https://events.gig.co.ke/movies',
  visitnairobi: 'https://visitnairobi.city/films',
  mydorpie: 'https://mydorpie.com/Movies/Cinemas-in-Kenya',
};

function buildEntry(f: FilmSpec, provider: ProviderKey, venueKeys: string[]): CinemaMovie {
  const venues: CinemaVenueLink[] = venueKeys.map(k => ({
    venue: VENUE_LABELS[k] || k,
    venueKey: k,
    bookingUrl: BOOK_URL[provider],
  }));
  const showtimes: CinemaShowtime[] = [];
  if (f.status === 'now_showing') {
    for (let d = 0; d < 6; d++) {
      const date = isoDay(d);
      venueKeys.forEach((k, vi) => {
        f.times.forEach((t, ti) => {
          if ((ti + vi + d) % 4 === 3 && f.times.length > 3) return;
          const fmt = f.formats[(ti + vi) % f.formats.length];
          const bump = fmt === 'IMAX' ? 500 : fmt === '3D' ? 200 : 0;
          showtimes.push({
            id: `showcase-st-${f.slug}-${provider}-${k}-${date}-${t}`,
            venue: VENUE_LABELS[k] || k,
            venueKey: k,
            date,
            time: t,
            startsAt: `${date}T${t}:00+03:00`,
            format: fmt,
            screen: `Screen ${((ti + vi) % 4) + 1}`,
            priceKes: f.price + bump,
            bookingUrl: BOOK_URL[provider],
          });
        });
      });
    }
  }
  const first = showtimes[0];
  const img = f.posterUrl || POSTER_OVERRIDES[f.slug] || '';
  return {
    id: `showcase-m-${f.slug}-${provider}`,
    title: f.title,
    genre: f.genre,
    date: f.release || isoDay(-7),
    format: f.formats[0],
    img,
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
    trailerUrl: f.trailerUrl,
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

// ───────────────────────── events & outings ─────────────────────────
interface EvSpec {
  slug: string;
  id?: string;
  source?: string;
  url?: string;
  img: string;
  title: string;
  cat: string;
  genre: string;
  venue: string;
  host: string;
  lat?: number;
  lng?: number;
  day: number;
  hour: number;
  durH: number;
  fixedStart?: string;
  fixedEnd?: string;
  isOnline?: boolean;
  platform?: string;
  meetingUrl?: string;
  tiers: { name: string; price: number; left?: number; status?: string; note?: string }[];
  desc: string;
  going: number;
  tags: string[];
}

const EVENTS: EvSpec[] = [
  {
    id: 'rada-featured-rong-experience-2026',
    slug: 'rong-experience-2026',
    source: 'nairobieventsguide',
    url: 'https://nairobieventsguide.com/event/the-rong-experience-wakadinali-live/',
    img: '/posters/rong-experience-wakadinali.jpg',
    title: 'The Rong Experience 2026 • Wakadinali Live',
    cat: 'concerts',
    genre: 'Hip-Hop & Gengetone',
    venue: 'Kastemill Gardens, Seasons Road, Kasarani',
    host: 'Zozanation / Rong Rende',
    lat: -1.221,
    lng: 36.897,
    day: 3,
    hour: 16,
    durH: 12,
    fixedStart: '2026-11-28T16:20:00+03:00',
    fixedEnd: '2026-11-29T04:20:00+03:00',
    tiers: [{ name: 'Regular Ticket', price: 1500, note: 'Admits 1' }],
    desc: 'The Rong Experience 2026 featuring Wakadinali live at Kastemill Gardens, Seasons Road, Kasarani. A celebration of Kenyan urban hip-hop culture.',
    going: 412,
    tags: ['hip-hop', 'gengetone', 'wakadinali', 'kasarani'],
  },
  {
    id: 'rada-featured-black-coffee-2026',
    slug: 'black-coffee-muze',
    source: 'nairobieventsguide',
    url: 'https://nairobieventsguide.com/event/black-coffee-live-muze-open-air/',
    img: '/posters/black-coffee-muze.jpg',
    title: 'Black Coffee LIVE • MUZE Open Air',
    cat: 'concerts',
    genre: 'Afro House & Electronic',
    venue: 'Muze Club Nairobi (MUZE Open Air)',
    host: 'Muze Club',
    lat: -1.2647,
    lng: 36.8035,
    day: 9,
    hour: 21,
    durH: 8,
    fixedStart: '2026-12-04T21:00:00+03:00',
    fixedEnd: '2026-12-05T05:00:00+03:00',
    tiers: [
      { name: 'Regular · Early Bird', price: 5000, status: 'sold_out', note: 'Admits 1' },
      { name: 'Regular · Phase 3', price: 8500, status: 'available', note: 'Admits 1' },
      { name: 'VIP Standing · Tier 4', price: 30000, status: 'available', note: 'Admits 1' },
    ],
    desc: 'Join Grammy Award winner BLACK COFFEE on Friday, 4th Dec in Nairobi for MUZE Open Air. #TwendeOpenAir',
    going: 647,
    tags: ['afro house', 'electronic', 'black coffee', 'muze', 'nightlife'],
  },
  {
    id: 'rada-featured-ferre-gola-2026',
    slug: 'ferre-gola-dala',
    source: 'mookh',
    url: 'https://mookh.com/ferregolaliveinnairobi/',
    img: '/posters/ferre-gola-dala.jpg',
    title: 'Ferre Gola LIVE | Dala Festival',
    cat: 'concerts',
    genre: 'Congolese Rhumba',
    venue: 'ASK Arena (Nairobi Showground), Nairobi',
    host: 'Dala Festival',
    lat: -1.3005,
    lng: 36.759,
    day: 17,
    hour: 15,
    durH: 13,
    fixedStart: '2026-12-12T15:00:00+03:00',
    fixedEnd: '2026-12-13T04:00:00+03:00',
    tiers: [
      { name: 'Die Hard', price: 3500, note: 'Admits 1' },
      { name: 'VIP Ticket', price: 8000, note: 'Admits 1' },
    ],
    desc: 'The legendary Congolese rhumba maestro Ferre Gola headlines Dala Festival live in Nairobi on Jamhuri Day.',
    going: 518,
    tags: ['rhumba', 'ferre gola', 'dala festival'],
  },
  {
    id: 'rada-featured-konshens-2026',
    slug: 'dancehall-detention-konshens',
    source: 'tikiti',
    url: 'https://tikiti.co.ke/e/dancehall-detention-with-konshens',
    img: '/posters/dancehall-detention-konshens.jpg',
    title: 'Dancehall Detention – Konshens LIVE',
    cat: 'concerts',
    genre: 'Dancehall & Reggae',
    venue: 'Sarit Expo Centre, Westlands, Nairobi',
    host: 'Talent Africa Group & Homeboyz Entertainment',
    lat: -1.261,
    lng: 36.802,
    day: 23,
    hour: 15,
    durH: 12,
    fixedStart: '2026-12-18T15:00:00+03:00',
    fixedEnd: '2026-12-19T03:00:00+03:00',
    tiers: [
      { name: 'Detention Pass (Regular)', price: 5000, note: 'Admits 1 · 18+' },
      { name: 'Honour Roll (VIP)', price: 10000, note: 'Admits 1 · 18+' },
    ],
    desc: 'Dancehall Detention with Konshens – The Highschool Reunion at Sarit Expo Centre, Nairobi. Strictly 18+.',
    going: 389,
    tags: ['dancehall', 'reggae', 'konshens', 'westlands'],
  },
  {
    slug: 'sunset-rooftop',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    title: 'Sunset Rooftop Sessions',
    cat: 'nightlife',
    genre: 'Nightlife',
    venue: 'The Alchemist, Westlands',
    host: 'Rooftop Collective',
    lat: -1.2641,
    lng: 36.803,
    day: 1,
    hour: 17,
    durH: 7,
    tiers: [
      { name: 'Early Bird', price: 800, left: 12 },
      { name: 'Regular', price: 1200, left: 140 },
    ],
    desc: 'Golden hour, afrohouse and amapiano above the Nairobi skyline. Dress code: smart casual.',
    going: 214,
    tags: ['rooftop', 'amapiano'],
  },
  {
    slug: 'afrohouse-livestream',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    title: 'RADA Frequencies: Live DJ Set',
    cat: 'online',
    genre: 'Online · Music',
    venue: 'Online · YouTube Live',
    host: 'RADA Sounds',
    isOnline: true,
    platform: 'YouTube Live',
    meetingUrl: 'https://www.youtube.com/live',
    day: 1,
    hour: 20,
    durH: 3,
    tiers: [{ name: 'Free Stream RSVP', price: 0, left: 500 }],
    desc: 'Two Nairobi selectors spinning Afrohouse, Amapiano and soulful edits live from a Westlands studio.',
    going: 184,
    tags: ['online', 'livestream', 'music'],
  },
  {
    slug: 'jazz-in-the-park',
    img: '/posters/friday-jazz-night.jpg',
    title: 'Jazz in the Park & Karen Sessions',
    cat: 'concerts',
    genre: 'Live Music',
    venue: 'Karura Forest Picnic Lawn',
    host: 'Nairobi Jazz Society',
    lat: -1.2406,
    lng: 36.8352,
    day: 3,
    hour: 14,
    durH: 6,
    tiers: [
      { name: 'General', price: 1500, left: 300 },
      { name: 'Family Pack (4)', price: 4800, left: 40 },
    ],
    desc: 'Live jazz, food trucks and picnic blankets under the trees. Bring friends, bring family.',
    going: 389,
    tags: ['jazz', 'family'],
  },
  {
    slug: 'founders-ama-online',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80',
    title: 'Nairobi Builders Virtual AMA & Demo Hour',
    cat: 'online',
    genre: 'Online · Tech',
    venue: 'Online · Zoom',
    host: 'Nairobi Builders',
    isOnline: true,
    platform: 'Zoom',
    meetingUrl: 'https://zoom.us',
    day: 2,
    hour: 19,
    durH: 2,
    tiers: [{ name: 'Free Entry', price: 0, left: 250 }],
    desc: 'Rapid-fire product demos, founder Q&A and remote networking breakout rooms for East African builders.',
    going: 129,
    tags: ['online', 'tech', 'startups'],
  },
  {
    slug: 'virtual-sip-sketch',
    img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80',
    title: 'Sunday Evening Sip & Sketch (Online)',
    cat: 'online',
    genre: 'Online · Creative',
    venue: 'Online · Google Meet',
    host: 'Kilimani Sketch Club',
    isOnline: true,
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com',
    day: 4,
    hour: 17,
    durH: 2,
    tiers: [{ name: 'Free RSVP', price: 0, left: 100 }],
    desc: 'Grab your sketchbook and a warm mug for a guided figure & cityscape sketching session from home.',
    going: 74,
    tags: ['online', 'art', 'workshop'],
  },
  {
    slug: 'comedy-night',
    img: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=80',
    title: 'Laugh Factory: Stand-up Night',
    cat: 'art',
    genre: 'Comedy',
    venue: 'Alliance Française, Loita St',
    host: 'Laugh Factory KE',
    lat: -1.2899,
    lng: 36.8168,
    day: 4,
    hour: 19,
    durH: 3,
    tiers: [
      { name: 'Standard', price: 1000, left: 90 },
      { name: 'Front Row', price: 2000, left: 10 },
    ],
    desc: 'Five of Nairobi’s sharpest comedians in one room. Two hours of laughs, one honest host.',
    going: 142,
    tags: ['comedy'],
  },
  {
    slug: 'food-festival',
    img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
    title: 'Taste of Nairobi Food Fest',
    cat: 'food',
    genre: 'Food & Drink',
    venue: 'Two Rivers Mall Grounds',
    host: 'Taste Nairobi',
    lat: -1.2057,
    lng: 36.7745,
    day: 6,
    hour: 11,
    durH: 9,
    tiers: [
      { name: 'Day Pass', price: 500, left: 800 },
      { name: 'Tasting Pass', price: 2500, left: 120 },
    ],
    desc: 'Over 60 vendors, live cooking stages and a craft drinks garden at Two Rivers.',
    going: 527,
    tags: ['food', 'festival'],
  },
  {
    slug: 'art-walk',
    img: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?auto=format&fit=crop&w=900&q=80',
    title: 'Gallery Night: Art Walk',
    cat: 'art',
    genre: 'Art',
    venue: 'Karen Arts District',
    host: 'Nairobi Art Collective',
    lat: -1.319,
    lng: 36.711,
    day: 5,
    hour: 17,
    durH: 4,
    tiers: [{ name: 'Walk Pass', price: 700, left: 60 }],
    desc: 'Open studios, live painting and gallery openings across five spaces in Karen.',
    going: 96,
    tags: ['art', 'gallery'],
  },
  {
    slug: 'run-club-5k',
    img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
    title: 'Saturday Social 5K',
    cat: 'sports',
    genre: 'Sports',
    venue: 'Uhuru Gardens',
    host: 'Nairobi Run Club',
    lat: -1.3243,
    lng: 36.801,
    day: 7,
    hour: 7,
    durH: 3,
    tiers: [{ name: 'Free Entry', price: 0, left: 200 }],
    desc: 'A relaxed 5K run or walk followed by coffee and stretching. All paces welcome.',
    going: 311,
    tags: ['running', 'fitness'],
  },
];

function eventRow(e: EvSpec): ExternalEventRow {
  const date = isoDay(e.day);
  const start = e.fixedStart || `${date}T${pad(e.hour)}:00:00+03:00`;
  const endDate = e.fixedEnd || new Date(new Date(start).getTime() + e.durH * 3600 * 1000).toISOString();
  const availPrices = e.tiers.filter(t => t.status !== 'sold_out').map(t => t.price);
  const priceMin = availPrices.length
    ? Math.min(...availPrices)
    : e.tiers.length
      ? Math.min(...e.tiers.map(t => t.price))
      : null;
  return {
    id: e.id || `showcase-ev-${e.slug}`,
    source: e.source || 'rada',
    source_url: e.url || e.meetingUrl || 'https://rada2026-omega.vercel.app',
    title: e.title,
    category: e.genre,
    rada_category: e.cat,
    start_at: start,
    end_at: endDate,
    has_time: true,
    venue: e.venue,
    host: e.host,
    image_url: e.img,
    price_min: priceMin,
    currency: 'KES',
    country: 'KE',
    tiers: e.tiers.map(t => ({
      name: t.name,
      price: t.price,
      status: t.status || 'available',
      left: t.left,
      note: t.note,
    })),
    description: e.desc,
    address: e.venue,
    lat: typeof e.lat === 'number' ? e.lat : null,
    lng: typeof e.lng === 'number' ? e.lng : null,
    gallery: null,
    tags: e.tags,
    place_id: null,
  } as unknown as ExternalEventRow;
}

export function buildShowcaseEvents(): EventItem[] {
  return EVENTS.map(e => ({
    ...mapExternalRow(eventRow(e)),
    goingCount: e.going,
    isOnline: Boolean(e.isOnline),
    platform: e.platform,
    meetingUrl: e.meetingUrl,
  })).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
}

/** Tickets that show up in "My Tickets" (compatibility export). */
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
    event_date: new Date(`${isoDay(e.day)}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    event_time: `${e.hour % 12 || 12}:00 ${e.hour >= 12 ? 'PM' : 'AM'}`,
    place: e.venue,
  });
  return [
    mk(1, EVENTS[0], 'Regular', 1500, 'valid'),
    mk(2, EVENTS[2], 'Die Hard', 3500, 'valid'),
  ];
}

// ───────────────────────── outings (hangouts) ─────────────────────────
interface OutSpec {
  n: number;
  title: string;
  address: string;
  cat: string;
  day: number;
  time: string;
  max: number;
  desc: string;
  img: string;
  host: string;
  tags: string[];
  going: string[];
  tickets: { name: string; price: number; left: number; desc?: string }[];
}

const OUTINGS: OutSpec[] = [
  {
    n: 1,
    title: 'Karura Forest Sunrise Walk',
    address: 'Karura Forest, Gate B (Limuru Road)',
    cat: 'nature_trails',
    day: 3,
    time: '06:45',
    max: 12,
    desc: 'An easy 5km loop through the forest, then chai and mandazi at the cafe. All fitness levels welcome.',
    img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
    host: 'amani_k',
    tags: ['Outdoors'],
    going: ['brian_o', 'chebet_r', 'otieno_j'],
    tickets: [{ name: 'RSVP (free)', price: 0, left: 6, desc: 'Entry fee to the forest not included' }],
  },
  {
    n: 2,
    title: 'Rooftop Sundowner',
    address: 'Skyline Rooftop, Westlands',
    cat: 'nightlife',
    day: 2,
    time: '17:30',
    max: 20,
    desc: 'Sunset drinks, a good playlist and great company. Dress smart-casual.',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    host: 'wanjiru_m',
    tags: ['Nightlife'],
    going: ['kevo_254', 'zawadi_n', 'faith_a', 'achieng_l'],
    tickets: [{ name: 'Early Bird', price: 600, left: 8 }],
  },
  {
    n: 3,
    title: 'Street Food Crawl: Kilimani',
    address: 'Kilimani, Nairobi',
    cat: 'food_dining',
    day: 4,
    time: '13:00',
    max: 10,
    desc: 'Five stops, five bites each. Come hungry, we split nothing but the fun.',
    img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
    host: 'nyambura_w',
    tags: ['Food'],
    going: ['nyambura_w', 'kevo_254', 'otieno_j'],
    tickets: [{ name: 'Crawl Pass', price: 1500, left: 4, desc: 'Includes all five tastings' }],
  },
  {
    n: 4,
    title: 'Sunset at Ngong Hills',
    address: 'Ngong Hills, Kajiado',
    cat: 'nature_trails',
    day: 5,
    time: '15:30',
    max: 15,
    desc: 'Golden hour hike and photos along the ridge. Bring a jacket and water.',
    img: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80',
    host: 'mwas_d',
    tags: ['Outdoors'],
    going: ['mwas_d', 'faith_a', 'brian_o', 'chebet_r', 'zawadi_n'],
    tickets: [{ name: 'Hike + Guide', price: 500, left: 14 }],
  },
  {
    n: 5,
    title: 'Afrobeats Night Out',
    address: 'Westlands, Nairobi',
    cat: 'nightlife',
    day: 6,
    time: '21:00',
    max: 40,
    desc: 'Dance floor, good music and good company. Meet at the entrance at 9.',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    host: 'kevo_254',
    tags: ['Nightlife'],
    going: ['kevo_254', 'achieng_l', 'wanjiru_m', 'amani_k', 'nyambura_w'],
    tickets: [{ name: 'Entry', price: 1000, left: 3 }],
  },
  {
    n: 6,
    title: 'Board Games & Coffee',
    address: 'Kileleshwa, Nairobi',
    cat: 'food_dining',
    day: 1,
    time: '15:00',
    max: 8,
    desc: 'Relaxed afternoon of board games and good coffee. Beginners welcome.',
    img: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80',
    host: 'zawadi_n',
    tags: [],
    going: ['zawadi_n', 'chebet_r'],
    tickets: [{ name: 'RSVP (free)', price: 0, left: 5 }],
  },
];

const AVATAR_COLORS = ['#E0533C', '#2D6A4F', '#1B6CA8', '#8E44AD', '#D6453D', '#0FA3A3', '#B5446E'];
const avatar = (handle: string) => {
  const c = AVATAR_COLORS[handle.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c}"/><text x="50" y="66" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#fff">${esc(handle[0].toUpperCase())}</text></svg>`
  );
};

export const isShowcaseOuting = (id: unknown) => String(id ?? '').startsWith('showcase-out-');

export function buildShowcaseOutings(): OutingPlan[] {
  return OUTINGS.map(o => {
    const id = `showcase-out-${o.n}`;
    const attendees: OutingAttendee[] = o.going.map((h, i) => ({
      id: `showcase-att-${o.n}-${i}`,
      outingId: id,
      userId: `showcase-u-${h}`,
      userName: `@${h}`,
      userHandle: `@${h}`,
      userAvatar: avatar(h),
      status: 'approved',
      isVerified: true,
      requestedAt: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
    }));
    return {
      id,
      hostId: `showcase-u-${o.host}`,
      hostName: `@${o.host}`,
      hostHandle: `@${o.host}`,
      hostAvatar: avatar(o.host),
      isHostVerified: true,
      spotTitle: o.title,
      spotAddress: o.address,
      spotImage: o.img,
      spotCategory: o.cat,
      date: isoDay(o.day),
      time: o.time,
      maxAttendees: o.max,
      currentAttendeesCount: attendees.length + 1,
      description: o.desc,
      accessType: 'open',
      tags: o.tags,
      status: 'active',
      createdAt: new Date(Date.now() - 864e5).toISOString(),
      attendees,
    } as OutingPlan;
  });
}

export function showcaseTicketSummaries(ids: string[]): Record<string, TicketSummary> {
  const out: Record<string, TicketSummary> = {};
  for (const id of ids) {
    const o = OUTINGS.find(x => `showcase-out-${x.n}` === id);
    if (!o) continue;
    out[id] = {
      min_price: Math.min(...o.tickets.map(t => t.price)),
      left: o.tickets.reduce((a, t) => a + t.left, 0),
    };
  }
  return out;
}

export function showcasePublicTickets(source: string): PublicTicketView | null {
  const o = OUTINGS.find(x => `showcase-out-${x.n}` === source);
  if (!o) return null;
  return {
    title: o.title,
    date: isoDay(o.day),
    time: o.time,
    place: o.address,
    image: o.img,
    host: `@${o.host}`,
    paid_enabled: true,
    types: o.tickets.map((t, i) => ({
      id: `showcase-tt-${o.n}-${i}`,
      name: t.name,
      description: t.desc ?? null,
      price_kes: t.price,
      left: t.left,
      max_per_order: 4,
      sales_end: null,
      closed: false,
    })),
  };
}

const bought: MyTicket[] = [];
export function showcaseBuy(type: PublicTicketType, qty: number): void {
  const n = Number(type.id.split('-')[2]);
  const o = OUTINGS.find(x => x.n === n);
  for (let i = 0; i < qty; i++) {
    bought.unshift({
      id: `showcase-bought-${Date.now()}-${i}`,
      code: `RADA${Date.now().toString().slice(-6)}BUY${i}`,
      status: 'valid',
      created_at: new Date().toISOString(),
      checked_in_at: null,
      type_name: type.name,
      price_kes: type.price_kes,
      source_kind: 'outing',
      source_id: `showcase-out-${n}`,
      title: o?.title ?? 'Outing',
      event_date: o
        ? new Date(`${isoDay(o.day)}T12:00:00`).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })
        : null,
      event_time: o?.time ?? null,
      place: o?.address ?? null,
    });
  }
}
export const showcaseBoughtTickets = (): MyTicket[] => [...bought];
