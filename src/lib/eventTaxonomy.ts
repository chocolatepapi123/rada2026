import type { EventItem } from '../types.ts';
import { isOnlineEvent } from '../utils/eventUtils.ts';

export interface EventSubdivision {
  id: string;
  label: string;
}

export interface MajorEventCategory {
  id: string;
  label: string;
  color: string;
  subdivisions: EventSubdivision[];
}

export const MAJOR_EVENT_CATEGORIES: MajorEventCategory[] = [
  {
    id: 'parties_nightlife',
    label: 'Parties & Nightlife',
    color: '#9333EA',
    subdivisions: [
      { id: 'all', label: 'All Parties & Nightlife' },
      { id: 'club_nights', label: 'Club Nights' },
      { id: 'afro_amapiano', label: 'Afrobeats & Amapiano' },
      { id: 'rooftops_brunch', label: 'Rooftops & Brunch' },
      { id: 'electronic_raves', label: 'Electronic & Raves' },
    ],
  },
  {
    id: 'music_festivals',
    label: 'Music & Festivals',
    color: '#E0533C',
    subdivisions: [
      { id: 'all', label: 'All Music & Festivals' },
      { id: 'festivals', label: 'Music Festivals' },
      { id: 'concerts', label: 'Concerts & Live Shows' },
      { id: 'rhumba_soul', label: 'Rhumba, Jazz & Soul' },
      { id: 'hiphop_dancehall', label: 'Hip-Hop, Gengetone & Reggae' },
    ],
  },
  {
    id: 'tech_innovation',
    label: 'Tech & Innovation',
    color: '#2563EB',
    subdivisions: [
      { id: 'all', label: 'All Tech & Innovation' },
      { id: 'ai_software', label: 'AI & Software' },
      { id: 'startups_demos', label: 'Startups & Product' },
      { id: 'gaming_esports', label: 'Gaming & Esports' },
      { id: 'online_tech', label: 'Online & Webinars' },
    ],
  },
  {
    id: 'business_finance',
    label: 'Business & Finance',
    color: '#0D9488',
    subdivisions: [
      { id: 'all', label: 'All Business & Finance' },
      { id: 'networking', label: 'Networking & Mixers' },
      { id: 'workshops', label: 'Workshops & Masterclasses' },
      { id: 'summits', label: 'Summits & Finance' },
      { id: 'markets_popups', label: 'Markets & Pop-Ups' },
    ],
  },
  {
    id: 'lifestyle_culture',
    label: 'Lifestyle & Culture',
    color: '#D97706',
    subdivisions: [
      { id: 'all', label: 'All Lifestyle & Culture' },
      { id: 'food_drink', label: 'Food & Drink' },
      { id: 'arts_theatre', label: 'Arts & Theatre' },
      { id: 'community_family', label: 'Community & Family' },
      { id: 'cinema_screenings', label: 'Cinema & Screenings' },
      { id: 'online_culture', label: 'Online & Virtual' },
    ],
  },
  {
    id: 'sports_fitness',
    label: 'Sports & Fitness',
    color: '#2D6A4F',
    subdivisions: [
      { id: 'all', label: 'All Sports & Fitness' },
      { id: 'runs_races', label: 'Run Clubs & Races' },
      { id: 'tournaments', label: 'Tournaments & Multi-Sport' },
      { id: 'fitness_outdoors', label: 'Fitness & Outdoor' },
    ],
  },
];

const hayOf = (e: EventItem) =>
  [
    e.title,
    e.genre,
    e.category,
    e.radaCategory,
    e.description,
    e.location,
    e.host,
    ...(e.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const RE_TECH = /\b(tech|ai|artificial intelligence|software|developer|coding|code|hackathon|startup|fintech|web3|blockchain|saas|cyber|data|product|robotics|gaming|esports|webinar)\b/i;
const RE_BIZ = /\b(business|finance|invest|founder|entrepreneur|network|mixer|summit|conference|career|workshop|masterclass|leadership|expo|popup|pop-up|market|bazaar|souk)\b/i;
const RE_SPORTS = /\b(sport|run|marathon|5k|10k|fitness|yoga|pilates|hike|hiking|cycling|football|rugby|tennis|padel|golf|tournament|athletic|swim|gym)\b/i;
const RE_NIGHTLIFE = /\b(nightlife|club|koda|muze|rave|afterparty|after party|dj|house|techno|electronic|brunch|sundowner|rooftop|lounge|21\+|amapiano)\b/i;
const RE_MUSIC = /\b(concert|festival|fest|live|music|solfest|kodong|wakadinali|ferre|konshens|detty|rhumba|jazz|soul|hip[- ]?hop|gengetone|dancehall|reggae|afrobeats|keinemusik)\b/i;

export function eventMatchesMajorCategory(e: EventItem, majorId: string): boolean {
  if (!majorId || majorId === 'all') return true;
  const rc = (e.radaCategory || '').toLowerCase();
  const h = hayOf(e);

  switch (majorId) {
    case 'parties_nightlife':
      return rc === 'nightlife' || e.category === 'nightlife' || RE_NIGHTLIFE.test(h);

    case 'music_festivals':
      return rc === 'concerts' || e.category === 'concerts' || (RE_MUSIC.test(h) && rc !== 'sports' && rc !== 'business');

    case 'tech_innovation':
      return e.category === 'tech' || RE_TECH.test(h) || (isOnlineEvent(e) && RE_TECH.test(h));

    case 'business_finance':
      return rc === 'business' || rc === 'education' || RE_BIZ.test(h);

    case 'sports_fitness':
      return rc === 'sports' || e.category === 'sports' || RE_SPORTS.test(h);

    case 'lifestyle_culture':
      return (
        ['arts', 'fashion', 'food', 'community', 'faith', 'family', 'charity', 'outdoors', 'cinemas', 'online'].includes(rc) ||
        e.category === 'art' ||
        e.category === 'cinemas' ||
        e.category === 'online' ||
        isOnlineEvent(e) ||
        /\b(art|theatre|ballet|comedy|spoken word|food|brunch|market|fashion|gallery|family|kids|community|cinema|film)\b/i.test(h)
      );

    default:
      return true;
  }
}

export function eventMatchesSubdivision(e: EventItem, majorId: string, subId: string): boolean {
  if (!majorId || majorId === 'all') return true;
  if (!eventMatchesMajorCategory(e, majorId)) return false;
  if (!subId || subId === 'all') return true;

  const rc = (e.radaCategory || '').toLowerCase();
  const h = hayOf(e);

  switch (subId) {
    // Parties & Nightlife
    case 'club_nights':
      return /\b(club|koda|lounge|21\+|dj)\b/i.test(h) || rc === 'nightlife';
    case 'afro_amapiano':
      return /\b(amapiano|afrobeats|afro house)\b/i.test(h);
    case 'rooftops_brunch':
      return /\b(rooftop|sundowner|brunch|day party)\b/i.test(h);
    case 'electronic_raves':
      return /\b(electronic|afro house|techno|rave|big beat|muze|keinemusik)\b/i.test(h);

    // Music & Festivals
    case 'festivals':
      return /\b(festival|fest|solfest|dala|detty)\b/i.test(h);
    case 'concerts':
      return /\b(concert|live|show|tour|arena|dome|muze)\b/i.test(h) || rc === 'concerts';
    case 'rhumba_soul':
      return /\b(rhumba|rumba|jazz|soul|r&b|acoustic|maya amolo)\b/i.test(h);
    case 'hiphop_dancehall':
      return /\b(hip[- ]?hop|gengetone|wakadinali|dancehall|reggae|konshens|rong)\b/i.test(h);

    // Tech & Innovation
    case 'ai_software':
      return /\b(ai|artificial intelligence|software|developer|coding|code|data|cyber)\b/i.test(h);
    case 'startups_demos':
      return /\b(startup|pitch|demo|founder|product|fintech|saas|web3)\b/i.test(h);
    case 'gaming_esports':
      return /\b(gaming|game|esports|vr|arcade)\b/i.test(h);
    case 'online_tech':
      return isOnlineEvent(e) || /\b(webinar|virtual|zoom|online)\b/i.test(h);

    // Business & Finance
    case 'networking':
      return /\b(network|mixer|social|meetup|connect)\b/i.test(h);
    case 'workshops':
      return rc === 'education' || /\b(workshop|masterclass|training|seminar|bootcamp)\b/i.test(h);
    case 'summits':
      return rc === 'business' || /\b(summit|conference|forum|finance|invest|business)\b/i.test(h);
    case 'markets_popups':
      return /\b(market|pop-up|popup|bazaar|souk|makers|expo)\b/i.test(h);

    // Lifestyle & Culture
    case 'food_drink':
      return rc === 'food' || /\b(food|brunch|drink|wine|beer|culinary|tasting|coffee|tea)\b/i.test(h);
    case 'arts_theatre':
      return rc === 'arts' || rc === 'fashion' || e.category === 'art' || /\b(art|theatre|theater|ballet|nutcracker|comedy|gallery|fashion)\b/i.test(h);
    case 'community_family':
      return ['community', 'faith', 'family', 'charity', 'outdoors'].includes(rc) || /\b(community|family|kids|colour|charity)\b/i.test(h);
    case 'cinema_screenings':
      return rc === 'cinemas' || e.category === 'cinemas' || /\b(cinema|film|screening|movie)\b/i.test(h);
    case 'online_culture':
      return isOnlineEvent(e);

    // Sports & Fitness
    case 'runs_races':
      return /\b(run|marathon|5k|10k|trail|walk)\b/i.test(h);
    case 'tournaments':
      return /\b(tournament|cup|league|multi-sport|festival|football|rugby|padel|tennis)\b/i.test(h);
    case 'fitness_outdoors':
      return /\b(fitness|yoga|pilates|gym|workout|hike|cycling|outdoor)\b/i.test(h) || rc === 'sports';

    default:
      return true;
  }
}
