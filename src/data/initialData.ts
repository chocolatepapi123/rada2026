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
import { generatePlayableWavDataUrl } from '../utils/mediaUtils.ts';

// 10 Detailed Realistic Running Offers & Promotions directly linked to real spots from the Spots Tab
export const initialOffers: BusinessOffer[] = [
  {
    id: 'off-1',
    businessId: 'biz-1',
    businessName: 'Ink & Drink Bar & Lounge',
    businessCategory: 'hospitality',
    title: 'Happy Hour Dawa & Tapas 2-for-1',
    description: 'Buy 1 signature Kenyan honey Dawa cocktail or craft cider and get 1 free! Valid every weekday sunset.',
    category: 'Drinks',
    discount: 'BUY 1 GET 1',
    posterUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop',
    validUntil: 'Every Mon-Fri 5PM-8PM',
    claimCode: 'RADA-DAWA241',
    createdAt: '2026-10-10'
  },
  {
    id: 'off-2',
    businessId: 'biz-2',
    businessName: 'Mama Rocks Gourmet Burgers',
    businessCategory: 'hospitality',
    title: 'Sunday Smoked Brisket Sliders Combo',
    description: 'Order any 2 artisanal brisket sliders and get 20% off craft beer buckets and hand-cut truffle parmesan fries.',
    category: 'Food',
    discount: '20% OFF',
    posterUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
    validUntil: 'Every Sunday all day',
    claimCode: 'RADA-BRISKET20',
    createdAt: '2026-10-11'
  },
  {
    id: 'off-3',
    businessId: 'spot-17',
    businessName: 'MadMax Karting & Two Rivers Grand Prix',
    businessCategory: 'hospitality',
    title: 'Adrenaline Squad Sprint 25% OFF',
    description: 'Book a 25-lap Grand Prix heat for a squad of 4 or more racers and receive 25% off with live telemetry timing.',
    category: 'Special Deals',
    discount: '25% OFF SQUAD',
    posterUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop',
    validUntil: 'Valid Tue - Thu 2PM - 8PM',
    claimCode: 'MADMAX-SQUAD25',
    createdAt: '2026-10-12'
  },
  {
    id: 'off-4',
    businessId: 'spot-4',
    businessName: "CJ's Koinange Street",
    businessCategory: 'hospitality',
    title: 'CBD Power Breakfast & Free Caramel Macchiato',
    description: 'Order the loaded CJ Big Breakfast platter between 7AM and 10AM and receive a complimentary Double Caramel Macchiato.',
    category: 'Food',
    discount: 'FREE COFFEE',
    posterUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
    validUntil: 'Mon - Fri 7:00 AM - 10:00 AM',
    claimCode: 'CJS-POWERAM',
    createdAt: '2026-10-12'
  },
  {
    id: 'off-5',
    businessId: 'biz-5',
    businessName: 'The Talisman Restaurant & Gardens',
    businessCategory: 'hospitality',
    title: 'Midweek Candlelit Date Night 3-Course Special',
    description: 'Complimentary dessert platter & artisanal sparkling spritz when you reserve a table for two on Wednesdays in Karen.',
    category: 'Food',
    discount: 'FREE DESSERT',
    posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    validUntil: 'Valid Wednesdays 6PM-11PM',
    claimCode: 'TALIS-DATEFREE',
    createdAt: '2026-10-13'
  },
  {
    id: 'off-6',
    businessId: 'spot-18',
    businessName: 'Pins & Strikes Luxury Bowling Alley',
    businessCategory: 'hospitality',
    title: 'Strike Night VIP Lane & Shoe Rental Special',
    description: 'Book 1 hour of VIP glow bowling for up to 6 players and get complimentary shoe rentals plus 20% off signature platters.',
    category: 'Special Deals',
    discount: '20% OFF VIP',
    posterUrl: 'https://images.unsplash.com/photo-1538388177566-72d3663b85d4?w=800&auto=format&fit=crop',
    validUntil: 'Mon - Wed 4PM - 10PM',
    claimCode: 'PINS-STRIKE20',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-7',
    businessId: 'biz-7',
    businessName: 'Pallet Cafe Lavington',
    businessCategory: 'hospitality',
    title: 'Artisanal Single-Origin Pour-Over + Cinnamon Roll',
    description: 'Enjoy a rich double pour-over coffee paired with a freshly baked warm cinnamon brioche roll at 25% discount.',
    category: 'Food',
    discount: '25% OFF COMBO',
    posterUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop',
    validUntil: 'Daily 8:00 AM - 12:00 PM',
    claimCode: 'PALLET-BRUNCH',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-8',
    businessId: 'spot-6',
    businessName: 'Diamond Plaza Street Food Bazaar',
    businessCategory: 'hospitality',
    title: 'Late-Night Tandoori Chicken Tikka Feast',
    description: '15% discount on double charcoal-grilled chicken tikka platters with hot garlic naan and masala chips after 9 PM.',
    category: 'Food',
    discount: '15% OFF LATE',
    posterUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    validUntil: 'Daily 9:00 PM - 1:30 AM',
    claimCode: 'DP-TIKKA15',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-9',
    businessId: 'biz-9',
    businessName: 'Rainbow Ruiru Resort & Choma Terrace',
    businessCategory: 'hospitality',
    title: 'Friday Choma Platter & Cold Tusker Bucket for 4',
    description: 'Get 1.5kg prime tender mbuzi choma, ugali, kachumbari, and a bucket of 5 ice-cold Tuskers at a group deal price.',
    category: 'Food',
    discount: 'GROUP SPECIAL',
    posterUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop',
    validUntil: 'Every Friday from 4PM',
    claimCode: 'RUIRU-CHOMA4',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-10',
    businessId: 'biz-10',
    businessName: 'Ole Sereni Rooftop Waterhole',
    businessCategory: 'hospitality',
    title: 'Sunday Sunset Safari Cocktail Pitcher 30% OFF',
    description: 'Watch wildlife roaming Nairobi National Park from the rooftop while enjoying 30% off artisanal sangria & mojito pitchers.',
    category: 'Drinks',
    discount: '30% OFF PITCHERS',
    posterUrl: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=800&auto=format&fit=crop',
    validUntil: 'Sundays 4PM - 7:30PM',
    claimCode: 'OLE-SAFARI30',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-11',
    businessId: 'spot-13',
    businessName: 'Paint & Sip Nairobi Studio',
    businessCategory: 'hospitality',
    title: 'Weekend Canvas, Wine & Pottery Creative Duo',
    description: 'Book 1 Canvas & Wine session and get the 2nd pass 50% off! Includes canvas, acrylic paints, brushes and complimentary wine.',
    category: 'Special Deals',
    discount: 'BUY 1 GET 2ND 50%',
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
    validUntil: 'Saturday & Sunday Sessions',
    claimCode: 'PAINT-DUO50',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-12',
    businessId: 'spot-11',
    businessName: 'Karura Forest Canopy & Biking Trails',
    businessCategory: 'hospitality',
    title: 'Weekday Mountain Bike 2-For-1 Rental',
    description: 'Rent a front-suspension mountain bike for 2 hours and get the 2nd hour free with helmet and forest trail map included.',
    category: 'Special Deals',
    discount: '2-FOR-1 BIKING',
    posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop',
    validUntil: 'Tue - Fri 8AM - 3PM',
    claimCode: 'KARURA-BIKE241',
    createdAt: '2026-10-14'
  }
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

export const initialEvents: EventItem[] = [
  {
    id: 1,
    title: 'Blankets & Wine Nairobi: Sunburst Festival',
    category: 'concerts',
    genre: 'Afrobeats & Live Bands',
    date: 'Sun, 25 Oct 2026',
    time: '12:00 PM - 10:00 PM',
    location: 'Ngong Racecourse Waterfront, Nairobi',
    lat: -1.3120,
    lng: 36.7450,
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    goingCount: 1420,
    url: 'https://hustlesasa.com/blankets-wine',
    description: 'East Africa\'s premier quarterly outdoor lifestyle and live music festival. Live bands, artisan fashion village, gourmet food trucks, and sunset acoustic sessions.',
    businessId: 'biz-3',
    artists: [
      { name: 'Sauti Sol Reunion', role: 'Headliner Live', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' },
      { name: 'Blinky Bill', role: 'Live Electro-Funk Set', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Early Bird Regular', price: 'KES 3,500', perks: 'Festival pass + branded wine tumbler' },
      { name: 'VIP Garden Lounge', price: 'KES 8,000', perks: 'Reserved raised lounge, complimentary bottle of wine & fast-track entry' }
    ]
  },
  {
    id: 2,
    title: 'Amapiano & Chill Nairobi: All-White Rave',
    category: 'nightlife',
    genre: 'Amapiano',
    date: 'Sat, 24 Oct 2026',
    time: '04:00 PM - 04:00 AM',
    location: 'The Carnivore Grounds, Langata Rd, Nairobi',
    lat: -1.3265,
    lng: 36.8080,
    img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
    goingCount: 980,
    url: 'https://tikiti.co.ke/amapiano-carnivore',
    description: 'The heavyweight Amapiano showdown featuring log drums, massive bass rigs, international guest producers, and high-energy dance crews.',
    artists: [
      { name: 'Kabza De Small (Special Guest)', role: 'DJ Set', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop' },
      { name: 'DJ Grauchi', role: 'Main Stage Resident', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Squad Pack (5 People)', price: 'KES 7,500', perks: 'Admission for 5 guests' },
      { name: 'Gate Pass Regular', price: 'KES 2,000', perks: 'General admission' },
      { name: 'VIP Deck Pass', price: 'KES 5,000', perks: 'Elevated VIP view + welcome cocktail' }
    ]
  },
  {
    id: 3,
    title: 'The Alchemist Weekend Block Party',
    category: 'nightlife',
    genre: 'House & Techno',
    date: 'Fri, 23 Oct 2026',
    time: '08:00 PM - 04:00 AM',
    location: 'The Alchemist, Parklands Rd, Westlands',
    lat: -1.2642,
    lng: 36.8041,
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop',
    goingCount: 640,
    url: 'https://alchemist254.com/tickets',
    description: 'Underground electronic beats, food truck courtyard, vintage pop-up stalls, and dynamic visual projections under the Westlands night sky.',
    artists: [
      { name: 'SURA Collective', role: 'Live Synthesizer Duo', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Advance Pass', price: 'KES 1,000', perks: 'Fast-track wristband' },
      { name: 'Door Entry', price: 'KES 1,500', perks: 'All-night access' }
    ]
  },
  {
    id: 4,
    title: 'Nairobi Food & Wine Tasting Festival',
    category: 'concerts',
    genre: 'Food & Wine',
    date: 'Sat, 31 Oct 2026',
    time: '11:00 AM - 08:00 PM',
    location: 'The Waterfront Karen Gardens, Nairobi',
    lat: -1.3280,
    lng: 36.7125,
    img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    goingCount: 750,
    url: 'https://kenyabuzz.com/food-festival',
    description: 'Over 40 celebrity chefs, artisanal cheese tastings, curated South African and Italian wine pairings, and live jazz lakeside.',
    artists: [
      { name: 'Nairobi Horns Project', role: 'Live Brass & Jazz Band', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Tasting Pass', price: 'KES 2,500', perks: 'Includes 5 wine tasting tokens + etched glass' },
      { name: 'Masterclass VIP Pass', price: 'KES 6,000', perks: 'Includes 3 chef masterclasses + unlimited tastings' }
    ]
  },
  {
    id: 5,
    title: 'GoDown Arts & Urban Visuals Showcase',
    category: 'art',
    genre: 'Visual Arts & Culture',
    date: 'Sat, 17 Oct 2026',
    time: '02:00 PM - 09:00 PM',
    location: 'GoDown Arts Centre, Kilimani, Nairobi',
    lat: -1.2990,
    lng: 36.7820,
    img: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop',
    goingCount: 520,
    url: 'https://godown.org/showcase',
    description: 'Immersive exhibition showcasing 30+ contemporary Kenyan painters, digital NFT creators, street muralists, and spoken word poets.',
    artists: [
      { name: 'Michael Soi', role: 'Guest Exhibitor', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Community Art Pass', price: 'FREE', perks: 'Free admission for first 300 registered attendees' },
      { name: 'Patron Supporter Pass', price: 'KES 1,000', perks: 'Includes catalog and print signed by artists' }
    ]
  },
  {
    id: 6,
    title: 'Sunday Soul Sessions & Champagne Brunch',
    category: 'concerts',
    genre: 'Soul & RnB',
    date: 'Sun, 18 Oct 2026',
    time: '11:30 AM - 05:30 PM',
    location: 'Zen Garden, Lower Kabete, Nairobi',
    lat: -1.2465,
    lng: 36.7815,
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    goingCount: 410,
    url: 'https://hustlesasa.com/soul-brunch',
    description: 'Unwind amidst blooming bamboo gardens with bottomless mimosas, live neo-soul acoustic covers, and dim sum culinary stations.',
    artists: [
      { name: 'Xenia Manasseh', role: 'Live Acoustic Vocalist', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Brunch & Show Ticket', price: 'KES 4,500', perks: 'Full buffet + 2 glasses of champagne' },
      { name: 'Bottomless Bubbles Pass', price: 'KES 7,500', perks: 'Unlimited prosecco & mimosas until 4PM' }
    ]
  },
  {
    id: 7,
    title: 'Nairobi Streetwear & Sneaker Expo',
    category: 'art',
    genre: 'Fashion & Hip-Hop',
    date: 'Sat, 07 Nov 2026',
    time: '10:00 AM - 07:00 PM',
    location: 'Sarit Expo Centre, Westlands, Nairobi',
    lat: -1.2618,
    lng: 36.8042,
    img: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop',
    goingCount: 890,
    url: 'https://sneakerscon.ke',
    description: 'Kenya\'s biggest youth fashion convention. Trade rare Jordans, custom denim stalls, skate ramps, and live beat battles.',
    artists: [
      { name: 'Boutross', role: 'Live Hip-Hop Performance', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'General Entry', price: 'KES 1,000', perks: 'Access to all thrift and brand booths' },
      { name: 'Sneakerhead VIP Pass', price: 'KES 2,500', perks: '1-hour early entry for rare sneaker drops' }
    ]
  },
  {
    id: 8,
    title: 'Thrift Social Nairobi: 90s Neon Revival',
    category: 'concerts',
    genre: 'Afro-Fusion & Pop',
    date: 'Sun, 15 Nov 2026',
    time: '01:00 PM - 09:00 PM',
    location: 'Impala Grounds, Ngong Road, Nairobi',
    lat: -1.3045,
    lng: 36.7690,
    img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop',
    goingCount: 1100,
    url: 'https://thriftsocial.ke',
    description: 'Nairobi\'s coolest style celebration combining vintage market stalls with high-voltage music performances from top regional stars.',
    artists: [
      { name: 'Nviiri The Storyteller', role: 'Live Concert Set', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Early Bird Ticket', price: 'KES 2,000', perks: 'Entry + vintage neon tote bag' },
      { name: 'VIP Fashion Pod', price: 'KES 4,500', perks: 'Backstage access & lounge seating' }
    ]
  },
  {
    id: 9,
    title: 'Kiambu Evergreen Coffee Farm & Jazz Picnic',
    category: 'concerts',
    genre: 'Live Jazz & Acoustic',
    date: 'Sat, 21 Nov 2026',
    time: '12:00 PM - 07:00 PM',
    location: 'Fairview Coffee Estate, Kiambu Road',
    lat: -1.1980,
    lng: 36.8410,
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop',
    goingCount: 380,
    url: 'https://fairviewcoffee.com/jazz-picnic',
    description: 'Spend an afternoon amongst historical coffee trees. Fresh cold brews, gourmet picnic baskets, guided roastery tours, and acoustic jazz.',
    artists: [
      { name: 'Jacob Asiyo Trio', role: 'Live Jazz Quartet', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Picnic Lawn Pass', price: 'KES 2,000', perks: 'Entry + complimentary coffee tasting' },
      { name: 'Estate Hamper Ticket', price: 'KES 5,000', perks: 'Entry for two + fully stocked picnic basket' }
    ]
  },
  {
    id: 10,
    title: 'Midnight Underground Afro-House Experience',
    category: 'nightlife',
    genre: 'Afro-House',
    date: 'Fri, 30 Oct 2026',
    time: '10:00 PM - 06:00 AM',
    location: 'Secret Warehouse, Mombasa Road, Nairobi',
    lat: -1.3350,
    lng: 36.8720,
    img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
    goingCount: 460,
    url: 'https://tikiti.co.ke/midnight-warehouse',
    description: 'Deep hypnotic tribal house drums in an industrial warehouse setting with immersive laser light tunnels and zero commercial music.',
    artists: [
      { name: 'Shimza (South Africa)', role: 'Extended 3-Hour DJ Set', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Ravers Pass', price: 'KES 2,500', perks: 'All-night warehouse pass' },
      { name: 'VIP Booth Package', price: 'KES 15,000', perks: 'Table for 6 + 2 premium spirit bottles' }
    ]
  },
  {
    id: 11,
    title: 'Nairobi GameFest & Esports Arena Championship',
    category: 'tech',
    genre: 'Tech & Gaming',
    date: 'Sat, 24 Oct 2026',
    time: '10:00 AM - 08:00 PM',
    location: 'Sarit Expo Centre Hall B, Westlands',
    lat: -1.2618,
    lng: 36.8042,
    img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop',
    goingCount: 620,
    url: 'https://tikiti.co.ke/gamefest-nairobi',
    description: 'East Africa’s premier gaming showdown. 64-player EA Sports FC tournament, Tekken 8 arena, wireless VR gaming zones, and indie game dev showcase.',
    artists: [
      { name: 'BeastKE (Esports Caster)', role: 'Tournament Host', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Gamer Pass', price: 'KES 1,000', perks: 'Free play access across all stations' },
      { name: 'Tournament Competitor Pass', price: 'KES 2,000', perks: 'Bracket entry + tournament jersey' }
    ]
  },
  {
    id: 12,
    title: 'Nairobi City Midnight 10K & Fitness Rave',
    category: 'sports',
    genre: 'Sports & Fitness',
    date: 'Fri, 23 Oct 2026',
    time: '07:00 PM - 11:30 PM',
    location: 'Uhuru Park Recreational Grounds, Nairobi',
    lat: -1.2884,
    lng: 36.8189,
    img: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop',
    goingCount: 840,
    url: 'https://tikiti.co.ke/midnight-run',
    description: 'Neon-lit 10K night run through illuminated city avenues followed by an open-air aerobic dance party and cold-pressed hydration lounge.',
    artists: [
      { name: 'Coach Sammy & FitSquad', role: 'Aerobic Warmup Crew', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Runner Starter Kit', price: 'KES 1,500', perks: 'Bib number, LED armbands & timing chip' },
      { name: 'VIP Pace Pass', price: 'KES 3,000', perks: 'Includes tech running tee & VIP recovery massage' }
    ]
  }
];


export const initialStatuses: StatusPost[] = [];

export const discoveryProfiles: DatingProfile[] = [
  {
    id: 1,
    name: 'Jane Doe, 24',
    handle: '@jane_d',
    loc: 'Westlands',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop',
    bio: 'Art director & coffee enthusiast. Looking for someone who knows good playlists and hidden Nairobi restaurants.',
    relationshipStatus: 'single',
    vibes: ['Amapiano', 'Art Galleries', 'Brunch', 'Matcha']
  },
  {
    id: 2,
    name: 'Amina Mwangi, 22',
    handle: '@amina_m',
    loc: 'Kilimani',
    img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop',
    bio: 'Architecture student at UoN. Loves rooftop sunsets, live gigs and thrift market hunts.',
    relationshipStatus: 'single',
    vibes: ['Thrifting', 'Afrobeats', 'Rooftops', 'Photography']
  },
  {
    id: 3,
    name: 'Chloe Ouma, 25',
    handle: '@chloe_o',
    loc: 'Lavington',
    img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop',
    bio: 'UX designer & foodie. In a happy relationship, down for hangout groups and cinema runs with friends.',
    relationshipStatus: 'not_single',
    vibes: ['Cinema', 'Late Night Drives', 'House Music']
  }
];

export const initialConversations: ChatConversation[] = [];

export const initialTickets: VaultTicket[] = [
  {
    id: 't-1',
    title: 'Blankets & Wine Nairobi: Sunburst Festival',
    dateStr: '25 Oct 2026',
    locationStr: 'Ngong Racecourse Waterfront, Nairobi',
    type: 'Verified Ticket Pass'
  },
  {
    id: 't-2',
    title: 'Amapiano & Chill Nairobi: All-White Rave',
    dateStr: '14 Oct 2026',
    locationStr: 'The Carnivore Grounds, Langata Rd',
    type: 'Verified Ticket Pass'
  }
];

export const initialContacts: EmergencyContact[] = [
  {
    id: 'ec-1',
    name: 'Mom (Nairobi Residence)',
    phone: '+254 700 000 000'
  },
  {
    id: 'ec-2',
    name: 'Best Friend (Alex M.)',
    phone: '+254 722 999 888'
  }
];

export const initialFolders: CollectionFolder[] = [
  { id: 'folder-1', name: 'Birthday Move', emoji: '🎂', createdAt: '2026-10-14T10:00:00Z', description: 'Birthday celebrations and group dining' },
  { id: 'folder-2', name: 'Sunday Chill', emoji: '☕', createdAt: '2026-10-14T11:00:00Z', description: 'Relaxed cafe hangouts and nature trails' },
  { id: 'folder-3', name: 'Date Ideas', emoji: '✨', createdAt: '2026-10-14T12:00:00Z', description: 'Romantic dinners, sunsets and cozy spots' }
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
    applicantName: 'Wayne Waweru',
    applicantHandle: '@lowk3yFX',
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

