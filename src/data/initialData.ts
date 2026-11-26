import { 
  BusinessAccount, 
  BusinessOffer,
  SpotItem, 
  EventItem, 
  StatusPost, 
  DatingProfile, 
  ChatConversation, 
  VaultTicket, 
  EmergencyContact,
  CollectionFolder,
  OutingPlan,
  SpotClaimRequest
} from '../types.ts';

// Authentic Nairobi Offers & Promotions featuring real venues, hours, locations, and venue details
export const initialOffers: BusinessOffer[] = [
  {
    id: 'nbo-offer-1',
    businessId: 'biz-artcaffe',
    businessName: 'Artcaffé Bakery & Coffee Bar',
    businessCategory: 'hospitality',
    title: 'Morning Pastry & Barista Coffee Pairing',
    description: 'Freshly baked butter croissant or pain au chocolat paired with any single-origin cappuccino or latte.',
    category: 'Food',
    discount: 'COMBO KES 750',
    highlight: 'Pastry + Coffee Combo',
    posterUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop',
    validUntil: 'Daily · 6:30 AM – 11:00 AM',
    venue: 'Artcaffé Two Rivers & Westgate',
    location: 'Two Rivers Mall, Limuru Rd, Nairobi',
    contactPhone: '+254 709 828282',
    bookingUrl: 'https://www.artcaffe.co.ke/',
    terms: 'Available for dine-in across Nairobi Artcaffé cafés.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-2',
    businessId: 'biz-karel',
    businessName: 'Karel T-Lounge',
    businessCategory: 'hospitality',
    title: 'Golden Hour Cocktails & Tapas',
    description: 'Two-for-one signature Mediterranean cocktails and spiced mezze plates on the Village Market terrace.',
    category: 'Drinks',
    discount: '2 FOR 1 DRINKS',
    highlight: 'Golden Hour 2-for-1',
    posterUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop',
    validUntil: 'Tue – Fri · 4:00 PM – 7:30 PM',
    venue: 'Karel T-Lounge',
    location: 'Village Market, Limuru Rd, Gigiri',
    contactPhone: '+254 746 619462',
    bookingUrl: 'https://karel.co.ke/',
    terms: 'Applies to selected house cocktails and signature spritzers.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-3',
    businessId: 'biz-5',
    businessName: 'The Talisman Restaurant',
    businessCategory: 'hospitality',
    title: 'Garden Terrace Date Night Tasting',
    description: 'Three-course Pan-Asian and Kenyan fusion dinner for two with a complimentary house dessert platter.',
    category: 'Food',
    discount: '3-COURSE SPECIAL',
    highlight: 'Complimentary Dessert',
    posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    validUntil: 'Wednesdays · 6:00 PM – 10:30 PM',
    venue: 'The Talisman Restaurant',
    location: '320 Ngong Rd, Karen, Nairobi',
    contactPhone: '+254 705 999888',
    audience: 'Couples & Small Groups',
    terms: 'Garden seating reservations recommended ahead of arrival.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-4',
    businessId: 'biz-cjs',
    businessName: "CJ's Koinange Street",
    businessCategory: 'hospitality',
    title: 'CBD Early Bird Breakfast & Coffee',
    description: 'Order any full breakfast platter on weekday mornings and enjoy a complimentary freshly brewed cappuccino or tea.',
    category: 'Food',
    discount: 'FREE COFFEE',
    highlight: 'Free Barista Coffee',
    posterUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
    validUntil: 'Mon – Fri · 7:00 AM – 10:00 AM',
    venue: "CJ's Koinange Street",
    location: 'Koinange St, Nairobi CBD',
    terms: 'Valid for dine-in breakfast platters across CBD & Kilimani branches.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-5',
    businessId: 'biz-alchemist',
    businessName: 'The Alchemist',
    businessCategory: 'hospitality',
    title: 'Sunset Courtyard Dawa & Live DJs',
    description: 'Evening happy hour on classic Kenyan honey Dawa pitchers and street-kitchen platters before the late set.',
    category: 'Drinks',
    discount: 'HAPPY HOUR',
    highlight: 'Courtyard Happy Hour',
    posterUrl: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=800&auto=format&fit=crop',
    validUntil: 'Thu – Sat · 5:00 PM – 8:00 PM',
    venue: 'The Alchemist Bar',
    location: 'Parklands Rd, Westlands, Nairobi',
    terms: 'Free courtyard entry before 8:00 PM on Thursdays and Fridays.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-6',
    businessId: 'biz-2',
    businessName: 'Mama Rocks Gourmet Burgers',
    businessCategory: 'hospitality',
    title: 'Sunday Rooftop Smash Burger Combo',
    description: '20% off double African-spiced gourmet burger combos with hand-cut masala fries and house shakes.',
    category: 'Food',
    discount: '20% OFF COMBO',
    highlight: '20% Off Burger Combo',
    posterUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
    validUntil: 'Sundays · 12:00 PM – 9:00 PM',
    venue: 'Mama Rocks Kilimani',
    location: 'Adlife Plaza Rooftop, Ring Rd Kilimani',
    contactPhone: '+254 711 223344',
    terms: 'Available for rooftop dine-in orders in Kilimani and Westlands.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-7',
    businessId: 'biz-tribe',
    businessName: 'Tribe Hotel · Jiko',
    businessCategory: 'hospitality',
    title: 'Weekend Poolside Sundowner & Bites',
    description: 'Curated sundowner cocktail or craft mocktail paired with chef sharing plates by the courtyard pool.',
    category: 'Special Deals',
    discount: 'SUNDOWNER SET',
    highlight: 'Poolside Sundowner',
    posterUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    validUntil: 'Fri – Sun · 4:00 PM – 7:00 PM',
    venue: 'Tribe Hotel',
    location: 'Limuru Rd, Gigiri, Nairobi',
    contactPhone: '+254 20 7200000',
    bookingUrl: 'https://www.tribe-hotel.com/',
    terms: 'Walk-ins welcome subject to poolside seating availability.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-8',
    businessId: 'biz-karura',
    businessName: 'Karura Forest Reserve',
    businessCategory: 'hospitality',
    title: 'Weekday Canopy Bike & Trail Pass',
    description: '2-hour mountain bike rental with helmet and trail map for the waterfall, caves, and bamboo forest loop.',
    category: 'Special Deals',
    discount: 'WEEKDAY PASS',
    highlight: '2-Hr Trail Bike Rental',
    posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop',
    validUntil: 'Mon – Fri · 6:00 AM – 5:30 PM',
    venue: 'Karura Forest (Gate A & Gate C)',
    location: 'Limuru Rd & Kiambu Rd, Muthaiga',
    contactPhone: '+254 724 215423',
    terms: 'Standard KFS gate conservation fees apply separately.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-9',
    businessId: 'biz-cafejavas',
    businessName: 'Cafe Javas',
    businessCategory: 'hospitality',
    title: 'Squad Grill Platter & Fresh Juice Pitcher',
    description: 'Mixed grill sharing platter for four served with loaded fries, garden salad, and a freshly pressed tropical pitcher.',
    category: 'Food',
    discount: 'GROUP SPECIAL',
    highlight: 'Platter for 4 + Pitcher',
    posterUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    validUntil: 'Daily · 12:00 PM – 10:00 PM',
    venue: 'Cafe Javas Nairobi',
    location: 'Kimathi St CBD & Westlands',
    contactPhone: '+254 705 452477',
    audience: 'Groups of 3–4',
    terms: 'Available all week for dine-in.',
    createdAt: '2026-11-20'
  },
  {
    id: 'nbo-offer-10',
    businessId: 'biz-pallet',
    businessName: 'Pallet Cafe Lavington',
    businessCategory: 'hospitality',
    title: 'Garden Brunch & Pour-Over Coffee',
    description: 'Slow weekend garden brunch bowl paired with Kenyan AA pour-over coffee in a leafy, work-friendly courtyard.',
    category: 'Special Deals',
    discount: 'BRUNCH DEAL',
    highlight: 'Garden Brunch + Coffee',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    validUntil: 'Daily · 8:00 AM – 1:00 PM',
    venue: 'Pallet Cafe Lavington',
    location: 'James Gichuru Rd, Lavington',
    terms: 'Includes complimentary high-speed garden Wi-Fi.',
    createdAt: '2026-11-20'
  }
];

export const LEGACY_OFFER_IDS = [
  'off-1', 'off-2', 'off-3', 'off-4', 'off-5', 'off-6',
  'off-7', 'off-8', 'off-9', 'off-10', 'off-11', 'off-12'
];

export const initialBusinesses: BusinessAccount[] = [
  {
    id: 'biz-1',
    name: 'Ink & Drink Bar & Lounge',
    category: 'hospitality',
    email: 'events@inkanddrink.ke',
    phone: '+254 722 123 456',
    whatsapp: '+254722123456',
    neighborhood: 'Westlands',
    address: 'Mpaka Road, Westlands, Nairobi',
    bio: 'Artisan cocktails, craft beers, and tapas lounge with live DJ sets every weekend.',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@inkanddrinkke',
    createdDate: '2026-08-10',
    discography: [
      'Sunset Sessions Vol. 4 (Live Afro-House Set)',
      'Mpaka Nights: Amapiano Lounge Edition',
      'The Dawa Mixology Masterclass Series'
    ],
    pinnedImages: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop'
    ],
    specialOffers: [
      { id: 'so-1', title: 'Happy Hour Dawa 2-for-1', discount: 'BUY 1 GET 1', description: 'Weekdays 5:00 PM - 8:00 PM on signature cocktails' }
    ]
  },
  {
    id: 'biz-2',
    name: 'Mama Rocks Gourmet Burgers',
    category: 'hospitality',
    email: 'hello@mamarocks.co.ke',
    phone: '+254 711 223 344',
    whatsapp: '+254711223344',
    neighborhood: 'Kilimani',
    address: 'Adlife Plaza Rooftop, Ring Rd Kilimani, Nairobi',
    bio: 'Pioneers of African-inspired gourmet burgers, craft milkshakes, and soulful outdoor dining.',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@mamarocksburgers',
    createdDate: '2026-06-15',
    discography: [
      'Flavor Chronicles: Suya & Plantain Fusion',
      'Mama Rocks Sounds: Beats & Bites Podcast'
    ],
    pinnedImages: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop'
    ]
  },
  {
    id: 'biz-3',
    name: 'VibeCraft Events KE',
    category: 'event_organizer',
    email: 'bookings@vibecraft.co.ke',
    phone: '+254 733 987 654',
    whatsapp: '+254733987654',
    neighborhood: 'Westlands',
    address: 'Delta Corner Tower, Westlands, Nairobi',
    bio: 'Pioneering experiential festivals, rooftop raves, and cultural music celebrations in Kenya.',
    logo: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@vibecraft_ke',
    createdDate: '2026-07-20'
  },
  {
    id: 'biz-5',
    name: 'The Talisman Restaurant',
    category: 'hospitality',
    email: 'reservations@thetalisman.co.ke',
    phone: '+254 705 999 888',
    whatsapp: '+254705999888',
    neighborhood: 'Karen',
    address: '320 Ngong Road, Karen, Nairobi',
    bio: 'Acclaimed garden oasis dining featuring Pan-Asian, African, and Mediterranean delicacies.',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@talisman_nairobi',
    createdDate: '2026-05-10'
  }
];

// 10 Detailed Realistic Nairobi & Kiambu Spots spanning all requested regions:
// Westlands, Kilimani, Karen, Nairobi CBD, Lavington, Parklands, Mombasa Rd, Ruiru, Kiambu Town, Thika
/** Titles of the old hardcoded demo spots. Used only to purge copies cached in localStorage / old cloud rows. */
export const LEGACY_MOCK_SPOT_TITLES: string[] = ["Ink & Drink Bar & Lounge", "Mama Rocks Gourmet Burgers", "The Talisman Restaurant & Gardens", "CJ\\", "Pallet Cafe Lavington", "Diamond Plaza Street Food Bazaar", "Ole Sereni Rooftop Waterhole", "Rainbow Ruiru Resort & Choma Terrace", "Wadi Degla Club & Gardens", "Cravers Grill Thika & Nightspot", "Karura Forest Canopy & Biking Trails", "Nairobi Arboretum Nature Walk & Botanical Groves", "Paint & Sip Nairobi Studio", "Nairobi VR & Simulator Gaming Arena", "Oloolua Nature Trail & Waterfall Caves", "Paintball Fury & Archery Tactical Arena", "MadMax Karting & Two Rivers Grand Prix", "Pins & Strikes Luxury Bowling Alley", "ClayWorks Pottery & Glaze Studio", "Ngong Hills Ridge Hike & Windmill Summit"];

/** No mock spots: every spot comes from Supabase (`unclaimedspots` + merchant-created listings). */
export const initialSpots: SpotItem[] = [];

export const initialEvents: EventItem[] = [];


export const initialStatuses: StatusPost[] = [];

/** Real registered members from Supabase profiles are used. No fake mock accounts. */
export const discoveryProfiles: DatingProfile[] = [];

export const initialConversations: ChatConversation[] = [];

// No sample tickets: every person starts with an empty Vault.
export const initialTickets: VaultTicket[] = [];

// No sample contacts: SOS must only ever message numbers the person added themselves.
export const initialContacts: EmergencyContact[] = [];

/** Ids of the old built-in sample items. They are stripped from any data already saved on a device. */
export const LEGACY_SAMPLE_TICKET_IDS = ['t-1', 't-2'];
export const LEGACY_SAMPLE_CONTACT_IDS = ['ec-1', 'ec-2'];

export const initialFolders: CollectionFolder[] = [
  { id: 'folder-1', name: 'Birthday Move', emoji: 'cake', createdAt: '2026-10-14T10:00:00Z', description: 'Birthday celebrations and group dining' },
  { id: 'folder-2', name: 'Sunday Chill', emoji: 'cafe', createdAt: '2026-10-14T11:00:00Z', description: 'Relaxed cafe hangouts and nature trails' },
  { id: 'folder-3', name: 'Date Ideas', emoji: 'heart', createdAt: '2026-10-14T12:00:00Z', description: 'Romantic dinners, sunsets and cozy spots' }
];

export const initialOutings: OutingPlan[] = [];

export const initialSpotClaims: SpotClaimRequest[] = [
  {
    id: 'claim-init-1',
    spotId: 13,
    spotTitle: 'Paint & Sip Nairobi Studio',
    spotCategory: 'creative_leisure',
    spotNeighborhood: 'Westlands',
    spotAddress: 'Muthithi Road, The Promenade 2nd Floor',
    spotImg: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
    businessId: 'biz-1',
    businessName: 'Ink & Drink Bar & Lounge',
    businessCategory: 'hospitality',
    businessPhone: '+254 722 123 456',
    businessEmail: 'events@inkanddrink.ke',
    businessLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop',
    applicantUserId: 'user-demo-claimant',
    applicantName: 'Nairobi Explorer',
    applicantHandle: '@explorer',
    claimantRole: 'Managing Partner & Co-Owner',
    contactPhone: '+254 722 123 456',
    contactEmail: 'management@paintsipkenya.com',
    officialSocialUrl: 'https://instagram.com/paintsipnairobi',
    proofNote: 'We operate Paint & Sip Studio on 2nd Floor, The Promenade, Muthithi Road. Uploaded our Nairobi City County Single Business Permit (SBP-2026/04918) and building commercial lease agreement.',
    proofDocuments: [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop'
    ],
    status: 'pending',
    createdAt: '2026-10-18T10:30:00.000Z'
  }
];

