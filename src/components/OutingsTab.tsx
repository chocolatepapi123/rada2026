import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Search, 
  CheckCircle2, 
  Heart, 
  Sparkles, 
  Filter, 
  X, 
  Check, 
  ChevronRight, 
  Share2, 
  Compass, 
  AlertCircle,
  Building2,
  CalendarPlus,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { OutingPlan, OutingAttendee, SpotItem, UserProfile } from '../types.ts';
import { shareContent } from '../utils/shareUtils.ts';

interface OutingsTabProps {
  outings: OutingPlan[];
  spots: SpotItem[];
  currentUserProfile: UserProfile;
  currentUserId?: string;
  isUserSignedIn: boolean;
  onOpenAuth: () => void;
  onCreateOuting: (outing: OutingPlan) => Promise<void>;
  onRequestJoin: (outingId: string, attendee: OutingAttendee) => Promise<void>;
  onOpenSpotDetails?: (spot: SpotItem) => void;
  showToast: (msg: string) => void;
}

export const OutingsTab: React.FC<OutingsTabProps> = ({
  outings,
  spots,
  currentUserProfile,
  currentUserId,
  isUserSignedIn,
  onOpenAuth,
  onCreateOuting,
  onRequestJoin,
  onOpenSpotDetails,
  showToast
}) => {
  const [activeFilter, setActiveFilter] = useState<'All Plans' | 'Singles Only' | 'Group Hangouts' | 'Weekend'>('All Plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [selectedOutingDetail, setSelectedOutingDetail] = useState<OutingPlan | null>(null);

  // Form state for Hosting a Plan
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(spots[0]?.id || null);
  const [spotSearchQuery, setSpotSearchQuery] = useState('');
  const [planDate, setPlanDate] = useState('2026-10-24');
  const [planTime, setPlanTime] = useState('18:00');
  const [maxAttendees, setMaxAttendees] = useState(6);
  const [accessType, setAccessType] = useState<'open' | 'singles_only'>('open');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['All Plans', 'Group Hangouts']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Outings
  const filteredOutings = useMemo(() => {
    return outings.filter(plan => {
      // Filter tag
      if (activeFilter === 'Singles Only') {
        if (plan.accessType !== 'singles_only' && !plan.tags?.includes('Singles Only')) return false;
      } else if (activeFilter === 'Group Hangouts') {
        if (!plan.tags?.includes('Group Hangouts') && plan.accessType === 'singles_only') return false;
      } else if (activeFilter === 'Weekend') {
        if (!plan.tags?.includes('Weekend') && !['Friday', 'Saturday', 'Sunday'].some(day => plan.date?.includes(day))) {
          // Check if date is on a weekend
          try {
            const parsed = new Date(plan.date);
            const dayOfWeek = parsed.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 5 && dayOfWeek !== 6) return false;
          } catch {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSpot = plan.spotTitle.toLowerCase().includes(q) || (plan.spotAddress && plan.spotAddress.toLowerCase().includes(q));
        const matchesHost = plan.hostName.toLowerCase().includes(q) || (plan.hostHandle && plan.hostHandle.toLowerCase().includes(q));
        const matchesDesc = plan.description.toLowerCase().includes(q);
        const matchesTags = plan.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesSpot && !matchesHost && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [outings, activeFilter, searchQuery]);

  // Spots search inside Host modal
  const filteredSpotsForHosting = useMemo(() => {
    if (!spotSearchQuery.trim()) return spots.slice(0, 10);
    const q = spotSearchQuery.toLowerCase();
    return spots.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.neighborhood.toLowerCase().includes(q) || 
      s.category.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [spots, spotSearchQuery]);

  const selectedSpot = useMemo(() => {
    return spots.find(s => s.id === selectedSpotId) || spots[0];
  }, [spots, selectedSpotId]);

  // Format date readable
  const formatOutingDate = (dateStr: string, timeStr?: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        return `${dateObj.toLocaleDateString('en-KE', options)}${timeStr ? ` • ${timeStr}` : ''}`;
      }
    } catch (e) {}
    return `${dateStr}${timeStr ? ` • ${timeStr}` : ''}`;
  };

  // Check user attendee status for a plan
  const getAttendeeStatus = (plan: OutingPlan): 'host' | 'joined' | 'pending' | 'none' => {
    const effectiveUserId = currentUserId || currentUserProfile.handle || 'current-user';
    if (plan.hostId === effectiveUserId || plan.hostName === currentUserProfile.name) {
      return 'host';
    }
    const myAttendee = plan.attendees?.find(a => 
      a.userId === effectiveUserId || 
      a.userName === currentUserProfile.name ||
      (currentUserProfile.handle && a.userHandle === currentUserProfile.handle)
    );
    if (!myAttendee) return 'none';
    return myAttendee.status === 'joined' ? 'joined' : 'pending';
  };

  // Handle Join Request
  const handleJoinClick = async (e: React.MouseEvent, plan: OutingPlan) => {
    e.stopPropagation();
    if (!isUserSignedIn && !currentUserId) {
      showToast('Please sign in or create an account to request to join outings');
      onOpenAuth();
      return;
    }

    const currentStatus = getAttendeeStatus(plan);
    if (currentStatus === 'host') {
      showToast('You are the host of this plan!');
      return;
    }
    if (currentStatus === 'joined') {
      showToast('You are already a confirmed attendee for this outing!');
      return;
    }
    if (currentStatus === 'pending') {
      showToast('Your request is already pending host approval ⏳');
      return;
    }

    // Check available slots
    const joinedCount = plan.attendees?.filter(a => a.status === 'joined').length || 0;
    const remainingSlots = Math.max(0, plan.maxAttendees - joinedCount - 1);
    if (remainingSlots <= 0) {
      showToast('This outing has reached maximum attendee capacity.');
      return;
    }

    const newAttendee: OutingAttendee = {
      id: `att-${Date.now()}`,
      outingId: plan.id,
      userId: currentUserId || `usr-${Date.now()}`,
      userName: currentUserProfile.name || 'Explorer',
      userAvatar: currentUserProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
      userHandle: currentUserProfile.handle || '@explorer',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    await onRequestJoin(plan.id, newAttendee);
    showToast('Join request sent to host! Pending approval');
  };

  // Submit Host Plan Form
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserSignedIn && !currentUserId) {
      showToast('Please sign in or create an account to host a plan');
      onOpenAuth();
      return;
    }

    if (!selectedSpot) {
      showToast('Please select a target hangout spot or venue.');
      return;
    }

    if (!description.trim()) {
      showToast('Please write a short vibe note or plan description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPlan: OutingPlan = {
        id: `out-${Date.now()}`,
        hostId: currentUserId || `host-${Date.now()}`,
        hostName: currentUserProfile.name || 'Wayne Waweru',
        hostAvatar: currentUserProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
        hostHandle: currentUserProfile.handle || '@host',
        isHostVerified: currentUserProfile.isLivenessVerified ?? true,
        spotId: selectedSpot.id,
        spotTitle: selectedSpot.title,
        spotAddress: selectedSpot.address,
        spotImage: selectedSpot.img || selectedSpot.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
        spotCategory: selectedSpot.category,
        date: planDate,
        time: planTime,
        maxAttendees: Number(maxAttendees),
        currentAttendeesCount: 1, // host
        description: description.trim(),
        accessType,
        tags: Array.from(new Set(['All Plans', accessType === 'singles_only' ? 'Singles Only' : 'Group Hangouts', ...selectedTags])),
        status: 'active',
        createdAt: new Date().toISOString(),
        attendees: []
      };

      await onCreateOuting(newPlan);
      showToast(`Outing Plan "${selectedSpot.title}" Published! 🎉`);
      setIsHostModalOpen(false);
      setDescription('');
    } catch (err: any) {
      showToast(err?.message || 'Could not publish outing plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-3 sm:px-4 py-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E0533C] animate-pulse" />
              <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Nairobi Outings & Public Plans
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Discover real community-hosted hangouts or post your own plan!
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isUserSignedIn && !currentUserId) {
                showToast('Please sign in to host a plan');
                onOpenAuth();
                return;
              }
              setIsHostModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-[#E0533C] hover:bg-orange-700 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Host a Plan</span>
            <span className="sm:hidden">Host</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue, host, or vibe (e.g. Alchemist, Jazz, Karura)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E0533C] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-0.5">
          {(['All Plans', 'Singles Only', 'Group Hangouts', 'Weekend'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {filter === 'Singles Only' && <Heart className="w-3 h-3 inline-block mr-1 text-rose-500 fill-rose-500" />}
                {filter === 'Group Hangouts' && <Users className="w-3 h-3 inline-block mr-1 text-indigo-500" />}
                {filter === 'Weekend' && <Calendar className="w-3 h-3 inline-block mr-1 text-[#E0533C]" />}
                <span>{filter}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Outings Count & Active Status */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#E0533C]" />
          <span>Active Plans ({filteredOutings.length})</span>
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          Showing: {activeFilter}
        </span>
      </div>

      {/* Outings Feed Cards */}
      {filteredOutings.length > 0 ? (
        <div className="space-y-3.5">
          {filteredOutings.map((plan) => {
            const attendeeStatus = getAttendeeStatus(plan);
            const joinedAttendees = plan.attendees?.filter(a => a.status === 'joined') || [];
            // Host is 1 attendee
            const totalOccupied = joinedAttendees.length + 1;
            const remainingSlots = Math.max(0, plan.maxAttendees - totalOccupied);
            const isFull = remainingSlots === 0;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedOutingDetail(plan)}
                className="bg-white dark:bg-[#1C1A1E] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:border-[#E0533C]/50 transition-all cursor-pointer group space-y-3.5 text-slate-900 dark:text-slate-100"
              >
                {/* Host Profile Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-2xs"
                      style={{ backgroundImage: `url('${plan.hostAvatar}')` }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {plan.hostName}
                        </span>
                        {plan.isHostVerified && (
                          <span title="Verified Host">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950 shrink-0" />
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/60 text-[#E0533C] uppercase tracking-wider shrink-0 ml-1">
                          Host
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {plan.hostHandle || '@host'} • Nairobi
                      </p>
                    </div>
                  </div>

                  {/* Access Type Badge */}
                  {plan.accessType === 'singles_only' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1 shrink-0">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      <span>Singles Only</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-emerald-600" />
                      <span>Open Plan</span>
                    </span>
                  )}
                </div>

                {/* Target Spot Banner & Details */}
                <div className="flex gap-3 bg-slate-50 dark:bg-black/30 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <div
                    className="w-20 h-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-200 dark:border-slate-700 relative overflow-hidden"
                    style={{ backgroundImage: `url('${plan.spotImage}')` }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#E0533C] transition truncate">
                        {plan.spotTitle}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5 font-medium">
                        <MapPin className="w-3 h-3 text-[#E0533C] shrink-0" />
                        <span className="truncate">{plan.spotAddress || 'Nairobi'}</span>
                      </p>
                    </div>

                    {/* Date & Time Tag */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
                        <Calendar className="w-3 h-3 text-[#E0533C]" />
                        <span>{formatOutingDate(plan.date, plan.time)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan Description / Vibe Note */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {plan.description}
                </p>

                {/* Slots & Attendees Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Available Slots Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 ${
                      isFull 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' 
                        : remainingSlots <= 2 
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700' 
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <Users className="w-3 h-3" />
                      <span>{isFull ? 'Plan Full' : `${remainingSlots} spots left`}</span>
                      <span className="text-[9px] font-normal opacity-75">
                        ({totalOccupied}/{plan.maxAttendees})
                      </span>
                    </span>

                    {/* Attendees Avatar Stack */}
                    {joinedAttendees.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {joinedAttendees.slice(0, 3).map((att) => (
                          <img
                            key={att.id}
                            src={att.userAvatar}
                            alt={att.userName}
                            title={att.userName}
                            className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-800 shadow-2xs"
                          />
                        ))}
                        {joinedAttendees.length > 3 && (
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[8px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-200 border border-white dark:border-slate-800">
                            +{joinedAttendees.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Join Request Button / Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {attendeeStatus === 'host' && (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E0533C]" />
                        <span>Your Plan</span>
                      </span>
                    )}

                    {attendeeStatus === 'pending' && (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>Pending Host Approval</span>
                      </span>
                    )}

                    {attendeeStatus === 'joined' && (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span>Joined ✓</span>
                      </span>
                    )}

                    {attendeeStatus === 'none' && (
                      <button
                        type="button"
                        disabled={isFull}
                        onClick={(e) => handleJoinClick(e, plan)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          isFull
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-[#E0533C] hover:bg-orange-700 text-white shadow-sm'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Request to Join</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-[#1C1A1E] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm text-slate-900 dark:text-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#E0533C] flex items-center justify-center mx-auto shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              No outings found for "{activeFilter}"
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Be the first to host a public hangout at your favorite Nairobi spot!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsHostModalOpen(true)}
            className="px-4 py-2 bg-[#E0533C] hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Host a Plan</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          HOST A PLAN MODAL
          ========================================================================= */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-[#E0533C] flex items-center justify-center font-bold">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Host a Nairobi Outing
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Create a public plan and invite fellow explorers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHostModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPlan} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* 1. Target Spot / Venue Selection */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>1. Choose Venue / Spot *</span>
                  {selectedSpot && (
                    <span className="text-[10px] text-[#E0533C] font-black uppercase">
                      {selectedSpot.category}
                    </span>
                  )}
                </label>

                {/* Spot Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={spotSearchQuery}
                    onChange={(e) => setSpotSearchQuery(e.target.value)}
                    placeholder="Search Nairobi spots (e.g., Alchemist, Talisman, NSK)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                  />
                </div>

                {/* Spot Select Carousel/List */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {filteredSpotsForHosting.map((spot) => {
                    const isSelected = selectedSpotId === spot.id;
                    return (
                      <div
                        key={spot.id}
                        onClick={() => setSelectedSpotId(spot.id)}
                        className={`w-36 p-2 rounded-2xl border transition cursor-pointer shrink-0 flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#E0533C] ring-2 ring-[#E0533C]/40 bg-orange-50/60 dark:bg-orange-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="h-16 rounded-xl bg-cover bg-center mb-1.5 relative overflow-hidden"
                          style={{ backgroundImage: `url('${spot.img}')` }}
                        >
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E0533C] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-[11px] truncate text-slate-900 dark:text-slate-100">
                          {spot.title}
                        </h4>
                        <p className="text-[9px] text-slate-500 truncate">
                          {spot.neighborhood}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Date and Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Time *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#E0533C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Date Shortcuts */}
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-23')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  This Friday (Oct 23)
                </button>
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-24')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  Saturday (Oct 24)
                </button>
                <button
                  type="button"
                  onClick={() => setPlanDate('2026-10-25')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200"
                >
                  Sunday (Oct 25)
                </button>
              </div>

              {/* 3. Max Attendees & Access Type */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Max Attendees:</span>
                    <span className="font-black text-[#E0533C] text-sm">{maxAttendees}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxAttendees(prev => Math.max(2, prev - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(parseInt(e.target.value, 10))}
                      className="flex-1 accent-[#E0533C]"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxAttendees(prev => Math.min(25, prev + 1))}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                    Access Type *
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAccessType('open')}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        accessType === 'open'
                          ? 'bg-white dark:bg-slate-900 text-[#E0533C] shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessType('singles_only')}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        accessType === 'singles_only'
                          ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Singles Only
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Short Description & Vibe Note */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                  Short Description & Vibe Note *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Heading to the sundowner DJ set and woodfired tacos. Looking for easygoing music lovers to hang out with!"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-[#E0533C] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CalendarPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Publishing Plan...' : 'Publish Outing Plan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHostModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          OUTING DETAIL / ATTENDEES MODAL
          ========================================================================= */}
      {selectedOutingDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Spot Cover Banner */}
            <div
              className="h-44 bg-cover bg-center relative p-3 flex flex-col justify-between"
              style={{ backgroundImage: `url('${selectedOutingDetail.spotImage}')` }}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/75 backdrop-blur-md text-white uppercase">
                  {selectedOutingDetail.accessType === 'singles_only' ? '💖 Singles Only' : '👥 Open Outing'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedOutingDetail(null)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-black/70 backdrop-blur-md p-2.5 rounded-2xl text-white">
                <h3 className="font-black text-sm truncate">
                  {selectedOutingDetail.spotTitle}
                </h3>
                <p className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#E0533C]" />
                  <span>{selectedOutingDetail.spotAddress}</span>
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Host Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full bg-cover bg-center border"
                    style={{ backgroundImage: `url('${selectedOutingDetail.hostAvatar}')` }}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs">{selectedOutingDetail.hostName}</span>
                      {selectedOutingDetail.isHostVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">Host • {selectedOutingDetail.hostHandle}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#E0533C] font-black block">
                    {formatOutingDate(selectedOutingDetail.date, selectedOutingDetail.time)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Capacity: {selectedOutingDetail.maxAttendees} people
                  </span>
                </div>
              </div>

              {/* Vibe Description */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                  About this Hangout
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-black/20 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  {selectedOutingDetail.description}
                </p>
              </div>

              {/* Attendees List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#E0533C]" />
                    <span>Joined Attendees ({selectedOutingDetail.attendees?.filter(a => a.status === 'joined').length || 0})</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    Host: {selectedOutingDetail.hostName}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* Host line */}
                  <div className="p-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={selectedOutingDetail.hostAvatar} alt="Host" className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-xs">{selectedOutingDetail.hostName}</span>
                        <span className="text-[9px] text-[#E0533C] font-black ml-1.5 uppercase">Host</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Confirmed</span>
                  </div>

                  {/* Joined attendees */}
                  {selectedOutingDetail.attendees?.map((att) => (
                    <div key={att.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={att.userAvatar} alt={att.userName} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-xs">{att.userName}</span>
                          <span className="text-[10px] text-slate-400 ml-1">{att.userHandle}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        att.status === 'joined'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      }`}>
                        {att.status === 'joined' ? 'Joined ✓' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {(() => {
                  const status = getAttendeeStatus(selectedOutingDetail);
                  if (status === 'host') {
                    return (
                      <div className="flex-1 py-3 text-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs">
                        You are hosting this outing!
                      </div>
                    );
                  }
                  if (status === 'joined') {
                    return (
                      <div className="flex-1 py-3 text-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs">
                        You have joined this outing ✓
                      </div>
                    );
                  }
                  if (status === 'pending') {
                    return (
                      <div className="flex-1 py-3 text-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-extrabold text-xs">
                        Join request pending host approval ⏳
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        handleJoinClick(e, selectedOutingDetail);
                        setSelectedOutingDetail(null);
                      }}
                      className="flex-1 py-3 bg-[#E0533C] hover:bg-orange-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Request to Join Outing</span>
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    shareContent({
                      title: `RADA Outing: ${selectedOutingDetail.spotTitle}`,
                      text: `Join ${selectedOutingDetail.hostName} for a hangout at ${selectedOutingDetail.spotTitle} (${selectedOutingDetail.date}) on RADA!`,
                      url: window.location.href,
                      onSuccess: showToast,
                      onError: showToast
                    });
                  }}
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Share Outing"
                >
                  <Share2 className="w-4 h-4 text-[#E0533C]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
export default OutingsTab;
