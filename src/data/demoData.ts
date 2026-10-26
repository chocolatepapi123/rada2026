/**
 * Mock Socials data for Demo Mode (see src/lib/demoMode.ts). Used only when the app is opened with ?demo=1.
 * All ids start with "demo-". Dates are generated relative to today, so everything is always upcoming.
 * Every person and event here is fictional.
 */
import type { ChatConversation, ChatMessage } from '../types.ts';
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

const woman = (n: number) => `https://randomuser.me/api/portraits/women/${n}.jpg`;
const man = (n: number) => `https://randomuser.me/api/portraits/men/${n}.jpg`;
const DEFAULT_ME_AVATAR = woman(79);

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
  /** Swiping right on this person is an instant match. */
  instantMatch?: boolean;
}

const P = (key: string, username: string, name: string, avatar: string, bio: string, instantMatch = false): DemoPerson => ({
  id: `demo-u-${key}`,
  key,
  username,
  name,
  avatar,
  bio,
  instantMatch,
});

export const DEMO_PEOPLE: DemoPerson[] = [
  // sent me a request
  P('wanjiru', 'wanjiru_k', 'Wanjiru Kamau', woman(44), 'Rooftop sundowners, nyama choma Sundays and anything with live music 🎶'),
  P('brian', 'brian_otieno', 'Brian Otieno', man(32), 'Karura trails by morning, Kilimani brunch by noon 🌲☕'),
  P('achieng', 'achieng_a', 'Achieng Akinyi', woman(65), 'Art, coffee and spontaneous road trips. Always down for a gallery night 🎨'),
  P('kevo', 'kevo254', 'Kevin Mutua', man(45), 'Gaming, bowling and late-night mutura. Challenge me 🎮'),
  // I sent them a request
  P('zawadi', 'zawadi_m', 'Zawadi Mwangi', woman(26), 'Brunch snob. Sunday market regular. Looking for a plus-one for Nairobi adventures ✨'),
  P('ian', 'ian_mwangi', 'Ian Mwangi', man(75), 'Foodie first, everything else second. Will travel for good chips masala 🍟'),
  P('njeri', 'njeri_wa', 'Njeri Wairimu', woman(12), 'Dancer. Amapiano on repeat. Ask me about my playlist 💃'),
  // matched: direct chats
  P('mwende', 'mwende_k', 'Mwende Kioko', woman(33), 'Weekend explorer. Cafes, bookshops and sunsets 🌅'),
  P('tito', 'tito_ke', 'Tito Odhiambo', man(22), 'Football, nyama choma and terrible puns ⚽'),
  P('farida', 'farida_h', 'Farida Hassan', woman(90), 'Paint and sip regular. Beach person stuck in Nairobi 🎨🍷'),
  // group + hosting chat members
  P('otis', 'otis_ke', 'Otieno Ouma', man(86), 'DJ on weekends, accountant on weekdays 🎧'),
  P('shiko', 'shiko_n', 'Shiko Njoroge', woman(53), 'Hiking, photography and strong coffee 📸'),
  P('dan', 'dan_kamau', 'Daniel Kamau', man(61), 'Trail runner. Karura is my office 🏃🏾'),
  // discover deck (swipe candidates)
  P('nina', 'nina_w', 'Nina Wanjiku', woman(68), 'Pottery on Saturdays, Java on Sundays. Looking for someone to explore new spots with ☕', true),
  P('dennis', 'dennis_m', 'Dennis Maina', man(41), 'Sports bar regular and part-time chef. I make a mean pilau 🍛'),
  P('caro', 'caro_a', 'Caroline Atieno', woman(21), 'Live music, rooftops and long drives to Naivasha 🚗'),
  P('jabali', 'jabali_k', 'Jabali Kariuki', man(9), 'Photographer. Golden hour chaser. Will take your portrait for free 📷'),
  P('lulu', 'lulu_n', 'Lulu Nyambura', woman(5), 'Foodie, bookworm and board game champion 🎲', true),
  P('sam', 'sam_oduor', 'Samuel Oduor', man(52), 'Climbing Ngong Hills every other weekend. Come keep up ⛰️'),
  P('amani', 'amani_j', 'Amani Juma', woman(37), 'Karaoke queen. Yes, I will sing Sauti Sol 🎤', true),
  P('vee', 'vee_ke', 'Valentine Chebet', woman(47), 'Cocktails, comedy nights and spontaneous plans 🍸'),
];

const byKey = (key: string): DemoPerson => DEMO_PEOPLE.find(p => p.key === key) as DemoPerson;
export const getDemoPerson = (id: string): DemoPerson | undefined => DEMO_PEOPLE.find(p => p.id === id);
const handleOf = (p: DemoPerson) => `@${p.username}`;

/** Shape returned by search_profiles; powers Search and the Discover deck. */
export const DEMO_PROFILE_HITS: CloudProfileHit[] = DEMO_PEOPLE.map(p => ({
  id: p.id,
  username: p.username,
  avatar_url: p.avatar,
  bio: p.bio,
  relationship_status: 'single',
  is_liveness_verified: true,
}));

// ---------------------------------------------------------------------------
// match requests
// ---------------------------------------------------------------------------
export function buildDemoRequests(myId: string, myHandle: string, myAvatar: string = DEFAULT_ME_AVATAR): CloudRequest[] {
  const me = myHandle.startsWith('@') ? myHandle : `@${myHandle || 'you'}`;
  const received = (key: string, minsAgo: number): CloudRequest => {
    const p = byKey(key);
    return { id: `demo-req-in-${key}`, fromUser: p.id, toUser: myId, fromHandle: handleOf(p), fromAvatar: p.avatar, toHandle: me, toAvatar: myAvatar, status: 'pending', createdAt: agoIso(minsAgo) };
  };
  const sent = (key: string, minsAgo: number): CloudRequest => {
    const p = byKey(key);
    return { id: `demo-req-out-${key}`, fromUser: myId, toUser: p.id, fromHandle: me, fromAvatar: myAvatar, toHandle: handleOf(p), toAvatar: p.avatar, status: 'pending', createdAt: agoIso(minsAgo) };
  };
  const accepted = (key: string, minsAgo: number): CloudRequest => {
    const p = byKey(key);
    return { id: `demo-req-ok-${key}`, fromUser: p.id, toUser: myId, fromHandle: handleOf(p), fromAvatar: p.avatar, toHandle: me, toAvatar: myAvatar, status: 'accepted', conversationId: `demo-dm-${key}`, createdAt: agoIso(minsAgo) };
  };
  return [
    received('wanjiru', 20),
    received('brian', 190),
    received('achieng', 1500),
    received('kevo', 2900),
    sent('zawadi', 60),
    sent('ian', 300),
    sent('njeri', 1400),
    accepted('mwende', 4000),
    accepted('tito', 5000),
    accepted('farida', 6000),
  ];
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
    const m: ChatMessage = { id: `${base.id}-m${i}`, sender: d.who, text: d.text, time: clock(at), ...(d.extra || {}) };
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

  const dmMwende = makeConv(
    { id: 'demo-dm-mwende', name: handleOf(mwende), avatar: mwende.avatar, type: 'direct', theme: 'sunset' },
    [
      { who: 'them', text: 'Heyy! So glad we matched 😊 I saw you also love Pallet Cafe!', ago: 3900 },
      { who: 'me', text: 'Haha yes, their cardamom latte is dangerous ☕', ago: 3890 },
      { who: 'them', text: 'Okay we have to go. Are you free this week?', ago: 3880 },
      { who: 'me', text: 'Thursday evening works for me. Let me plan something nice 😄', ago: 1500 },
      { who: 'them', text: "Say less. I'll be there 😄", ago: 1490 },
      {
        who: 'them',
        text: 'Date Invite: Pallet Cafe Lavington',
        ago: 12,
        extra: { dateInvite: { spotTitle: 'Pallet Cafe Lavington', address: 'Lavington, Nairobi', date: ymd(3), time: '4:00 PM', accepted: false } },
      },
    ],
    mwende.id
  );

  const dmTito = makeConv(
    { id: 'demo-dm-tito', name: handleOf(tito), avatar: tito.avatar, type: 'direct' },
    [
      { who: 'them', text: 'Bro that nyama choma place was unreal 🔥', ago: 400 },
      { who: 'me', text: 'Told you! Next time we try the one in Karen', ago: 380 },
      { who: 'them', text: 'Deal. Also I found this rooftop for the weekend', ago: 120 },
      { who: 'them', text: 'Look at this view 😍', ago: 118, extra: { photos: [IMG.rooftop] } },
      { who: 'me', text: 'Okay that is actually crazy. Book it!', ago: 90 },
    ],
    tito.id
  );

  const dmFarida = makeConv(
    { id: 'demo-dm-farida', name: handleOf(farida), avatar: farida.avatar, type: 'direct', theme: 'emerald' },
    [
      { who: 'them', text: 'Thanks for coming to paint & sip! My painting looks like a potato 😂', ago: 1200 },
      { who: 'me', text: 'Mine looks like a slightly bigger potato 🥔', ago: 1190 },
      { who: 'them', text: 'We are framing them both. Next one is on me 🎨', ago: 1180 },
    ],
    farida.id
  );

  return [hostingMine, dmMwende, nyama, dmTito, hostingJoined, dmFarida, karura];
}

/** A fresh chat after an accepted request or an instant match. */
export function buildMatchConversation(person: DemoPerson): ChatConversation {
  return makeConv(
    { id: `demo-dm-${person.key}`, name: handleOf(person), avatar: person.avatar, type: 'direct' },
    [{ who: 'them', text: `Hey! Glad we matched 😊 ${person.bio.split('.')[0]}. What are you up to this weekend?`, ago: 0 }],
    person.id
  );
}

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
