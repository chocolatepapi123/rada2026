/**
 * Demo Mode data for the Socials "Rada" feed (asks): the swipe deck, "My asks", replies,
 * and the private chat that opens when a reply is accepted. Everything is local to the browser
 * and nothing is written to Supabase. All ids start with "demo-". Every person and post is fictional.
 *
 * Photos for the cards live in  public/demo/asks/<name>.jpg  (see the README.txt in that folder).
 * A card whose photo is missing simply shows the orange-to-green gradient, so nothing breaks.
 */
import type { Ask, AskReply, PlanHit } from '../lib/asks.ts';
import type { ChatConversation, ChatMessage } from '../types.ts';
import { DEMO_PEOPLE, DEMO_MY_ASK_BODY, DEMO_MY_ASK_ACCEPTED_REPLY, type DemoPerson } from './demoData.ts';

const person = (key: string): DemoPerson => DEMO_PEOPLE.find(p => p.key === key) as DemoPerson;
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const photo = (name: string) => `/demo/asks/${name}.jpg`;

/** True only if the file really exists and is an image (a missing file on Vercel returns the app page, not a 404). */
const probeCache = new Map<string, Promise<boolean>>();
function photoExists(url: string): Promise<boolean> {
  let p = probeCache.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then(r => r.ok && (r.headers.get('content-type') || '').startsWith('image/'))
      .catch(() => false);
    probeCache.set(url, p);
  }
  return p;
}

interface DeckSpec {
  n: number; by: string; body: string; area: string; img: string; hours: number; replies: number; trusted?: boolean;
  plan?: { kind: 'event' | 'spot'; ref: string; title: string };
}

// The three sample posts used in the commercial (Socials, Shot 2).
const DECK: DeckSpec[] = [
  { n: 1, by: 'otis', body: 'Nani ako kasa?', area: 'Kasarani', img: 'mzinga-kasarani', hours: 9, replies: 7, trusted: true },
  { n: 2, by: 'caro', body: 'Got an extra ticket for tonight. Who’s coming?', area: 'Westlands', img: 'extra-ticket', hours: 5, replies: 4,
    plan: { kind: 'event', ref: 'showcase-ev-sunset-rooftop', title: 'Sunset Rooftop Sessions' } },
  { n: 3, by: 'dennis', body: 'Looking for people to catch the game with.', area: 'Kilimani', img: 'catch-the-game', hours: 7, replies: 9 },
];

const MINE_BODY = DEMO_MY_ASK_BODY;
const MINE_IMG = 'hii-pekee-yangu';
const MINE_REPLIES: { key: string; msg: string; ago: number; status?: AskReply['status'] }[] = [
  { key: 'dennis', msg: DEMO_MY_ASK_ACCEPTED_REPLY, ago: 35, status: 'accepted' },
  { key: 'tito', msg: 'Hio Kenya Cane peke yako? Wacha nikusaidie 😂 Niko Kasarani, nakuja sasa hivi', ago: 22 },
  { key: 'vee', msg: 'Niko free after 6 😄 Nitaleta ice na juice ya nanasi', ago: 12 },
  { key: 'kevo', msg: 'Niko na FIFA, tunapiga mechi kadhaa 🎮', ago: 6 },
];

interface State {
  asks: Ask[];
  replies: Record<string, AskReply[]>;
  passed: Set<string>;
  replied: Set<string>;
  myId: string;
}
let state: Promise<State> | null = null;

function buildMine(id: string, body: string, area: string, media: Ask['media_url'], mediaType: Ask['media_type'], hours: number, plan?: { kind: 'event' | 'spot'; ref: string; title: string } | null, replyCount = 0): Ask {
  return {
    id, body, area, media_url: media, media_type: mediaType, created_at: minsAgo(40), expires_at: hours > 0 ? hoursFromNow(hours) : hoursFromNow(24),
    user_id: 'demo-guest-me', handle: null, avatar: null, verified: true, trusted: false, mine: true, replies: replyCount, replied: false,
    plan_kind: plan?.kind ?? null, plan_ref: plan?.ref ?? null, plan_title: plan?.title ?? null,
  };
}

function toReply(askId: string, key: string, msg: string, ago: number, status: AskReply['status'] = 'pending'): AskReply {
  const p = person(key);
  return { id: `demo-rep-${askId}-${key}`, user_id: p.id, handle: p.username, avatar: p.avatar, verified: true, message: msg, status, created_at: minsAgo(ago) };
}

async function init(): Promise<State> {
  const known = await Promise.all(DECK.map(d => photoExists(photo(d.img))));
  const mineImg = await photoExists(photo(MINE_IMG));
  const asks: Ask[] = DECK.map((d, i) => {
    const p = person(d.by);
    return {
      id: `demo-ask-${d.n}`, body: d.body, area: d.area,
      media_url: known[i] ? photo(d.img) : null, media_type: known[i] ? 'image' : null,
      created_at: minsAgo(15 + d.n * 11), expires_at: hoursFromNow(d.hours),
      user_id: p.id, handle: p.username, avatar: p.avatar, verified: true, trusted: Boolean(d.trusted), mine: false, replies: d.replies, replied: false,
      plan_kind: d.plan?.kind ?? null, plan_ref: d.plan?.ref ?? null, plan_title: d.plan?.title ?? null,
    } as Ask;
  });
  const mine = buildMine('demo-ask-mine-1', MINE_BODY, 'Kasarani', mineImg ? photo(MINE_IMG) : null, mineImg ? 'image' : null, 12, null, MINE_REPLIES.length);
  asks.push(mine);
  return {
    asks,
    replies: { [mine.id]: MINE_REPLIES.map(r => toReply(mine.id, r.key, r.msg, r.ago, r.status)) },
    passed: new Set(), replied: new Set(), myId: 'demo-guest-me',
  };
}
const ensure = () => (state ??= init());

// ---------------------------------------------------------------------------
// the functions lib/asks.ts calls while Demo Mode is on
// ---------------------------------------------------------------------------
export async function demoFetchAsks(area: string): Promise<Ask[]> {
  const s = await ensure();
  const a = area.trim().toLowerCase();
  return s.asks
    .filter(x => x.mine || !s.passed.has(x.id))
    .filter(x => !a || x.area.toLowerCase().includes(a))
    .map(x => ({ ...x, replied: s.replied.has(x.id), replies: x.mine ? (s.replies[x.id] || []).length : x.replies }));
}

export async function demoCreateAsk(body: string, area: string, expiresAt: Date, media?: { url: string; type: 'image' | 'video' } | null, plan?: { kind: 'event' | 'spot'; ref: string; title: string } | null): Promise<void> {
  const s = await ensure();
  const id = `demo-ask-mine-${Date.now()}`;
  const hours = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 3600000));
  const ask = buildMine(id, body.trim(), area.trim(), media?.url ?? null, media?.type ?? null, hours, plan ?? null, 2);
  ask.created_at = new Date().toISOString();
  ask.expires_at = expiresAt.toISOString();
  s.asks.unshift(ask);
  // two replies arrive so you can show "accept" right after posting
  s.replies[id] = [
    toReply(id, 'lulu', 'Niko keen! Count me in 🙌', 3),
    toReply(id, 'amani', 'Niko free! What time? 😄', 1),
  ];
}

export async function demoPassAsk(id: string): Promise<void> { (await ensure()).passed.add(id); }
export async function demoReplyToAsk(id: string): Promise<void> { (await ensure()).replied.add(id); }
export async function demoCloseAsk(id: string): Promise<void> {
  const s = await ensure();
  s.asks = s.asks.filter(a => a.id !== id);
}
export async function demoFetchReplies(id: string): Promise<AskReply[]> { return [...((await ensure()).replies[id] || [])]; }

// ---------------------------------------------------------------------------
// accepting a reply opens a private chat (pushed into the chat list by useSocialsCloud)
// ---------------------------------------------------------------------------
type ChatListener = (conv: ChatConversation) => void;
const chatListeners = new Set<ChatListener>();
export function onDemoAskChat(fn: ChatListener): () => void {
  chatListeners.add(fn);
  return () => { chatListeners.delete(fn); };
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export async function demoAcceptReply(replyId: string): Promise<{ chatId: string | null; error: string | null }> {
  const s = await ensure();
  for (const [askId, list] of Object.entries(s.replies)) {
    const r = list.find(x => x.id === replyId);
    if (!r) continue;
    r.status = 'accepted';
    const p = DEMO_PEOPLE.find(x => x.id === r.user_id);
    const ask = s.asks.find(a => a.id === askId);
    const chatId = `demo-dm-ask-${p?.key || replyId}`;
    const now = new Date().toISOString();
    const messages: ChatMessage[] = [
      { id: `${chatId}-m0`, sender: 'system', text: `Chat opened from your ask: “${ask?.body || ''}”`, time: clock(now) },
      { id: `${chatId}-m1`, sender: 'them', text: r.message, time: clock(now) },
    ];
    const conv: ChatConversation = { id: chatId, name: `@${r.handle}`, avatar: r.avatar || '', type: 'direct', lastMessage: r.message, messages };
    (conv as any).lastMessageAt = now;
    if (p) (conv as any).otherUserId = p.id;
    chatListeners.forEach(fn => fn(conv));
    return { chatId, error: null };
  }
  return { chatId: null, error: 'Could not open the chat.' };
}

export async function demoDeclineReply(replyId: string): Promise<void> {
  const s = await ensure();
  for (const list of Object.values(s.replies)) {
    const r = list.find(x => x.id === replyId);
    if (r) r.status = 'declined';
  }
}

// ---------------------------------------------------------------------------
// "Link a plan" search in the ask composer
// ---------------------------------------------------------------------------
const PLAN_HITS: PlanHit[] = [
  { kind: 'event', ref: 'rada-featured-black-coffee-2026', title: 'Black Coffee LIVE • MUZE Open Air', subtitle: 'Muze Club Nairobi (MUZE Open Air)' },
  { kind: 'event', ref: 'rada-featured-ferre-gola-2026', title: 'Ferre Gola LIVE | Dala Festival', subtitle: 'ASK Arena (Nairobi Showground), Nairobi' },
  { kind: 'event', ref: 'rada-featured-rong-experience-2026', title: 'The Rong Experience 2026 • Wakadinali Live', subtitle: 'Kastemill Gardens, Seasons Road, Kasarani' },
  { kind: 'event', ref: 'rada-featured-konshens-2026', title: 'Dancehall Detention – Konshens LIVE', subtitle: 'Sarit Expo Centre, Westlands, Nairobi' },
  { kind: 'event', ref: 'showcase-ev-sunset-rooftop', title: 'Sunset Rooftop Sessions', subtitle: 'The Alchemist, Westlands' },
  { kind: 'event', ref: 'showcase-ev-jazz-in-the-park', title: 'Jazz in the Park', subtitle: 'Karura Forest Picnic Lawn' },
  { kind: 'event', ref: 'showcase-ev-comedy-night', title: 'Laugh Factory: Stand-up Night', subtitle: 'Alliance Française, Loita St' },
  { kind: 'event', ref: 'showcase-ev-food-festival', title: 'Taste of Nairobi Food Fest', subtitle: 'Two Rivers Mall Grounds' },
  { kind: 'event', ref: 'showcase-ev-run-club-5k', title: 'Saturday Social 5K', subtitle: 'Uhuru Gardens' },
];
export function demoSearchPlans(q: string): PlanHit[] {
  const t = q.trim().toLowerCase();
  return PLAN_HITS.filter(h => h.title.toLowerCase().includes(t) || (h.subtitle || '').toLowerCase().includes(t));
}
