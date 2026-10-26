import React, { useState, useRef, useLayoutEffect } from 'react';
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
import { VideoMessagePlayer } from './VideoMessagePlayer.tsx';
import { generatePlayableWavDataUrl, generateFallbackVideoBlobUrl, formatMediaDuration, deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';
import type { ToastOptions } from './Toast.tsx';
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
import { isDemoMode } from '../lib/demoData.ts';

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
  const isUserVerifiedSingle = isDemoMode() || isUserSingle && Boolean(currentUserProfile?.isLivenessVerified || currentUserProfile?.is_liveness_verified);
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

  // Voice note recording state & refs
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
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
      m => m.text?.startsWith('✅ Date accepted') && m.text.includes(msg.dateInvite?.spotTitle || '\u0000')
    );

  const handleAcceptDateInvite = async (msg: ChatMessage) => {
    if (!msg.dateInvite || !activeChat) return;
    const d = msg.dateInvite;
    const err = await onSendMessage(activeChat.id, {
      kind: 'text',
      content: `✅ Date accepted: ${d.spotTitle} on ${d.date} at ${d.time}`,
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

  // Clean standard chat styles matching app theme
  const chatStyles = {
    bg: 'bg-white dark:bg-[#121113]',
    header: 'bg-white/95 dark:bg-[#121113]/95 text-slate-900 dark:text-slate-100',
    myBubble: 'bg-[#E0533C] dark:bg-[#A94F3E] text-white',
    theirBubble: 'bg-slate-100 dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800',
  };

  // If in chat room
  if (activeChat) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${chatStyles.bg} transition-colors duration-200`}>
        {/* Chat Room Header */}
        <div className={`sticky top-0 z-10 backdrop-blur-md px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between ${chatStyles.header}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveChat(null)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:scale-105 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white/40 shadow-sm"
                  style={{ backgroundImage: `url('${activeChat.avatar}')` }}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1C1A1E]" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{activeChat.name}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>
                    {activeChat.isTemporary 
                      ? 'Temporary Outing Group Chat' 
                      : activeChat.type === 'group' 
                      ? 'Group Chat' 
                      : 'Active'}
                  </span>
                  {activeChat.members && (
                    <span>• {activeChat.members.length} members</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPlanDateModal(activeChat.id)}
              className="px-3 py-1.5 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Plan a Date</span>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-w-lg mx-auto w-full">
          {/* Outing Squad Banner for Outing Group Chats */}
          {activeChat.isTemporary && (
            <div className="p-3 bg-gradient-to-r from-orange-500/15 via-rose-500/15 to-amber-500/15 border border-[#E0533C]/30 dark:border-[#D17A68]/30 rounded-2xl shadow-xs text-xs space-y-2 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E0533C] dark:bg-[#A94F3E] text-white text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>Temporary Outing Squad Chat</span>
                </span>
                {activeChat.members && (
                  <span className="text-[10px] font-extrabold text-[#E0533C] dark:text-orange-300">
                    {activeChat.members.length} Squad Members
                  </span>
                )}
              </div>
              {activeChat.members && activeChat.members.length > 0 && (
                <div className="text-[11px] text-slate-700 dark:text-slate-200">
                  <span className="font-bold opacity-75">Confirmed: </span>
                  <span className="font-semibold">{activeChat.members.join(' • ')}</span>
                </div>
              )}
            </div>
          )}

          {activeChat.messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2 w-full animate-in fade-in duration-200">
                  <div className="bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/10 rounded-2xl px-4 py-2 text-[11px] font-medium text-center max-w-sm shadow-xs backdrop-blur-xs">
                    <p className="leading-relaxed font-semibold">{msg.text}</p>
                    <span className="text-[9px] opacity-60 block mt-1">{msg.time}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
              >
                {msg.sender === 'them' && activeChat.type === 'group' && (msg as any).senderHandle && (
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">{(msg as any).senderHandle}</span>
                )}
                {/* Swipe-to-reply button row */}
                <div className="flex items-center gap-1 max-w-[85%]">
                  {msg.sender !== 'me' && (
                    <button
                      onClick={() => {
                        setReplyingTo(msg);
                      }}
                      title="Swipe or click to reply"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}

                {msg.dateInvite ? (
                  <div className="w-full bg-gradient-to-r from-[#E0533C] dark:from-[#A94F3E] to-orange-600 text-white p-3.5 rounded-2xl shadow-md space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border-b border-white/20 pb-1">
                      <Calendar className="w-3.5 h-3.5" /> Date Invitation
                    </div>
                    <h4 className="font-black text-sm">{msg.dateInvite.spotTitle}</h4>
                    <p className="text-[11px] opacity-90">{msg.dateInvite.address}</p>
                    <p className="text-[11px] font-bold bg-white/20 px-2 py-1 rounded-lg inline-block">
                      {msg.dateInvite.date} at {msg.dateInvite.time}
                    </p>
                    <button
                      disabled={isInviteAccepted(msg) || msg.sender === 'me'}
                      onClick={() => handleAcceptDateInvite(msg)}
                      className={`w-full mt-2 py-2 text-xs font-extrabold rounded-xl shadow transition ${
                        isInviteAccepted(msg)
                          ? 'bg-emerald-800 text-white cursor-default'
                          : msg.sender === 'me'
                          ? 'bg-white/30 text-white cursor-default'
                          : 'bg-white text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {isInviteAccepted(msg) ? '✓ Date Accepted' : msg.sender === 'me' ? 'Invitation sent' : 'Accept Date'}
                    </button>
                  </div>
                ) : msg.videoNoteUrl ? (
                  /* Circular Video Note */
                  <VideoMessagePlayer
                    videoUrl={msg.videoNoteUrl}
                    isCircular={true}
                    videoDuration={msg.videoDuration || 6}
                    isMyMessage={msg.sender === 'me'}
                    time={msg.time}
                    replyTo={msg.replyTo}
                  />
                ) : msg.videoUrl ? (
                  /* Rectangular Video Message */
                  <VideoMessagePlayer
                    videoUrl={msg.videoUrl}
                    isCircular={false}
                    videoDuration={msg.videoDuration || 10}
                    isMyMessage={msg.sender === 'me'}
                    time={msg.time}
                    replyTo={msg.replyTo}
                  />
                ) : msg.audioUrl ? (
                  /* Voice Note Bubble with functional player & scrubbable waveform */
                  <div className={`p-3 rounded-2xl text-xs shadow-xs min-w-[220px] ${
                    msg.sender === 'me'
                      ? `${chatStyles.myBubble} rounded-tr-none`
                      : `${chatStyles.theirBubble} rounded-tl-none`
                  }`}>
                    <AudioMessagePlayer
                      audioUrl={msg.audioUrl}
                      durationSeconds={msg.audioDuration || 14}
                      isMyMessage={msg.sender === 'me'}
                      time={msg.time}
                      replyTo={msg.replyTo}
                    />
                  </div>
                ) : (
                  /* Standard text message bubble with reply support */
                  <div
                    className={`p-3 rounded-2xl text-xs shadow-xs ${
                      msg.sender === 'me'
                        ? `${chatStyles.myBubble} rounded-tr-none`
                        : `${chatStyles.theirBubble} rounded-tl-none`
                    }`}
                  >
                    {msg.replyTo && (
                      <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1">
                        <span className="font-bold opacity-80 block">{msg.replyTo.sender}</span>
                        <p className="truncate opacity-75">{msg.replyTo.text}</p>
                      </div>
                    )}
                    {msg.photos && msg.photos.length > 0 && (
                      <div className={`grid gap-1.5 mb-1.5 ${msg.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {msg.photos.map((photoUrl, pIdx) => (
                          <div key={pIdx} className="rounded-xl overflow-hidden max-h-48 border border-black/10 dark:border-white/10 bg-black/10">
                            <img src={photoUrl} alt={`Attachment ${pIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>}
                    <span className="text-[9px] opacity-70 block text-right mt-1">{msg.time}</span>
                  </div>
                )}


                {msg.sender === 'me' && (
                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                    }}
                    title="Swipe or click to reply"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {/* Swipe-to-reply Preview Banner */}
        {replyingTo && (
          <div className="max-w-lg mx-auto w-full px-4">
            <div className="bg-slate-100 dark:bg-slate-800 border-l-4 border-[#E0533C] dark:border-[#D17A68] p-2 rounded-r-xl flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="font-extrabold text-[10px] text-[#E0533C] dark:text-[#D17A68]">
                  Replying to {replyingTo.sender === 'me' ? 'Yourself' : activeChat.name}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{replyingTo.text}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Expanded Rich Emoji Picker */}
        {showEmojiPicker && (
          <div className="max-w-lg mx-auto w-full px-4 mb-2">
            <EmojiPicker
              isOpen={showEmojiPicker}
              onSelectEmoji={(emoji) => setChatInputText(prev => prev + emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Active Audio Recording Bar */}
        {isRecordingAudio && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border-t border-red-200 dark:border-red-900 max-w-lg mx-auto w-full flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>Recording Voice Note... {formatMediaDuration(recordSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStopVoiceRecording(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStopVoiceRecording(true)}
                className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Send Note</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Circular Video Recording Viewfinder */}
        {isRecordingVideo && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/90 border-t border-purple-200 dark:border-purple-900 max-w-lg mx-auto w-full flex flex-col items-center gap-3 text-xs animate-in slide-in-from-bottom duration-150">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl bg-black flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/30 pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mb-1" />
                <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                  {formatMediaDuration(videoRecordSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                <span>Circular Video Note ({formatMediaDuration(videoRecordSeconds)})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStopVideoNoteRecording(false)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStopVideoNoteRecording(true)}
                  className="px-3.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Video</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Social Attachment Previews with Thumbnail Previews, Deduplication Guard, and 'X' Removal */}
        {attachedPhotos.length > 0 && (
          <div className="max-w-lg mx-auto w-full px-3 py-2 bg-slate-100/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between pb-1.5 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-[#E0533C] dark:text-[#D17A68]" />
                <span>Photos ({attachedPhotos.length}/5)</span>
                {attachedPhotos.length >= 5 && (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">• Max limit reached</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachedPhotos([]);
                }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition cursor-pointer"
              >
                Clear all
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
              {attachedPhotos.map((photoUrl, pIdx) => (
                <div
                  key={pIdx}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-800 shrink-0 shadow-xs group"
                >
                  <img
                    src={photoUrl}
                    alt={`Attached preview ${pIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Clean individual photo removal button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAttachedPhoto(pIdx);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition cursor-pointer shadow-xs z-10"
                    title="Remove photo"
                    aria-label={`Remove attached photo ${pIdx + 1}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <span className="absolute bottom-0.5 left-1 bg-black/60 text-white text-[8px] font-bold px-1 rounded">
                    {pIdx + 1}
                  </span>
                </div>
              ))}
              {attachedPhotos.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoFileInputRef.current?.click()}
                  className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] dark:hover:border-[#D17A68] flex flex-col items-center justify-center text-slate-400 hover:text-[#E0533C] dark:hover:text-[#D17A68] transition shrink-0 cursor-pointer"
                  title="Add more photos"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px] font-bold mt-0.5">Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="w-full overflow-hidden px-2 py-2 sm:px-3 sm:py-2.5 bg-white/95 dark:bg-[#121113]/95 border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto flex items-end gap-1.5 sm:gap-2">
          {/* Hidden File Inputs for real attachments */}
          <input
            type="file"
            ref={photoFileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <input
            type="file"
            ref={videoFileInputRef}
            accept="video/*"
            className="hidden"
            onChange={handleVideoFileUpload}
          />
          <input
            type="file"
            ref={audioFileInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleAudioFileUpload}
          />

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-500 hover:text-[#E0533C] dark:hover:text-[#D17A68] flex-shrink-0 transition cursor-pointer"
            title="Emoji Panel"
            aria-label="Emoji Panel"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Attach Photos button */}
          <button
            type="button"
            onClick={() => photoFileInputRef.current?.click()}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 transition cursor-pointer ${
              attachedPhotos.length > 0 ? 'text-[#E0533C] dark:text-[#D17A68]' : 'text-slate-500 hover:text-[#E0533C] dark:hover:text-[#D17A68]'
            }`}
            title="Attach Photos (up to 5)"
            aria-label="Attach Photos"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Attach Video button */}
          <button
            type="button"
            onClick={() => videoFileInputRef.current?.click()}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-500 hover:text-[#E0533C] dark:hover:text-[#D17A68] flex-shrink-0 transition cursor-pointer"
            title="Attach Video from Device"
            aria-label="Attach Video"
          >
            <Paperclip className="w-4 h-4" />
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
            placeholder="Type a message..."
            enterKeyHint="send"
            className="flex-1 min-w-0 px-3 py-2 sm:py-2.5 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-xs leading-[18px] resize-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] focus:outline-none focus:ring-1 focus:ring-[#E0533C] dark:focus:ring-[#D17A68] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />

          {/* Circular Video Note Button */}
          <button
            type="button"
            onClick={() => {
              if (isRecordingVideo) handleStopVideoNoteRecording(true);
              else handleStartVideoNoteRecording();
            }}
            title={isRecordingVideo ? 'Send Circular Video Note' : 'Record Circular Video Note'}
            aria-label="Record Circular Video Note"
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
              isRecordingVideo
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] dark:hover:bg-[#A94F3E] hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Voice Note Mic Button */}
          <button
            type="button"
            onClick={() => {
              if (isRecordingAudio) handleStopVoiceRecording(true);
              else handleStartVoiceRecording();
            }}
            title={isRecordingAudio ? 'Send Voice Note' : 'Record Voice Note'}
            aria-label="Record Voice Note"
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
              isRecordingAudio
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-[#14171F] text-slate-700 dark:text-slate-300 hover:bg-[#FF5733] dark:hover:bg-[#A94F3E] hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Message Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            className="w-9 h-9 rounded-xl sm:rounded-2xl bg-[#FF5733] dark:bg-[#A94F3E] text-white flex items-center justify-center shadow-md hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] transition flex-shrink-0 cursor-pointer"
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="px-4 py-4 space-y-4">
      {/* Socials Subtabs Navigation */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#14171F] p-1 rounded-2xl text-center shadow-inner text-xs border border-slate-200/80 dark:border-[#222735]">
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
            className={`py-2 rounded-xl transition cursor-pointer ${
              subtab === tab.id
                ? 'font-black bg-white dark:bg-[#0A0C10] text-[#FF5733] dark:text-[#D17A68] shadow-xs'
                : 'font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DISCOVER TAB: Explanatory Gate Screen if NOT single or NOT verified single */}
      {subtab === 'discover' && (!isUserSingle || !isUserVerifiedSingle) && (
        <div className="space-y-4">
          <div className="p-6 sm:p-7 bg-white dark:bg-[#14171F] border border-slate-200 dark:border-[#222735] rounded-3xl text-center space-y-4 shadow-sm animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                <span>Single-Only Discover Access Gate</span>
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                Discover is reserved for verified single profiles.
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Discover is reserved for verified single profiles. You can still create and join Group Chats!
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0A0C10] rounded-2xl border border-slate-200 dark:border-[#222735] text-[11px] text-left space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Profile Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  isUserSingle 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {currentUserProfile?.relationshipStatus === 'single' ? 'Single' : 'Not single'}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Camera Liveness:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  currentUserProfile?.isLivenessVerified 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {currentUserProfile?.isLivenessVerified ? 'Verified' : 'Verification Required'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  if (onOpenVerificationModal) onOpenVerificationModal();
                }}
                className="w-full py-3.5 px-4 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Verify Single Profile (Camera Liveness Check)</span>
              </button>

              <button
                type="button"
                onClick={() => setSubtab('chats')}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#0A0C10] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#222735] text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#FF5733] dark:text-[#D17A68]" />
                <span>Explore & Join Group Chats</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOVER TAB: SWIPE CARD (Active ONLY when user is single AND liveness verified) */}
      {subtab === 'discover' && isUserSingle && isUserVerifiedSingle && (
        <div className="space-y-4">
          {currentProfile ? (
            <div
              className={`bg-white dark:bg-[#14171F] border border-slate-200/90 dark:border-[#222735] rounded-3xl p-4 shadow-md overflow-hidden relative transition-all duration-300 ${
                swipeAnimation === 'like' ? 'translate-x-28 rotate-12 opacity-0' : swipeAnimation === 'pass' ? '-translate-x-28 -rotate-12 opacity-0' : ''
              }`}
            >
              {/* Photo Area with Rose to Sunset Coral Ring for verified single profile */}
              <div className="p-[3px] bg-gradient-to-tr from-[#F43F5E] to-[#FF5733] dark:to-[#A94F3E] rounded-[22px] mb-4 shadow-md">
                <div
                  className="h-96 rounded-[19px] bg-cover bg-center relative cursor-pointer group overflow-hidden"
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
                  {/* Status Badge: Single with Rose to Coral gradient */}
                  <div className="absolute top-3 left-3">
                    <span className="backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm bg-gradient-to-r from-[#F43F5E] to-[#FF5733] dark:to-[#A94F3E]">
                      Verified Single
                    </span>
                  </div>

                  {/* View Bio Button */}
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
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full transition cursor-pointer"
                  >
                    View Profile
                  </button>
                </div>
              </div>

              {/* Bio & Details Area */}
              <div className="bg-slate-50 dark:bg-[#0A0C10] p-4 rounded-2xl border border-slate-200 dark:border-[#222735] space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    {currentProfile.name}
                  </h3>
                  <span className="text-xs text-[#FF5733] dark:text-[#D17A68] font-bold">{currentProfile.handle}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5733] dark:text-[#D17A68]" />
                  <span>{cleanLocation(currentProfile.loc)}</span>
                </p>

                {currentProfile.bio && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                    {currentProfile.bio}
                  </p>
                )}

                {currentProfile.vibes && currentProfile.vibes.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-2">
                    {currentProfile.vibes.map((v, i) => (
                      <span key={i} className="text-[10px] bg-white dark:bg-[#14171F] text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-bold border border-slate-200 dark:border-[#222735]">
                        #{v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Swipe Action Buttons */}
              <div className="flex gap-6 justify-center py-1">
                <button
                  onClick={() => handleSwipe('pass')}
                  className="w-14 h-14 rounded-full bg-white dark:bg-[#14171F] border-2 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-500 flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
                  title="Pass"
                >
                  <X className="w-7 h-7" />
                </button>

                <button
                  onClick={() => handleSwipe('like')}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-[#F43F5E] to-[#FF5733] dark:to-[#A94F3E] text-white flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
                  title="Send Match Request"
                >
                  <Heart className="w-7 h-7 fill-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-[#E0533C] dark:text-[#D17A68] mx-auto" />
              <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                {candidatePool.length === 0 ? 'No match profiles right now' : "You've reached the end of the profile queue!"}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {candidatePool.length === 0 
                  ? 'All mock demo profiles have been removed. Verified single Nairobi community members who complete the camera liveness check will appear here.'
                  : 'Check back later for new single members joining RADA, or invite friends to take the liveness verification.'}
              </p>
              {candidatePool.length > 0 && (
                <button
                  onClick={() => setProfileIndex(0)}
                  className="px-4 py-2 bg-[#E0533C] dark:bg-[#A94F3E] text-white rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  Reset Queue
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* REQUESTS QUEUE */}
      {subtab === 'queue' && (
        <div className="space-y-4 text-xs">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Pending Requests (Likes You)
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No pending requests right now.</p>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                      style={{ backgroundImage: `url('${req.fromAvatar}')` }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs truncate">{req.fromHandle}</h4>
                      <p className="text-[10px] text-slate-400">Wants to hang out</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeclinePending(req)}
                      className="px-3 py-2 bg-white dark:bg-[#0A0C10] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptPending(req)}
                      className="px-4 py-2 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {sentRequests.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Sent Hangout Requests ({sentRequests.length})
              </h3>
              <div className="space-y-2">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url('${req.toAvatar}')` }}
                      />
                      <span className="font-bold text-xs">{req.toHandle}</span>
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      Pending Response
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHATS TAB */}
      {subtab === 'chats' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Active Conversations ({conversations.length})
            </h3>
            <button
              onClick={onOpenCreateGroupModal}
              className="text-[#FF5733] dark:text-[#D17A68] font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ New Group</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {conversations.length === 0 && (
              <p className="text-slate-400 py-6 text-center">
                No chats yet. Match with someone, or start a group with the + New Group button.
              </p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className="p-3 bg-white dark:bg-[#14171F] border border-slate-200/90 dark:border-[#222735] rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#FF5733] dark:hover:border-[#D17A68] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full bg-cover bg-center border border-slate-300 dark:border-slate-700"
                      style={{ backgroundImage: `url('${conv.avatar}')` }}
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#14171F]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {conv.name}
                      </h4>
                      {conv.isTemporary ? (
                        <span className="px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/80 text-[#E0533C] dark:text-[#D17A68] text-[9px] font-black uppercase tracking-wider shrink-0">
                          Outing Group
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 block">{formatChatTime((conv as any).lastMessageAt)}</span>
                  {conv.isTemporary ? (
                    <span className="text-[9px] font-extrabold text-[#E0533C] dark:text-[#D17A68] block mt-0.5">Unlocked</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#FF5733] dark:bg-[#A94F3E] inline-block mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH USERS TAB */}
      {subtab === 'search' && (
        <div className="space-y-3 text-xs">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search members by @username"
              className="w-full pl-10 pr-4 py-3 bg-[#FAFAFC] dark:bg-[#14171F] border border-slate-200 dark:border-[#222735] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5733]/40"
            />
          </div>

          <div className="space-y-2">
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
                  className="p-3 bg-white dark:bg-[#14171F] border border-slate-200/90 dark:border-[#222735] rounded-2xl flex items-center justify-between cursor-pointer hover:border-[#FF5733]/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-[2px] bg-gradient-to-tr from-[#F43F5E] to-[#FF5733] dark:to-[#A94F3E] rounded-full shrink-0 shadow-xs">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center border border-white dark:border-[#14171F]"
                        style={{ backgroundImage: `url('${p.avatar_url || PLACEHOLDER_AVATAR}')` }}
                      />
                    </div>
                    <h4 className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">@{p.username}</h4>
                  </div>
                  {isSingle && p.is_liveness_verified && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F43F5E]/15 to-[#FF5733]/15 text-[#FF5733] dark:text-[#D17A68] flex items-center gap-1 shrink-0">
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

      {/* Non-Single or Unverified Explanatory Gate Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1A1E] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                Single-Only Discover
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Discover is reserved for verified single profiles. You can still create and join Group Chats!
              </p>
            </div>

            <div className="p-3 bg-[#F8F8F6] dark:bg-[#121113] rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-left space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Your Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isUserSingle ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {currentUserProfile?.relationshipStatus === 'single' ? 'Single' : 'Not single'}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Liveness Check:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  currentUserProfile?.isLivenessVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {currentUserProfile?.isLivenessVerified ? 'Verified' : 'Verification Required'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowGateModal(false);
                  if (onOpenVerificationModal) onOpenVerificationModal();
                }}
                className="w-full py-3 px-4 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Verify Single Profile Now</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowGateModal(false);
                  setSubtab('chats');
                }}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Go to Group Chats
              </button>

              <button
                type="button"
                onClick={() => setShowGateModal(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold py-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
