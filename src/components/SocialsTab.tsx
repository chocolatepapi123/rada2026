import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { markChatRead, markChatsRead, markChatsUnread, isChatUnread, useUnreadChatCount } from '../lib/unreadChats.ts';
import {
  canEditMessage,
  canDeleteAllForEveryone,
  formatMessagesForCopy,
  loadChatLocalPrefs,
  saveChatLocalPrefs,
  isChatHiddenLocally,
  type ChatLocalPrefs,
} from '../lib/chatActions.ts';
import { 
  X, 
  Users, 
  MessageSquare, 
  Search, 
  Smile, 
  Mic, 
  Send, 
  Calendar, 
  Check,
  ArrowLeft,
  Reply,
  Video,
  Paperclip,
  Camera,
  Plus,
  Image as ImageIcon,
  Copy,
  Pencil,
  Forward,
  Trash2,
  Pin,
  PinOff,
  BellOff,
  Bell,
  Mail,
  MailOpen,
  CheckSquare
} from 'lucide-react';
import { DatingProfile, ChatConversation, ChatMessage, UserProfile } from '../types.ts';
import { EmojiPicker } from './EmojiPicker.tsx';
import { AudioMessagePlayer } from './AudioMessagePlayer.tsx';
import { SwipeToReply } from './SwipeToReply.tsx';
import { VideoMessagePlayer } from './VideoMessagePlayer.tsx';
import { formatMediaDuration, deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { isDemoMode } from '../lib/demoMode.ts';
import { DISCOVER_VISIBLE } from '../lib/featureFlags.ts';
import AsksSection from './AsksSection.tsx';
import GroupsSection from './GroupsSection.tsx';
import { parseUnlockMessage } from '../lib/systemMessage';
import {
  CloudRequest,
  OutgoingMessage,
  CloudProfileHit,
  PLACEHOLDER_AVATAR,
  dataUrlToBlob,
  extFromMime,
  fetchDiscoverPool,
  searchProfiles,
  uploadChatMedia,
} from '../lib/socialsCloud.ts';

interface SocialsTabProps {
  discoveryProfiles: DatingProfile[];
  conversations: ChatConversation[];
  currentUserProfile: UserProfile;
  myUserId?: string;
  requests?: CloudRequest[];
  onSendMatchRequest?: (toUserId: string) => Promise<{ status: 'sent' | 'already_sent' | 'matched' | 'error'; conversationId?: string; error?: string }>;
  onRespondRequest?: (requestId: string, accept: boolean) => Promise<{ conversationId: string | null; error: string | null }>;
  onSendMessage: (conversationId: string, msg: OutgoingMessage) => Promise<string | null>;
  onEditMessage?: (conversationId: string, messageId: string, newText: string) => Promise<string | null>;
  onDeleteMessagesForEveryone?: (conversationId: string, messageIds: string[]) => Promise<string | null>;
  onLoadHistory: (conversationId: string) => Promise<void>;
  onRefreshSocials: () => Promise<void>;
  onOpenPlanDateModal: (chatId?: string) => void;
  onOpenCreateGroupModal: () => void;
  onViewUserProfile: (profile: UserProfile) => void;
  showToast: (msg: string, options?: ToastOptions) => void;
  targetChatId?: string | null;
  onClearTargetChatId?: () => void;
  /** Used by the Rada composer so people can search and link a real spot or event. */
  spots?: any[];
  events?: any[];
}

export const SocialsTab: React.FC<SocialsTabProps> = ({
  discoveryProfiles: _discoveryProfiles,
  conversations,
  currentUserProfile,
  myUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessagesForEveryone,
  onLoadHistory,
  onRefreshSocials,
  onOpenPlanDateModal,
  onOpenCreateGroupModal,
  onViewUserProfile,
  showToast,
  targetChatId,
  onClearTargetChatId,
  spots,
  events
}) => {
  const [subtab, setSubtab] = useState<'chats' | 'groups' | 'asks' | 'search'>('asks');

  // Local per-user preferences for pinned/muted/deleted chats and "Delete for me" messages
  const prefsUid = myUserId || 'guest';
  const [chatPrefs, setChatPrefs] = useState<ChatLocalPrefs>(() => loadChatLocalPrefs(prefsUid));
  useEffect(() => {
    setChatPrefs(loadChatLocalPrefs(prefsUid));
  }, [prefsUid]);
  const updateChatPrefs = (updater: (prev: ChatLocalPrefs) => ChatLocalPrefs) => {
    setChatPrefs(prev => {
      const next = updater(prev);
      saveChatLocalPrefs(prefsUid, next);
      return next;
    });
  };
  const pinnedSet = useMemo(() => new Set(chatPrefs.pinnedIds), [chatPrefs.pinnedIds]);
  const mutedSet = useMemo(() => new Set(chatPrefs.mutedIds), [chatPrefs.mutedIds]);
  const hiddenMsgSet = useMemo(() => new Set(chatPrefs.hiddenMessageIds), [chatPrefs.hiddenMessageIds]);

  // Active Chat Screen State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  useUnreadChatCount(); // re-render the chat list when a chat becomes read or unread
  const activeChat: ChatConversation | null = React.useMemo(
    () => (activeChatId ? conversations.find(c => c.id === activeChatId) || null : null),
    [activeChatId, conversations]
  );
  const setActiveChat = (c: ChatConversation | null) => setActiveChatId(c ? c.id : null);

  const visibleConversations = useMemo(() => {
    const visible = conversations.filter(c => !isChatHiddenLocally(c, chatPrefs.deletedChatsAfter));
    return [...visible].sort((a, b) => {
      const pa = pinnedSet.has(a.id) ? 1 : 0;
      const pb = pinnedSet.has(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return 0;
    });
  }, [conversations, chatPrefs.deletedChatsAfter, pinnedSet]);

  // Demo Mode: plain group chats live in the Groups tab; Chats keeps DMs and outing chats
  const demoGroupChats = React.useMemo(
    () => (isDemoMode() ? visibleConversations.filter((c) => c.type === 'group' && !c.isTemporary) : []),
    [visibleConversations]
  );
  const chatListItems = React.useMemo(
    () => (isDemoMode() ? visibleConversations.filter((c) => !(c.type === 'group' && !c.isTemporary)) : visibleConversations),
    [visibleConversations]
  );
  // load the full history whenever a chat is opened
  React.useEffect(() => {
    if (activeChatId) onLoadHistory(activeChatId);
  }, [activeChatId]);
  // an open chat is a read chat (also when new messages land while it is open)
  React.useEffect(() => {
    if (activeChat) markChatRead(activeChat);
  }, [activeChat?.id, activeChat?.messages.length, (activeChat as any)?.lastMessageAt]);
  const [isSending, setIsSending] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-open target chat if requested (e.g. from Outings Feed)
  React.useEffect(() => {
    if (targetChatId) {
      const match = conversations.find(c => c.id === targetChatId || c.outingId === targetChatId);
      if (match) {
        setActiveChat(match);
        setSubtab('chats');
        onClearTargetChatId?.();
      }
    }
  }, [targetChatId, conversations, onClearTargetChatId]);

  // Swipe-to-reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [flashId, setFlashId] = useState<string | number | null>(null);

  // Long-press & Multi-Select State (Messages & Chats)
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const [actionSheetMsg, setActionSheetMsg] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [deleteMsgsDialog, setDeleteMsgsDialog] = useState<ChatMessage[] | null>(null);
  const [forwardMsgs, setForwardMsgs] = useState<ChatMessage[] | null>(null);
  const [forwardTargetIds, setForwardTargetIds] = useState<string[]>([]);

  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [deleteChatsDialog, setDeleteChatsDialog] = useState<ChatConversation[] | null>(null);

  const longPressTimerRef = useRef<any>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  const makeLongPressHandlers = (onLongPress: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressStartRef.current = { x: e.clientX, y: e.clientY };
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        longPressTimerRef.current = null;
        try { navigator.vibrate?.(14); } catch {}
        onLongPress();
      }, 430);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = longPressStartRef.current;
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
        clearLongPressTimer();
      }
    },
    onPointerUp: () => clearLongPressTimer(),
    onPointerCancel: () => clearLongPressTimer(),
    onPointerLeave: () => clearLongPressTimer(),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearLongPressTimer();
      onLongPress();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressTriggeredRef.current = false;
      }
    },
  });

  useEffect(() => {
    setSelectedMsgIds([]);
    setActionSheetMsg(null);
    setEditingMsg(null);
    setDeleteMsgsDialog(null);
    setForwardMsgs(null);
    setForwardTargetIds([]);
  }, [activeChatId]);

  useEffect(() => {
    setSelectedChatIds([]);
    setDeleteChatsDialog(null);
  }, [subtab]);

  // Open chats land on the latest message, and follow new ones
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!activeChatId) return;
    const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'end' }), 30);
    return () => clearTimeout(t);
  }, [activeChatId, activeChat?.messages.length]);

  // Voice note recording state & refs
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Video note recording state & refs
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const videoTimerRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<BlobPart[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // File upload input refs
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);

  // Stop mic/camera streams and timers on unmount or when backgrounded to prevent memory leaks
  React.useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
          videoStreamRef.current = null;
        }
        clearInterval(recordTimerRef.current);
        clearInterval(videoTimerRef.current);
        setIsRecordingAudio(false);
        setIsRecordingVideo(false);
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      clearInterval(recordTimerRef.current);
      clearInterval(videoTimerRef.current);
    };
  }, []);

  // Search filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<CloudProfileHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  React.useEffect(() => {
    const q = userSearchQuery.trim().replace(/^@/, '');
    setSearchError(false);
    if (!myUserId || q.length < 2) { setSearchHits([]); setSearching(false); return; }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const hits = await searchProfiles(q, 20);
        if (!cancelled) setSearchHits(hits);
      } catch {
        if (!cancelled) { setSearchHits([]); setSearchError(true); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [userSearchQuery, myUserId]);

  const [, setCommunitySingles] = useState<DatingProfile[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    if (!myUserId || !DISCOVER_VISIBLE) { setCommunitySingles([]); return; }
    fetchDiscoverPool()
      .then(rows => {
        if (cancelled) return;
        setCommunitySingles(
          rows
            .filter(r => r.id !== myUserId)
            .map(r => ({
              id: r.id,
              name: `@${r.username}`,
              handle: `@${r.username}`,
              loc: 'Nairobi',
              img: r.avatar_url || PLACEHOLDER_AVATAR,
              bio: r.bio || 'Exploring Nairobi hangouts, food, and culture.',
              vibes: ['Nairobi Hangouts', 'Music', 'Outings'],
            }))
        );
      })
      .catch(() => { if (!cancelled) setCommunitySingles([]); });
    return () => { cancelled = true; };
  }, [myUserId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedPhotos.length >= 5) {
      showToast('Maximum 5 photos allowed per message.', { type: 'error' });
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(attachedPhotos, dataUrls, 5);

    if (result.exceededLimit) {
      showToast('Maximum 5 photos limit reached.', { type: 'error' });
    }

    setAttachedPhotos(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveAttachedPhoto = (indexToRemove: number) => {
    setAttachedPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Multiline chat input: grows downward with the text, up to 4 lines, then scrolls
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const cs = window.getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight) || 18;
    const padding = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const maxHeight = lineHeight * 4 + padding;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [chatInputText]);

  // Swipe (or tap the hover button) to reply: remember the message and put the cursor in the box
  const startReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setTimeout(() => chatTextareaRef.current?.focus(), 0);
  };

  // Tapping a quoted reply scrolls to the original and flashes it
  const jumpToMessage = (id?: string | number) => {
    if (id === undefined || id === null) return;
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1200);
  };

  const replyPayload = () =>
    replyingTo
      ? { id: replyingTo.id, sender: replyingTo.sender === 'me' ? 'You' : activeChat?.name || '', text: replyingTo.text }
      : null;

  const friendlySendError = (err: string) =>
    /sign in/i.test(err) ? err : "Couldn't send that. Please check your connection and try again.";

  const startEdit = (msg: ChatMessage) => {
    if (!canEditMessage(msg)) return;
    setReplyingTo(null);
    setAttachedPhotos([]);
    setEditingMsg(msg);
    setChatInputText(msg.text || '');
    setTimeout(() => chatTextareaRef.current?.focus(), 20);
  };

  const copyMessagesToClipboard = async (targetMsgs: ChatMessage[]) => {
    const formatted = formatMessagesForCopy(targetMsgs, activeChat?.name);
    if (!formatted) {
      showToast('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard?.writeText?.(formatted);
      showToast(targetMsgs.length > 1 ? `Copied ${targetMsgs.length} messages` : 'Copied to clipboard');
    } catch {
      showToast('Could not copy to clipboard', { type: 'error' });
    }
  };

  const handleConfirmDeleteMessages = async (mode: 'me' | 'everyone') => {
    if (!activeChat || !deleteMsgsDialog || deleteMsgsDialog.length === 0) return;
    const targets = deleteMsgsDialog;
    const ids = targets.map(m => m.id);
    setDeleteMsgsDialog(null);
    setSelectedMsgIds([]);
    if (mode === 'me') {
      updateChatPrefs(prev => ({
        ...prev,
        hiddenMessageIds: Array.from(new Set([...prev.hiddenMessageIds, ...ids])),
      }));
      showToast(targets.length > 1 ? `Deleted ${targets.length} messages for you` : 'Deleted for you');
      return;
    }
    if (!canDeleteAllForEveryone(targets)) return;
    if (onDeleteMessagesForEveryone) {
      const err = await onDeleteMessagesForEveryone(activeChat.id, ids);
      if (err) {
        showToast(err, { type: 'error' });
        return;
      }
      showToast(targets.length > 1 ? `Deleted ${targets.length} messages for everyone` : 'Deleted for everyone');
    }
  };

  const handleConfirmForward = async () => {
    if (!forwardMsgs || forwardMsgs.length === 0 || forwardTargetIds.length === 0) return;
    const msgsToSend = [...forwardMsgs];
    const targetIds = [...forwardTargetIds];
    setForwardMsgs(null);
    setForwardTargetIds([]);
    setSelectedMsgIds([]);

    let sentCount = 0;
    for (const chatId of targetIds) {
      for (const m of msgsToSend) {
        if (m.photos && m.photos.length > 0) {
          const err = await onSendMessage(chatId, {
            kind: 'photo',
            content: m.text || '',
            media: { photos: m.photos },
          });
          if (!err) sentCount += 1;
        } else if (m.audioUrl) {
          const err = await onSendMessage(chatId, {
            kind: 'voice',
            content: m.text || 'Voice note',
            media: { url: m.audioUrl, duration: m.audioDuration || 0 },
          });
          if (!err) sentCount += 1;
        } else if (m.videoUrl || m.videoNoteUrl) {
          const err = await onSendMessage(chatId, {
            kind: m.videoNoteUrl ? 'video_note' : 'video',
            content: m.text || 'Video',
            media: { url: m.videoNoteUrl || m.videoUrl, duration: m.videoDuration || 0 },
          });
          if (!err) sentCount += 1;
        } else {
          const body = m.text || (m.dateInvite ? `Date invitation: ${m.dateInvite.spotTitle} (${m.dateInvite.date} at ${m.dateInvite.time})` : '');
          if (!body) continue;
          const err = await onSendMessage(chatId, { kind: 'text', content: body });
          if (!err) sentCount += 1;
        }
      }
    }
    if (sentCount > 0) {
      showToast(`Forwarded to ${targetIds.length} chat${targetIds.length > 1 ? 's' : ''}`);
    }
  };

  const handleSendMessage = async () => {
    if (editingMsg && activeChat) {
      const trimmed = chatInputText.trim();
      if (!trimmed || isSending) return;
      if (!canEditMessage(editingMsg)) {
        setEditingMsg(null);
        setChatInputText('');
        return;
      }
      const targetId = editingMsg.id;
      setEditingMsg(null);
      setChatInputText('');
      setShowEmojiPicker(false);
      if (onEditMessage) {
        const err = await onEditMessage(activeChat.id, targetId, trimmed);
        if (err) showToast(err, { type: 'error' });
      }
      return;
    }

    if ((!chatInputText.trim() && attachedPhotos.length === 0) || !activeChat || !myUserId || isSending) return;
    const chatId = activeChat.id;
    const text = chatInputText.trim();
    const photos = attachedPhotos;
    const reply = replyPayload();
    setChatInputText('');
    setAttachedPhotos([]);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    if (photos.length === 0) {
      const err = await onSendMessage(chatId, { kind: 'text', content: text, replyTo: reply });
      if (err) {
        setChatInputText(text);
        showToast(friendlySendError(err), { type: 'error' });
      }
      return;
    }

    setIsSending(true);
    const urls: string[] = [];
    for (const dataUrl of photos) {
      try {
        const blob = await dataUrlToBlob(dataUrl);
        const up = await uploadChatMedia(myUserId, blob, extFromMime(blob.type, 'jpg'));
        if (!up.url) throw new Error(up.error || 'upload');
        urls.push(up.url);
      } catch {
        setIsSending(false);
        setChatInputText(text);
        setAttachedPhotos(photos);
        showToast("Couldn't upload your photos. Please try again.", { type: 'error' });
        return;
      }
    }
    const err = await onSendMessage(chatId, { kind: 'photo', content: text, media: { photos: urls }, replyTo: reply });
    setIsSending(false);
    if (err) {
      setChatInputText(text);
      setAttachedPhotos(photos);
      showToast(friendlySendError(err), { type: 'error' });
    }
  };

  // Wait for the recorder to hand over its final chunk before building the file
  const stopRecorder = (rec: MediaRecorder | null): Promise<void> =>
    new Promise(resolve => {
      if (!rec || rec.state === 'inactive') return resolve();
      rec.addEventListener('stop', () => resolve(), { once: true });
      try { rec.stop(); } catch { resolve(); }
      setTimeout(resolve, 1500);
    });

  // Upload a recorded or picked file, then send it as a message everyone in the chat receives
  const sendMedia = async (
    kind: 'voice' | 'audio' | 'video_note' | 'video',
    blob: Blob,
    extra: { duration: number; content: string }
  ) => {
    if (!activeChat || !myUserId) return;
    if (blob.size > 40 * 1024 * 1024) {
      showToast('That file is too large. Please keep it under 40 MB.', { type: 'error' });
      return;
    }
    setIsSending(true);
    const reply = replyPayload();
    const up = await uploadChatMedia(myUserId, blob, extFromMime(blob.type, kind.startsWith('video') ? 'webm' : 'webm'));
    if (!up.url) {
      setIsSending(false);
      showToast("Couldn't upload that. Please try again.", { type: 'error' });
      return;
    }
    const err = await onSendMessage(activeChat.id, {
      kind,
      content: extra.content,
      media: { url: up.url, duration: extra.duration },
      replyTo: reply,
    });
    setIsSending(false);
    setReplyingTo(null);
    if (err) showToast(friendlySendError(err), { type: 'error' });
  };

  const getMediaDuration = (file: Blob, tag: 'audio' | 'video'): Promise<number> =>
    new Promise(resolve => {
      try {
        const el = document.createElement(tag);
        const url = URL.createObjectURL(file);
        const done = (n: number) => { URL.revokeObjectURL(url); resolve(n); };
        el.preload = 'metadata';
        el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : 0);
        el.onerror = () => done(0);
        el.src = url;
        setTimeout(() => done(0), 3000);
      } catch { resolve(0); }
    });

  const handleStartVoiceRecording = async () => {
    setIsRecordingAudio(true);
    setRecordSeconds(0);
    audioChunksRef.current = [];

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined') {
          const types = ['audio/webm', 'audio/ogg', 'audio/mp4'];
          for (const t of types) {
            if (MediaRecorder.isTypeSupported(t)) {
              mimeType = t;
              break;
            }
          }
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          audioRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(200);
        }
      }
    } catch (err) {
      console.warn('Microphone permission not granted or unavailable:', err);
      setIsRecordingAudio(false);
      showToast('Microphone access is needed to record a voice note.', { type: 'error' });
      return;
    }

    clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVoiceRecording = async (send: boolean) => {
    clearInterval(recordTimerRef.current);
    const dur = Math.max(1, recordSeconds);
    setIsRecordingAudio(false);

    const rec = audioRecorderRef.current;
    await stopRecorder(rec);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    const chunks = audioChunksRef.current;
    const mime = rec?.mimeType || 'audio/webm';
    audioChunksRef.current = [];
    audioRecorderRef.current = null;
    setRecordSeconds(0);

    if (!send || !activeChat) return;
    if (chunks.length === 0) {
      showToast('No audio was captured. Please try again.', { type: 'error' });
      return;
    }
    await sendMedia('voice', new Blob(chunks, { type: mime }), {
      duration: dur,
      content: `Voice note (${formatMediaDuration(dur)})`,
    });
  };

  const handleStartVideoNoteRecording = async () => {
    setIsRecordingVideo(true);
    setVideoRecordSeconds(0);
    videoChunksRef.current = [];

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
          audio: true
        });
        videoStreamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }

        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined') {
          const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
          for (const t of types) {
            if (MediaRecorder.isTypeSupported(t)) {
              mimeType = t;
              break;
            }
          }
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          videoRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              videoChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
        }
      }
    } catch (err) {
      console.warn('Camera access unavailable:', err);
      setIsRecordingVideo(false);
      showToast('Camera access is needed to record a video note.', { type: 'error' });
      return;
    }

    clearInterval(videoTimerRef.current);
    videoTimerRef.current = setInterval(() => {
      setVideoRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVideoNoteRecording = async (send: boolean) => {
    clearInterval(videoTimerRef.current);
    const dur = Math.max(2, videoRecordSeconds);
    setIsRecordingVideo(false);

    const rec = videoRecorderRef.current;
    await stopRecorder(rec);
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    const chunks = videoChunksRef.current;
    const mime = rec?.mimeType || 'video/webm';
    videoChunksRef.current = [];
    videoRecorderRef.current = null;
    setVideoRecordSeconds(0);

    if (!send || !activeChat) return;
    if (chunks.length === 0) {
      showToast('No video was captured. Please try again.', { type: 'error' });
      return;
    }
    await sendMedia('video_note', new Blob(chunks, { type: mime }), {
      duration: dur,
      content: `Circular video note (${dur}s)`,
    });
  };

  // Video attachment file upload handler
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;
    const dur = await getMediaDuration(file, 'video');
    await sendMedia('video', file, { duration: dur, content: file.name });
  };

  // Audio attachment file upload handler
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;
    const dur = await getMediaDuration(file, 'audio');
    await sendMedia('audio', file, { duration: dur, content: file.name });
  };

  // A date invite counts as accepted once the other person replied with the acceptance message
  const isInviteAccepted = (msg: ChatMessage) =>
    Boolean(msg.dateInvite?.accepted) ||
    (activeChat?.messages || []).some(
      m => m.text?.includes('Date accepted') && m.text.includes(msg.dateInvite?.spotTitle || '\u0000')
    );

  const parseDateAccepted = (text?: string): { spotTitle: string; date?: string; time?: string } | null => {
    if (!text) return null;
    const m = text.trim().match(/^Date accepted:\s*(.+?)\s+on\s+(.+?)\s+at\s+(.+)$/i);
    if (m) return { spotTitle: m[1].trim(), date: m[2].trim(), time: m[3].trim() };
    const simple = text.trim().match(/^Date accepted:\s*(.+)$/i);
    if (simple) return { spotTitle: simple[1].trim() };
    return null;
  };

  const handleAcceptDateInvite = async (msg: ChatMessage) => {
    if (!msg.dateInvite || !activeChat) return;
    const d = msg.dateInvite;
    const err = await onSendMessage(activeChat.id, {
      kind: 'text',
      content: `Date accepted: ${d.spotTitle} on ${d.date} at ${d.time}`,
    });
    if (err) showToast(friendlySendError(err), { type: 'error' });
  };

  const formatChatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // Look shared with the rest of the app: orange gradient for me, soft grey for them
  const chatStyles = {
    bg: 'bg-white dark:bg-[#121113]',
    header: 'bg-white/90 dark:bg-[#121113]/90 text-slate-900 dark:text-slate-100',
    myBubble: 'bg-gradient-to-br from-[#E0533C] to-[#EE7A4A] text-white',
    theirBubble: 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100',
  };
  const CARD = 'bg-white dark:bg-[#1C1A1E] border border-slate-200/80 dark:border-white/10';
  const HEADING = 'text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400';
  const hasContent = chatInputText.trim().length > 0 || attachedPhotos.length > 0;

  // Open the other person's profile from a chat (direct chats only; groups have no single profile)
  const openChatProfile = (conv: ChatConversation) => {
    const uid = (conv as any).otherUserId as string | undefined;
    if (conv.type !== 'direct' || !uid) return;
    const handle = conv.name.startsWith('@') ? conv.name : `@${conv.name}`;
    const base: UserProfile = {
      id: uid,
      name: handle.replace(/^@/, ''),
      handle,
      avatar: conv.avatar,
      bio: '',
      loc: '',
    };
    onViewUserProfile(base); // opens right away with what the chat already knows
    // then fill in the bio when it arrives
    searchProfiles(handle.replace(/^@/, ''), 5)
      .then((hits) => {
        const hit = hits.find((h) => h.id === uid);
        if (!hit) return;
        onViewUserProfile({
          ...base,
          avatar: hit.avatar_url || base.avatar,
          bio: hit.bio || '',
        });
      })
      .catch(() => { /* the basic profile is already showing */ });
  };

  // If in chat room
  if (activeChat) {
    const msgs = activeChat.messages.filter(m => !hiddenMsgSet.has(m.id));
    const selectableMsgs = msgs.filter(m => m.sender !== 'system');
    const isMsgSelectMode = selectedMsgIds.length > 0;
    const selectedMsgSet = new Set(selectedMsgIds);
    const selectedMsgs = selectableMsgs.filter(m => selectedMsgSet.has(m.id));
    const toggleMsgSelection = (msgId: string) => {
      setSelectedMsgIds(prev => (prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]));
    };

    const singleSelectedMsg = selectedMsgs.length === 1 ? selectedMsgs[0] : null;
    const canCopySelected = selectedMsgs.some(m => Boolean(m.text?.trim() || m.dateInvite));
    const canEditSingleSelected = Boolean(singleSelectedMsg && canEditMessage(singleSelectedMsg));

    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${chatStyles.bg} transition-colors duration-200`}>
        {/* Chat Room Header (or Multi-Select Action Bar) */}
        {isMsgSelectMode ? (
          <div
            className={`sticky top-0 z-10 backdrop-blur-xl px-3 pb-2.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2 ${chatStyles.header}`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedMsgIds([])}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition cursor-pointer shrink-0"
                aria-label="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                {selectedMsgs.length} selected
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setSelectedMsgIds(
                    selectedMsgs.length === selectableMsgs.length ? [] : selectableMsgs.map(m => m.id)
                  )
                }
                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold text-[#E0533C] hover:bg-[#E0533C]/10 transition cursor-pointer"
                title="Select all messages"
              >
                {selectedMsgs.length === selectableMsgs.length ? 'None' : 'All'}
              </button>
              {singleSelectedMsg && (
                <button
                  type="button"
                  onClick={() => {
                    startReply(singleSelectedMsg);
                    setSelectedMsgIds([]);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label="Reply"
                  title="Reply"
                >
                  <Reply className="w-4 h-4" />
                </button>
              )}
              {canEditSingleSelected && singleSelectedMsg && (
                <button
                  type="button"
                  onClick={() => {
                    startEdit(singleSelectedMsg);
                    setSelectedMsgIds([]);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label="Edit"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {canCopySelected && (
                <button
                  type="button"
                  onClick={() => {
                    void copyMessagesToClipboard(selectedMsgs);
                    setSelectedMsgIds([]);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label="Copy"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setForwardMsgs(selectedMsgs)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                aria-label="Forward"
                title="Forward"
              >
                <Forward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteMsgsDialog(selectedMsgs)}
                className="w-9 h-9 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
        <div
          className={`sticky top-0 z-10 backdrop-blur-xl px-3 pb-2.5 border-b border-slate-200/70 dark:border-white/10 flex items-center gap-2.5 ${chatStyles.header}`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)' }}
        >
          <button
            onClick={() => setActiveChat(null)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition cursor-pointer shrink-0"
            aria-label="Back to chats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            className={`flex items-center gap-2.5 min-w-0 flex-1 ${activeChat.type === 'direct' && (activeChat as any).otherUserId ? 'cursor-pointer active:opacity-70 transition' : ''}`}
            onClick={() => openChatProfile(activeChat)}
            role={activeChat.type === 'direct' ? 'button' : undefined}
            aria-label={activeChat.type === 'direct' ? `View ${activeChat.name}'s profile` : undefined}
          >
          <div className="relative shrink-0">
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#F43F5E] to-[#E0533C]">
              <div
                className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white dark:border-[#121113]"
                style={{ backgroundImage: `url('${activeChat.avatar}')` }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm leading-tight truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="truncate">{activeChat.name}</span>
              {mutedSet.has(activeChat.id) && <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeChat.isTemporary ? 'Outing group chat' : activeChat.type === 'group' ? 'Group chat' : 'Tap to view profile'}
              {activeChat.members ? ` · ${activeChat.members.length} members` : ''}
            </p>
          </div>
          </div>
          <button
            onClick={() => onOpenPlanDateModal(activeChat.id)}
            className="h-9 px-3 bg-[#E0533C] text-white rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#E0533C]/25 active:scale-95 transition cursor-pointer shrink-0"
            aria-label="Plan a date"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden min-[380px]:inline">Plan a Date</span>
          </button>
        </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-lg mx-auto w-full px-3 py-3">
            {/* Outing Squad Banner for Outing Group Chats */}
            {activeChat.isTemporary && (
              <div className="mb-3 p-3 bg-gradient-to-br from-[#E0533C]/15 to-amber-400/15 border border-[#E0533C]/25 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0533C] text-white text-[10px] font-black uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    <span>Temporary outing squad</span>
                  </span>
                  {activeChat.members && (
                    <span className="text-[11px] font-extrabold text-[#E0533C]">{activeChat.members.length} members</span>
                  )}
                </div>
                {activeChat.members && activeChat.members.length > 0 && (
                  <p className="text-[12px] text-slate-700 dark:text-slate-200">
                    <span className="font-bold opacity-70">Confirmed: </span>
                    <span className="font-semibold">{activeChat.members.join(' • ')}</span>
                  </p>
                )}
              </div>
            )}

            {msgs.map((msg, i) => {
              if (msg.sender === 'system') {
                const unlock = parseUnlockMessage(String(msg.text || ''));
                if (unlock) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3 w-full animate-in fade-in duration-200">
                      <div className="max-w-[85%] rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 px-4 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#E0533C]">Group chat open</p>
                        <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100 mt-0.5">{unlock.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {unlock.when ? `${unlock.when} · ` : ''}Hosted by {unlock.host}
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="flex justify-center my-3 w-full animate-in fade-in duration-200">
                    <div className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-center max-w-[85%]">
                      <span>{msg.text}</span>
                      <span className="opacity-60 ml-1.5">{msg.time}</span>
                    </div>
                  </div>
                );
              }

              const mine = msg.sender === 'me';
              const handle = (msg as any).senderHandle as string | undefined;
              const prev = msgs[i - 1];
              const next = msgs[i + 1];
              const sameAsPrev = !!prev && prev.sender === msg.sender && (prev as any).senderHandle === handle;
              const sameAsNext = !!next && next.sender === msg.sender && (next as any).senderHandle === handle;
              const tail = sameAsNext ? '' : mine ? 'rounded-br-md' : 'rounded-bl-md';
              const flash = flashId !== null && String(flashId) === String(msg.id);
              const dateAccepted = !msg.dateInvite ? parseDateAccepted(msg.text) : null;
              const isSelected = selectedMsgSet.has(msg.id);
              const msgLongPress = makeLongPressHandlers(() => {
                if (isMsgSelectMode) {
                  toggleMsgSelection(msg.id);
                } else {
                  setActionSheetMsg(msg);
                }
              });

              const replyBtn = !isMsgSelectMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startReply(msg);
                  }}
                  title="Reply"
                  aria-label="Reply"
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-[#E0533C] hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              ) : null;

              return (
                <SwipeToReply
                  key={msg.id}
                  onReply={() => startReply(msg)}
                  disabled={isMsgSelectMode}
                  className={sameAsPrev ? 'mt-0.5' : 'mt-2.5'}
                >
                  <div
                    id={`msg-${msg.id}`}
                    {...msgLongPress}
                    onClick={() => {
                      if (isMsgSelectMode) toggleMsgSelection(msg.id);
                    }}
                    className={`flex flex-col group select-none rounded-2xl transition-colors ${
                      mine ? 'items-end' : 'items-start'
                    } ${isSelected ? 'bg-[#E0533C]/12 dark:bg-[#E0533C]/20 px-1.5 py-1' : ''}`}
                  >
                    {!mine && activeChat.type === 'group' && handle && !sameAsPrev && (
                      <span className="text-[11px] font-bold text-[#E0533C] mb-0.5 px-2">{handle}</span>
                    )}

                    <div className="flex items-end gap-1.5 max-w-[88%]">
                      {isMsgSelectMode && (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 self-center border transition ${
                            isSelected
                              ? 'bg-[#E0533C] border-[#E0533C] text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1C1A1E]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                      )}
                      {mine && replyBtn}

                      {msg.dateInvite ? (
                        <div className="w-72 max-w-full bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white p-4 rounded-3xl shadow-lg shadow-[#E0533C]/25 space-y-2">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                            <Calendar className="w-3 h-3" /> Date invitation
                          </span>
                          <h4 className="font-black text-[15px] leading-tight">{msg.dateInvite.spotTitle}</h4>
                          <p className="text-xs text-white/85">{msg.dateInvite.address}</p>
                          <p className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full inline-block">
                            {msg.dateInvite.date} at {msg.dateInvite.time}
                          </p>
                          <button
                            disabled={isInviteAccepted(msg) || mine}
                            onClick={() => handleAcceptDateInvite(msg)}
                            className={`w-full mt-1 py-2.5 text-xs font-extrabold rounded-full shadow transition ${
                              isInviteAccepted(msg)
                                ? 'bg-emerald-700 text-white cursor-default'
                                : mine
                                ? 'bg-white/30 text-white cursor-default'
                                : 'bg-white text-[#E0533C] active:scale-[0.98] cursor-pointer'
                            }`}
                          >
                            {isInviteAccepted(msg) ? 'Date accepted' : mine ? 'Invitation sent' : 'Accept date'}
                          </button>
                        </div>
                      ) : dateAccepted ? (
                        <div
                          className={`w-56 max-w-full bg-gradient-to-br from-[#E0533C] to-[#EE8A47] text-white p-3 rounded-2xl shadow-md shadow-[#E0533C]/20 space-y-1.5 transition-shadow ${
                            flash ? 'ring-2 ring-[#E0533C]/70 ring-offset-2 ring-offset-white dark:ring-offset-[#121113]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-700/90 px-2 py-0.5 rounded-full">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} /> Date accepted
                            </span>
                            <span className="text-[10px] text-white/75 shrink-0">{msg.time}</span>
                          </div>
                          <h4 className="font-black text-[13px] leading-tight truncate">{dateAccepted.spotTitle}</h4>
                          {dateAccepted.date && dateAccepted.time && (
                            <p className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span>{dateAccepted.date} at {dateAccepted.time}</span>
                            </p>
                          )}
                        </div>
                      ) : msg.videoNoteUrl ? (
                        <VideoMessagePlayer
                          videoUrl={msg.videoNoteUrl}
                          isCircular={true}
                          videoDuration={msg.videoDuration || 6}
                          isMyMessage={mine}
                          time={msg.time}
                          replyTo={msg.replyTo}
                        />
                      ) : msg.videoUrl ? (
                        <VideoMessagePlayer
                          videoUrl={msg.videoUrl}
                          isCircular={false}
                          videoDuration={msg.videoDuration || 10}
                          isMyMessage={mine}
                          time={msg.time}
                          replyTo={msg.replyTo}
                        />
                      ) : msg.audioUrl ? (
                        <div className={`p-3 rounded-2xl text-xs min-w-[220px] ${mine ? chatStyles.myBubble : chatStyles.theirBubble} ${tail}`}>
                          <AudioMessagePlayer
                            audioUrl={msg.audioUrl}
                            durationSeconds={msg.audioDuration || 14}
                            isMyMessage={mine}
                            time={msg.time}
                            replyTo={msg.replyTo}
                          />
                        </div>
                      ) : (
                        <div
                          className={`px-3.5 py-2 rounded-[20px] text-[14px] leading-snug transition-shadow ${
                            mine ? chatStyles.myBubble : chatStyles.theirBubble
                          } ${tail} ${flash ? 'ring-2 ring-[#E0533C]/70 ring-offset-2 ring-offset-white dark:ring-offset-[#121113]' : ''}`}
                        >
                          {msg.replyTo && (
                            <button
                              type="button"
                              onClick={() => jumpToMessage(msg.replyTo?.id)}
                              className={`block w-full text-left mb-1.5 pl-2.5 pr-2 py-1 rounded-lg border-l-[3px] text-[12px] cursor-pointer ${
                                mine ? 'bg-black/15 border-white/70' : 'bg-black/5 dark:bg-white/[0.06] border-[#E0533C]'
                              }`}
                            >
                              <span className={`font-extrabold block text-[11px] ${mine ? 'text-white' : 'text-[#E0533C]'}`}>{msg.replyTo.sender}</span>
                              <span className="line-clamp-2 opacity-80">{msg.replyTo.text}</span>
                            </button>
                          )}
                          {msg.photos && msg.photos.length > 0 && (
                            <div className={`grid gap-1.5 mb-1.5 ${msg.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {msg.photos.map((photoUrl, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={(e) => {
                                    if (isMsgSelectMode) return;
                                    e.stopPropagation();
                                    setViewerPhoto(photoUrl);
                                  }}
                                  className="rounded-2xl overflow-hidden max-h-52 bg-black/10 cursor-pointer"
                                >
                                  <img src={photoUrl} alt={`Attachment ${pIdx + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.text && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>}
                          <span className="text-[10px] opacity-70 block text-right mt-0.5">
                            {msg.editedAt ? 'Edited · ' : ''}
                            {msg.time}
                          </span>
                        </div>
                      )}

                      {!mine && replyBtn}
                    </div>
                  </div>
                </SwipeToReply>
              );
            })}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Editing preview banner */}
        {editingMsg && (
          <div className="max-w-lg mx-auto w-full px-3 pt-2">
            <div className="bg-slate-100 dark:bg-white/[0.06] border-l-4 border-[#E0533C] pl-3 pr-1.5 py-2 rounded-2xl flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-150">
              <Pencil className="w-4 h-4 text-[#E0533C] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-[11px] text-[#E0533C] block">Editing message</span>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate">{editingMsg.text}</p>
              </div>
              <button
                onClick={() => {
                  setEditingMsg(null);
                  setChatInputText('');
                }}
                className="w-7 h-7 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer"
                aria-label="Cancel edit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && (
          <div className="max-w-lg mx-auto w-full px-3 pt-2">
            <div className="bg-slate-100 dark:bg-white/[0.06] border-l-4 border-[#E0533C] pl-3 pr-1.5 py-2 rounded-2xl flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-150">
              <Reply className="w-4 h-4 text-[#E0533C] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-[11px] text-[#E0533C] block">
                  Replying to {replyingTo.sender === 'me' ? 'yourself' : activeChat.name}
                </span>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate">{replyingTo.text || 'Media'}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer"
                aria-label="Cancel reply"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="max-w-lg mx-auto w-full px-3 mt-2">
            <EmojiPicker
              isOpen={showEmojiPicker}
              onSelectEmoji={(emoji) => setChatInputText(prev => prev + emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Voice note recording */}
        {isRecordingAudio && (
          <div className="max-w-lg mx-auto w-full px-3 pt-2 animate-in slide-in-from-bottom duration-150">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/40 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span>Recording · {formatMediaDuration(recordSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStopVoiceRecording(false)}
                  className="px-3.5 py-1.5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStopVoiceRecording(true)}
                  className="px-3.5 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Circular video note recording */}
        {isRecordingVideo && (
          <div className="max-w-lg mx-auto w-full px-3 pt-2 animate-in slide-in-from-bottom duration-150">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/40 rounded-3xl flex flex-col items-center gap-3 text-xs">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl bg-black flex items-center justify-center">
                <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/30 pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mb-1" />
                  <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                    {formatMediaDuration(videoRecordSeconds)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                  <span>Video note · {formatMediaDuration(videoRecordSeconds)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStopVideoNoteRecording(false)}
                    className="px-3.5 py-1.5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStopVideoNoteRecording(true)}
                    className="px-3.5 py-1.5 bg-purple-600 text-white rounded-full text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attached photo previews */}
        {attachedPhotos.length > 0 && (
          <div className="max-w-lg mx-auto w-full px-3 pt-2">
            <div className="p-2.5 bg-slate-100 dark:bg-white/[0.06] rounded-2xl">
              <div className="flex items-center justify-between pb-1.5 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#E0533C]" />
                  <span>Photos ({attachedPhotos.length}/5)</span>
                  {attachedPhotos.length >= 5 && <span className="text-amber-600 dark:text-amber-400 font-semibold">· max reached</span>}
                </span>
                <button type="button" onClick={() => setAttachedPhotos([])} className="text-slate-400 hover:text-red-500 transition cursor-pointer">
                  Clear all
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
                {attachedPhotos.map((photoUrl, pIdx) => (
                  <div key={pIdx} className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 shadow-xs">
                    <img src={photoUrl} alt={`Attached preview ${pIdx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveAttachedPhoto(pIdx); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer z-10"
                      title="Remove photo"
                      aria-label={`Remove attached photo ${pIdx + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {attachedPhotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    className="w-16 h-16 rounded-2xl border border-dashed border-slate-300 dark:border-white/20 hover:border-[#E0533C] flex flex-col items-center justify-center text-slate-400 hover:text-[#E0533C] transition shrink-0 cursor-pointer"
                    title="Add more photos"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div
          className="max-w-lg mx-auto w-full px-2.5 pt-2 flex items-end gap-2 border-t border-transparent"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          <input type="file" ref={photoFileInputRef} accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          <input type="file" ref={videoFileInputRef} accept="video/*" className="hidden" onChange={handleVideoFileUpload} />
          <input type="file" ref={audioFileInputRef} accept="audio/*" className="hidden" onChange={handleAudioFileUpload} />

          <div className="flex-1 min-w-0 flex items-end rounded-3xl bg-slate-100 dark:bg-white/[0.07] border border-slate-200/70 dark:border-white/10 pl-1 pr-1 focus-within:ring-2 focus-within:ring-[#E0533C]/30 transition">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-9 h-10 flex items-center justify-center shrink-0 transition cursor-pointer ${showEmojiPicker ? 'text-[#E0533C]' : 'text-slate-500 hover:text-[#E0533C]'}`}
              title="Emoji"
              aria-label="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <textarea
              ref={chatTextareaRef}
              rows={1}
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter inserts a new line. Ignore Enter while an IME is composing.
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message…"
              enterKeyHint="send"
              className="flex-1 min-w-0 bg-transparent px-1 py-2.5 text-[15px] leading-5 resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => photoFileInputRef.current?.click()}
              className={`w-8 h-10 flex items-center justify-center shrink-0 transition cursor-pointer ${attachedPhotos.length > 0 ? 'text-[#E0533C]' : 'text-slate-500 hover:text-[#E0533C]'}`}
              title="Attach photos (up to 5)"
              aria-label="Attach photos"
            >
              <Camera className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => videoFileInputRef.current?.click()}
              className="w-8 h-10 flex items-center justify-center text-slate-500 hover:text-[#E0533C] shrink-0 transition cursor-pointer"
              title="Attach a video"
              aria-label="Attach a video"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
          </div>

          {hasContent ? (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isSending}
              className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#E0533C] to-[#EE7A4A] text-white flex items-center justify-center shadow-lg shadow-[#E0533C]/30 active:scale-95 transition shrink-0 cursor-pointer ${isSending ? 'opacity-60 animate-pulse' : ''}`}
              title="Send"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { if (isRecordingVideo) handleStopVideoNoteRecording(true); else handleStartVideoNoteRecording(); }}
                title={isRecordingVideo ? 'Send video note' : 'Record a video note'}
                aria-label="Record a video note"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer active:scale-95 ${
                  isRecordingVideo ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10'
                }`}
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => { if (isRecordingAudio) handleStopVoiceRecording(true); else handleStartVoiceRecording(); }}
                title={isRecordingAudio ? 'Send voice note' : 'Record a voice note'}
                aria-label="Record a voice note"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer active:scale-95 ${
                  isRecordingAudio ? 'bg-red-600 text-white animate-pulse' : 'bg-gradient-to-br from-[#E0533C] to-[#EE7A4A] text-white shadow-lg shadow-[#E0533C]/30'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {viewerPhoto && (
          <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center" onClick={() => setViewerPhoto(null)} role="dialog" aria-modal="true">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewerPhoto(null); }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Close photo"
              style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <img loading="lazy" decoding="async" src={viewerPhoto} alt="Photo" onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {/* Long-press Message Action Sheet */}
        {actionSheetMsg && (
          <div
            className="fixed inset-0 z-[260] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setActionSheetMsg(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full sm:max-w-sm bg-white dark:bg-[#1C1A1E] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-4 space-y-2 shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate pr-3">
                  {actionSheetMsg.text || (actionSheetMsg.photos?.length ? 'Photo message' : 'Media message')}
                </p>
                <button
                  type="button"
                  onClick={() => setActionSheetMsg(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                  aria-label="Close options"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => {
                    const m = actionSheetMsg;
                    setActionSheetMsg(null);
                    startReply(m);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <Reply className="w-4 h-4 text-[#E0533C]" />
                  <span>Reply</span>
                </button>

                {(actionSheetMsg.text || actionSheetMsg.dateInvite) && (
                  <button
                    type="button"
                    onClick={() => {
                      const m = actionSheetMsg;
                      setActionSheetMsg(null);
                      void copyMessagesToClipboard([m]);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy</span>
                  </button>
                )}

                {canEditMessage(actionSheetMsg) && (
                  <button
                    type="button"
                    onClick={() => {
                      const m = actionSheetMsg;
                      setActionSheetMsg(null);
                      startEdit(m);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-[#E0533C]" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const m = actionSheetMsg;
                    setActionSheetMsg(null);
                    setForwardMsgs([m]);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <Forward className="w-4 h-4 text-slate-500" />
                  <span>Forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const m = actionSheetMsg;
                    setActionSheetMsg(null);
                    setSelectedMsgIds([m.id]);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-slate-500" />
                  <span>Select multiple</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const m = actionSheetMsg;
                    setActionSheetMsg(null);
                    setDeleteMsgsDialog([m]);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Messages Confirmation Modal */}
        {deleteMsgsDialog && (
          <div
            className="fixed inset-0 z-[270] bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setDeleteMsgsDialog(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full sm:max-w-sm bg-white dark:bg-[#1C1A1E] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-5 space-y-3 shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                {deleteMsgsDialog.length > 1
                  ? `Delete ${deleteMsgsDialog.length} messages?`
                  : 'Delete message?'}
              </h3>
              <div className="space-y-2 pt-1">
                {canDeleteAllForEveryone(deleteMsgsDialog) && (
                  <button
                    type="button"
                    onClick={() => void handleConfirmDeleteMessages('everyone')}
                    className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold transition cursor-pointer"
                  >
                    Delete for everyone
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleConfirmDeleteMessages('me')}
                  className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-slate-100 text-sm font-extrabold transition cursor-pointer"
                >
                  Delete for me
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteMsgsDialog(null)}
                  className="w-full py-2.5 rounded-2xl text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forward Messages Modal */}
        {forwardMsgs && (
          <div
            className="fixed inset-0 z-[270] bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => {
              setForwardMsgs(null);
              setForwardTargetIds([]);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full sm:max-w-md bg-white dark:bg-[#1C1A1E] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-4 space-y-3 shadow-2xl max-h-[80vh] flex flex-col"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                  Forward {forwardMsgs.length > 1 ? `${forwardMsgs.length} messages` : 'message'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setForwardMsgs(null);
                    setForwardTargetIds([]);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 cursor-pointer"
                  aria-label="Close forward"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {visibleConversations.filter(c => c.id !== activeChat.id).map((conv) => {
                  const picked = forwardTargetIds.includes(conv.id);
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() =>
                        setForwardTargetIds(prev =>
                          prev.includes(conv.id) ? prev.filter(id => id !== conv.id) : [...prev, conv.id]
                        )
                      }
                      className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 border transition cursor-pointer ${
                        picked
                          ? 'bg-[#E0533C]/10 border-[#E0533C]'
                          : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full bg-cover bg-center shrink-0"
                          style={{ backgroundImage: `url('${conv.avatar}')` }}
                        />
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.name}</span>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                          picked
                            ? 'bg-[#E0533C] border-[#E0533C] text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {picked && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
                {visibleConversations.filter(c => c.id !== activeChat.id).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No other chats available to forward to.</p>
                )}
              </div>

              <button
                type="button"
                disabled={forwardTargetIds.length === 0}
                onClick={() => void handleConfirmForward()}
                className="w-full py-3 rounded-2xl bg-[#E0533C] disabled:opacity-40 text-white text-sm font-extrabold transition cursor-pointer"
              >
                {forwardTargetIds.length > 0
                  ? `Send to ${forwardTargetIds.length} chat${forwardTargetIds.length > 1 ? 's' : ''}`
                  : 'Select a chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const avatarRing = 'p-[2px] bg-gradient-to-tr from-[#F43F5E] to-[#E0533C] rounded-full shrink-0';

  return (
    <section className="px-4 py-4 space-y-4 min-[900px]:max-w-2xl min-[900px]:mx-auto">
      {/* Socials sub-tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-full text-center text-[13px]">
        {[
          { id: 'asks', label: 'Rada' },
          { id: 'chats', label: 'Chats' },
          { id: 'groups', label: 'Groups' },
          { id: 'search', label: 'Search' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSubtab(tab.id as any);
            }}
            className={`flex-1 py-2 rounded-full transition cursor-pointer inline-flex items-center justify-center gap-1 ${
              subtab === tab.id
                ? 'font-extrabold bg-white dark:bg-[#1C1A1E] text-[#E0533C] shadow-sm'
                : 'font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CHATS */}
      {subtab === 'asks' && (
        <AsksSection signedIn={Boolean(myUserId)} showToast={showToast} spots={spots} events={events} onChatOpened={(chatId) => { void onRefreshSocials(); setSubtab('chats'); if (isDemoMode() && chatId) setActiveChatId(chatId); }} />
      )}
      {subtab === 'groups' && !isDemoMode() && (
        <GroupsSection signedIn={Boolean(myUserId)} showToast={showToast} />
      )}
      {subtab === 'groups' && isDemoMode() && (() => {
        const isGroupSelectMode = selectedChatIds.length > 0;
        const selectedGroupConvs = demoGroupChats.filter(c => selectedChatIds.includes(c.id));
        const allGroupsPinned = selectedGroupConvs.length > 0 && selectedGroupConvs.every(c => pinnedSet.has(c.id));
        const allGroupsMuted = selectedGroupConvs.length > 0 && selectedGroupConvs.every(c => mutedSet.has(c.id));
        const anyGroupUnread = selectedGroupConvs.some(c => isChatUnread(c));

        return (
        <div className="space-y-3">
          {isGroupSelectMode ? (
            <div className="p-2.5 bg-white dark:bg-[#1C1A1E] border border-[#E0533C]/40 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedChatIds([])}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                  aria-label="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  {selectedGroupConvs.length} selected
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedChatIds(
                      selectedGroupConvs.length === demoGroupChats.length ? [] : demoGroupChats.map(c => c.id)
                    )
                  }
                  className="text-[11px] font-bold text-[#E0533C] px-2 py-1 rounded-full hover:bg-[#E0533C]/10 cursor-pointer shrink-0"
                >
                  {selectedGroupConvs.length === demoGroupChats.length ? 'None' : 'All'}
                </button>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const ids = selectedGroupConvs.map(c => c.id);
                    updateChatPrefs(prev => ({
                      ...prev,
                      pinnedIds: allGroupsPinned
                        ? prev.pinnedIds.filter(id => !ids.includes(id))
                        : Array.from(new Set([...prev.pinnedIds, ...ids])),
                    }));
                    showToast(allGroupsPinned ? 'Unpinned' : 'Pinned to top');
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={allGroupsPinned ? 'Unpin' : 'Pin'}
                  aria-label={allGroupsPinned ? 'Unpin' : 'Pin'}
                >
                  {allGroupsPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ids = selectedGroupConvs.map(c => c.id);
                    updateChatPrefs(prev => ({
                      ...prev,
                      mutedIds: allGroupsMuted
                        ? prev.mutedIds.filter(id => !ids.includes(id))
                        : Array.from(new Set([...prev.mutedIds, ...ids])),
                    }));
                    showToast(allGroupsMuted ? 'Unmuted' : 'Muted');
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={allGroupsMuted ? 'Unmute' : 'Mute'}
                  aria-label={allGroupsMuted ? 'Unmute' : 'Mute'}
                >
                  {allGroupsMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (anyGroupUnread) {
                      markChatsRead(selectedGroupConvs);
                      showToast('Marked as read');
                    } else {
                      markChatsUnread(selectedGroupConvs);
                      showToast('Marked as unread');
                    }
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={anyGroupUnread ? 'Mark as read' : 'Mark as unread'}
                  aria-label={anyGroupUnread ? 'Mark as read' : 'Mark as unread'}
                >
                  {anyGroupUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteChatsDialog(selectedGroupConvs)}
                  className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className={HEADING}>My groups ({demoGroupChats.length})</h3>
              <button
                onClick={onOpenCreateGroupModal}
                className="px-3 py-1.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>New group</span>
              </button>
            </div>
          )}
          <div className="space-y-2">
            {demoGroupChats.length === 0 && (
              <div className={`${CARD} border-dashed rounded-3xl py-8 px-5 text-center space-y-2`}>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">No groups yet. Start one with the New group button.</p>
              </div>
            )}
            {demoGroupChats.map((conv) => {
              const isSelected = selectedChatIds.includes(conv.id);
              const unread = isChatUnread(conv);
              const isPinned = pinnedSet.has(conv.id);
              const isMuted = mutedSet.has(conv.id);
              const lp = makeLongPressHandlers(() => {
                setSelectedChatIds(prev => (prev.includes(conv.id) ? prev : [...prev, conv.id]));
              });
              return (
              <div
                key={conv.id}
                {...lp}
                onClick={() => {
                  if (isGroupSelectMode) {
                    setSelectedChatIds(prev => (prev.includes(conv.id) ? prev.filter(id => id !== conv.id) : [...prev, conv.id]));
                  } else {
                    setActiveChat(conv);
                  }
                }}
                className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs transition cursor-pointer select-none ${
                  isSelected ? 'border-[#E0533C] bg-[#E0533C]/5 dark:bg-[#E0533C]/15' : 'hover:border-[#E0533C]/50 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isGroupSelectMode && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected ? 'bg-[#E0533C] border-[#E0533C] text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                  )}
                  <div className={avatarRing}>
                    <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E]" style={{ backgroundImage: `url('${conv.avatar}')` }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.name}</h4>
                      {isPinned && <Pin className="w-3 h-3 text-[#E0533C] shrink-0" />}
                      {isMuted && <BellOff className="w-3 h-3 text-slate-400 shrink-0" />}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{conv.lastMessage}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">{(conv.members || []).length} members</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">{formatChatTime((conv as any).lastMessageAt)}</span>
                  {unread && <span className="w-2 h-2 rounded-full bg-[#E0533C] inline-block mt-1.5" aria-label="Unread" />}
                </div>
              </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {subtab === 'chats' && (() => {
        const isChatSelectMode = selectedChatIds.length > 0;
        const selectedConvs = chatListItems.filter(c => selectedChatIds.includes(c.id));
        const allChatsPinned = selectedConvs.length > 0 && selectedConvs.every(c => pinnedSet.has(c.id));
        const allChatsMuted = selectedConvs.length > 0 && selectedConvs.every(c => mutedSet.has(c.id));
        const anyChatUnread = selectedConvs.some(c => isChatUnread(c));

        return (
        <div className="space-y-3">
          {isChatSelectMode ? (
            <div className="p-2.5 bg-white dark:bg-[#1C1A1E] border border-[#E0533C]/40 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedChatIds([])}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                  aria-label="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                  {selectedConvs.length} selected
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedChatIds(
                      selectedConvs.length === chatListItems.length ? [] : chatListItems.map(c => c.id)
                    )
                  }
                  className="text-[11px] font-bold text-[#E0533C] px-2 py-1 rounded-full hover:bg-[#E0533C]/10 cursor-pointer shrink-0"
                >
                  {selectedConvs.length === chatListItems.length ? 'None' : 'All'}
                </button>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const ids = selectedConvs.map(c => c.id);
                    updateChatPrefs(prev => ({
                      ...prev,
                      pinnedIds: allChatsPinned
                        ? prev.pinnedIds.filter(id => !ids.includes(id))
                        : Array.from(new Set([...prev.pinnedIds, ...ids])),
                    }));
                    showToast(allChatsPinned ? 'Unpinned' : 'Pinned to top');
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={allChatsPinned ? 'Unpin' : 'Pin'}
                  aria-label={allChatsPinned ? 'Unpin' : 'Pin'}
                >
                  {allChatsPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ids = selectedConvs.map(c => c.id);
                    updateChatPrefs(prev => ({
                      ...prev,
                      mutedIds: allChatsMuted
                        ? prev.mutedIds.filter(id => !ids.includes(id))
                        : Array.from(new Set([...prev.mutedIds, ...ids])),
                    }));
                    showToast(allChatsMuted ? 'Unmuted' : 'Muted');
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={allChatsMuted ? 'Unmute' : 'Mute'}
                  aria-label={allChatsMuted ? 'Unmute' : 'Mute'}
                >
                  {allChatsMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (anyChatUnread) {
                      markChatsRead(selectedConvs);
                      showToast('Marked as read');
                    } else {
                      markChatsUnread(selectedConvs);
                      showToast('Marked as unread');
                    }
                    setSelectedChatIds([]);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={anyChatUnread ? 'Mark as read' : 'Mark as unread'}
                  aria-label={anyChatUnread ? 'Mark as read' : 'Mark as unread'}
                >
                  {anyChatUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteChatsDialog(selectedConvs)}
                  className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className={HEADING}>Conversations ({chatListItems.length})</h3>
              <button
                onClick={onOpenCreateGroupModal}
                className="px-3 py-1.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>New group</span>
              </button>
            </div>
          )}

          <div className="space-y-2">
            {chatListItems.length === 0 && (
              <div className={`${CARD} border-dashed rounded-3xl py-8 px-5 text-center space-y-2`}>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No chats yet. Reply on Rada, open someone&apos;s profile to message them, or start a group.
                </p>
              </div>
            )}
            {chatListItems.map((conv) => {
              const unread = isChatUnread(conv);
              const isSelected = selectedChatIds.includes(conv.id);
              const isPinned = pinnedSet.has(conv.id);
              const isMuted = mutedSet.has(conv.id);
              const lp = makeLongPressHandlers(() => {
                setSelectedChatIds(prev => (prev.includes(conv.id) ? prev : [...prev, conv.id]));
              });
              return (
              <div
                key={conv.id}
                {...lp}
                onClick={() => {
                  if (isChatSelectMode) {
                    setSelectedChatIds(prev => (prev.includes(conv.id) ? prev.filter(id => id !== conv.id) : [...prev, conv.id]));
                  } else {
                    setActiveChat(conv);
                  }
                }}
                className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs transition cursor-pointer select-none ${
                  isSelected ? 'border-[#E0533C] bg-[#E0533C]/5 dark:bg-[#E0533C]/15' : 'hover:border-[#E0533C]/50 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isChatSelectMode && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected ? 'bg-[#E0533C] border-[#E0533C] text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                  )}
                  <div
                    className="relative shrink-0"
                    onClick={(e) => {
                      if (isChatSelectMode) return;
                      if (conv.type === 'direct' && (conv as any).otherUserId) {
                        e.stopPropagation();
                        openChatProfile(conv);
                      }
                    }}
                  >
                    <div className={avatarRing}>
                      <div
                        className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E]"
                        style={{ backgroundImage: `url('${conv.avatar}')` }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.name}</h4>
                      {isPinned && <Pin className="w-3 h-3 text-[#E0533C] shrink-0" />}
                      {isMuted && <BellOff className="w-3 h-3 text-slate-400 shrink-0" />}
                      {conv.isTemporary && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] text-[9px] font-black uppercase tracking-wider shrink-0">
                          Outing
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{conv.lastMessage}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">{formatChatTime((conv as any).lastMessageAt)}</span>
                  {conv.isTemporary ? (
                    <span className="text-[10px] font-extrabold text-[#E0533C] block mt-0.5">Unlocked</span>
                  ) : unread ? (
                    <span className="w-2 h-2 rounded-full bg-[#E0533C] inline-block mt-1.5" aria-label="Unread" />
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* SEARCH MEMBERS */}
      {subtab === 'search' && (
        <div className="space-y-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search members by @username"
              className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-white/[0.07] border border-slate-200/70 dark:border-white/10 rounded-full text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0533C]/35"
            />
          </div>

          <div className="space-y-2 text-[13px]">
            {!myUserId && <p className="text-slate-400 py-4 text-center">Log in to search for members.</p>}
            {myUserId && userSearchQuery.trim().replace(/^@/, '').length < 2 && (
              <p className="text-slate-400 py-4 text-center">Type at least 2 letters of a username.</p>
            )}
            {myUserId && searching && <p className="text-slate-400 py-2 text-center">Searching…</p>}
            {myUserId && !searching && searchError && (
              <p className="text-slate-400 py-4 text-center">Search isn't working right now. Please try again.</p>
            )}
            {myUserId && !searching && !searchError && userSearchQuery.trim().replace(/^@/, '').length >= 2 && searchHits.length === 0 && (
              <p className="text-slate-400 py-4 text-center">No members found with that username.</p>
            )}
            {searchHits.map((p) => {
              return (
                <div
                  key={p.id}
                  onClick={() => onViewUserProfile({
                    id: p.id,
                    name: `@${p.username}`,
                    handle: `@${p.username}`,
                    avatar: p.avatar_url || PLACEHOLDER_AVATAR,
                    bio: p.bio || 'Exploring Nairobi hangouts, good music and vibes.',
                    loc: 'Nairobi',
                    vibes: []
                  })}
                  className={`p-3 ${CARD} rounded-2xl flex items-center justify-between cursor-pointer hover:border-[#E0533C]/50 active:scale-[0.99] transition`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={avatarRing}>
                      <div
                        className="w-11 h-11 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E]"
                        style={{ backgroundImage: `url('${p.avatar_url || PLACEHOLDER_AVATAR}')` }}
                      />
                    </div>
                    <h4 className="font-bold text-[13px] truncate text-slate-900 dark:text-slate-100">@{p.username}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewerPhoto && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center" onClick={() => setViewerPhoto(null)} role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setViewerPhoto(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Close photo"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <X className="w-5 h-5" />
          </button>
          <img loading="lazy" decoding="async" src={viewerPhoto} alt="Photo" onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Delete Selected Chats Confirmation Modal */}
      {deleteChatsDialog && (
        <div
          className="fixed inset-0 z-[270] bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeleteChatsDialog(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-[#1C1A1E] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-5 space-y-3 shadow-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
              {deleteChatsDialog.length > 1
                ? `Delete ${deleteChatsDialog.length} chats?`
                : `Delete chat with ${deleteChatsDialog[0]?.name || 'member'}?`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected conversations will be removed from your chat list.
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const now = Date.now();
                  const nextMap = { ...chatPrefs.deletedChatsAfter };
                  for (const c of deleteChatsDialog) {
                    nextMap[c.id] = now;
                  }
                  const deletedIds = new Set(deleteChatsDialog.map(c => c.id));
                  markChatsRead(deleteChatsDialog);
                  updateChatPrefs(prev => ({
                    ...prev,
                    pinnedIds: prev.pinnedIds.filter(id => !deletedIds.has(id)),
                    deletedChatsAfter: nextMap,
                  }));
                  showToast(
                    deleteChatsDialog.length > 1 ? `Removed ${deleteChatsDialog.length} chats` : 'Chat removed'
                  );
                  setDeleteChatsDialog(null);
                  setSelectedChatIds([]);
                }}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold transition cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteChatsDialog(null)}
                className="w-full py-2.5 rounded-2xl text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
