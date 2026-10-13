import { 
  BusinessAccount, 
  SpotItem, 
  EventItem, 
  ThriftItem, 
  CinemaMovie, 
  StatusPost, 
  DatingProfile, 
  ChatConversation, 
  VaultTicket, 
  EmergencyContact 
} from '../types.ts';

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
  },
  {
    id: 'biz-2',
    name: 'VibeCraft Events KE',
    category: 'event_organizer',
    email: 'bookings@vibecraft.co.ke',
    phone: '+254 733 987 654',
    whatsapp: '+254733987654',
    neighborhood: 'Kilimani',
    address: 'Adlife Plaza, Chania Ave, Kilimani',
    bio: 'Pioneering experiential nightlife, rooftop Halloween showdowns, and acoustic showcases in Nairobi.',
    logo: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@vibecraft_ke',
    createdDate: '2026-07-20',
  },
  {
    id: 'biz-3',
    name: 'Gikomba Stall 4B & 9C Vintage',
    category: 'thrift_store',
    email: 'gikombastall4b@gmail.com',
    phone: '+254 711 554 433',
    whatsapp: '+254711554433',
    neighborhood: 'CBD / Gikomba',
    address: 'Gikomba Market, Lane 3, Stall 4B & 9C, Nairobi',
    bio: 'Hand-picked rare 90s vintage graphic tees, heavy denim, varsity jackets, and streetwear gems.',
    logo: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop',
    verified: true,
    instagram: '@gikombastall4b',
    createdDate: '2026-09-01',
  }
];

export const initialSpots: SpotItem[] = [
  {
    id: 1,
    title: 'Ink & Drink',
    category: 'restaurants',
    neighborhood: 'Westlands',
    lat: -1.2675,
    lng: 36.8115,
    rating: '4.8',
    reviewCount: 142,
    price: 'KES $$$',
    address: 'Mpaka Road, Westlands, Nairobi',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop'
    ],
    description: 'Vibrant modern dining meets cocktail craft. Renowned for slow-cooked brisket, artisanal sliders, and signature passionfruit gin cocktails.',
    phone: '+254 722 123 456',
    openingHours: '12:00 PM - 02:00 AM',
    businessId: 'biz-1',
    menuImages: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop'
    ],
    menuItems: [
      { id: 'm1', name: 'Signature Dawa Cocktail', category: 'Cocktails', price: 'KES 950', description: 'Kenyan pure honey, muddled lime, premium vodka & crushed ice' },
      { id: 'm2', name: 'Slow-Smoked Brisket Sliders', category: 'Mains', price: 'KES 1,450', description: 'Trio of tender smoked beef brisket sliders with chimichurri aioli' },
      { id: 'm3', name: 'Truffle Parmesan Hand-Cut Fries', category: 'Sides', price: 'KES 650', description: 'Fresh local potatoes tossed in white truffle oil and Grana Padano' }
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Amina Mwangi',
        userHandle: '@amina_m',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop',
        rating: 5,
        date: '2 days ago',
        comment: 'Hands down the best cocktails on Mpaka Road! The passionfruit Dawa paired with brisket sliders is unmatched. Outdoor terrace vibe is 10/10.',
        images: [
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop'
        ]
      },
      {
        id: 'rev-2',
        userName: 'Brian Kiprop',
        userHandle: '@brian_k',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
        rating: 5,
        date: '1 week ago',
        comment: 'Great date spot in Westlands. The lighting is super intimate and the playlist is top tier Afro-fusion.',
        images: [
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'Urban Gourmet',
    category: 'restaurants',
    neighborhood: 'Kilimani',
    lat: -1.2921,
    lng: 36.7820,
    rating: '4.6',
    reviewCount: 98,
    price: 'KES $$',
    address: 'Adlife Plaza, Kilimani, Nairobi',
    img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop'
    ],
    description: 'Casual gourmet burgers, loaded wings, milkshakes and craft ciders. Cozy outdoor terrace with upbeat Afro-house tunes.',
    phone: '+254 700 892 101',
    openingHours: '11:00 AM - 11:00 PM',
    menuImages: [
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop'
    ],
    menuItems: [
      { id: 'm4', name: 'Nairobi Classic Beast Burger', category: 'Burgers', price: 'KES 1,200', description: 'Double beef patty, aged cheddar, caramelised onions & homemade sauce' },
      { id: 'm5', name: 'Spicy Peri-Peri Wings (8pcs)', category: 'Wings', price: 'KES 950', description: 'Crisp fried wings tossed in flame-roasted peri-peri glaze' }
    ],
    reviews: [
      {
        id: 'rev-3',
        userName: 'Sharon Wanjiku',
        userHandle: '@sharon_w',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
        rating: 4,
        date: '3 days ago',
        comment: 'Best smash burgers in Kilimani. Massive portions and quick service! Peri-peri wings had great heat.',
        images: [
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'The Alchemist',
    category: 'nightlife',
    neighborhood: 'Westlands',
    lat: -1.2635,
    lng: 36.8025,
    rating: '4.9',
    reviewCount: 310,
    price: 'KES $$$',
    address: 'Parklands Road, Westlands, Nairobi',
    img: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop'
    ],
    description: 'An open-air creative collective space featuring live DJs, street food trucks, art installations, cocktails, and night markets.',
    phone: '+254 719 888 777',
    openingHours: '04:00 PM - 04:00 AM',
    menuImages: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop'
    ],
    menuItems: [
      { id: 'm6', name: 'Smoked Paloma', category: 'Cocktails', price: 'KES 1,100', description: 'Mezcal, freshly pressed grapefruit juice, lime & salted rim' },
      { id: 'm7', name: 'Tusker Cider Bucket (5 bottles)', category: 'Beers', price: 'KES 2,000', description: 'Crisp ice cold Kenyan cider bucket' }
    ],
    reviews: [
      {
        id: 'rev-4',
        userName: 'Alex Moringa',
        userHandle: '@alex_moringa',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
        rating: 5,
        date: 'Yesterday',
        comment: 'Nairobi night energy at its finest! The music lineup never disappoints and you can move between the different food vans. Essential weekend stop.',
        images: [
          'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Artcaffé Market',
    category: 'cafes',
    neighborhood: 'Westlands',
    lat: -1.2642,
    lng: 36.8041,
    rating: '4.7',
    reviewCount: 185,
    price: 'KES $$',
    address: 'Westgate Mall, Westlands, Nairobi',
    img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop'
    ],
    description: 'Bustling European style cafe with freshly baked artisanal sourdough, freshly roasted Kenyan AA coffee, light salads and wine bar.',
    phone: '+254 709 202 020',
    openingHours: '07:00 AM - 11:00 PM',
    menuImages: [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop'
    ],
    menuItems: [
      { id: 'm8', name: 'Flat White Double Shot (Kenyan AA)', category: 'Coffee', price: 'KES 380', description: 'Smooth velvety microfoam over rich Mount Kenya espresso' },
      { id: 'm9', name: 'Avocado Tartine with Poached Eggs', category: 'Brunch', price: 'KES 850', description: 'Rustic sourdough, spiced hass avocado, farm eggs & micro greens' }
    ],
    reviews: [
      {
        id: 'rev-5',
        userName: 'Chloe Ouma',
        userHandle: '@chloe_o',
        userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop',
        rating: 5,
        date: '4 days ago',
        comment: 'My go-to spot for remote work in Westlands. Reliable wifi, excellent flat whites, and fresh almond croissants.',
        images: [
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop'
        ]
      }
    ]
  }
];

export const initialEvents: EventItem[] = [
  {
    id: 1,
    title: 'Halloween Fright Night',
    category: 'concerts',
    date: 'Sat, 31 Oct 2026',
    time: '08:00 PM - 04:00 AM',
    location: 'Village Market, Westlands, Nairobi',
    lat: -1.2295,
    lng: 36.8124,
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    goingCount: 342,
    url: 'https://hustlesasa.shop/',
    dressCode: 'Spooky Costume / Horror Glam (Prize for Best Dressed)',
    description: 'Nairobi\'s biggest annual Halloween masquerade rave. 2 stages, horror maze, themed cocktail potions, and 6 guest DJs.',
    businessId: 'biz-2',
    artists: [
      { name: 'Burna Boy', role: 'Headliner Live', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop' },
      { name: 'DJ Joe Mfalme', role: 'Resident DJ', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Early Bird Pass', price: 'KES 1,500', perks: 'Entry before 10 PM + 1 free drink' },
      { name: 'Gate Pass Regular', price: 'KES 2,000', perks: 'All-night access' },
      { name: 'VIP Pass Lounge', price: 'KES 4,500', perks: 'Elevated VIP deck + welcome cocktail' },
      { name: 'VVIP Table Package', price: 'KES 10,000', perks: 'Table for 5 + 1 premium bottle' }
    ]
  },
  {
    id: 2,
    title: 'Sensory Halloween Showcase',
    category: 'nightlife',
    date: 'Fri, 30 Oct 2026',
    time: '07:00 PM - 03:00 AM',
    location: 'Karel T-Lounge, Kilimani, Nairobi',
    lat: -1.2921,
    lng: 36.7820,
    img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
    goingCount: 189,
    url: 'https://www.ticketsasa.com/',
    dressCode: 'Chic Monochrome / Black & Gold',
    description: 'An immersive acoustic & electronic fusion night exploring soundscapes, 3D projections, and gourmet tapas pairings.',
    artists: [
      { name: 'Sauti Sol', role: 'Special Guest Performance', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Early Bird', price: 'KES 4,000', perks: 'Full event entry + cocktail' },
      { name: 'Gate Pass', price: 'KES 5,000', perks: 'Standard admission' },
      { name: 'VIP Lounge', price: 'KES 8,500', perks: 'Reserved lounge seating & tapas board' }
    ]
  },
  {
    id: 3,
    title: 'Nairobi Underground Art Showcase',
    category: 'art',
    date: 'Fri, 30 Oct 2026',
    time: '04:00 PM - 10:00 PM',
    location: 'Kilimani Warehouse, Nairobi',
    lat: -1.2930,
    lng: 36.7850,
    img: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop',
    goingCount: 512,
    url: 'https://hustlesasa.shop/',
    dressCode: 'Indie Casual / Y2K Expression',
    description: 'Exhibition of over 30 independent Nairobi illustrators, street painters, fashion designers, and beatmakers.',
    artists: [
      { name: 'Underground Collective', role: 'Live Performers', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop' }
    ],
    tiers: [
      { name: 'Early Bird Pass', price: 'FREE', perks: 'Complimentary pass for first 200 guests' },
      { name: 'VIP Art Patron', price: 'KES 1,000', perks: 'Includes commemorative art print & tote bag' }
    ]
  }
];

export const initialThriftItems: ThriftItem[] = [
  {
    id: 1,
    name: '90s Oversized Graphic Vintage Tee',
    price: 'KES 1,200',
    seller: 'Gikomba Stall 4B & 9C',
    storeLocation: 'Gikomba Market, Nairobi',
    stallNumber: 'Stall 4B',
    category: 'Tees & Tops',
    condition: 'Vintage Wash',
    size: 'XL (Oversized Fit)',
    img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop',
    verified: true,
    businessId: 'biz-3',
    whatsapp: '+254711554433'
  },
  {
    id: 2,
    name: 'Distressed Heavyweight Puffer Jacket',
    price: 'KES 3,400',
    seller: 'Toi Leather Vault',
    storeLocation: 'Toi Market, Adams Arcade, Nairobi',
    stallNumber: 'Stall 18A',
    category: 'Jackets & Coats',
    condition: 'Mint Condition',
    size: 'L',
    img: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254700998877'
  },
  {
    id: 3,
    name: 'Japanese Carpenter Baggy Denim',
    price: 'KES 2,500',
    seller: 'Gikomba Stall 4B & 9C',
    storeLocation: 'Gikomba Market, Nairobi',
    stallNumber: 'Stall 4B',
    category: 'Pants & Jeans',
    condition: 'Mint Condition',
    size: 'W32 L32',
    img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop',
    verified: true,
    businessId: 'biz-3',
    whatsapp: '+254711554433'
  },
  {
    id: 4,
    name: 'Genuine Leather Biker Jacket',
    price: 'KES 4,800',
    seller: 'Toi Leather Vault',
    storeLocation: 'Toi Market, Nairobi',
    stallNumber: 'Stall 18A',
    category: 'Jackets & Coats',
    condition: 'Aged Patina',
    size: 'M / L',
    img: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop',
    verified: true,
    whatsapp: '+254700998877'
  }
];

export const cinemaMovies: CinemaMovie[] = [
  {
    id: 101,
    title: 'Avengers: Endgame Encore',
    location: 'gardencity',
    locationName: 'Garden City IMAX',
    date: '2026-10-13',
    times: '12:00, 15:30, 18:30, 21:45',
    format: 'IMAX 3D / ATMOS',
    img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/garden-city'
  },
  {
    id: 102,
    title: 'Spider-Man: Brand New Day',
    location: 'sarit',
    locationName: 'Sarit Centre',
    date: '2026-10-13',
    times: '13:00, 16:15, 19:15, 22:00',
    format: '2D DOLBY ATMOS',
    img: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/sarit'
  },
  {
    id: 103,
    title: 'The Odyssey 2D',
    location: 'gardencity',
    locationName: 'Garden City IMAX',
    date: '2026-10-14',
    times: '14:30, 17:45, 21:00',
    format: 'IMAX 2D',
    img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/garden-city'
  },
  {
    id: 104,
    title: 'Dune: Part Three',
    location: 'junction',
    locationName: 'Junction Mall',
    date: '2026-10-15',
    times: '14:00, 17:15, 20:30',
    format: '2D ATMOS',
    img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop',
    url: 'https://centurycinemax.co.ke/movies/junction'
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
    loc: '2.5 km away in Westlands',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop',
    bio: 'Art director & coffee enthusiast. Looking for someone who knows good playlists and hidden Nairobi restaurants.',
    relationshipStatus: 'single',
    vibes: ['Amapiano', 'Art Galleries', 'Brunch', 'Matcha']
  },
  {
    id: 2,
    name: 'Amina Mwangi, 22',
    handle: '@amina_m',
    loc: '1.2 km away in Kilimani',
    img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop',
    bio: 'Architecture student at UoN. Loves rooftop sunsets, live gigs and thrift market hunts.',
    relationshipStatus: 'single',
    vibes: ['Thrifting', 'Afrobeats', 'Rooftops', 'Photography']
  },
  {
    id: 3,
    name: 'Chloe Ouma, 25',
    handle: '@chloe_o',
    loc: '3.0 km away in Lavington',
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
    lastMessage: 'Let\'s lock in that coffee date for Ink & Drink!',
    messages: [
      { id: 'm-1', sender: 'them', text: 'Hey Alex! Saw your profile on RADA. How\'s your week going?', time: '18:20' },
      { id: 'm-2', sender: 'me', text: 'Wagwan Jane! Going great, just checking out spots for the weekend.', time: '18:22' },
      { id: 'm-3', sender: 'them', text: 'Let\'s lock in that coffee date for Ink & Drink!', time: '18:25' }
    ]
  }
];

export const initialTickets: VaultTicket[] = [
  {
    id: 't-1',
    title: 'Halloween Fright Night',
    dateStr: '31 Oct 2026',
    locationStr: 'Village Market, Westlands',
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
