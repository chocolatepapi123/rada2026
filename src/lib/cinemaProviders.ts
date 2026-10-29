// Single source of truth shared by the seed script AND the UI.
// Keep this file free of browser/Vite-only imports so `tsx` can load it.

export interface ProviderInfo {
  id: string;
  label: string;         // "Anga Cinemas"
  short: string;         // "Anga"
  color: string;         // accent used for chips / buttons
  textColor: string;
  bookLabel: string;     // CTA text
  hint: string;          // one line telling the user what happens when they tap
  hasShowtimes: boolean; // true = individual showtimes are seeded with direct links
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  anga: {
    id: 'anga', label: 'Anga Cinemas', short: 'Anga',
    color: '#E11D48', textColor: '#FFFFFF',
    bookLabel: 'Book on Anga',
    hint: 'Each time opens Anga’s seat picker directly.',
    hasShowtimes: true,
  },
  century: {
    id: 'century', label: 'Century Cinemax', short: 'Century',
    color: '#DA532C', textColor: '#FFFFFF',
    bookLabel: 'Book on Century Cinemax',
    hint: 'Opens the film at your cinema. Pick date & time there, pay with M-Pesa.',
    hasShowtimes: false,
  },
  kenyabuzz: {
    id: 'kenyabuzz', label: 'KenyaBuzz', short: 'KenyaBuzz',
    color: '#CA1B37', textColor: '#FFFFFF',
    bookLabel: 'Book on KenyaBuzz',
    hint: 'Opens KenyaBuzz ticketing for this film.',
    hasShowtimes: false,
  },
  unseen: {
    id: 'unseen', label: 'Unseen Nairobi', short: 'Unseen',
    color: '#111827', textColor: '#FFFFFF',
    bookLabel: 'Tickets & times (Mookh)',
    hint: 'Independent rooftop cinema. Tickets are sold on Mookh.',
    hasShowtimes: false,
  },
};

export const GENERIC_PROVIDER: ProviderInfo = {
  id: 'other', label: 'Cinema', short: 'Cinema',
  color: '#2D6A4F', textColor: '#FFFFFF',
  bookLabel: 'Book tickets', hint: 'Opens the booking page.', hasShowtimes: false,
};

export const providerOf = (id?: string): ProviderInfo =>
  (id && PROVIDERS[id]) || GENERIC_PROVIDER;

/** venue_key → display label (this label is what search and area-matching see). */
export const VENUE_LABELS: Record<string, string> = {
  century_garden_city: 'Century Cinemax Garden City',
  century_sarit: 'Century Cinemax Sarit',
  century_junction: 'Century Cinemax Junction',
  century_two_rivers: 'Century Cinemax Two Rivers',
  anga_diamond: 'Anga Diamond Plaza',
  anga_panari: 'Anga Sky Panari',
  anga_cbd: 'Anga CBD',
  unseen: 'Unseen Nairobi (Yaya Centre)',
};

export interface Area {
  id: string;
  label: string;
  keywords: string[];
  coords: { lat: number; lng: number };
}

/** Area filter. A venue belongs to the first area whose keyword appears in its label. */
export const AREAS: Area[] = [
  { id: 'sarit', label: 'Sarit Centre', keywords: ['sarit'], coords: { lat: -1.2635, lng: 36.8028 } },
  { id: 'westgate', label: 'Westgate', keywords: ['westgate'], coords: { lat: -1.2582, lng: 36.8041 } },
  { id: 'two_rivers', label: 'Two Rivers', keywords: ['two rivers'], coords: { lat: -1.2057, lng: 36.7745 } },
  { id: 'garden_city', label: 'Garden City', keywords: ['garden city'], coords: { lat: -1.2322, lng: 36.8778 } },
  { id: 'junction', label: 'Junction Mall', keywords: ['junction'], coords: { lat: -1.2989, lng: 36.7618 } },
  { id: 'prestige', label: 'Prestige Plaza', keywords: ['prestige'], coords: { lat: -1.2982, lng: 36.7865 } },
  { id: 'diamond', label: 'Diamond Plaza', keywords: ['diamond'], coords: { lat: -1.2585, lng: 36.8145 } },
  { id: 'cbd', label: 'Nairobi CBD', keywords: ['anga cbd'], coords: { lat: -1.2857, lng: 36.8202 } },
  { id: 'panari', label: 'Panari Sky', keywords: ['panari'], coords: { lat: -1.3288, lng: 36.8533 } },
  { id: 'yaya', label: 'Unseen / Yaya', keywords: ['unseen', 'yaya'], coords: { lat: -1.2937, lng: 36.7878 } },
];

export const areaOf = (venueLabel: string): Area | undefined => {
  const l = venueLabel.toLowerCase();
  return AREAS.find(a => a.keywords.some(k => l.includes(k)));
};

// ---------------------------------------------------------------------
// Title normalisation: "Dune: Part Three -2D IMAX" and "Dune: Part Three"
// become the same key, so one film = one card across all providers.
// ---------------------------------------------------------------------
const FORMAT_WORDS = /\b(imax|3d|2d|4dx|atmos|vip|subbed|dubbed|hindi|encore)\b/gi;

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(FORMAT_WORDS, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function detectFormat(...hints: (string | undefined)[]): '2D' | '3D' | 'IMAX' {
  const s = hints.filter(Boolean).join(' ').toLowerCase();
  if (/imax/.test(s)) return 'IMAX';
  if (/3d/.test(s)) return '3D';
  return '2D';
}
