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
  Volume2
} from 'lucide-react';
import { DatingProfile, ChatConversation, ChatMessage, ChatTheme, UserProfile } from '../types.ts';
import { EmojiPicker } from './EmojiPicker.tsx';

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

  // Voice note recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);

  // Video note recording state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const videoTimerRef = useRef<any>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

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

  const handleSendMessage = () => {
    if (!chatInputText.trim() || !activeChat) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
        text: replyingTo.text
      } : undefined
    };
    activeChat.messages.push(newMsg);
    activeChat.lastMessage = newMsg.text;
    setChatInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  const handleStartVoiceRecording = () => {
    setIsRecordingAudio(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVoiceRecording = (send: boolean) => {
    clearInterval(recordTimerRef.current);
    setIsRecordingAudio(false);
    if (send && activeChat) {
      const dur = Math.max(2, recordSeconds);
      const newMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        sender: 'me',
        text: `Voice note (0:${dur < 10 ? '0' : ''}${dur})`,
        audioUrl: 'https://example.com/mock-audio.mp3',
        audioDuration: dur,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyingTo ? {
          id: replyingTo.id,
          sender: replyingTo.sender === 'me' ? 'You' : activeChat.name,
          text: replyingTo.text
        } : undefined
      };
      activeChat.messages.push(newMsg);
      activeChat.lastMessage = `🎙️ Voice note (0:${dur < 10 ? '0' : ''}${dur})`;
      setReplyingTo(null);
      showToast('Voice note sent!');
    }
    setRecordSeconds(0);
  };

  const handleStartVideoNoteRecording = () => {
    setIsRecordingVideo(true);
    setVideoRecordSeconds(0);
    videoTimerRef.current = setInterval(() => {
      setVideoRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVideoNoteRecording = (send: boolean) => {
    clearInterval(videoTimerRef.current);
    setIsRecordingVideo(false);
    if (send && activeChat) {
      const dur = Math.max(3, videoRecordSeconds);
      const newMsg: ChatMessage = {
        id: `video-note-${Date.now()}`,
        sender: 'me',
        text: `Circular video note (${dur}s)`,
        videoNoteUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
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
    setVideoRecordSeconds(0);
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
                  /* Circular Video Note Bubble */
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-[#E0533C] shadow-xl bg-slate-900 group">
                      <img src={msg.videoNoteUrl} alt="Video Note" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                      <div className="absolute bottom-1 bg-black/60 text-white text-[9px] font-mono px-1.5 rounded">
                        0:05
                      </div>
                    </div>
                    <span className="text-[9px] opacity-70 mt-1">{msg.time}</span>
                  </div>
                ) : msg.audioUrl ? (
                  /* Voice Note Bubble with waveform & player */
                  <div className={`p-3 rounded-2xl text-xs shadow-xs min-w-[210px] space-y-1.5 ${
                    msg.sender === 'me'
                      ? `${activeThemeStyle.myBubble} rounded-tr-none`
                      : `${activeThemeStyle.theirBubble} rounded-tl-none`
                  }`}>
                    {msg.replyTo && (
                      <div className="p-1.5 bg-black/20 rounded-lg text-[10px] border-l-2 border-white/60 mb-1">
                        <span className="font-bold opacity-80 block">{msg.replyTo.sender}</span>
                        <p className="truncate opacity-75">{msg.replyTo.text}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition"
                      >
                        {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 flex items-center gap-0.5 h-6">
                        {[4, 8, 14, 9, 18, 12, 6, 16, 10, 14, 8, 12, 16, 5, 11].map((h, idx) => (
                          <span
                            key={idx}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              playingAudioId === msg.id ? 'bg-white' : 'bg-white/60'
                            }`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono font-bold shrink-0">
                        0:{msg.audioDuration && msg.audioDuration < 10 ? `0${msg.audioDuration}` : msg.audioDuration || 14}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-70 block text-right">{msg.time}</span>
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
                    <p>{msg.text}</p>
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
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>Recording Voice Note... 0:{recordSeconds < 10 ? '0' : ''}{recordSeconds}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStopVoiceRecording(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStopVoiceRecording(true)}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Send
              </button>
            </div>
          </div>
        )}

        {/* Active Circular Video Recording Bar */}
        {isRecordingVideo && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/80 border-t border-purple-200 dark:border-purple-900 max-w-lg mx-auto w-full flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center gap-2 text-purple-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Circular Video Note... 0:{videoRecordSeconds < 10 ? '0' : ''}{videoRecordSeconds}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStopVideoNoteRecording(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStopVideoNoteRecording(true)}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Send Video
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white/95 dark:bg-[#121113]/95 border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto w-full flex items-center gap-1.5">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-slate-500 hover:text-[#E0533C] p-2 shrink-0"
            title="Emoji Panel"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none text-slate-900 dark:text-slate-100"
          />

          {/* Circular Video Note Button */}
          <button
            onClick={() => {
              if (isRecordingVideo) handleStopVideoNoteRecording(true);
              else handleStartVideoNoteRecording();
            }}
            title="Record Circular Video Note"
            className="w-10 h-10 rounded-2xl bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] hover:text-white flex items-center justify-center transition shrink-0"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Voice Note Mic Button */}
          <button
            onClick={() => {
              if (isRecordingAudio) handleStopVoiceRecording(true);
              else handleStartVoiceRecording();
            }}
            title="Record Voice Note"
            className="w-10 h-10 rounded-2xl bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] hover:text-white flex items-center justify-center transition shrink-0"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Message Button */}
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-2xl bg-[#E0533C] text-white flex items-center justify-center shadow-md hover:bg-orange-700 transition shrink-0"
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
