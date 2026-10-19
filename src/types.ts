export type BusinessCategory = 'hospitality' | 'event_organizer' | 'thrift_store';

export type OfferCategory = 'Tickets' | 'Food' | 'Drinks' | 'Apparel' | 'Special Deals';

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

export type MainSpotCategory = 
  | 'restaurants_dining'
  | 'nature'
  | 'creative_leisure'
  | 'tech_gaming'
  | 'action_sports'
  | 'date_spots'
  | 'clubs_lounges'
  | 'cafes_bakeries'
  | 'hotels_luxury'
  | 'vacation_escapes';

export type SpotCategory = 
  | MainSpotCategory
  | 'restaurants' 
  | 'nightlife' 
  | 'cafes' 
  | 'vacation' 
  | 'hotels' 
  | 'activities' 
  | 'outdoors' 
  | 'social_activities'
  | 'connect_with_nature'
  | 'outdoor_fitness'
  | 'creative_arts'
  | 'spa_wellness'
  | 'event_space';

export interface ActivityItem {
  id: string;
  name: string;
  price: string;
  duration?: string;
  description: string;
  equipmentProvided?: string;
}

export interface SpotItem {
  id: number;
  title: string;
  category: SpotCategory;
  subcategory?: string;
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
  reviews?: Review[];
  description?: string;
  menuImages?: string[];
  menuItems?: MenuItem[];
  specialOffers?: SpecialOffer[];
  businessId?: string;
  merchantId?: string;
  isUserUploaded?: boolean;
  phone?: string;
  openingHours?: string;
  // Dynamic Category-Specific Metadata
  // 1. Restaurants and dining
  diningTypes?: string;
  cuisineTypes?: string[];
  featuredDishes?: string[];
  menuUploadUrl?: string;
  // 2. Nature & Outdoors
  equipmentToCarry?: string;
  equipmentNeeded?: string;
  equipmentProvided?: string;
  skillLevel?: 'All Levels' | 'Beginner' | 'Intermediate' | 'Advanced' | string;
  whatToBring?: string;
  // 3. Creative and leisure
  craftActivities?: string;
  workshopDetails?: string;
  // 4. Tech and Gaming
  pricePerHour?: string;
  timeSlots?: string;
  availableGames?: string[] | string;
  gameConsoles?: string;
  activitySchedule?: string;
  // 5. Action and sports
  sportTypes?: string;
  // 6. Date spots
  atmosphereTags?: string[];
  bookingOptions?: string;
  // 7. Clubs and lounges
  nightlifeOptions?: string;
  bottleServiceOptions?: string;
  // 8. Cafes and Bakeries
  coffeePastryMenu?: string;
  workFriendlyTags?: string[];
  // 9. Hotels and luxury stays
  roomTypes?: string;
  amenitiesList?: string[];
  // 10. Vacation spots and escapes
  weekendGetawayDetails?: string;
  dayPassDetails?: string;
  // Venues & general
  capacity?: string | number;
  amenitiesAV?: string[];
  bookingPolicies?: string;
  // Social Links & Web
  website?: string;
  instagram?: string;
  socialLinks?: {
    website?: string;
    instagram?: string;
  };
  // Tailored activity fields for non-food categories
  activityType?: string;
  bookingSlots?: string;
  groupSizeMin?: number | string;
  groupSizeMax?: number | string;
  activitiesList?: ActivityItem[];
  difficulty?: 'Easy' | 'Moderate' | 'Challenging' | 'Expert' | string;
  distanceDuration?: string;
  meetingPoint?: string;
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
  isLivenessVerified?: boolean;
}

export interface UserProfile {
  id?: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  loc: string;
  relationshipStatus: 'single' | 'not_single';
  vibes?: string[];
  isLivenessVerified?: boolean;
  is_liveness_verified?: boolean;
  relationship_status?: string;
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
  videoUrl?: string;
  videoDuration?: number;
  dateInvite?: {
    spotTitle: string;
    address: string;
    date: string;
    time: string;
    accepted?: boolean;
  };
  photos?: string[];
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

export interface CollectionFolder {
  id: string;
  name: string;
  createdAt: string;
  emoji?: string;
  description?: string;
}

export interface SavedItem {
  id: string | number;
  kind: 'spot' | 'event' | 'thrift' | 'offer';
  savedAt: string;
  folderId?: string;
}

