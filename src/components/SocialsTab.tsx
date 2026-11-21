import React, { useState, useRef, useLayoutEffect } from 'react';
import { markChatRead, isChatUnread, useUnreadChatCount } from '../lib/unreadChats.ts';
import { 
  Heart, 
  X, 
  Users, 
  MessageSquare, 
  Search, 
  Smile, 
  Mic, 
  Send, 
  Calendar, 
  ArrowLeft,
  Reply,
  Video,
  Sparkles,
  Paperclip,
  Camera,
  Plus,
  Image as ImageIcon,
  Receipt
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
import { BillSplitCard, StartBillSheet } from './BillSplitCard.tsx';
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
  requests: CloudRequest[];
  onSendMatchRequest: (toUserId: string) => Promise<{ status: 'sent' | 'already_sent' | 'matched' | 'error'; conversationId?: string; error?: string }>;
  onRespondRequest: (requestId: string, accept: boolean) => Promise<{ conversationId: string | null; error: string | null }>;
  onSendMessage: (conversationId: string, msg: OutgoingMessage) => Promise<string | null>;
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
  discoveryProfiles,
  conversations,
  currentUserProfile,
  myUserId,
  requests,
  onSendMatchRequest,
  onRespondRequest,
  onSendMessage,
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
  const [subtab, setSubtab] = useState<'discover' | 'queue' | 'chats' | 'groups' | 'asks' | 'search'>('asks');
  const [showBillSheet, setShowBillSheet] = useState(false);

  // Active Chat Screen State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  useUnreadChatCount(); // re-render the chat list when a chat becomes read or unread
  const activeChat: ChatConversation | null = React.useMemo(
    () => (activeChatId ? conversations.find(c => c.id === activeChatId) || null : null),
    [activeChatId, conversations]
  );
  const setActiveChat = (c: ChatConversation | null) => setActiveChatId(c ? c.id : null);
  // Demo Mode: plain group chats live in the Groups tab; Chats keeps DMs and outing chats
  const demoGroupChats = React.useMemo(
    () => (isDemoMode() ? conversations.filter((c) => c.type === 'group' && !c.isTemporary) : []),
    [conversations]
  );
  const chatListItems = React.useMemo(
    () => (isDemoMode() ? conversations.filter((c) => !(c.type === 'group' && !c.isTemporary)) : conversations),
    [conversations]
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

  // Match requests come from the database: what others sent me, and what I sent
  const pendingRequests = React.useMemo(
    () => requests.filter(r => r.status === 'pending' && r.toUser === myUserId),
    [requests, myUserId]
  );
  const sentRequests = React.useMemo(
    () => requests.filter(r => r.status === 'pending' && r.fromUser === myUserId),
    [requests, myUserId]
  );

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

  const handleAcceptPending = async (req: CloudRequest) => {
    const res = await onRespondRequest(req.id, true);
    if (res.error) { showToast(res.error, { type: 'error' }); return; }
    if (res.conversationId) { setSubtab('chats'); setActiveChatId(res.conversationId); }
  };

  const handleDeclinePending = async (req: CloudRequest) => {
    const res = await onRespondRequest(req.id, false);
    if (res.error) showToast(res.error, { type: 'error' });
  };

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

  const handleSendMessage = async () => {
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
    const msgs = activeChat.messages;
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${chatStyles.bg} transition-colors duration-200`}>
        {/* Chat Room Header */}
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
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121113]" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm leading-tight truncate text-slate-900 dark:text-slate-100">{activeChat.name}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeChat.isTemporary ? 'Outing group chat' : activeChat.type === 'group' ? 'Group chat' : 'Tap to view profile'}
              {activeChat.members ? ` · ${activeChat.members.length} members` : ''}
            </p>
          </div>
          </div>

          {activeChat.type === 'group' && !isDemoMode() && (
            <button
              onClick={() => setShowBillSheet(true)}
              className="h-9 px-3 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 rounded-full text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
              aria-label="Split the bill"
            >
              <Receipt className="w-4 h-4 text-[#E0533C]" />
              <span className="hidden min-[400px]:inline">Split</span>
            </button>
          )}
          <button
            onClick={() => onOpenPlanDateModal(activeChat.id)}
            className="h-9 px-3 bg-[#E0533C] text-white rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#E0533C]/25 active:scale-95 transition cursor-pointer shrink-0"
            aria-label="Plan a date"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden min-[380px]:inline">Plan a Date</span>
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-lg mx-auto w-full px-3 py-3">
            {/* Outing Squad Banner for Outing Group Chats */}
            {activeChat.isTemporary && (
              <div className="mb-3 p-3 bg-gradient-to-br from-[#E0533C]/15 to-amber-400/15 border border-[#E0533C]/25 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0533C] text-white text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
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

              const replyBtn = (
                <button
                  type="button"
                  onClick={() => startReply(msg)}
                  title="Reply"
                  aria-label="Reply"
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-[#E0533C] hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              );

              return (
                <SwipeToReply key={msg.id} onReply={() => startReply(msg)} className={sameAsPrev ? 'mt-0.5' : 'mt-2.5'}>
                  <div id={`msg-${msg.id}`} className={`flex flex-col group ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && activeChat.type === 'group' && handle && !sameAsPrev && (
                      <span className="text-[11px] font-bold text-[#E0533C] mb-0.5 px-2">{handle}</span>
                    )}

                    <div className="flex items-end gap-1 max-w-[88%]">
                      {mine && replyBtn}

                      {msg.billSplitId ? (
                        <BillSplitCard splitId={msg.billSplitId} myUserId={myUserId} showToast={showToast} />
                      ) : msg.dateInvite ? (
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
                                <div key={pIdx} onClick={() => setViewerPhoto(photoUrl)} className="rounded-2xl overflow-hidden max-h-52 bg-black/10 cursor-pointer">
                                  <img src={photoUrl} alt={`Attachment ${pIdx + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.text && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>}
                          <span className="text-[10px] opacity-70 block text-right mt-0.5">{msg.time}</span>
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
        {showBillSheet && (
          <StartBillSheet
            conversationId={activeChat.id}
            memberCount={activeChat.members?.length || 2}
            showToast={showToast}
            onClose={() => setShowBillSheet(false)}
            onCreated={async (splitId, title, total) => {
              setShowBillSheet(false);
              const err = await onSendMessage(activeChat.id, {
                kind: 'text',
                content: `Bill split: ${title}, KES ${total.toLocaleString('en-KE')}`,
                media: { billSplitId: splitId },
              });
              if (err) showToast(friendlySendError(err), { type: 'error' });
            }}
          />
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
          { id: 'queue', label: 'Requests' },
          { id: 'chats', label: 'Chats' },
          { id: 'groups', label: 'Groups' },
          { id: 'search', label: 'Search' }
        ].filter((tab) => !(isDemoMode() && tab.id === 'queue')).map((tab) => (
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
            {tab.id === 'queue' && pendingRequests.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-[#E0533C] text-white text-[10px] font-black inline-flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* REQUESTS */}
      {subtab === 'queue' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <h3 className={HEADING}>Pending requests (likes you)</h3>
            {pendingRequests.length === 0 ? (
              <div className={`${CARD} border-dashed rounded-3xl py-8 text-center space-y-2`}>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">No pending requests right now.</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={avatarRing}>
                      <div
                        className="w-11 h-11 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E]"
                        style={{ backgroundImage: `url('${req.fromAvatar}')` }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[13px] truncate text-slate-900 dark:text-slate-100">{req.fromHandle}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Wants to hang out</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeclinePending(req)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-slate-300 font-bold rounded-full text-xs active:scale-95 transition cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptPending(req)}
                      className="px-4 py-2 bg-[#E0533C] text-white font-extrabold rounded-full text-xs shadow-md shadow-[#E0533C]/25 active:scale-95 transition cursor-pointer"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {sentRequests.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <h3 className={HEADING}>Sent hangout requests ({sentRequests.length})</h3>
              <div className="space-y-2">
                {sentRequests.map((req) => (
                  <div key={req.id} className={`p-2.5 ${CARD} rounded-2xl flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${req.toAvatar}')` }} />
                      <span className="font-bold text-[13px] truncate text-slate-900 dark:text-slate-100">{req.toHandle}</span>
                    </div>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full shrink-0">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHATS */}
      {subtab === 'asks' && (
        <AsksSection signedIn={Boolean(myUserId)} showToast={showToast} spots={spots} events={events} onChatOpened={(chatId) => { void onRefreshSocials(); setSubtab('chats'); if (isDemoMode() && chatId) setActiveChatId(chatId); }} />
      )}
      {subtab === 'groups' && !isDemoMode() && (
        <GroupsSection signedIn={Boolean(myUserId)} showToast={showToast} />
      )}
      {subtab === 'groups' && isDemoMode() && (
        <div className="space-y-3">
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
          <div className="space-y-2">
            {demoGroupChats.length === 0 && (
              <div className={`${CARD} border-dashed rounded-3xl py-8 px-5 text-center space-y-2`}>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">No groups yet. Start one with the New group button.</p>
              </div>
            )}
            {demoGroupChats.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#E0533C]/50 active:scale-[0.99] transition cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={avatarRing}>
                    <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1C1A1E]" style={{ backgroundImage: `url('${conv.avatar}')` }} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.name}</h4>
                    <p className="text-xs truncate mt-0.5 text-slate-500 dark:text-slate-400">{conv.lastMessage}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">{(conv.members || []).length} members</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{formatChatTime((conv as any).lastMessageAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subtab === 'chats' && (
        <div className="space-y-3">
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

          <div className="space-y-2">
            {chatListItems.length === 0 && (
              <div className={`${CARD} border-dashed rounded-3xl py-8 px-5 text-center space-y-2`}>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No chats yet. Match with someone, or start a group with the New group button.
                </p>
              </div>
            )}
            {chatListItems.map((conv) => {
              const unread = isChatUnread(conv);
              return (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#E0533C]/50 active:scale-[0.99] transition cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="relative shrink-0"
                    onClick={(e) => {
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
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1C1A1E]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.name}</h4>
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
      )}

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
    </section>
  );
};
