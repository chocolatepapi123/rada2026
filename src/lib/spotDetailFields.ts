import { resolveSpotCategory } from './spotCategories';

/**
 * Shared definition of the editable detail fields for each of the 17 RADA categories.
 * Used by BOTH the spot detail screen (SpotDetailSections) and the owner form (SpotDetailsEditor).
 * Each block maps to columns of public.spot_details:
 *   menu       -> menu_url, menu_items
 *   pricing    -> pricing        (label, amount_kes, unit, note)
 *   activities -> activities     (name, price_kes, price_note, duration_min, description)
 *   equipment  -> equipment      (name, provided, rental_price_kes, note)
 *   priceRange -> price_min_kes, price_max_kes
 *   payments   -> payment_methods
 *   reservation-> reservation_policy / _url / _phone / _whatsapp / _notes
 */
export type BlockKey = 'menu' | 'pricing' | 'activities' | 'equipment' | 'priceRange' | 'payments' | 'reservation';

export interface BlockConfig {
  block: BlockKey;
  title: string;
  hint?: string;
  addLabel?: string;
  namePlaceholder?: string;
  units?: string[];
}

const UNITS_STAY = ['per night', 'per stay', 'per person', 'per day'];
const UNITS_ENTRY = ['per person', 'per group', 'per table', 'per bottle', 'per hour', 'per session', 'flat'];
const UNITS_TIME = ['per hour', 'per game', 'per session', 'per person', 'per day', 'flat'];

const menu = (title = 'Menu', hint?: string): BlockConfig => ({ block: 'menu', title, hint, addLabel: 'Add menu item', namePlaceholder: 'Item name' });
const pricing = (title: string, hint?: string, units: string[] = UNITS_ENTRY, namePlaceholder = 'What it covers'): BlockConfig =>
  ({ block: 'pricing', title, hint, units, addLabel: 'Add price', namePlaceholder });
const activities = (title: string, hint?: string, namePlaceholder = 'Activity name'): BlockConfig =>
  ({ block: 'activities', title, hint, addLabel: 'Add activity', namePlaceholder });
const equipment = (title: string, hint?: string, namePlaceholder = 'Item'): BlockConfig =>
  ({ block: 'equipment', title, hint, addLabel: 'Add item', namePlaceholder });
const priceRange = (title = 'Typical price range (KES)'): BlockConfig => ({ block: 'priceRange', title });
const payments = (): BlockConfig => ({ block: 'payments', title: 'Payment methods', hint: 'Separate with commas, e.g. Cash, M-Pesa till 123456, Card' });
const reservation = (title = 'Reservations', hint?: string): BlockConfig => ({ block: 'reservation', title, hint });

export const CATEGORY_DETAIL_FIELDS: Record<string, BlockConfig[]> = {
  restaurants: [menu('Menu'), priceRange(), payments(), reservation('Table reservations'), activities('Experiences', 'Brunch, live music, kids play area…')],
  hotels_stays: [pricing('Room types & rates', 'One row per room type', UNITS_STAY, 'Room type'), equipment('Amenities & facilities', 'Pool, gym, Wi-Fi, breakfast…', 'Amenity'), activities('Services & experiences'), payments(), reservation('Room booking')],
  clubs_lounges: [pricing('Cover charge & table / bottle packages', 'Cover charge, VIP tables, bottle deals', UNITS_ENTRY, 'e.g. Cover charge, VIP table'), menu('Drinks menu'), activities('Nights & events', 'DJ nights, themed nights…'), payments(), reservation('Table or bottle booking')],
  cafes_bakeries: [menu('Menu'), priceRange(), equipment('Work-friendly extras', 'Wi-Fi, sockets, quiet zone…', 'Amenity'), payments(), reservation('Reservations')],
  date_spots: [menu('Menu'), pricing('Date packages & set prices', 'Dinner for two, picnic packages…', UNITS_ENTRY, 'Package name'), activities('Date experiences'), priceRange(), payments(), reservation('Reservations')],
  outdoors_nature: [activities('Activities', 'Hiking, camping, zip-line, horse riding…'), pricing('Entry fees & rates', 'Gate fees, guided walks, camping', UNITS_ENTRY, 'e.g. Citizen entry'), equipment('Gear: provided or to bring', 'Mark what is provided and what visitors should bring', 'Gear item'), payments(), reservation('Booking & permits')],
  sports_adventure: [activities('Activities & sessions', 'Go-karting, climbing, classes…'), equipment('Equipment: provided or to bring', 'Mark what is provided and what to bring', 'Equipment item'), pricing('Prices', 'Per session, per hour, memberships', UNITS_TIME, 'What it covers'), payments(), reservation('Booking')],
  fast_food: [menu('Menu'), priceRange(), payments()],
  getaways_resorts: [pricing('Rooms, day passes & packages', 'One row per room type or pass', UNITS_STAY, 'Room or package'), activities('Activities on site'), equipment('Amenities & facilities', undefined, 'Amenity'), payments(), reservation('Booking')],
  bars_chill: [menu('Drinks & food menu'), pricing('Cover charge & deals', 'Happy hour, cover charge, bucket deals', UNITS_ENTRY, 'e.g. Happy hour beers'), activities('Events & nights'), payments(), reservation('Table reservations')],
  arts_culture: [activities('Shows, exhibitions & workshops', undefined, 'Show or workshop name'), pricing('Tickets & fees', undefined, UNITS_ENTRY, 'Ticket type'), equipment('Materials: provided or to bring', undefined, 'Material'), payments(), reservation('Booking & tickets')],
  gaming_arcades: [pricing('Prices', 'Per hour, per game, passes', UNITS_TIME, 'e.g. PS5 per hour'), equipment('Consoles, games & gear', 'Add consoles, game titles, VR…', 'Console or game'), activities('Tournaments & events'), payments(), reservation('Booking')],
  garden_hangouts: [menu('Menu'), pricing('Entry fees & rates', undefined, UNITS_ENTRY, 'e.g. Entry'), activities('Activities & events'), payments(), reservation('Reservations')],
  nyama_choma: [menu('Menu', 'Meats, sides, platters; prices per kg or per portion'), priceRange(), payments(), reservation('Table reservations')],
  rooftops: [menu('Drinks & food menu'), pricing('Cover charge & minimum spend', undefined, UNITS_ENTRY, 'e.g. Cover charge, minimum spend'), activities('Events & nights'), payments(), reservation('Table or booth booking')],
  hangouts_leisure: [activities('Activities', undefined), pricing('Prices', undefined, UNITS_ENTRY, 'What it covers'), equipment('Equipment: provided or to bring', undefined, 'Item'), payments(), reservation('Booking')],
  desserts: [menu('Menu'), priceRange(), payments()],
};

export const DEFAULT_DETAIL_FIELDS: BlockConfig[] = [
  menu('Menu'), pricing('Prices'), activities('Activities'), equipment('Equipment & amenities'), priceRange(), payments(), reservation('Reservations'),
];

export function getDetailBlocks(rawCategory?: string | null): BlockConfig[] {
  const id = resolveSpotCategory(rawCategory);
  return (id && CATEGORY_DETAIL_FIELDS[id]) || DEFAULT_DETAIL_FIELDS;
}

export function getBlockTitle(rawCategory: string | null | undefined, block: BlockKey, fallback: string): string {
  return getDetailBlocks(rawCategory).find(b => b.block === block)?.title || fallback;
}
