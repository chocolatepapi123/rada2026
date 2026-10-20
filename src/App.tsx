/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import * as cloud from './lib/cloudSync';
import { BusinessesProvider } from './components/BusinessBadge.tsx';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Header } from './components/Header.tsx';
import { Navigation } from './components/Navigation.tsx';
import { MerchantHubTab } from './components/MerchantHubTab.tsx';
import { PublicBusinessProfileModal } from './components/PublicBusinessProfileModal.tsx';
import { HomeTab } from './components/HomeTab.tsx';
import { SpotsTab } from './components/SpotsTab.tsx';
import { OutingsTab } from './components/OutingsTab.tsx';
import { SocialsTab } from './components/SocialsTab.tsx';
import { VaultTab } from './components/VaultTab.tsx';
import { LukuEventsTab } from './components/LukuEventsTab.tsx';
import { Overlays } from './components/Overlays.tsx';
import { LocationMapModal } from './components/LocationMapModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { AccountSettingsModal } from './components/AccountSettingsModal.tsx';
import { SavedPlacesModal } from './components/SavedPlacesModal.tsx';
import { LivenessVerificationModal } from './components/LivenessVerificationModal.tsx';
import { ToastProvider, showToast as triggerToast } from './components/Toast.tsx';
import { getTimeOfDayGreeting } from './utils/greetingUtils';
import {
  cleanStatuses,
  addStatusReplacingOwn,
  mergeRemoteStatuses,
  findOwnStatus,
  isOwnStatus
} from './utils/statusLifecycle';

import {
  initialBusinesses,
  initialOffers,
  initialSpots,
  initialEvents,
  cinemaMovies,
  initialStatuses,
  discoveryProfiles,
  initialConversations,
  initialTickets,
  initialContacts,
  initialOutings
} from './data/initialData.ts';

import {
  BusinessAccount,
  BusinessOffer,
  SpotItem,
  EventItem,
  CinemaMovie,
  StatusPost,
  StatusReply,
  ChatConversation,
  VaultTicket,
  EmergencyContact,
  Review,
  UserProfile,
  SavedItem,
  CollectionFolder,
  OutingPlan,
  OutingAttendee
} from './types.ts';


const GUEST_PROFILE: UserProfile = {
  name: 'Guest Explorer',
  handle: '@guest',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
  bio: 'Discovering local spots near you on RADA. Log in or create an account to customize your profile & connect with spots!',
  loc: 'Westlands',
  relationshipStatus: 'single',
  relationship_status: 'single',
  isLivenessVerified: false,
  is_liveness_verified: false,
  vibes: ['Nightlife', 'Cocktails', 'Amapiano', 'Art', 'Thrifting']
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Wayne Waweru',
  handle: '@lowk3yFX',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
  bio: 'Exploring Nairobi spots, amapiano vibes, and fashion setups. Hit me up for hangouts! ✨',
  loc: 'Westlands, Nairobi',
  relationshipStatus: 'single',
  relationship_status: 'single',
  isLivenessVerified: false,
  is_liveness_verified: false,
  vibes: ['Nightlife', 'Cocktails', 'Amapiano', 'Art', 'Thrifting']
};

// Deep links: /?tab=outings&outing=ID opens the Outings tab (OutingsTab then opens that plan)
const readDeepLinkTab = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'outings' || (!tab && params.get('outing'))) return 'outings';
  } catch (_) {}
  return 'home';
};

// Old saved lists may still hold Luku/thrift items; drop them
const stripLegacyThrift = (items: SavedItem[]): SavedItem[] =>
  items.filter(i => (i.kind as string) !== 'thrift');

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string>('');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'user' | 'merchant' | 'admin'>('user');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLivenessModalOpen, setIsLivenessModalOpen] = useState(false);
  const syncRef = useRef<(() => void) | null>(null);

  // Safe Supabase Session Listener & Onboarding Gate
  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 600);

    if (isSupabaseConfigured && supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setAuthLoading(false);
          if (!session) {
            setIsAuthModalOpen(true);
          }
        }
      }).catch(() => {
        if (mounted) {
          setAuthLoading(false);
          setIsAuthModalOpen(true);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          if (session) {
            setIsGuestMode(false);
            setIsAuthModalOpen(false);
          }
        }
      });

      return () => {
        mounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    } else {
      setAuthLoading(false);
      setIsAuthModalOpen(true);
    }
  }, []);
  // Load logged-in user's role
  useEffect(() => {
    if (!session?.user?.id || !isSupabaseConfigured) {
      setUserRole('user');
      return;
    }

    const loadUserRole = async () => {
      const userMetaRole = session.user.user_metadata?.role;
      const isAdminEmail = session.user.email?.toLowerCase().includes('admin');

      const { data, error } = await supabase
        .from('profiles')
        .select('role, relationship_status, is_liveness_verified, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data) {
        if (data.relationship_status !== undefined || data.is_liveness_verified !== undefined) {
          setCurrentUserProfile(prev => ({
            ...prev,
            relationshipStatus: (data.relationship_status === 'not_single' ? 'not_single' : 'single') as any,
            relationship_status: data.relationship_status || 'single',
            isLivenessVerified: Boolean(data.is_liveness_verified),
            is_liveness_verified: Boolean(data.is_liveness_verified),
            ...(data.avatar_url ? { avatar: data.avatar_url } : {})
          }));
        }
      }

      if (error) {
        setUserRole(
          userMetaRole === 'admin' || isAdminEmail
            ? 'admin'
            : userMetaRole === 'merchant'
              ? 'merchant'
              : 'user'
        );
        return;
      }

      setUserRole(
        data?.role === 'admin' || userMetaRole === 'admin' || isAdminEmail
          ? 'admin'
          : data?.role === 'merchant' || userMetaRole === 'merchant'
            ? 'merchant'
            : 'user'
      );
    };

    loadUserRole();
  }, [session]);

  // When Admin Dashboard is opened, trigger fresh sync from Supabase immediately
  useEffect(() => {
    if (isAdminOpen) {
      syncRef.current?.();
    }
  }, [isAdminOpen]);

  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured && supabase?.auth) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setSession(null);
    setUserRole('user');
    setIsGuestMode(false);
    setAuthModalMessage('');
    setIsAuthModalOpen(true);
    setCurrentUserProfile(GUEST_PROFILE);
    localStorage.removeItem('rada_current_user');
  };

  const requireAuth = (actionName: string, actionCallback: () => void) => {
    if (!session || isGuestMode) {
      setAuthModalMessage(`Please log in or create an account to ${actionName}.`);
      setIsAuthModalOpen(true);
      return;
    }
    actionCallback();
  };

  const handleDeleteAccount = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        showToast("Error deleting account: " + error.message);
      } else {
        await supabase.auth.signOut();
        setSession(null);
        showToast("Account deleted successfully.");
      }
    } else {
      setSession(null);
      showToast("Signed out.");
    }
  };

  

  // Theme State: Default to pure white / light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('rada_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('rada_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('rada_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
    showToast(!isDarkMode ? 'Dark theme enabled.' : 'Switched to Light theme (Default White).');
  };

  // Navigation
  const [activeTab, setActiveTab] = useState<string>(readDeepLinkTab);
  const [calendarTargetDate, setCalendarTargetDate] = useState<string | null>(null);
  const [calendarTargetEventId, setCalendarTargetEventId] = useState<number | string | null>(null);
  const lastSpotsScrollPosRef = useRef<number>(0);


  // Business Hub State
  const [businesses, setBusinesses] = useState<BusinessAccount[]>(() => {
  const saved = localStorage.getItem('rada_businesses');

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.filter((b: any) => b?.category !== 'thrift_store');
      }
    } catch (e) {
      console.error('Failed to load businesses:', e);
    }
  }

  return initialBusinesses;
});
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [isBusinessHubOpen, setIsBusinessHubOpen] = useState(false);

  // Core Data State (Ensures at least 10 items for every category)
  const [spots, setSpots] = useState<SpotItem[]>(() => {
    const saved = localStorage.getItem('rada_spots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          const existingIds = new Set(parsed.map((p: any) => String(p.id)));
          const missing = initialSpots.filter(init => !existingIds.has(String(init.id)));
          // Clean legacy mock reviews / fake counts
          return [...parsed, ...missing].map((sp: any) => {
            const cleanReviews = (sp.reviews || []).filter((r: any) => r.id !== 'rev-1');
            const count = cleanReviews.length;
            const rating = count > 0
              ? (cleanReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / count).toFixed(1)
              : 'New';
            return {
              ...sp,
              reviews: cleanReviews,
              reviewCount: count,
              rating
            };
          });
        }
      } catch (e) {}
    }
    return initialSpots;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('rada_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
      } catch (e) {}
    }
    return initialEvents;
  });

  const [statuses, setStatuses] = useState<StatusPost[]>(() => {
    let base: StatusPost[] = initialStatuses;
    try {
      const saved = localStorage.getItem('rada_statuses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) base = parsed;
      }
    } catch (e) {}
    // Drop anything older than 12 hours and keep one status per person
    return cleanStatuses(base);
  });

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('rada_conversations');
    return saved ? JSON.parse(saved) : initialConversations;
  });

  const [tickets, setTickets] = useState<VaultTicket[]>(() => {
    const saved = localStorage.getItem('rada_tickets');
    return saved ? JSON.parse(saved) : initialTickets;
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem('rada_contacts');
    return saved ? JSON.parse(saved) : initialContacts;
  });

  // Independent Offers & Promotions State (10 items)
  const [offers, setOffers] = useState<BusinessOffer[]>(() => {
    const saved = localStorage.getItem('rada_offers');
    if (saved) {
      try {
        const parsed = (JSON.parse(saved) as any[]).filter(o => o?.businessCategory !== 'thrift_store');
        if (Array.isArray(parsed) && parsed.length >= initialOffers.length) return parsed;
      } catch (e) {}
    }
    return initialOffers;
  });

  // Outings & Public Plans State
  const [outings, setOutings] = useState<OutingPlan[]>(() => {
    const saved = localStorage.getItem('rada_outings_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialOutings;
  });

  // Public Business Profile View Modal State
  const [selectedPublicBusiness, setSelectedPublicBusiness] = useState<BusinessAccount | null>(null);

  // Overlays state
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [selectedSpotModal, setSelectedSpotModal] = useState<SpotItem | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<EventItem | null>(null);
  const [qrPassTitle, setQrPassTitle] = useState<string | null>(null);

  // "View Location" Specific Spot Modal
  const [selectedLocationMapSpot, setSelectedLocationMapSpot] = useState<SpotItem | null>(null);

  // Date planning workflow
  const [isPlanDateModalOpen, setIsPlanDateModalOpen] = useState(false);
  const [datePlanningSpot, setDatePlanningSpot] = useState<SpotItem | null>(null);

  // Group creation modal
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Dedicated View All
  const [viewAllTitle, setViewAllTitle] = useState<string | null>(null);
  const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);

  // Shortcut navigation to a specific chat (e.g. Outing Group Chat)
  const [targetChatId, setTargetChatId] = useState<string | null>(null);

  // Dynamic Header Location: Detected physical location; if unavailable or null, no default fallback is set
  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    return localStorage.getItem('rada_current_location') || '';
  });
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);

  // Auto-detect physical location on startup
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let detected = 'Westlands';
          // Approximate Nairobi / Kiambu geographic clustering
          if (latitude > -1.22 && latitude < -1.0) {
            detected = 'Kiambu';
          } else if (latitude >= -1.28 && latitude <= -1.24 && longitude >= 36.78 && longitude <= 36.83) {
            detected = 'Westlands';
          } else if (latitude >= -1.31 && latitude <= -1.28 && longitude >= 36.76 && longitude <= 36.81) {
            detected = 'Kilimani';
          } else if (latitude >= -1.30 && latitude <= -1.27 && longitude >= 36.81 && longitude <= 36.84) {
            detected = 'Nairobi CBD';
          } else if (latitude >= -1.36 && latitude <= -1.31) {
            detected = 'Karen';
          } else {
            detected = 'Westlands';
          }
          setCurrentLocation(detected);
          localStorage.setItem('rada_current_location', detected);
          setIsGpsActive(true);
        },
        () => {
          // If geolocation is denied or unavailable, do not force a fallback default like "Westlands"
          setIsGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsGpsActive(false);
    }
  }, []);

  const handleUpdateLocation = (newLoc: string, isGps: boolean) => {
    setCurrentLocation(newLoc);
    setIsGpsActive(isGps);
    localStorage.setItem('rada_current_location', newLoc);
  };

  // GPS Broadcast
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState(false);

  // Going Events Tracking (Only clickable once; click again to remove count)
  const [goingEventIds, setGoingEventIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('rada_going_events');
    return saved ? JSON.parse(saved) : [];
  });

  // Current logged in user profile with Single / Not Single status (clean Guest profile by default)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => {
    return GUEST_PROFILE;
  });

  // Profile View Modal state (to view anyone's profile and bio)
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Unified RADA Toast Dispatcher with 2.5s auto-dismiss and glassmorphism styling
  const showToast = (text: string, options?: any) => {
    triggerToast(text, options);
  };

  // Saved Moves / Bookmarked Listings State
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('rada_saved_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return stripLegacyThrift(parsed);
      } catch (e) {}
    }
    return [
      { id: 1, kind: 'spot', savedAt: new Date().toISOString() },
      { id: 1, kind: 'event', savedAt: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    localStorage.setItem('rada_saved_items', JSON.stringify(savedItems));
  }, [savedItems]);

  // Saved Collection Folders State
  const [savedFolders, setSavedFolders] = useState<CollectionFolder[]>(() => {
    const saved = localStorage.getItem('rada_saved_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'f-1', name: 'Weekend Vibes', emoji: '🌴', createdAt: new Date().toISOString() },
      { id: 'f-2', name: 'Date Ideas', emoji: '🥂', createdAt: new Date().toISOString() },
      { id: 'f-3', name: 'Outdoor Moves', emoji: '🏕️', createdAt: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    localStorage.setItem('rada_saved_folders', JSON.stringify(savedFolders));
  }, [savedFolders]);

  const handleCreateFolder = (name: string, emoji?: string) => {
    const newFolder: CollectionFolder = {
      id: `f-${Date.now()}`,
      name,
      emoji: emoji || '✨',
      createdAt: new Date().toISOString()
    };
    setSavedFolders(prev => [newFolder, ...prev]);
  };

  const handleDeleteFolder = (folderId: string) => {
    setSavedFolders(prev => prev.filter(f => f.id !== folderId));
    setSavedItems(prev => prev.map(item => item.folderId === folderId ? { ...item, folderId: undefined } : item));
  };

  const handleAssignItemFolder = (itemId: string | number, kind: string, folderId: string | undefined) => {
    setSavedItems(prev => prev.map(item => {
      if (String(item.id) === String(itemId) && item.kind === kind) {
        return { ...item, folderId };
      }
      return item;
    }));
  };

  const handleToggleSave = (item: any, kind: 'spot' | 'event' | 'offer' | 'thrift') => {
    requireAuth('save items', () => {
      setSavedItems(prev => {
        const exists = prev.some(s => String(s.id) === String(item.id) && s.kind === kind);
        let updated: SavedItem[];
        if (exists) {
          showToast('Removed from Vault');
          updated = prev.filter(s => !(String(s.id) === String(item.id) && s.kind === kind));
        } else {
          showToast('Saved to Vault');
          updated = [{ id: item.id, kind, savedAt: new Date().toISOString() }, ...prev];
        }
        if (session?.user?.id) {
          cloud.syncSavedPlans(session.user.id, updated, savedFolders);
        }
        return updated;
      });
    });
  };

  // Restore saved plans from Supabase on session start
  useEffect(() => {
    if (session?.user?.id && isSupabaseConfigured) {
      cloud.fetchSavedPlans(session.user.id).then(res => {
        if (res.savedItems && res.savedItems.length > 0) {
          setSavedItems(stripLegacyThrift(res.savedItems));
        }
        if (res.savedFolders && res.savedFolders.length > 0) {
          setSavedFolders(res.savedFolders);
        }
      }).catch(err => {
        console.warn('Could not restore saved plans from Supabase:', err);
      });
    }
  }, [session]);

  // Restore outings and public plans from Supabase / cloud cache
  useEffect(() => {
    cloud.fetchOutings().then(res => {
      if (res && res.length > 0) {
        setOutings(res);
      }
    }).catch(err => {
      console.warn('Could not restore outings from Supabase:', err);
    });
  }, [session]);

  const handleCreateOuting = async (newPlan: OutingPlan) => {
    setOutings(prev => [newPlan, ...prev.filter(o => o.id !== newPlan.id)]);
    await cloud.createOuting(newPlan);
  };

  const handleRequestJoin = async (outingId: string, attendee: OutingAttendee) => {
    setOutings(prev => prev.map(o => {
      if (o.id === outingId) {
        const existing = o.attendees || [];
        const filtered = existing.filter(a => a.userId !== attendee.userId && a.id !== attendee.id);
        const updatedAtts = [...filtered, attendee];
        return {
          ...o,
          attendees: updatedAtts,
          currentAttendeesCount: updatedAtts.filter(a => a.status === 'joined' || a.status === 'approved').length + 1
        };
      }
      return o;
    }));
    await cloud.requestJoinOuting(outingId, attendee);
  };

  const handleUpdateAttendeeStatus = async (
    outingId: string,
    attendeeId: string,
    status: 'approved' | 'declined'
  ) => {
    let targetOuting: OutingPlan | undefined;
    let targetApplicant: OutingAttendee | undefined;

    setOutings(prev => {
      const updatedList = prev.map(o => {
        if (o.id === outingId) {
          const updatedAttendees = (o.attendees || []).map(a => {
            if (a.id === attendeeId) {
              targetApplicant = { ...a, status };
              return targetApplicant;
            }
            return a;
          });
          const confirmedCount = updatedAttendees.filter(a => a.status === 'joined' || a.status === 'approved').length + 1;
          const updatedPlan: OutingPlan = {
            ...o,
            attendees: updatedAttendees,
            currentAttendeesCount: confirmedCount
          };
          targetOuting = updatedPlan;
          return updatedPlan;
        }
        return o;
      });
      localStorage.setItem('rada_outings_cache', JSON.stringify(updatedList));
      return updatedList;
    });

    // Supabase update for outing_attendees status
    await cloud.updateOutingAttendeeStatus(attendeeId, status);

    // If approved, automatically create / link temporary Group Chat and add host + confirmed members
    if (status === 'approved') {
      const basePlan = targetOuting || outings.find(o => o.id === outingId);
      if (basePlan) {
        const updatedConversations = cloud.createOrUnlockOutingGroupChat(basePlan, targetApplicant);
        setConversations(updatedConversations);
        showToast(`${targetApplicant?.userName || 'Applicant'} approved! Temporary Group Chat unlocked 🎉`);
      }
    } else if (status === 'declined') {
      showToast('Join request declined.');
    }
  };

  const handleOpenOutingChat = (outing: OutingPlan) => {
    // Ensure temporary group chat is unlocked and synced
    const updatedConversations = cloud.createOrUnlockOutingGroupChat(outing);
    setConversations(updatedConversations);
    setTargetChatId(`grp-outing-${outing.id}`);
    setActiveTab('socials');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Seamless Calendar Routing
  const handleNavigateToCalendar = (dateStr?: string, eventId?: number | string) => {
    if (activeTab === 'spots') {
      lastSpotsScrollPosRef.current = window.scrollY;
    }
    setSelectedSpotModal(null);
    setSelectedEventModal(null);
    setActiveOverlay(null);
    setIsSavedModalOpen(false);
    setCalendarTargetDate(dateStr || null);
    setCalendarTargetEventId(eventId || null);
    window.history.pushState({ radaApp: true, tab: 'calendar' }, '');
    setActiveTab('calendar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Smooth back navigation to Spots feed without losing scroll position or filters
  const handleBackToSpots = () => {
    setActiveTab('spots');
    const pos = lastSpotsScrollPosRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: pos, behavior: 'instant' });
    });
  };

  const handleCloseSpotModal = () => {
    setSelectedSpotModal(null);
    const pos = lastSpotsScrollPosRef.current;
    if (pos > 0 && activeTab === 'spots') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: pos, behavior: 'instant' });
      });
    }
  };

  const handleCloseEventModal = () => {
    setSelectedEventModal(null);
    const pos = lastSpotsScrollPosRef.current;
    if (pos > 0 && activeTab === 'spots') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: pos, behavior: 'instant' });
      });
    }
  };



  const handleRefreshFeed = async () => {
    try {
      const [remoteSpots, remoteEvents, remoteOffers, remoteStatuses] = await Promise.all([
        cloud.fetchSpots(),
        cloud.fetchEvents(),
        cloud.fetchOffers(),
        cloud.fetchStatuses()
      ]);
      if (remoteSpots && remoteSpots.length > 0) setSpots(remoteSpots);
      if (remoteEvents && remoteEvents.length > 0) setEvents(remoteEvents);
      if (remoteOffers && remoteOffers.length > 0) setOffers(remoteOffers);
      if (remoteStatuses) {
        setStatuses(prev => cleanStatuses(mergeRemoteStatuses(remoteStatuses, prev, initialStatuses)));
      }
    } catch (e) {
      console.warn('Feed refresh completed with cached data');
    }
  };

  // Explicit refresh (header refresh icon). No pull-down gesture anywhere in the app.
  const handleHeaderRefresh = () => {
    showToast('Refreshing…');
    setStatuses(prev => cleanStatuses(prev));
    syncRef.current?.();
    cloud.fetchOutings().then(res => {
      if (res && res.length > 0) setOutings(res);
    }).catch(() => {});
  };

  // Modals state for Account Settings and Saved Items
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('rada_businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('rada_spots', JSON.stringify(spots));
  }, [spots]);

  useEffect(() => {
    localStorage.setItem('rada_events', JSON.stringify(events));
  }, [events]);

  // The old Luku/thrift cache is no longer used
  useEffect(() => {
    localStorage.removeItem('rada_thrift');
  }, []);

  useEffect(() => {
    localStorage.setItem('rada_statuses', JSON.stringify(statuses));
  }, [statuses]);

  // Status lifecycle: every minute, and when the app comes back to the foreground,
  // remove statuses older than 12 hours and refresh the "x ago" labels
  useEffect(() => {
    const tick = () => setStatuses(prev => cleanStatuses(prev));
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('rada_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('rada_going_events', JSON.stringify(goingEventIds));
  }, [goingEventIds]);

  useEffect(() => {
    if (session?.user?.id && !isGuestMode) {
      localStorage.setItem('rada_current_user', JSON.stringify(currentUserProfile));
    }
  }, [currentUserProfile, session, isGuestMode]);

  useEffect(() => {
    localStorage.setItem('rada_offers', JSON.stringify(offers));
  }, [offers]);

  // Lock body scroll and handle Escape key for Business Hub modal
  useEffect(() => {
    if (isBusinessHubOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsBusinessHubOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isBusinessHubOpen]);

  // Hardware Back Button Protection (Mobile Back Button does not close/exit the app)
  const isAnyModalOpen = Boolean(
    isAuthModalOpen ||
    isAccountSettingsOpen ||
    isSavedModalOpen ||
    isAdminOpen ||
    viewingProfile ||
    selectedPublicBusiness ||
    selectedLocationMapSpot ||
    qrPassTitle ||
    isPlanDateModalOpen ||
    isCreateGroupOpen ||
    viewAllTitle ||
    selectedSpotModal ||
    selectedEventModal ||
    activeOverlay ||
    isBusinessHubOpen ||
    isLivenessModalOpen
  );

  const lastBackPressRef = useRef<number>(0);
  const prevModalOpenRef = useRef<boolean>(false);
  const modalHistoryPushedRef = useRef<boolean>(false);
  const isProgrammaticBackRef = useRef<boolean>(false);
  const isExitingRef = useRef<boolean>(false);

  useEffect(() => {
    // Anchor base history state on app startup
    if (!window.history.state || !window.history.state.radaApp) {
      window.history.replaceState({ radaApp: true, tab: 'home' }, '');
      // Opened from a shared link (?tab=outings&outing=ID): add an entry so Back returns to Home
      if (readDeepLinkTab() === 'outings') {
        window.history.pushState({ radaApp: true, tab: 'outings' }, '');
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      // If this pop was triggered programmatically to clean up a UI modal close, ignore it
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        return;
      }

      if (isExitingRef.current) {
        return;
      }

      // 1. If any modal or overlay is open, dismiss it and stay inside app
      if (isAnyModalOpen) {
        // Modal is closed by browser hardware back button, so history entry is already popped
        modalHistoryPushedRef.current = false;
        if (isAuthModalOpen) setIsAuthModalOpen(false);
        if (isAccountSettingsOpen) setIsAccountSettingsOpen(false);
        if (isSavedModalOpen) setIsSavedModalOpen(false);
        if (isAdminOpen) setIsAdminOpen(false);
        if (viewingProfile) setViewingProfile(null);
        if (selectedPublicBusiness) setSelectedPublicBusiness(null);
        if (selectedLocationMapSpot) setSelectedLocationMapSpot(null);
        if (qrPassTitle) setQrPassTitle(null);
        if (isPlanDateModalOpen) {
          setIsPlanDateModalOpen(false);
          setDatePlanningSpot(null);
        }
        if (isCreateGroupOpen) setIsCreateGroupOpen(false);
        if (viewAllTitle) {
          setViewAllTitle(null);
          setViewAllCategory(null);
        }
        if (selectedSpotModal) {
          handleCloseSpotModal();
        }
        if (selectedEventModal) {
          handleCloseEventModal();
        }
        if (activeOverlay) setActiveOverlay(null);
        if (isBusinessHubOpen) setIsBusinessHubOpen(false);
        if (isLivenessModalOpen) setIsLivenessModalOpen(false);
        return;
      }

      // 2. If user navigated to Calendar from Spots, return smoothly to Spots feed
      if (activeTab === 'calendar') {
        handleBackToSpots();
        return;
      }

      // If user is on an inner tab, navigate back to home feed first
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      // 3. User is on home feed with no modals open:
      // Prevent accidental phone hardware back button app exit using double-press confirmation
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Double-press within 2 seconds: leave the app on the second press
        isExitingRef.current = true;
        window.history.back();
        try {
          window.close();
        } catch (_) {}
        return;
      }

      lastBackPressRef.current = now;
      // Re-anchor history state to keep the user safely inside the web app
      window.history.pushState({ radaApp: true, tab: 'home' }, '');
      showToast('Press back again to exit RADA');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isAnyModalOpen,
    isAuthModalOpen,
    isAccountSettingsOpen,
    isSavedModalOpen,
    isAdminOpen,
    viewingProfile,
    selectedPublicBusiness,
    selectedLocationMapSpot,
    qrPassTitle,
    isPlanDateModalOpen,
    isCreateGroupOpen,
    viewAllTitle,
    selectedSpotModal,
    selectedEventModal,
    activeOverlay,
    isBusinessHubOpen,
    activeTab,
    showToast
  ]);

  // Once the user leaves the Outings tab, clear the shared-link parameters from the address bar
  useEffect(() => {
    if (activeTab === 'outings') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('tab') && !params.has('outing')) return;
      params.delete('tab');
      params.delete('outing');
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
      );
    } catch (_) {}
  }, [activeTab]);

  // When any modal opens, push a history entry.
  // When closed through its UI (not by back), call history.back() once so entries don't pile up.
  useEffect(() => {
    if (isAnyModalOpen) {
      if (!prevModalOpenRef.current) {
        window.history.pushState({ radaApp: true, modal: true }, '');
        modalHistoryPushedRef.current = true;
      }
    } else {
      if (prevModalOpenRef.current && modalHistoryPushedRef.current) {
        // Modal was closed through UI (not via back button)
        modalHistoryPushedRef.current = false;
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
    }
    prevModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  // ---------------------------------------------------------------
  // CLOUD SYNC (Supabase): businesses + listings are shared across devices
  // ---------------------------------------------------------------
  const [localUserId] = useState<string>(() => {
    const saved = localStorage.getItem('rada_local_user_id');
    if (saved) return saved;
    const newId = `user-local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('rada_local_user_id', newId);
    return newId;
  });
  const currentUserId: string = session?.user?.id || localUserId;

  // Active business reference for the logged-in merchant (strictly owned only)
  const userOwnedBusinesses = (session?.user?.id && !isGuestMode)
    ? businesses.filter(b => Boolean(b.ownerId) && b.ownerId === session.user.id)
    : [];
  const currentBusiness = userOwnedBusinesses.find(b => b.id === activeBusinessId) || userOwnedBusinesses[0] || null;
  const latestRef = useRef<any>(null);
  latestRef.current = { businesses, spots, events, offers };
  const mutationRef = useRef(0);   // bumps on every local change
  const pendingRef = useRef(0);    // cloud writes still in flight

  // Run a cloud write in the background. fn returns an error message or null.
  const cloudWrite = (fn: () => Promise<string | null>) => {
    mutationRef.current += 1;
    pendingRef.current += 1;
    let ok = false;
    fn()
      .then((err) => {
        if (err) {
          console.warn('Cloud save failed:', err);
          showToast(`Saved on this device only (${err}).`);
        } else {
          ok = true;
        }
      })
      .catch((e) => {
        console.warn('Cloud save error:', e);
        showToast('Saved on this device only (offline?).');
      })
      .finally(() => {
        pendingRef.current -= 1;
        // After a successful save, reload from the cloud so photos become online links
        if (ok && pendingRef.current === 0) syncRef.current?.();
      });
  };

  useEffect(() => {
    if (authLoading) return;
    const uid: string | undefined = session?.user?.id;

    const syncFromCloud = async () => {
      const startVersion = mutationRef.current;
      const remoteBiz = await cloud.fetchBusinesses();
      const remoteListings = await cloud.fetchListings();
      if (!remoteBiz && !remoteListings) return; // offline or tables missing: keep local data
      const remoteReviews = (await cloud.fetchReviews()) || {};
      const remoteStatuses = await cloud.fetchStatuses();   // null = keep local
      const remoteGoing = await cloud.fetchGoing(uid);      // null = keep local

      const L = latestRef.current;
      const seedBizIds = new Set(initialBusinesses.map(b => b.id));
      const remoteBizIds = new Set((remoteBiz || []).map(b => b.id));

      // Move businesses created earlier on THIS device online (always as pending)
      const bizToMigrate: BusinessAccount[] = uid
        ? L.businesses.filter(
            (b: BusinessAccount) =>
              !seedBizIds.has(b.id) &&
              !remoteBizIds.has(b.id) &&
              (b.ownerId === uid || !b.ownerId || b.ownerId.startsWith('user-local') || b.ownerId === 'local-merchant-user')
          )
        : [];
      for (const b of bizToMigrate) {
        await cloud.insertBusiness({ ...b, ownerId: uid, verified: false, verificationStatus: 'pending' }, uid as string);
      }
      const migratedBiz = bizToMigrate.map(b => ({ ...b, ownerId: uid, verified: false, verificationStatus: 'pending' as const }));
      const unmigratedLocalBiz = !uid
        ? L.businesses.filter((b: BusinessAccount) => !seedBizIds.has(b.id) && !remoteBizIds.has(b.id))
        : [];
      const seedBiz = initialBusinesses
        .filter(b => !remoteBizIds.has(b.id))
        .map(b => L.businesses.find((x: BusinessAccount) => x.id === b.id) || b);

      const rawMerged = [...(remoteBiz || []), ...migratedBiz, ...unmigratedLocalBiz, ...seedBiz];
      const seenBizIds = new Set<string>();
      const mergedBiz: BusinessAccount[] = [];
      for (const b of rawMerged) {
        if (!seenBizIds.has(b.id)) {
          seenBizIds.add(b.id);
          mergedBiz.push(b);
        }
      }
      const myBizIds = new Set(mergedBiz.filter(b => uid && b.ownerId === uid).map(b => b.id));

      const mergeKind = async (kind: cloud.ListingKind, initial: any[], local: any[], remote: any[]) => {
        const remoteIds = new Set(remote.map(i => String(i.id)));
        const seedIds = new Set(initial.map(i => String(i.id)));
        const toMigrate = uid
          ? local.filter(i =>
              !seedIds.has(String(i.id)) &&
              !remoteIds.has(String(i.id)) &&
              i.businessId &&
              myBizIds.has(i.businessId)
            )
          : [];
        for (const item of toMigrate) {
          await cloud.upsertListing(kind, item, item.businessId, uid as string);
        }
        const seeds = initial
          .map(sd => local.find(l => String(l.id) === String(sd.id)) || sd)
          .filter(sd => !remoteIds.has(String(sd.id)));
        return [...remote, ...toMigrate, ...seeds];
      };

      const safeListings: cloud.CloudListings = remoteListings || { spot: [], event: [], offer: [] };

      const mergedSpotsRaw = await mergeKind('spot', initialSpots, L.spots, safeListings.spot);

      // Ratings, review counts, reviews and review photos come dynamically from real Supabase reviews
      const remoteSpotIds = new Set(safeListings.spot.map((x: any) => String(x.id)));
      const mergedSpots = mergedSpotsRaw.map((sp: any) => {
        const seed = initialSpots.find(x => String(x.id) === String(sp.id));
        const base: any = remoteSpotIds.has(String(sp.id)) ? sp : (seed || sp);
        const mine: any[] = (remoteReviews[String(sp.id)] || []).filter((r: any) => r.id !== 'rev-1');
        const allReviews = mine;

        const baseImages: string[] = base.images && base.images.length > 0 ? base.images : [base.img];
        const reviewImages: string[] = mine.flatMap((r: any) => r.images || []);
        const images = Array.from(new Set([...baseImages, ...reviewImages]));

        const reviewCount = mine.length;
        const rating = reviewCount > 0
          ? (mine.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviewCount).toFixed(1)
          : 'New';

        return { ...base, reviews: allReviews, reviewCount, rating, images };
      });
      const mergedEventsRaw = await mergeKind('event', initialEvents, L.events, safeListings.event);

      // "I'm going" counts come from the rada_going table
      const remoteEventIds = new Set(safeListings.event.map((x: any) => String(x.id)));
      const mergedEvents = remoteGoing
        ? mergedEventsRaw.map((ev: any) => {
            const seed = initialEvents.find(x => String(x.id) === String(ev.id));
            const base: any = remoteEventIds.has(String(ev.id)) ? ev : (seed || ev);
            const baseCount = seed ? seed.goingCount : 0;
            return { ...base, goingCount: baseCount + (remoteGoing.counts[String(ev.id)] || 0) };
          })
        : mergedEventsRaw;
      const mergedOffers = await mergeKind('offer', initialOffers, L.offers, safeListings.offer);

      // If the user changed something while we were syncing, don't overwrite it
      if (mutationRef.current !== startVersion || pendingRef.current > 0) return;

      setBusinesses(mergedBiz);
      setSpots(mergedSpots);
      setEvents(mergedEvents);
      setOffers(mergedOffers);
      if (remoteStatuses) {
        setStatuses(prev => cleanStatuses(mergeRemoteStatuses(remoteStatuses, prev, initialStatuses)));
      }
      if (remoteGoing && uid) setGoingEventIds(remoteGoing.mine);
      setActiveBusinessId(prev =>
        mergedBiz.some(b => b.id === prev)
          ? prev
          : (mergedBiz.find(b => uid && b.ownerId === uid)?.id || mergedBiz[0]?.id || prev)
      );
    };

    const run = () => {
      syncFromCloud().catch(e => console.warn('Cloud sync failed:', e));
    };

    syncRef.current = run;
    run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [authLoading, session?.user?.id]);

  // ---------------------------------------------------------------
  // PER-USER DATA (Vault tickets, emergency contacts, own profile)
  // ---------------------------------------------------------------
  const [userDataReady, setUserDataReady] = useState(false);
  const userDataUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const uid: string | undefined = session?.user?.id;
    setUserDataReady(false);
    userDataUidRef.current = null;
    if (!uid) {
      setCurrentUserProfile(GUEST_PROFILE);
      setTickets([]);
      return;
    }
    let cancelled = false;

    // A different account signed in on this phone: clear the previous person's personal data
    const lastUid = localStorage.getItem('rada_last_uid');
    if (lastUid && lastUid !== uid) {
      setTickets(initialTickets);
      setEmergencyContacts(initialContacts);
      setConversations(initialConversations);
      setGoingEventIds([]);
      setCurrentUserProfile(GUEST_PROFILE);
    }
    localStorage.setItem('rada_last_uid', uid);

    (async () => {
      const remote = await cloud.fetchUserData(uid);
      if (cancelled) return;
      // Brand-new account: no hardcoded username/bio. The username stays empty until the user picks one.
      const freshProfile = (): UserProfile => ({
        ...DEFAULT_PROFILE,
        name: '',
        handle: '@explorer',
        username: undefined,
        bio: '',
      });
      let base: UserProfile = remote?.profile ? remote.profile : freshProfile();
      if (remote) {
        if (remote.tickets) setTickets(remote.tickets);
        if (remote.contacts) setEmergencyContacts(remote.contacts);
      }
      // The `profiles` table holds the real username/name/bio/avatar. It always wins over the
      // older copy stored inside rada_user_data, which is what used to bring the old username back.
      try {
        const patch = await cloud.fetchOwnProfilePatch(uid);
        if (cancelled) return;
        base = { ...base, ...patch };
        if (patch.username) base.handle = cloud.toHandle(patch.username);
      } catch (e) {
        console.warn('Profile identity load failed:', e);
      }
      setCurrentUserProfile(base);
      userDataUidRef.current = uid;
      setUserDataReady(true);
    })().catch(e => console.warn('User data load failed:', e));

    return () => { cancelled = true; };
  }, [authLoading, session?.user?.id]);

  useEffect(() => {
    const uid: string | undefined = session?.user?.id;
    if (!uid || isGuestMode || !userDataReady || userDataUidRef.current !== uid) return;

    const timer = setTimeout(async () => {
      const res = await cloud.saveUserData(uid, {
        tickets,
        contacts: emergencyContacts,
        profile: currentUserProfile,
      });
      if (res.error) {
        console.warn('User data save failed:', res.error);
        return;
      }
      // swap any photos for their online links (only changes if something was uploaded)
      const c = res.cleaned;
      if (JSON.stringify(c.profile) !== JSON.stringify(currentUserProfile)) setCurrentUserProfile(c.profile);
      if (JSON.stringify(c.tickets) !== JSON.stringify(tickets)) setTickets(c.tickets);
      if (JSON.stringify(c.contacts) !== JSON.stringify(emergencyContacts)) setEmergencyContacts(c.contacts);
    }, 800);

    return () => clearTimeout(timer);
  }, [tickets, emergencyContacts, currentUserProfile, userDataReady, session?.user?.id]);

  // Handlers for Business Hub
  // Returns an error message (string) on failure, or null on success.
  const handleCreateBusiness = async (newBiz: BusinessAccount): Promise<string | null> => {
    // If user is guest or unauthenticated, require authentication
    if (!session || isGuestMode) {
      setAuthModalMessage('Please log in or create an account to add a spot or business.');
      setIsAuthModalOpen(true);
      return 'Please sign in or create an account to register your business.';
    }

    const effectiveOwner = session?.user?.id || currentUserId || newBiz.ownerId || localUserId;
    const finalBizId = cloud.toValidUuid(newBiz.id);
    const biz: BusinessAccount = {
      ...newBiz,
      id: finalBizId,
      ownerId: effectiveOwner,
      verified: false,
      verificationStatus: 'pending',
    };

    mutationRef.current += 1;
    pendingRef.current += 1;
    try {
      if (isSupabaseConfigured) {
        const err = await cloud.insertBusiness(biz, effectiveOwner);
        if (err) {
          console.error('insertBusiness failed:', err);
          return `Could not save business to Supabase: ${err}`;
        }
      }
    } catch (e) {
      console.error('insertBusiness threw:', e);
      return `Could not save business to Supabase: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      pendingRef.current -= 1;
    }

    setBusinesses(prev => [biz, ...prev.filter(b => b.id !== finalBizId && b.id !== newBiz.id)]);
    setActiveBusinessId(finalBizId);

    // If hospitality venue, automatically create & publish corresponding Spot so it appears live in SpotsTab for all users
    if (biz.category === 'hospitality') {
      const newSpot: SpotItem = {
        id: Date.now(),
        title: biz.name,
        category: 'restaurants',
        neighborhood: biz.neighborhood || 'Westlands',
        address: biz.address || `${biz.neighborhood || 'Westlands'}, Nairobi`,
        exactLocationTag: biz.address || `${biz.neighborhood || 'Westlands'}, Nairobi`,
        landmark: biz.neighborhood || 'Nairobi',
        lat: -1.2675,
        lng: 36.8115,
        rating: '5.0',
        reviewCount: 0,
        price: '$$',
        img: biz.coverImage || biz.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
        images: [biz.coverImage || biz.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop'],
        description: biz.bio || 'Official spot verified on RADA.',
        phone: biz.phone || '',
        openingHours: '10:00 AM - 11:00 PM',
        businessId: finalBizId,
        merchantId: effectiveOwner,
        isUserUploaded: false,
        reviews: []
      };

      setSpots(prev => {
        const filtered = prev.filter(s => s.businessId !== finalBizId && s.title.toLowerCase() !== biz.name.toLowerCase());
        return [newSpot, ...filtered];
      });

      if (isSupabaseConfigured) {
        try {
          await cloud.upsertListing('spot', newSpot, finalBizId, effectiveOwner);
        } catch (sErr) {
          console.warn('Could not upsert initial spot for business:', sErr);
        }
      }
    }

    // reload from cloud so photos become online links and state refreshes
    if (pendingRef.current === 0 && isSupabaseConfigured) {
      await syncRef.current?.();
    }
    return null;
  };

  const handleUpdateBusiness = (updatedBiz: BusinessAccount) => {
    setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
    const isSeed = initialBusinesses.some(b => b.id === updatedBiz.id);
    if (currentUserId && !isSeed) {
      cloudWrite(() => cloud.updateBusiness(updatedBiz, currentUserId));
    }
  };

  // Offers Handlers (SPEC 4: Decoupled Independent Engine)
  const handleCreateOffer = (newOffer: BusinessOffer) => {
    setOffers(prev => [newOffer, ...prev]);
    if (currentUserId) cloudWrite(() => cloud.upsertListing('offer', newOffer, newOffer.businessId, currentUserId));
  };

  const handleUpdateOffer = (updatedOffer: BusinessOffer) => {
    setOffers(prev => prev.map(o => o.id === updatedOffer.id ? updatedOffer : o));
    if (currentUserId) cloudWrite(() => cloud.upsertListing('offer', updatedOffer, updatedOffer.businessId, currentUserId));
  };

  const handleDeleteOffer = (offerId: string) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
    if (currentUserId) cloudWrite(() => cloud.deleteListing('offer', offerId));
  };

  // Spot Claiming (SPEC 3A: Exclusive to Spot Merchants)
  const handleClaimSpot = (spotId: number, businessId: string) => {
    const claimed = spots.find(s => s.id === spotId);
    if (claimed && currentUserId) {
      cloudWrite(() => cloud.upsertListing('spot', { ...claimed, businessId, isUserUploaded: false }, businessId, currentUserId));
    }
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        return {
          ...s,
          businessId,
          isUserUploaded: false
        };
      }
      return s;
    }));
  };

  const handleReleaseSpot = (spotId: number) => {
    const released = spots.find(s => s.id === spotId);
    if (released && currentUserId) {
      cloudWrite(() => cloud.upsertListing('spot', { ...released, businessId: undefined, isUserUploaded: true }, null, currentUserId));
    }
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        return {
          ...s,
          businessId: undefined,
          isUserUploaded: true
        };
      }
      return s;
    }));
  };

  const handleOpenBusinessProfile = (bizId: string) => {
    const biz = businesses.find(b => b.id === bizId);
    if (biz) {
      setSelectedPublicBusiness(biz);
    }
  };

  const handleAddOrUpdateSpot = (spot: SpotItem) => {
    requireAuth('add a spot or business', () => {
      const ownerId = session?.user?.id || currentUserId;
      if (!ownerId) {
        showToast('Please sign in to manage spots.');
        return;
      }

      // Check ownership if editing an existing spot
      const existing = spots.find(s => s.id === spot.id);
      if (existing && existing.merchantId && existing.merchantId !== ownerId) {
        const userBizIds = businesses.filter(b => b.ownerId === ownerId).map(b => b.id);
        if (!existing.businessId || !userBizIds.includes(existing.businessId)) {
          showToast('Permission denied: Only the spot owner or verified merchant can edit this spot.');
          return;
        }
      }

      const spotWithMerchant: SpotItem = {
        ...spot,
        merchantId: spot.merchantId || ownerId,
        businessId: spot.businessId || activeBusinessId || undefined
      };

      setSpots(prev => {
        const idx = prev.findIndex(s => s.id === spotWithMerchant.id || s.title.toLowerCase() === spotWithMerchant.title.toLowerCase());
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = spotWithMerchant;
          return updated;
        }
        return [spotWithMerchant, ...prev];
      });

      cloudWrite(async () => {
        const res = await cloud.upsertListing('spot', spotWithMerchant, spotWithMerchant.businessId, ownerId);
        // Trigger live refresh across the application feeds
        syncRef.current?.();
        return res;
      });
    });
  };

  const handleAddEvent = (event: EventItem) => {
    requireAuth('add an event', () => {
      // add new, or replace if this event already exists (editing)
      setEvents(prev => prev.some(e => e.id === event.id)
        ? prev.map(e => e.id === event.id ? event : e)
        : [event, ...prev]);
      const ownerId = session?.user?.id || currentUserId;
      if (ownerId) cloudWrite(() => cloud.upsertListing('event', event, event.businessId, ownerId));
    });
  };

  const handleDeleteListing = (type: 'spot' | 'event', id: number) => {
    requireAuth('delete a listing', () => {
      const ownerId = session?.user?.id || currentUserId;
      if (ownerId) cloudWrite(() => cloud.deleteListing(type, id));
      if (type === 'spot') {
        setSpots(prev => prev.filter(s => s.id !== id));
        showToast('Spot listing removed.');
      } else {
        setEvents(prev => prev.filter(e => e.id !== id));
        showToast('Event listing removed.');
      }
    });
  };

  // Post Review with Images Handler
  const handlePostReview = (spotId: number, review: Review) => {
    requireAuth('leave a review', () => {
      if (currentUserId) cloudWrite(() => cloud.insertReview(spotId, review, currentUserId));
      setSpots(prev => prev.map(s => {
        if (s.id === spotId) {
          const existingReviews = (s.reviews || []).filter((r: any) => r.id !== 'rev-1');
          const updatedReviews = [review, ...existingReviews];
          const sumRatings = updatedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
          const avgRating = (sumRatings / updatedReviews.length).toFixed(1);

          // Append review images into spot images gallery
          const existingImages = (s.images && s.images.length > 0) ? s.images : [s.img];
          const newImages = review.images ? [...existingImages, ...review.images] : existingImages;

          const updatedSpot = {
            ...s,
            rating: avgRating,
            reviewCount: updatedReviews.length,
            reviews: updatedReviews,
            images: newImages
          };

          if (selectedSpotModal?.id === spotId) {
            setSelectedSpotModal(updatedSpot);
          }

          return updatedSpot;
        }
        return s;
      }));

      showToast('Review Submitted');
    });
  };

  // Add Spot Image Handler
  const handleAddSpotImage = (spotId: number, imgUrl: string) => {
    requireAuth('leave a review', () => {
      setSpots(prev => prev.map(s => {
        if (s.id === spotId) {
          const currentImages = s.images || [s.img];
          const updatedSpot = { ...s, images: [...currentImages, imgUrl] };
          if (selectedSpotModal?.id === spotId) {
            setSelectedSpotModal(updatedSpot);
          }
          return updatedSpot;
        }
        return s;
      }));
    });
  };

  // Cinema Booking & Vault Sync
  const handleBookCinema = (movie: CinemaMovie) => {
    const newPass: VaultTicket = {
      id: `pass-${Date.now()}`,
      title: movie.title,
      dateStr: movie.date,
      locationStr: movie.locationName,
      type: 'Cinema Movie Pass'
    };
    setTickets(prev => [newPass, ...prev]);
    showToast(`Booked ${movie.title}! Synced to Vault Calendar.`);
    setTimeout(() => {
      window.open(movie.url, '_blank');
    }, 700);
  };

  // Status Posting with clean location (e.g. Westlands, Nairobi - no GPS coordinates)
  // Removes a status from Supabase (rada_statuses) as well as from the screen
  const deleteStatusInCloud = (statusId: string) => {
    const uid: string | undefined = session?.user?.id;
    if (uid) cloudWrite(() => cloud.deleteStatusFromCloud(statusId, uid));
  };

  const handlePostStatus = (text: string, mediaUrl?: string, locationName?: string) => {
    requireAuth('send messages', () => {
      const newPost: StatusPost = {
        id: `s-${Date.now()}`,
        userId: session?.user?.id || undefined,
        createdAt: new Date().toISOString(),
        author: currentUserProfile.name,
        handle: currentUserProfile.handle,
        avatar: currentUserProfile.avatar,
        timeAgo: 'Just now',
        text,
        mediaUrl,
        mediaType: 'image',
        locationName: locationName || 'Westlands, Nairobi',
        replies: []
      };
      // One active status per person: the new post replaces the previous one
      const { next, replaced } = addStatusReplacingOwn(statuses, newPost, {
        userId: session?.user?.id,
        handle: currentUserProfile.handle
      });
      setStatuses(next);
      replaced.forEach(old => deleteStatusInCloud(old.id));
      if (currentUserId) cloudWrite(() => cloud.insertStatus(newPost, currentUserId));
      showToast(
        replaced.length > 0
          ? 'Status updated. Your previous one was replaced.'
          : 'Status posted live! It disappears after 12 hours.'
      );
    });
  };

  // Manual delete: only the owner can delete their own status, anytime
  const handleDeleteStatus = (statusId: string) => {
    requireAuth('delete your status', () => {
      const target = statuses.find(s => s.id === statusId);
      if (!target || !isOwnStatus(target, { userId: session?.user?.id, handle: currentUserProfile.handle })) return;
      setStatuses(prev => prev.filter(s => s.id !== statusId));
      deleteStatusInCloud(statusId);
      showToast('Status deleted.');
    });
  };

  const myStatusId = session?.user?.id
    ? findOwnStatus(statuses, { userId: session.user.id, handle: currentUserProfile.handle })?.id
    : undefined;

  // Reply to someone's status
  const handleReplyStatus = (statusId: string, text: string) => {
    requireAuth('send messages', () => {
      const newReply: StatusReply = {
        id: `rep-${Date.now()}`,
        author: currentUserProfile.name,
        handle: currentUserProfile.handle,
        avatar: currentUserProfile.avatar,
        timeAgo: 'Just now',
        text
      };
      if (currentUserId) cloudWrite(() => cloud.insertStatusReply(statusId, newReply, currentUserId));
      setStatuses(prev => prev.map(s => {
        if (s.id === statusId) {
          return {
            ...s,
            replies: [...(s.replies || []), newReply]
          };
        }
        return s;
      }));
      showToast('Reply posted to status!');
    });
  };

  // Event "I'm Going" Toggle: clickable once to go; if clicked again, remove count
  const handleToggleGoing = (event: EventItem) => {
    const isAlreadyGoing = goingEventIds.includes(event.id);
    if (currentUserId) cloudWrite(() => cloud.setGoing(event.id, currentUserId, !isAlreadyGoing));
    if (isAlreadyGoing) {
      // Untoggle: remove count
      setGoingEventIds(prev => prev.filter(id => id !== event.id));
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: Math.max(0, e.goingCount - 1) } : e));
      if (selectedEventModal && selectedEventModal.id === event.id) {
        setSelectedEventModal(prev => prev ? { ...prev, goingCount: Math.max(0, prev.goingCount - 1) } : null);
      }
      setTickets(prev => prev.filter(t => t.title !== event.title));
      showToast(`Removed from going list for ${event.title}`);
    } else {
      // Toggle: add count
      setGoingEventIds(prev => [...prev, event.id]);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: e.goingCount + 1 } : e));
      if (selectedEventModal && selectedEventModal.id === event.id) {
        setSelectedEventModal(prev => prev ? { ...prev, goingCount: prev.goingCount + 1 } : null);
      }
      const newPass: VaultTicket = {
        id: `going-${Date.now()}`,
        title: event.title,
        dateStr: event.date,
        locationStr: event.location.split(',')[0],
        type: 'Vault Synced Outing'
      };
      setTickets(prev => [newPass, ...prev]);
      showToast(`You're going to ${event.title}! Synced to Vault.`);
    }
  };

  // Applies identity changes (username, display name, bio, avatar, status, pro flag) coming from the
  // account/profile screens. Keeps `handle` ("@username") in sync and caches the result locally.
  const handleOwnProfileChange = (patch: Partial<UserProfile>) => {
    setCurrentUserProfile(prev => {
      const merged: UserProfile = { ...prev, ...patch };
      if (patch.username !== undefined) merged.handle = cloud.toHandle(patch.username);
      if (patch.relationshipStatus) merged.relationship_status = patch.relationshipStatus;
      return merged;
    });
  };

  // Update current user profile
  const handleUpdateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUserProfile(prev => {
      const merged = { ...prev, ...updates };
      if (updates.relationshipStatus) {
        merged.relationship_status = updates.relationshipStatus;
      }
      if (updates.isLivenessVerified !== undefined) {
        merged.is_liveness_verified = updates.isLivenessVerified;
      }
      return merged;
    });

    const uid = session?.user?.id;
    if (uid && isSupabaseConfigured && (updates.relationshipStatus || updates.isLivenessVerified !== undefined)) {
      cloud.updateProfileVerification(
        uid,
        updates.relationshipStatus || currentUserProfile.relationshipStatus,
        updates.isLivenessVerified !== undefined ? updates.isLivenessVerified : Boolean(currentUserProfile.isLivenessVerified),
        updates.avatar || currentUserProfile.avatar
      ).catch(e => console.warn('Profile verification update error:', e));
    }
    showToast('Profile updated!');
  };

  const handleVerificationSuccess = async (verified: {
    avatar: string;
    isLivenessVerified: boolean;
    relationshipStatus: 'single';
  }) => {
    const updated: UserProfile = {
      ...currentUserProfile,
      avatar: verified.avatar,
      isLivenessVerified: true,
      is_liveness_verified: true,
      relationshipStatus: 'single',
      relationship_status: 'Single',
    };
    setCurrentUserProfile(updated);
    localStorage.setItem('rada_current_user', JSON.stringify(updated));

    const uid = session?.user?.id;
    if (uid && isSupabaseConfigured) {
      await cloud.updateProfileVerification(
        uid,
        'Single',
        true,
        verified.avatar
      );
      await cloud.saveUserData(uid, {
        tickets,
        contacts: emergencyContacts,
        profile: updated,
      });
    }

    setIsLivenessModalOpen(false);
    showToast('Profile Verified');
  };

  const handleBuyEventTicket = (event: EventItem) => {
    const newPass: VaultTicket = {
      id: `tkt-${Date.now()}`,
      title: event.title,
      dateStr: event.date,
      locationStr: event.location.split(',')[0],
      type: 'Verified Ticket Pass'
    };
    setTickets(prev => [newPass, ...prev]);
    showToast(`Ticket pass for ${event.title} added to Vault! Redirecting to checkout...`);
    setTimeout(() => {
      window.open(event.url, '_blank');
    }, 750);
  };

  // Plan a Date workflow
  const handlePlanDateFromSpot = (spot: SpotItem) => {
    setSelectedSpotModal(null);
    setDatePlanningSpot(spot);
    setIsPlanDateModalOpen(true);
  };

  const handleConfirmDateInvite = (spot: SpotItem, date: string, time: string) => {
    setIsPlanDateModalOpen(false);
    setDatePlanningSpot(null);

    const activeConv = conversations[0];
    if (activeConv) {
      activeConv.messages.push({
        id: `invite-${Date.now()}`,
        sender: 'me',
        text: `Sent a Date Invitation for ${spot.title}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateInvite: {
          spotTitle: spot.title,
          address: spot.address,
          date,
          time,
          accepted: false
        }
      });
      activeConv.lastMessage = `Date Invite: ${spot.title} on ${date}`;
    }

    setTickets(prev => [{
      id: `date-${Date.now()}`,
      title: `Date with Jane @ ${spot.title}`,
      dateStr: `${date} (${time})`,
      locationStr: spot.address,
      type: 'Vault Synced Outing'
    }, ...prev]);

    setActiveTab('socials');
    showToast(`Date invitation for ${spot.title} sent to chat!`);
  };

  // Accept Dating Request
  const handleAcceptRequest = (name: string, avatar: string) => {
    const newConv: ChatConversation = {
      id: `c-${Date.now()}`,
      name,
      avatar,
      type: 'direct',
      lastMessage: 'Matched! Say hi ✨',
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: 'them',
          text: `Hey! Excited to connect on RADA. Where do you like to hang out in Nairobi?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveTab('socials');
  };

  // Create Group Chat
  const handleCreateGroup = (name: string, members: string[]) => {
    setIsCreateGroupOpen(false);
    const newGroupConv: ChatConversation = {
      id: `group-${Date.now()}`,
      name,
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop',
      type: 'group',
      lastMessage: `Group created with ${members.length} members`,
      members,
      messages: [
        {
          id: `m-grp-1`,
          sender: 'system',
          text: `Created group "${name}" with ${members.join(', ')}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setConversations(prev => [newGroupConv, ...prev]);
    setActiveTab('socials');
    showToast(`Group "${name}" created!`);
  };

  const handleOpenOverlay = (overlayId: string) => {
    if (overlayId === 'businessHub') {
      requireAuth('access the Merchant Hub', () => {
        setIsBusinessHubOpen(true);
      });
    } else if (overlayId === 'savedOverlay') {
      requireAuth('view saved collections', () => {
        setIsSavedModalOpen(true);
      });
    } else if (overlayId === 'youOverlay' || overlayId === 'accountSettings') {
      setIsAccountSettingsOpen(true);
    } else {
      setActiveOverlay(overlayId);
    }
  };
  return (
    <ToastProvider>
      <BusinessesProvider businesses={businesses}>
        <div className="min-h-screen bg-white text-slate-900 dark:bg-[#121113] dark:text-slate-100 flex flex-col transition-colors duration-200 antialiased overflow-x-hidden">
          {/* Primary Application Splash Screen */}
          {showSplash && <SplashScreen durationMs={2000} onDismiss={() => setShowSplash(false)} />}

      {authLoading ? (
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center select-none"
          style={{ background: 'linear-gradient(135deg, #E05328 0%, #D94E28 100%)' }}
        >
          {/* Prominent RADA Logo Icon */}
          <div className="relative group mb-6">
            <div className="absolute -inset-4 bg-white/20 rounded-3xl blur-xl" />
            <img
              src="/logo.jpg"
              alt="RADA"
              className="relative w-40 sm:w-48 h-auto object-contain rounded-3xl shadow-2xl"
            />
          </div>

          <p className="text-white text-base sm:text-lg font-bold tracking-wide drop-shadow-sm mt-3">
            {getTimeOfDayGreeting()}
          </p>

          {/* Minimal clean loading dots */}
          <div className="mt-8 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      ) : (
        <>


          {/* Top Header */}
          <Header
            onOpenOverlay={handleOpenOverlay}
            onSwitchTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            currentLocation={currentLocation}
            isGpsActive={isGpsActive}
            onUpdateLocation={handleUpdateLocation}
            hasBusinessAccount={Boolean(currentBusiness)}
            businessName={currentBusiness?.name}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            isGuestMode={isGuestMode || !session}
            onOpenAuth={() => {
              setAuthModalMessage('');
              setIsAuthModalOpen(true);
            }}
            onOpenAdmin={() => setIsAdminOpen(true)}
            userRole={userRole}
            onLogout={handleSignOut}
            onOpenSaved={() => requireAuth('view saved collections', () => setIsSavedModalOpen(true))}
            savedCount={savedItems.length}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            onRefresh={handleHeaderRefresh}
          />

          {/* Main Content Viewports */}
          <main className="flex-1 pb-24 max-w-lg mx-auto w-full relative px-0">
            {activeTab === 'home' && (
              <HomeTab
                events={events}
                cinemaMovies={cinemaMovies}
                statuses={statuses}
                offers={offers}
                spots={spots}
                savedItems={savedItems}
                onToggleSave={handleToggleSave}
                onRefreshFeed={handleRefreshFeed}
                onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
                onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
                onBookCinema={handleBookCinema}
                onPostStatus={handlePostStatus}
                onReplyStatus={handleReplyStatus}
                onDeleteStatus={handleDeleteStatus}
                myStatusId={myStatusId}
                onViewUserProfile={(profile) => setViewingProfile(profile)}
                onOpenDedicatedViewAll={(title, cat) => {
                  setViewAllTitle(title);
                  setViewAllCategory(cat);
                }}
                onOpenCreateEvent={() => requireAuth('add a spot or business', () => setIsBusinessHubOpen(true))}
                onOpenBusinessProfile={handleOpenBusinessProfile}
                showToast={showToast}
              />
            )}

            {activeTab === 'spots' && (
              <SpotsTab
                spots={spots}
                savedItems={savedItems}
                onToggleSave={handleToggleSave}
                onOpenSpotFullView={(spot) => {
                  lastSpotsScrollPosRef.current = window.scrollY;
                  setSelectedSpotModal(spot);
                }}
                onViewLocation={(spot) => setSelectedLocationMapSpot(spot)}
                onOpenDedicatedViewAll={(title, cat) => {
                  setViewAllTitle(title);
                  setViewAllCategory(cat);
                }}
                onOpenCreateSpot={() => requireAuth('add a spot or business', () => setIsBusinessHubOpen(true))}
                onPostReview={handlePostReview}
                onNavigateToCalendar={handleNavigateToCalendar}
                showToast={showToast}
              />
            )}

            {(activeTab === 'outings' || activeTab === 'plans') && (
              <OutingsTab
                outings={outings}
                spots={spots}
                currentUserProfile={currentUserProfile}
                currentUserId={session?.user?.id}
                isUserSignedIn={Boolean(session?.user?.id)}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onCreateOuting={handleCreateOuting}
                onRequestJoin={handleRequestJoin}
                onUpdateAttendeeStatus={handleUpdateAttendeeStatus}
                onOpenOutingChat={handleOpenOutingChat}
                onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
                showToast={showToast}
              />
            )}

            {activeTab === 'merchant' && (
              <MerchantHubTab
                businesses={businesses}
                activeBusinessId={activeBusinessId}
                userId={session?.user?.id}
                isUserSignedIn={Boolean(session?.user?.id)}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onSelectBusiness={(id) => {
                  setActiveBusinessId(id);
                  const b = businesses.find(item => item.id === id);
                  if (b) showToast(`Switched active business to "${b.name}"`);
                }}
                onCreateBusiness={handleCreateBusiness}
                onUpdateBusiness={handleUpdateBusiness}
                spots={spots}
                onAddOrUpdateSpot={handleAddOrUpdateSpot}
                onDeleteListing={handleDeleteListing}
                events={events}
                onAddEvent={handleAddEvent}
                offers={offers}
                onCreateOffer={handleCreateOffer}
                onUpdateOffer={handleUpdateOffer}
                onDeleteOffer={handleDeleteOffer}
                onClaimSpot={handleClaimSpot}
                onReleaseSpot={handleReleaseSpot}
                onViewSpotDetails={(spot) => setSelectedSpotModal(spot)}
                onViewEventDetails={(event) => setSelectedEventModal(event)}
                onOpenPublicProfile={(biz) => setSelectedPublicBusiness(biz)}
                showToast={showToast}
              />
            )}

            {activeTab === 'socials' && (
              <SocialsTab
                discoveryProfiles={discoveryProfiles}
                conversations={conversations}
                currentUserProfile={currentUserProfile}
                onOpenPlanDateModal={() => requireAuth('send messages', () => setIsPlanDateModalOpen(true))}
                onOpenCreateGroupModal={() => requireAuth('send messages', () => setIsCreateGroupOpen(true))}
                onAcceptRequest={(name, avatar) => requireAuth('send messages', () => handleAcceptRequest(name, avatar))}
                onViewUserProfile={(profile) => setViewingProfile(profile)}
                onOpenVerificationModal={() => setIsLivenessModalOpen(true)}
                targetChatId={targetChatId}
                onClearTargetChatId={() => setTargetChatId(null)}
                showToast={showToast}
              />
            )}

            {activeTab === 'vault' && (
              <VaultTab
                tickets={tickets}
                events={events}
                onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
                onExploreTrendingEvents={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onShowQrCode={(title) => setQrPassTitle(title)}
                showToast={showToast}
              />
            )}

            {activeTab === 'calendar' && (
              <LukuEventsTab
                events={events}
                initialDate={calendarTargetDate}
                highlightEventId={calendarTargetEventId}
                onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
                onExploreTrendingEvents={() => {
                  setActiveTab('spots');
                }}
                onBackToSpots={handleBackToSpots}
                savedItems={savedItems}
                onToggleSave={handleToggleSave}
                showToast={showToast}
              />
            )}
          </main>

          {/* Bottom Sticky Navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === 'merchant') {
                requireAuth('access the Merchant Hub', () => {
                  if (tab !== activeTab) {
                    window.history.pushState({ radaApp: true, tab }, '');
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                });
                return;
              }
              if (tab !== activeTab) {
                if (tab !== 'home') {
                  window.history.pushState({ radaApp: true, tab }, '');
                }
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />

          {/* Modals & Overlays */}
          {isBusinessHubOpen && (
            <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] overflow-y-auto">
              <MerchantHubTab
                businesses={businesses}
                activeBusinessId={activeBusinessId}
                userId={session?.user?.id}
                isUserSignedIn={Boolean(session?.user?.id)}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onSelectBusiness={(id) => setActiveBusinessId(id)}
                onCreateBusiness={handleCreateBusiness}
                onUpdateBusiness={handleUpdateBusiness}
                spots={spots}
                onAddOrUpdateSpot={handleAddOrUpdateSpot}
                onDeleteListing={handleDeleteListing}
                events={events}
                onAddEvent={handleAddEvent}
                offers={offers}
                onCreateOffer={handleCreateOffer}
                onUpdateOffer={handleUpdateOffer}
                onDeleteOffer={handleDeleteOffer}
                onClaimSpot={handleClaimSpot}
                onReleaseSpot={handleReleaseSpot}
                onViewSpotDetails={(spot) => setSelectedSpotModal(spot)}
                onViewEventDetails={(event) => setSelectedEventModal(event)}
                onOpenPublicProfile={(biz) => setSelectedPublicBusiness(biz)}
                onClose={() => setIsBusinessHubOpen(false)}
                showToast={showToast}
              />
            </div>
          )}

          <LocationMapModal
            spot={selectedLocationMapSpot}
            onClose={() => setSelectedLocationMapSpot(null)}
            showToast={showToast}
          />

          <Overlays
            activeOverlay={activeOverlay}
            onCloseOverlay={() => setActiveOverlay(null)}
            selectedLocation={currentLocation}
            activeCategory={viewAllCategory || undefined}
            activeCategories={[
              'Restaurants & Dining',
              'Cafés & Bakeries',
              'Clubs & Lounges',
              'Date Spots',
              'Nature Trails & Outdoors',
              'Creative Leisure',
              'Tech & Gaming',
              'Action & Sports',
              'Hotels & Luxury',
              'Vacation Escapes'
            ]}
            spots={spots}
            events={events}
            cinemaMovies={cinemaMovies}
            onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
            onBookCinema={handleBookCinema}
            selectedSpot={selectedSpotModal}
            onCloseSpotModal={handleCloseSpotModal}
            onPlanDateFromSpot={(spot) => requireAuth('send messages', () => handlePlanDateFromSpot(spot))}
            onPostReview={handlePostReview}
            onAddSpotImage={handleAddSpotImage}
            selectedEvent={selectedEventModal}
            onCloseEventModal={handleCloseEventModal}
            onToggleGoing={handleToggleGoing}
            goingEventIds={goingEventIds}
            onBuyEventTicket={handleBuyEventTicket}
            currentUserProfile={currentUserProfile}
            onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
            onOpenVerificationModal={() => setIsLivenessModalOpen(true)}
            qrPassTitle={qrPassTitle}
            onCloseQrModal={() => setQrPassTitle(null)}
            isPlanDateModalOpen={isPlanDateModalOpen}
            onClosePlanDateModal={() => {
              setIsPlanDateModalOpen(false);
              setDatePlanningSpot(null);
            }}
            onSelectSpotForDate={(spot) => setDatePlanningSpot(spot)}
            datePlanningSpot={datePlanningSpot}
            onConfirmDateInvite={handleConfirmDateInvite}
            isCreateGroupOpen={isCreateGroupOpen}
            onCloseCreateGroup={() => setIsCreateGroupOpen(false)}
            discoveryProfiles={discoveryProfiles}
            onCreateGroup={handleCreateGroup}
            viewAllTitle={viewAllTitle}
            viewAllCategory={viewAllCategory}
            onCloseViewAll={() => {
              setViewAllTitle(null);
              setViewAllCategory(null);
            }}
            isGpsBroadcasting={isGpsBroadcasting}
            onToggleGps={() => setIsGpsBroadcasting(!isGpsBroadcasting)}
            emergencyContacts={emergencyContacts}
            onAddEmergencyContact={(name, phone) => {
              requireAuth('add emergency contacts', () => {
                setEmergencyContacts(prev => [...prev, { id: `ec-${Date.now()}`, name, phone }]);
                showToast(`Emergency contact "${name}" saved!`);
              });
            }}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            showToast={showToast}
            onOpenSaved={() => requireAuth('view saved collections', () => setIsSavedModalOpen(true))}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            savedCount={savedItems.length}
            savedItems={savedItems}
            onToggleSave={handleToggleSave}
            onNavigateToCalendar={handleNavigateToCalendar}
          />

          <UserProfileModal
            user={viewingProfile}
            isMutualMatch={conversations.some(c => viewingProfile && c.name.toLowerCase().includes(viewingProfile.name.split(',')[0].toLowerCase()))}
            onClose={() => setViewingProfile(null)}
            onSendMatchRequest={(u) => {
              requireAuth('send messages', () => {
                showToast(`Hangout & Match request sent to ${u.name}!`);
                setViewingProfile(null);
              });
            }}
            onSendMessage={(u) => {
              requireAuth('send messages', () => {
                showToast(`Direct message opened with ${u.name}!`);
                setActiveTab('socials');
                setViewingProfile(null);
              });
            }}
            showToast={showToast}
            onOpenSavedItems={() => requireAuth('view saved collections', () => setIsSavedModalOpen(true))}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          />

          <PublicBusinessProfileModal
            business={selectedPublicBusiness}
            onClose={() => setSelectedPublicBusiness(null)}
            offers={offers}
            spots={spots}
            events={events}
            onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onOpenEventDetails={(event) => setSelectedEventModal(event)}
            showToast={showToast}
          />

          <AccountSettingsModal
            isOpen={isAccountSettingsOpen}
            onClose={() => setIsAccountSettingsOpen(false)}
            session={session}
            currentUserProfile={currentUserProfile}
            showToast={showToast}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onProfileChange={handleOwnProfileChange}
          />

          <SavedPlacesModal
            isOpen={isSavedModalOpen}
            onClose={() => setIsSavedModalOpen(false)}
            savedItems={savedItems}
            savedFolders={savedFolders}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onAssignItemFolder={handleAssignItemFolder}
            spots={spots}
            events={events}
            offers={offers}
            onToggleSave={handleToggleSave}
            onOpenSpot={(spot) => setSelectedSpotModal(spot)}
            onOpenEvent={(evt) => setSelectedEventModal(evt)}
            showToast={showToast}
          />

          <LivenessVerificationModal
            isOpen={isLivenessModalOpen}
            onClose={() => setIsLivenessModalOpen(false)}
            currentUserProfile={currentUserProfile}
            userId={session?.user?.id}
            onVerificationSuccess={handleVerificationSuccess}
            showToast={showToast}
          />

          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => { if (session || isGuestMode) setIsAuthModalOpen(false); }}
              onSuccess={() => { setIsAuthModalOpen(false); setIsGuestMode(false); setAuthModalMessage(''); }}
              onContinueAsGuest={() => { setIsGuestMode(true); setIsAuthModalOpen(false); setAuthModalMessage(''); }}
              customMessage={authModalMessage}
            />
          )}
          {isAdminOpen && userRole === 'admin' && (
<AdminDashboard
  businesses={businesses}
  onClose={() => setIsAdminOpen(false)}
  onRefresh={() => syncRef.current?.()}
  showToast={showToast}
  onUpdateBusiness={(businessId, updates) => {
    const business = businesses.find(b => b.id === businessId);

    if (!business) return;

    // update on screen right away
    setBusinesses(prev => prev.map(b => b.id === businessId ? ({ ...b, ...updates } as BusinessAccount) : b));

    // save online: only the verification fields are changed
    if (currentUserId && !initialBusinesses.some(b => b.id === businessId)) {
      cloudWrite(() => cloud.reviewBusiness(businessId, updates as Partial<BusinessAccount>));
    }
  }}
/>
)}
        </>
      )}
        </div>
      </BusinessesProvider>
    </ToastProvider>
  );
}
 
                      
          
