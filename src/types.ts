export type BusinessCategory = 'hospitality' | 'event_organizer' | 'thrift_store';

export interface BusinessAccount {
  id: string;
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
  verified: boolean;
  instagram?: string;
  createdDate: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
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

export interface SpotItem {
  id: number;
  title: string;
  category: 'restaurants' | 'nightlife' | 'cafes';
  neighborhood: string;
  lat: number;
  lng: number;
  rating: string;
  reviewCount?: number;
  price: string;
  address: string;
  img: string;
  images?: string[];
  reviews?: Review[];
  description?: string;
  menuImages?: string[];
  menuItems?: MenuItem[];
  businessId?: string;
  phone?: string;
  openingHours?: string;
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
  date: string;
  time?: string;
  location: string;
  lat: number;
  lng: number;
  img: string;
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
  verified: boolean;
  businessId?: string;
  whatsapp?: string;
}

export interface CinemaMovie {
  id: number;
  title: string;
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
  dateInvite?: {
    spotTitle: string;
    address: string;
    date: string;
    time: string;
    accepted?: boolean;
  };
}

export interface ChatConversation {
  id: string;
  name: string;
  avatar: string;
  type: 'direct' | 'group';
  lastMessage: string;
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
