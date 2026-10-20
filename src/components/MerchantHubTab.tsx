import React, { useState } from 'react';
import { 
  Store, 
  Ticket, 
  Plus, 
  Search, 
  CheckCircle2, 
  BarChart3,
  Edit3, 
  Trash2, 
  MapPin, 
  Clock, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  Percent, 
  Tag, 
  ChevronRight, 
  Image as ImageIcon, 
  ArrowRight, 
  ShieldCheck, 
  CalendarDays, 
  Users, 
  Sliders, 
  DollarSign, 
  Flame, 
  Copy, 
  Check, 
  AlertCircle,
  Building2,
  Share2,
  RefreshCw,
  UtensilsCrossed,
  X,
  ArrowLeft,
  Upload,
  Camera,
  Compass,
  Globe,
  Instagram,
  Heart,
  FileText,
  Dumbbell,
  Gamepad2,
  Palette,
  Trees,
  Coffee,
  Hotel,
  Palmtree,
  Music
} from 'lucide-react';
import { 
  BusinessAccount, 
  BusinessCategory, 
  BusinessOffer, 
  OfferCategory,
  SpotItem, 
  SpotCategory,
  EventItem, 
  MenuItem, 
  ActivityItem,
  TicketTier, 
  Artist 
} from '../types.ts';
import { BusinessBadge } from './BusinessBadge.tsx';
import { DynamicLocationSelector } from './DynamicLocationSelector.tsx';
import { toValidUuid } from '../lib/cloudSync.ts';
import { deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import { SpotInsightsAnalytics } from './MerchantHub.tsx';

export type MainCategoryKey = 
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

// Backward compatibility alias
export type PrimaryCategoryGroup = MainCategoryKey;

export interface PrimaryCategoryConfig {
  id: MainCategoryKey;
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const MAIN_SPOT_CATEGORIES: PrimaryCategoryConfig[] = [
  {
    id: 'restaurants_dining',
    label: 'Restaurants and dining',
    badge: 'Dining & Kitchens',
    description: 'Fine dining, casual eateries, grills & culinary spots',
    icon: UtensilsCrossed,
    accentColor: 'border-[#F59E0B]/40 bg-[#FEF3C7] dark:bg-[#F59E0B20] text-[#B45309] dark:text-[#FCD34D]'
  },
  {
    id: 'nature',
    label: 'Nature',
    badge: 'Parks & Trails',
    description: 'Parks, hiking trails, nature sanctuaries & outdoor reserves',
    icon: Trees,
    accentColor: 'border-[#10B981]/40 bg-[#D1FAE5] dark:bg-[#10B98120] text-[#047857] dark:text-[#6EE7B7]'
  },
  {
    id: 'creative_leisure',
    label: 'Creative and leisure',
    badge: 'Art & Studios',
    description: 'Workshops, art studios, pottery & craft activities',
    icon: Palette,
    accentColor: 'border-[#D946EF]/40 bg-[#FAE8FF] dark:bg-[#D946EF20] text-[#A21CAF] dark:text-[#F0ABFC]'
  },
  {
    id: 'tech_gaming',
    label: 'Tech and Gaming',
    badge: 'Cyber & Gaming',
    description: 'Arcades, VR hubs, esports lounges & gaming setups',
    icon: Gamepad2,
    accentColor: 'border-[#06B6D4]/40 bg-[#CFFAFE] dark:bg-[#06B6D420] text-[#0E7490] dark:text-[#67E8F9]'
  },
  {
    id: 'action_sports',
    label: 'Action and sports',
    badge: 'Sports & Adrenaline',
    description: 'Fitness centers, extreme sports, go-karting & climbing',
    icon: Dumbbell,
    accentColor: 'border-[#EF4444]/40 bg-[#FEE2E2] dark:bg-[#EF444420] text-[#B91C1C] dark:text-[#FCA5A5]'
  },
  {
    id: 'date_spots',
    label: 'Date spots',
    badge: 'Romance & Dates',
    description: 'Candlelit dining, intimate rooftop lounges & scenic date moves',
    icon: Heart,
    accentColor: 'border-[#F43F5E]/40 bg-[#FFE4E6] dark:bg-[#F43F5E20] text-[#BE123C] dark:text-[#FDA4AF]'
  },
  {
    id: 'clubs_lounges',
    label: 'Clubs and lounges',
    badge: 'Nightlife & Lounges',
    description: 'Dance clubs, DJ lounges, cocktail bars & VIP bottle service',
    icon: Music,
    accentColor: 'border-[#A855F7]/40 bg-[#F3E8FF] dark:bg-[#A855F720] text-[#7E22CE] dark:text-[#D8B4FE]'
  },
  {
    id: 'cafes_bakeries',
    label: 'Cafes and Bakeries',
    badge: 'Cafés & Pastries',
    description: 'Specialty coffee shops, artisanal bakeries & work-friendly spaces',
    icon: Coffee,
    accentColor: 'border-[#D97706]/40 bg-[#FEF3C7] dark:bg-[#D9770620] text-[#92400E] dark:text-[#FDE68A]'
  },
  {
    id: 'hotels_luxury',
    label: 'Hotels and luxury stays',
    badge: 'Stays & Luxury',
    description: 'Boutique luxury hotels, suites, safari lodges & staycations',
    icon: Hotel,
    accentColor: 'border-[#EAB308]/40 bg-[#FEF9C3] dark:bg-[#EAB30820] text-[#854D0E] dark:text-[#FEF08A]'
  },
  {
    id: 'vacation_escapes',
    label: 'Vacation spots and escapes',
    badge: 'Vacation & Getaways',
    description: 'Weekend getaways, country cabins, villas & day-pass resorts',
    icon: Palmtree,
    accentColor: 'border-[#3B82F6]/40 bg-[#DBEAFE] dark:bg-[#3B82F620] text-[#1D4ED8] dark:text-[#93C5FD]'
  }
];

export const PRIMARY_SPOT_CATEGORIES = MAIN_SPOT_CATEGORIES;

export const SUBCATEGORIES_BY_CATEGORY: Record<MainCategoryKey, string[]> = {
  restaurants_dining: [
    'Fine Dining',
    'Casual Dining & Bistro',
    'Grill, BBQ & Smokehouse',
    'Swahili Coastal Kitchen',
    'Seafood & Steakhouse',
    'Asian Fusion & Sushi',
    'Street Food & Quick Bites',
    'Buffet & Contemporary Dining'
  ],
  nature: [
    'Parks & Botanical Sanctuaries',
    'Hiking & Walking Trails',
    'Outdoor & Scenic Viewpoints',
    'Waterfalls & Forest Reserves',
    'Eco-Sanctuary & Wildlife Walks',
    'Picnic & Camping Grounds'
  ],
  creative_leisure: [
    'Workshops & Masterclasses',
    'Art Studios & Painting',
    'Craft Activities & DIY',
    'Pottery & Ceramic Studios',
    'Paint & Sip Lounges',
    'Photography & Creative Studios'
  ],
  tech_gaming: [
    'Arcades & Retro Gaming',
    'VR Hubs & Virtual Reality Arenas',
    'Console Lounges (PS5 / Xbox)',
    'Esports Arenas & PC LAN Rigs',
    'Racing & Flight Simulators',
    'Board Game & Tabletop Lounges'
  ],
  action_sports: [
    'Fitness Centers & Gyms',
    'Extreme Sports & Adventure Parks',
    'Go-Karting & Motorsports',
    'Paintball & Tactical Arenas',
    'Rock Climbing & Bouldering',
    'Combat Sports & Martial Arts'
  ],
  date_spots: [
    'Candlelit Romantic Dinners',
    'Scenic Sunset & Rooftop Bars',
    'Cozy Wine & Tapas Lounges',
    'Intimate Garden Hideaways',
    'Fine Dining for Two',
    'Acoustic & Low-Lit Lounges'
  ],
  clubs_lounges: [
    'Nightclubs & Dancefloors',
    'Cocktail Lounges',
    'VIP Bottle Service Lounges',
    'DJ Lounges & Late-Night Bars',
    'Shisha & Hookah Lounges',
    'Rooftop Nightclub & Afterhours'
  ],
  cafes_bakeries: [
    'Specialty Coffee Roasters',
    'Artisanal Bakery & Patisserie',
    'Work-Friendly Laptop Cafes',
    'Brunch & Breakfast Cafes',
    'Garden & Courtyard Cafes',
    'Dessert & Creperie Bars'
  ],
  hotels_luxury: [
    'Boutique Luxury Hotels',
    'Executive Suites & Business Stays',
    '5-Star Luxury Resorts',
    'Safari Lodges & Tented Camps',
    'Spa & Wellness Retreats',
    'Penthouse & City View Stays'
  ],
  vacation_escapes: [
    'Weekend Getaways & Country Cabins',
    'Beachfront & Lakefront Escapes',
    'Private Villa & Estate Rentals',
    'Glamping & Eco-Lodges',
    'Day Pass & Pool Escapes',
    'Adventure & Nature Retreats'
  ]
};

export const SUBCATEGORIES_BY_GROUP = SUBCATEGORIES_BY_CATEGORY;

export function getSpotCategoryGroup(cat: string): MainCategoryKey {
  const c = (cat || '').toLowerCase();
  if (c === 'restaurants' || c === 'restaurants_dining') return 'restaurants_dining';
  if (c === 'nature' || c === 'connect_with_nature' || c === 'outdoors') return 'nature';
  if (c === 'creative_leisure' || c === 'creative_arts' || c === 'social_activities') return 'creative_leisure';
  if (c === 'tech_gaming') return 'tech_gaming';
  if (c === 'action_sports' || c === 'outdoor_fitness' || c === 'activities') return 'action_sports';
  if (c === 'date_spots') return 'date_spots';
  if (c === 'clubs_lounges' || c === 'nightlife') return 'clubs_lounges';
  if (c === 'cafes_bakeries' || c === 'cafes') return 'cafes_bakeries';
  if (c === 'hotels_luxury' || c === 'hotels') return 'hotels_luxury';
  if (c === 'vacation_escapes' || c === 'vacation') return 'vacation_escapes';
  return 'restaurants_dining';
}

export const PRESET_ATMOSPHERE_TAGS = [
  'Romantic & Candlelit',
  'Rooftop City Views',
  'Intimate Low-Lit Seating',
  'Live Acoustic Music',
  'Scenic Sunset Vibe',
  'Quiet & Cozy Ambience',
  'Lush Garden Hideaway',
  'Chic & Upscale Decor'
];

export const PRESET_WORK_FRIENDLY_TAGS = [
  'High-Speed Fiber WiFi',
  'Abundant Power Outlets',
  'Quiet Work Atmosphere',
  'Laptop Friendly',
  'Spacious Work Tables',
  'Natural Daylight',
  'Specialty Pour-over Coffee',
  'Meeting Friendly'
];

export const PRESET_HOTEL_AMENITIES = [
  'Infinity Swimming Pool',
  '24/7 Room Service',
  'Private Balcony / Terrace',
  'Luxury Spa & Steam Sauna',
  'Fine Dining Restaurant & Bar',
  'Airport Shuttle Transfer',
  'Complimentary Breakfast Buffet',
  'High-Speed Dedicated WiFi',
  'Valet Parking & Secure Garage',
  'State-of-the-Art Fitness Gym'
];

export const PRESET_NATURE_EQUIPMENT = [
  'Comfortable Hiking Boots',
  'Reusable Water Bottle (2L)',
  'Lightweight Rain Jacket',
  'Sun Hat & Sunglasses',
  'Insect / Mosquito Repellent',
  'Camera / Binoculars',
  'Small Daypack / Backpack',
  'Sunscreen (SPF 50)'
];

export const PRESET_CUISINES = [
  'Kenyan / Nyama Choma',
  'Swahili Coastal',
  'Italian & Woodfired Pizza',
  'Asian Fusion & Sushi',
  'Burgers & Smokehouse',
  'Artisanal Coffee & Bakery',
  'Craft Cocktails & Tapas',
  'Indian & Tandoori',
  'Fine Dining',
  'Breakfast & Brunch',
  'Seafood & Grill',
  'Late-Night Bites'
];

export const PRESET_WHAT_TO_BRING = [
  'Comfortable Activewear',
  'Reusable Water Bottle',
  'Hiking / Trail Shoes',
  'Sunscreen & Sunglasses',
  'Personal Towel',
  'Change of Clothes',
  'Rain Poncho / Jacket',
  'Energy Snacks'
];

export const PRESET_VENUE_AMENITIES = [
  'PA Sound System & Microphones',
  'HD Projector & Giant Screen',
  'Performance Stage & Trussing',
  'High-Speed Dedicated Fiber WiFi',
  'Automatic Backup Generator (No Blackouts)',
  'VIP Green Room / Bridal Suite',
  'Dedicated On-site Parking (100+ cars)',
  'Central Air Conditioning / Climate Control',
  'Lush Outdoor Lawn / Garden Area',
  'Commercial Catering Kitchen',
  'Wheelchair & Disability Accessible',
  'Professional Stage Lighting Rig'
];


// Clean tier indicators: KES / KES KES / KES KES KES (no numeric ranges)
export const PRICE_TIERS = ['KES', 'KES KES', 'KES KES KES'] as const;
export function normalizePriceTier(raw?: string): string {
  if (!raw) return 'KES KES';
  const dollars = (raw.match(/\$/g) || []).length;
  if (dollars > 0) return PRICE_TIERS[Math.min(dollars, 3) - 1];
  const kes = (raw.match(/KES/gi) || []).length;
  if (kes >= 1 && kes <= 3 && !/\d/.test(raw)) return PRICE_TIERS[kes - 1];
  return 'KES KES';
}

interface MerchantHubTabProps {
  businesses: BusinessAccount[];
  activeBusinessId: string;
  userId?: string;
  isUserSignedIn?: boolean;
  onOpenAuth?: () => void;
  onSelectBusiness: (bizId: string) => void;
  onCreateBusiness: (newBiz: BusinessAccount) => Promise<string | null> | string | null | void;
  onUpdateBusiness: (updatedBiz: BusinessAccount) => void;
  spots: SpotItem[];
  onAddOrUpdateSpot: (spot: SpotItem) => void;
  onDeleteListing: (type: 'spot' | 'event', id: number) => void;
  events: EventItem[];
  onAddEvent: (event: EventItem) => void;
  /** @deprecated Luku/thrift removed. Delete these two props from the <MerchantHubTab/> call site. */
  thriftItems?: unknown[];
  onAddThriftItem?: (item: unknown) => void;
  offers: BusinessOffer[];
  onCreateOffer: (offer: BusinessOffer) => void;
  onUpdateOffer: (offer: BusinessOffer) => void;
  onDeleteOffer: (offerId: string) => void;
  onClaimSpot: (spotId: number, businessId: string) => void;
  onReleaseSpot: (spotId: number) => void;
  onViewSpotDetails: (spot: SpotItem) => void;
  onViewEventDetails: (event: EventItem) => void;
  onOpenPublicProfile: (biz: BusinessAccount) => void;
  onClose?: () => void;
  showToast: (msg: string) => void;
}
export const MerchantHubTab: React.FC<MerchantHubTabProps> = ({
  businesses,
  activeBusinessId,
  userId,
  isUserSignedIn,
  onOpenAuth,
  onSelectBusiness,
  onCreateBusiness,
  onUpdateBusiness,
  spots,
  onAddOrUpdateSpot,
  onDeleteListing,
  events,
  onAddEvent,
  offers,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onClaimSpot,
  onReleaseSpot,
  onViewSpotDetails,
  onViewEventDetails,
  onOpenPublicProfile,
  onClose,
  showToast
}) => {
  const effectiveUserId = userId || (typeof window !== 'undefined' ? localStorage.getItem('rada_local_user_id') : null) || 'local-merchant-user';

  // Only businesses actually owned by the logged-in/local merchant (strictly exclude unowned mock businesses)
  const ownedBusinesses = businesses.filter(
    business => Boolean(business.ownerId) && (business.ownerId === effectiveUserId || business.ownerId === userId)
  );

  // Safe fallback placeholder or active business owned by this merchant
  const currentBiz: BusinessAccount =
    ownedBusinesses.find(b => b.id === activeBusinessId) ||
    ownedBusinesses[0] || {
      id: 'placeholder-biz',
      ownerId: effectiveUserId,
      name: 'Your Business',
      category: 'hospitality',
      email: '',
      phone: '',
      whatsapp: '',
      neighborhood: 'Westlands',
      address: '',
      bio: '',
      logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
      coverImage: '',
      verified: true,
      verificationStatus: 'approved',
      createdDate: new Date().toISOString().split('T')[0],
      discography: [],
      pinnedImages: []
    };

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(ownedBusinesses.length === 0);

  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);

  // Active sub-tab inside the vertical dashboard
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'manage' | 'claim' | 'offers' | 'profile' | 'analytics'>('overview');

  // Business Switcher Dropdown
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // ----------------------------------------------------
  // ONBOARDING FORM STATE
  // ----------------------------------------------------
  const [onboardName, setOnboardName] = useState('');
  const [onboardBio, setOnboardBio] = useState('');
  const [onboardLogo, setOnboardLogo] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('+254 ');
  const [onboardWhatsapp, setOnboardWhatsapp] = useState('+254 ');
  const [onboardNeighborhood, setOnboardNeighborhood] = useState('Westlands');
  const [onboardAddress, setOnboardAddress] = useState('');
  const [onboardInstagram, setOnboardInstagram] = useState('@');
  const [selectedVertical, setSelectedVertical] = useState<BusinessCategory>('hospitality');

  // Quick preset logos for fast creation
  const presetLogos = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop'
  ];

  const handleStartOnboarding = () => {
    setOnboardName('');
    setOnboardBio('');
    setOnboardLogo(presetLogos[0]);
    setOnboardEmail('');
    setOnboardPhone('+254 ');
    setOnboardWhatsapp('+254 ');
    setOnboardNeighborhood('Westlands');
    setOnboardAddress('');
    setOnboardInstagram('@');
    setSelectedVertical('hospitality');
    setOnboardingStep(1);
    setIsOnboardingOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCompleteOnboarding = async () => {
    if (isSubmitting) return;
    setSubmitError('');

    if (!onboardName.trim()) {
      setSubmitError('Please enter your business name on the Profile step first.');
      showToast('Please enter your business name.');
      setOnboardingStep(1);
      return;
    }

    const effectiveOwnerId = userId || effectiveUserId;

    const newBizId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : toValidUuid(`biz-${Date.now()}`);
    const newBiz: BusinessAccount = {
      id: newBizId,
      ownerId: effectiveOwnerId,
      name: onboardName.trim(),
      category: selectedVertical,
      email: onboardEmail.trim() || 'contact@business.ke',
      phone: onboardPhone.trim() || '+254 700 000 000',
      whatsapp: onboardWhatsapp.replace(/\s+/g, '') || '+254700000000',
      neighborhood: onboardNeighborhood || 'Westlands',
      address: onboardAddress.trim() || `${onboardNeighborhood || 'Westlands'}, Nairobi`,
      bio: onboardBio.trim() || `Official ${selectedVertical === 'hospitality' ? 'Spot' : 'Event Organizer'} verified on RADA.`,
      logo: onboardLogo || presetLogos[0],
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      verified: true,
      verificationStatus: 'approved',
      instagram: onboardInstagram.trim() || '@',
      createdDate: new Date().toISOString().split('T')[0],
      discography: [
        `${onboardName.trim()} Curated Showcase 2026`,
        'Official Resident Highlights'
      ],
      pinnedImages: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'
      ]
    };

    setIsSubmitting(true);
    try {
      const err = await onCreateBusiness(newBiz);
      if (typeof err === 'string' && err) {
        console.error('Create business error:', err);
        setSubmitError(`Could not save business: ${err}`);
        showToast(`Could not save business: ${err}`);
        setIsSubmitting(false);
        return;
      }
      onSelectBusiness(newBizId);
      setIsOnboardingOpen(false);
      setActiveSubTab('overview');
      showToast(`Welcome! ${newBiz.name} dashboard launched successfully.`);
    } catch (e) {
      console.error('Onboarding failed:', e);
      setSubmitError(`Something went wrong: ${e instanceof Error ? e.message : String(e)}`);
      showToast('Something went wrong saving your business.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // ----------------------------------------------------
  // SPOT MERCHANT: CREATE / EDIT SPOT FORM
  // ----------------------------------------------------
  const [isSpotFormOpen, setIsSpotFormOpen] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<number | null>(null);
  const [spotTitle, setSpotTitle] = useState('');
  const [spotCategory, setSpotCategory] = useState<SpotCategory>('restaurants');
  const [spotNeighborhood, setSpotNeighborhood] = useState('Westlands');
  const [spotAddress, setSpotAddress] = useState('');
  const [spotExactLocationTag, setSpotExactLocationTag] = useState('');
  const [spotLandmark, setSpotLandmark] = useState('');
  const [spotPrice, setSpotPrice] = useState('KES KES');
  const [spotPhone, setSpotPhone] = useState('+254 ');
  const [spotOpeningHours, setSpotOpeningHours] = useState('11:00 AM - 11:00 PM');
  const [spotDescription, setSpotDescription] = useState('');
  const [spotCoverImg, setSpotCoverImg] = useState('');
  const [spotGalleryImgs, setSpotGalleryImgs] = useState<string[]>([]);
  const [newGalleryInput, setNewGalleryInput] = useState('');

  // 1. Food & Drink / Restaurants / Lounges & Nightlife
  const [spotCuisineTypes, setSpotCuisineTypes] = useState<string[]>([]);
  const [newCuisineInput, setNewCuisineInput] = useState('');
  const [spotFeaturedDishes, setSpotFeaturedDishes] = useState<string[]>([]);
  const [newFeaturedDishInput, setNewFeaturedDishInput] = useState('');
  const [spotMenuUploadUrl, setSpotMenuUploadUrl] = useState('');
  const [spotMenuItems, setSpotMenuItems] = useState<MenuItem[]>([]);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('KES ');
  const [newMenuCategory, setNewMenuCategory] = useState('Mains');
  const [newMenuDesc, setNewMenuDesc] = useState('');

  // 2. Outdoor / Fitness / Sports
  const [spotEquipmentProvided, setSpotEquipmentProvided] = useState('');
  const [spotEquipmentNeeded, setSpotEquipmentNeeded] = useState('');
  const [spotSkillLevel, setSpotSkillLevel] = useState('All Levels Welcome');
  const [spotWhatToBring, setSpotWhatToBring] = useState<string[]>([]);
  const [customWhatToBringInput, setCustomWhatToBringInput] = useState('');

  // 3. Event Spaces / Venues
  const [spotCapacity, setSpotCapacity] = useState('');
  const [spotAmenitiesAV, setSpotAmenitiesAV] = useState<string[]>([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [spotBookingPolicies, setSpotBookingPolicies] = useState('');

  // 4. General Social Links
  const [spotWebsite, setSpotWebsite] = useState('');
  const [spotInstagram, setSpotInstagram] = useState('');

  // 5. Dynamic Category Management & Specialized Category Fields
  const [spotPrimaryGroup, setSpotPrimaryGroup] = useState<PrimaryCategoryGroup>('restaurants_dining');
  const [spotSubcategory, setSpotSubcategory] = useState<string>('Fine Dining');
  const [spotPricePerHour, setSpotPricePerHour] = useState('KES 500 / hr');
  const [spotTimeSlots, setSpotTimeSlots] = useState('Hourly passes • Walk-in or reservation');
  const [spotAvailableGames, setSpotAvailableGames] = useState('EA FC 25, Call of Duty, Tekken 8, Mortal Kombat 1, Gran Turismo 7, VR Beat Saber, Catan, Pool / Billiards');
  const [spotGameConsoles, setSpotGameConsoles] = useState('PlayStation 5, Xbox Series X, High-End PC Rigs, Meta Quest 3 VR');
  const [spotActivitySchedule, setSpotActivitySchedule] = useState('Daily sessions from 10:00 AM - 10:00 PM • Advance booking recommended on weekends');

  // Specialized Fields for Overhauled Categories:
  // 6. Date spots
  const [spotAtmosphereTags, setSpotAtmosphereTags] = useState<string[]>(['Romantic & Candlelit', 'Scenic Sunset Vibe']);
  const [spotBookingOptions, setSpotBookingOptions] = useState('Table reservation recommended for weekend evenings. Walk-ins welcome for bar seating.');

  // 7. Clubs and lounges
  const [spotNightlifeOptions, setSpotNightlifeOptions] = useState('Afrobeats, Amapiano & Hip-Hop • Resident DJs from 10:00 PM • Dress Code: Smart Casual');
  const [spotBottleServiceOptions, setSpotBottleServiceOptions] = useState('VIP Booths available with bottle packages starting from KES 15,000 • Dedicated VIP host');

  // 8. Cafes and Bakeries
  const [spotCoffeePastryMenu, setSpotCoffeePastryMenu] = useState('Single-origin Kenyan AA espresso, pour-over V60, freshly baked almond croissants, sourdough sandwiches');
  const [spotWorkFriendlyTags, setSpotWorkFriendlyTags] = useState<string[]>(['High-Speed Fiber WiFi', 'Abundant Power Outlets', 'Laptop Friendly', 'Quiet Work Atmosphere']);

  // 9. Hotels and luxury stays
  const [spotRoomTypes, setSpotRoomTypes] = useState('Deluxe King Room, Executive Suite with Balcony, Presidential Penthouse');
  const [spotHotelAmenities, setSpotHotelAmenities] = useState<string[]>(['Infinity Swimming Pool', '24/7 Room Service', 'Luxury Spa & Steam Sauna', 'High-Speed Dedicated WiFi', 'Complimentary Breakfast Buffet']);

  // 10. Vacation spots and escapes
  const [spotWeekendGetaways, setSpotWeekendGetaways] = useState('Lake Naivasha waterfront cottages, Mount Kenya glamping pods, Diani beachside villa');
  const [spotDayPassDetails, setSpotDayPassDetails] = useState('Day Pass KES 2,500/person (includes swimming pool access & KES 1,000 food voucher) • Check-in 11:00 AM, Check-out 6:00 PM');

  // Native file upload handlers for Spot Cover Image, Gallery and Menu Document
  const handleSpotCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSpotCoverImg(reader.result);
        showToast('Cover photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSpotGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (spotGalleryImgs.length >= 5) {
      showToast('Maximum 5 gallery photos allowed.');
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(spotGalleryImgs, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast('Duplicate photo(s) skipped — already in spot gallery.');
    } else if (result.duplicateCount > 0 && result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s). Skipped ${result.duplicateCount} duplicate(s).`);
    } else if (result.exceededLimit) {
      showToast('Maximum 5 gallery photos limit reached.');
    } else if (result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s) to spot gallery.`);
    }

    setSpotGalleryImgs(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setSpotGalleryImgs(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Gallery image removed.');
  };

  const handleSpotMenuDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSpotMenuUploadUrl(reader.result);
        showToast('Menu document / image uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const openCreateSpotModal = () => {
    setEditingSpotId(null);
    setSpotTitle(currentBiz?.name || '');
    setSpotPrimaryGroup('restaurants_dining');
    setSpotCategory('restaurants_dining');
    setSpotSubcategory('Fine Dining');
    setSpotNeighborhood(currentBiz?.neighborhood || 'Westlands');
    setSpotAddress(currentBiz?.address || 'Westlands, Nairobi');
    setSpotExactLocationTag(`${currentBiz?.address || 'Westlands'}, near Stage`);
    setSpotLandmark('Nearest Stage / Roundabout');
    setSpotPrice('KES KES');
    setSpotPhone(currentBiz?.phone || '+254 ');
    setSpotOpeningHours('12:00 PM - 01:00 AM');
    setSpotDescription(currentBiz?.bio || '');
    setSpotCoverImg('');
    setSpotGalleryImgs([]);
    // Reset dynamic category-specific fields with sensible defaults
    setSpotCuisineTypes(['Kenyan / Nyama Choma', 'Craft Cocktails & Tapas']);
    setSpotFeaturedDishes(['Signature House Platter', 'Craft Passion Dawa']);
    setSpotMenuUploadUrl('');
    setSpotMenuItems([
      { id: 'm-init-1', name: 'Signature House Dish', category: 'Mains', price: 'KES 1,200', description: 'Fresh local ingredients crafted by our head chef' }
    ]);
    setSpotEquipmentProvided('All standard safety gear, harnesses, and basic equipment provided on-site.');
    setSpotEquipmentNeeded('Please wear comfortable sports footwear; bring personal water bottle.');
    setSpotSkillLevel('All Levels Welcome');
    setSpotWhatToBring(['Comfortable Activewear', 'Reusable Water Bottle']);
    setCustomWhatToBringInput('');
    setSpotCapacity('Standing: 350 • Seated: 200');
    setSpotAmenitiesAV(['PA Sound System & Microphones', 'HD Projector & Giant Screen', 'High-Speed Dedicated Fiber WiFi', 'Automatic Backup Generator (No Blackouts)']);
    setCustomAmenityInput('');
    setSpotBookingPolicies('50% deposit required upon reservation. Outside catering permitted with corkage fee. Sound curfew at 11:00 PM for open-air zones.');
    setSpotPricePerHour('KES 500 / hr');
    setSpotTimeSlots('Hourly passes • Walk-in or reservation');
    setSpotAvailableGames('EA FC 25, Call of Duty, Tekken 8, Mortal Kombat 1, Gran Turismo 7, VR Beat Saber, Catan, Pool / Billiards');
    setSpotGameConsoles('PlayStation 5, Xbox Series X, High-End PC Rigs, Meta Quest 3 VR');
    setSpotActivitySchedule('Daily sessions from 10:00 AM - 10:00 PM • Advance booking recommended on weekends');
    // Specialized Overhauled Category Fields
    setSpotAtmosphereTags(['Romantic & Candlelit', 'Scenic Sunset Vibe']);
    setSpotBookingOptions('Table reservation recommended for weekend evenings. Walk-ins welcome for bar seating.');
    setSpotNightlifeOptions('Afrobeats, Amapiano & Hip-Hop • Resident DJs from 10:00 PM • Dress Code: Smart Casual');
    setSpotBottleServiceOptions('VIP Booths available with bottle packages starting from KES 15,000 • Dedicated VIP host');
    setSpotCoffeePastryMenu('Single-origin Kenyan AA espresso, pour-over V60, freshly baked almond croissants, sourdough sandwiches');
    setSpotWorkFriendlyTags(['High-Speed Fiber WiFi', 'Abundant Power Outlets', 'Laptop Friendly', 'Quiet Work Atmosphere']);
    setSpotRoomTypes('Deluxe King Room, Executive Suite with Balcony, Presidential Penthouse');
    setSpotHotelAmenities(['Infinity Swimming Pool', '24/7 Room Service', 'Luxury Spa & Steam Sauna', 'High-Speed Dedicated WiFi', 'Complimentary Breakfast Buffet']);
    setSpotWeekendGetaways('Lake Naivasha waterfront cottages, Mount Kenya glamping pods, Diani beachside villa');
    setSpotDayPassDetails('Day Pass KES 2,500/person (includes swimming pool access & KES 1,000 food voucher) • Check-in 11:00 AM, Check-out 6:00 PM');
    setSpotWebsite('');
    setSpotInstagram(currentBiz?.instagram || '@');
    setIsSpotFormOpen(true);
  };

  const openEditSpotModal = (spot: SpotItem) => {
    // Verify only the spot owner or verified merchant can edit spot details
    const isOwner = 
      (effectiveUserId && spot.merchantId === effectiveUserId) ||
      (userId && spot.merchantId === userId) ||
      (currentBiz?.ownerId && spot.merchantId === currentBiz.ownerId) ||
      (currentBiz?.id && spot.businessId === currentBiz.id) ||
      ownedBusinesses.some(b => b.id === spot.businessId || b.ownerId === effectiveUserId || b.ownerId === userId);

    if (!isOwner) {
      showToast('Permission denied: Only the spot owner or verified merchant can edit this spot.');
      return;
    }

    const initialGroup = getSpotCategoryGroup(spot.category);
    setEditingSpotId(spot.id);
    setSpotTitle(spot.title);
    setSpotPrimaryGroup(initialGroup);
    setSpotCategory(spot.category);
    setSpotSubcategory(spot.subcategory || (SUBCATEGORIES_BY_CATEGORY[initialGroup]?.[0] || ''));
    setSpotNeighborhood(spot.neighborhood);
    setSpotAddress(spot.address);
    setSpotExactLocationTag(spot.exactLocationTag || '');
    setSpotLandmark(spot.landmark || '');
    setSpotPrice(normalizePriceTier(spot.price));
    setSpotPhone(spot.phone || '');
    setSpotOpeningHours(spot.openingHours || '11:00 AM - 11:00 PM');
    setSpotDescription(spot.description || '');
    setSpotCoverImg(spot.img);
    setSpotGalleryImgs(spot.images && spot.images.length > 0 ? spot.images : [spot.img]);
    setSpotMenuItems(spot.menuItems || []);
    // Populate dynamic category-specific fields
    setSpotCuisineTypes(spot.cuisineTypes || []);
    setSpotFeaturedDishes(spot.featuredDishes || []);
    setSpotMenuUploadUrl(spot.menuUploadUrl || (spot.menuImages && spot.menuImages[0]) || '');
    setSpotEquipmentProvided(spot.equipmentProvided || '');
    setSpotEquipmentNeeded(spot.equipmentNeeded || '');
    setSpotSkillLevel(spot.skillLevel || 'All Levels Welcome');
    setSpotWhatToBring(
      Array.isArray(spot.whatToBring) 
        ? spot.whatToBring 
        : typeof spot.whatToBring === 'string' && spot.whatToBring.trim() 
        ? spot.whatToBring.split(',').map(s => s.trim()).filter(Boolean) 
        : []
    );
    setCustomWhatToBringInput('');
    setSpotCapacity(typeof spot.capacity === 'number' ? String(spot.capacity) : (spot.capacity || ''));
    setSpotAmenitiesAV(spot.amenitiesAV || []);
    setCustomAmenityInput('');
    setSpotBookingPolicies(spot.bookingPolicies || '');
    setSpotPricePerHour(spot.pricePerHour || '');
    setSpotTimeSlots(spot.timeSlots || spot.bookingSlots || '');
    setSpotAvailableGames(Array.isArray(spot.availableGames) ? spot.availableGames.join(', ') : (spot.availableGames || ''));
    setSpotGameConsoles(spot.gameConsoles || '');
    setSpotActivitySchedule(spot.activitySchedule || spot.bookingPolicies || '');
    // Specialized Overhauled Category Fields
    setSpotAtmosphereTags(spot.atmosphereTags || ['Romantic & Candlelit', 'Scenic Sunset Vibe']);
    setSpotBookingOptions(spot.bookingOptions || 'Table reservation recommended for weekend evenings.');
    setSpotNightlifeOptions(spot.nightlifeOptions || 'Afrobeats & Amapiano • Resident DJs • Smart Casual');
    setSpotBottleServiceOptions(spot.bottleServiceOptions || 'VIP Booth bottle service available with dedicated host.');
    setSpotCoffeePastryMenu((spot as any).coffeePastryMenu || 'Single-origin espresso, pour-overs, croissants');
    setSpotWorkFriendlyTags(spot.workFriendlyTags || ['High-Speed Fiber WiFi', 'Abundant Power Outlets', 'Laptop Friendly']);
    setSpotRoomTypes(spot.roomTypes || 'Deluxe Room, Executive Suite');
    setSpotHotelAmenities(spot.amenitiesList || ['Infinity Swimming Pool', '24/7 Room Service', 'High-Speed Dedicated WiFi']);
    setSpotWeekendGetaways(spot.weekendGetawayDetails || 'Weekend getaways and cottages available.');
    setSpotDayPassDetails(spot.dayPassDetails || 'Day pass available with pool access.');
    setSpotWebsite(spot.website || spot.socialLinks?.website || '');
    setSpotInstagram(spot.instagram || spot.socialLinks?.instagram || '');
    setIsSpotFormOpen(true);
  };

  const handleSaveSpot = (e: React.FormEvent) => {
    e.preventDefault();

    // Required Field Validations (Spot Name, Category, Location, Description)
    if (!spotTitle.trim()) {
      showToast('Please enter the Spot Name.');
      return;
    }
    if (!spotCategory) {
      showToast('Please select a Spot Category.');
      return;
    }
    const loc = (spotNeighborhood || spotAddress || '').trim();
    if (!loc) {
      showToast('Please specify a Location (Neighborhood or Address).');
      return;
    }
    if (!spotDescription.trim()) {
      showToast('Please provide a brief Description for the spot.');
      return;
    }
    if (!spotCoverImg) {
      showToast('Please upload a cover photo for the spot.');
      return;
    }

    // Permission Verification: only owner or verified merchant can edit
    if (editingSpotId) {
      const existingSpot = spots.find(s => s.id === editingSpotId);
      const isOwner = 
        !existingSpot ||
        (effectiveUserId && existingSpot.merchantId === effectiveUserId) ||
        (userId && existingSpot.merchantId === userId) ||
        (currentBiz?.ownerId && existingSpot.merchantId === currentBiz.ownerId) ||
        (currentBiz?.id && existingSpot.businessId === currentBiz.id) ||
        ownedBusinesses.some(b => b.id === existingSpot.businessId || b.ownerId === effectiveUserId || b.ownerId === userId);

      if (!isOwner) {
        showToast('Permission denied: Only the spot owner or verified merchant can edit this spot.');
        return;
      }
    }

    const targetId = editingSpotId || Date.now();
    const existing = spots.find(s => s.id === targetId);
    const effectiveMerchantId = userId || effectiveUserId || currentBiz.ownerId;

    const savedSpot: SpotItem = {
      id: targetId,
      title: spotTitle.trim(),
      category: spotCategory,
      subcategory: spotSubcategory,
      neighborhood: spotNeighborhood || 'Westlands',
      address: spotAddress || `${spotNeighborhood || 'Westlands'}, Nairobi`,
      exactLocationTag: spotExactLocationTag || `${spotNeighborhood || 'Westlands'}, Nairobi`,
      landmark: spotLandmark || 'Central Stage',
      lat: existing?.lat || -1.2675,
      lng: existing?.lng || 36.8115,
      rating: existing?.rating || 'New',
      reviewCount: existing?.reviewCount || 0,
      price: spotPrice || 'KES KES',
      img: spotCoverImg,
      images: spotGalleryImgs.length > 0 ? spotGalleryImgs : [spotCoverImg],
      description: spotDescription.trim(),
      phone: spotPhone.trim(),
      openingHours: spotOpeningHours.trim(),
      businessId: currentBiz.id,
      merchantId: effectiveMerchantId,
      isUserUploaded: false,
      menuItems: spotMenuItems,
      reviews: existing?.reviews || [],
      // Dynamic category metadata safely bundled
      diningTypes: spotCuisineTypes.join(', '),
      cuisineTypes: spotCuisineTypes,
      featuredDishes: spotFeaturedDishes,
      menuUploadUrl: spotMenuUploadUrl,
      menuImages: spotMenuUploadUrl ? [spotMenuUploadUrl] : (existing?.menuImages || []),
      equipmentToCarry: spotWhatToBring.join(', '),
      equipmentProvided: spotEquipmentProvided.trim(),
      equipmentNeeded: spotEquipmentNeeded.trim(),
      skillLevel: spotSkillLevel,
      whatToBring: spotWhatToBring.join(', '),
      craftActivities: spotEquipmentProvided.trim(),
      workshopDetails: spotActivitySchedule.trim(),
      capacity: spotCapacity.trim(),
      amenitiesAV: spotAmenitiesAV,
      bookingPolicies: spotBookingPolicies.trim(),
      // Gaming & Entertainment and Activity Scheduling
      pricePerHour: spotPricePerHour.trim(),
      timeSlots: spotTimeSlots.trim(),
      bookingSlots: spotTimeSlots.trim(),
      availableGames: spotAvailableGames.trim(),
      gameConsoles: spotGameConsoles.trim(),
      activitySchedule: spotActivitySchedule.trim(),
      // Date Spots
      atmosphereTags: spotAtmosphereTags,
      bookingOptions: spotBookingOptions.trim(),
      // Clubs and Lounges
      nightlifeOptions: spotNightlifeOptions.trim(),
      bottleServiceOptions: spotBottleServiceOptions.trim(),
      // Cafes & Bakeries
      coffeePastryMenu: spotCoffeePastryMenu.trim(),
      workFriendlyTags: spotWorkFriendlyTags,
      // Hotels & Luxury Stays
      roomTypes: spotRoomTypes.trim(),
      amenitiesList: spotHotelAmenities,
      // Vacation Spots & Escapes
      weekendGetawayDetails: spotWeekendGetaways.trim(),
      dayPassDetails: spotDayPassDetails.trim(),
      website: spotWebsite.trim(),
      instagram: spotInstagram.trim(),
      socialLinks: {
        website: spotWebsite.trim(),
        instagram: spotInstagram.trim()
      }
    };

    onAddOrUpdateSpot(savedSpot);
    setIsSpotFormOpen(false);

    // Clear form fields
    setEditingSpotId(null);
    setSpotTitle('');
    setSpotPrimaryGroup('restaurants_dining');
    setSpotCategory('restaurants_dining');
    setSpotSubcategory('Fine Dining');
    setSpotNeighborhood('Westlands');
    setSpotAddress('');
    setSpotExactLocationTag('');
    setSpotLandmark('');
    setSpotPrice('KES KES');
    setSpotPhone('+254 ');
    setSpotOpeningHours('11:00 AM - 11:00 PM');
    setSpotDescription('');
    setSpotCoverImg('');
    setSpotGalleryImgs([]);
    setSpotMenuItems([]);
    setSpotCuisineTypes([]);
    setSpotFeaturedDishes([]);
    setSpotMenuUploadUrl('');
    setSpotEquipmentProvided('');
    setSpotEquipmentNeeded('');
    setSpotSkillLevel('All Levels Welcome');
    setSpotWhatToBring([]);
    setSpotCapacity('');
    setSpotAmenitiesAV([]);
    setSpotBookingPolicies('');
    setSpotPricePerHour('');
    setSpotTimeSlots('');
    setSpotAvailableGames('');
    setSpotGameConsoles('');
    setSpotActivitySchedule('');
    setSpotAtmosphereTags([]);
    setSpotBookingOptions('');
    setSpotNightlifeOptions('');
    setSpotBottleServiceOptions('');
    setSpotCoffeePastryMenu('');
    setSpotWorkFriendlyTags([]);
    setSpotRoomTypes('');
    setSpotHotelAmenities([]);
    setSpotWeekendGetaways('');
    setSpotDayPassDetails('');
    setSpotWebsite('');
    setSpotInstagram('');

    showToast(editingSpotId ? `Spot "${savedSpot.title}" details updated successfully.` : `Spot "${savedSpot.title}" published live to RADA!`);
  };

  // Add menu item in spot form
  const handleAddMenuItem = () => {
    if (!newMenuName.trim()) return;
    const item: MenuItem = {
      id: `m-${Date.now()}`,
      name: newMenuName.trim(),
      price: newMenuPrice.trim() || 'KES 800',
      category: newMenuCategory.trim() || 'Mains',
      description: newMenuDesc.trim() || 'Artisanal preparation.'
    };
    setSpotMenuItems(prev => [...prev, item]);
    setNewMenuName('');
    setNewMenuPrice('KES ');
    setNewMenuDesc('');
    showToast(`Added ${item.name} to menu!`);
  };

  // ----------------------------------------------------
  // SPOT CLAIMING SEARCH UTILITY (EXCLUSIVE TO SPOTS)
  // ----------------------------------------------------
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const claimableCommunitySpots = spots.filter(s => {
    // Spot is claimable if it was user-uploaded or has no businessId or is not claimed by current biz
    const isUnclaimedOrUserUploaded = s.isUserUploaded || !s.businessId || s.businessId !== currentBiz?.id;
    if (!isUnclaimedOrUserUploaded) return false;

    if (!claimSearchQuery.trim()) return true;
    const q = claimSearchQuery.toLowerCase().trim();
    return (
      s.title.toLowerCase().includes(q) ||
      s.neighborhood.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  // Spots owned by current business or merchant
  const myClaimedSpots = spots.filter(s => 
    (currentBiz?.id && s.businessId === currentBiz.id) ||
    (effectiveUserId && s.merchantId === effectiveUserId) ||
    (userId && s.merchantId === userId) ||
    (currentBiz?.ownerId && s.merchantId === currentBiz.ownerId)
  );

  // ----------------------------------------------------
  // EVENT ORGANIZER WORKFLOW STATE (Full-Screen + Multi-Image + Dynamic Locations)
  // ----------------------------------------------------
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<'concerts' | 'nightlife' | 'art' | 'cinemas'>('concerts');
  const [eventGenre, setEventGenre] = useState('Afrobeats & Amapiano');
  const [eventDate, setEventDate] = useState('Sat, 28 Nov 2026');
  const [eventTime, setEventTime] = useState('08:00 PM - 04:00 AM');
  const [eventLocation, setEventLocation] = useState('Westlands, Nairobi');
  const [eventExactLocationTag, setEventExactLocationTag] = useState('');
  const [eventUrl, setEventUrl] = useState('https://hustlesasa.com/');
  const [eventImg, setEventImg] = useState('');
  const [eventGalleryImgs, setEventGalleryImgs] = useState<string[]>([]);
  const [eventDescription, setEventDescription] = useState('');
  const [eventTiers, setEventTiers] = useState<TicketTier[]>([
    { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
    { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
    { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' }
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('KES ');
  const [newTierPerks, setNewTierPerks] = useState('');

  const [eventArtists, setEventArtists] = useState<Artist[]>([
    { name: 'DJ Joe Mfalme', role: 'Main Stage Headliner', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
  ]);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistRole, setNewArtistRole] = useState('Guest DJ / Performer');

  // Native file upload handlers for Event Poster and Gallery
  const handleEventPosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEventImg(reader.result);
        showToast('Event artwork poster uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEventGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (eventGalleryImgs.length >= 5) {
      showToast('Maximum 5 event gallery photos allowed.');
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(eventGalleryImgs, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast('Duplicate photo(s) skipped — already in event gallery.');
    } else if (result.duplicateCount > 0 && result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s). Skipped ${result.duplicateCount} duplicate(s).`);
    } else if (result.exceededLimit) {
      showToast('Maximum 5 event gallery photos limit reached.');
    } else if (result.addedCount > 0) {
      showToast(`Added ${result.addedCount} photo(s) to event gallery.`);
    }

    setEventGalleryImgs(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveEventGalleryImage = (indexToRemove: number) => {
    setEventGalleryImgs(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Event gallery image removed.');
  };


  const openCreateEventModal = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventCategory('concerts');
    setEventGenre('Afrobeats & Amapiano');
    setEventDate('Sat, 28 Nov 2026');
    setEventTime('08:00 PM - 04:00 AM');
    setEventLocation(currentBiz?.address || 'Westlands, Nairobi');
    setEventExactLocationTag('Courtyard / Arena Main Stage');
    setEventUrl('https://hustlesasa.com/');
    setEventImg('');
    setEventGalleryImgs([]);
    setEventDescription('Official event curated by ' + currentBiz?.name);
    setEventArtists([
      { name: 'DJ Joe Mfalme', role: 'Main Stage Headliner', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ]);
    setEventTiers([
      { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Fast-track entry' },
      { name: 'Regular Gate', price: 'KES 2,000', perks: 'All-night access' },
      { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'VIP bar access & welcome drink' }
    ]);
    setIsEventFormOpen(true);
  };

  const openEditEventModal = (evt: EventItem) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.title);
    setEventCategory(evt.category);
    setEventGenre(evt.genre || 'Afrobeats & Amapiano');
    setEventDate(evt.date);
    setEventTime(evt.time || '08:00 PM - 04:00 AM');
    setEventLocation(evt.location);
    setEventExactLocationTag(evt.location);
    setEventUrl(evt.url || 'https://hustlesasa.com/');
    setEventImg(evt.img);
    setEventGalleryImgs(evt.images && evt.images.length > 0 ? evt.images : [evt.img]);
    setEventDescription(evt.description || '');
    setEventArtists(evt.artists || []);
    setEventTiers(evt.tiers || []);
    setIsEventFormOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      showToast('Please enter an event title.');
      return;
    }
    const finalLocation = eventExactLocationTag.trim() && !eventLocation.includes(eventExactLocationTag.trim())
      ? `${eventLocation} • ${eventExactLocationTag.trim()}`
      : eventLocation;

    const newEvt: EventItem = {
      id: editingEventId || Date.now(),
      title: eventTitle.trim(),
      category: eventCategory,
      genre: eventGenre,
      date: eventDate,
      time: eventTime,
      location: finalLocation,
      lat: -1.2675,
      lng: 36.8115,
      img: eventImg,
      images: eventGalleryImgs.length > 0 ? eventGalleryImgs : [eventImg],
      goingCount: editingEventId ? (events.find(e => e.id === editingEventId)?.goingCount || 1) : 1,
      url: eventUrl || 'https://hustlesasa.com/',
      description: eventDescription,
      businessId: currentBiz.id,
      artists: eventArtists,
      tiers: eventTiers
    };
    onAddEvent(newEvt);
    setIsEventFormOpen(false);
    showToast(editingEventId ? `Event "${newEvt.title}" updated successfully!` : `Event "${newEvt.title}" published live with verified ticketing!`);
  };

  const myEvents = events.filter(e => e.businessId === currentBiz?.id);

  // ----------------------------------------------------
  // DECOUPLED OFFERS & PROMOTIONS MANAGEMENT
  // ----------------------------------------------------
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerCategory, setOfferCategory] = useState<OfferCategory>('Drinks');
  const [offerDiscount, setOfferDiscount] = useState('BUY 1 GET 1');
  const [offerPosterUrl, setOfferPosterUrl] = useState('https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop');
  const [offerValidUntil, setOfferValidUntil] = useState('Valid this weekend');
  const [offerClaimCode, setOfferClaimCode] = useState('RADA-DEAL');

  const openCreateOfferModal = () => {
    setEditingOfferId(null);
    setOfferTitle('');
    setOfferDesc('');
    setOfferCategory(currentBiz?.category === 'event_organizer' ? 'Tickets' : 'Drinks');
    setOfferDiscount(currentBiz?.category === 'event_organizer' ? '15% OFF VIP' : 'BUY 1 GET 1');
    setOfferPosterUrl(currentBiz?.coverImage || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop');
    setOfferValidUntil('Valid through end of month');
    setOfferClaimCode(`RADA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setIsOfferFormOpen(true);
  };

  const openEditOfferModal = (offer: BusinessOffer) => {
    setEditingOfferId(offer.id);
    setOfferTitle(offer.title);
    setOfferDesc(offer.description);
    setOfferCategory(offer.category);
    setOfferDiscount(offer.discount);
    setOfferPosterUrl(offer.posterUrl || currentBiz?.coverImage || '');
    setOfferValidUntil(offer.validUntil || 'Valid this month');
    setOfferClaimCode(offer.claimCode || 'RADA-DEAL');
    setIsOfferFormOpen(true);
  };

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      showToast('Please enter an offer title.');
      return;
    }

    const offerPayload: BusinessOffer = {
      id: editingOfferId || `off-${Date.now()}`,
      businessId: currentBiz.id,
      businessName: currentBiz.name,
      businessCategory: currentBiz.category,
      title: offerTitle.trim(),
      description: offerDesc.trim() || 'Exclusive promotion verified on RADA.',
      category: offerCategory,
      discount: offerDiscount.trim() || 'SPECIAL DEAL',
      posterUrl: offerPosterUrl,
      validUntil: offerValidUntil.trim() || 'Valid while stocks last',
      claimCode: offerClaimCode.trim() || 'RADADEAL',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (editingOfferId) {
      onUpdateOffer(offerPayload);
      showToast('Promotional offer updated!');
    } else {
      onCreateOffer(offerPayload);
      showToast('New promotion live on Home running feed!');
    }

    setIsOfferFormOpen(false);
  };

  // Offers belonging to active business
  const myOffers = offers.filter(o => o.businessId === currentBiz?.id);

  // ----------------------------------------------------
  // RENDER: ONBOARDING VIEW
  // ----------------------------------------------------
  if (isOnboardingOpen || !currentBiz) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 pb-28 px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Top Bar with Cancel / Exit if businesses exist */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E0533C] to-[#E9C46A] flex items-center justify-center text-white shadow-md">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Merchant Onboarding</h1>
                <p className="text-xs text-slate-500 font-medium">Step {onboardingStep} of 2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ownedBusinesses.length > 0 && (
                <button 
                  onClick={() => setIsOnboardingOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-[#1C1A1E] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <span>Dashboard</span>
                </button>
              )}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-[#1C1A1E] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Close Merchant Hub"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${onboardingStep >= 1 ? 'bg-[#E0533C]' : 'bg-slate-200 dark:bg-slate-800'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all ${onboardingStep >= 2 ? 'bg-[#E0533C]' : 'bg-slate-200 dark:bg-slate-800'}`} />
          </div>

          {/* STEP 1: MASTER BUSINESS PROFILE CREATION */}
          {onboardingStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[#E0533C] font-extrabold text-xs uppercase tracking-wider mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Step 1: Master Business Identity</span>
                </div>
                <h2 className="text-lg font-black tracking-tight">Create your business presence</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Establish your brand on Nairobi's premier guide. This information is displayed across your listings and public profile.
                </p>

                <div className="space-y-4 mt-6">
                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Business Name <span className="text-[#E0533C]">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Ink & Drink Lounge, Nairobi Waves, 90s Vintage"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      className="w-full text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl px-4 py-3 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>

                  {/* Global Bio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Global Bio / Tagline
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Tell Nairobi what makes your venue, rave, or streetwear drop extraordinary..."
                      value={onboardBio}
                      onChange={(e) => setOnboardBio(e.target.value)}
                      className="w-full text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-4 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>

                  {/* Profile Logo / Picture */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Profile Picture / Logo *
                    </label>
                    <div className="flex items-center gap-3">
                      <img 
                        src={onboardLogo || presetLogos[0]} 
                        alt="Logo Preview" 
                        className="w-14 h-14 rounded-2xl object-cover shadow-xs shrink-0" 
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 bg-[#E0533C] hover:bg-[#d04630] text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                            <input 
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      setOnboardLogo(event.target.result as string);
                                      showToast('Profile photo selected!');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {onboardLogo && (
                            <button
                              type="button"
                              onClick={() => setOnboardLogo('')}
                              className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 font-bold border border-red-200 dark:border-red-900/50 rounded-xl"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Or pick preset:</span>
                          {presetLogos.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setOnboardLogo(preset)}
                              className={`w-6 h-6 rounded-lg overflow-hidden border ${onboardLogo === preset ? 'ring-2 ring-[#E0533C]' : 'opacity-70'}`}
                            >
                              <img src={preset} alt="preset" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Neighborhood & Address */}
                  <div className="space-y-3 pt-2">
                    <DynamicLocationSelector
                      value={onboardNeighborhood}
                      onChange={(loc) => setOnboardNeighborhood(loc)}
                      label="Neighborhood / Location Area *"
                      placeholder="Search neighborhood, sub-location or type custom..."
                    />

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Address / Building / Stall Number
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. Mpaka Rd, 2nd Floor / Gikomba Stall 4B"
                        value={onboardAddress}
                        onChange={(e) => setOnboardAddress(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl px-4 py-3 font-medium focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Phone Number
                      </label>
                      <input 
                        type="text"
                        placeholder="+254 700 000 000"
                        value={onboardPhone}
                        onChange={(e) => setOnboardPhone(e.target.value)}
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        WhatsApp (Orders)
                      </label>
                      <input 
                        type="text"
                        placeholder="+254 700 000 000"
                        value={onboardWhatsapp}
                        onChange={(e) => setOnboardWhatsapp(e.target.value)}
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#E0533C]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!onboardName.trim()) {
                      showToast('Please specify a Business Name first.');
                      return;
                    }
                    setOnboardingStep(2);
                  }}
                  className="w-full mt-8 bg-[#E0533C] hover:bg-[#c9432d] text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition cursor-pointer"
                >
                  <span>Continue to Vertical Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VERTICAL SELECTION */}
          {onboardingStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-[#E0533C] font-extrabold text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Step 2: Choose Merchant Vertical</span>
                </div>
                <h2 className="text-lg font-black tracking-tight">Select your operation model</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We customize your dashboard tools, listing capabilities, and verification badge to match your vertical precisely.
                </p>

                {/* 3 Vertical Options */}
                <div className="space-y-3 mt-6">
                  {/* Vertical 1: Spot Merchant */}
                  <div 
                    onClick={() => setSelectedVertical('hospitality')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedVertical === 'hospitality'
                        ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-[#FBFBF9] dark:bg-[#121113]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Spot Merchant</h3>
                            <BusinessBadge businessId={currentBiz.id} category="hospitality" size="xs" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">Restaurants, Clubs, Lounges, Cafes & Hotels</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVertical === 'hospitality' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedVertical === 'hospitality' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 mt-3 pl-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Interactive Digital Menu builder with prices</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Exact location tags with nearest Bus Stop & Landmark</span>
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>EXCLUSIVE: Search & Claim community user-uploaded spots</span>
                      </li>
                    </ul>
                  </div>

                  {/* Vertical 2: Event Organizer */}
                  <div 
                    onClick={() => setSelectedVertical('event_organizer')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedVertical === 'event_organizer'
                        ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-[#FBFBF9] dark:bg-[#121113]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                          <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Event Organizer</h3>
                            <BusinessBadge businessId={currentBiz.id} category="event_organizer" size="xs" />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">Parties, Raves, Concerts, Festivals & Art Shows</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVertical === 'event_organizer' ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedVertical === 'event_organizer' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1 mt-3 pl-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Direct ticketing links (HustleSasa, Tikiti, Mtickets)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Tiered ticketing passes & multi-artist lineup manager</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Primary Ticketing Verified authenticity badge</span>
                      </li>
                    </ul>
                  </div>

                </div>

                {submitError && (
                  <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold p-4 flex items-start gap-2.5 break-words shadow-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="flex-1">{submitError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="w-full sm:w-auto sm:px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-3.5 rounded-2xl transition text-center shrink-0 order-2 sm:order-1 cursor-pointer"
                  >
                    Back to Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSubmitting}
                    className="w-full flex-1 bg-[#E0533C] hover:bg-[#c9432d] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition cursor-pointer leading-tight text-center whitespace-normal order-1 sm:order-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{isSubmitting ? 'Launching Dashboard…' : 'Launch Merchant Dashboard'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: FULL DEDICATED MERCHANT DASHBOARD VIEWPORT
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 pb-28">
      {/* Top Merchant Workspace Banner */}
      <div className="bg-white dark:bg-[#1C1A1E] sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3.5 overflow-visible">
          <div className="flex items-start justify-between gap-3">
            {/* Merchant Identity & Account Switcher */}
            <div className="relative flex-1 min-w-0 z-10">
              <button 
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-start gap-3 text-left group w-full"
              >
                <img 
                  src={currentBiz.logo} 
                  alt={currentBiz.name} 
                  className="relative z-10 w-12 h-12 rounded-2xl object-cover shadow-md bg-slate-100 dark:bg-slate-800 shrink-0" 
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <h2 className="font-black text-[15px] leading-snug text-slate-900 dark:text-slate-100 break-words line-clamp-2 group-hover:text-[#E0533C] transition">
                      {currentBiz.name}
                    </h2>
                    <span className="text-[10px] text-slate-400 mt-1 shrink-0">▼</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <BusinessBadge businessId={currentBiz.id} category={currentBiz.category} size="xs" />
                  </div>
                </div>
              </button>

              {/* Business Switcher Dropdown */}
              {isSwitcherOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1C1A1E] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Your Merchant Accounts ({ownedBusinesses.length})
                  </div>
                  <div className="space-y-1">
                    {ownedBusinesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => {
                          onSelectBusiness(biz.id);
                          setIsSwitcherOpen(false);
                          showToast(`Switched to ${biz.name}`);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                          biz.id === currentBiz.id
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-[#E0533C] font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={biz.logo} alt={biz.name} className="w-6 h-6 rounded-lg object-cover shrink-0" />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        <BusinessBadge businessId={biz.id} category={biz.category} size="xs" />
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        handleStartOnboarding();
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs font-bold text-[#E0533C] hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Merchant Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => onOpenPublicProfile(currentBiz)}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                title="View your public merchant storefront"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="Close Merchant Hub"
                  aria-label="Close Merchant Hub"
                >
                  <X className="w-4 h-4" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Navigation Bar for this Vertical */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'analytics'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Spot Analytics</span>
            </button>

            {/* Spot Merchant Specific Tabs */}
            {currentBiz.category === 'hospitality' && (
              <>
                <button
                  onClick={() => setActiveSubTab('manage')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'manage'
                      ? 'bg-[#E0533C] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>My Spots ({myClaimedSpots.length})</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('claim')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'claim'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Claim Spots</span>
                </button>
              </>
            )}

            {/* Event Organizer Specific Tabs */}
            {currentBiz.category === 'event_organizer' && (
              <button
                onClick={() => setActiveSubTab('manage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'manage'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Events Suite ({myEvents.length})</span>
              </button>
            )}

            {/* Independent Offers & Deals tab for ALL merchants */}
            <button
              onClick={() => setActiveSubTab('offers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'offers'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Offers & Deals ({myOffers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* =========================================================================
            SUB-TAB: OVERVIEW
            ========================================================================= */}
        {activeSubTab === 'overview' && (
          <div 
 className="space-y-6 animate-in fade-in duration-150">
            {/* ACTUAL BUSINESS VERIFICATION STATUS */}
{(() => {
  const status =
    currentBiz.verificationStatus ||
    (currentBiz.verified ? 'approved' : 'pending');

  const statusStyles = {
    pending: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200',
    approved: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200',
    rejected: 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200',
  };

  const statusContent = {
    pending: {
      title: 'Verification pending',
      message: 'Your business profile has been submitted and is waiting for RADA admin review.',
    },
    approved: {
      title: 'Business verified',
      message: 'Your business has been approved by RADA.',
    },
    rejected: {
      title: 'Verification rejected',
      message: currentBiz.verificationNote
        ? `Reason: ${currentBiz.verificationNote}`
        : 'Your business was not approved. Please review your details and contact RADA support.',
    },
  };

  return (
    <div className={`rounded-2xl border p-4 ${statusStyles[status]}`}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black">
            {statusContent[status].title}
          </p>
          <p className="text-xs mt-1 leading-relaxed">
            {statusContent[status].message}
          </p>
        </div>
      </div>
    </div>
  );
})()}
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Managed</span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {currentBiz.category === 'hospitality' 
                    ? myClaimedSpots.length 
                    : currentBiz.category === 'event_organizer' 
                    ? myEvents.length 
                    : 0}
                </span>
                <span className="text-[10px] text-[#E0533C] font-semibold">Active Listings</span>
              </div>

              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Promotions</span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {myOffers.length}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Live on Feed</span>
              </div>

              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-2xl p-3 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trust Score</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">100%</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Verified Merchant</span>
              </div>
            </div>

            {/* Dynamic Metrics & Analytics Overview */}
            <SpotInsightsAnalytics
              spots={spots}
              currentBiz={currentBiz}
              userId={userId || effectiveUserId}
              onOpenCreateSpot={openCreateSpotModal}
              showToast={showToast}
            />

            {/* Operational Hub Action Cards */}
            <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Quick Operations</h3>
                  <p className="text-[11px] text-slate-500">Fast tasks for {currentBiz.name}</p>
                </div>
                <BusinessBadge businessId={currentBiz.id} category={currentBiz.category} size="xs" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {currentBiz.category === 'hospitality' && (
                  <>
                    <button
                      onClick={openCreateSpotModal}
                      className="p-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Plus className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Add New Spot</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Menus, exact hours & bus stop</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('claim')}
                      className="p-3.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-900 dark:text-orange-200 border border-orange-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 text-orange-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Claim Community Spots</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{claimableCommunitySpots.length} spots in area</span>
                    </button>
                  </>
                )}

                {currentBiz.category === 'event_organizer' && (
                  <>
                    <button
                      onClick={openCreateEventModal}
                      className="p-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Plus className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Publish Event Rave</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Tickets, lineup & venue</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('manage')}
                      className="p-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/30 rounded-2xl text-left transition group cursor-pointer"
                    >
                      <Ticket className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition" />
                      <span className="font-extrabold text-xs block">Ticket Tiers & Links</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">HustleSasa, Tikiti setup</span>
                    </button>
                  </>
                )}

                {/* Independent Offer Button (Shared) */}
                <button
                  onClick={openCreateOfferModal}
                  className="p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200 border border-rose-500/30 rounded-2xl text-left transition group cursor-pointer"
                >
                  <Percent className="w-5 h-5 text-rose-600 mb-2 group-hover:scale-110 transition" />
                  <span className="font-extrabold text-xs block">Post Promo Offer</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Decoupled deal banner</span>
                </button>

                <button
                  onClick={() => onOpenPublicProfile(currentBiz)}
                  className="p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-left transition group cursor-pointer"
                >
                  <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-300 mb-2 group-hover:scale-110 transition" />
                  <span className="font-extrabold text-xs block">View Storefront</span>
                  <span className="text-[10px] text-slate-500">Public customer view</span>
                </button>
              </div>
            </div>

            {/* Running Offers Spotlight */}
            <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#E0533C]" />
                    <span>Active Offers on Home Feed ({myOffers.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Promotions showcased to all users on RADA Home</p>
                </div>
                <button 
                  onClick={openCreateOfferModal}
                  className="text-[10px] font-black text-[#E0533C] hover:underline"
                >
                  + Create Offer
                </button>
              </div>

              {myOffers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Percent className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No active promotions right now</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Post an offer or deal to drive weekend traffic!</p>
                  <button 
                    onClick={openCreateOfferModal}
                    className="mt-3 text-xs bg-[#E0533C] text-white font-bold px-3 py-1.5 rounded-xl shadow-xs"
                  >
                    Post an Offer
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myOffers.map(offer => (
                    <div 
                      key={offer.id}
                      className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {offer.posterUrl && (
                          <img src={offer.posterUrl} alt={offer.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-md">
                              {offer.discount}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{offer.category}</span>
                          </div>
                          <h4 className="font-extrabold text-xs truncate mt-0.5">{offer.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{offer.validUntil}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => openEditOfferModal(offer)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                          title="Edit Offer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            onDeleteOffer(offer.id);
                            showToast('Offer removed from Home feed.');
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-500"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: MANAGE (VERTICAL-SPECIFIC)
            ========================================================================= */}
        {activeSubTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-150">

            {/* A. SPOT MERCHANT MANAGEMENT */}
            {currentBiz.category === 'hospitality' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-tight">My Managed Spots ({myClaimedSpots.length})</h3>
                    <p className="text-xs text-slate-500">Spots owned by {currentBiz.name} with editing rights</p>
                  </div>
                  <button 
                    onClick={openCreateSpotModal}
                    className="text-xs font-black bg-[#E0533C] text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Spot</span>
                  </button>
                </div>

                {myClaimedSpots.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-black text-sm">No spots claimed or added yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Create your own spot or claim an existing community-uploaded listing to manage digital menus and exact bus stops.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button 
                        onClick={openCreateSpotModal}
                        className="text-xs bg-[#E0533C] text-white font-bold px-4 py-2 rounded-xl"
                      >
                        Create Spot
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('claim')}
                        className="text-xs bg-amber-500 text-white font-bold px-4 py-2 rounded-xl"
                      >
                        Claim a Spot
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myClaimedSpots.map(spot => (
                      <div 
                        key={spot.id}
                        className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img src={spot.img} alt={spot.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-sm truncate">{spot.title}</h4>
                              <BusinessBadge businessId={currentBiz.id} category="hospitality" size="xs" />
                            </div>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#E0533C]" />
                              <span>{spot.exactLocationTag || spot.address}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
                              <span>★ {spot.rating} ({spot.reviewCount || 0} reviews)</span>
                              <span>•</span>
                              <span>{spot.menuItems?.length || 0} Menu Items</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">Claimed & Verified</span>
                            </div>
                          </div>
                        </div>

                        {/* Location & Bus stop info */}
                        {spot.landmark && (
                          <div className="bg-[#FBFBF9] dark:bg-[#121113] p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Stage / Landmark: <strong className="text-slate-900 dark:text-slate-100">{spot.landmark}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => onViewSpotDetails(spot)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#E0533C] flex items-center gap-1"
                          >
                            <span>Preview Listing</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditSpotModal(spot)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                              <span>Edit Spot & Menu</span>
                            </button>
                            <button
                              onClick={() => {
                                onReleaseSpot(spot.id);
                                showToast(`Released ownership of "${spot.title}".`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 text-xs font-bold"
                              title="Release Spot Ownership"
                            >
                              Release
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${spot.title}" permanently? This removes it from RADA for everyone.`)) {
                                  onDeleteListing('spot', spot.id);
                                  showToast(`Deleted "${spot.title}".`);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 transition"
                              title="Delete Spot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B. EVENT ORGANIZER MANAGEMENT */}
            {currentBiz.category === 'event_organizer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-tight">Active Events Suite ({myEvents.length})</h3>
                    <p className="text-xs text-slate-500">Concerts, parties & raves hosted by {currentBiz.name}</p>
                  </div>
                  <button 
                    onClick={openCreateEventModal}
                    className="text-xs font-black bg-purple-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Event</span>
                  </button>
                </div>

                {myEvents.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-black text-sm">No events published yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      List your upcoming club night, concert, or festival with verified ticketing and multi-tier passes.
                    </p>
                    <button 
                      onClick={openCreateEventModal}
                      className="mt-4 text-xs bg-purple-600 text-white font-bold px-4 py-2 rounded-xl"
                    >
                      Publish First Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map(evt => (
                      <div 
                        key={evt.id}
                        className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-4 shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img src={evt.img} alt={evt.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-sm truncate">{evt.title}</h4>
                              <BusinessBadge businessId={currentBiz.id} category="event_organizer" size="xs" />
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{evt.date} • {evt.time}</p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-purple-500" />
                              <span>{evt.location}</span>
                            </p>
                          </div>
                        </div>

                        {/* Ticket tiers pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
                          {evt.tiers?.map((tier, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg whitespace-nowrap"
                            >
                              {tier.name}: {tier.price}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => onViewEventDetails(evt)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1"
                          >
                            <span>Preview Event</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditEventModal(evt)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-bold flex items-center gap-1 transition"
                              title="Edit Event"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <a
                              href={evt.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 text-xs font-bold flex items-center gap-1"
                            >
                              <span>Tickets</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => {
                                onDeleteListing('event', evt.id);
                                showToast(`Deleted "${evt.title}".`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: SPOT ANALYTICS & INSIGHTS
            ========================================================================= */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <SpotInsightsAnalytics
              spots={spots}
              currentBiz={currentBiz}
              userId={userId || effectiveUserId}
              onOpenCreateSpot={openCreateSpotModal}
              showToast={showToast}
            />
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: CLAIM COMMUNITY SPOTS (EXCLUSIVE TO SPOT MERCHANTS)
            ========================================================================= */}
        {activeSubTab === 'claim' && currentBiz.category === 'hospitality' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header / Info Banner */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Exclusive Merchant Privilege</span>
              </div>
              <h3 className="text-base font-black tracking-tight">Search & Claim Community Spots</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Find spots originally added by the community or unassigned. Claiming instantly grants <strong className="text-slate-900 dark:text-slate-100">{currentBiz.name}</strong> official merchant ownership, unlocking menu updates, photo curation, and verification badges!
              </p>

              {/* Search input */}
              <div className="relative mt-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search spots by name, neighborhood (e.g. Hurlingham, Westlands)..."
                  value={claimSearchQuery}
                  onChange={(e) => setClaimSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#1C1A1E] border border-amber-500/40 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500">
                  Available to Claim ({claimableCommunitySpots.length})
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  Verified Spot Merchant Exclusive
                </span>
              </div>

              {claimableCommunitySpots.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold">No unclaimed spots matching "{claimSearchQuery}"</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All matching listings are already claimed or verified.</p>
                </div>
              ) : (
                claimableCommunitySpots.map(spot => (
                  <div 
                    key={spot.id}
                    className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-amber-400/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={spot.img} alt={spot.title} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs truncate">{spot.title}</h4>
                          {spot.isUserUploaded && (
                            <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                              Community Upload
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#E0533C]" />
                          <span>{spot.neighborhood} • {spot.address}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Rating ★ {spot.rating} ({spot.reviewCount || 0} reviews)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClaimSpot(spot.id, currentBiz.id);
                        showToast(`Ownership claimed! "${spot.title}" now managed by ${currentBiz.name}.`);
                      }}
                      className="bg-gradient-to-r from-amber-500 to-[#E0533C] hover:opacity-90 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-orange-500/20 shrink-0 cursor-pointer transition active:scale-95"
                    >
                      Claim Spot
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUB-TAB: OFFERS & DEALS (INDEPENDENT ENGINE)
            ========================================================================= */}
        {activeSubTab === 'offers' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight">Independent Promotions ({myOffers.length})</h3>
                <p className="text-xs text-slate-500">Create, modify & delete offers separate from your profile</p>
              </div>
              <button
                onClick={openCreateOfferModal}
                className="text-xs font-black bg-[#E0533C] text-white px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Promotion</span>
              </button>
            </div>

            {myOffers.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <Percent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-black text-sm">No promotional offers active</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Launch a Happy Hour deal, early-bird ticket discount, or wardrobe bundle to appear on the Home Running Offers feed.
                </p>
                <button
                  onClick={openCreateOfferModal}
                  className="mt-4 text-xs bg-[#E0533C] text-white font-bold px-4 py-2 rounded-xl shadow-md"
                >
                  Create Your First Offer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map(offer => (
                  <div 
                    key={offer.id}
                    className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl overflow-hidden shadow-xs hover:border-slate-300 transition"
                  >
                    {/* Offer Banner */}
                    <div className="relative h-36 w-full bg-slate-900">
                      <img 
                        src={offer.posterUrl || currentBiz.coverImage || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop'} 
                        alt={offer.title} 
                        className="w-full h-full object-cover opacity-85" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-[#E0533C] text-white px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                          {offer.discount}
                        </span>
                        <span className="text-[10px] font-extrabold bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                          {offer.category}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-amber-300 font-bold block">{offer.validUntil}</span>
                          <h4 className="text-base font-black text-white leading-tight mt-0.5">{offer.title}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Offer Content & Controls */}
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-300">{offer.description}</p>
                      
                      <div className="flex items-center justify-between bg-[#FBFBF9] dark:bg-[#121113] p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#E0533C]" />
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{offer.claimCode || 'RADADEAL'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Active on Home Feed</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          onClick={() => openEditOfferModal(offer)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                          <span>Edit Offer</span>
                        </button>
                        <button
                          onClick={() => {
                            onDeleteOffer(offer.id);
                            showToast('Offer deleted from store & Home feed.');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          FULL-SCREEN DEDICATED VIEW: CREATE / EDIT SPOT & MENU
          ========================================================================= */}
      {isSpotFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] text-slate-900 dark:text-slate-100 overflow-y-auto animate-in fade-in duration-150 flex flex-col">
          {/* Top Sticky Header with Back Button */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1C1A1E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSpotFormOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  title="Back to Dashboard"
                  aria-label="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
                    {editingSpotId ? 'Edit Spot & Menu' : 'Publish New Spot Listing'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Managing {currentBiz.name} official spot profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpotFormOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-full shadow-sm bg-white dark:bg-[#121113] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Full-Screen Form Container */}
          <div className="max-w-3xl mx-auto w-full px-4 py-6 flex-1 pb-32">
            <form onSubmit={handleSaveSpot} className="space-y-6">
              
              {/* 1. Basic Spot Identity & Primary Category Selection */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Basic Spot Info & Category
                  </h3>
                  <span className="text-[10px] text-[#E0533C] font-bold">Step 1 • Classification</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Spot Name / Venue Title *
                  </label>
                  <input 
                    type="text" 
                    value={spotTitle} 
                    onChange={(e) => setSpotTitle(e.target.value)} 
                    placeholder="e.g. Ink & Drink Lounge, Karura Forest Foresters, The Foundry"
                    className="w-full text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-[#E0533C] font-semibold"
                    required 
                  />
                </div>

                {/* DYNAMIC PRIMARY CATEGORY SELECTION */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Primary Category *
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Choose your spot's primary nature to display category-specific fields below
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Current: {spotCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {PRIMARY_SPOT_CATEGORIES.map((catConfig) => {
                      const Icon = catConfig.icon;
                      const isCurrentGroup = spotPrimaryGroup === catConfig.id;
                      return (
                        <button
                          key={catConfig.id}
                          type="button"
                          onClick={() => {
                            setSpotPrimaryGroup(catConfig.id);
                            setSpotCategory(catConfig.id);
                            const options = SUBCATEGORIES_BY_CATEGORY[catConfig.id] || [];
                            if (options.length > 0) {
                              setSpotSubcategory(options[0]);
                            }
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer group relative ${
                            isCurrentGroup
                              ? 'border-[#E0533C] bg-orange-50/70 dark:bg-orange-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-[#E0533C]/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-[#FBFBF9] dark:bg-[#121113] hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                              isCurrentGroup 
                                ? 'bg-[#E0533C] text-white shadow-xs' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:scale-105'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {isCurrentGroup && (
                              <span className="w-2 h-2 rounded-full bg-[#E0533C]" />
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-black block leading-tight text-slate-900 dark:text-slate-100 line-clamp-1">
                              {catConfig.label}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                              {catConfig.badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-Category Specific Selector - Scoped dynamically to the selected primary category */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Subcategory ({PRIMARY_SPOT_CATEGORIES.find(c => c.id === spotPrimaryGroup)?.label || 'Specialized'}) *</span>
                      <span className="text-[10px] text-[#E0533C] font-semibold">
                        {(SUBCATEGORIES_BY_CATEGORY[spotPrimaryGroup] || []).length} options available
                      </span>
                    </label>
                    <select
                      value={spotSubcategory}
                      onChange={(e) => setSpotSubcategory(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 font-semibold focus:outline-none focus:border-[#E0533C]"
                    >
                      {(SUBCATEGORIES_BY_CATEGORY[spotPrimaryGroup] || []).map((subName) => (
                        <option key={subName} value={subName}>
                          {subName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Price Tier
                    </label>
                    <select 
                      value={spotPrice} 
                      onChange={(e) => setSpotPrice(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 font-semibold focus:outline-none focus:border-[#E0533C]"
                    >
                      <option value="KES">KES</option>
                      <option value="KES KES">KES KES</option>
                      <option value="KES KES KES">KES KES KES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Operating Hours
                    </label>
                    <input 
                      type="text" 
                      value={spotOpeningHours} 
                      onChange={(e) => setSpotOpeningHours(e.target.value)} 
                      placeholder="e.g. 11:00 AM - Midnight"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description / About This Spot *
                  </label>
                  <textarea 
                    rows={3}
                    value={spotDescription} 
                    onChange={(e) => setSpotDescription(e.target.value)} 
                    placeholder="Tell Nairobi explorers what makes your hangout, cocktails, ambiance, scenic views, or activities unique..."
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-[#E0533C]"
                    required
                  />
                </div>
              </div>

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 1: RESTAURANTS AND DINING
                  ========================================================================= */}
              {spotPrimaryGroup === 'restaurants_dining' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-orange-200 dark:border-orange-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#E0533C] flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Restaurants and dining Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Dining types, PDF/Image menu upload, and digital itemized menu builder
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#E0533C]">
                      Dining Active
                    </span>
                  </div>

                  {/* 1. DINING TYPES */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Dining Types & Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Fine Dining', 'Casual Bistro', 'Grill & Nyama Choma', 'Chef Table / Buffet'].map((dType) => {
                        const isSelected = spotCuisineTypes.includes(dType);
                        return (
                          <button
                            key={dType}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSpotCuisineTypes(prev => prev.filter(t => t !== dType));
                              } else {
                                setSpotCuisineTypes(prev => [...prev, dType]);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#E0533C] text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{dType}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. FEATURED DISHES / SIGNATURE DRINKS */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Featured Dishes / Signature Specialties ({spotFeaturedDishes.length})
                      </label>
                      <span className="text-[10px] text-slate-400">Top highlights shown on your spot page</span>
                    </div>

                    {spotFeaturedDishes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {spotFeaturedDishes.map((dish, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-xs font-bold text-orange-900 dark:text-orange-200"
                          >
                            <Sparkles className="w-3 h-3 text-[#E0533C]" />
                            <span>{dish}</span>
                            <button
                              type="button"
                              onClick={() => setSpotFeaturedDishes(prev => prev.filter((_, i) => i !== idx))}
                              className="text-orange-400 hover:text-red-500 ml-1 p-0.5 cursor-pointer"
                              title="Remove item"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFeaturedDishInput}
                        onChange={(e) => setNewFeaturedDishInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newFeaturedDishInput.trim() && !spotFeaturedDishes.includes(newFeaturedDishInput.trim())) {
                              setSpotFeaturedDishes(prev => [...prev, newFeaturedDishInput.trim()]);
                              setNewFeaturedDishInput('');
                            }
                          }
                        }}
                        placeholder="e.g. Signature Dawa Honey Spritz, Smoked Mbuzi Ribs, Truffle Parmesan Fries..."
                        className="text-xs flex-1 bg-slate-100 dark:bg-[#121113] rounded-xl p-2.5 focus:outline-none focus:border-[#E0533C]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newFeaturedDishInput.trim() && !spotFeaturedDishes.includes(newFeaturedDishInput.trim())) {
                            setSpotFeaturedDishes(prev => [...prev, newFeaturedDishInput.trim()]);
                            setNewFeaturedDishInput('');
                          }
                        }}
                        className="px-3.5 py-2 bg-[#E0533C] hover:bg-[#c9432d] text-white text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Dish</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. MENU UPLOAD (PDF OR IMAGE) */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Menu Upload (PDF or Image)
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload your printed dining menu or brochure directly
                        </p>
                      </div>
                      {spotMenuUploadUrl && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Menu Active</span>
                        </span>
                      )}
                    </div>

                    {spotMenuUploadUrl ? (
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#121113] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={spotMenuUploadUrl} 
                            alt="Uploaded Menu Preview" 
                            className="w-14 h-14 rounded-xl object-cover shrink-0" 
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate text-slate-900 dark:text-slate-100">
                              Uploaded Spot Menu Document
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Active and available on your spot profile
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label
                            htmlFor="spot-menu-doc-change"
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition"
                          >
                            <span>Change</span>
                          </label>
                          <input
                            id="spot-menu-doc-change"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleSpotMenuDocUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSpotMenuUploadUrl('');
                              showToast('Menu document removed.');
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                            title="Remove menu document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="spot-menu-doc-input"
                        className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center group-hover:scale-105 transition">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            Upload Spot Menu File
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Click to select an image or PDF from your device
                          </p>
                        </div>
                        <input
                          id="spot-menu-doc-input"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleSpotMenuDocUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* 4. DIGITAL MENU BUILDER */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Digital Menu Items ({spotMenuItems.length})
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Itemized dishes and beverages for quick guest browsing
                        </p>
                      </div>
                    </div>

                    {spotMenuItems.length > 0 && (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {spotMenuItems.map((item, idx) => (
                          <div key={item.id || idx} className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
                                {item.category && (
                                  <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-400">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#E0533C] font-black">{item.price}</span>
                              {item.description && <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setSpotMenuItems(prev => prev.filter((_, i) => i !== idx))}
                              className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-500 hover:text-red-700 flex items-center justify-center shrink-0 cursor-pointer transition"
                              title="Delete menu item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-[#FBFBF9] dark:bg-[#121113] p-4 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Add New Item to Digital Menu
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input 
                          type="text"
                          placeholder="Dish Name (e.g. Nyama Choma Platter)"
                          value={newMenuName}
                          onChange={(e) => setNewMenuName(e.target.value)}
                          className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-3 focus:outline-none"
                        />
                        <input 
                          type="text"
                          placeholder="Price (e.g. KES 1,500)"
                          value={newMenuPrice}
                          onChange={(e) => setNewMenuPrice(e.target.value)}
                          className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-3 focus:outline-none"
                        />
                        <select
                          value={newMenuCategory}
                          onChange={(e) => setNewMenuCategory(e.target.value)}
                          className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-3 focus:outline-none"
                        >
                          <option value="Mains">Mains</option>
                          <option value="Starters">Starters & Tapas</option>
                          <option value="Cocktails">Cocktails & Drinks</option>
                          <option value="Desserts">Desserts</option>
                          <option value="Brunch">Brunch & Coffee</option>
                        </select>
                      </div>
                      <input 
                        type="text"
                        placeholder="Description (e.g. Slow-roasted prime goat served with kachumbari & ugali)"
                        value={newMenuDesc}
                        onChange={(e) => setNewMenuDesc(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-3 focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={handleAddMenuItem}
                        className="w-full text-xs font-extrabold bg-[#E0533C]/10 text-[#E0533C] hover:bg-[#E0533C]/20 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item to Digital Menu</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 2: NATURE
                  ========================================================================= */}
              {spotPrimaryGroup === 'nature' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-emerald-200 dark:border-emerald-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Trees className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Nature, Parks & Hiking Specifications
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Parks, trails, equipment to carry, and wilderness guidelines
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Nature Active
                    </span>
                  </div>

                  {/* 1. EQUIPMENT TO CARRY (CHECKLIST) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Equipment to Carry (Explorer Checklist)
                      </label>
                      <span className="text-[10px] text-slate-400">Toggle recommended items for visitors</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_NATURE_EQUIPMENT.map((item) => {
                        const isSelected = spotWhatToBring.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSpotWhatToBring(prev => prev.filter(x => x !== item));
                              } else {
                                setSpotWhatToBring(prev => [...prev, item]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={customWhatToBringInput}
                        onChange={(e) => setCustomWhatToBringInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customWhatToBringInput.trim() && !spotWhatToBring.includes(customWhatToBringInput.trim())) {
                              setSpotWhatToBring(prev => [...prev, customWhatToBringInput.trim()]);
                              setCustomWhatToBringInput('');
                            }
                          }
                        }}
                        placeholder="Add custom gear to carry (e.g. Walking stick, Bug spray, Binoculars)..."
                        className="text-xs flex-1 bg-slate-100 dark:bg-[#121113] rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customWhatToBringInput.trim() && !spotWhatToBring.includes(customWhatToBringInput.trim())) {
                            setSpotWhatToBring(prev => [...prev, customWhatToBringInput.trim()]);
                            setCustomWhatToBringInput('');
                          }
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                      >
                        Add Gear
                      </button>
                    </div>
                  </div>

                  {/* 2. TRAIL DETAILS & ENTRY GUIDELINES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Trail Distance / Park Type
                      </label>
                      <input
                        type="text"
                        value={spotEquipmentProvided}
                        onChange={(e) => setSpotEquipmentProvided(e.target.value)}
                        placeholder="e.g. 5km & 10km marked forest loops • Scenic river valley"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Trail Difficulty Level
                      </label>
                      <select
                        value={spotSkillLevel}
                        onChange={(e) => setSpotSkillLevel(e.target.value)}
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-emerald-500 font-semibold"
                      >
                        <option value="All Levels Welcome">All Levels Welcome (Leisurely)</option>
                        <option value="Beginner Friendly">Beginner Friendly (Flat ground)</option>
                        <option value="Moderate / Intermediate">Moderate (Steep inclines / rocky)</option>
                        <option value="Challenging / Advanced">Challenging / Technical Hike</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 3: CREATIVE AND LEISURE
                  ========================================================================= */}
              {spotPrimaryGroup === 'creative_leisure' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-pink-200 dark:border-pink-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Creative and leisure Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Workshops, art studios, and craft activity supplies
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
                      Creative Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Art Supplies & Equipment Provided
                      </label>
                      <textarea
                        rows={3}
                        value={spotEquipmentProvided}
                        onChange={(e) => setSpotEquipmentProvided(e.target.value)}
                        placeholder="e.g. Canvases, acrylic paints, pottery wheels, sculpting clay, brushes, and protective aprons provided on-site..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Guest What to Bring & Wear
                      </label>
                      <textarea
                        rows={3}
                        value={spotEquipmentNeeded}
                        onChange={(e) => setSpotEquipmentNeeded(e.target.value)}
                        placeholder="e.g. Wear comfortable clothes you don't mind getting paint or clay on; bring flash drive for digital studio files..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Workshop Session Formats & Schedule
                    </label>
                    <input
                      type="text"
                      value={spotActivitySchedule}
                      onChange={(e) => setSpotActivitySchedule(e.target.value)}
                      placeholder="e.g. 2-hour guided painting sessions • Sat & Sun at 11:00 AM & 3:00 PM • Advance booking required"
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-pink-500 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 4: TECH AND GAMING
                  ========================================================================= */}
              {spotPrimaryGroup === 'tech_gaming' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-indigo-200 dark:border-indigo-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Tech and Gaming Specifications
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Arcades, VR hubs, console setups available, and price per time slot / hour
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      Gaming Active
                    </span>
                  </div>

                  {/* 1. PRICING & TIME SLOTS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Price Per Hour / Time Slot *
                      </label>
                      <input
                        type="text"
                        value={spotPricePerHour}
                        onChange={(e) => setSpotPricePerHour(e.target.value)}
                        placeholder="e.g. KES 500 / hr or KES 1,200 for 2-hour VR pass"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Time Slot & Booking Format
                      </label>
                      <input
                        type="text"
                        value={spotTimeSlots}
                        onChange={(e) => setSpotTimeSlots(e.target.value)}
                        placeholder="e.g. 60-min standard slots • Walk-in or online reservation"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* 2. CONSOLES / SETUPS AVAILABLE & GAMES */}
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Consoles & Setups Available *
                      </label>
                      <textarea
                        rows={2}
                        value={spotGameConsoles}
                        onChange={(e) => setSpotGameConsoles(e.target.value)}
                        placeholder="e.g. PlayStation 5, Xbox Series X, High-End RTX 4080 Gaming PCs, Meta Quest 3 VR, Logitech Racing Cockpits..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Available Games & Experiences
                      </label>
                      <textarea
                        rows={3}
                        value={spotAvailableGames}
                        onChange={(e) => setSpotAvailableGames(e.target.value)}
                        placeholder="e.g. EA FC 25, Call of Duty, Tekken 8, Mortal Kombat 1, Gran Turismo 7, VR Beat Saber, Catan, Pool / Billiards..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 5: ACTION AND SPORTS
                  ========================================================================= */}
              {spotPrimaryGroup === 'action_sports' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-blue-200 dark:border-blue-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Action and sports Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Fitness, extreme sports, and equipment needed / provided
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      Sports Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Equipment Provided by Venue
                      </label>
                      <textarea
                        rows={3}
                        value={spotEquipmentProvided}
                        onChange={(e) => setSpotEquipmentProvided(e.target.value)}
                        placeholder="e.g. Safety helmets, climbing harnesses, tennis rackets, boxing gloves, life jackets provided at no extra cost..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Equipment Needed / To Bring by Athlete
                      </label>
                      <textarea
                        rows={3}
                        value={spotEquipmentNeeded}
                        onChange={(e) => setSpotEquipmentNeeded(e.target.value)}
                        placeholder="e.g. Bring own training sneakers, workout apparel, gym towel, reusable hydration bottle..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Fitness & Skill Level
                    </label>
                    <select
                      value={spotSkillLevel}
                      onChange={(e) => setSpotSkillLevel(e.target.value)}
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="All Levels Welcome">All Levels Welcome (Inclusive & Beginner Friendly)</option>
                      <option value="Intermediate">Intermediate Training</option>
                      <option value="Challenging / Advanced">Challenging / Advanced Athlete</option>
                    </select>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 6: DATE SPOTS
                  ========================================================================= */}
              {spotPrimaryGroup === 'date_spots' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-rose-200 dark:border-rose-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Date spots & Romance Specifications
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Atmosphere tags and couple booking options
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      Date Spot Active
                    </span>
                  </div>

                  {/* 1. ATMOSPHERE TAGS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Atmosphere Tags ({spotAtmosphereTags.length} selected)
                      </label>
                      <span className="text-[10px] text-slate-400">Click to toggle ambiance tags</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ATMOSPHERE_TAGS.map((tag) => {
                        const isSelected = spotAtmosphereTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSpotAtmosphereTags(prev => prev.filter(t => t !== tag));
                              } else {
                                setSpotAtmosphereTags(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. BOOKING OPTIONS */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Booking Options & Couple Policies
                    </label>
                    <textarea
                      rows={2}
                      value={spotBookingOptions}
                      onChange={(e) => setSpotBookingOptions(e.target.value)}
                      placeholder="e.g. Candlelit booth reservation required for weekends • Walk-ins welcome at bar • Minimum spend KES 3,000 per couple"
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 7: CLUBS AND LOUNGES
                  ========================================================================= */}
              {spotPrimaryGroup === 'clubs_lounges' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-purple-200 dark:border-purple-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Clubs and lounges Nightlife Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Nightlife options and bottle service packages
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      Nightlife Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Nightlife Options & Policy
                      </label>
                      <textarea
                        rows={3}
                        value={spotNightlifeOptions}
                        onChange={(e) => setSpotNightlifeOptions(e.target.value)}
                        placeholder="e.g. Afrobeats, Amapiano & Hip-Hop • Resident DJs from 10:00 PM • Dress Code: Smart Casual • Age: 21+ only"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Bottle Service Options & VIP Packages
                      </label>
                      <textarea
                        rows={3}
                        value={spotBottleServiceOptions}
                        onChange={(e) => setSpotBottleServiceOptions(e.target.value)}
                        placeholder="e.g. VIP Booth reservations with Moët champagne packages from KES 15,000 • Dedicated bottle host & sparklers"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 8: CAFES AND BAKERIES
                  ========================================================================= */}
              {spotPrimaryGroup === 'cafes_bakeries' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Cafes and Bakeries Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Coffee & pastry menus, and work-friendly environment tags
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      Cafe Active
                    </span>
                  </div>

                  {/* 1. COFFEE & PASTRY MENUS */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Coffee / Pastry Menu Highlights
                    </label>
                    <textarea
                      rows={2}
                      value={spotCoffeePastryMenu}
                      onChange={(e) => setSpotCoffeePastryMenu(e.target.value)}
                      placeholder="e.g. Single-origin Kenyan AA espresso, pour-over V60, almond croissants, artisanal sourdough toast..."
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* 2. WORK-FRIENDLY TAGS */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Work-Friendly Tags ({spotWorkFriendlyTags.length} selected)
                      </label>
                      <span className="text-[10px] text-slate-400">Showcase remote work perks</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_WORK_FRIENDLY_TAGS.map((tag) => {
                        const isSelected = spotWorkFriendlyTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSpotWorkFriendlyTags(prev => prev.filter(t => t !== tag));
                              } else {
                                setSpotWorkFriendlyTags(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 9: HOTELS AND LUXURY STAYS
                  ========================================================================= */}
              {spotPrimaryGroup === 'hotels_luxury' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-yellow-200 dark:border-yellow-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center">
                        <Hotel className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Hotels and luxury stays Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Room/suite types and luxury hospitality amenities
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300">
                      Hotel Active
                    </span>
                  </div>

                  {/* 1. ROOM / SUITE TYPES */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Room & Suite Types Available
                    </label>
                    <textarea
                      rows={2}
                      value={spotRoomTypes}
                      onChange={(e) => setSpotRoomTypes(e.target.value)}
                      placeholder="e.g. Deluxe King City View, Executive Penthouse Suite with Terrace, 2-Bedroom Family Garden Villa..."
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* 2. AMENITIES */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Luxury Amenities ({spotHotelAmenities.length} selected)
                      </label>
                      <span className="text-[10px] text-slate-400">Click to toggle included hotel features</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_HOTEL_AMENITIES.map((amenity) => {
                        const isSelected = spotHotelAmenities.includes(amenity);
                        return (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSpotHotelAmenities(prev => prev.filter(a => a !== amenity));
                              } else {
                                setSpotHotelAmenities(prev => [...prev, amenity]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{amenity}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  DYNAMIC CONDITIONAL SECTION 10: VACATION SPOTS AND ESCAPES
                  ========================================================================= */}
              {spotPrimaryGroup === 'vacation_escapes' && (
                <div className="bg-white dark:bg-[#1C1A1E] border border-teal-200 dark:border-teal-900/40 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                        <Palmtree className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Vacation spots and escapes Details
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Weekend getaways and booking/day pass details
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                      Vacation Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Weekend Getaways & Cabin Details
                      </label>
                      <textarea
                        rows={3}
                        value={spotWeekendGetaways}
                        onChange={(e) => setSpotWeekendGetaways(e.target.value)}
                        placeholder="e.g. Lakefront cabins in Naivasha, Mount Kenya glamping domes, private Diani beachfront villa..."
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                        Booking & Day Pass Details
                      </label>
                      <textarea
                        rows={3}
                        value={spotDayPassDetails}
                        onChange={(e) => setSpotDayPassDetails(e.target.value)}
                        placeholder="e.g. Day Pass KES 2,500 includes pool access & lunch voucher • Overnight booking requires 50% deposit • Free cancellation up to 48 hrs"
                        className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  GENERAL / DEFAULT SECTION: LOCATION, TRANSIT & SOCIAL LINKS
                  ========================================================================= */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Location, Transit Directions & Social Links
                  </h3>
                  <span className="text-[10px] text-[#E0533C] font-bold">Standard Details</span>
                </div>

                {/* Dynamic Auto-Search Location Selector */}
                <DynamicLocationSelector
                  value={spotNeighborhood}
                  onChange={(loc) => {
                    setSpotNeighborhood(loc);
                    if (!spotAddress) {
                      setSpotAddress(loc);
                    }
                  }}
                  label="Neighborhood / Area Location *"
                  placeholder="Search Nairobi estates, Kiambu, Mombasa Rd stages..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Exact Location Tag (with Bus Stop / Stage) *
                    </label>
                    <input 
                      type="text" 
                      value={spotExactLocationTag} 
                      onChange={(e) => setSpotExactLocationTag(e.target.value)} 
                      placeholder="e.g. Mpaka Road, Westlands, Opposite PrideInn Hotel"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nearest Landmark / Bus Stage
                    </label>
                    <input 
                      type="text" 
                      value={spotLandmark} 
                      onChange={(e) => setSpotLandmark(e.target.value)} 
                      placeholder="e.g. Westlands Stage / Sarit Roundabout"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-[#E0533C]"
                    />
                  </div>
                </div>

                {/* Social Links & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>Reservation Phone / WhatsApp</span>
                    </label>
                    <input 
                      type="text" 
                      value={spotPhone} 
                      onChange={(e) => setSpotPhone(e.target.value)} 
                      placeholder="e.g. +254 722 123 456"
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#E0533C]" />
                      <span>Official Website</span>
                    </label>
                    <input 
                      type="url" 
                      value={spotWebsite} 
                      onChange={(e) => setSpotWebsite(e.target.value)} 
                      placeholder="e.g. https://yourspot.co.ke"
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-pink-500" />
                      <span>Instagram Handle</span>
                    </label>
                    <input 
                      type="text" 
                      value={spotInstagram} 
                      onChange={(e) => setSpotInstagram(e.target.value)} 
                      placeholder="e.g. @yourspotnairobi"
                      className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-2xl p-3 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* NATIVE FILE UPLOADS: COVER IMAGE & GALLERY PHOTOS */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Spot Media & Visuals
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload high-quality photos directly from your device. No URLs needed.
                  </p>
                </div>

                {/* PRIMARY COVER IMAGE (NATIVE FILE UPLOAD) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Primary Cover Photo *
                    </label>
                    {spotCoverImg && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cover Active</span>
                      </span>
                    )}
                  </div>

                  {spotCoverImg ? (
                    <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 group shadow-xs bg-slate-900">
                      <img 
                        src={spotCoverImg} 
                        alt="Spot Cover Preview" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-4">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="spot-cover-file-input"
                            className="px-3.5 py-2 bg-white/95 hover:bg-white text-slate-900 rounded-xl text-xs font-extrabold cursor-pointer transition shadow-md flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#E0533C]" />
                            <span>Change Photo</span>
                          </label>
                          <input
                            id="spot-cover-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleSpotCoverFileUpload}
                            className="hidden"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSpotCoverImg('');
                            showToast('Cover photo removed. Please upload a new image.');
                          }}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-md flex items-center gap-1.5"
                          title="Remove cover photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="spot-cover-file-input-empty"
                      className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer transition group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center group-hover:scale-105 transition">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Upload Spot Cover Photo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click to select a high-resolution photo from your device
                        </p>
                      </div>
                      <span className="px-4 py-2 bg-[#E0533C] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select Image File</span>
                      </span>
                      <input
                        id="spot-cover-file-input-empty"
                        type="file"
                        accept="image/*"
                        onChange={handleSpotCoverFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* GALLERY OF MULTIPLE ADDITIONAL SPOT IMAGES */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Gallery Photos ({spotGalleryImgs.length}/5)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        {spotGalleryImgs.length >= 5
                          ? 'Maximum 5 photos reached (clean gallery limit)'
                          : 'Add interior shots, signature cocktails, seating, and patio views (max 5)'}
                      </p>
                    </div>

                    {spotGalleryImgs.length < 5 && (
                      <label
                        htmlFor="spot-gallery-file-input"
                        className="px-3.5 py-1.5 bg-[#E0533C]/10 hover:bg-[#E0533C]/20 text-[#E0533C] rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </label>
                    )}
                    <input
                      id="spot-gallery-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSpotGalleryFileUpload}
                      className="hidden"
                    />
                  </div>

                  {spotGalleryImgs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {spotGalleryImgs.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          className="relative group rounded-2xl overflow-hidden aspect-square shadow-sm bg-slate-900 shadow-xs"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Gallery photo ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                          />

                          {/* Quick 'X' photo removal button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveGalleryImage(idx);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center transition cursor-pointer z-10 shadow-md"
                            title="Remove photo"
                            aria-label={`Remove photo ${idx + 1}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSpotCoverImg(imgUrl);
                                showToast('Set as primary cover photo!');
                              }}
                              className="px-2.5 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-black hover:bg-slate-100 transition"
                            >
                              Set as Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                          {spotCoverImg === imgUrl && (
                            <div className="absolute top-2 left-2 bg-[#E0533C] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase">
                              Cover
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add More Photos Tile (only if < 5) */}
                      {spotGalleryImgs.length < 5 && (
                        <label
                          htmlFor="spot-gallery-file-input-grid"
                          className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-1.5 p-3 aspect-square cursor-pointer transition text-center group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#E0533C] flex items-center justify-center group-hover:scale-110 transition">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                            Add More
                          </span>
                          <input
                            id="spot-gallery-file-input-grid"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleSpotGalleryFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="spot-gallery-file-input-empty"
                      className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                    >
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          No additional gallery photos uploaded
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Select multiple photos from your device to showcase the atmosphere
                        </p>
                      </div>
                      <span className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">
                        Choose Photos
                      </span>
                      <input
                        id="spot-gallery-file-input-empty"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSpotGalleryFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsSpotFormOpen(false)}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm rounded-2xl transition cursor-pointer text-center order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-full flex-1 bg-[#E0533C] hover:bg-[#c9432d] text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingSpotId ? 'Save & Update Spot Listing' : 'Publish Spot to RADA'}</span>
                </button>
              </div>


            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DEDICATED FULL-SCREEN VIEW: CREATE / EDIT EVENT
          ========================================================================= */}
      {isEventFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] overflow-y-auto flex flex-col animate-in fade-in duration-200">
          {/* Top Sticky Header */}
          <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#1C1A1E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEventFormOpen(false)}
                className="p-2 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 font-bold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                    {editingEventId ? 'Edit Concert / Rave Listing' : 'Publish Concert or Rave Listing'}
                  </h2>
                  <BusinessBadge businessId={currentBiz.id} category="event_organizer" size="xs" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Organizer: <strong className="text-slate-700 dark:text-slate-300">{currentBiz.name}</strong> • Live RADA Events Feed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEventFormOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSaveEvent(e as any)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{editingEventId ? 'Save Event' : 'Publish Event'}</span>
              </button>
            </div>
          </div>

          {/* Main Full-Screen Form Container */}
          <div className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-28">
            <form onSubmit={handleSaveEvent} className="space-y-6">
              
              {/* Event Core Identity Card */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                    <span>Event Identity & Category</span>
                  </h3>
                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                    Official Primary Listing
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Event Title *
                  </label>
                  <input 
                    type="text" 
                    value={eventTitle} 
                    onChange={(e) => setEventTitle(e.target.value)} 
                    placeholder="e.g. Sunset Amapiano Jam Vol. 4 • Nairobi Edition"
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Event Category
                    </label>
                    <select 
                      value={eventCategory} 
                      onChange={(e) => setEventCategory(e.target.value as any)}
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                    >
                      <option value="concerts">Concerts & Live Festivals</option>
                      <option value="nightlife">Nightlife Club Rave</option>
                      <option value="art">Art & Cultural Showcase</option>
                      <option value="cinemas">Film & Cinema Screening</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Music Genre / Theme Tag
                    </label>
                    <input 
                      type="text"
                      value={eventGenre}
                      onChange={(e) => setEventGenre(e.target.value)}
                      placeholder="e.g. Amapiano & Afro-Tech / Hip-Hop"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Event Description / Vibe Overview
                  </label>
                  <textarea 
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the sound system, headliners, outdoor stages, food vendors, and party atmosphere..."
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedule: Date & Time Card */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Date & Schedule</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Event Date *
                    </label>
                    <input 
                      type="text" 
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)} 
                      placeholder="e.g. Sat, 28 Nov 2026"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Event Hours *
                    </label>
                    <input 
                      type="text" 
                      value={eventTime} 
                      onChange={(e) => setEventTime(e.target.value)} 
                      placeholder="e.g. 07:00 PM - 04:00 AM"
                      className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Venue Location & Dynamic Auto-Search Card */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>Venue Location & Transit Directions</span>
                  </h3>
                  <span className="text-[10px] text-purple-600 font-bold">Nairobi • Kiambu • Mombasa Rd</span>
                </div>

                {/* Dynamic Auto-Search Location Selector */}
                <DynamicLocationSelector
                  value={eventLocation}
                  onChange={(loc) => setEventLocation(loc)}
                  label="Venue Neighborhood / Area Location *"
                  placeholder="Search venue estate, Kiambu, Mombasa Rd stages, or type custom..."
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Specific Stage / Landmark / Gate Directions
                  </label>
                  <input 
                    type="text" 
                    value={eventExactLocationTag} 
                    onChange={(e) => setEventExactLocationTag(e.target.value)} 
                    placeholder="e.g. The Courtyard Main Stage, Gate 2, Village Market"
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-purple-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Helps partygoers navigate bus drops, Uber drop-offs, and venue security gates.
                  </p>
                </div>
              </div>

              {/* NATIVE FILE UPLOADS: EVENT POSTER & MULTI-IMAGE GALLERY */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span>Event Poster & Visual Gallery</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select high-res artwork & venue vibe photos directly from your device (no URL typing required)
                    </p>
                  </div>
                </div>

                {/* Primary Event Poster / Cover */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Primary Event Poster Artwork *
                    </label>
                    <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                      Main Banner Artwork
                    </span>
                  </div>

                  {eventImg ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-sm bg-slate-900 group">
                      <div className="h-64 sm:h-72 w-full relative">
                        <img 
                          src={eventImg} 
                          alt="Event Poster Preview" 
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        
                        <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Active Cover Poster</span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <label 
                            htmlFor="event-poster-file-input-replace"
                            className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg cursor-pointer transition flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-purple-600" />
                            <span>Change Poster</span>
                          </label>
                          <input
                            id="event-poster-file-input-replace"
                            type="file"
                            accept="image/*"
                            onChange={handleEventPosterFileUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEventImg('');
                              showToast('Poster artwork removed.');
                            }}
                            className="px-3 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="event-poster-file-input-empty"
                      className="w-full py-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Upload Event Artwork Poster
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tap to select official flyer or poster from your phone or computer
                        </p>
                      </div>
                      <span className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 mt-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select Poster File</span>
                      </span>
                      <input
                        id="event-poster-file-input-empty"
                        type="file"
                        accept="image/*"
                        onChange={handleEventPosterFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* GALLERY OF MULTIPLE ADDITIONAL EVENT PHOTOS */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Event Atmosphere & Stage Gallery ({eventGalleryImgs.length}/5)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        {eventGalleryImgs.length >= 5
                          ? 'Maximum 5 photos reached (clean gallery limit)'
                          : 'Add stage production, DJ decks, past crowd vibes, or VIP deck photos (max 5)'}
                      </p>
                    </div>

                    {eventGalleryImgs.length < 5 && (
                      <label
                        htmlFor="event-gallery-file-input"
                        className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </label>
                    )}
                    <input
                      id="event-gallery-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEventGalleryFileUpload}
                      className="hidden"
                    />
                  </div>

                  {eventGalleryImgs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {eventGalleryImgs.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          className="relative group rounded-2xl overflow-hidden aspect-square shadow-sm bg-slate-900 shadow-xs"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Event photo ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200" 
                          />

                          {/* Quick 'X' photo removal button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveEventGalleryImage(idx);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center transition cursor-pointer z-10 shadow-md"
                            title="Remove photo"
                            aria-label={`Remove event photo ${idx + 1}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEventImg(imgUrl);
                                showToast('Set as main event poster!');
                              }}
                              className="px-2.5 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-black hover:bg-slate-100 transition"
                            >
                              Set as Poster
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveEventGalleryImage(idx)}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                          {eventImg === imgUrl && (
                            <div className="absolute top-2 left-2 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase">
                              Poster
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add More Photos Tile (only if < 5) */}
                      {eventGalleryImgs.length < 5 && (
                        <label
                          htmlFor="event-gallery-file-input-grid"
                          className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-1.5 p-3 aspect-square cursor-pointer transition text-center group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                            Add More
                          </span>
                          <input
                            id="event-gallery-file-input-grid"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEventGalleryFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="event-gallery-file-input-empty"
                      className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-600 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                    >
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          No additional vibe photos added yet
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload multiple crowd or stage images to hype up partygoers
                        </p>
                      </div>
                      <span className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold">
                        Choose Photos
                      </span>
                      <input
                        id="event-gallery-file-input-empty"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEventGalleryFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Ticketing Portal & Multi-Tier Passes */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-purple-600" />
                    <span>Official Primary Ticketing & Passes</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Primary Ticketing Portal Link *
                  </label>
                  <input 
                    type="url" 
                    value={eventUrl} 
                    onChange={(e) => setEventUrl(e.target.value)} 
                    placeholder="e.g. https://hustlesasa.com/your-event OR https://kenyabuzz.com/events"
                    className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-[#121113] rounded-2xl p-3.5 focus:outline-none focus:border-purple-600"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct primary checkout links only (no affiliate codes or redirects).
                  </p>
                </div>

                {/* Ticket Tiers */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Admission Tiers ({eventTiers.length})
                  </label>
                  <div className="space-y-2">
                    {eventTiers.map((tier, idx) => (
                      <div key={idx} className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{tier.name}</span>
                          <span className="text-[11px] text-purple-600 font-black ml-2">{tier.price}</span>
                          {tier.perks && <p className="text-[10px] text-slate-400 mt-0.5">{tier.perks}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEventTiers(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Tier Mini-Form */}
                  <div className="p-3 bg-slate-100 dark:bg-[#121113] rounded-2xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Add Pass Tier</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input 
                        type="text"
                        placeholder="Tier (e.g. VIP Pass)"
                        value={newTierName}
                        onChange={(e) => setNewTierName(e.target.value)}
                        className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                      />
                      <input 
                        type="text"
                        placeholder="Price (e.g. KES 3,500)"
                        value={newTierPrice}
                        onChange={(e) => setNewTierPrice(e.target.value)}
                        className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                      />
                      <input 
                        type="text"
                        placeholder="Perks (e.g. Welcome cocktail)"
                        value={newTierPerks}
                        onChange={(e) => setNewTierPerks(e.target.value)}
                        className="text-xs bg-white dark:bg-[#1C1A1E] shadow-sm rounded-xl p-2.5 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTierName.trim()) return;
                        const price = newTierPrice.trim().startsWith('KES') ? newTierPrice.trim() : `KES ${newTierPrice.trim()}`;
                        setEventTiers(prev => [...prev, { name: newTierName.trim(), price, perks: newTierPerks.trim() || 'Standard entry' }]);
                        setNewTierName('');
                        setNewTierPrice('KES ');
                        setNewTierPerks('');
                        showToast(`Added tier "${newTierName}"!`);
                      }}
                      className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Tier</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Headliner Lineup Card */}
              <div className="bg-white dark:bg-[#1C1A1E] shadow-sm rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Performing Artists & DJ Lineup ({eventArtists.length})</span>
                  </h3>
                </div>

                <div className="flex gap-2 overflow-x-auto py-1">
                  {eventArtists.map((a, idx) => (
                    <div key={idx} className="bg-[#FBFBF9] dark:bg-[#121113] p-2.5 rounded-2xl shadow-sm shrink-0 flex items-center gap-2.5">
                      <img src={a.img} alt={a.name} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <span className="font-extrabold text-xs block">{a.name}</span>
                        <span className="text-[10px] text-slate-400 block">{a.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEventArtists(prev => prev.filter((_, i) => i !== idx))}
                        className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    placeholder="Artist / Headliner DJ Name" 
                    className="flex-1 p-3 bg-slate-100 dark:bg-[#121113] rounded-xl text-xs focus:outline-none"
                  />
                  <input 
                    type="text" 
                    value={newArtistRole}
                    onChange={(e) => setNewArtistRole(e.target.value)}
                    placeholder="Role (e.g. Special Guest DJ)" 
                    className="sm:w-48 p-3 bg-slate-100 dark:bg-[#121113] rounded-xl text-xs focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!newArtistName.trim()) return;
                      setEventArtists(prev => [...prev, {
                        name: newArtistName.trim(),
                        role: newArtistRole.trim() || 'Performer',
                        img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop'
                      }]);
                      setNewArtistName('');
                      showToast(`Added ${newArtistName} to lineup!`);
                    }}
                    className="px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Artist</span>
                  </button>
                </div>
              </div>

              {/* Bottom Submit Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEventFormOpen(false)}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm rounded-2xl transition cursor-pointer text-center order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-full flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-purple-500/20 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingEventId ? 'Save & Update Event Listing' : 'Publish Concert to RADA'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: INDEPENDENT OFFERS & PROMOTIONS FORM (DECOUPLED)
          ========================================================================= */}
      {isOfferFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1A1E] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-sm animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  {editingOfferId ? 'Edit Promotional Offer' : 'Launch New Promotional Offer'}
                </h3>
                <p className="text-xs text-slate-500">Showcased on Home running offers feed</p>
              </div>
              <button onClick={() => setIsOfferFormOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold mb-1">Offer Title *</label>
                <input 
                  type="text" 
                  value={offerTitle} 
                  onChange={(e) => setOfferTitle(e.target.value)} 
                  placeholder="e.g. Happy Hour 2-for-1 Cocktails, 20% Off Gate Pass"
                  className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-[#E0533C]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Offer Category</label>
                  <select 
                    value={offerCategory} 
                    onChange={(e) => setOfferCategory(e.target.value as OfferCategory)}
                    className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none"
                  >
                    <option value="Drinks">Drinks</option>
                    <option value="Food">Food</option>
                    <option value="Tickets">Tickets</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Special Deals">Special Deals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Discount Tag (Pill)</label>
                  <input 
                    type="text" 
                    value={offerDiscount} 
                    onChange={(e) => setOfferDiscount(e.target.value)} 
                    placeholder="e.g. BUY 1 GET 1, 20% OFF, KES 500 OFF"
                    className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Description & Terms</label>
                <textarea 
                  rows={2}
                  value={offerDesc} 
                  onChange={(e) => setOfferDesc(e.target.value)} 
                  placeholder="Describe what customers get and how to redeem it..."
                  className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-3 focus:outline-none focus:border-[#E0533C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                  Promotional Poster Image *
                </label>
                {offerPosterUrl ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-sm group h-36 bg-slate-900">
                    <img 
                      src={offerPosterUrl} 
                      alt="Offer Poster Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 text-xs font-black rounded-xl shadow-md flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-[#E0533C]" /> Change
                        <input 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) setOfferPosterUrl(event.target.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setOfferPosterUrl('')}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#FBFBF9] dark:bg-[#121113] transition text-center">
                    <Upload className="w-5 h-5 text-[#E0533C]" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload Promotional Poster</span>
                    <span className="text-[10px] text-slate-400">Select promo flyer or banner from device</span>
                    <input 
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) setOfferPosterUrl(event.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Valid Until / Schedule</label>
                  <input 
                    type="text" 
                    value={offerValidUntil} 
                    onChange={(e) => setOfferValidUntil(e.target.value)} 
                    placeholder="e.g. Every Friday 5PM-8PM"
                    className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Claim Code</label>
                  <input 
                    type="text" 
                    value={offerClaimCode} 
                    onChange={(e) => setOfferClaimCode(e.target.value)} 
                    placeholder="e.g. RADA-HAPPY"
                    className="w-full text-xs bg-slate-100 dark:bg-[#121113] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#E0533C] text-white font-black text-sm py-3 rounded-2xl shadow-lg mt-4 cursor-pointer"
              >
                {editingOfferId ? 'Update Promotion' : 'Publish Offer Live'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
