import type { ChatConversation, ChatMessage, OutingPlan, OutingAttendee } from '../types.ts';
import type { CloudProfileHit, CloudRequest } from './socialsCloud.ts';

/**
 * DEMO MODE (for promo screen recordings).
 *
 * Everything here lives only on the phone that switched it on. Nothing is written to
 * the database, so real users never see these accounts, chats or hostings.
 *
 *   Turn on : open  https://<your-site>/?demo=1   (stays on until turned off)
 *   Turn off: open  https://<your-site>/?demo=0
 */
const DEMO_KEY = 'rada_demo';

try {
  if (typeof window !== 'undefined') {
    const flag = new URLSearchParams(window.location.search).get('demo');
    if (flag === '1') localStorage.setItem(DEMO_KEY, '1');
    if (flag === '0') localStorage.removeItem(DEMO_KEY);
  }
} catch {
  /* storage blocked: demo stays off */
}

export const isDemoMode = (): boolean => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
};

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=600&auto=format&fit=crop`;

interface DemoPerson {
  id: string;
  username: string;
  avatar: string;
  bio: string;
}

const P = (n: number, username: string, photo: string, bio: string): DemoPerson => ({
  id: `demo-u-${n}`,
  username,
  avatar: IMG(photo),
  bio,
});

export const DEMO_PEOPLE: Record<string, DemoPerson> = {
  amani: P(1, 'amani_k', 'photo-1500648767791-00dcc994a43e', 'Nyama choma on Sundays, live music on Fridays. Let’s explore Nairobi.'),
  wanjiru: P(2, 'wanjiru_m', 'photo-1494790108377-be9c29b29330', 'Coffee snob ☕ Always chasing the next rooftop view.'),
  brian: P(3, 'brian-o', 'photo-1507003211169-0a1dd7228f2d', 'Hiker, gamer, bad at cooking. Karura on weekends.'),
  zawadi: P(4, 'zawadi_n', 'photo-1438761681033-6461ffad8d80', 'Art markets, brunch spots and good conversation.'),
  kevo: P(5, 'kevo_254', 'photo-1506794778202-cad84cf45f1d', 'DJ on weekends. Looking for someone to share the dance floor.'),
  nyambura: P(6, 'nyambura_w', 'photo-1544005313-94ddf0286df2', 'Foodie. Will rate your favourite restaurant honestly.'),
  otieno: P(7, 'otieno_j', 'photo-1539571696357-5a69c17a67c6', 'Football, road trips and chai. Up for anything outdoors.'),
  chebet: P(8, 'chebet_r', 'photo-1517841905240-472988babdf9', 'Runner 🏃🏾‍♀️ Yoga on Saturdays, cinema on Sundays.'),
  faith: P(9, 'faith_a', 'photo-1534528741775-53994a69daeb', 'New in Nairobi, show me your favourite hidden gems.'),
  mwas: P(10, 'mwas_d', 'photo-1500648767791-00dcc994a43e', 'Photographer. Golden hour at Ngong Hills never gets old.'),
  achieng: P(11, 'achieng_l', 'photo-1494790108377-be9c29b29330', 'Matched ✨ Brunch buddy and spontaneous planner.'),
  tito: P(12, 'tito_m', 'photo-1506794778202-cad84cf45f1d', 'Matched ✨ Board games, jazz nights and strong coffee.'),
};

const asHit = (p: DemoPerson): CloudProfileHit => ({
  id: p.id,
  username: p.username,
  avatar_url: p.avatar,
  bio: p.bio,
  relationship_status: 'single',
  is_liveness_verified: true,
});

/** People who show up in Discover and Search (verified singles). */
export const demoSearchPool = (): CloudProfileHit[] => Object.values(DEMO_PEOPLE).map(asHit);

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString();
const clock = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const msg = (
  id: string,
  from: 'me' | 'them' | 'system',
  text: string,
  minutesAgo: number,
  extra: Partial<ChatMessage> & { senderHandle?: string } = {}
): ChatMessage => ({ id, sender: from, text, time: clock(ago(minutesAgo)), ...extra });

const dateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export interface DemoSnapshot {
  conversations: ChatConversation[];
  requests: CloudRequest[];
}

export function buildDemoSnapshot(myId: string, myHandle: string, myAvatar: string): DemoSnapshot {
  const me = (myHandle || '@you').startsWith('@') ? myHandle || '@you' : `@${myHandle}`;
  const A = DEMO_PEOPLE;
  const h = (p: DemoPerson) => `@${p.username}`;

  const withMeta = (c: ChatConversation, minutesAgo: number, otherUserId?: string): ChatConversation => {
    (c as any).lastMessageAt = ago(minutesAgo);
    if (otherUserId) (c as any).otherUserId = otherUserId;
    return c;
  };

  const dm1 = withMeta(
    {
      id: 'demo-dm-1',
      name: h(A.achieng),
      avatar: A.achieng.avatar,
      type: 'direct',
      lastMessage: 'Saturday at 11 works. I’ll book a table ☕',
      messages: [
        msg('d1-1', 'system', 'You matched with ' + h(A.achieng) + '. Say hi!', 2900),
        msg('d1-2', 'them', 'Hey! Saw you’re into brunch spots. Any favourites around Westlands?', 2880),
        msg('d1-3', 'me', 'Hi! Yes, there’s a place on Muthithi Road with the best pancakes 🥞', 2870),
        msg('d1-4', 'them', 'Okay now I’m hungry. Want to go this weekend?', 2860),
        msg('d1-5', 'me', 'Definitely. Let me send an invite.', 2850),
        msg('d1-6', 'me', 'Date Invite: Sarit Centre Brunch Spot', 2845, {
          dateInvite: {
            spotTitle: 'Sarit Centre Brunch Spot',
            address: 'Sarit Centre, Westlands',
            date: dateOffset(5),
            time: '11:00',
            accepted: false,
          },
        }),
        msg('d1-7', 'them', '✅ Date accepted: Sarit Centre Brunch Spot on ' + dateOffset(5) + ' at 11:00', 120),
        msg('d1-8', 'them', 'Saturday at 11 works. I’ll book a table ☕', 12),
      ],
    },
    12,
    A.achieng.id
  );

  const dm2 = withMeta(
    {
      id: 'demo-dm-2',
      name: h(A.tito),
      avatar: A.tito.avatar,
      type: 'direct',
      lastMessage: '📷 Photo',
      messages: [
        msg('d2-1', 'system', 'You matched with ' + h(A.tito) + '. Say hi!', 5000),
        msg('d2-2', 'them', 'Jazz night at Alchemist this Friday, are you in?', 300),
        msg('d2-3', 'me', 'Yes!! What time are we thinking?', 290),
        msg('d2-4', 'them', 'Doors at 8. Here’s the vibe 👇', 285),
        msg('d2-5', 'them', '', 284, {
          photos: [IMG('photo-1511192336575-5a79af67a629')],
        }),
      ],
    },
    284,
    A.tito.id
  );

  const grp1 = withMeta(
    {
      id: 'demo-grp-1',
      name: 'Weekend Hangout Crew',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop',
      type: 'group',
      lastMessage: 'Ngong Hills sunrise hike, who’s in? 🌄',
      members: [me, h(A.achieng), h(A.tito), h(A.amani), h(A.chebet)],
      messages: [
        msg('g1-1', 'system', 'Group "Weekend Hangout Crew" created by ' + me, 4300),
        msg('g1-2', 'them', 'Karibuni everyone! Plans for the weekend?', 4290, { senderHandle: h(A.amani) } as any),
        msg('g1-3', 'me', 'I’m free Saturday. Nyama choma?', 4280),
        msg('g1-4', 'them', 'Yes please 🍖', 4270, { senderHandle: h(A.achieng) } as any),
        msg('g1-5', 'them', 'Ngong Hills sunrise hike, who’s in? 🌄', 40, { senderHandle: h(A.chebet) } as any),
      ],
    },
    40
  );

  const grp2 = withMeta(
    {
      id: 'demo-grp-2',
      name: 'Nairobi Foodies 🍜',
      avatar: IMG('photo-1414235077428-338989a2e8c0'),
      type: 'group',
      lastMessage: 'New ramen place in Kilimani is unreal',
      members: [me, h(A.nyambura), h(A.faith), h(A.mwas)],
      messages: [
        msg('g2-1', 'system', 'Group "Nairobi Foodies 🍜" created by ' + h(A.nyambura), 9000),
        msg('g2-2', 'them', 'New ramen place in Kilimani is unreal', 200, { senderHandle: h(A.nyambura) } as any),
        msg('g2-3', 'them', 'Taking notes!! Weekend lunch?', 190, { senderHandle: h(A.faith) } as any),
      ],
    },
    190
  );

  const hostChat = withMeta(
    {
      id: 'grp-outing-demo-o-1',
      name: 'Outing: Karura Forest Sunrise Walk',
      avatar: IMG('photo-1448375240586-882707db888b'),
      type: 'group',
      lastMessage: 'See everyone at the main gate at 6:45 🌲',
      members: [me, h(A.brian), h(A.chebet), h(A.otieno)],
      outingId: 'demo-o-1',
      outingTitle: 'Karura Forest Sunrise Walk',
      isTemporary: true,
      messages: [
        msg('h1-1', 'system', 'Temporary Group Chat unlocked for "Karura Forest Sunrise Walk"! Hosted by ' + me + '.', 1500),
        msg('h1-2', 'system', h(A.brian) + ' was approved. Welcome to the group chat.', 1400),
        msg('h1-3', 'them', 'So excited! Should I bring snacks?', 600, { senderHandle: h(A.brian) } as any),
        msg('h1-4', 'me', 'Yes please, and water. We’ll walk the 5km loop.', 590),
        msg('h1-5', 'me', 'See everyone at the main gate at 6:45 🌲', 30),
      ],
    },
    30
  );

  const rooftopChat = withMeta(
    {
      id: 'grp-outing-demo-o-2',
      name: 'Outing: Singles Rooftop Sundowner',
      avatar: IMG('photo-1514933651103-005eec06c04b'),
      type: 'group',
      lastMessage: 'Dress code is smart-casual, see you there!',
      members: [me, h(A.mwas)],
      outingId: 'demo-o-2',
      outingTitle: 'Singles Rooftop Sundowner',
      isTemporary: true,
      messages: [
        msg('r1-1', 'system', 'Temporary Group Chat unlocked for "Singles Rooftop Sundowner"! Hosted by ' + me + '.', 280),
        msg('r1-2', 'system', h(A.mwas) + ' was approved. Welcome to the group chat.', 270),
        msg('r1-3', 'me', 'Dress code is smart-casual, see you there!', 100),
      ],
    },
    100
  );

  const joinedChat = withMeta(
    {
      id: 'grp-outing-demo-o-3',
      name: 'Outing: Sunset at Ngong Hills',
      avatar: IMG('photo-1500530855697-b586d89ba3ee'),
      type: 'group',
      lastMessage: 'Bring a jacket, it gets windy up there',
      members: [me, h(A.tito), h(A.mwas), h(A.faith)],
      outingId: 'demo-o-3',
      outingTitle: 'Sunset at Ngong Hills',
      isTemporary: true,
      messages: [
        msg('j1-1', 'system', 'Temporary Group Chat unlocked for "Sunset at Ngong Hills"! Hosted by ' + h(A.tito) + '.', 3000),
        msg('j1-2', 'system', me + ' was approved. Welcome to the group chat.', 2900),
        msg('j1-3', 'them', 'Bring a jacket, it gets windy up there', 75, { senderHandle: h(A.tito) } as any),
      ],
    },
    75
  );

  const req = (
    n: number,
    from: DemoPerson | null,
    to: DemoPerson | null,
    minutesAgo: number
  ): CloudRequest => ({
    id: `demo-req-${n}`,
    fromUser: from ? from.id : myId,
    toUser: to ? to.id : myId,
    fromHandle: from ? h(from) : me,
    fromAvatar: from ? from.avatar : myAvatar,
    toHandle: to ? h(to) : me,
    toAvatar: to ? to.avatar : myAvatar,
    status: 'pending',
    conversationId: null,
    createdAt: ago(minutesAgo),
  });

  return {
    conversations: [dm1, hostChat, grp1, rooftopChat, dm2, joinedChat, grp2],
    requests: [
      // received
      req(1, A.zawadi, null, 35),
      req(2, A.kevo, null, 180),
      req(3, A.nyambura, null, 600),
      // sent
      req(4, null, A.wanjiru, 90),
      req(5, null, A.brian, 1300),
    ],
  };
}

export function buildDemoOutings(myId: string, myHandle: string, myName: string, myAvatar: string): OutingPlan[] {
  const A = DEMO_PEOPLE;
  const me = (myHandle || '@you').startsWith('@') ? myHandle || '@you' : `@${myHandle}`;
  const att = (
    outingId: string,
    p: DemoPerson,
    status: OutingAttendee['status'],
    minutesAgo: number
  ): OutingAttendee => ({
    id: `demo-att-${outingId}-${p.id}`,
    outingId,
    userId: p.id,
    userName: `@${p.username}`,
    userHandle: `@${p.username}`,
    userAvatar: p.avatar,
    status,
    isVerified: true,
    requestedAt: ago(minutesAgo),
  });
  const count = (list: OutingAttendee[]) =>
    list.filter(a => a.status === 'joined' || a.status === 'approved').length + 1;

  const o1Att = [att('demo-o-1', A.brian, 'approved', 1400), att('demo-o-1', A.chebet, 'approved', 900), att('demo-o-1', A.otieno, 'approved', 800), att('demo-o-1', A.zawadi, 'pending', 60), att('demo-o-1', A.faith, 'pending', 25)];
  const o2Att = [att('demo-o-2', A.amani, 'pending', 120), att('demo-o-2', A.mwas, 'approved', 300)];
  const o3Att = [att('demo-o-3', A.mwas, 'approved', 2500), att('demo-o-3', A.faith, 'approved', 2400), { ...att('demo-o-3', A.achieng, 'approved', 2000), userId: myId, userHandle: me, userName: me, userAvatar: myAvatar }];
  const o4Att = [att('demo-o-4', A.nyambura, 'approved', 700), att('demo-o-4', A.kevo, 'approved', 650), att('demo-o-4', A.wanjiru, 'approved', 500), att('demo-o-4', A.otieno, 'approved', 300)];
  const o5Att = [att('demo-o-5', A.chebet, 'approved', 100)];

  const base = { isHostVerified: true, status: 'active' as const, createdAt: ago(3000) };

  return [
    {
      ...base,
      id: 'demo-o-1',
      hostId: myId,
      hostName: myName || me,
      hostAvatar: myAvatar,
      hostHandle: me,
      spotTitle: 'Karura Forest Sunrise Walk',
      spotAddress: 'Karura Forest, Gate B (Limuru Road)',
      spotImage: IMG('photo-1448375240586-882707db888b'),
      spotCategory: 'nature_trails',
      date: dateOffset(3),
      time: '06:45',
      maxAttendees: 8,
      currentAttendeesCount: count(o1Att),
      description: 'An easy 5km loop through the forest, then chai and mandazi at the cafe. All fitness levels welcome.',
      accessType: 'open',
      tags: ['All Plans', 'Group Hangouts', 'Outdoors'],
      attendees: o1Att,
    },
    {
      ...base,
      id: 'demo-o-2',
      hostId: myId,
      hostName: myName || me,
      hostAvatar: myAvatar,
      hostHandle: me,
      spotTitle: 'Singles Rooftop Sundowner',
      spotAddress: 'Skyline Rooftop, Westlands',
      spotImage: IMG('photo-1514933651103-005eec06c04b'),
      spotCategory: 'nightlife',
      date: dateOffset(6),
      time: '17:30',
      maxAttendees: 10,
      currentAttendeesCount: count(o2Att),
      description: 'Sunset drinks and good conversation for verified singles. Dress smart-casual.',
      accessType: 'singles_only',
      tags: ['All Plans', 'Singles Only'],
      attendees: o2Att,
    },
    {
      ...base,
      id: 'demo-o-3',
      hostId: A.tito.id,
      hostName: `@${A.tito.username}`,
      hostAvatar: A.tito.avatar,
      hostHandle: `@${A.tito.username}`,
      spotTitle: 'Sunset at Ngong Hills',
      spotAddress: 'Ngong Hills, Kajiado',
      spotImage: IMG('photo-1500530855697-b586d89ba3ee'),
      spotCategory: 'nature_trails',
      date: dateOffset(2),
      time: '16:00',
      maxAttendees: 8,
      currentAttendeesCount: count(o3Att),
      description: 'Golden hour hike and photos. Bring a jacket and water.',
      accessType: 'open',
      tags: ['All Plans', 'Group Hangouts', 'Outdoors'],
      attendees: o3Att,
    },
    {
      ...base,
      id: 'demo-o-4',
      hostId: A.nyambura.id,
      hostName: `@${A.nyambura.username}`,
      hostAvatar: A.nyambura.avatar,
      hostHandle: `@${A.nyambura.username}`,
      spotTitle: 'Street Food Crawl: Kilimani',
      spotAddress: 'Kilimani, Nairobi',
      spotImage: IMG('photo-1555939594-58d7cb561ad1'),
      spotCategory: 'food_dining',
      date: dateOffset(4),
      time: '13:00',
      maxAttendees: 6,
      currentAttendeesCount: count(o4Att),
      description: 'Five stops, five bites each. Come hungry, we split the bill evenly.',
      accessType: 'open',
      tags: ['All Plans', 'Group Hangouts', 'Food'],
      attendees: o4Att,
    },
    {
      ...base,
      id: 'demo-o-5',
      hostId: A.kevo.id,
      hostName: `@${A.kevo.username}`,
      hostAvatar: A.kevo.avatar,
      hostHandle: `@${A.kevo.username}`,
      spotTitle: 'Afrobeats Night Out',
      spotAddress: 'Kilimani, Nairobi',
      spotImage: IMG('photo-1470225620780-dba8ba36b745'),
      spotCategory: 'nightlife',
      date: dateOffset(8),
      time: '21:00',
      maxAttendees: 12,
      currentAttendeesCount: count(o5Att),
      description: 'Dance floor, good music and good company. Meet at the entrance at 9.',
      accessType: 'open',
      tags: ['All Plans', 'Group Hangouts', 'Nightlife'],
      attendees: o5Att,
    },
  ];
}
