import { useSyncExternalStore } from 'react';
import type { ChatConversation } from '../types.ts';

/**
 * Unread-chat counter for the Socials tab badge.
 * A chat is unread when its newest message is from someone else and is newer than
 * the last time this user opened that chat, or when the user explicitly marks it unread.
 */

const storeKey = (uid: string) => `rada_chat_seen_v1:${uid}`;

let currentUid: string | null = null;
let seen: Record<string, number> = {};
let manualUnread: Record<string, boolean> = {};
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
    manualUnread = parsed?.manualUnread && typeof parsed.manualUnread === 'object' ? parsed.manualUnread : {};
    seeded = Boolean(parsed?.seeded);
  } catch {
    seen = {};
    manualUnread = {};
    seeded = false;
  }
};

const persist = () => {
  if (!currentUid) return;
  try {
    localStorage.setItem(storeKey(currentUid), JSON.stringify({ seeded, seen, manualUnread }));
  } catch {}
};

const notify = () => {
  listeners.forEach(l => l());
};

const recount = (forceNotify = false) => {
  const next = lastConvs.filter(c => isChatUnread(c)).length;
  if (next !== count) {
    count = next;
    notify();
  } else if (forceNotify) {
    notify();
  }
};

/** Call whenever the conversation list changes. Pass userId = undefined for guests. */
export function syncUnreadChats(userId: string | undefined, conversations: ChatConversation[], loaded: boolean) {
  if (!userId) {
    currentUid = null;
    seen = {};
    manualUnread = {};
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
  const hadManual = Boolean(manualUnread[conv.id]);
  const needsSeen = Boolean(t && (seen[conv.id] ?? 0) < t);
  if (!hadManual && !needsSeen) return;
  if (hadManual) delete manualUnread[conv.id];
  if (needsSeen) seen[conv.id] = t;
  persist();
  recount(true);
}

export function markChatsRead(convs: ChatConversation[]) {
  if (!currentUid || !convs.length) return;
  let changed = false;
  for (const conv of convs) {
    const t = stampOf(conv) || Date.now();
    if (manualUnread[conv.id]) {
      delete manualUnread[conv.id];
      changed = true;
    }
    if ((seen[conv.id] ?? 0) < t) {
      seen[conv.id] = t;
      changed = true;
    }
  }
  if (changed) {
    persist();
    recount(true);
  }
}

export function markChatsUnread(convs: ChatConversation[]) {
  if (!currentUid || !convs.length) return;
  for (const conv of convs) {
    manualUnread[conv.id] = true;
  }
  persist();
  recount(true);
}

/** True when this one chat has something new from the other person or was manually marked unread. */
export function isChatUnread(conv: ChatConversation): boolean {
  if (!currentUid) return false;
  if (manualUnread[conv.id]) return true;
  return lastIsFromOthers(conv) && stampOf(conv) > (seen[conv.id] ?? 0);
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
