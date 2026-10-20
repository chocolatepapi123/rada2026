/** Platform owner. UI gate only: real enforcement must live in Supabase RLS / RPCs (see admin_migration.sql). */
export const ADMIN_EMAIL = 'hello.rada.app@gmail.com';

export type UserRole = 'user' | 'merchant' | 'admin';

/** True when the account is the platform owner or carries the admin role. */
export function isPlatformAdmin(user?: { email?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  return (user.email || '').trim().toLowerCase() === ADMIN_EMAIL || user.role === 'admin';
}

export type BusinessCategory = 'hospitality' | 'event_organizer';

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

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

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
/** Subscription / billing state (mirrors rada_businesses.subscription_* or data.subscription*). */
subscriptionStatus?: SubscriptionStatus;
subscriptionPlan?: string;
subscriptionAmount?: number;
subscriptionRenewsAt?: string;
/** Set when an admin suspends the merchant's listing privileges. */
isSuspended?: boolean;

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
  /**
   * false = published by an admin on behalf of a venue; no merchant owns it yet and any verified
   * business may claim it. undefined/true = owned (all pre-existing spots).
   */
  is_claimed?: boolean;
  /** Admin-published listing (not created by a business account). */
  isAdminPublished?: boolean;
  claimedByBusinessId?: string;
  claimedAt?: string;
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
  category: 'concerts' | 'nightlife' | 'art' | 'cinemas' | 'tech' | 'sports';
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
  userId?: string;
  /** ISO time the status was posted. Drives the 12-hour expiry; demo posts without it never expire. */
  createdAt?: string;
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
  /** Private. Only ever shown to the account owner (e.g. Account Settings), never on public surfaces. */
  name: string;
  /** Unique lowercase username without the "@" (3-20 chars: a-z, 0-9, _ or -). */
  username?: string;
  /** Public identity, always "@" + username. This is the ONLY name shown to other people. */
  handle: string;
  avatar: string;
  bio: string;
  loc: string;
  relationshipStatus: 'single' | 'not_single';
  vibes?: string[];
  isLivenessVerified?: boolean;
  is_liveness_verified?: boolean;
  relationship_status?: string;
  /**
   * Professional (creator/host) account. Switching is instant and self-serve: there is no
   * review or approval step. Mirrors profiles.is_creator in Supabase.
   */
  is_creator?: boolean;
  /** Mirrors profiles.account_type. */
  account_type?: AccountType;
  /** ISO time the account was switched to professional. */
  professional_since?: string;
  email?: string;
  role?: UserRole;
  is_suspended?: boolean;
}

export type AccountType = 'personal' | 'professional';

/** Outing analytics for professional accounts. null = no data available yet (shown as an empty state, never mock data). */
export interface HostAnalytics {
  impressions: number | null;
  eventSaves: number | null;
  profileViews: number | null;
  rsvps: number | null;
}

/** Advanced host controls, stored per user. */
export interface HostControls {
  featuredSpots: boolean;
  priorityListing: boolean;
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
  outingId?: string;
  outingTitle?: string;
  isTemporary?: boolean;
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
  kind: 'spot' | 'event' | 'offer' | 'thrift';
  savedAt: string;
  folderId?: string;
}

export interface OutingAttendee {
  id: string;
  outingId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandle?: string;
  status: 'pending' | 'joined' | 'approved' | 'declined';
  isVerified?: boolean;
  requestedAt: string;
}

export interface OutingPlan {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostHandle?: string;
  isHostVerified?: boolean;
  spotId?: number;
  spotTitle: string;
  spotAddress?: string;
  spotImage?: string;
  spotCategory?: string;
  date: string;
  time: string;
  maxAttendees: number;
  currentAttendeesCount?: number;
  description: string;
  accessType: 'open' | 'singles_only';
  tags?: string[];
  status?: 'active' | 'full' | 'completed' | 'cancelled';
  createdAt?: string;
  attendees?: OutingAttendee[];
}


// =====================================================================
// ADMIN
// =====================================================================
export interface AdminUserRecord {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  isCreator: boolean;
  isMerchant: boolean;
  businessIds: string[];
  isSuspended: boolean;
  suspendedReason?: string;
  suspendedAt?: string;
  createdAt?: string;
}

export interface PlatformStats {
  totalUsers: number | null;
  totalSpots: number | null;
  totalEvents: number | null;
  totalBusinesses: number | null;
  professionalHosts: number | null;
  unclaimedSpots: number | null;
}

/** Fields an admin supplies when publishing a spot with no business account behind it. */
export interface UnclaimedSpotInput {
  title: string;
  category: SpotCategory;
  neighborhood: string;
  address: string;
  description?: string;
  phone?: string;
  openingHours?: string;
  price?: string;
  img?: string;
  lat?: number;
  lng?: number;
  website?: string;
  instagram?: string;
}
