export type BusinessCategory = 'hospitality' | 'event_organizer' | 'thrift_store';

export type OfferCategory = 'Tickets' | 'Food' | 'Drinks' | 'Apparel' | 'Special Deals' | 'Experiences';

export type DiscoveryCategory = 'all' | 'places' | 'experiences' | 'events' | 'fashion' | 'deals';

export const DISCOVERY_TAGS = [
  'Rooftop',
  'Cocktails',
  'Date Night',
  'Amapiano',
  'Brunch',
  'Live Music',
  'Outdoor & Nature',
  'Specialty Coffee',
  'Fine Dining',
  'Art & Culture',
  'Streetwear',
  'Vintage & Thrift',
  'Craft Beer',
  'Work Friendly',
  'Budget Friendly',
  'Late Night',
  'Dancing',
  'Scenic Views',
  'Wellness & Spa',
  'Activities & Games'
] as const;

export const NAIROBI_NEIGHBORHOODS = [
  'Westlands',
  'Kilimani',
  'Karen',
  'Nairobi CBD',
  'Lavington',
  'Parklands',
  'Gigiri / UN',
  'Ngong Road',
  'Upper Hill',
  'Kileleshwa',
  'Kiambu / Thika Road',
  'Ruiru',
  'Langata'
] as const;

export interface SavedItem {
  id: string | number;
  kind: 'spot' | 'experience' | 'event' | 'thrift' | 'offer';
  savedAt: string;
}

export interface BusinessOffer {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: BusinessCategory;
  title: string;
  description: string;
  category: OfferCategory;
  discount: string;
  posterUrl?: string;
  validUntil?: string;
  claimCode?: string;
  actionUrl?: string;
  createdAt?: string;
  tags?: string[];
  startDate?: string;
  terms?: string;
}

export interface SpecialOffer {
  id: string;
  title: string;
  discount: string;
  description: string;
  expires?: string;
}

export interface BusinessAccount {
  id: string;
  ownerId?: string;
  name: string;
  category: BusinessCategory;
  email: string;
  phone: string;
  whatsapp: string;
  neighborhood: string;
  address: string;
  bio: string;
  logo: string;
  coverImage?: string;
  tags?: string[];
  
verified: boolean;
verificationStatus?: 'pending' | 'approved' | 'rejected';
verificationNote?: string;
verifiedAt?: string;
verifiedBy?: string;
instagram?: string;

  createdDate: string;
  discography?: string[];
  pinnedImages?: string[];
  specialOffers?: SpecialOffer[];
}

export interface MenuItem {
  id: string;
  name: string;
  category?: string;
  price: string;
  description: string;
  isSpecial?: boolean;
}

export interface Review {
  id: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  rating: number;
  date: string;
  comment: string;
  images?: string[];
}

export type SpotCategory = 'restaurants' | 'nightlife' | 'cafes' | 'vacation' | 'hotels' | 'date_spots';

export interface SpotItem {
  id: number;
  title: string;
  category: SpotCategory;
  neighborhood: string;
  exactLocationTag?: string;
  landmark?: string;
  lat: number;
  lng: number;
  rating: string;
  reviewCount?: number;
  price: string;
  address: string;
  img: string;
  images?: string[];
  tags?: string[];
  reviews?: Review[];
  description?: string;
  menuImages?: string[];
  menuItems?: MenuItem[];
  specialOffers?: SpecialOffer[];
  businessId?: string;
  isUserUploaded?: boolean;
  phone?: string;
  openingHours?: string;
}

export interface ExperienceItem {
  id: number;
  title: string;
  category: 'workshops' | 'adventure' | 'tasting' | 'wellness' | 'culture' | 'outdoor';
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  rating: string;
  reviewCount?: number;
  price: string;
  duration?: string;
  img: string;
  images?: string[];
  description?: string;
  bookingUrl?: string;
  whatsapp?: string;
  tags?: string[];
  businessId?: string;
  included?: string[];
}

export interface Artist {
  name: string;
  role: string;
  img: string;
}

export interface TicketTier {
  name: string;
  price: string;
  perks?: string;
}

export interface EventItem {
  id: number;
  title: string;
  category: 'concerts' | 'nightlife' | 'art' | 'cinemas';
  genre?: string;
  date: string;
  time?: string;
  location: string;
  lat: number;
  lng: number;
  img: string;
  images?: string[];
  tags?: string[];
  goingCount: number;
  url: string;
  dressCode?: string;
  artists: Artist[];
  tiers: TicketTier[];
  description?: string;
  businessId?: string;
}

export interface ThriftItem {
  id: number;
  name: string;
  price: string;
  seller: string;
  storeLocation: string;
  stallNumber?: string;
  category: string;
  condition: string;
  size: string;
  img: string;
  images?: string[];
  tags?: string[];
  verified: boolean;
  businessId?: string;
  whatsapp?: string;
}

export interface CinemaMovie {
  id: number;
  title: string;
  genre?: string;
  location: 'gardencity' | 'sarit' | 'junction' | 'tworivers';
  locationName: string;
  date: string;
  times: string;
  format: string;
  img: string;
  url: string;
}

export interface StatusReply {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  timeAgo: string;
  text: string;
}

export interface StatusPost {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  timeAgo: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  locationName?: string;
  replies?: StatusReply[];
}

export interface DatingProfile {
  id: number;
  name: string;
  handle: string;
  loc: string;
  img: string;
  bio?: string;
  relationshipStatus: 'single' | 'not_single';
  vibes?: string[];
}

export interface UserProfile {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  loc: string;
  relationshipStatus: 'single' | 'not_single';
  vibes?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'them' | 'system';
  text: string;
  time: string;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
  audioUrl?: string;
  audioDuration?: number;
  videoNoteUrl?: string;
  dateInvite?: {
    spotTitle: string;
    address: string;
    date: string;
    time: string;
    accepted?: boolean;
  };
}

export type ChatTheme = 'terracotta' | 'midnight' | 'emerald' | 'sunset' | 'cyberpunk';

export interface ChatConversation {
  id: string;
  name: string;
  avatar: string;
  type: 'direct' | 'group';
  lastMessage: string;
  theme?: ChatTheme;
  members?: string[];
  messages: ChatMessage[];
}

export interface VaultTicket {
  id: string;
  title: string;
  dateStr: string;
  locationStr: string;
  type: 'Verified Ticket Pass' | 'Vault Synced Outing' | 'Cinema Movie Pass';
  qrCodeUrl?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface RadaStore {
  spots: SpotItem[];
  events: EventItem[];
  thrift: ThriftItem[];
}
