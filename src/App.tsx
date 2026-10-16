/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
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
import { LukuTab } from './components/LukuTab.tsx';
import { SocialsTab } from './components/SocialsTab.tsx';
import { VaultTab } from './components/VaultTab.tsx';
import { Overlays } from './components/Overlays.tsx';
import { LocationMapModal } from './components/LocationMapModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { AccountSettingsModal } from './components/AccountSettingsModal.tsx';
import { SavedPlacesModal } from './components/SavedPlacesModal.tsx';

import {
  initialBusinesses,
  initialOffers,
  initialSpots,
  initialEvents,
  initialThriftItems,
  cinemaMovies,
  initialStatuses,
  discoveryProfiles,
  initialConversations,
  initialTickets,
  initialContacts
} from './data/initialData.ts';

import {
  BusinessAccount,
  BusinessOffer,
  SpotItem,
  EventItem,
  ThriftItem,
  CinemaMovie,
  StatusPost,
  StatusReply,
  ChatConversation,
  VaultTicket,
  EmergencyContact,
  Review,
  UserProfile,
  SavedItem
} from './types.ts';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Wayne Waweru',
  handle: '@lowk3yFX',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop',
  bio: 'Exploring Nairobi spots, amapiano vibes, and fashion setups. Hit me up for hangouts! ✨',
  loc: 'Westlands, Nairobi',
  relationshipStatus: 'single',
  vibes: ['Nightlife', 'Cocktails', 'Amapiano', 'Art', 'Thrifting']
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'user' | 'merchant' | 'admin'>('user');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  // Safe Supabase Session Listener
  useEffect(() => {
    if (supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      }).catch(() => {
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);
  // Load logged-in user's role
  useEffect(() => {
    if (!session?.user?.id) {
      setUserRole('user');
      return;
    }

    const loadUserRole = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Failed to load user role:', error);
        setUserRole('user');
        return;
      }

      setUserRole(
        data?.role === 'admin'
          ? 'admin'
          : data?.role === 'merchant'
            ? 'merchant'
            : 'user'
      );
    };

    loadUserRole();
  }, [session]);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        alert("Error deleting account: " + error.message);
      } else {
        await supabase.auth.signOut();
      }
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
  const [activeTab, setActiveTab] = useState('home');

  // Business Hub State
  const [businesses, setBusinesses] = useState<BusinessAccount[]>(() => {
  const saved = localStorage.getItem('rada_businesses');

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load businesses:', e);
    }
  }

  return initialBusinesses;
});
  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    return businesses[0]?.id || 'biz-1';
  });
  const [isBusinessHubOpen, setIsBusinessHubOpen] = useState(false);

  // Core Data State (Ensures at least 10 items for every category)
  const [spots, setSpots] = useState<SpotItem[]>(() => {
    const saved = localStorage.getItem('rada_spots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
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

  const [thriftItems, setThriftItems] = useState<ThriftItem[]>(() => {
    const saved = localStorage.getItem('rada_thrift');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
      } catch (e) {}
    }
    return initialThriftItems;
  });

  const [statuses, setStatuses] = useState<StatusPost[]>(() => {
    const saved = localStorage.getItem('rada_statuses');
    return saved ? JSON.parse(saved) : initialStatuses;
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) return parsed;
      } catch (e) {}
    }
    return initialOffers;
  });

  // Public Business Profile View Modal State
  const [selectedPublicBusiness, setSelectedPublicBusiness] = useState<BusinessAccount | null>(null);

  // Overlays state
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [isWagwanOpen, setIsWagwanOpen] = useState(false);
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

  // Dynamic Header Location: Automatically detects and defaults to user's physical location (locked/fixed)
  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    return localStorage.getItem('rada_current_location') || 'Westlands, Nairobi';
  });
  const [isGpsActive, setIsGpsActive] = useState<boolean>(true);

  // Auto-detect physical location on startup
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let detected = 'Westlands, Nairobi';
          // Approximate Nairobi / Kiambu geographic clustering
          if (latitude > -1.22 && latitude < -1.0) {
            detected = 'Kiambu / Thika';
          } else if (latitude >= -1.28 && latitude <= -1.24 && longitude >= 36.78 && longitude <= 36.83) {
            detected = 'Westlands, Nairobi';
          } else if (latitude >= -1.31 && latitude <= -1.28 && longitude >= 36.76 && longitude <= 36.81) {
            detected = 'Kilimani, Nairobi';
          } else if (latitude >= -1.30 && latitude <= -1.27 && longitude >= 36.81 && longitude <= 36.84) {
            detected = 'Nairobi CBD';
          } else if (latitude >= -1.36 && latitude <= -1.31) {
            detected = 'Karen, Nairobi';
          } else {
            detected = 'Westlands, Nairobi';
          }
          setCurrentLocation(detected);
          localStorage.setItem('rada_current_location', detected);
          setIsGpsActive(true);
        },
        () => {
          // Fallback to Westlands, Nairobi
          setCurrentLocation('Westlands, Nairobi');
          setIsGpsActive(true);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
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

  // Current logged in user profile with Single / Not Single status
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('rada_current_user');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  // Profile View Modal state (to view anyone's profile and bio)
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Sleek minimal single-line toast notification (one at a time, quick fade, no green glow or stacking)
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(text);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 2200);
  };

  // Saved Moves / Bookmarked Listings State
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('rada_saved_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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

  const handleToggleSave = (item: any, kind: 'spot' | 'event' | 'thrift' | 'offer') => {
    setSavedItems(prev => {
      const exists = prev.some(s => String(s.id) === String(item.id) && s.kind === kind);
      if (exists) {
        showToast('Removed from saved collection.');
        return prev.filter(s => !(String(s.id) === String(item.id) && s.kind === kind));
      } else {
        showToast(`Saved "${item.title || item.name}" to your collection!`);
        return [{ id: item.id, kind, savedAt: new Date().toISOString() }, ...prev];
      }
    });
  };

  // Modals state for Account Settings, Saved Items, and Auth
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  useEffect(() => {
    localStorage.setItem('rada_thrift', JSON.stringify(thriftItems));
  }, [thriftItems]);

  useEffect(() => {
    localStorage.setItem('rada_statuses', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('rada_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('rada_going_events', JSON.stringify(goingEventIds));
  }, [goingEventIds]);

  useEffect(() => {
    localStorage.setItem('rada_current_user', JSON.stringify(currentUserProfile));
  }, [currentUserProfile]);

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

  // Active business reference
  const currentBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];

  // ---------------------------------------------------------------
  // CLOUD SYNC (Supabase): businesses + listings are shared across devices
  // ---------------------------------------------------------------
  const currentUserId: string | undefined = session?.user?.id;
  const latestRef = useRef<any>(null);
  latestRef.current = { businesses, spots, events, thriftItems, offers };
  const mutationRef = useRef(0);   // bumps on every local change
  const pendingRef = useRef(0);    // cloud writes still in flight

  // Run a cloud write in the background. fn returns an error message or null.
  const syncRef = useRef<(() => void) | null>(null);

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
      if (!remoteBiz || !remoteListings) return; // offline or tables missing: keep local data
      const remoteReviews = (await cloud.fetchReviews()) || {};
      const remoteStatuses = await cloud.fetchStatuses();   // null = keep local
      const remoteGoing = await cloud.fetchGoing(uid);      // null = keep local

      const L = latestRef.current;
      const seedBizIds = new Set(initialBusinesses.map(b => b.id));
      const remoteBizIds = new Set(remoteBiz.map(b => b.id));

      // Move businesses created earlier on THIS device by the signed-in user online (always as pending)
      const bizToMigrate: BusinessAccount[] = uid
        ? L.businesses.filter((b: BusinessAccount) => b.ownerId === uid && !seedBizIds.has(b.id) && !remoteBizIds.has(b.id))
        : [];
      for (const b of bizToMigrate) {
        await cloud.insertBusiness({ ...b, verified: false, verificationStatus: 'pending' }, uid as string);
      }
      const migratedBiz = bizToMigrate.map(b => ({ ...b, verified: false, verificationStatus: 'pending' as const }));
      const seedBiz = initialBusinesses
        .filter(b => !remoteBizIds.has(b.id))
        .map(b => L.businesses.find((x: BusinessAccount) => x.id === b.id) || b);
      const mergedBiz: BusinessAccount[] = [...remoteBiz, ...migratedBiz, ...seedBiz];
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

      const mergedSpotsRaw = await mergeKind('spot', initialSpots, L.spots, remoteListings.spot);

      // Ratings, review counts, reviews and review photos come from the reviews table
      const remoteSpotIds = new Set(remoteListings.spot.map((x: any) => String(x.id)));
      const mergedSpots = mergedSpotsRaw.map((sp: any) => {
        const seed = initialSpots.find(x => String(x.id) === String(sp.id));
        const base: any = remoteSpotIds.has(String(sp.id)) ? sp : (seed || sp);
        const mine: any[] = remoteReviews[String(sp.id)] || [];
        const seedReviews: any[] = seed?.reviews || [];
        const allReviews = [...mine, ...seedReviews];

        const baseImages: string[] = base.images && base.images.length > 0 ? base.images : [base.img];
        const reviewImages: string[] = mine.flatMap((r: any) => r.images || []);
        const images = Array.from(new Set([...baseImages, ...reviewImages]));

        let rating: string;
        let reviewCount: number;
        if (seed) {
          reviewCount = (seed.reviewCount ?? seedReviews.length) + mine.length;
          rating = mine.length > 0
            ? (allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length).toFixed(1)
            : seed.rating;
        } else {
          reviewCount = mine.length;
          rating = mine.length > 0
            ? (mine.reduce((sum: number, r: any) => sum + r.rating, 0) / mine.length).toFixed(1)
            : 'New';
        }

        return { ...base, reviews: allReviews, reviewCount, rating, images };
      });
      const mergedEventsRaw = await mergeKind('event', initialEvents, L.events, remoteListings.event);

      // "I'm going" counts come from the rada_going table
      const remoteEventIds = new Set(remoteListings.event.map((x: any) => String(x.id)));
      const mergedEvents = remoteGoing
        ? mergedEventsRaw.map((ev: any) => {
            const seed = initialEvents.find(x => String(x.id) === String(ev.id));
            const base: any = remoteEventIds.has(String(ev.id)) ? ev : (seed || ev);
            const baseCount = seed ? seed.goingCount : 0;
            return { ...base, goingCount: baseCount + (remoteGoing.counts[String(ev.id)] || 0) };
          })
        : mergedEventsRaw;
      const mergedThrift = await mergeKind('thrift', initialThriftItems, L.thriftItems, remoteListings.thrift);
      const mergedOffers = await mergeKind('offer', initialOffers, L.offers, remoteListings.offer);

      // If the user changed something while we were syncing, don't overwrite it
      if (mutationRef.current !== startVersion || pendingRef.current > 0) return;

      setBusinesses(mergedBiz);
      setSpots(mergedSpots);
      setEvents(mergedEvents);
      setThriftItems(mergedThrift);
      setOffers(mergedOffers);
      if (remoteStatuses) {
        setStatuses([
          ...remoteStatuses,
          ...initialStatuses.filter(sd => !remoteStatuses.some((r: any) => r.id === sd.id)),
        ]);
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
    if (!uid) return;
    let cancelled = false;

    // A different account signed in on this phone: clear the previous person's personal data
    const lastUid = localStorage.getItem('rada_last_uid');
    if (lastUid && lastUid !== uid) {
      setTickets(initialTickets);
      setEmergencyContacts(initialContacts);
      setConversations(initialConversations);
      setGoingEventIds([]);
      setCurrentUserProfile(DEFAULT_PROFILE);
    }
    localStorage.setItem('rada_last_uid', uid);

    (async () => {
      const remote = await cloud.fetchUserData(uid);
      if (cancelled || !remote) return; // offline or table missing: stay local
      if (remote.tickets) setTickets(remote.tickets);
      if (remote.contacts) setEmergencyContacts(remote.contacts);
      if (remote.profile) setCurrentUserProfile(remote.profile);
      userDataUidRef.current = uid;
      setUserDataReady(true);
    })().catch(e => console.warn('User data load failed:', e));

    return () => { cancelled = true; };
  }, [authLoading, session?.user?.id]);

  useEffect(() => {
    const uid: string | undefined = session?.user?.id;
    if (!uid || !userDataReady || userDataUidRef.current !== uid) return;

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
  const handleCreateBusiness = (newBiz: BusinessAccount) => {
    const biz: BusinessAccount = {
      ...newBiz,
      ownerId: newBiz.ownerId || currentUserId,
      verified: false,
      verificationStatus: 'pending',
    };
    setBusinesses(prev => [biz, ...prev]);
    setActiveBusinessId(biz.id);
    if (currentUserId) {
      cloudWrite(() => cloud.insertBusiness(biz, currentUserId));
    } else {
      showToast('Sign in to save your business online.');
    }
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
    if (currentUserId) cloudWrite(() => cloud.upsertListing('spot', spot, spot.businessId, currentUserId));
    setSpots(prev => {
      const idx = prev.findIndex(s => s.id === spot.id || s.title.toLowerCase() === spot.title.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = spot;
        return updated;
      }
      return [spot, ...prev];
    });
  };

  const handleAddEvent = (event: EventItem) => {
    // add new, or replace if this event already exists (editing)
    setEvents(prev => prev.some(e => e.id === event.id)
      ? prev.map(e => e.id === event.id ? event : e)
      : [event, ...prev]);
    if (currentUserId) cloudWrite(() => cloud.upsertListing('event', event, event.businessId, currentUserId));
  };

  const handleAddThriftItem = (item: ThriftItem) => {
    setThriftItems(prev => prev.some(t => t.id === item.id)
      ? prev.map(t => t.id === item.id ? item : t)
      : [item, ...prev]);
    if (currentUserId) cloudWrite(() => cloud.upsertListing('thrift', item, item.businessId, currentUserId));
  };

  const handleDeleteListing = (type: 'spot' | 'event' | 'thrift', id: number) => {
    if (currentUserId) cloudWrite(() => cloud.deleteListing(type, id));
    if (type === 'spot') {
      setSpots(prev => prev.filter(s => s.id !== id));
      showToast('Spot listing removed.');
    } else if (type === 'event') {
      setEvents(prev => prev.filter(e => e.id !== id));
      showToast('Event listing removed.');
    } else {
      setThriftItems(prev => prev.filter(t => t.id !== id));
      showToast('Thrift item removed.');
    }
  };

  // Post Review with Images Handler
  const handlePostReview = (spotId: number, review: Review) => {
    if (currentUserId) cloudWrite(() => cloud.insertReview(spotId, review, currentUserId));
    setSpots(prev => prev.map(s => {
      if (s.id === spotId) {
        const existingReviews = s.reviews || [];
        const updatedReviews = [review, ...existingReviews];
        const sumRatings = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = (sumRatings / updatedReviews.length).toFixed(1);

        // Append review images into spot images gallery
        const existingImages = (s.images && s.images.length > 0) ? s.images : [s.img];
        const newImages = review.images ? [...existingImages, ...review.images] : existingImages;

        const updatedSpot = {
          ...s,
          rating: avgRating,
          reviewCount: (s.reviewCount || 0) + 1,
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

    showToast(`Review posted for ★ ${review.rating} rating!`);
  };

  // Add Spot Image Handler
  const handleAddSpotImage = (spotId: number, imgUrl: string) => {
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
  const handlePostStatus = (text: string, mediaUrl?: string, locationName?: string) => {
    const newPost: StatusPost = {
      id: `s-${Date.now()}`,
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
    setStatuses(prev => [newPost, ...prev]);
    if (currentUserId) cloudWrite(() => cloud.insertStatus(newPost, currentUserId));
    showToast('Status posted live!');
  };

  // Reply to someone's status
  const handleReplyStatus = (statusId: string, text: string) => {
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

  // Update current user profile
  const handleUpdateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUserProfile(prev => ({ ...prev, ...updates }));
    showToast('Profile updated!');
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
      setIsBusinessHubOpen(true);
    } else if (overlayId === 'savedOverlay') {
      setIsSavedModalOpen(true);
    } else if (overlayId === 'youOverlay' || overlayId === 'accountSettings') {
      setIsAccountSettingsOpen(true);
    } else {
      setActiveOverlay(overlayId);
    }
  };
  return (
    <BusinessesProvider businesses={businesses}>
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#121113] dark:text-slate-100 flex flex-col transition-colors duration-200 antialiased overflow-x-hidden">
      {/* Primary Application Splash Screen */}
      {showSplash && <SplashScreen durationMs={2000} onDismiss={() => setShowSplash(false)} />}

      {/* Sleek Minimal Single-Line Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 backdrop-blur-md text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700/50 dark:border-slate-200/50 flex items-center gap-2 whitespace-nowrap">
            <span>{activeToast}</span>
          </div>
        </div>
      )}

      {authLoading ? (
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center select-none"
          style={{ background: 'linear-gradient(135deg, #E05328 0%, #D94E28 100%)' }}
        >
          <h1 className="text-white text-3xl font-black tracking-widest uppercase mb-2">RADA</h1>
          <p className="text-white/95 text-sm font-semibold tracking-wider lowercase animate-pulse">leo rada ni gani</p>
        </div>
      ) : !session ? (
        <AuthModal 
          isOpen={true} 
          onSuccess={() => setAuthLoading(false)} 
          onClose={() => setSession({ user: { id: 'guest-session', email: 'guest@rada.ke', created_at: new Date().toISOString(), app_metadata: { provider: 'guest' } } })} 
        />
      ) : (
        <>


          {/* Top Header */}
          <Header
            onOpenOverlay={handleOpenOverlay}
            onOpenWagwanAI={() => setIsWagwanOpen(true)}
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
            onOpenAdmin={() => setIsAdminOpen(true)}
            userRole={userRole}
            onLogout={async () => {
              await supabase.auth.signOut();
            }}
            onOpenSaved={() => setIsSavedModalOpen(true)}
            savedCount={savedItems.length}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
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
                onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
                onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
                onBookCinema={handleBookCinema}
                onPostStatus={handlePostStatus}
                onReplyStatus={handleReplyStatus}
                onViewUserProfile={(profile) => setViewingProfile(profile)}
                onOpenDedicatedViewAll={(title, cat) => {
                  setViewAllTitle(title);
                  setViewAllCategory(cat);
                }}
                onOpenCreateEvent={() => setIsBusinessHubOpen(true)}
                onOpenBusinessProfile={handleOpenBusinessProfile}
                showToast={showToast}
              />
            )}

            {activeTab === 'spots' && (
              <SpotsTab
                spots={spots}
                onOpenSpotFullView={(spot) => setSelectedSpotModal(spot)}
                onViewLocation={(spot) => setSelectedLocationMapSpot(spot)}
                onOpenDedicatedViewAll={(title, cat) => {
                  setViewAllTitle(title);
                  setViewAllCategory(cat);
                }}
                onOpenCreateSpot={() => setIsBusinessHubOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'luku' && (
              <LukuTab
                thriftItems={thriftItems}
                businesses={businesses}
                onOpenStore={(storeName) => {
                  const biz = businesses.find(b => b.name.toLowerCase() === storeName.toLowerCase());
                  if (biz) setSelectedPublicBusiness(biz);
                  else showToast(`Browsing ${storeName} official catalog!`);
                }}
                onOpenCreateFit={() => setIsBusinessHubOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'merchant' && (
              <MerchantHubTab
                businesses={businesses}
                activeBusinessId={activeBusinessId}
                userId={session?.user?.id}
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
                thriftItems={thriftItems}
                onAddThriftItem={handleAddThriftItem}
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
                onOpenPlanDateModal={() => setIsPlanDateModalOpen(true)}
                onOpenCreateGroupModal={() => setIsCreateGroupOpen(true)}
                onAcceptRequest={handleAcceptRequest}
                onViewUserProfile={(profile) => setViewingProfile(profile)}
                showToast={showToast}
              />
            )}

            {activeTab === 'vault' && (
              <VaultTab
                tickets={tickets}
                onShowQrCode={(title) => setQrPassTitle(title)}
                showToast={showToast}
              />
            )}
          </main>

          {/* Bottom Sticky Navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Modals & Overlays */}
          {isBusinessHubOpen && (
            <div className="fixed inset-0 z-50 bg-[#FBFBF9] dark:bg-[#121113] overflow-y-auto">
              <MerchantHubTab
                businesses={businesses}
                activeBusinessId={activeBusinessId}
                userId={session?.user?.id}
                onSelectBusiness={(id) => setActiveBusinessId(id)}
                onCreateBusiness={handleCreateBusiness}
                onUpdateBusiness={handleUpdateBusiness}
                spots={spots}
                onAddOrUpdateSpot={handleAddOrUpdateSpot}
                onDeleteListing={handleDeleteListing}
                events={events}
                onAddEvent={handleAddEvent}
                thriftItems={thriftItems}
                onAddThriftItem={handleAddThriftItem}
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
            isWagwanOpen={isWagwanOpen}
            onCloseWagwan={() => setIsWagwanOpen(false)}
            spots={spots}
            events={events}
            cinemaMovies={cinemaMovies}
            thriftItems={thriftItems}
            onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
            onOpenEventDetails={(evt) => setSelectedEventModal(evt)}
            onBookCinema={handleBookCinema}
            selectedSpot={selectedSpotModal}
            onCloseSpotModal={() => setSelectedSpotModal(null)}
            onPlanDateFromSpot={handlePlanDateFromSpot}
            onPostReview={handlePostReview}
            onAddSpotImage={handleAddSpotImage}
            selectedEvent={selectedEventModal}
            onCloseEventModal={() => setSelectedEventModal(null)}
            onToggleGoing={handleToggleGoing}
            goingEventIds={goingEventIds}
            onBuyEventTicket={handleBuyEventTicket}
            currentUserProfile={currentUserProfile}
            onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
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
              setEmergencyContacts(prev => [...prev, { id: `ec-${Date.now()}`, name, phone }]);
              showToast(`Emergency contact "${name}" saved!`);
            }}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            showToast={showToast}
            onOpenSaved={() => setIsSavedModalOpen(true)}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            savedCount={savedItems.length}
          />

          <UserProfileModal
            user={viewingProfile}
            isMutualMatch={conversations.some(c => viewingProfile && c.name.toLowerCase().includes(viewingProfile.name.split(',')[0].toLowerCase()))}
            onClose={() => setViewingProfile(null)}
            onSendMatchRequest={(u) => {
              showToast(`Hangout & Match request sent to ${u.name}!`);
              setViewingProfile(null);
            }}
            onSendMessage={(u) => {
              showToast(`Direct message opened with ${u.name}!`);
              setActiveTab('socials');
              setViewingProfile(null);
            }}
            showToast={showToast}
            onOpenSavedItems={() => setIsSavedModalOpen(true)}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          />

          <PublicBusinessProfileModal
            business={selectedPublicBusiness}
            onClose={() => setSelectedPublicBusiness(null)}
            offers={offers}
            spots={spots}
            events={events}
            thriftItems={thriftItems}
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
            onSignOut={async () => {
              await supabase.auth.signOut();
              setSession(null);
            }}
          />

          <SavedPlacesModal
            isOpen={isSavedModalOpen}
            onClose={() => setIsSavedModalOpen(false)}
            savedItems={savedItems}
            spots={spots}
            events={events}
            thriftItems={thriftItems}
            offers={offers}
            onToggleSave={handleToggleSave}
            onOpenSpot={(spot) => setSelectedSpotModal(spot)}
            onOpenEvent={(evt) => setSelectedEventModal(evt)}
            showToast={showToast}
          />

          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onSuccess={() => {
                setIsAuthModalOpen(false);
                showToast('Authenticated successfully!');
              }}
              onClose={() => setIsAuthModalOpen(false)}
            />
          )}
          {isAdminOpen && userRole === 'admin' && (
<AdminDashboard
  businesses={businesses}
  onClose={() => setIsAdminOpen(false)}
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
  );
}
 
                      
          
