import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatConversation, ChatMessage } from '../types.ts';
import {
  CloudRequest,
  OutgoingMessage,
  createGroupChat,
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

const previewOf = (m: OutgoingMessage): string => {
  switch (m.kind) {
    case 'voice':
    case 'audio':
      return '🎙️ Voice note';
    case 'video_note':
      return '📹 Video note';
    case 'video':
      return '🎥 Video';
    case 'photo':
      return '📷 Photo';
    default:
      return m.content || '';
  }
};

/**
 * Real chats + match requests for the signed-in user.
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

  const refresh = useCallback(async () => {
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

  /** Full history when a chat is opened (the list only carries the most recent messages). */
  const loadHistory = useCallback(async (conversationId: string) => {
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
    const optimistic: ChatMessage & { pending?: boolean; clientId?: string } = {
      id: `tmp-${clientId}`,
      sender: 'me',
      text: msg.content || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: msg.replyTo || undefined,
      pending: true,
      clientId,
      ...(msg.kind === 'voice' || msg.kind === 'audio' ? { audioUrl: mediaUrl, audioDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'video_note' ? { videoNoteUrl: mediaUrl, videoDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'video' ? { videoUrl: mediaUrl, videoDuration: msg.media?.duration } : {}),
      ...(msg.kind === 'photo' ? { photos: msg.media?.photos || [] } : {}),
      ...(msg.kind === 'date_invite' ? { dateInvite: msg.media?.dateInvite } : {}),
    };
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

  const sendRequest = useCallback(
    async (toUserId: string) => {
      const res = await sendMatchRequest(toUserId);
      if (res.status !== 'error') refresh();
      return res;
    },
    [refresh]
  );

  const respondRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      const res = await respondMatchRequest(requestId, accept);
      await refresh();
      return res;
    },
    [refresh]
  );

  const createGroup = useCallback(
    async (name: string, handles: string[], avatar?: string) => {
      const res = await createGroupChat(name, handles, avatar);
      if (res.id) await refresh();
      return res;
    },
    [refresh]
  );

  const openOutingChat = useCallback(
    async (outingId: string) => {
      const res = await unlockOutingChat(outingId);
      if (res.id) await refresh();
      return res;
    },
    [refresh]
  );

  return {
    conversations,
    requests,
    loaded,
    loadError,
    refresh,
    loadHistory,
    sendMessage,
    sendRequest,
    respondRequest,
    createGroup,
    openOutingChat,
  };
}
