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
import { isDemoMode } from './demoMode';
import {
  DEMO_PEOPLE,
  buildDemoConversations,
  buildDemoRequests,
  buildGroupConversation,
  buildMatchConversation,
  buildOutingConversation,
  demoReplyFor,
  getDemoPerson,
} from '../data/demoData';

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

  const demo = isDemoMode();

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
  }, [userId, myHandle]);

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
    if (demo) {
      const sent: ChatMessage = { ...optimistic, id: `demo-msg-${clientId}` };
      delete (sent as any).pending;
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conversationId);
        if (idx < 0) return prev;
        const conv = prev[idx];
        const updated = { ...conv, messages: [...conv.messages, sent], lastMessage: previewOf(msg) || conv.lastMessage };
        (updated as any).lastMessageAt = new Date().toISOString();
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
          const incoming: ChatMessage = {
            id: `demo-reply-${Date.now()}`,
            sender: 'them',
            text: reply.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          if (reply.senderHandle) (incoming as any).senderHandle = reply.senderHandle;
          const updated = { ...conv, messages: [...conv.messages, incoming], lastMessage: reply.text };
          (updated as any).lastMessageAt = new Date().toISOString();
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
    async (
      toUserId: string
    ): Promise<{ status: 'sent' | 'already_sent' | 'matched' | 'error'; conversationId?: string; error?: string }> => {
      if (demo) {
        const uid = uidRef.current;
        const person = getDemoPerson(toUserId);
        if (!uid || !person) return { status: 'error', error: 'Demo profile not found.' };
        if (person.instantMatch) {
          const conv = buildMatchConversation(person);
          setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
          setRequests(prev => [
            {
              id: `demo-req-ok-${person.key}`, fromUser: uid, toUser: person.id,
              fromHandle: handleRef.current, fromAvatar: '', toHandle: `@${person.username}`, toAvatar: person.avatar,
              status: 'accepted', conversationId: conv.id, createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          return { status: 'matched', conversationId: conv.id };
        }
        setRequests(prev => [
          {
            id: `demo-req-out-${person.key}`, fromUser: uid, toUser: person.id,
            fromHandle: handleRef.current, fromAvatar: '', toHandle: `@${person.username}`, toAvatar: person.avatar,
            status: 'pending', createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        return { status: 'sent' };
      }
      const res = await sendMatchRequest(toUserId);
      if (res.status !== 'error') refresh();
      return res;
    },
    [refresh]
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
        const conv = buildMatchConversation(person);
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
        setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status: 'accepted' as const, conversationId: conv.id } : r)));
        return { conversationId: conv.id, error: null };
      }
      const res = await respondMatchRequest(requestId, accept);
      await refresh();
      return res;
    },
    [refresh]
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
    [refresh]
  );

  const openOutingChat = useCallback(
    async (outingId: string): Promise<{ id: string | null; error: string | null }> => {
      if (demo) {
        const chatId = `grp-outing-${outingId}`;
        setConversations(prev => {
          if (prev.some(c => c.id === chatId)) return prev;
          const title = 'Hosting chat';
          return [buildOutingConversation(outingId, title, handleRef.current), ...prev];
        });
        return { id: chatId, error: null };
      }
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
