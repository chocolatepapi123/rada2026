/**
 * Sample data for the demo accounts. Shown only in Demo Mode (see demoMode.ts); never written to Supabase.
 * Every business, person, review and number here is fictional. All ids start with "demo-".
 * Faces come from /public/demo/avatars (only photos that exist there are used).
 */
import type { BusinessAccount, BusinessOffer, Review, StatusPost, OutingPlan, OutingAttendee } from '../types.ts';
import type { MyAnalytics } from './tracking';
import type { MilestoneData } from './milestones';

export type DemoPersona = 'merchant' | 'host' | 'user';

/** Accounts that open in Demo Mode automatically. Everyone else sees only real data. */
export const DEMO_ACCOUNTS: Record<string, DemoPersona> = {
  'waynrewaweru@gmail.com': 'merchant',
  'waynewaweruwaititu@gmail.com': 'host',
  'prodbywayne@gmail.com': 'user',
};

const face = (k: string) => `/demo/avatars/${k}.jpg`;
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&auto=format&fit=crop`;
const IMG = {
  rooftop: U('1517248135467-4c7edcad34c4'), cocktail: U('1551024709-8f23befc6f87'), restaurant: U('1555396273-367ea4eb4db5'),
  forest: U('1448375240586-882707db888b'), art: U('1579783900882-c0d3dad7b119'), cafe: U('1501339847302-ac426a4a7cbb'),
  gaming: U('1511512578047-dfb367046420'), crowd: U('1492684223066-81342ee5ff30'), concert: U('1514525253161-7a46d19cd819'),
  burger: U('1568901346375-23c9450c58cd'),
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const ymdAgo = (n: number) => daysAgo(n).slice(0, 10);

// People who have real photos on disk.
const CROWD = [
  { key: 'amani', id: 'demo-u-amani', name: 'Amani Juma', handle: '@amani_j' },
  { key: 'caro', id: 'demo-u-caro', name: 'Caroline Atieno', handle: '@caro_a' },
  { key: 'dennis', id: 'demo-u-dennis', name: 'Dennis Maina', handle: '@dennis_m' },
  { key: 'lulu', id: 'demo-u-lulu', name: 'Lulu Nyambura', handle: '@lulu_n' },
  { key: 'nina', id: 'demo-u-nina', name: 'Nina Wanjiku', handle: '@nina_w' },
  { key: 'vee', id: 'demo-u-vee', name: 'Valentine Chebet', handle: '@vee_ke' },
];

// ---------------------------------------------------------------- merchant
export function demoMerchantBusinesses(ownerId: string): BusinessAccount[] {
  const common = {
    ownerId, verified: true, verificationStatus: 'approved' as const, verifiedAt: daysAgo(40), verifiedBy: 'RADA',
    subscriptionStatus: 'active' as const, subscriptionPlan: 'Elite', subscriptionAmount: 0, subscriptionRenewsAt: daysAgo(-200),
    createdDate: ymdAgo(120),
  };
  return [
    { ...common, id: 'demo-biz-1', name: 'Skyline Rooftop Lounge', category: 'hospitality', email: 'hello@skyline.example', phone: '+254700000001', whatsapp: '+254700000001',
      neighborhood: 'Westlands', address: 'Westlands, Nairobi', bio: 'Cocktails, grills and golden-hour views above the city. Live DJs every Friday and Saturday.',
      logo: IMG.rooftop, coverImage: IMG.cocktail, instagram: 'skyline.ke', pinnedImages: [IMG.rooftop, IMG.cocktail, IMG.crowd] },
    { ...common, id: 'demo-biz-2', name: 'Mama Pima Kitchen', category: 'hospitality', email: 'orders@mamapima.example', phone: '+254700000002', whatsapp: '+254700000002',
      neighborhood: 'Kilimani', address: 'Kilimani, Nairobi', bio: 'Nyama choma, pilau and the best chips masala in town. Family friendly, always busy.',
      logo: IMG.burger, coverImage: IMG.restaurant, instagram: 'mamapima.ke', pinnedImages: [IMG.burger, IMG.restaurant] },
    { ...common, id: 'demo-biz-3', name: 'Pulse Nights Events', category: 'event_organizer', email: 'tickets@pulse.example', phone: '+254700000003', whatsapp: '+254700000003',
      neighborhood: 'Nairobi CBD', address: 'Nairobi', bio: 'Amapiano nights, rooftop parties and live band sessions across Nairobi.',
      logo: IMG.concert, coverImage: IMG.crowd, instagram: 'pulsenights.ke', pinnedImages: [IMG.concert, IMG.crowd] },
  ];
}

export function demoMerchantOffers(): BusinessOffer[] {
  const o = (n: number, b: string, bn: string, cat: BusinessOffer['businessCategory'], title: string, description: string, category: BusinessOffer['category'], discount: string, img: string, ends: number): BusinessOffer => ({
    id: `demo-offer-${n}`, businessId: b, businessName: bn, businessCategory: cat, title, description, category, discount, posterUrl: img,
    validUntil: ymdAgo(-ends), endsAt: ymdAgo(-ends), claimCode: `RADA${100 + n}`, createdAt: daysAgo(10 + n), maxRedemptions: 100,
    terms: 'One use per person. Show the code at the door.',
  });
  return [
    o(1, 'demo-biz-1', 'Skyline Rooftop Lounge', 'hospitality', 'Happy Hour: 2 for 1 cocktails', 'Every weekday from 5pm to 8pm.', 'Drinks', '2 for 1', IMG.cocktail, 20),
    o(2, 'demo-biz-1', 'Skyline Rooftop Lounge', 'hospitality', 'Sundowner Platter', 'Grill platter for four with a bottle of house wine.', 'Food', '20% off', IMG.rooftop, 30),
    o(3, 'demo-biz-2', 'Mama Pima Kitchen', 'hospitality', 'Lunch Combo', 'Nyama choma, ugali and kachumbari with a soda.', 'Food', 'KES 700', IMG.restaurant, 14),
    o(4, 'demo-biz-2', 'Mama Pima Kitchen', 'hospitality', 'Family Sunday Feast', 'Feeds five. Book ahead.', 'Special Deals', '15% off', IMG.burger, 45),
    o(5, 'demo-biz-3', 'Pulse Nights Events', 'event_organizer', 'Early Bird: Amapiano Rooftop', 'First 100 tickets only.', 'Tickets', 'KES 1,000', IMG.crowd, 12),
    o(6, 'demo-biz-3', 'Pulse Nights Events', 'event_organizer', 'Group of 5 Ticket Deal', 'Bring four friends, the fifth enters free.', 'Tickets', '1 free', IMG.concert, 25),
  ];
}

const REVIEW_TEXT = [
  [5, 'Best sunset view in Nairobi. The cocktails are dangerously good and the staff remember your name.'],
  [5, 'Came for my birthday and they sorted a cake and a table by the edge. Will be back.'],
  [4, 'Great vibe and music. Gets packed after 9pm, so book early.'],
  [5, 'The nyama choma is unreal. Juicy, well seasoned, fair prices.'],
  [4, 'Lovely food, slightly slow service on a busy Saturday but worth the wait.'],
  [5, 'Pulse nights never miss. Sound, lighting and crowd were perfect.'],
] as const;

export function demoMerchantReviews(): Review[] {
  return REVIEW_TEXT.map(([rating, comment], i) => {
    const p = CROWD[i % CROWD.length];
    return { id: `demo-rev-${i + 1}`, userName: p.name, userHandle: p.handle, userAvatar: face(p.key), rating, date: ymdAgo(2 + i * 4), comment };
  });
}

/** Shape of MerchantAnalyticsData in MerchantHubTab (kept loose to avoid a circular import). */
export function demoMerchantInsights() {
  const reviews = demoMerchantReviews();
  const totalImpressions = 18420;
  const share = (p: number) => Math.round(totalImpressions * p);
  const days: [string, string, number][] = [['Mon', 'Monday', 9], ['Tue', 'Tuesday', 11], ['Wed', 'Wednesday', 14], ['Thu', 'Thursday', 17], ['Fri', 'Friday', 29], ['Sat', 'Saturday', 27], ['Sun', 'Sunday', 13]];
  return {
    totalImpressions, totalBookmarks: 1286, averageRating: 4.7, totalReviews: 214, spotsCount: 3,
    topSpots: [
      { spotId: 'demo-biz-1', title: 'Skyline Rooftop Lounge', img: IMG.rooftop, category: 'Rooftops', neighborhood: 'Westlands', impressions: 9120, bookmarksCount: 642, averageRating: 4.8, reviewsCount: 121 },
      { spotId: 'demo-biz-2', title: 'Mama Pima Kitchen', img: IMG.restaurant, category: 'Nyama Choma & Grills', neighborhood: 'Kilimani', impressions: 6380, bookmarksCount: 431, averageRating: 4.6, reviewsCount: 64 },
      { spotId: 'demo-biz-3', title: 'Pulse Nights Events', img: IMG.concert, category: 'Clubs & Lounges', neighborhood: 'Nairobi CBD', impressions: 2920, bookmarksCount: 213, averageRating: 4.7, reviewsCount: 29 },
    ],
    recentReviews: reviews.slice(0, 5),
    peakDays: days.map(([day, label, pct]) => ({ day, label, percentage: pct, estimatedVisits: share(pct / 100), isPeak: pct === 29 })),
    isLoading: false, lastSyncedAt: new Date(),
  };
}

// ---------------------------------------------------------------- analytics (host and merchant hub charts)
export function demoMyAnalytics(days = 30): MyAnalytics {
  const daily = Array.from({ length: days }, (_, i) => {
    const d = days - 1 - i;
    const wave = 1 + 0.5 * Math.sin(i / 2.3) + (new Date(Date.now() - d * 86400000).getDay() >= 5 ? 0.6 : 0);
    return { day: ymdAgo(d), views: Math.round(70 * wave + (i * 3)), actions: Math.round(18 * wave + i) };
  });
  return {
    plan: 'elite', level: 'elite', days,
    totals: { view: 6840, save: 912, share: 301, rsvp: 436, call: 188, whatsapp: 254, website: 143, directions: 377, offer_view: 2210, offer_redeem: 164, promo_impression: 9100, promo_click: 540, search: 1180 },
    targets: [
      { target_type: 'outing', target_id: 'demo-past-1', counts: { view: 1480, save: 212, rsvp: 96 } },
      { target_type: 'outing', target_id: 'demo-past-2', counts: { view: 1210, save: 168, rsvp: 78 } },
      { target_type: 'outing', target_id: 'demo-past-3', counts: { view: 990, save: 140, rsvp: 61 } },
      { target_type: 'business', target_id: 'demo-biz-1', counts: { view: 2300, save: 320, call: 70 } },
    ],
    daily,
  };
}

// ---------------------------------------------------------------- outings
export function demoPastOutings(persona: DemoPersona, me: { id: string; name: string; handle: string; avatar: string }): OutingPlan[] {
  const att = (oid: string, i: number): OutingAttendee => {
    const p = CROWD[i % CROWD.length];
    return { id: `demo-att-${oid}-${p.key}`, outingId: oid, userId: p.id, userName: p.name, userAvatar: face(p.key), userHandle: p.handle, status: 'approved', isVerified: true, requestedAt: daysAgo(30) };
  };
  const meAtt = (oid: string): OutingAttendee => ({ id: `demo-att-${oid}-me`, outingId: oid, userId: me.id, userName: me.name, userAvatar: me.avatar, userHandle: me.handle, status: 'approved', isVerified: true, requestedAt: daysAgo(30) });
  const rows: [string, string, string, string, string, number, number][] = [
    ['demo-past-1', 'Sundowners at Ole Sereni Rooftop', 'Mombasa Road, Nairobi', IMG.rooftop, 'Rooftops', 12, 8],
    ['demo-past-2', 'Karura Forest Sunday Hike and Brunch', 'Karura Forest, Limuru Road', IMG.forest, 'Outdoors & Nature', 20, 10],
    ['demo-past-3', 'Paint and Sip Night', 'Kilimani, Nairobi', IMG.art, 'Arts & Culture', 27, 6],
    ['demo-past-4', 'Nairobi Night Market Food Crawl', 'Westlands, Nairobi', IMG.burger, 'Restaurants', 36, 12],
    ['demo-past-5', 'Bowling League Night', 'Westlands, Nairobi', IMG.gaming, 'Gaming & Arcades', 45, 8],
  ];
  return rows.map(([id, title, addr, img, cat, ago, max], idx) => {
    const attendees = [0, 1, 2, 3, 4, 5].slice(0, Math.min(max - 1, 6)).map(i => att(id, i + idx));
    const hosting = persona === 'host';
    const host = hosting
      ? { hostId: me.id, hostName: me.name, hostAvatar: me.avatar, hostHandle: me.handle, isHostVerified: true }
      : { hostId: CROWD[idx % CROWD.length].id, hostName: CROWD[idx % CROWD.length].name, hostAvatar: face(CROWD[idx % CROWD.length].key), hostHandle: CROWD[idx % CROWD.length].handle, isHostVerified: true };
    return {
      id, ...host, spotTitle: title, spotAddress: addr, spotImage: img, spotCategory: cat, date: ymdAgo(ago), time: '18:00',
      maxAttendees: max, currentAttendeesCount: attendees.length + 1, description: 'A great turnout and a great night.',
      accessType: 'open', tags: ['All Plans', 'Group Hangouts'], status: 'completed', createdAt: daysAgo(ago + 7),
      attendees: hosting ? attendees : [...attendees, meAtt(id)],
    } as OutingPlan;
  });
}

// ---------------------------------------------------------------- posts and milestones
export function demoPersonaStatuses(persona: DemoPersona, me: { id: string; name: string; handle: string; avatar: string }): StatusPost[] {
  const mk = (id: string, author: string, handle: string, avatar: string, text: string, media: string, loc: string, ago: string, userId?: string): StatusPost =>
    ({ id, userId, author, handle, avatar, timeAgo: ago, text, mediaUrl: media, mediaType: 'image', locationName: loc });
  const crowd: StatusPost[] = [
    mk('demo-st-1', CROWD[0].name, CROWD[0].handle, face('amani'), 'Karaoke night at Skyline. Yes, I sang Sauti Sol again.', IMG.rooftop, 'Skyline Rooftop Lounge', '1h ago', CROWD[0].id),
    mk('demo-st-2', CROWD[1].name, CROWD[1].handle, face('caro'), 'Live band and a full house. Nairobi, you are something else.', IMG.concert, 'Pulse Nights', '3h ago', CROWD[1].id),
    mk('demo-st-3', CROWD[4].name, CROWD[4].handle, face('nina'), 'Pottery in the morning, coffee in the afternoon.', IMG.cafe, 'Kilimani', '5h ago', CROWD[4].id),
    mk('demo-st-4', CROWD[5].name, CROWD[5].handle, face('vee'), 'Comedy night was a riot. Who is joining next week?', IMG.crowd, 'Westlands', '8h ago', CROWD[5].id),
  ];
  const mine = persona === 'user'
    ? mk('demo-st-me', me.name, me.handle, me.avatar, 'Dinner with the crew. Highly recommend the pilau.', IMG.restaurant, 'Mama Pima Kitchen', '30m ago', me.id)
    : persona === 'host'
      ? mk('demo-st-me', me.name, me.handle, me.avatar, 'Sunday hike is full again. Next one opens Friday.', IMG.forest, 'Karura Forest', '30m ago', me.id)
      : mk('demo-st-me', me.name, me.handle, me.avatar, 'New happy hour is live at Skyline. 2 for 1 until 8pm.', IMG.cocktail, 'Skyline Rooftop Lounge', '30m ago', me.id);
  return [mine, ...crowd];
}

export function demoMilestones(persona: DemoPersona): MilestoneData {
  const counts = persona === 'host' ? { outings: 26, spots: 31, photo_reviews: 9 } : persona === 'merchant' ? { outings: 8, spots: 44, photo_reviews: 21 } : { outings: 11, spots: 19, photo_reviews: 5 };
  const thresholds = [3, 10, 25, 50, 100];
  const level = (n: number) => thresholds.filter(t => n >= t).length;
  return { thresholds, counts, levels: { outings: level(counts.outings), spots: level(counts.spots), photo_reviews: level(counts.photo_reviews) } };
}
