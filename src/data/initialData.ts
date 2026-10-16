import { 
  BusinessAccount, 
  BusinessOffer,
  SpotItem, 
  EventItem, 
  ThriftItem, 
  CinemaMovie, 
  StatusPost, 
  DatingProfile, 
  ChatConversation, 
  VaultTicket, 
  EmergencyContact,
  CollectionFolder
} from '../types.ts';

// 10 Detailed Realistic Running Offers & Promotions spanning Tickets, Food, Drinks, and Apparel
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
    posterUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop',
    validUntil: 'Every Sunday all day',
    claimCode: 'RADA-BRISKET20',
    createdAt: '2026-10-11'
  },
  {
    id: 'off-3',
    businessId: 'biz-3',
    businessName: 'VibeCraft Events KE',
    businessCategory: 'event_organizer',
    title: 'Blankets & Wine VIP Early Bird Crew Pass',
    description: 'Group booking of 4+ tickets gets VIP fast-track entry plus complimentary welcome wine cocktail & reserved picnic pod.',
    category: 'Tickets',
    discount: '15% OFF VIP',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    validUntil: 'Valid until 24 Oct 2026',
    claimCode: 'CREWPACK26',
    actionUrl: 'https://hustlesasa.com/',
    createdAt: '2026-10-12'
  },
  {
    id: 'off-4',
    businessId: 'biz-4',
    businessName: 'Gikomba Stall 4B Vintage',
    businessCategory: 'thrift_store',
    title: 'Streetwear Bundle: Jeans + Graphic Tee + Free Cap',
    description: 'Buy any pair of Japanese carpenter denim and 90s vintage band tee, get an authentic vintage washed camp cap free!',
    category: 'Apparel',
    discount: 'BUNDLE & SAVE',
    posterUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop',
    validUntil: 'While stocks last this month',
    claimCode: 'LUKU-FREEHAT',
    createdAt: '2026-10-13'
  },
  {
    id: 'off-5',
    businessId: 'biz-5',
    businessName: 'The Talisman Restaurant',
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
    businessId: 'biz-6',
    businessName: 'Nairobi Raves Syndicate',
    businessCategory: 'event_organizer',
    title: 'Amapiano Rave Squad Pack: Buy 4 Get 1 Free',
    description: 'Lock in your party squad for the Carnivore Amapiano & Chill blowout. Includes free glowbands & fast-track gate entrance.',
    category: 'Tickets',
    discount: 'BUY 4 GET 1',
    posterUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
    validUntil: 'Valid until 23 Oct 2026',
    claimCode: 'PIANO-SQUAD',
    actionUrl: 'https://tikiti.co.ke/',
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
    businessId: 'biz-8',
    businessName: 'Toi Market Curated Drops',
    businessCategory: 'thrift_store',
    title: 'Vintage Leather & Puffer Jacket Flash Sale 25% OFF',
    description: '25% off all vintage oversized leather bombers and washed puffers this weekend at Adams Arcade.',
    category: 'Apparel',
    discount: '25% OFF JACKETS',
    posterUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&auto=format&fit=crop',
    validUntil: 'Fri - Sun Only',
    claimCode: 'TOI-LEATHER25',
    createdAt: '2026-10-14'
  },
  {
    id: 'off-9',
    businessId: 'biz-9',
    businessName: 'Rainbow Ruiru Resort',
    businessCategory: 'hospitality',
    title: 'Friday Choma Platter & Cold Tusker Bucket for 4',
    description: 'Get 1.5kg prime tender mbuzi choma, ugali, kachumbari, and a bucket of 5 ice-cold Tuskers at a group deal price.',
    category: 'Food',
    discount: 'GROUP SPECIAL',
    posterUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop',
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
    id: 'biz-4',
    name: 'Gikomba Stall 4B Vintage',
    category: 'thrift_store',
    email: 'gikombastall4b@gmail.com',
    phone: '+254 711 554 433',
    whatsapp: '+254711554433',
    neighborhood: 'Nairobi CBD',
    address: 'Gikomba Market, Lane 3, Stall 4B, Nairobi',
    bio: 'Hand-picked 90s vintage band tees, selvedge denim, chore coats, and streetwear grails.',
    logo: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@gikombastall4b',
    createdDate: '2026-09-01'
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
export const initialSpots: SpotItem[] = [
  {
    id: 1,
    title: 'Ink & Drink Bar & Lounge',
    category: 'nightlife',
    neighborhood: 'Westlands',
    exactLocationTag: 'Mpaka Road, Near The Sarit Roundabout',
    landmark: 'Opposite Bandari Plaza, Mpaka Rd',
    lat: -1.2635,
    lng: 36.8028,
    rating: '4.9',
    reviewCount: 94,
    price: '$$',
    address: 'Mpaka Road, Westlands, Nairobi',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop'
    ],
    description: 'Vibrant cocktail and music bar boasting signature Kenyan honey Dawas, craft beer tap takeovers, and weekend Afro-House DJ sets.',
    businessId: 'biz-1',
    phone: '+254 722 123 456',
    openingHours: '4:00 PM - 3:00 AM (Daily)',
    menuItems: [
      { id: 'm1', name: 'Signature Dawa Cocktail', category: 'Cocktails', price: 'KES 950', description: 'Kenyan pure honey, muddled lime, premium vodka & crushed ice' },
      { id: 'm2', name: 'Slow-Smoked Brisket Sliders', category: 'Mains', price: 'KES 1,450', description: 'Trio of tender smoked beef brisket sliders with chimichurri aioli' },
      { id: 'm3', name: 'Truffle Parmesan Hand-Cut Fries', category: 'Sides', price: 'KES 650', description: 'Fresh local potatoes tossed in white truffle oil and Grana Padano' }
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Wanjiku K.',
        userHandle: '@wanjiku_ke',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
        rating: 5,
        date: '10 Oct 2026',
        comment: 'Best Dawa cocktail in Westlands hands down! The music selection never misses.'
      }
    ]
  },
  {
    id: 2,
    title: 'Mama Rocks Gourmet Burgers',
    category: 'restaurants',
    neighborhood: 'Kilimani',
    exactLocationTag: 'Ring Road Kilimani, Near Adlife Plaza',
    landmark: 'Adlife Plaza Rooftop Garden',
    lat: -1.2915,
    lng: 36.7874,
    rating: '4.8',
    reviewCount: 112,
    price: '$$',
    address: 'Ring Road Kilimani, Nairobi',
    img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop'
    ],
    description: 'Home of iconic African fusion gourmet burgers, fiery suya spiced fries, and refreshing hibiscus lemonade in a relaxed rooftop terrace.',
    businessId: 'biz-2',
    phone: '+254 711 223 344',
    openingHours: '11:00 AM - 11:00 PM',
    menuItems: [
      { id: 'm4', name: 'Nairobi Classic Beast Burger', category: 'Burgers', price: 'KES 1,200', description: 'Double beef patty, aged cheddar, caramelised onions & homemade relish' },
      { id: 'm5', name: 'Spicy Peri-Peri Wings (8pcs)', category: 'Wings', price: 'KES 950', description: 'Crisp fried wings tossed in flame-roasted peri-peri glaze' }
    ]
  },
  {
    id: 3,
    title: 'The Talisman Restaurant & Gardens',
    category: 'date_spots',
    neighborhood: 'Karen',
    exactLocationTag: 'Ngong Road, 300m Past Karen Roundabout',
    landmark: 'Near Karen Country Club',
    lat: -1.3342,
    lng: 36.7118,
    rating: '4.9',
    reviewCount: 230,
    price: '$$$',
    address: '320 Ngong Road, Karen, Nairobi',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop'
    ],
    description: 'Iconic Karen garden dining destination with cosy fireplaces, candlelit courtyards, and famous feta coriander samosas.',
    businessId: 'biz-5',
    phone: '+254 705 999 888',
    openingHours: '8:00 AM - 11:00 PM',
    menuItems: [
      { id: 'm6', name: 'Feta & Coriander Samosas', category: 'Starters', price: 'KES 900', description: 'World-famous Talisman crispy samosas with homemade sweet chilli dip' },
      { id: 'm7', name: 'Zanzibar King Prawn Curry', category: 'Mains', price: 'KES 2,600', description: 'Succulent king prawns simmered in coconut lime Swahili gravy' }
    ]
  },
  {
    id: 4,
    title: 'CJ\'s Koinange Street',
    category: 'cafes',
    neighborhood: 'Nairobi CBD',
    exactLocationTag: 'Koinange Street, Corner of Moktar Daddah',
    landmark: 'Adjacent to Standard Chartered Building',
    lat: -1.2841,
    lng: 36.8198,
    rating: '4.7',
    reviewCount: 310,
    price: '$$',
    address: 'Koinange Street, Nairobi CBD',
    img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
    description: 'The heartbeat of Nairobi CBD dining. Lavish breakfast platters, specialty coffees, and over 300 gourmet menu options with lightning-fast service.',
    phone: '+254 792 000 111',
    openingHours: '7:00 AM - 10:30 PM',
    menuItems: [
      { id: 'm8', name: 'Loaded CJ\'s Big Breakfast', category: 'Breakfast', price: 'KES 1,250', description: 'Eggs your way, beef sausages, baked beans, sauteed potatoes and toast' },
      { id: 'm9', name: 'Double Caramel Macchiato', category: 'Coffee', price: 'KES 450', description: 'Steamed milk stained with espresso and buttery caramel drizzle' }
    ]
  },
  {
    id: 5,
    title: 'Pallet Cafe Lavington',
    category: 'cafes',
    neighborhood: 'Lavington',
    exactLocationTag: 'James Gichuru Road, Lavington Green',
    landmark: 'Next to Lavington Mall',
    lat: -1.2825,
    lng: 36.7681,
    rating: '4.9',
    reviewCount: 88,
    price: '$$',
    address: 'James Gichuru Rd, Lavington, Nairobi',
    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop',
    description: 'Serene inclusive garden cafe promoting sign language and employment for the deaf community. Superb brunch, specialty coffees, and quiet workspaces.',
    phone: '+254 741 888 777',
    openingHours: '7:30 AM - 7:00 PM',
    menuItems: [
      { id: 'm10', name: 'Avocado Tartine with Poached Eggs', category: 'Brunch', price: 'KES 850', description: 'Toasted sourdough with crushed hass avocado and organic farm eggs' },
      { id: 'm11', name: 'Matcha Honey Latte', category: 'Beverages', price: 'KES 500', description: 'Japanese ceremonial grade matcha blended with Kenyan wild honey' }
    ]
  },
  {
    id: 6,
    title: 'Diamond Plaza Street Food Bazaar',
    category: 'restaurants',
    neighborhood: 'Parklands',
    exactLocationTag: '4th Parklands Ave, Diamond Plaza I & II',
    landmark: 'Diamond Plaza Highrise Building',
    lat: -1.2612,
    lng: 36.8205,
    rating: '4.8',
    reviewCount: 420,
    price: '$',
    address: '4th Parklands Avenue, Parklands, Nairobi',
    img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    description: 'Nairobi\'s legendary late-night open-air Indian food courtyard. Freshly prepared tandoori chicken tikka, butter naan, masala chips, and sweet paan.',
    phone: '+254 720 333 444',
    openingHours: '12:00 PM - 2:00 AM',
    menuItems: [
      { id: 'm12', name: 'Chooza Chicken Tikka with Naan', category: 'Barbecue', price: 'KES 850', description: 'Charcoal-grilled spicy tender boneless chicken served with garlic butter naan' },
      { id: 'm13', name: 'Parklands Masala Chips', category: 'Sides', price: 'KES 350', description: 'Double-fried potato chips smothered in rich tangy chili-tomato gravy' }
    ]
  },
  {
    id: 7,
    title: 'Ole Sereni Rooftop Waterhole',
    category: 'hotels',
    neighborhood: 'Mombasa Rd',
    exactLocationTag: 'Mombasa Road, Overlooking Park Fence',
    landmark: 'Directly Opposite Nairobi National Park',
    lat: -1.3288,
    lng: 36.8532,
    rating: '4.8',
    reviewCount: 165,
    price: '$$$',
    address: 'Mombasa Road, Nairobi',
    img: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=800&auto=format&fit=crop',
    description: 'Breathtaking rooftop lounge where you can spot rhinos, giraffes, and gazelles roaming the savannah while sipping handcrafted sunset cocktails.',
    phone: '+254 732 105 000',
    openingHours: '10:00 AM - Midnight',
    menuItems: [
      { id: 'm14', name: 'Safari Sunburst Spritz', category: 'Cocktails', price: 'KES 1,100', description: 'Passion fruit puree, Aperol, prosecco and botanical gin' },
      { id: 'm15', name: 'Prime Aged Ribeye Steak (300g)', category: 'Steaks', price: 'KES 2,900', description: 'Grass-fed Kenyan beef served with peppercorn sauce and grilled asparagus' }
    ]
  },
  {
    id: 8,
    title: 'Rainbow Ruiru Resort & Choma Terrace',
    category: 'vacation',
    neighborhood: 'Ruiru',
    exactLocationTag: 'Thika Superhighway Exit 11, Ruiru',
    landmark: 'Next to Spur Mall Interchange',
    lat: -1.1462,
    lng: 36.9602,
    rating: '4.6',
    reviewCount: 140,
    price: '$$',
    address: 'Thika Superhighway, Ruiru, Kiambu',
    img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop',
    description: 'Sprawling weekend gateway with swimming pools, helipad terrace, live Kenyan bands, and renowned goat nyama choma.',
    phone: '+254 726 123 789',
    openingHours: 'Open 24/7',
    menuItems: [
      { id: 'm16', name: 'Prime Mbuzi Choma (1kg)', category: 'Choma', price: 'KES 1,800', description: 'Traditional wood-fired goat roast served with ugali and hot kachumbari' },
      { id: 'm17', name: 'Ice Cold Tusker Malt Bucket', category: 'Drinks', price: 'KES 1,750', description: 'Bucket of 5 chilled premium Kenyan malt lagers' }
    ]
  },
  {
    id: 9,
    title: 'Wadi Degla Club & Gardens',
    category: 'vacation',
    neighborhood: 'Kiambu Town',
    exactLocationTag: 'Kiambu Road, Near Kirigiti Stadium',
    landmark: 'Kirigiti Interchange, Kiambu',
    lat: -1.1714,
    lng: 36.8322,
    rating: '4.9',
    reviewCount: 95,
    price: '$$$',
    address: 'Kiambu Road, Kiambu Town',
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop',
    description: 'Premier sports and leisure resort nestled among Kiambu coffee estates with olympic pools, clay tennis courts, and lush picnic lawns.',
    phone: '+254 709 555 000',
    openingHours: '6:00 AM - 10:00 PM',
    menuItems: [
      { id: 'm18', name: 'Kiambu Estate Coffee Press', category: 'Beverages', price: 'KES 400', description: 'Freshly harvested SL28 single origin coffee from surrounding highlands' },
      { id: 'm19', name: 'Wood-Fired Quattro Formaggi Pizza', category: 'Pizzas', price: 'KES 1,500', description: 'Gorgonzola, mozzarella, parmesan, and creamy ricotta on sourdough crust' }
    ]
  },
  {
    id: 10,
    title: 'Cravers Grill Thika & Nightspot',
    category: 'nightlife',
    neighborhood: 'Thika',
    exactLocationTag: 'Garissa Road Exit, Thika Town',
    landmark: 'Behind Ananas Mall, Thika',
    lat: -1.0333,
    lng: 37.0693,
    rating: '4.7',
    reviewCount: 180,
    price: '$$',
    address: 'Garissa Road, Thika Town, Kiambu',
    img: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop',
    description: 'The ultimate Thika nightlife hub featuring multi-level VIP lounges, resident video DJs, choma pits, and vibrant weekend crowds.',
    phone: '+254 712 998 877',
    openingHours: '2:00 PM - 5:00 AM',
    menuItems: [
      { id: 'm20', name: 'Cravers Flame Pork Ribs (1kg)', category: 'Mains', price: 'KES 1,900', description: 'Slow-charred succulent pork ribs glazed in spicy honey mustard sauce' },
      { id: 'm21', name: 'Smirnoff Ice Black Bucket', category: 'Drinks', price: 'KES 1,800', description: 'Bucket of 5 chilled guarana infused beverages' }
    ]
  },
  {
    id: 11,
    title: 'Karura Forest Canopy & Biking Trails',
    category: 'activities',
    neighborhood: 'Gigiri',
    exactLocationTag: 'Limuru Road & Gate F Sigiria',
    landmark: 'Directly Opposite Belgian Embassy & UNEP',
    lat: -1.2422,
    lng: 36.8256,
    rating: '4.9',
    reviewCount: 540,
    price: '$',
    address: 'Limuru Road, Karura Forest Gate A, Nairobi',
    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop',
    description: 'Nairobi\'s crown green lung featuring 50km of scenic jogging and bike trails, historic Mau Mau caves, 15m waterfall, and River Cafe.',
    phone: '+254 728 501 333',
    openingHours: '6:00 AM - 6:00 PM',
    menuItems: [
      { id: 'act-1', name: 'Karura Forest Entry Pass (Citizen/Resident)', category: 'Passes', price: 'KES 100', description: 'Full-day access to running trails, waterfall paths, and picnic lawns' },
      { id: 'act-2', name: 'Mountain Bike Rental (2 Hours)', category: 'Activities', price: 'KES 500', description: 'Sturdy front-suspension mountain bike with helmet for forest trails' }
    ]
  },
  {
    id: 12,
    title: 'Nairobi Arboretum Nature Walk & Picnics',
    category: 'activities',
    neighborhood: 'Kilimani',
    exactLocationTag: 'State House Road & Arboretum Drive',
    landmark: '500m from State House Girls High School',
    lat: -1.2774,
    lng: 36.8078,
    rating: '4.7',
    reviewCount: 310,
    price: '$',
    address: 'State House Road, Kilimani, Nairobi',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop',
    description: '30 hectares of exotic botanical garden trails, birdwatching, shaded picnic glades, and quiet walking circuits in central Nairobi.',
    phone: '+254 722 000 111',
    openingHours: '6:00 AM - 6:30 PM',
    menuItems: [
      { id: 'act-3', name: 'Arboretum Day Pass', category: 'Passes', price: 'KES 65', description: 'Full day access to lush walking circuits and photography lawns' },
      { id: 'act-4', name: 'Group Picnic Lawn Reservation', category: 'Group', price: 'KES 1,500', description: 'Designated shaded grove setup for birthday picnics and family gatherings' }
    ]
  },
  {
    id: 13,
    title: 'Paint & Sip Nairobi Studio',
    category: 'activities',
    neighborhood: 'Westlands',
    exactLocationTag: 'Muthithi Road, The Promenade 2nd Floor',
    landmark: 'Near Mpaka Road Roundabout',
    lat: -1.2645,
    lng: 36.8062,
    rating: '4.9',
    reviewCount: 195,
    price: '$$',
    address: 'Muthithi Road, Westlands, Nairobi',
    img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
    description: 'Creative weekend social art experience! Professional step-by-step acrylic canvas painting accompanied by curated wines, sangria, and afro-house tracks.',
    phone: '+254 719 333 777',
    openingHours: '1:00 PM - 8:00 PM',
    menuItems: [
      { id: 'act-5', name: 'Canvas & Wine Sip Package', category: 'Experience', price: 'KES 2,500', description: 'Includes 40x50 canvas, paints, brushes, easel, and 2 complimentary wine glasses' },
      { id: 'act-6', name: 'Tapas & Sangria Pitcher (Serves 3)', category: 'Refreshments', price: 'KES 2,200', description: 'Chilled berry sangria paired with mini samosas and bruschetta' }
    ]
  },
  {
    id: 14,
    title: 'Nairobi VR & Simulator Gaming Arena',
    category: 'activities',
    neighborhood: 'Gigiri',
    exactLocationTag: 'Village Market New Wing 3rd Level',
    landmark: 'Adjacent to Under The Sea & Food Court',
    lat: -1.2295,
    lng: 36.8043,
    rating: '4.8',
    reviewCount: 220,
    price: '$$',
    address: 'Limuru Road, Village Market, Nairobi',
    img: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&auto=format&fit=crop',
    description: 'East Africa\'s premier virtual reality experience center featuring 6DOF motion simulators, multiplayer VR zombie defense, and Formula 1 motion rigs.',
    phone: '+254 740 555 123',
    openingHours: '10:00 AM - 10:00 PM',
    menuItems: [
      { id: 'act-7', name: 'VR Escape Room (45 Mins, 4 Players)', category: 'Gaming', price: 'KES 1,800/pp', description: 'Immersive wireless VR team cooperative mission with haptic feedback' },
      { id: 'act-8', name: 'F1 Motion Sim Session (20 Mins)', category: 'Simulators', price: 'KES 1,200', description: 'Full force-feedback steering rig with VR headset and realistic pedals' }
    ]
  },
  {
    id: 15,
    title: 'Oloolua Nature Trail & Waterfall Caves',
    category: 'activities',
    neighborhood: 'Karen',
    exactLocationTag: 'Oloolua Ridge, Near Institute of Primate Research',
    landmark: 'Opposite Karen Blixen Coffee Garden',
    lat: -1.3571,
    lng: 36.7118,
    rating: '4.8',
    reviewCount: 280,
    price: '$',
    address: 'Oloolua Ridge, Karen, Nairobi',
    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop',
    description: 'Enchanting 5km tranquil hiking circuit through indigenous forest, bamboo tunnels, wooden suspension footbridges, and 33-foot Mbagathi river waterfall.',
    phone: '+254 721 889 000',
    openingHours: '9:00 AM - 6:00 PM',
    menuItems: [
      { id: 'act-9', name: 'Oloolua Trail Day Ticket', category: 'Passes', price: 'KES 200', description: 'Full access to bamboo forest, waterfall, cave trails, and papyrus swamp' }
    ]
  },
  {
    id: 16,
    title: 'Paintball Fury & Archery Tactical Arena',
    category: 'activities',
    neighborhood: 'Karen',
    exactLocationTag: 'Langata South Road, Near Waterfront Mall',
    landmark: 'Behind Waterfront Karen Shopping Center',
    lat: -1.3282,
    lng: 36.7214,
    rating: '4.7',
    reviewCount: 165,
    price: '$$',
    address: 'Langata South Road, Karen, Nairobi',
    img: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&auto=format&fit=crop',
    description: 'High-energy tactical paintballing field with bunkers, obstacles, and tournament layouts. Includes speedball courts and recurve archery ranges for squads.',
    phone: '+254 722 456 789',
    openingHours: '9:00 AM - 7:00 PM',
    menuItems: [
      { id: 'act-10', name: 'Tactical Paintball Battle (100 Balls + Gear)', category: 'Gaming', price: 'KES 1,500', description: 'Protective camo overalls, anti-fog mask, semi-auto marker, and gas refills' },
      { id: 'act-11', name: 'Combat Archery Tag Session (45 Mins)', category: 'Gaming', price: 'KES 1,200', description: 'Foam-tipped arrows and recurve bow for team elimination matches' }
    ]
  }
];

// 10 Detailed Realistic Nairobi & Kiambu Events spanning Concerts, Nightlife Raves, Art Shows, Food Festivals, and Pop-ups
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
  }
];

// 10 Detailed Realistic Thrift / Luku Items spanning Streetwear, Vintage Denim, Jackets, Accessories, and Sneakers
export const initialThriftItems: ThriftItem[] = [
  {
    id: 1,
    name: '90s Carhartt Heavyweight Washed Canvas Jacket',
    price: 'KES 3,200',
    seller: 'Gikomba Stall 4B Vintage',
    storeLocation: 'Gikomba Market, Lane 3',
    stallNumber: 'Stall 4B',
    category: 'Jackets & Coats',
    condition: 'Mint Condition',
    size: 'L',
    img: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop'
    ],
    verified: true,
    businessId: 'biz-4',
    whatsapp: '+254711554433'
  },
  {
    id: 2,
    name: 'Vintage 1996 Nirvana "In Utero" Promo Graphic Tee',
    price: 'KES 1,800',
    seller: 'Nairobi Archive Thrifters',
    storeLocation: 'Nairobi CBD, Tom Mboya St',
    stallNumber: 'Stall 12C',
    category: 'Tees & Tops',
    condition: 'Grade A Vintage',
    size: 'XL (Oversized Fit)',
    img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254722887766'
  },
  {
    id: 3,
    name: 'Japanese Selvedge Relaxed Fit Denim Jeans',
    price: 'KES 2,600',
    seller: 'Kaps Streetwear Vault',
    storeLocation: 'Westlands, Mpaka Arcade',
    stallNumber: 'Shop 08',
    category: 'Pants & Jeans',
    condition: 'Mint Condition',
    size: 'W32 L32',
    img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254799332211'
  },
  {
    id: 4,
    name: 'Nike Air Jordan 1 Retro High \'Chicago\' Vintage',
    price: 'KES 4,500',
    seller: 'Sneaker Plug Nairobi',
    storeLocation: 'Kilimani, Chania Ave',
    stallNumber: 'Suite 2A',
    category: 'Footwear',
    condition: 'Grade A',
    size: '43 EU (US 9.5)',
    img: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254712445566'
  },
  {
    id: 5,
    name: 'Harley Davidson Washed Biker Eagle T-Shirt',
    price: 'KES 1,600',
    seller: 'Gikomba Stall 4B Vintage',
    storeLocation: 'Gikomba Market, Lane 3',
    stallNumber: 'Stall 4B',
    category: 'Tees & Tops',
    condition: 'Grade A Vintage',
    size: 'L',
    img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop',
    verified: true,
    businessId: 'biz-4',
    whatsapp: '+254711554433'
  },
  {
    id: 6,
    name: '90s Retro Leather Oversized Bomber Jacket',
    price: 'KES 4,200',
    seller: 'Toi Market Curated Drops',
    storeLocation: 'Toi Market, Adams Arcade',
    stallNumber: 'Stall 18A',
    category: 'Jackets & Coats',
    condition: 'Mint Condition',
    size: 'XL',
    img: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254700998877'
  },
  {
    id: 7,
    name: 'Vintage Dickies 874 Double-Knee Workwear Chinos',
    price: 'KES 2,200',
    seller: 'Muthurwa Retro Stalls',
    storeLocation: 'Muthurwa Market, CBD',
    stallNumber: 'Stall 71B',
    category: 'Pants & Jeans',
    condition: 'Like New',
    size: 'W34 L32',
    img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254733112299'
  },
  {
    id: 8,
    name: 'New Balance 550 Retro White & Forest Green',
    price: 'KES 3,800',
    seller: 'Sneaker Plug Nairobi',
    storeLocation: 'Kilimani, Chania Ave',
    stallNumber: 'Suite 2A',
    category: 'Footwear',
    condition: 'Grade A',
    size: '42 EU (US 8.5)',
    img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254712445566'
  },
  {
    id: 9,
    name: 'Supreme 5-Panel Washed Canvas Camp Cap',
    price: 'KES 1,400',
    seller: 'Kaps Streetwear Vault',
    storeLocation: 'Westlands, Mpaka Arcade',
    stallNumber: 'Shop 08',
    category: 'Accessories',
    condition: 'Mint Condition',
    size: 'Adjustable',
    img: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254799332211'
  },
  {
    id: 10,
    name: 'Vintage Hand-Knitted Chunky Coogi-Style Cardigan',
    price: 'KES 2,900',
    seller: 'Nairobi Archive Thrifters',
    storeLocation: 'Nairobi CBD, Tom Mboya St',
    stallNumber: 'Stall 12C',
    category: 'Jackets & Coats',
    condition: 'Grade A Vintage',
    size: 'M / L',
    img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254722887766'
  }
];

export const cinemaMovies: CinemaMovie[] = [
  {
    id: 101,
    title: 'Dune: Part Two',
    genre: 'Sci-Fi / Adventure',
    location: 'gardencity',
    locationName: 'Garden City IMAX',
    date: '2026-10-14',
    times: '12:00, 15:30, 18:30, 21:45',
    format: 'IMAX 3D / ATMOS',
    img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/garden-city'
  },
  {
    id: 102,
    title: 'Gladiator II',
    genre: 'Action / Epic',
    location: 'sarit',
    locationName: 'Sarit Centre',
    date: '2026-10-14',
    times: '13:00, 16:15, 19:15, 22:00',
    format: '2D DOLBY ATMOS',
    img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/sarit'
  },
  {
    id: 103,
    title: 'Deadpool & Wolverine',
    genre: 'Action / Comedy',
    location: 'tworivers',
    locationName: 'Two Rivers Mall',
    date: '2026-10-14',
    times: '14:30, 17:45, 21:00',
    format: 'IMAX 2D',
    img: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/two-rivers'
  },
  {
    id: 104,
    title: 'Wicked',
    genre: 'Fantasy / Musical',
    location: 'junction',
    locationName: 'Junction Mall',
    date: '2026-10-14',
    times: '14:00, 17:15, 20:30',
    format: '2D ATMOS',
    img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/junction'
  },
  {
    id: 105,
    title: 'Inside Out 2',
    genre: 'Animation / Family',
    location: 'sarit',
    locationName: 'Sarit Centre',
    date: '2026-10-14',
    times: '11:30, 14:00, 16:45',
    format: '2D DOLBY',
    img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/sarit'
  }
];

export const initialStatuses: StatusPost[] = [
  {
    id: 's-1',
    author: 'Alex Moringa',
    handle: '@alex_moringa',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
    timeAgo: '3 mins ago',
    text: 'Landed at The Alchemist for Amapiano night! Vibe is already 10/10 🔥 Catch me by the back food truck.',
    locationName: 'Westlands, Nairobi',
    replies: [
      {
        id: 'rep-1',
        author: 'Jane Doe',
        handle: '@jane_d',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        timeAgo: '1 min ago',
        text: 'Save us a table near the stage! We are on our way.'
      }
    ]
  },
  {
    id: 's-2',
    author: 'Sharon Wanjiku',
    handle: '@sharon_w',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
    timeAgo: '28 mins ago',
    text: 'Cocktails at Ink & Drink are elite 🍹 Who is around Westlands for dinner?',
    locationName: 'Kilimani, Nairobi',
    replies: [
      {
        id: 'rep-2',
        author: 'Brian Kiprop',
        handle: '@brian_k',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
        timeAgo: '15 mins ago',
        text: 'Order the brisket sliders, you will not regret it!'
      }
    ]
  }
];

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

export const initialConversations: ChatConversation[] = [
  {
    id: 'c-1',
    name: 'Jane Doe',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    type: 'direct',
    theme: 'terracotta',
    lastMessage: 'Let\'s lock in that coffee date for Ink & Drink!',
    messages: [
      { id: 'm-1', sender: 'them', text: 'Hey Alex! Saw your profile on RADA. How\'s your week going?', time: '18:20' },
      { id: 'm-2', sender: 'me', text: 'Wagwan Jane! Going great, just checking out spots for the weekend.', time: '18:22' },
      { 
        id: 'm-voice', 
        sender: 'them', 
        text: 'Voice note (0:14)', 
        audioUrl: 'mock-audio',
        audioDuration: 14,
        time: '18:24' 
      },
      { 
        id: 'm-3', 
        sender: 'them', 
        text: 'Let\'s lock in that coffee date for Ink & Drink!', 
        time: '18:25',
        replyTo: { id: 'm-2', sender: 'Alex', text: 'Wagwan Jane! Going great, just checking out spots for the weekend.' }
      }
    ]
  }
];

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
