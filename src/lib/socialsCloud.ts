import { supabase, isSupabaseConfigured } from './supabase';
import type { ChatConversation, ChatMessage } from '../types.ts';

/**
 * Real, shared Socials backend (chats, match requests, search, group chats).
 * Everything here runs through Supabase tables protected by row-level security:
 * people only ever read conversations they are a member of, and only ever see
 * other members' @username, avatar and bio (never email or phone).
 */

export const PLACEHOLDER_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop';

export interface CloudMember {
  userId: string;
  handle: string;
  avatar: string;
}

export interface CloudRequest {
  id: string;
  fromUser: string;
  toUser: string;
  fromHandle: string;
  fromAvatar: string;
  toHandle: string;
  toAvatar: string;
  status: 'pending' | 'accepted' | 'declined';
  conversationId?: string | null;
  createdAt: string;
}

export interface CloudProfileHit {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  relationship_status: string | null;
  is_liveness_verified: boolean;
}

export interface CloudSnapshot {
  conversations: ChatConversation[];
  requests: CloudRequest[];
}

const timeLabel = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const cleanHandle = (h?: string | null): string => {
  const v = String(h || '').trim().replace(/^@+/, '');
  return v ? `@${v}` : '';
};

export const isCloudReady = (): boolean => Boolean(isSupabaseConfigured && supabase);

/** Row from `messages` -> the ChatMessage the UI already knows how to draw. */
export function rowToMessage(row: any, myId: string): ChatMessage {
  const media = row.media || {};
  const kind: string = row.kind || 'text';
  const msg: ChatMessage = {
    id: row.id,
    sender: kind === 'system' ? 'system' : row.sender_id === myId ? 'me' : 'them',
    text: row.content || '',
    time: timeLabel(row.created_at),
  };
  if (row.sender_id !== myId && row.sender_handle) (msg as any).senderHandle = row.sender_handle;
  if (row.reply_to) msg.replyTo = row.reply_to;
  if (kind === 'voice' || kind === 'audio') {
    msg.audioUrl = media.url;
    msg.audioDuration = media.duration;
  } else if (kind === 'video_note') {
    msg.videoNoteUrl = media.url;
    msg.videoDuration = media.duration;
  } else if (kind === 'video') {
    msg.videoUrl = media.url;
    msg.videoDuration = media.duration;
  } else if (kind === 'photo') {
    msg.photos = Array.isArray(media.photos) ? media.photos : [];
  } else if (kind === 'date_invite') {
    msg.dateInvite = media.dateInvite;
  }
  return msg;
}

function previewFor(row: any): string {
  const kind = row.kind || 'text';
  if (kind === 'voice' || kind === 'audio') return '🎙️ Voice note';
  if (kind === 'video_note') return '📹 Video note';
  if (kind === 'video') return '🎥 Video';
  if (kind === 'photo') return '📷 Photo';
  if (kind === 'date_invite') return row.content || 'Date invitation';
  return row.content || '';
}

/** Load every conversation I belong to, with members and recent messages, plus my match requests. */
export async function fetchSnapshot(myId: string): Promise<CloudSnapshot> {
  if (!isCloudReady() || !myId) return { conversations: [], requests: [] };

  const [convRes, memRes, reqRes] = await Promise.all([
    supabase.from('conversations').select('*').order('last_message_at', { ascending: false }),
    supabase.from('conversation_members').select('conversation_id, user_id, user_handle, user_avatar'),
    supabase.from('match_requests').select('*').order('created_at', { ascending: false }),
  ]);

  const convRows: any[] = convRes.data || [];
  const memRows: any[] = memRes.data || [];

  const ids = convRows.map(c => c.id);
  let msgRows: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(400);
    msgRows = (data || []).slice().reverse();
  }

  const conversations: ChatConversation[] = convRows.map(c => {
    const members: CloudMember[] = memRows
      .filter(m => m.conversation_id === c.id)
      .map(m => ({ userId: m.user_id, handle: cleanHandle(m.user_handle), avatar: m.user_avatar || PLACEHOLDER_AVATAR }));
    const others = members.filter(m => m.userId !== myId);
    const other = others[0];
    const isDirect = c.type === 'direct';
    const msgs = msgRows.filter(m => m.conversation_id === c.id).map(m => rowToMessage(m, myId));
    const lastRow = [...msgRows].reverse().find(m => m.conversation_id === c.id);
    const conv: ChatConversation = {
      id: c.id,
      name: isDirect ? other?.handle || 'Member' : c.name || 'Group chat',
      avatar: isDirect ? other?.avatar || PLACEHOLDER_AVATAR : c.avatar || PLACEHOLDER_AVATAR,
      type: isDirect ? 'direct' : 'group',
      lastMessage: lastRow ? previewFor(lastRow) : c.last_message || '',
      theme: c.theme || undefined,
      members: isDirect ? undefined : members.map(m => m.handle).filter(Boolean),
      messages: msgs,
      outingId: c.outing_id || undefined,
      outingTitle: c.outing_title || undefined,
      isTemporary: Boolean(c.is_temporary),
    };
    (conv as any).lastMessageAt = c.last_message_at;
    (conv as any).otherUserId = other?.userId;
    return conv;
  });

  const requests: CloudRequest[] = (reqRes.data || []).map((r: any) => ({
    id: r.id,
    fromUser: r.from_user,
    toUser: r.to_user,
    fromHandle: cleanHandle(r.from_handle),
    fromAvatar: r.from_avatar || PLACEHOLDER_AVATAR,
    toHandle: cleanHandle(r.to_handle),
    toAvatar: r.to_avatar || PLACEHOLDER_AVATAR,
    status: r.status,
    conversationId: r.conversation_id,
    createdAt: r.created_at,
  }));

  return { conversations, requests };
}

/** Full history for one chat (used when it is opened). */
export async function fetchMessages(conversationId: string, myId: string): Promise<ChatMessage[]> {
  if (!isCloudReady()) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map(r => rowToMessage(r, myId));
}

export interface OutgoingMessage {
  kind: 'text' | 'voice' | 'audio' | 'video_note' | 'video' | 'photo' | 'date_invite';
  content?: string;
  media?: Record<string, any>;
  replyTo?: { id: string; sender: string; text: string } | null;
  clientId?: string;
}

export async function sendMessage(
  conversationId: string,
  myId: string,
  myHandle: string,
  msg: OutgoingMessage
): Promise<{ row: any | null; error: string | null }> {
  if (!isCloudReady()) return { row: null, error: 'You are offline. Try again when you are back online.' };
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      client_id: msg.clientId || `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender_id: myId,
      sender_handle: cleanHandle(myHandle),
      kind: msg.kind,
      content: msg.content || '',
      media: msg.media || null,
      reply_to: msg.replyTo || null,
    })
    .select('*')
    .single();
  if (error) return { row: null, error: error.message };
  return { row: data, error: null };
}

/** Upload a recorded/picked file to the rada-media bucket and return its public URL. */
export async function uploadChatMedia(
  myId: string,
  blobOrFile: Blob,
  ext: string
): Promise<{ url: string | null; error: string | null }> {
  if (!isCloudReady()) return { url: null, error: 'Not connected' };
  const safeExt = (ext || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const path = `${myId}/chat/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage
    .from('rada-media')
    .upload(path, blobOrFile, { contentType: blobOrFile.type || undefined, upsert: false });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from('rada-media').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/** Convert a data: URL (photo picked in the composer) into a Blob. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export function extFromMime(mime: string, fallback: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('m4a')) return 'mp4';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('quicktime')) return 'mov';
  return fallback;
}

// ---------------------------------------------------------------------------
// Search + match requests
// ---------------------------------------------------------------------------

export async function searchProfiles(query: string, limit = 20): Promise<CloudProfileHit[]> {
  if (!isCloudReady()) return [];
  const q = String(query || '').trim().replace(/^@/, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_profiles', { p_query: q, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data || []) as CloudProfileHit[];
}

/** Verified singles for the Discover swipe deck (same function, wider net, filtered client-side). */
export async function fetchDiscoverPool(letters: string[] = ['a', 'e', 'i', 'o', 'u']): Promise<CloudProfileHit[]> {
  if (!isCloudReady()) return [];
  const seen = new Map<string, CloudProfileHit>();
  const results = await Promise.all(letters.map(l => searchProfiles(l, 30).catch(() => [] as CloudProfileHit[])));
  results.flat().forEach(p => {
    if (!seen.has(p.id)) seen.set(p.id, p);
  });
  return [...seen.values()].filter(
    p => String(p.relationship_status || '').toLowerCase() === 'single' && p.is_liveness_verified
  );
}

export async function sendMatchRequest(
  toUserId: string
): Promise<{ status: 'sent' | 'already_sent' | 'matched' | 'error'; conversationId?: string; error?: string }> {
  if (!isCloudReady()) return { status: 'error', error: 'You are offline.' };
  const { data, error } = await supabase.rpc('send_match_request', { p_to: toUserId });
  if (error) return { status: 'error', error: error.message.replace(/^.*?:\s*/, '') };
  return { status: (data?.status as any) || 'sent', conversationId: data?.conversation_id };
}

export async function respondMatchRequest(
  requestId: string,
  accept: boolean
): Promise<{ conversationId: string | null; error: string | null }> {
  if (!isCloudReady()) return { conversationId: null, error: 'You are offline.' };
  const { data, error } = await supabase.rpc('respond_match_request', { p_id: requestId, p_accept: accept });
  if (error) return { conversationId: null, error: error.message };
  return { conversationId: (data as string) || null, error: null };
}

// ---------------------------------------------------------------------------
// Group chats
// ---------------------------------------------------------------------------

export async function createGroupChat(
  name: string,
  handles: string[],
  avatar?: string
): Promise<{ id: string | null; missing: string[]; error: string | null }> {
  if (!isCloudReady()) return { id: null, missing: [], error: 'You are offline.' };
  const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.rpc('create_group_chat', {
    p_id: id,
    p_name: name,
    p_avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop',
    p_handles: handles.map(h => h.replace(/^@/, '').toLowerCase()),
  });
  if (error) return { id: null, missing: [], error: error.message };
  return { id, missing: (data?.missing as string[]) || [], error: null };
}

/** Host-only: creates (or refreshes) the temporary group chat for an outing and adds every approved guest. */
export async function unlockOutingChat(outingId: string): Promise<{ id: string | null; error: string | null }> {
  if (!isCloudReady()) return { id: null, error: 'You are offline.' };
  const { data, error } = await supabase.rpc('unlock_outing_chat', { p_outing_id: outingId });
  if (error) return { id: null, error: error.message };
  return { id: (data as string) || null, error: null };
}

// ---------------------------------------------------------------------------
// Realtime: any change to my messages / chats / requests triggers onChange.
// RLS applies to realtime too, so only rows I am allowed to read are delivered.
// ---------------------------------------------------------------------------

export function subscribeSocials(
  myId: string,
  handlers: {
    onMessage: (row: any) => void;
    onStructure: () => void;
  }
): () => void {
  if (!isCloudReady() || !myId) return () => {};
  const channel = supabase
    .channel(`socials-${myId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload =>
      handlers.onMessage(payload.new)
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => handlers.onStructure())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members' }, () =>
      handlers.onStructure()
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, () => handlers.onStructure())
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}
