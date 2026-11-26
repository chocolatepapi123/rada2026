import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatConversation, ChatMessage } from '../types.ts';
import { logPlatformEvent } from './platformAnalytics';
import {
  PLACEHOLDER_AVATAR,
  CloudRequest,
  OutgoingMessage,
  createGroupChat,
  deleteMessagesForEveryoneRows,
  editMessageRow,
  fetchMessages,
  fetchSnapshot,
  isCloudReady,
  respondMatchRequest,
  rowToMessage,
  sendMatchRequest,
  sendMessage as sendMessageRow,
  subscribeSocials,
  unlockOutingChat,
} from './socialsCloud';
import { canDeleteAllForEveryone, canEditMessage } from './chatActions';
import { isDemoMode } from './demoMode';
import { syncUnreadChats } from './unreadChats';
import { fetchBlockedIds, getCachedBlockedIds, onBlockedChanged } from './safety';
import {
  DEMO_PEOPLE,
  buildDemoConversations,
  buildDemoOutings,
  buildDemoRequests,
  buildGroupConversation,
  buildDirectConversation,
  buildOutingConversation,
  demoReplyFor,
  getDemoPerson,
} from '../data/demoData';
import { onDemoAskChat } from '../data/demoAsks';

const previewOf = (m: OutgoingMessage): string => {
  switch (m.kind) {
    case 'voice':
    case 'audio':
      return 'Voice note';
    case 'video_note':
      return 'Video note';
    case 'video':
      return 'Video';
    case 'photo':
      return 'Photo';
    default:
      return m.content || '';
  }
};

/**
 * Real chats for the signed-in user.
 * Pass userId = undefined for guests (everything stays empty).
 */
export function useSocialsCloud(userId: string | undefined, myHandle: string) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [requests, setRequests] = useState<CloudRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const uidRef = useRef<string | undefined>(userId);
  const handleRef = useRef(myHandle);
  handleRef.current = myHandle;
  uidRef.current = userId;

  const demo = isDemoMode();

  // People this user has blocked: their DMs, requests and group messages are hidden.
  const [blockedIds, setBlockedIds] = useState<string[]>(() => getCachedBlockedIds());
  useEffect(() => {
    if (!userId || demo) return;
    let alive = true;
    fetchBlockedIds().then(ids => { if (alive) setBlockedIds(ids); });
    const off = onBlockedChanged(() => setBlockedIds(getCachedBlockedIds()));
    return () => { alive = false; off(); };
  }, [userId, demo]);
  const visibleConversations = useMemo(() => {
    if (!blockedIds.length) return conversations;
    const blocked = new Set(blockedIds);
    return conversations
      .filter(c => !(c.type === 'direct' && blocked.has((c as any).otherUserId)))
      .map(c =>
        c.type === 'direct'
          ? c
          : { ...c, messages: (c.messages || []).filter(m => !blocked.has((m as any).senderId)) }
      );
  }, [conversations, blockedIds]);
  // feeds the unread badge on the Socials tab
  useEffect(() => {
    syncUnreadChats(demo ? `demo-${userId || 'guest'}` : userId, visibleConversations, loaded);
  }, [demo, userId, visibleConversations, loaded]);
  const visibleRequests = useMemo(() => {
    if (!blockedIds.length) return requests;
    const blocked = new Set(blockedIds);
    return requests.filter(r => !blocked.has(r.fromUser) && !blocked.has(r.toUser));
  }, [requests, blockedIds]);

  const refresh = useCallback(async () => {
    if (demo) return; // Demo Mode keeps everything local
    const uid = uidRef.current;
    if (!uid || !isCloudReady()) return;
    try {
      const snap = await fetchSnapshot(uid);
      if (uidRef.current !== uid) return; // account switched while loading
      setConversations(prev => {
        // keep any messages still being sent so they don't flicker away
        const pending = new Map<string, ChatMessage[]>();
        prev.forEach(c => {
          const p = c.messages.filter(m => (m as any).pending);
          if (p.length) pending.set(c.id, p);
        });
        return snap.conversations.map(c => {
          const p = pending.get(c.id);
          return p ? { ...c, messages: [...c.messages, ...p] } : c;
        });
      });
      setRequests(snap.requests);
      setLoadError(null);
      setLoaded(true);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load chats');
    }
  }, []);

  // load + realtime + safety-net refresh when the app comes back to the foreground
  useEffect(() => {
    setConversations([]);
    setRequests([]);
    setLoaded(false);
    if (demo) return; // seeded by the Demo Mode effect below
    if (!userId || !isCloudReady()) return;
    refresh();

    let timer: any = null;
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refresh(), 400);
    };

    const unsub = subscribeSocials(userId, {
      onStructure: scheduleRefresh,
      onMessage: row => {
        const myId = uidRef.current;
        if (!myId) return;
        let known = false;
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === row.conversation_id);
          if (idx < 0) return prev;
          known = true;
          const conv = prev[idx];
          // already have it (our own optimistic copy or a duplicate event)
          const dupIdx = conv.messages.findIndex(
            m => m.id === row.id || ((m as any).clientId && (m as any).clientId === row.client_id)
          );
          const mapped = rowToMessage(row, myId);
          const nextMsgs =
            dupIdx >= 0 ? conv.messages.map((m, i) => (i === dupIdx ? mapped : m)) : [...conv.messages, mapped];
          const updated: ChatConversation = {
            ...conv,
            messages: nextMsgs,
            lastMessage:
              row.kind === 'text' || row.kind === 'system' || row.kind === 'date_invite'
                ? row.content || conv.lastMessage
                : previewOf({ kind: row.kind, content: row.content }),
          };
          (updated as any).lastMessageAt = row.created_at;
          const rest = prev.filter((_, i) => i !== idx);
          return [updated, ...rest];
        });
        // message in a chat we don't know yet (just added to a group): pull the full list
        if (!known) scheduleRefresh();
      },
      onMessageUpdate: row => {
        const myId = uidRef.current;
        if (!myId || !row?.id) return;
        setConversations(prev =>
          prev.map(conv => {
            if (conv.id !== row.conversation_id) return conv;
            const mapped = rowToMessage(row, myId);
            const nextMsgs = conv.messages.map(m => (m.id === row.id ? mapped : m));
            const last = nextMsgs[nextMsgs.length - 1];
            return {
              ...conv,
              messages: nextMsgs,
              lastMessage: last ? last.text || conv.lastMessage : conv.lastMessage,
            };
          })
        );
      },
      onMessageDelete: oldRow => {
        if (!oldRow?.id) return;
        setConversations(prev =>
          prev.map(conv => {
            if (!conv.messages.some(m => m.id === oldRow.id)) return conv;
            const nextMsgs = conv.messages.filter(m => m.id !== oldRow.id);
            const last = nextMsgs[nextMsgs.length - 1];
            const lastPreview = last
              ? last.text || (last.audioUrl ? 'Voice note' : last.videoNoteUrl ? 'Video note' : last.videoUrl ? 'Video' : last.photos?.length ? 'Photo' : '')
              : '';
            return { ...conv, messages: nextMsgs, lastMessage: lastPreview };
          })
        );
      },
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 45000);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      unsub();
    };
  }, [userId, refresh]);

  // Demo Mode: seed mock chats + requests (re-seeds only if the signed-in id or handle changes)
  useEffect(() => {
    if (!demo || !userId) return;
    setConversations(buildDemoConversations(userId, myHandle));
    setRequests(buildDemoRequests(userId, myHandle));
    setLoaded(true);
  }, [demo, userId, myHandle]);

  // Demo Mode: accepting a reply on the Rada feed opens a private chat
  useEffect(() => {
    if (!demo) return;
    return onDemoAskChat(conv => setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]));
  }, [demo]);

  /** Full history when a chat is opened (the list only carries the most recent messages). */
  const loadHistory = useCallback(async (conversationId: string) => {
    if (demo) return;
    const uid = uidRef.current;
    if (!uid) return;
    try {
      const msgs = await fetchMessages(conversationId, uid);
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== conversationId) return c;
          const pend = c.messages.filter(m => (m as any).pending);
          return { ...c, messages: [...msgs, ...pend] };
        })
      );
    } catch {
      /* the list already has recent messages; ignore */
    }
  }, []);

  /** Optimistic send. Resolves with an error string, or null on success. */
  const sendMessage = useCallback(async (conversationId: string, msg: OutgoingMessage): Promise<string | null> => {
    const uid = uidRef.current;
    if (!uid) return 'Sign in to send messages.';
    const clientId = msg.clientId || `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mediaUrl = msg.media?.url as string | undefined;
    const nowIso = new Date().toISOString();
    const optimistic: ChatMessage & { pending?: boolean; clientId?: string } = {
      id: `tmp-${clientId}`,
      sender: 'me',
      text: msg.content || '',
      time: new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      replyTo: msg.replyTo || undefined,
      pending: true,
      clientId,
      ...(msg.kind === 'voice' || msg.kind === 'audio' ? { audioUrl: mediaUrl, audioDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'video_note' ? { videoNoteUrl: mediaUrl, videoDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'video' ? { videoUrl: mediaUrl, videoDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'photo' ? { photos: msg.media?.photos || [] } : {}),
      ...(msg.kind === 'date_invite' ? { dateInvite: msg.media?.dateInvite } : {}),
    };
    if (demo) {
      const sent: ChatMessage = { ...optimistic, id: `demo-msg-${clientId}` };
      delete (sent as any).pending;
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx < 0) return prev;
        const conv = prev[idx];
        const updated = { ...conv, messages: [...conv.messages, sent], lastMessage: previewOf(msg) || conv.lastMessage };
        (updated as any).lastMessageAt = nowIso;
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
      // scripted reply so the chat feels alive on camera
      setTimeout(() => {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === conversationId);
          if (idx < 0) return prev;
          const conv = prev[idx];
          const reply = demoReplyFor(conv, handleRef.current);
          if (!reply) return prev;
          const replyIso = new Date().toISOString();
          const incoming: ChatMessage = {
            id: `demo-reply-${Date.now()}`,
            sender: 'them',
            text: reply.text,
            time: new Date(replyIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: replyIso,
          };
          if (reply.senderHandle) (incoming as any).senderHandle = reply.senderHandle;
          const updated = { ...conv, messages: [...conv.messages, incoming], lastMessage: reply.text };
          (updated as any).lastMessageAt = replyIso;
          return [updated, ...prev.filter((_, i) => i !== idx)];
        });
      }, 1500);
      return null;
    }

    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === conversationId);
      if (idx < 0) return prev;
      const conv = prev[idx];
      const updated = { ...conv, messages: [...conv.messages, optimistic], lastMessage: previewOf(msg) || conv.lastMessage };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });

    const { row, error } = await sendMessageRow(conversationId, uid, handleRef.current, { ...msg, clientId });
    if (error || !row) {
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, messages: c.messages.filter(m => m.id !== optimistic.id) } : c
        )
      );
      return error || 'Message failed to send';
    }
    logPlatformEvent('message_sent');
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        // realtime may already have swapped the optimistic copy for the real row
        const hasReal = c.messages.some(m => m.id === row.id);
        const msgs = hasReal
          ? c.messages.filter(m => m.id !== optimistic.id)
          : c.messages.map(m => (m.id === optimistic.id ? rowToMessage(row, uid) : m));
        return { ...c, messages: msgs };
      })
    );
    return null;
  }, []);

  const openDirectChat = useCallback(
    async (person: { id: string; handle: string; avatar?: string }): Promise<{ id: string | null; error: string | null }> => {
      const existing = conversations.find(
        c => c.type === 'direct' && ((c as any).otherUserId === person.id || c.name.toLowerCase() === `@${person.handle.replace(/^@/, '').toLowerCase()}`)
      );
      if (existing) return { id: existing.id, error: null };

      if (demo || !isCloudReady()) {
        const cleanHandle = person.handle.startsWith('@') ? person.handle : `@${person.handle}`;
        const known = getDemoPerson(person.id);
        const conv: ChatConversation = known
          ? buildDirectConversation(known)
          : {
              id: `dm-${person.id}`,
              name: cleanHandle,
              avatar: person.avatar || PLACEHOLDER_AVATAR,
              type: 'direct',
              lastMessage: 'Start planning a hangout or say hi!',
              messages: [],
            };
        (conv as any).otherUserId = person.id;
        (conv as any).lastMessageAt = new Date().toISOString();
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
        return { id: conv.id, error: null };
      }

      const res = await sendMatchRequest(person.id);
      if (res.conversationId) {
        await refresh();
        return { id: res.conversationId, error: null };
      }
      return { id: null, error: res.error || 'Could not start a direct chat right now.' };
    },
    [conversations, demo, refresh]
  );

  const sendRequest = useCallback(
    async (
      toUserId: string
    ): Promise<{ status: 'sent' | 'already_sent' | 'matched' | 'error'; conversationId?: string; error?: string }> => {
      if (demo) {
        const uid = uidRef.current;
        const person = getDemoPerson(toUserId);
        if (!uid || !person) return { status: 'error', error: 'Demo profile not found.' };
        const conv = buildDirectConversation(person);
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
        return { status: 'matched', conversationId: conv.id };
      }
      const res = await sendMatchRequest(toUserId);
      if (res.status !== 'error') refresh();
      return res;
    },
    [demo, refresh]
  );

  const respondRequest = useCallback(
    async (requestId: string, accept: boolean): Promise<{ conversationId: string | null; error: string | null }> => {
      if (demo) {
        const key = requestId.replace('demo-req-in-', '');
        const person = DEMO_PEOPLE.find(p => p.key === key);
        if (!accept || !person) {
          setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status: 'declined' as const } : r)));
          return { conversationId: null, error: null };
        }
        const conv = buildDirectConversation(person);
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
        setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status: 'accepted' as const, conversationId: conv.id } : r)));
        return { conversationId: conv.id, error: null };
      }
      const res = await respondMatchRequest(requestId, accept);
      await refresh();
      return res;
    },
    [demo, refresh]
  );

  const createGroup = useCallback(
    async (name: string, handles: string[], avatar?: string): Promise<{ id: string | null; missing: string[]; error: string | null }> => {
      if (demo) {
        const conv = buildGroupConversation(name, handles, handleRef.current);
        setConversations(prev => [conv, ...prev]);
        return { id: conv.id, missing: [], error: null };
      }
      const res = await createGroupChat(name, handles, avatar);
      if (res.id) await refresh();
      return res;
    },
    [demo, refresh]
  );

  const openOutingChat = useCallback(
    async (outingId: string): Promise<{ id: string | null; error: string | null }> => {
      if (demo) {
        const chatId = `grp-outing-${outingId}`;
        const uid = uidRef.current;
        setConversations(prev => {
          if (prev.some(c => c.id === chatId)) return prev;
          const title = (uid && buildDemoOutings(uid, { name: '', handle: handleRef.current, avatar: '' }).find(o => o.id === outingId)?.spotTitle) || 'Hosting chat';
          return [buildOutingConversation(outingId, title, handleRef.current), ...prev];
        });
        return { id: chatId, error: null };
      }
      const res = await unlockOutingChat(outingId);
      if (res.id) await refresh();
      return res;
    },
    [demo, refresh]
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, newText: string): Promise<string | null> => {
      const uid = uidRef.current;
      const trimmed = newText.trim();
      if (!uid || !trimmed) return 'Message cannot be empty.';
      const conv = conversations.find(c => c.id === conversationId);
      const target = conv?.messages.find(m => m.id === messageId);
      if (!canEditMessage(target)) {
        return 'This message can no longer be edited.';
      }
      const editedAt = new Date().toISOString();
      const prevMessages = conv!.messages;
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== conversationId) return c;
          const nextMsgs = c.messages.map(m =>
            m.id === messageId ? { ...m, text: trimmed, editedAt } : m
          );
          const isLast = nextMsgs[nextMsgs.length - 1]?.id === messageId;
          return {
            ...c,
            messages: nextMsgs,
            lastMessage: isLast ? trimmed : c.lastMessage,
          };
        })
      );
      if (demo || String(messageId).startsWith('tmp-') || String(messageId).startsWith('demo-')) {
        return null;
      }
      const { row, error } = await editMessageRow(messageId, uid, trimmed, target?.media);
      if (error) {
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, messages: prevMessages } : c))
        );
        return error;
      }
      if (row) {
        const mapped = rowToMessage(row, uid);
        setConversations(prev =>
          prev.map(c =>
            c.id === conversationId
              ? { ...c, messages: c.messages.map(m => (m.id === messageId ? mapped : m)) }
              : c
          )
        );
      }
      return null;
    },
    [conversations, demo]
  );

  const deleteMessagesForEveryone = useCallback(
    async (conversationId: string, messageIds: string[]): Promise<string | null> => {
      const uid = uidRef.current;
      if (!uid || messageIds.length === 0) return null;
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return null;
      const idSet = new Set(messageIds);
      const targets = conv.messages.filter(m => idSet.has(m.id));
      if (!canDeleteAllForEveryone(targets)) {
        return 'Unable to delete selected messages for everyone.';
      }
      const prevMessages = conv.messages;
      const prevLast = conv.lastMessage;
      const nextMsgs = conv.messages.filter(m => !idSet.has(m.id));
      const last = nextMsgs[nextMsgs.length - 1];
      const nextLast = last
        ? last.text || (last.audioUrl ? 'Voice note' : last.videoNoteUrl ? 'Video note' : last.videoUrl ? 'Video' : last.photos?.length ? 'Photo' : '')
        : '';
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, messages: nextMsgs, lastMessage: nextLast } : c
        )
      );
      if (demo) return null;
      const cloudIds = messageIds.filter(id => !String(id).startsWith('tmp-') && !String(id).startsWith('demo-'));
      if (cloudIds.length > 0) {
        const { error } = await deleteMessagesForEveryoneRows(cloudIds, uid);
        if (error) {
          setConversations(prev =>
            prev.map(c =>
              c.id === conversationId ? { ...c, messages: prevMessages, lastMessage: prevLast } : c
            )
          );
          return error;
        }
      }
      return null;
    },
    [conversations, demo]
  );

  return {
    conversations: visibleConversations,
    requests: visibleRequests,
    loaded,
    loadError,
    refresh,
    loadHistory,
    sendMessage,
    editMessage,
    deleteMessagesForEveryone,
    openDirectChat,
    sendRequest,
    respondRequest,
    createGroup,
    openOutingChat,
  };
}
