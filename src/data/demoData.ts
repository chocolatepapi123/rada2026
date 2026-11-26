/**
 * Mock Socials data for Demo Mode (see src/lib/demoMode.ts). Used only when the app is opened with ?demo=1.
 * All ids start with "demo-". Dates are generated relative to today, so everything is always upcoming.
 * Every person and event here is fictional.
 */
import type { ChatConversation, ChatMessage, OutingAttendee, OutingPlan } from '../types.ts';
import type { CloudProfileHit, CloudRequest } from '../lib/socialsCloud.ts';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string for a Nairobi wall-clock time, `daysAhead` days from today. */
function nairobiISO(daysAhead: number, hour: number, minute = 0): string {
  const t = new Date(Date.now() + 3 * 3600000 + daysAhead * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(hour)}:${pad(minute)}:00+03:00`;
}
const ymd = (daysAhead: number) => nairobiISO(daysAhead, 0).slice(0, 10);
const hm = (hour: number, minute = 0) => `${pad(hour)}:${pad(minute)}`;
const agoIso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&auto=format&fit=crop`;
const IMG = {
  rooftop: U('1517248135467-4c7edcad34c4'),
  cocktail: U('1551024709-8f23befc6f87'),
  restaurant: U('1555396273-367ea4eb4db5'),
  forest: U('1448375240586-882707db888b'),
  art: U('1579783900882-c0d3dad7b119'),
  cafe: U('1501339847302-ac426a4a7cbb'),
  gaming: U('1511512578047-dfb367046420'),
  crowd: U('1492684223066-81342ee5ff30'),
  concert: U('1514525253161-7a46d19cd819'),
  burger: U('1568901346375-23c9450c58cd'),
};

// Demo people get initial-letter avatars (no photo files needed).
const AV_COLORS = ['#FD550A', '#005C47', '#111111', '#E0533C', '#2D6A4F'];
/** Initial-letter avatar drawn as an image, so no photo files are needed. */
export const initialAvatar = (key: string): string => {
  const c = AV_COLORS[key.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c}"/><text x="50" y="67" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="700" fill="#fff">${key.charAt(0).toUpperCase()}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const avatarFor = (key: string) => initialAvatar(key);
const DEFAULT_ME_AVATAR = '';

// ---------------------------------------------------------------------------
// people
// ---------------------------------------------------------------------------
export interface DemoPerson {
  id: string;
  key: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
}

const P = (key: string, username: string, name: string, _avatar: string, bio: string): DemoPerson => ({
  id: `demo-u-${key}`,
  key,
  username,
  name,
  avatar: avatarFor(key),
  bio,
});

export const DEMO_PEOPLE: DemoPerson[] = [
  P('wanjiru', 'wanjiru_k', 'Wanjiru Kamau', '', 'Rooftop sundowners, nyama choma Sundays and anything with live music 🎶'),
  P('brian', 'brian_otieno', 'Brian Otieno', '', 'Karura trails by morning, Kilimani brunch by noon 🌲☕'),
  P('achieng', 'achieng_a', 'Achieng Akinyi', '', 'Art, coffee and spontaneous road trips. Always down for a gallery night 🎨'),
  P('kevo', 'kevo254', 'Kevin Mutua', '', 'Gaming, bowling and late-night mutura. Challenge me 🎮'),
  P('zawadi', 'zawadi_m', 'Zawadi Mwangi', '', 'Brunch snob. Sunday market regular. Always hunting the best croissants in Nairobi ✨'),
  P('ian', 'ian_mwangi', 'Ian Mwangi', '', 'Foodie first, everything else second. Will travel for good chips masala 🍟'),
  P('njeri', 'njeri_wa', 'Njeri Wairimu', '', 'Dancer. Amapiano on repeat. Ask me about my playlist 💃'),
  P('mwende', 'mwende_k', 'Mwende Kioko', '', 'Weekend explorer. Cafes, bookshops and sunsets 🌅'),
  P('tito', 'tito_ke', 'Tito Odhiambo', '', 'Football, nyama choma and terrible puns ⚽'),
  P('farida', 'farida_h', 'Farida Hassan', '', 'Paint and sip regular. Beach person stuck in Nairobi 🎨🍷'),
  P('otis', 'otis_ke', 'Otieno Ouma', '', 'DJ on weekends, accountant on weekdays 🎧'),
  P('shiko', 'shiko_n', 'Shiko Njoroge', '', 'Hiking, photography and strong coffee 📸'),
  P('dan', 'dan_kamau', 'Daniel Kamau', '', 'Trail runner. Karura is my office 🏃🏾'),
  P('nina', 'nina_w', 'Nina Wanjiku', '', 'Pottery on Saturdays, Java on Sundays. Always down to explore new spots ☕'),
  P('dennis', 'dennis_m', 'Dennis Maina', '', 'Sports bar regular and part-time chef. I make a mean pilau 🍛'),
  P('caro', 'caro_a', 'Caroline Atieno', '', 'Live music, rooftops and long drives to Naivasha 🚗'),
  P('jabali', 'jabali_k', 'Jabali Kariuki', '', 'Photographer. Golden hour chaser. Will take your portrait for free 📷'),
  P('lulu', 'lulu_n', 'Lulu Nyambura', '', 'Foodie, bookworm and board game champion 🎲'),
  P('sam', 'sam_oduor', 'Samuel Oduor', '', 'Climbing Ngong Hills every other weekend. Come keep up ⛰️'),
  P('amani', 'amani_j', 'Amani Juma', '', 'Karaoke queen. Yes, I will sing Sauti Sol 🎤'),
  P('vee', 'vee_ke', 'Valentine Chebet', '', 'Cocktails, comedy nights and spontaneous plans 🍸'),
];

/** The user's own Rada Discover posts in Demo Mode (used by demoAsks.ts and by the accepted-reply chats below). */
export const DEMO_MY_ASK_BODY = 'Hii pekee yangu itanimaliza, nani ako free😂';
export const DEMO_MY_ASK_ACCEPTED_REPLY = 'Niko free bro 😂 Nakuja na chaser na nyama. Ni wapi?';
export const DEMO_MY_ASK_2_BODY = 'Anyone down for Sunday brunch & board games in Kilimani?';
export const DEMO_MY_ASK_2_ACCEPTED_REPLY = 'Count me in! I bring Catan & Monopoly Deal, which spot? 🎲';
export const DEMO_MY_ASK_3_BODY = 'Heading to Karura Gate A for coffee + trail walk, 2 spots open ☕🌲';
export const DEMO_MY_ASK_3_ACCEPTED_REPLY = 'Niko Karura side already! Meet at Rivers Cafe in 20?';

const byKey = (key: string): DemoPerson => DEMO_PEOPLE.find(p => p.key === key) as DemoPerson;
export const getDemoPerson = (id: string): DemoPerson | undefined => DEMO_PEOPLE.find(p => p.id === id);
const handleOf = (p: DemoPerson) => `@${p.username}`;

/** Shape returned by search_profiles; powers Search. */
export const DEMO_PROFILE_HITS: CloudProfileHit[] = DEMO_PEOPLE.map(p => ({
  id: p.id,
  username: p.username,
  avatar_url: p.avatar,
  bio: p.bio,
}));

export function buildDemoRequests(_myId: string, _myHandle: string, _myAvatar: string = DEFAULT_ME_AVATAR): CloudRequest[] {
  return [];
}

// ---------------------------------------------------------------------------
// chats
// ---------------------------------------------------------------------------
interface Draft {
  who: 'me' | 'them' | 'system';
  text: string;
  ago: number; // minutes ago
  by?: string; // sender @handle in group chats
  extra?: Partial<ChatMessage>;
}

function makeConv(
  base: Omit<ChatConversation, 'messages' | 'lastMessage'>,
  drafts: Draft[],
  otherUserId?: string
): ChatConversation {
  const ordered = [...drafts].sort((a, b) => b.ago - a.ago); // oldest first
  const messages: ChatMessage[] = ordered.map((d, i) => {
    const at = agoIso(d.ago);
    const m: ChatMessage = { id: `${base.id}-m${i}`, sender: d.who, text: d.text, time: clock(at), createdAt: at, ...(d.extra || {}) };
    if (d.by) (m as any).senderHandle = d.by;
    return m;
  });
  const last = ordered[ordered.length - 1];
  const conv: ChatConversation = { ...base, messages, lastMessage: last ? last.text : '' };
  (conv as any).lastMessageAt = agoIso(last ? last.ago : 0);
  if (otherUserId) (conv as any).otherUserId = otherUserId;
  return conv;
}

export function buildDemoConversations(myId: string, myHandle: string): ChatConversation[] {
  const me = myHandle.startsWith('@') ? myHandle : `@${myHandle || 'you'}`;
  const mwende = byKey('mwende');
  const tito = byKey('tito');
  const farida = byKey('farida');
  const wanjiru = byKey('wanjiru');
  const njeri = byKey('njeri');
  const brian = byKey('brian');
  const lulu = byKey('lulu');
  const amani = byKey('amani');
  const otis = byKey('otis');
  const shiko = byKey('shiko');
  const dan = byKey('dan');

  const hostingMine = makeConv(
    {
      id: 'grp-outing-demo-out-1',
      name: 'Ole Sereni Sundowners 🌇',
      avatar: IMG.rooftop,
      type: 'group',
      theme: 'sunset',
      members: [me, handleOf(mwende), handleOf(tito), handleOf(otis), handleOf(shiko)],
      outingId: 'demo-out-1',
      outingTitle: 'Sundowners at Ole Sereni Rooftop',
      isTemporary: true,
    },
    [
      { who: 'system', text: 'Hosting chat unlocked for "Sundowners at Ole Sereni Rooftop". Everyone you approved is in here.', ago: 300 },
      { who: 'me', text: 'Welcome everyone! 🎉 We meet at the rooftop entrance at 5:30pm. Golden hour starts at 6!', ago: 290 },
      { who: 'them', by: handleOf(mwende), text: 'So excited!! Is there a dress code?', ago: 280 },
      { who: 'me', text: 'Smart casual, and bring a light jacket. It gets breezy up there 🌬️', ago: 275 },
      { who: 'them', by: handleOf(tito), text: 'I can pick up two people from Westlands if anyone needs a ride 🚗', ago: 120 },
      { who: 'them', by: handleOf(otis), text: 'Bringing a small speaker for the sunset playlist 🎧', ago: 45 },
      { who: 'them', by: handleOf(shiko), text: 'Count me in for photos 📸 Golden hour is going to be unreal', ago: 5 },
    ]
  );

  const hostingJoined = makeConv(
    {
      id: 'grp-outing-demo-out-3',
      name: 'Paint & Sip Night 🎨',
      avatar: IMG.art,
      type: 'group',
      theme: 'emerald',
      members: [me, handleOf(farida), handleOf(mwende), handleOf(dan)],
      outingId: 'demo-out-3',
      outingTitle: 'Paint & Sip Night',
      isTemporary: true,
    },
    [
      { who: 'system', text: 'Hosting chat unlocked for "Paint & Sip Night". Say hi to your group!', ago: 700 },
      { who: 'them', by: handleOf(farida), text: 'Hey lovelies! I booked the long table by the window 🪟', ago: 690 },
      { who: 'me', text: 'Amazing, thank you for hosting! Do we need to bring anything?', ago: 600 },
      { who: 'them', by: handleOf(farida), text: 'Just yourselves. Canvas, paint and the first glass of wine are covered 🍷', ago: 580 },
      { who: 'them', by: handleOf(dan), text: 'Warning: I cannot draw a straight line 😂', ago: 190 },
    ]
  );

  const nyama = makeConv(
    {
      id: 'demo-grp-nyama',
      name: 'Sunday Nyama Choma Crew 🍖',
      avatar: IMG.restaurant,
      type: 'group',
      members: [me, handleOf(mwende), handleOf(tito), handleOf(otis), handleOf(shiko)],
    },
    [
      { who: 'them', by: handleOf(tito), text: 'Who is bringing the kachumbari this week? 🥗', ago: 2000 },
      { who: 'them', by: handleOf(mwende), text: 'Me! And I am bringing extra pilipili 🌶️', ago: 1990 },
      { who: 'me', text: 'I will handle the drinks 🥤', ago: 1980 },
      { who: 'them', by: handleOf(otis), text: 'Same spot as last time? The goat there was elite', ago: 60 },
      { who: 'me', text: 'Same spot. 1pm sharp, no African time this once 😂', ago: 40 },
      { who: 'them', by: handleOf(tito), text: 'I make no promises 😅', ago: 35 },
    ]
  );

  const karura = makeConv(
    {
      id: 'demo-grp-karura',
      name: 'Karura Sunrise Hikers 🌲',
      avatar: IMG.forest,
      type: 'group',
      theme: 'emerald',
      members: [me, handleOf(dan), handleOf(shiko), handleOf(farida)],
    },
    [
      { who: 'them', by: handleOf(dan), text: 'Trail is dry this week, perfect for the long loop 🏃🏾', ago: 4300 },
      { who: 'them', by: handleOf(shiko), text: 'Meet at Gate B at 6:30am?', ago: 4290 },
      { who: 'me', text: 'Gate B works. I will bring the chai flask ☕', ago: 4200 },
      { who: 'them', by: handleOf(farida), text: 'You are a legend 🙌', ago: 4180 },
    ]
  );

  // 1. Date invite RECEIVED from @mwende_k (waiting for you to tap Accept date)
  const dmMwende = makeConv(
    { id: 'demo-dm-mwende', name: handleOf(mwende), avatar: mwende.avatar, type: 'direct', theme: 'sunset' },
    [
      { who: 'me', text: 'Pallet Cafe this week? Their cardamom latte is dangerous ☕', ago: 3900 },
      { who: 'them', text: 'Okay we have to go 😍 Are you free this week?', ago: 3890 },
      { who: 'me', text: 'Thursday evening works for me. Let me plan something nice 😄', ago: 1500 },
      { who: 'them', text: "Say less. I'll be there 😄", ago: 1490 },
      { who: 'them', text: 'Found us a cozy corner there. Sending the invite now 👇', ago: 14 },
      {
        who: 'them',
        text: 'Date Invite: Pallet Cafe Lavington',
        ago: 12,
        extra: { dateInvite: { spotTitle: 'Pallet Cafe Lavington', address: 'Lavington, Nairobi', date: ymd(3), time: '4:00 PM', accepted: false } },
      },
    ],
    mwende.id
  );

  // 2. Date invite SENT by me to @wanjiru_k (pending response)
  const dmWanjiru = makeConv(
    { id: 'demo-dm-wanjiru', name: handleOf(wanjiru), avatar: wanjiru.avatar, type: 'direct', theme: 'sunset' },
    [
      { who: 'them', text: 'Saw your review on The Alchemist! Is the rooftop DJ good on Fridays? 🎶', ago: 620 },
      { who: 'me', text: '10/10 vibe especially around sunset. Want us to check it out this Friday?', ago: 590 },
      { who: 'them', text: 'Wait yes!! Lock in a time and send me the invite 👀', ago: 310 },
      {
        who: 'me',
        text: 'Date Invite: The Alchemist Bar',
        ago: 22,
        extra: { dateInvite: { spotTitle: 'The Alchemist Bar', address: 'Parklands Rd, Westlands', date: ymd(5), time: '6:30 PM', accepted: false } },
      },
      { who: 'me', text: 'Sent! Let me know if 6:30 works or if we push to 7 🍸', ago: 4 },
    ],
    wanjiru.id
  );

  // 3. Date invite SENT by me to @njeri_wa & ACCEPTED + follow-up chat
  const dmNjeri = makeConv(
    { id: 'demo-dm-njeri', name: handleOf(njeri), avatar: njeri.avatar, type: 'direct', theme: 'emerald' },
    [
      { who: 'me', text: 'Still craving that smoked brisket from Ankole Grill 😂', ago: 2400 },
      { who: 'them', text: 'Do not tempt me on a weekday 😩 When are we going?', ago: 2380 },
      {
        who: 'me',
        text: 'Date Invite: Ankole Grill Kilimani',
        ago: 940,
        extra: { dateInvite: { spotTitle: 'Ankole Grill Kilimani', address: 'Galana Rd, Kilimani', date: ymd(4), time: '7:30 PM', accepted: true } },
      },
      { who: 'them', text: `Date accepted: Ankole Grill Kilimani on ${ymd(4)} at 7:30 PM`, ago: 880 },
      { who: 'them', text: 'Booked it in my calendar 💚 Cannot wait for Friday!', ago: 878 },
      { who: 'me', text: 'Asked for the garden booth by the lanterns 🔥 See you at 7:30', ago: 720 },
    ],
    njeri.id
  );

  // 4. Met up + texting AFTER the meetup (@brian_otieno)
  const dmBrian = makeConv(
    { id: 'demo-dm-brian', name: handleOf(brian), avatar: brian.avatar, type: 'direct', theme: 'emerald' },
    [
      { who: 'me', text: 'Still on for Karura Gate A at 8am sharp? 🌲', ago: 480 },
      { who: 'them', text: 'Yes sir! Just entered Limuru Rd now', ago: 420 },
      { who: 'them', text: "I'm by the main barrier in a forest green cap 👋", ago: 390 },
      { who: 'me', text: 'Spot you! Walking right up', ago: 388 },
      { who: 'system', text: 'Met up at Karura Forest', ago: 360 },
      { who: 'them', text: 'Just got home — that 10km loop felt way easier with the chai after 😂', ago: 165 },
      { who: 'me', text: 'Haha for real! Best post-hike breakfast at Rivers Cafe too', ago: 140 },
      { who: 'them', text: 'Here is that waterfall shot we took 📸', ago: 135, extra: { photos: [IMG.forest] } },
      { who: 'me', text: 'Clean shot 🔥 Next Sunday we tackle Ngong Hills?', ago: 55 },
      { who: 'them', text: 'Booked! I will bring the electrolytes this time 😂', ago: 48 },
    ],
    brian.id
  );

  // 5. My Discover Ask #1 (@dennis_m) -> accepted reply -> met up -> texting after meetup
  const dennis = byKey('dennis');
  const dmAskDennis = makeConv(
    { id: `demo-dm-ask-${dennis.key}`, name: handleOf(dennis), avatar: dennis.avatar, type: 'direct' },
    [
      { who: 'system', text: `Chat opened from your Discover post: “${DEMO_MY_ASK_BODY}”`, ago: 420 },
      { who: 'them', text: DEMO_MY_ASK_ACCEPTED_REPLY, ago: 418 },
      { who: 'me', text: 'Kasarani bro, Mwiki side. Uje na njaa 😂', ago: 405 },
      { who: 'them', text: 'Sawa! Drop pin, nafika around 7', ago: 390 },
      { who: 'me', text: 'Pin imefika 📍 Nimefika nje kwa gate', ago: 310 },
      { who: 'them', text: 'Nakuona! Ndio huyo mimi na chaser 😂', ago: 308 },
      { who: 'system', text: 'Met up from your Discover post', ago: 290 },
      { who: 'them', text: 'Bro just reached home, that mbuzi + FIFA session was undefeated 🔥😂', ago: 34 },
      { who: 'me', text: 'Haha 4-1 in the final match was disrespectful 😂 Run it back next weekend?', ago: 26 },
      { who: 'them', text: 'Lazima! Next time my place, naweka pilau', ago: 19 },
    ],
    dennis.id
  );

  // 6. My Discover Ask #2 (@lulu_n) -> accepted reply -> met up for brunch -> texting after meetup
  const dmAskLulu = makeConv(
    { id: `demo-dm-ask-${lulu.key}`, name: handleOf(lulu), avatar: lulu.avatar, type: 'direct', theme: 'sunset' },
    [
      { who: 'system', text: `Chat opened from your Discover post: “${DEMO_MY_ASK_2_BODY}”`, ago: 1440 },
      { who: 'them', text: DEMO_MY_ASK_2_ACCEPTED_REPLY, ago: 1435 },
      { who: 'me', text: 'Let us do Asmara Kilimani at 12:30! Quiet garden table', ago: 1400 },
      { who: 'them', text: 'Perfect 🙌 Just got a Bolt, 10 mins away', ago: 1210 },
      { who: 'me', text: 'Already grabbed the shaded table near the back 🌿', ago: 1205 },
      { who: 'system', text: 'Met up from your Discover post', ago: 1180 },
      { who: 'them', text: 'Got home safely! Still mad you beat me at Catan twice in a row 😂🎲', ago: 840 },
      { who: 'me', text: 'Beginner luck 😅 Thank you for bringing the games, that brunch was 10/10', ago: 825 },
      { who: 'them', text: 'Pottery & coffee next Saturday? Found a studio in Lavington!', ago: 110 },
    ],
    lulu.id
  );

  // 7. My Discover Ask #3 (@amani_j) -> accepted reply -> met up -> texting after meetup
  const dmAskAmani = makeConv(
    { id: `demo-dm-ask-${amani.key}`, name: handleOf(amani), avatar: amani.avatar, type: 'direct', theme: 'emerald' },
    [
      { who: 'system', text: `Chat opened from your Discover post: “${DEMO_MY_ASK_3_BODY}”`, ago: 2880 },
      { who: 'them', text: DEMO_MY_ASK_3_ACCEPTED_REPLY, ago: 2870 },
      { who: 'me', text: 'Yes! Grabbing iced lattes first then we hit the bamboo trail ☕', ago: 2850 },
      { who: 'them', text: 'See you outside Rivers Cafe in 15!', ago: 2830 },
      { who: 'system', text: 'Met up from your Discover post', ago: 2780 },
      { who: 'them', text: 'Still laughing at how loud we were after 12km 😂 Thanks for the lift back!', ago: 2450 },
      { who: 'me', text: 'Anytime!! Sent you the trail clips too 🌲', ago: 2410 },
      { who: 'them', text: 'Next time karaoke night, you owe me one Sauti Sol duet 🎤', ago: 490 },
    ],
    amani.id
  );

  // 8. Met up + texting after meetup (@tito_ke)
  const dmTito = makeConv(
    { id: 'demo-dm-tito', name: handleOf(tito), avatar: tito.avatar, type: 'direct' },
    [
      { who: 'me', text: 'Just parked outside! Wearing the black hoodie', ago: 560 },
      { who: 'them', text: 'Come straight to the patio, already ordered the platter 🔥', ago: 556 },
      { who: 'system', text: 'Met up at K1 Klub House', ago: 520 },
      { who: 'them', text: 'Bro that nyama choma place was unreal 🔥 Just got home', ago: 320 },
      { who: 'me', text: 'Told you! Next time we try the one in Karen', ago: 300 },
      { who: 'them', text: 'Deal. Also I found this rooftop for the weekend', ago: 120 },
      { who: 'them', text: 'Look at this view 😍', ago: 118, extra: { photos: [IMG.rooftop] } },
      { who: 'me', text: 'Okay that is actually crazy. Book it!', ago: 90 },
    ],
    tito.id
  );

  // 9. Post-meetup banter (@farida_h)
  const dmFarida = makeConv(
    { id: 'demo-dm-farida', name: handleOf(farida), avatar: farida.avatar, type: 'direct', theme: 'emerald' },
    [
      { who: 'them', text: 'Thanks for coming to paint & sip! My painting looks like a potato 😂', ago: 1200 },
      { who: 'me', text: 'Mine looks like a slightly bigger potato 🥔', ago: 1190 },
      { who: 'them', text: 'We are framing them both. Next one is on me 🎨', ago: 1180 },
    ],
    farida.id
  );

  const derby = makeConv(
    {
      id: 'demo-grp-derby',
      name: 'Weekend Football Watch Party ⚽',
      avatar: IMG.gaming,
      type: 'group',
      members: [me, handleOf(tito), handleOf(dennis), handleOf(byKey('kevo')), handleOf(otis)],
    },
    [
      { who: 'them', by: handleOf(dennis), text: 'Jumamosi derby, nani ana screen kubwa? 📺', ago: 900 },
      { who: 'them', by: handleOf(byKey('kevo')), text: 'Mimi! FIFA pia iko 🎮', ago: 880 },
      { who: 'me', text: 'Mi nitaleta vitu za kuchoma 🍖', ago: 860 },
      { who: 'them', by: handleOf(tito), text: 'Kick-off ni saa kumi na nusu. Msichelewe 😤', ago: 95 },
      { who: 'them', by: handleOf(otis), text: 'Nitafika na speaker, tutasherehekea ushindi 🔊', ago: 70 },
    ]
  );

  const amapiano = makeConv(
    {
      id: 'demo-grp-amapiano',
      name: 'Amapiano Fridays 💃',
      avatar: IMG.concert,
      type: 'group',
      theme: 'sunset',
      members: [me, handleOf(njeri), handleOf(byKey('vee')), handleOf(amani), handleOf(farida)],
    },
    [
      { who: 'them', by: handleOf(njeri), text: 'New playlist is up. Friday we dance till the lights come on 🎶', ago: 1500 },
      { who: 'them', by: handleOf(byKey('vee')), text: 'Which club though? Westlands or Kilimani?', ago: 1490 },
      { who: 'me', text: 'Kilimani. Entry is cheaper before 10pm 😄', ago: 1470 },
      { who: 'them', by: handleOf(amani), text: 'I will be the one singing off-key in the corner 🎤', ago: 300 },
      { who: 'them', by: handleOf(farida), text: 'We love you anyway 😂', ago: 290 },
    ]
  );

  void myId;
  return [
    hostingMine,
    dmMwende,
    dmAskDennis,
    dmWanjiru,
    dmBrian,
    dmTito,
    dmAskLulu,
    dmAskAmani,
    dmNjeri,
    nyama,
    derby,
    hostingJoined,
    dmFarida,
    amapiano,
    karura,
  ];
}

/** A fresh direct chat opened from a profile. */
export function buildDirectConversation(person: DemoPerson): ChatConversation {
  return makeConv(
    { id: `demo-dm-${person.key}`, name: handleOf(person), avatar: person.avatar, type: 'direct' },
    [{ who: 'them', text: `Hey 👋 ${person.bio.split('.')[0]}. What are you up to this weekend?`, ago: 0 }],
    person.id
  );
}

/** Backwards-compatible alias while refactoring callers. */
export const buildMatchConversation = buildDirectConversation;

/** A new group created from the app while Demo Mode is on. */
export function buildGroupConversation(name: string, handles: string[], myHandle: string): ChatConversation {
  const me = myHandle.startsWith('@') ? myHandle : `@${myHandle || 'you'}`;
  const members = [me, ...handles.map(h => `@${h.replace(/^@/, '')}`)];
  return makeConv(
    { id: `demo-grp-${Date.now()}`, name, avatar: IMG.crowd, type: 'group', members },
    [{ who: 'system', text: `${me} created the group "${name}"`, ago: 0 }]
  );
}

/** A hosting chat created when the host approves a guest or opens the chat. */
export function buildOutingConversation(outingId: string, title: string, myHandle: string): ChatConversation {
  const me = myHandle.startsWith('@') ? myHandle : `@${myHandle || 'you'}`;
  return makeConv(
    {
      id: `grp-outing-${outingId}`,
      name: title,
      avatar: IMG.crowd,
      type: 'group',
      members: [me],
      outingId,
      outingTitle: title,
      isTemporary: true,
    },
    [{ who: 'system', text: `Hosting chat unlocked for "${title}". Approved guests are added automatically.`, ago: 0 }]
  );
}

const DIRECT_REPLIES = [
  'Haha yes! 😂',
  "Sounds like a plan 🔥",
  "I'm in. Send the location?",
  'Say less 😄',
  "That's perfect, I was just thinking the same",
  'Okay okay, I see you 👀',
  "Let me check my schedule and confirm tonight",
];
const GROUP_REPLIES = [
  "I'm in!! 🙌",
  "Who's driving?",
  'Count me in 🔥',
  'Can we make it 7pm?',
  'Dropping a pin now 📍',
  'This is going to be so good',
  'Bringing the speaker 🎧',
];

/** Scripted reply used so chats feel alive while recording. Returns null for system-only chats. */
export function demoReplyFor(conv: ChatConversation, myHandle: string): { text: string; senderHandle?: string } | null {
  const n = conv.messages.length;
  if (conv.type === 'direct') return { text: DIRECT_REPLIES[n % DIRECT_REPLIES.length] };
  const me = myHandle.startsWith('@') ? myHandle : `@${myHandle}`;
  const others = (conv.members || []).filter(h => h && h !== me);
  if (others.length === 0) return null;
  return { text: GROUP_REPLIES[n % GROUP_REPLIES.length], senderHandle: others[n % others.length] };
}

// ---------------------------------------------------------------------------
// outings (hosting + joining)
// ---------------------------------------------------------------------------
export function buildDemoOutings(
  myId: string,
  me: { name: string; handle: string; avatar: string }
): OutingPlan[] {
  const att = (outingId: string, key: string, status: OutingAttendee['status'], minsAgo: number): OutingAttendee => {
    const p = byKey(key);
    return { id: `demo-att-${outingId}-${key}`, outingId, userId: p.id, userName: p.name, userAvatar: p.avatar, userHandle: handleOf(p), status, isVerified: true, requestedAt: agoIso(minsAgo) };
  };
  const meAtt = (outingId: string, status: OutingAttendee['status']): OutingAttendee => ({
    id: `demo-att-${outingId}-me`, outingId, userId: myId, userName: me.name, userAvatar: me.avatar, userHandle: me.handle, status, isVerified: true, requestedAt: agoIso(500),
  });
  const host = (key: string) => {
    const p = byKey(key);
    return { hostId: p.id, hostName: p.name, hostAvatar: p.avatar, hostHandle: handleOf(p), isHostVerified: true };
  };
  const mine = { hostId: myId, hostName: me.name, hostAvatar: me.avatar, hostHandle: me.handle, isHostVerified: true };

  const out1Att = [
    att('demo-out-1', 'mwende', 'approved', 2000),
    att('demo-out-1', 'tito', 'approved', 1900),
    att('demo-out-1', 'otis', 'approved', 1800),
    att('demo-out-1', 'shiko', 'approved', 1700),
    att('demo-out-1', 'nina', 'pending', 50),
    att('demo-out-1', 'dennis', 'pending', 35),
    att('demo-out-1', 'caro', 'pending', 10),
  ];
  const out2Att = [att('demo-out-2', 'dan', 'approved', 900), att('demo-out-2', 'jabali', 'pending', 120), att('demo-out-2', 'sam', 'pending', 80)];
  const out3Att = [att('demo-out-3', 'mwende', 'approved', 900), att('demo-out-3', 'dan', 'approved', 800), meAtt('demo-out-3', 'approved')];

  const count = (a: OutingAttendee[]) => a.filter(x => x.status === 'approved' || x.status === 'joined').length + 1;

  return [
    {
      id: 'demo-out-1', ...mine,
      spotTitle: 'Sundowners at Ole Sereni Rooftop', spotAddress: 'Mombasa Road, Nairobi', spotImage: IMG.rooftop, spotCategory: 'Rooftops',
      date: ymd(4), time: hm(17, 30), maxAttendees: 8, currentAttendeesCount: count(out1Att),
      description: 'Golden hour drinks above the city. Good music, great views and even better company. Smart casual 🌇',
      accessType: 'open', tags: ['Rooftops'], status: 'active', createdAt: agoIso(3000), attendees: out1Att,
    },
    {
      id: 'demo-out-2', ...mine,
      spotTitle: 'Karura Forest Sunday Hike & Brunch', spotAddress: 'Karura Forest, Limuru Road', spotImage: IMG.forest, spotCategory: 'Outdoors & Nature',
      date: ymd(6), time: hm(7, 0), maxAttendees: 10, currentAttendeesCount: count(out2Att),
      description: 'Easy 8km loop through the forest, then brunch at the gate. All fitness levels welcome 🌲',
      accessType: 'open', tags: ['Nature'], status: 'active', createdAt: agoIso(2000), attendees: out2Att,
    },
    {
      id: 'demo-out-3', ...host('farida'),
      spotTitle: 'Paint & Sip Night', spotAddress: 'Kilimani, Nairobi', spotImage: IMG.art, spotCategory: 'Arts & Culture',
      date: ymd(2), time: hm(18, 30), maxAttendees: 6, currentAttendeesCount: count(out3Att),
      description: 'No talent required. Canvas, paint and your first glass of wine are on us 🎨🍷',
      accessType: 'open', tags: ['Creative'], status: 'active', createdAt: agoIso(2500), attendees: out3Att,
    },
    {
      id: 'demo-out-4', ...host('kevo'),
      spotTitle: 'Bowling League Night', spotAddress: 'Westlands, Nairobi', spotImage: IMG.gaming, spotCategory: 'Gaming & Arcades',
      date: ymd(5), time: hm(19, 0), maxAttendees: 8, currentAttendeesCount: 4,
      description: 'Friendly competition, loud music and terrible bowling form. Losers buy the first round 🎳',
      accessType: 'open', tags: ['Action'], status: 'active', createdAt: agoIso(1500),
      attendees: [meAtt('demo-out-4', 'pending'), att('demo-out-4', 'tito', 'approved', 800), att('demo-out-4', 'otis', 'approved', 700)],
    },
    {
      id: 'demo-out-5', ...host('zawadi'),
      spotTitle: 'Brunch & Board Games', spotAddress: 'Kilimani, Nairobi', spotImage: IMG.cafe, spotCategory: 'Cafes & Bakeries',
      date: ymd(7), time: hm(11, 0), maxAttendees: 8, currentAttendeesCount: 3,
      description: 'Pancakes, mimosas and a mountain of board games. A relaxed way to meet new people ☕🎲',
      accessType: 'open', tags: ['Cafes'], status: 'active', createdAt: agoIso(900),
      attendees: [att('demo-out-5', 'lulu', 'approved', 400), att('demo-out-5', 'amani', 'approved', 300)],
    },
    {
      id: 'demo-out-6', ...host('ian'),
      spotTitle: 'Nairobi Night Market Food Crawl', spotAddress: 'Westlands, Nairobi', spotImage: IMG.burger, spotCategory: 'Restaurants',
      date: ymd(3), time: hm(19, 30), maxAttendees: 12, currentAttendeesCount: 6,
      description: 'Six stalls, six bites each. Come hungry and bring your appetite for street food 🍢',
      accessType: 'open', tags: ['Food'], status: 'active', createdAt: agoIso(600),
      attendees: [att('demo-out-6', 'vee', 'approved', 300), att('demo-out-6', 'jabali', 'approved', 280)],
    },
  ];
}
