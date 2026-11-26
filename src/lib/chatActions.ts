import type { ChatConversation, ChatMessage } from '../types.ts';

export const EDIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const DELETE_FOR_EVERYONE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export function getMessageTimestampMs(msg: Partial<ChatMessage> & { createdAt?: string }): number | null {
  if (!msg?.createdAt) return null;
  const ms = Date.parse(msg.createdAt);
  return Number.isFinite(ms) ? ms : null;
}

export function isDateAcceptedText(text?: string): boolean {
  if (!text) return false;
  return /^Date accepted:\s*.+/i.test(text.trim());
}

/**
 * Only own plain text messages without attachments or date cards can be edited,
 * and only within 10 minutes of sending.
 */
export function canEditMessage(
  msg: ChatMessage | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!msg) return false;
  if (msg.sender !== 'me') return false;
  if (!msg.text || !msg.text.trim()) return false;
  if (msg.audioUrl || msg.videoUrl || msg.videoNoteUrl || (msg.photos && msg.photos.length > 0)) return false;
  if (msg.dateInvite || isDateAcceptedText(msg.text)) return false;
  const ts = getMessageTimestampMs(msg);
  if (ts === null) return false;
  const age = nowMs - ts;
  return age >= -60_000 && age <= EDIT_WINDOW_MS;
}

/**
 * Delete for everyone only applies to own messages within 12 hours of sending.
 * Keep this rule internal — never surface the duration in the UI.
 */
export function canDeleteForEveryone(
  msg: ChatMessage | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!msg) return false;
  if (msg.sender !== 'me') return false;
  const ts = getMessageTimestampMs(msg);
  if (ts === null) return false;
  const age = nowMs - ts;
  return age >= -60_000 && age <= DELETE_FOR_EVERYONE_WINDOW_MS;
}

export function canDeleteAllForEveryone(
  msgs: ChatMessage[],
  nowMs: number = Date.now()
): boolean {
  if (!msgs || msgs.length === 0) return false;
  return msgs.every((m) => canDeleteForEveryone(m, nowMs));
}

export function formatMessagesForCopy(msgs: ChatMessage[], chatName?: string): string {
  const clean = msgs.filter((m) => m.sender !== 'system');
  if (clean.length === 0) return '';
  if (clean.length === 1) {
    const m = clean[0];
    if (m.text) return m.text;
    if (m.dateInvite) return `Date invitation: ${m.dateInvite.spotTitle} (${m.dateInvite.date} at ${m.dateInvite.time})`;
    return '';
  }
  return clean
    .map((m) => {
      const who = m.sender === 'me' ? 'You' : ((m as any).senderHandle || chatName || 'Member');
      const body =
        m.text ||
        (m.dateInvite
          ? `Date invitation: ${m.dateInvite.spotTitle} (${m.dateInvite.date} at ${m.dateInvite.time})`
          : m.photos?.length
          ? '[Photo]'
          : '[Media]');
      return `[${m.time}] ${who}: ${body}`;
    })
    .join('\n');
}

export interface ChatLocalPrefs {
  pinnedIds: string[];
  mutedIds: string[];
  hiddenMessageIds: string[];
  deletedChatsAfter: Record<string, number>;
}

const EMPTY_PREFS: ChatLocalPrefs = {
  pinnedIds: [],
  mutedIds: [],
  hiddenMessageIds: [],
  deletedChatsAfter: {},
};

const prefsKey = (uid?: string) => `rada_chat_prefs_v1:${uid || 'guest'}`;

export function loadChatLocalPrefs(uid?: string): ChatLocalPrefs {
  if (typeof window === 'undefined' || !window.localStorage) return { ...EMPTY_PREFS, deletedChatsAfter: {} };
  try {
    const raw = window.localStorage.getItem(prefsKey(uid));
    if (!raw) return { ...EMPTY_PREFS, deletedChatsAfter: {} };
    const parsed = JSON.parse(raw);
    return {
      pinnedIds: Array.isArray(parsed?.pinnedIds) ? parsed.pinnedIds.map(String) : [],
      mutedIds: Array.isArray(parsed?.mutedIds) ? parsed.mutedIds.map(String) : [],
      hiddenMessageIds: Array.isArray(parsed?.hiddenMessageIds) ? parsed.hiddenMessageIds.map(String) : [],
      deletedChatsAfter:
        parsed?.deletedChatsAfter && typeof parsed.deletedChatsAfter === 'object' ? parsed.deletedChatsAfter : {},
    };
  } catch {
    return { ...EMPTY_PREFS, deletedChatsAfter: {} };
  }
}

export function saveChatLocalPrefs(uid: string | undefined, prefs: ChatLocalPrefs): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(prefsKey(uid), JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

export function isChatHiddenLocally(
  conv: ChatConversation,
  deletedChatsAfter: Record<string, number>
): boolean {
  const deletedAt = deletedChatsAfter[conv.id];
  if (!deletedAt) return false;
  const raw = (conv as any).lastMessageAt;
  const stamp = raw ? Date.parse(raw) : NaN;
  if (Number.isFinite(stamp) && stamp > deletedAt) return false;
  return true;
}
