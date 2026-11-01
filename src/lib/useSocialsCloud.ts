import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatConversation, ChatMessage } from '../types.ts';
import {
  CloudRequest,
  OutgoingMessage,
  createGroupChat,
  fetchMessages,
  mergeMessages,
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
import { supabase } from './supabase';
import { fetchBlockedIds, getCachedBlockedIds, onBlockedChanged } from './safety';
import {
  DEMO_PEOPLE,
  buildDemoConversations,
  buildDemoOutings,
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
  const visibleRequests = useMemo(() => {
    if (!blockedIds.length) return requests;
    const blocked = new Set(blockedIds);
    return requests.filter(r => !blocked.has(r.fromUser) && !blocked.has(r.toUser));
  }, [requests, blockedIds]);

  // Who is online right now: one tiny presence channel per direct chat, shared only by its two members.
  // A person counts as online only while RADA is open and visible on their phone.
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const dmKey = useMemo(
    () =>
      visibleConversations
        .filter(c => c.type === 'direct' && (c as any).otherUserId)
        .map(c => `${c.id}|${(c as any).otherUserId}`)
        .sort()
        .join(','),
    [visibleConversations]
  );
  useEffect(() => {
    if (demo || !userId || !isCloudReady() || !dmKey) {
      setOnlineUserIds([]);
      return;
    }
    const online = new Map<string, boolean>();
    const channels = dmKey.split(',').map(pair => {
      const [convId, otherId] = pair.split('|');
      const ch = supabase.channel(`presence-${convId}`, { config: { presence: { key: userId } } });
      const sync = () => {
        online.set(otherId, Object.keys(ch.presenceState()).includes(otherId));
        setOnlineUserIds([...online.entries()].filter(([, v]) => v).map(([k]) => k));
      };
      ch.on('presence', { event: 'sync' }, sync).subscribe(status => {
        if (status === 'SUBSCRIBED' && document.visibilityState === 'visible') void ch.track({ at: Date.now() });
      });
      return ch;
    });
    const onVisibility = () => {
      channels.forEach(ch => {
        if (document.visibilityState === 'visible') void ch.track({ at: Date.now() });
        else void ch.untrack();
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      channels.forEach(ch => {
        try { void ch.untrack(); } catch { /* ignore */ }
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
      });
      setOnlineUserIds([]);
    };
  }, [userId, dmKey, demo]);

  const refresh = useCallback(async () => {
    if (demo) return; // Demo Mode keeps everything local
    const uid = uidRef.current;
    if (!uid || !isCloudReady()) return;
    try {
      const snap = await fetchSnapshot(uid);
      if (uidRef.current !== uid) return; // account switched while loading
      setConversations(prev => {
        // merge with what is already on screen: pending sends and earlier received messages stay put
        const before = new Map(prev.map(c => [c.id, c] as const));
        return snap.conversations.map(c => {
          const old = before.get(c.id);
          return old ? { ...c, messages: mergeMessages(old.messages, c.messages) } : c;
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
          return { ...c, messages: mergeMessages(c.messages, msgs) };
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
    const optimistic: ChatMessage & { pending?: boolean; clientId?: string; createdAt?: string } = {
      id: `tmp-${clientId}`,
      sender: 'me',
      text: msg.content || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: msg.replyTo || undefined,
      pending: true,
      clientId,
      createdAt: new Date().toISOString(),
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
    [refresh]
  );

  return {
    conversations: visibleConversations,
    onlineUserIds,
    requests: visibleRequests,
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
