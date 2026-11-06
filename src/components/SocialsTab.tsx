import React, { useState, useRef, useLayoutEffect } from 'react';
import { markChatRead } from '../lib/unreadChats.ts';
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
  Settings, 
  ArrowLeft,
  Check,
  Reply,
  Play,
  Pause,
  Video,
  Palette,
  Sparkles,
  MapPin,
  Clock,
  Volume2,
  Paperclip,
  Film,
  Camera,
  RotateCcw,
  AlertCircle,
  Plus,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  UserCheck
} from 'lucide-react';
import { DatingProfile, ChatConversation, ChatMessage, ChatTheme, UserProfile } from '../types.ts';
import { EmojiPicker } from './EmojiPicker.tsx';
import { AudioMessagePlayer } from './AudioMessagePlayer.tsx';
import { SwipeToReply } from './SwipeToReply.tsx';
import { VideoMessagePlayer } from './VideoMessagePlayer.tsx';
import { generatePlayableWavDataUrl, generateFallbackVideoBlobUrl, formatMediaDuration, deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import type { ToastOptions } from './Toast.tsx';
import { isDemoMode } from '../lib/demoMode.ts';
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
  onOpenVerificationModal?: () => void;
  showToast: (msg: string, options?: ToastOptions) => void;
  targetChatId?: string | null;
  onClearTargetChatId?: () => void;
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
  onOpenVerificationModal,
  showToast,
  targetChatId,
  onClearTargetChatId
}) => {
  const isUserSingle = isDemoMode() || currentUserProfile?.relationshipStatus === 'single' || currentUserProfile?.relationship_status?.toLowerCase() === 'single';
  const isUserVerifiedSingle = isDemoMode() || (isUserSingle && Boolean(currentUserProfile?.isLivenessVerified || currentUserProfile?.is_liveness_verified));
  const [subtab, setSubtab] = useState<'discover' | 'queue' | 'chats' | 'search'>('discover');
  const [showGateModal, setShowGateModal] = useState(false);
  const [profileIndex, setProfileIndex] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'like' | 'pass' | null>(null);

  // Active Chat Screen State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChat: ChatConversation | null = React.useMemo(
    () => (activeChatId ? conversations.find(c => c.id === activeChatId) || null : null),
    [activeChatId, conversations]
  );
  const setActiveChat = (c: ChatConversation | null) => setActiveChatId(c ? c.id : null);
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

  // Helper to remove 'nearby' and distance prefixes, leaving just the location
  const cleanLocation = (locStr?: string) => {
    if (!locStr) return 'Nairobi';
    return locStr
      .replace(/^nearby\s+/i, '')
      .replace(/\bnearby\b/gi, '')
      .replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '')
      .trim();
  };

  const isMockMatchProfile = (p: DatingProfile) => {
    const nameLower = (p.name || '').toLowerCase();
    const handleLower = (p.handle || '').toLowerCase();
    return (
      nameLower.includes('jane doe') ||
      nameLower.includes('amina mwangi') ||
      nameLower.includes('chloe ouma') ||
      handleLower.includes('jane_d') ||
      handleLower.includes('amina_m') ||
      handleLower.includes('chloe_o')
    );
  };

  const [communitySingles, setCommunitySingles] = useState<DatingProfile[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    if (!myUserId) { setCommunitySingles([]); return; }
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
              relationshipStatus: 'single' as const,
              vibes: ['Nairobi Hangouts', 'Music', 'Outings'],
            }))
        );
      })
      .catch(() => { if (!cancelled) setCommunitySingles([]); });
    return () => { cancelled = true; };
  }, [myUserId, isUserVerifiedSingle]);

  // Filter out any mock accounts and only show real verified single members
  const candidatePool = React.useMemo(() => {
    const blocked = new Set<string>();
    requests.forEach(r => {
      if (r.status !== 'declined') { blocked.add(r.fromUser); blocked.add(r.toUser); }
    });
    conversations.forEach(c => { const o = (c as any).otherUserId; if (o) blocked.add(o); });
    return communitySingles.filter(p => p.relationshipStatus === 'single' && !blocked.has(String(p.id)));
  }, [communitySingles, requests, conversations]);

  const currentProfile = candidatePool.length > 0 
    ? candidatePool[profileIndex % candidatePool.length]
    : null;

  const handleSwipe = (action: 'like' | 'pass') => {
    if (!currentProfile) return;
    setSwipeAnimation(action);
    const person = currentProfile;
    setTimeout(async () => {
      if (action === 'like') {
        const res = await onSendMatchRequest(String(person.id));
        if (res.status === 'error') {
          showToast(res.error || 'Could not send the request.', { type: 'error' });
        } else if (res.status === 'matched') {
          showToast(`It's a match with ${person.handle}!`, { category: 'match' });
          if (res.conversationId) { setSubtab('chats'); setActiveChatId(res.conversationId); }
        } else if (res.status === 'already_sent') {
          showToast(`You already sent ${person.handle} a request.`);
        } else {
          showToast(`Hangout & Match request sent to ${person.handle}!`, { category: 'match' });
        }
      }
      setSwipeAnimation(null);
      setProfileIndex(prev => prev + 1);
    }, 250);
  };

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
              {activeChat.isTemporary ? 'Outing group chat' : activeChat.type === 'group' ? 'Group chat' : 'Active now'}
              {activeChat.members ? ` · ${activeChat.members.length} members` : ''}
            </p>
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
      </div>
    );
  }

  const avatarRing = 'p-[2px] bg-gradient-to-tr from-[#F43F5E] to-[#E0533C] rounded-full shrink-0';
  const statusRow = (label: string, ok: boolean, okText: string, noText: string, warn = false) => (
    <div className="flex items-center justify-between font-bold">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
          ok
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
            : warn
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
            : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
        }`}
      >
        {ok ? okText : noText}
      </span>
    </div>
  );

  return (
    <section className="px-4 py-4 space-y-4 min-[900px]:max-w-2xl min-[900px]:mx-auto">
      {/* Socials sub-tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-full text-center text-[13px]">
        {[
          { id: 'discover', label: 'Discover' },
          { id: 'queue', label: 'Requests' },
          { id: 'chats', label: 'Chats' },
          { id: 'search', label: 'Search' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'discover' && (!isUserSingle || !isUserVerifiedSingle)) {
                setShowGateModal(true);
                setSubtab('discover');
                return;
              }
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

      {/* DISCOVER: gate for people who are not verified singles */}
      {subtab === 'discover' && (!isUserSingle || !isUserVerifiedSingle) && (
        <div className={`p-5 ${CARD} rounded-3xl text-center space-y-4 shadow-sm animate-in fade-in duration-200`}>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              <span>Verified singles only</span>
            </span>
            <h3 className="font-black text-[15px] text-slate-900 dark:text-slate-100">Discover is reserved for verified single profiles.</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">You can still create and join Group Chats!</p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-white/[0.04] rounded-2xl text-xs text-left space-y-2 max-w-sm mx-auto">
            {statusRow('Profile status', isUserSingle, 'Single', 'Not single')}
            {statusRow('Selfie check', !!currentUserProfile?.isLivenessVerified, 'Passed', 'Not done yet', true)}
          </div>

          <div className="pt-1 flex flex-col gap-2.5 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => { if (onOpenVerificationModal) onOpenVerificationModal(); }}
              className="w-full py-3 px-4 bg-[#E0533C] text-white font-extrabold rounded-full text-[13px] shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Take the selfie check</span>
            </button>
            <button
              type="button"
              onClick={() => setSubtab('chats')}
              className="w-full py-3 px-4 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-full text-[13px] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#E0533C]" />
              <span>Explore &amp; join group chats</span>
            </button>
          </div>
        </div>
      )}

      {/* DISCOVER: profile card (verified singles) */}
      {subtab === 'discover' && isUserSingle && isUserVerifiedSingle && (
        <div className="space-y-4">
          {currentProfile ? (
            <div
              className={`${CARD} rounded-3xl overflow-hidden shadow-md relative transition-all duration-300 ${
                swipeAnimation === 'like' ? 'translate-x-28 rotate-12 opacity-0' : swipeAnimation === 'pass' ? '-translate-x-28 -rotate-12 opacity-0' : ''
              }`}
            >
              <div
                className="h-[26rem] bg-cover bg-center relative cursor-pointer"
                style={{ backgroundImage: `url('${currentProfile.img}')` }}
                onClick={() => onViewUserProfile({
                  id: String(currentProfile.id),
                  name: currentProfile.name,
                  handle: currentProfile.handle,
                  avatar: currentProfile.img,
                  bio: currentProfile.bio || 'Exploring Nairobi hangouts, food, and culture.',
                  loc: cleanLocation(currentProfile.loc),
                  relationshipStatus: currentProfile.relationshipStatus,
                  vibes: currentProfile.vibes
                })}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-[#F43F5E] to-[#E0533C]">
                  <ShieldCheck className="w-3 h-3" />
                  Verified single
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewUserProfile({
                      id: String(currentProfile.id),
                      name: currentProfile.name,
                      handle: currentProfile.handle,
                      avatar: currentProfile.img,
                      bio: currentProfile.bio || 'Exploring Nairobi hangouts, food, and culture.',
                      loc: cleanLocation(currentProfile.loc),
                      relationshipStatus: currentProfile.relationshipStatus,
                      vibes: currentProfile.vibes
                    });
                  }}
                  className="absolute top-3 right-3 bg-black/55 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full active:scale-95 transition cursor-pointer"
                >
                  View profile
                </button>

                <div className="absolute bottom-0 inset-x-0 p-4 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-black text-xl text-white truncate">{currentProfile.name}</h3>
                    <span className="text-xs text-white/80 font-bold shrink-0">{currentProfile.handle}</span>
                  </div>
                  <p className="text-xs text-white/85 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{cleanLocation(currentProfile.loc)}</span>
                  </p>
                  {currentProfile.vibes && currentProfile.vibes.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {currentProfile.vibes.map((v, i) => (
                        <span key={i} className="text-[11px] bg-white/15 backdrop-blur-md text-white px-2.5 py-1 rounded-full font-bold">
                          #{v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {currentProfile.bio && (
                  <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{currentProfile.bio}</p>
                )}

                <div className="flex gap-6 justify-center">
                  <button
                    onClick={() => handleSwipe('pass')}
                    className="w-14 h-14 rounded-full bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-500 hover:text-red-500 hover:border-red-400 flex items-center justify-center shadow-md active:scale-95 transition cursor-pointer"
                    title="Pass"
                    aria-label="Pass"
                  >
                    <X className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => handleSwipe('like')}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F43F5E] to-[#E0533C] text-white flex items-center justify-center shadow-lg shadow-[#E0533C]/30 active:scale-95 transition cursor-pointer"
                    title="Send match request"
                    aria-label="Send match request"
                  >
                    <Heart className="w-7 h-7 fill-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`py-10 text-center ${CARD} rounded-3xl p-6 space-y-3`}>
              <div className="w-12 h-12 rounded-2xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-black text-[15px] text-slate-900 dark:text-slate-100">
                {candidatePool.length === 0 ? 'No match profiles right now' : "You've reached the end of the queue!"}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                {candidatePool.length === 0
                  ? "Nobody new to show yet. We're adding people as more verified singles join RADA. Check back soon, or invite a friend."
                  : 'Check back later for new people joining RADA, or invite friends to join.'}
              </p>
              {candidatePool.length > 0 && (
                <button
                  onClick={() => setProfileIndex(0)}
                  className="px-5 py-2.5 bg-[#E0533C] text-white rounded-full text-[13px] font-extrabold shadow-lg shadow-[#E0533C]/25 active:scale-95 transition cursor-pointer"
                >
                  Start over
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
      {subtab === 'chats' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={HEADING}>Conversations ({conversations.length})</h3>
            <button
              onClick={onOpenCreateGroupModal}
              className="px-3 py-1.5 rounded-full bg-[#E0533C]/10 text-[#E0533C] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>New group</span>
            </button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 && (
              <div className={`${CARD} border-dashed rounded-3xl py-8 px-5 text-center space-y-2`}>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No chats yet. Match with someone, or start a group with the New group button.
                </p>
              </div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className={`p-3 ${CARD} rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#E0533C]/50 active:scale-[0.99] transition cursor-pointer`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">{formatChatTime((conv as any).lastMessageAt)}</span>
                  {conv.isTemporary ? (
                    <span className="text-[10px] font-extrabold text-[#E0533C] block mt-0.5">Unlocked</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#E0533C] inline-block mt-1.5" />
                  )}
                </div>
              </div>
            ))}
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
              const isSingle = String(p.relationship_status || '').toLowerCase() === 'single';
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
                    relationshipStatus: isSingle ? 'single' : 'not_single',
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
                  {isSingle && p.is_liveness_verified && (
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#E0533C]/10 text-[#E0533C] flex items-center gap-1 shrink-0">
                      <UserCheck className="w-3 h-3" />
                      <span>Single</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gate modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl max-w-sm w-full p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-[15px] text-slate-900 dark:text-slate-100">Single-only Discover</h3>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Discover is reserved for verified single profiles. You can still create and join Group Chats!
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-2xl text-xs text-left space-y-2">
              {statusRow('Your status', isUserSingle, 'Single', 'Not single')}
              {statusRow('Selfie check', !!currentUserProfile?.isLivenessVerified, 'Passed', 'Not done yet', true)}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowGateModal(false); if (onOpenVerificationModal) onOpenVerificationModal(); }}
                className="w-full py-3 px-4 bg-[#E0533C] text-white font-extrabold rounded-full text-[13px] shadow-lg shadow-[#E0533C]/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Verify my single profile</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowGateModal(false); setSubtab('chats'); }}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-white/[0.07] text-slate-700 dark:text-slate-200 font-bold rounded-full text-[13px] active:scale-[0.98] transition cursor-pointer"
              >
                Go to group chats
              </button>
              <button
                type="button"
                onClick={() => setShowGateModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold py-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
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
