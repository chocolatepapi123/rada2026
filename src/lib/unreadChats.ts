import { useSyncExternalStore } from 'react';
import type { ChatConversation } from '../types.ts';

/**
 * Unread-chat counter for the Socials tab badge.
 * A chat is unread when its newest message is from someone else and is newer than
 * the last time this user opened that chat. "Seen" times are stored per user on the device.
 * The first time a user's chats load, everything already there counts as read.
 */

const storeKey = (uid: string) => `rada_chat_seen_v1:${uid}`;

let currentUid: string | null = null;
let seen: Record<string, number> = {};
let seeded = false;
let count = 0;
let lastConvs: ChatConversation[] = [];
const listeners = new Set<() => void>();

const stampOf = (c: ChatConversation): number => {
  const raw = (c as any).lastMessageAt;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : 0;
};

const lastIsFromOthers = (c: ChatConversation): boolean => {
  const msgs = c.messages || [];
  return msgs.length > 0 && msgs[msgs.length - 1].sender === 'them';
};

const load = (uid: string) => {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    seen = parsed?.seen && typeof parsed.seen === 'object' ? parsed.seen : {};
    seeded = Boolean(parsed?.seeded);
  } catch {
    seen = {};
    seeded = false;
  }
};

const persist = () => {
  if (!currentUid) return;
  try {
    localStorage.setItem(storeKey(currentUid), JSON.stringify({ seeded, seen }));
  } catch {}
};

const recount = () => {
  const next = lastConvs.filter(c => lastIsFromOthers(c) && stampOf(c) > (seen[c.id] ?? 0)).length;
  if (next !== count) {
    count = next;
    listeners.forEach(l => l());
  }
};

/** Call whenever the conversation list changes. Pass userId = undefined for guests / demo. */
export function syncUnreadChats(userId: string | undefined, conversations: ChatConversation[], loaded: boolean) {
  if (!userId) {
    currentUid = null;
    seen = {};
    seeded = false;
    lastConvs = [];
    recount();
    return;
  }
  if (currentUid !== userId) {
    currentUid = userId;
    load(userId);
  }
  lastConvs = conversations;
  if (!seeded && loaded) {
    conversations.forEach(c => {
      seen[c.id] = stampOf(c);
    });
    seeded = true;
    persist();
  }
  recount();
}

/** Call while a chat is open (and whenever it gets a new message). */
export function markChatRead(conv: ChatConversation) {
  if (!currentUid) return;
  const t = stampOf(conv);
  if (!t || (seen[conv.id] ?? 0) >= t) return;
  seen[conv.id] = t;
  persist();
  recount();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Number of chats with something unread. */
export function useUnreadChatCount(): number {
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
