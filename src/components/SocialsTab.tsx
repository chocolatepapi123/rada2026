import React, { useState, useRef } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { DatingProfile, ChatConversation, ChatMessage, ChatTheme, UserProfile } from '../types.ts';
import { EmojiPicker } from './EmojiPicker.tsx';
import { AudioMessagePlayer } from './AudioMessagePlayer.tsx';
import { VideoMessagePlayer } from './VideoMessagePlayer.tsx';
import { generatePlayableWavDataUrl, generateFallbackVideoBlobUrl, formatMediaDuration, deduplicateAndLimitPhotos, readFilesAsDataUrls } from '../utils/mediaUtils.ts';

interface SocialsTabProps {
  discoveryProfiles: DatingProfile[];
  conversations: ChatConversation[];
  onOpenPlanDateModal: () => void;
  onOpenCreateGroupModal: () => void;
  onAcceptRequest: (name: string, avatar: string) => void;
  onViewUserProfile: (profile: UserProfile) => void;
  showToast: (msg: string) => void;
}

export const SocialsTab: React.FC<SocialsTabProps> = ({
  discoveryProfiles,
  conversations,
  onOpenPlanDateModal,
  onOpenCreateGroupModal,
  onAcceptRequest,
  onViewUserProfile,
  showToast
}) => {
  const [subtab, setSubtab] = useState<'discover' | 'queue' | 'chats' | 'search'>('discover');
  const [profileIndex, setProfileIndex] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'like' | 'pass' | null>(null);

  // Active Chat Screen State
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>('terracotta');

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

  // Pending and sent requests
  const [pendingRequests, setPendingRequests] = useState([
    { id: 'req-1', name: 'Brian Kiprop', loc: 'Wants to meet at Ink & Drink', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop' }
  ]);
  const [sentRequests, setSentRequests] = useState<{ id: string; name: string; avatar: string; handle: string }[]>([]);

  // Search filter
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Helper to remove 'nearby' and distance prefixes, leaving just the location
  const cleanLocation = (locStr?: string) => {
    if (!locStr) return 'Nairobi';
    return locStr
      .replace(/^nearby\s+/i, '')
      .replace(/\bnearby\b/gi, '')
      .replace(/[\d.]+\s*km\s*away\s*(in\s*)?/i, '')
      .trim();
  };

  // Discovery: all community profiles are discoverable without filtering
  const currentProfile = discoveryProfiles.length > 0 
    ? discoveryProfiles[profileIndex % discoveryProfiles.length]
    : null;

  const handleSwipe = (action: 'like' | 'pass') => {
    if (!currentProfile) return;
    setSwipeAnimation(action);
    setTimeout(() => {
      if (action === 'like') {
        const likedPerson = currentProfile;
        if (likedPerson.relationshipStatus !== 'single') {
          showToast(`${likedPerson.name.split(',')[0]} is Not single. Match requests are for single members.`);
        } else {
          setSentRequests(prev => [{
            id: `sent-${Date.now()}`,
            name: likedPerson.name.split(',')[0],
            avatar: likedPerson.img,
            handle: likedPerson.handle
          }, ...prev]);
          showToast(`Hangout & Match request sent to ${likedPerson.name.split(',')[0]}!`);
        }
      } else {
        showToast('Passed.');
      }
      setSwipeAnimation(null);
      setProfileIndex(prev => prev + 1);
    }, 250);
  };

  const handleAcceptPending = (req: { id: string; name: string; avatar: string }) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    onAcceptRequest(req.name, req.avatar);
    showToast(`Matched with ${req.name}! Chat unlocked.`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedPhotos.length >= 5) {
      showToast('Maximum 5 photos allowed per message.');
      e.target.value = '';
      return;
    }

    const dataUrls = await readFilesAsDataUrls(files);
    const result = deduplicateAndLimitPhotos(attachedPhotos, dataUrls, 5);

    if (result.duplicateCount > 0 && result.addedCount === 0) {
      showToast('Duplicate photo(s) skipped — already attached.');
    } else if (result.duplicateCount > 0 && result.addedCount > 0) {
      showToast(`Attached ${result.addedCount} photo(s). Skipped ${result.duplicateCount} duplicate(s).`);
    } else if (result.exceededLimit) {
      showToast('Maximum 5 photos limit reached.');
    } else if (result.addedCount > 0) {
      showToast(`Attached ${result.addedCount} photo(s).`);
    }

    setAttachedPhotos(result.updatedList);
    e.target.value = '';
  };

  const handleRemoveAttachedPhoto = (indexToRemove: number) => {
    setAttachedPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Attached photo removed.');
  };

  const handleSendMessage = () => {
    if ((!chatInputText.trim() && attachedPhotos.length === 0) || !activeChat) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: chatInputText.trim(),
      photos: attachedPhotos.length > 0 ? attachedPhotos : undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
        text: replyingTo.text
      } : undefined
    };
    activeChat.messages.push(newMsg);
    activeChat.lastMessage = attachedPhotos.length > 0
      ? `📷 ${attachedPhotos.length} photo${attachedPhotos.length > 1 ? 's' : ''}${chatInputText.trim() ? ': ' + chatInputText.trim() : ''}`
      : newMsg.text;
    setChatInputText('');
    setAttachedPhotos([]);
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };


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
    }

    clearInterval(recordTimerRef.current);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVoiceRecording = (send: boolean) => {
    clearInterval(recordTimerRef.current);
    const dur = Math.max(1, recordSeconds);
    setIsRecordingAudio(false);

    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
      try {
        audioRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping audio recorder:', err);
      }
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }

    if (send && activeChat) {
      let finalAudioUrl = '';
      if (audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: audioRecorderRef.current?.mimeType || 'audio/webm' });
        finalAudioUrl = URL.createObjectURL(blob);
      } else {
        // Fallback to real generated melodic WAV data URL (100% playable offline or when mic denied)
        finalAudioUrl = generatePlayableWavDataUrl(dur);
      }

      const newMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        sender: 'me',
        text: `Voice note (${formatMediaDuration(dur)})`,
        audioUrl: finalAudioUrl,
        audioDuration: dur,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyingTo ? {
          id: replyingTo.id,
          sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
          text: replyingTo.text
        } : undefined
      };
      activeChat.messages.push(newMsg);
      activeChat.lastMessage = `🎙️ Voice note (${formatMediaDuration(dur)})`;
      setReplyingTo(null);
      showToast('Voice note sent!');
    }

    audioChunksRef.current = [];
    audioRecorderRef.current = null;
    setRecordSeconds(0);
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

    if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      try {
        videoRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping video recorder:', err);
      }
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }

    if (send && activeChat) {
      let finalVideoUrl = '';
      if (videoChunksRef.current.length > 0) {
        const blob = new Blob(videoChunksRef.current, { type: videoRecorderRef.current?.mimeType || 'video/webm' });
        finalVideoUrl = URL.createObjectURL(blob);
      } else {
        // Fallback to client-side animated video note if camera was unavailable
        finalVideoUrl = await generateFallbackVideoBlobUrl(dur);
      }

      const newMsg: ChatMessage = {
        id: `video-note-${Date.now()}`,
        sender: 'me',
        text: `Circular video note (${dur}s)`,
        videoNoteUrl: finalVideoUrl,
        videoDuration: dur,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyingTo ? {
          id: replyingTo.id,
          sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
          text: replyingTo.text
        } : undefined
      };
      activeChat.messages.push(newMsg);
      activeChat.lastMessage = `📹 Video note (${dur}s)`;
      setReplyingTo(null);
      showToast('Circular video note sent!');
    }

    videoChunksRef.current = [];
    videoRecorderRef.current = null;
    setVideoRecordSeconds(0);
  };

  // Video attachment file upload handler
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    const url = URL.createObjectURL(file);
    const newMsg: ChatMessage = {
      id: `video-msg-${Date.now()}`,
      sender: 'me',
      text: file.name,
      videoUrl: url,
      videoDuration: 10,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
        text: replyingTo.text
      } : undefined
    };
    activeChat.messages.push(newMsg);
    activeChat.lastMessage = `🎥 Video: ${file.name}`;
    setReplyingTo(null);
    showToast('Video attachment sent!');
    e.target.value = '';
  };

  // Audio attachment file upload handler
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    const url = URL.createObjectURL(file);
    const newMsg: ChatMessage = {
      id: `audio-msg-${Date.now()}`,
      sender: 'me',
      text: file.name,
      audioUrl: url,
      audioDuration: 12,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
        text: replyingTo.text
      } : undefined
    };
    activeChat.messages.push(newMsg);
    activeChat.lastMessage = `🎙️ Audio: ${file.name}`;
    setReplyingTo(null);
    showToast('Audio attachment sent!');
    e.target.value = '';
  };

  const handleAcceptDateInvite = (msg: ChatMessage) => {
    if (msg.dateInvite) {
      msg.dateInvite.accepted = true;
      showToast(`Date accepted for ${msg.dateInvite.spotTitle}! Synced to your Vault Calendar 📅`);
    }
  };

  // Theme styling definitions
  const themeStyles: Record<ChatTheme, {
    bg: string;
    header: string;
    myBubble: string;
    theirBubble: string;
    accent: string;
  }> = {
    terracotta: {
      bg: 'bg-[#FBFBF9] dark:bg-[#121113]',
      header: 'bg-[#FBFBF9]/95 dark:bg-[#121113]/95',
      myBubble: 'bg-[#E0533C] text-white',
      theirBubble: 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800',
      accent: 'text-[#E0533C]'
    },
    midnight: {
      bg: 'bg-[#0B0F19]',
      header: 'bg-[#0F172A]/95 text-white',
      myBubble: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-900/30',
      theirBubble: 'bg-[#1E293B] text-slate-100 border border-slate-700',
      accent: 'text-cyan-400'
    },
    emerald: {
      bg: 'bg-[#062419] dark:bg-[#03150E]',
      header: 'bg-[#083323]/95 text-white',
      myBubble: 'bg-[#2D6A4F] text-white',
      theirBubble: 'bg-[#0F3E2E] text-emerald-100 border border-emerald-900',
      accent: 'text-emerald-400'
    },
    sunset: {
      bg: 'bg-gradient-to-b from-[#2B1055] via-[#4A154B] to-[#1F0826]',
      header: 'bg-[#2B1055]/95 text-white',
      myBubble: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-pink-900/40',
      theirBubble: 'bg-[#3D1444] text-pink-100 border border-pink-950',
      accent: 'text-pink-400'
    },
    cyberpunk: {
      bg: 'bg-[#12072B]',
      header: 'bg-[#1D0C42]/95 text-white',
      myBubble: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-fuchsia-900/40',
      theirBubble: 'bg-[#271057] text-purple-100 border border-purple-800',
      accent: 'text-yellow-400'
    }
  };

  const activeThemeStyle = themeStyles[currentTheme] || themeStyles.terracotta;

  // If in chat room
  if (activeChat) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${activeThemeStyle.bg} transition-colors duration-300`}>
        {/* Chat Room Header */}
        <div className={`sticky top-0 z-10 backdrop-blur-md px-4 py-3 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between ${activeThemeStyle.header}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveChat(null)}
              className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:scale-105 transition"
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
                  <span>{activeChat.type === 'group' ? 'Group Chat' : 'Active'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                title="Change Chat Theme"
                className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:scale-105 transition"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showThemePicker && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 animate-in zoom-in-95 duration-150">
                  <span className="text-[10px] font-black uppercase text-slate-400 px-2 block">Select Chat Theme</span>
                  {(['terracotta', 'midnight', 'emerald', 'sunset', 'cyberpunk'] as ChatTheme[]).map((thm) => (
                    <button
                      key={thm}
                      onClick={() => {
                        setCurrentTheme(thm);
                        setShowThemePicker(false);
                        showToast(`Chat theme changed to ${thm.toUpperCase()}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold capitalize flex items-center justify-between ${
                        currentTheme === thm ? 'bg-[#E0533C] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{thm}</span>
                      {currentTheme === thm && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onOpenPlanDateModal}
              className="px-3 py-1.5 bg-[#E0533C] hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Plan a Date</span>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-w-lg mx-auto w-full">
          {activeChat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col group ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
            >
              {/* Swipe-to-reply button row */}
              <div className="flex items-center gap-1 max-w-[85%]">
                {msg.sender !== 'me' && (
                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                      showToast(`Replying to ${activeChat.name}`);
                    }}
                    title="Swipe or click to reply"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#E0533C] transition"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}

                {msg.dateInvite ? (
                  <div className="w-full bg-gradient-to-r from-[#E0533C] to-orange-600 text-white p-3.5 rounded-2xl shadow-md space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border-b border-white/20 pb-1">
                      <Calendar className="w-3.5 h-3.5" /> Date Invitation
                    </div>
                    <h4 className="font-black text-sm">{msg.dateInvite.spotTitle}</h4>
                    <p className="text-[11px] opacity-90">{msg.dateInvite.address}</p>
                    <p className="text-[11px] font-bold bg-white/20 px-2 py-1 rounded-lg inline-block">
                      {msg.dateInvite.date} at {msg.dateInvite.time}
                    </p>
                    <button
                      disabled={msg.dateInvite.accepted}
                      onClick={() => handleAcceptDateInvite(msg)}
                      className={`w-full mt-2 py-2 text-xs font-extrabold rounded-xl shadow transition ${
                        msg.dateInvite.accepted 
                          ? 'bg-emerald-800 text-white cursor-default' 
                          : 'bg-white text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {msg.dateInvite.accepted ? '✓ Date Accepted & Synced' : 'Accept Date & Sync Vault Calendar'}
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
                      ? `${activeThemeStyle.myBubble} rounded-tr-none`
                      : `${activeThemeStyle.theirBubble} rounded-tl-none`
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
                        ? `${activeThemeStyle.myBubble} rounded-tr-none`
                        : `${activeThemeStyle.theirBubble} rounded-tl-none`
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
                    {msg.text && <p>{msg.text}</p>}
                    <span className="text-[9px] opacity-70 block text-right mt-1">{msg.time}</span>
                  </div>
                )}


                {msg.sender === 'me' && (
                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                      showToast('Replying to your message');
                    }}
                    title="Swipe or click to reply"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#E0533C] transition"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Swipe-to-reply Preview Banner */}
        {replyingTo && (
          <div className="max-w-lg mx-auto w-full px-4">
            <div className="bg-slate-100 dark:bg-slate-800 border-l-4 border-[#E0533C] p-2 rounded-r-xl flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="font-extrabold text-[10px] text-[#E0533C]">
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
                <ImageIcon className="w-3 h-3 text-[#E0533C]" />
                <span>Photos ({attachedPhotos.length}/5)</span>
                {attachedPhotos.length >= 5 && (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">• Max limit reached</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachedPhotos([]);
                  showToast('Cleared attached photos.');
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
                  className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E0533C] flex flex-col items-center justify-center text-slate-400 hover:text-[#E0533C] transition shrink-0 cursor-pointer"
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
        <div className="w-full overflow-hidden px-2 py-2 sm:px-3 sm:py-2.5 bg-white/95 dark:bg-[#121113]/95 border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto flex items-center gap-1.5 sm:gap-2">
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
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-500 hover:text-[#E0533C] flex-shrink-0 transition cursor-pointer"
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
              attachedPhotos.length > 0 ? 'text-[#E0533C]' : 'text-slate-500 hover:text-[#E0533C]'
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
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-500 hover:text-[#E0533C] flex-shrink-0 transition cursor-pointer"
            title="Attach Video from Device"
            aria-label="Attach Video"
          >
            <Paperclip className="w-4 h-4" />
          </button>


          <input
            type="text"
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-3 py-2 sm:py-2.5 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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
                : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] hover:text-white'
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
                : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Message Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            className="w-9 h-9 rounded-xl sm:rounded-2xl bg-[#E0533C] text-white flex items-center justify-center shadow-md hover:bg-orange-700 transition flex-shrink-0 cursor-pointer"
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
      <div className="grid grid-cols-4 gap-1 bg-[#F1F1EE] dark:bg-[#1C1A1E] p-1 rounded-2xl text-center shadow-inner text-xs">
        {[
          { id: 'discover', label: 'Discover' },
          { id: 'queue', label: 'Requests' },
          { id: 'chats', label: 'Chats' },
          { id: 'search', label: 'Search' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubtab(tab.id as any)}
            className={`py-2 rounded-xl transition ${
              subtab === tab.id
                ? 'font-black bg-white dark:bg-[#121113] text-slate-900 dark:text-white shadow-sm'
                : 'font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DISCOVER TAB: SWIPE CARD (SPEC 5: Fix Discover layout so bios don't overlay/cover profile photos. Remove 'Not single' from matching) */}
      {subtab === 'discover' && (
        <div className="space-y-4">
          {currentProfile ? (
            <div
              className={`bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-md overflow-hidden relative transition-all duration-300 ${
                swipeAnimation === 'like' ? 'translate-x-28 rotate-12 opacity-0' : swipeAnimation === 'pass' ? '-translate-x-28 -rotate-12 opacity-0' : ''
              }`}
            >
              {/* Photo Area: Clean and unobstructed so bios do not overlay/cover photo */}
              <div
                className="h-96 rounded-2xl bg-cover bg-center relative mb-4 shadow-sm cursor-pointer group"
                style={{ backgroundImage: `url('${currentProfile.img}')` }}
                onClick={() => onViewUserProfile({
                  name: currentProfile.name,
                  handle: currentProfile.handle,
                  avatar: currentProfile.img,
                  bio: currentProfile.bio || 'Exploring Nairobi hangouts, food, and culture.',
                  loc: currentProfile.loc,
                  relationshipStatus: currentProfile.relationshipStatus,
                  vibes: currentProfile.vibes
                })}
              >
                {/* Status Badge: Single or Not single */}
                <div className="absolute top-3 left-3">
                  <span className={`backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm ${
                    currentProfile.relationshipStatus === 'single'
                      ? 'bg-emerald-600/90'
                      : 'bg-slate-800/90'
                  }`}>
                    {currentProfile.relationshipStatus === 'single' ? 'Single' : 'Not single'}
                  </span>
                </div>

                {/* View Bio Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewUserProfile({
                      name: currentProfile.name,
                      handle: currentProfile.handle,
                      avatar: currentProfile.img,
                      bio: currentProfile.bio || 'Exploring Nairobi hangouts, food, and culture.',
                      loc: cleanLocation(currentProfile.loc),
                      relationshipStatus: currentProfile.relationshipStatus,
                      vibes: currentProfile.vibes
                    });
                  }}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full transition"
                >
                  View Profile
                </button>
              </div>

              {/* Bio & Details Area: Cleanly placed BELOW the photo so the photo is 100% visible */}
              <div className="bg-white dark:bg-[#121113] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">
                    {currentProfile.name}
                  </h3>
                  <span className="text-xs text-[#E0533C] font-bold">{currentProfile.handle}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#E0533C]" />
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
                      <span key={i} className="text-[10px] bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-bold border border-slate-200 dark:border-slate-800">
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
                  className="w-14 h-14 rounded-full bg-white dark:bg-[#121113] border-2 border-red-500 text-red-500 flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition"
                  title="Pass"
                >
                  <X className="w-7 h-7" />
                </button>

                <button
                  onClick={() => handleSwipe('like')}
                  className="w-14 h-14 rounded-full bg-[#E0533C] text-white flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition"
                  title="Send Match Request"
                >
                  <Heart className="w-7 h-7 fill-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-[#E0533C] mx-auto" />
              <h4 className="font-black text-sm">You've reached the end of the profile queue!</h4>
              <p className="text-xs text-slate-500">Check back later for new members joining RADA.</p>
              <button
                onClick={() => setProfileIndex(0)}
                className="px-4 py-2 bg-[#E0533C] text-white rounded-xl text-xs font-bold shadow"
              >
                Reset Queue
              </button>
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
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                      style={{ backgroundImage: `url('${req.avatar}')` }}
                    />
                    <div>
                      <h4 className="font-extrabold text-xs">{req.name}</h4>
                      <p className="text-[10px] text-slate-400">{req.loc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptPending(req)}
                    className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
                  >
                    Accept Match
                  </button>
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
                        style={{ backgroundImage: `url('${req.avatar}')` }}
                      />
                      <div>
                        <span className="font-bold text-xs">{req.name}</span>
                        <p className="text-[10px] text-slate-400">{req.handle}</p>
                      </div>
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
              className="text-[#E0533C] font-bold text-xs hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ New Group</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className="p-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-[#E0533C] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full bg-cover bg-center border border-slate-300 dark:border-slate-700"
                      style={{ backgroundImage: `url('${conv.avatar}')` }}
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1C1A1E]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {conv.name}
                      </h4>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 block">Just now</span>
                  <span className="w-2 h-2 rounded-full bg-[#E0533C] inline-block mt-1" />
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
              placeholder="Search community members by name, vibe or area..."
              className="w-full pl-10 pr-4 py-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            {discoveryProfiles
              .filter(p => !userSearchQuery.trim() || 
                p.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                p.loc.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                (p.vibes && p.vibes.some(v => v.toLowerCase().includes(userSearchQuery.toLowerCase())))
              )
              .map((p) => (
                <div
                  key={p.id}
                  onClick={() => onViewUserProfile({
                    name: p.name,
                    handle: p.handle,
                    avatar: p.img,
                    bio: p.bio || 'Exploring Nairobi hangouts, good music and vibes.',
                    loc: cleanLocation(p.loc),
                    relationshipStatus: p.relationshipStatus,
                    vibes: p.vibes
                  })}
                  className="p-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:border-[#E0533C] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url('${p.img}')` }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{cleanLocation(p.loc)}</p>
                    </div>
                  </div>
                  {/* SPEC 5: Strictly Single or Not single without emojis */}
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                    p.relationshipStatus === 'single'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {p.relationshipStatus === 'single' ? 'Single' : 'Not single'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};
