import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { DatingProfile, ChatConversation, ChatMessage, UserProfile } from '../types.ts';

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
  const [isRecordingMic, setIsRecordingMic] = useState(false);

  // Pending and sent requests
  const [pendingRequests, setPendingRequests] = useState([
    { id: 'req-1', name: 'Brian Kiprop', loc: 'Wants to meet at Ink & Drink', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop' }
  ]);
  const [sentRequests, setSentRequests] = useState<{ id: string; name: string; avatar: string; handle: string }[]>([]);

  // Search filter
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const currentProfile = discoveryProfiles[profileIndex % discoveryProfiles.length] || discoveryProfiles[0];

  const handleSwipe = (action: 'like' | 'pass') => {
    if (action === 'like' && currentProfile.relationshipStatus !== 'single') {
      showToast(`${currentProfile.name.split(',')[0]} is Not Single and browsing for events only. Matching requests are disabled.`);
      return;
    }
    setSwipeAnimation(action);
    setTimeout(() => {
      if (action === 'like') {
        const likedPerson = currentProfile;
        setSentRequests(prev => [{
          id: `sent-${Date.now()}`,
          name: likedPerson.name.split(',')[0],
          avatar: likedPerson.img,
          handle: likedPerson.handle
        }, ...prev]);
        showToast(`Hangout & Match request sent to ${likedPerson.name.split(',')[0]}!`);
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeChat.messages.push(newMsg);
    activeChat.lastMessage = newMsg.text;
    setChatInputText('');
    setShowEmojiPicker(false);
  };

  const handleAcceptDateInvite = (msg: ChatMessage) => {
    if (msg.dateInvite) {
      msg.dateInvite.accepted = true;
      showToast(`Date accepted for ${msg.dateInvite.spotTitle}! Synced to your Vault Calendar 📅`);
    }
  };

  // If in chat room
  if (activeChat) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] flex flex-col">
        {/* Chat Room Header */}
        <div className="sticky top-0 z-10 bg-[#FBFBF9]/95 dark:bg-[#121113]/95 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveChat(null)}
              className="w-8 h-8 rounded-full bg-[#F1F1EE] dark:bg-[#1C1A1E] flex items-center justify-center text-slate-700 dark:text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full bg-cover bg-center border border-slate-300 dark:border-slate-700"
                style={{ backgroundImage: `url('${activeChat.avatar}')` }}
              />
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{activeChat.name}</h4>
                <p className="text-[10px] text-slate-400">
                  {activeChat.type === 'group' ? 'Group Chat' : 'Active Direct Message'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.dateInvite ? (
                <div className="max-w-[85%] bg-gradient-to-r from-[#E0533C] to-orange-600 text-white p-3.5 rounded-2xl shadow-md space-y-2">
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
              ) : (
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-xs ${
                    msg.sender === 'me'
                      ? 'bg-[#E0533C] text-white rounded-tr-none'
                      : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[9px] opacity-70 block text-right mt-1">{msg.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Emoji Panel */}
        {showEmojiPicker && (
          <div className="max-w-lg mx-auto w-full px-4">
            <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl grid grid-cols-8 gap-2 text-xl text-center">
              {['🔥', '❤️', '😂', '✨', '☕', '🎉', '🍻', '🚀', '🙌', '🍔', '🍕', '💃', '🥑', '🍾', '🕶️', '⚡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setChatInputText(prev => prev + emoji)}
                  className="hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-[#FBFBF9] dark:bg-[#121113] border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto w-full flex items-center gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-slate-500 hover:text-[#E0533C] p-2"
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
          <button
            onClick={() => {
              setIsRecordingMic(!isRecordingMic);
              showToast(isRecordingMic ? 'Voice note recorded!' : 'Recording voice note...');
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm transition ${
              isRecordingMic
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-[#F1F1EE] dark:bg-[#1C1A1E] text-slate-700 dark:text-slate-300 hover:bg-[#E0533C] hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendMessage}
            className="w-11 h-11 rounded-2xl bg-[#E0533C] text-white flex items-center justify-center text-sm shadow-md hover:bg-orange-700 transition"
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

      {/* DISCOVER TAB: SWIPE CARD */}
      {subtab === 'discover' && (
        <div className="space-y-4">
          <div
            className={`bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-md overflow-hidden relative transition-all duration-300 ${
              swipeAnimation === 'like' ? 'translate-x-28 rotate-12 opacity-0' : swipeAnimation === 'pass' ? '-translate-x-28 -rotate-12 opacity-0' : ''
            }`}
          >
            <div
              className="h-80 rounded-2xl bg-cover bg-center relative mb-3 shadow-sm cursor-pointer group"
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
              {/* Relationship Status Tag (Top Left) */}
              <div className="absolute top-3 left-3">
                {currentProfile.relationshipStatus === 'single' ? (
                  <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>Single (Open to Match)</span>
                  </span>
                ) : (
                  <span className="bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Not Single (Events Only)</span>
                  </span>
                )}
              </div>

              {/* View Bio Button (Top Right) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewUserProfile({
                    name: currentProfile.name,
                    handle: currentProfile.handle,
                    avatar: currentProfile.img,
                    bio: currentProfile.bio || 'Exploring Nairobi hangouts, food, and culture.',
                    loc: currentProfile.loc,
                    relationshipStatus: currentProfile.relationshipStatus,
                    vibes: currentProfile.vibes
                  });
                }}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full transition"
              >
                View Bio & Profile
              </button>

              <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md text-white p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base">{currentProfile.name}</h3>
                  <span className="text-[10px] text-slate-300 font-bold">{currentProfile.handle}</span>
                </div>
                <p className="text-[11px] text-slate-200">{currentProfile.loc}</p>
                {currentProfile.bio && (
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">{currentProfile.bio}</p>
                )}
                {currentProfile.vibes && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {currentProfile.vibes.map((v, i) => (
                      <span key={i} className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-5 justify-center py-1">
              <button
                onClick={() => handleSwipe('pass')}
                className="w-14 h-14 rounded-full bg-white dark:bg-[#121113] border-2 border-red-500 text-red-500 flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition"
                title="Pass"
              >
                <X className="w-7 h-7" />
              </button>

              <button
                onClick={() => handleSwipe('like')}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg hover:scale-105 active:scale-95 transition ${
                  currentProfile.relationshipStatus === 'single'
                    ? 'bg-[#E0533C] text-white'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-80'
                }`}
                title={currentProfile.relationshipStatus === 'single' ? 'Send Match Request' : 'Not Single (Cannot match)'}
              >
                <Heart className={`w-7 h-7 ${currentProfile.relationshipStatus === 'single' ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUESTS QUEUE */}
      {subtab === 'queue' && (
        <div className="space-y-4 text-xs">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Pending Requests (Likes You)
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                      style={{ backgroundImage: `url('${req.avatar}')` }}
                    />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{req.name}</h4>
                      <p className="text-[11px] text-slate-500">{req.loc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptPending(req)}
                    className="px-3.5 py-2 bg-[#2D6A4F] text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition shadow-xs"
                  >
                    Accept
                  </button>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <p className="text-slate-400 text-center py-4">No pending requests right now.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Sent Requests
            </h3>
            <div className="space-y-2">
              {sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url('${req.avatar}')` }}
                    />
                    <div>
                      <h4 className="font-bold text-xs">{req.name}</h4>
                      <p className="text-[10px] text-slate-400">{req.handle} • Pending</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl text-[10px] font-bold">
                    Sent
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHATS LIST */}
      {subtab === 'chats' && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Active Conversations
            </h3>
            <button
              onClick={onOpenCreateGroupModal}
              className="text-xs font-bold text-[#2D6A4F] hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          </div>

          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveChat(conv)}
                className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex items-center gap-3 cursor-pointer hover:border-[#2D6A4F] transition"
              >
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-700"
                  style={{ backgroundImage: `url('${conv.avatar}')` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {conv.name}
                    </h4>
                    <span className="text-[10px] text-slate-400">Active</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH USERS */}
      {subtab === 'search' && (
        <div className="space-y-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search people by @handle or name in Nairobi..."
              className="w-full pl-10 pr-4 py-3 bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2 pt-1">
            {discoveryProfiles
              .filter(p => !userSearchQuery.trim() || p.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || p.handle.toLowerCase().includes(userSearchQuery.toLowerCase()))
              .map((p) => (
                <div
                  key={p.id}
                  className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url('${p.img}')` }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs">{p.name}</h4>
                        {p.relationshipStatus === 'single' ? (
                          <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Single</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Not Single</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">{p.handle} • {p.loc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewUserProfile({
                        name: p.name,
                        handle: p.handle,
                        avatar: p.img,
                        bio: p.bio || 'Exploring Nairobi hangouts, food, and culture.',
                        loc: p.loc,
                        relationshipStatus: p.relationshipStatus,
                        vibes: p.vibes
                      })}
                      className="px-2.5 py-1.5 bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Profile
                    </button>
                    {p.relationshipStatus === 'single' ? (
                      <button
                        onClick={() => {
                          showToast(`Match request sent to ${p.name.split(',')[0]}!`);
                          setSentRequests(prev => [{ id: `req-${Date.now()}`, name: p.name.split(',')[0], avatar: p.img, handle: p.handle }, ...prev]);
                        }}
                        className="px-3 py-1.5 bg-[#E0533C] text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-xl text-[11px] font-bold cursor-not-allowed"
                        title="Matching disabled for Not Single profiles"
                      >
                        Not Single
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};
