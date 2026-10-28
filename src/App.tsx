/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import * as cloud from './lib/cloudSync';
import { fetchExternalEvents } from './lib/externalEvents';
import { BusinessesProvider } from './components/BusinessBadge.tsx';
import { Header } from './components/Header.tsx';
import { Navigation } from './components/Navigation.tsx';
import { HomeTab } from './components/HomeTab.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { ToastProvider, showToast as triggerToast, type ToastOptions } from './components/Toast.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { getTimeOfDayGreeting } from './utils/greetingUtils';
import {
  cleanStatuses,
  addStatusReplacingOwn,
  mergeRemoteStatuses,
  findOwnStatus,
  isOwnStatus
} from './utils/statusLifecycle';

import { fetchCinemaShowings, CINEMA_UPDATED_EVENT } from './lib/cinema.ts';
import { readJSON, writeJSON, writeJSONDebounced, purgeSeedData } from './lib/storage.ts';
import { useSocialsCloud } from './lib/useSocialsCloud.ts';
import { isDemoMode, isDemoId } from './lib/demoMode.ts';
import { buildDemoOutings } from './data/demoData.ts';
import { useUnclaimedSpots, mergeSpots, evictUnclaimedSpot } from './lib/spotsFeed.ts';
import { resolveNearestNeighborhood } from './lib/geo.ts';

// One-time removal of the old demo content cached on this device
purgeSeedData();

// ---- Resilient Code splitting: chunk loading with timeout, retry and one-shot reload ----
// A stalled chunk request (common on mobile data or right after a deploy) never rejects, so the
// spinner would sit forever. Every attempt now has a timeout, and a final failure triggers ONE reload.
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dynamically imported module timed out')), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });

const retryImport = <T,>(fn: () => Promise<T>, retries = 2, delay = 600): Promise<T> => {
  return withTimeout(fn(), 10000).catch((err) => {
    if (retries <= 1) throw err;
    return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
      retryImport(fn, retries - 1, delay * 1.5)
    );
  });
};

const reloadOnceForChunk = () => {
  try {
    const last = Number(sessionStorage.getItem('rada_chunk_reload') || 0);
    if (Date.now() - last > 30000) {
      sessionStorage.setItem('rada_chunk_reload', String(Date.now()));
      window.location.reload();
    }
  } catch (_) {}
};

const lazyNamed = (loader: () => Promise<any>, name: string): React.ComponentType<any> =>
  lazy(() =>
    retryImport(loader)
      .then((m) => ({ default: m[name] }))
      .catch((err) => {
        reloadOnceForChunk();
        throw err;
      })
  );

// Warm the main tab chunks right after first paint so tapping a tab is instant.
const TAB_PREFETCH: Array<() => Promise<any>> = [
  () => import('./components/SpotsTab.tsx'),
  () => import('./components/OutingsTab.tsx'),
  () => import('./components/SocialsTab.tsx'),
  () => import('./components/VaultTab.tsx'),
];
if (typeof window !== 'undefined') {
  const warmTabs = () => {
    TAB_PREFETCH.forEach((load, i) => setTimeout(() => load().catch(() => {}), i * 400));
  };
  const kick = () => {
    const ric = (window as any).requestIdleCallback;
    if (ric) ric(warmTabs, { timeout: 4000 });
    else setTimeout(warmTabs, 1500);
  };
  if (document.readyState === 'complete') kick();
  else window.addEventListener('load', kick, { once: true });
}

import { AuthModal } from './components/AuthModal.tsx';
const AdminDashboard = lazyNamed(() => import('./components/AdminDashboardModal.tsx'), 'AdminDashboard');
const MerchantHubTab = lazyNamed(() => import('./components/MerchantHubTab.tsx'), 'MerchantHubTab');
const PublicBusinessProfileModal = lazyNamed(() => import('./components/PublicBusinessProfileModal.tsx'), 'PublicBusinessProfileModal');
const SpotsTab = lazyNamed(() => import('./components/SpotsTab.tsx'), 'SpotsTab');
const OutingsTab = lazyNamed(() => import('./components/OutingsTab.tsx'), 'OutingsTab');
const SocialsTab = lazyNamed(() => import('./components/SocialsTab.tsx'), 'SocialsTab');
const VaultTab = lazyNamed(() => import('./components/VaultTab.tsx'), 'VaultTab');
const LukuEventsTab = lazyNamed(() => import('./components/LukuEventsTab.tsx'), 'LukuEventsTab');
const Overlays = lazyNamed(() => import('./components/Overlays.tsx'), 'Overlays');
const LocationMapModal = lazyNamed(() => import('./components/LocationMapModal.tsx'), 'LocationMapModal');
const UserProfileModal = lazyNamed(() => import('./components/UserProfileModal.tsx'), 'UserProfileModal');
const AccountSettingsModal = lazyNamed(() => import('./components/AccountSettingsModal.tsx'), 'AccountSettingsModal');
const SavedPlacesModal = lazyNamed(() => import('./components/SavedPlacesModal.tsx'), 'SavedPlacesModal');
const LivenessVerificationModal = lazyNamed(() => import('./components/LivenessVerificationModal.tsx'), 'LivenessVerificationModal');
const SuggestSpotModal = lazyNamed(() => import('./components/SuggestSpotModal.tsx'), 'SuggestSpotModal');

const TabFallback = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24" role="status" aria-label="Loading">
      <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-[#E0533C] animate-spin" />
      {slow && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs font-bold text-[#B83D26] dark:text-[#E0533C] underline"
        >
          Taking long? Tap to reload
        </button>
      )}
    </div>
  );
};

import {
  initialBusinesses,
  initialOffers,
  initialSpots,
  LEGACY_MOCK_SPOT_TITLES,
  initialEvents,
  initialStatuses,
  discoveryProfiles,
  initialConversations,
  initialTickets,
  initialContacts,
  LEGACY_SAMPLE_TICKET_IDS,
  LEGACY_SAMPLE_CONTACT_IDS,
  initialOutings,
  initialSpotClaims
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
  OutingAttendee,
  SpotClaimRequest,
  isPlatformAdmin
} from './types.ts';


import {
  generateNewUserName,
  sanitizeDisplayName,
  sanitizeUsername,
  sanitizeAvatarUrl,
  isLegacyWayneName
} from './utils/userUtils.ts';

const defaultGuestName = generateNewUserName();
const GUEST_PROFILE: UserProfile = {
  name: defaultGuestName,
  username: defaultGuestName,
  handle: `@${defaultGuestName}`,
  avatar: '',
  bio: 'Discovering local spots near you on RADA. Log in or create an account to customize your profile & connect with spots!',
  loc: 'Westlands',
  relationshipStatus: 'single',
  relationship_status: 'single',
  isLivenessVerified: false,
  is_liveness_verified: false,
  vibes: ['Nightlife', 'Cocktails', 'Amapiano', 'Art', 'Thrifting']
};

const defaultExplorerName = generateNewUserName();
const DEFAULT_PROFILE: UserProfile = {
  name: defaultExplorerName,
  username: defaultExplorerName,
  handle: `@${defaultExplorerName}`,
  avatar: '',
  bio: 'Exploring Nairobi spots, events, and fashion setups. Hit me up for hangouts! ✨',
  loc: 'Nairobi',
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

// Purges the old hardcoded demo spots (ids 1-20 with seed titles) that may be cached locally or in old cloud rows.
const MOCK_SPOT_TITLE_SET = new Set(LEGACY_MOCK_SPOT_TITLES.map(t => t.trim().toLowerCase()));
const isLegacyMockSpot = (s: any) =>
  /^\d{1,2}$/.test(String(s?.id ?? '')) && Number(s.id) <= 20 && MOCK_SPOT_TITLE_SET.has(String(s?.title || '').trim().toLowerCase());
const stripMockSpots = <T,>(list: T[]): T[] => list.filter(s => !isLegacyMockSpot(s));

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
  const [isSuggestSpotModalOpen, setIsSuggestSpotModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const syncRef = useRef<(() => void) | null>(null);

  // App-level suspension enforcement helper
  const enforceUserSuspension = async (reason?: string) => {
    const finalReason = reason || 'Violation of RADA community terms and platform safety guidelines';
    setSuspensionReason(finalReason);
    try {
      if (isSupabaseConfigured && supabase?.auth) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (err) {
      console.warn('Sign out during suspension error:', err);
    }
    setSession(null);
    setUserRole('user');
    setIsGuestMode(false);
    setCurrentUserProfile(GUEST_PROFILE);
    localStorage.removeItem('rada_current_user');
    localStorage.removeItem('rada_last_uid');
    setIsAuthModalOpen(false);
    setIsBusinessHubOpen(false);
    setIsAdminOpen(false);
    triggerToast(`Account Suspended: ${finalReason}`, { type: 'error' });
  };

  const checkSuspensionState = async (uid: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !uid) return false;
    try {
      const state = await cloud.fetchSuspensionState(uid);
      if (state.suspended) {
        await enforceUserSuspension(state.reason);
        return true;
      }
    } catch (e) {
      console.warn('fetchSuspensionState error:', e);
    }
    return false;
  };

  // Safe Supabase Session Listener & Onboarding Gate
  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 600);

    if (isSupabaseConfigured && supabase && supabase.auth) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (mounted) {
          if (session?.user?.id) {
            const isSuspended = await checkSuspensionState(session.user.id);
            if (isSuspended) {
              setAuthLoading(false);
              return;
            }
          }
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

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          if (mounted) {
            if (session?.user?.id) {
              const isSuspended = await checkSuspensionState(session.user.id).catch(() => false);
              if (isSuspended) return;
            }
            setSession(session);
            if (session) {
              setIsGuestMode(false);
              setIsAuthModalOpen(false);
            }
          }
        } catch (err) {
          console.warn('[RADA Auth] onAuthStateChange caught exception:', err);
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

  // Load logged-in user's role and verify profile active state
  useEffect(() => {
    if (!session?.user?.id || !isSupabaseConfigured) {
      setUserRole('user');
      return;
    }

    const loadUserRole = async () => {
      const userMetaRole = session.user.user_metadata?.role;
      const emailLower = (session.user.email || '').toLowerCase().trim();
      const isAdminEmail = emailLower.includes('admin') || emailLower === 'lowkeywayne21@gmail.com';

      const { data, error } = await supabase
        .from('profiles')
        .select('role, relationship_status, is_liveness_verified, avatar_url, is_suspended, suspended_reason')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data?.is_suspended) {
        await enforceUserSuspension(data.suspended_reason);
        return;
      }

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
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    // Clean all session & authentication state
    setSession(null);
    setUserRole('user');
    setIsGuestMode(true);
    setAuthModalMessage('');
    setIsAuthModalOpen(false);
    setCurrentUserProfile(GUEST_PROFILE);
    localStorage.removeItem('rada_current_user');
    localStorage.removeItem('rada_last_uid');

    // Dismiss any open user/admin/merchant modals
    setIsAccountSettingsOpen(false);
    setIsBusinessHubOpen(false);
    setIsAdminOpen(false);
    setViewingProfile(null);
    setSelectedPublicBusiness(null);
    setActiveOverlay(null);
    setSelectedSpotModal(null);
    setSelectedEventModal(null);
    setIsPlanDateModalOpen(false);
    setIsCreateGroupOpen(false);
    setIsSavedModalOpen(false);
    setIsLivenessModalOpen(false);
    setIsSuggestSpotModalOpen(false);

    // If on an authenticated-only tab (like merchant), revert cleanly to home
    if (activeTab === 'merchant') {
      setActiveTab('home');
    }

    showToast('Signed out successfully. Browsing as Guest.', { type: 'info' });
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
        showToast("Error deleting account: " + error.message, { type: 'error' });
      } else {
        await supabase.auth.signOut();
        setSession(null);
      }
    } else {
      setSession(null);
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
  };

  // Live cinema showings (fetched, cached for 6h; empty when unavailable)
  const [cinemaMovies, setCinemaMovies] = useState<CinemaMovie[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = () => fetchCinemaShowings().then(list => {
      if (!cancelled) setCinemaMovies(list);
    });
    load();
    window.addEventListener(CINEMA_UPDATED_EVENT, load);
    return () => { cancelled = true; window.removeEventListener(CINEMA_UPDATED_EVENT, load); };
  }, []);

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
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p: any) => String(p.id)));
          const missing = initialSpots.filter(init => !existingIds.has(String(init.id)));
          // Clean legacy mock reviews / fake counts
          return stripMockSpots([...parsed, ...missing]).map((sp: any) => {
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

  // Events created by RADA merchants (rada_listings). Live ticketing events live in `externalEvents`.
  const [events, setEvents] = useState<EventItem[]>(() => {
    try { localStorage.removeItem('rada_events'); } catch (e) {} // old cache that still held the mock events
    const saved = localStorage.getItem('rada_events_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((e: any) => e && !e.source);
      } catch (e) {}
    }
    return initialEvents;
  });

  // Live events from public.external_events (Mookh, Ticketsasa, Tikiti) – never cached locally
  const [externalEvents, setExternalEvents] = useState<EventItem[]>([]);
  const externalLoadedAtRef = useRef(0);
  const loadExternalEvents = useCallback(async (force = false) => {
    if (!force && Date.now() - externalLoadedAtRef.current < 5 * 60 * 1000) return;
    const rows = await fetchExternalEvents();
    if (rows) {
      externalLoadedAtRef.current = Date.now();
      setExternalEvents(rows);
    }
  }, []);
  useEffect(() => {
    loadExternalEvents(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        timer = setTimeout(() => {
          loadExternalEvents().catch((err) => console.warn('External events resume error:', err));
        }, 400);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadExternalEvents]);

  // Everything the UI shows: merchant events first, then live ticketing events (already sorted by start time)
  const allEvents = useMemo(
    () => [...events.filter(e => !e.source), ...externalEvents],
    [events, externalEvents]
  );

  // Load real unclaimed & scraped spots from database/cache and merge with merchant spots
  const unclaimedFeed = useUnclaimedSpots();
  const allMergedSpots = useMemo(
    () => mergeSpots(spots, unclaimedFeed.spots),
    [spots, unclaimedFeed.spots]
  );

  const [statuses, setStatuses] = useState<StatusPost[]>(() => {
    let base: StatusPost[] = initialStatuses;
    base = readJSON<StatusPost[]>('rada_statuses', initialStatuses, Array.isArray);
    // Drop anything older than 12 hours and keep one status per person
    return cleanStatuses(base);
  });

  const [tickets, setTickets] = useState<VaultTicket[]>(() => {
    // Strip the old built-in sample tickets that earlier versions saved on this device
    return readJSON<VaultTicket[]>('rada_tickets', initialTickets, Array.isArray)
      .filter(t => !LEGACY_SAMPLE_TICKET_IDS.includes(String(t?.id)));
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    // Strip the old fake sample contacts (Mom / Best Friend) so SOS never texts numbers the person did not add
    return readJSON<EmergencyContact[]>('rada_contacts', initialContacts, Array.isArray)
      .filter(c => !LEGACY_SAMPLE_CONTACT_IDS.includes(String(c?.id)));
  });

  // Independent Offers & Promotions State (12 items)
  const [offers, setOffers] = useState<BusinessOffer[]>(() => {
    const saved = localStorage.getItem('rada_offers');
    if (saved) {
      try {
        const parsed = (JSON.parse(saved) as any[]).filter(o => o?.businessCategory !== 'thrift_store');
        const hasLegacyMock = parsed.some((o: any) => o?.businessName === 'VibeCraft Events KE' || o?.businessName === 'Nairobi Raves Syndicate');
        if (!hasLegacyMock && Array.isArray(parsed) && parsed.length >= initialOffers.length) return parsed;
      } catch (e) {}
    }
    return initialOffers;
  });

  // Outings & Public Plans State
  const [outings, setOutings] = useState<OutingPlan[]>(() => {
    return readJSON<OutingPlan[]>('rada_outings_cache', initialOutings, Array.isArray);
  });
  // Demo Mode only: mock hostings + anything created while recording. Never saved to Supabase or the cache.
  const [demoOutings, setDemoOutings] = useState<OutingPlan[]>([]);
  const allOutings = useMemo(
    () => (isDemoMode() ? [...demoOutings, ...outings.filter(o => !isDemoId(o.id))] : outings),
    [demoOutings, outings]
  );

  // Spot Ownership Claims & Verification Requests
  const [spotClaims, setSpotClaims] = useState<SpotClaimRequest[]>(() => {
    const saved = localStorage.getItem('rada_spot_claims');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialSpotClaims;
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
  const [selectedLocationMapEvent, setSelectedLocationMapEvent] = useState<EventItem | null>(null);

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
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const detected = resolveNearestNeighborhood(latitude, longitude);
          setCurrentLocation(detected);
          localStorage.setItem('rada_current_location', detected);
          setIsGpsActive(true);
        },
        () => {
          // If geolocation is denied or unavailable, do not force a fallback default like "Westlands"
          setIsGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
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
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState<boolean>(() => readJSON<boolean>('rada_gps_broadcast', false, v => typeof v === 'boolean'));
  useEffect(() => { writeJSON('rada_gps_broadcast', isGpsBroadcasting); }, [isGpsBroadcasting]);

  // Going Events Tracking (Only clickable once; click again to remove count)
  const [goingEventIds, setGoingEventIds] = useState<Array<number | string>>(() => {
    const saved = localStorage.getItem('rada_going_events');
    return saved ? JSON.parse(saved) : [];
  });

  // Current logged in user profile with Single / Not Single status (loads saved profile from localStorage)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('rada_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const rawName = parsed.name;
          const rawUser = parsed.username || (parsed.handle ? parsed.handle.replace(/^@/, '') : '');
          const isLegacy = isLegacyWayneName(rawName) || isLegacyWayneName(rawUser);
          const assignedUser = isLegacy ? generateNewUserName() : sanitizeUsername(rawUser, rawName);
          const assignedName = isLegacy ? assignedUser : sanitizeDisplayName(rawName);
          return {
            ...GUEST_PROFILE,
            ...parsed,
            name: assignedName,
            username: assignedUser,
            handle: `@${assignedUser.replace(/^@/, '')}`,
            avatar: sanitizeAvatarUrl(parsed.avatar),
            relationshipStatus: parsed.relationshipStatus || parsed.relationship_status || 'single',
            relationship_status: parsed.relationship_status || parsed.relationshipStatus || 'single',
            isLivenessVerified: Boolean(parsed.isLivenessVerified || parsed.is_liveness_verified),
            is_liveness_verified: Boolean(parsed.is_liveness_verified || parsed.isLivenessVerified),
          };
        }
      }
    } catch (_) {}
    const defaultUser = generateNewUserName();
    return {
      ...GUEST_PROFILE,
      name: defaultUser,
      username: defaultUser,
      handle: `@${defaultUser}`,
      avatar: ''
    };
  });

  // Profile View Modal state (to view anyone's profile and bio)
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Unified RADA Toast Dispatcher with 2.5s auto-dismiss and glassmorphism styling
  const showToast = (text: string, options?: ToastOptions) => {
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
    writeJSONDebounced('rada_saved_items', savedItems);
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
    writeJSONDebounced('rada_saved_folders', savedFolders);
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
    setSavedItems(prev => {
      const exists = prev.some(s => String(s.id) === String(item.id) && s.kind === kind);
      let updated: SavedItem[];
      if (exists) {
        updated = prev.filter(s => !(String(s.id) === String(item.id) && s.kind === kind));
        triggerToast('Removed from saved items', { type: 'info' });
      } else {
        updated = [{ id: item.id, kind, savedAt: new Date().toISOString() }, ...prev];
        triggerToast('Saved to your collection! 🔖', { type: 'success' });
      }
      if (session?.user?.id) {
        cloud.syncSavedPlans(session.user.id, updated, savedFolders);
      }
      return updated;
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
    if (isDemoMode()) {
      setDemoOutings(prev => [{ ...newPlan, id: newPlan.id.startsWith('demo-') ? newPlan.id : `demo-new-${newPlan.id}` }, ...prev]);
      return;
    }
    setOutings(prev => [newPlan, ...prev.filter(o => o.id !== newPlan.id)]);
    const res = await cloud.createOuting(newPlan);
    if (res.error) {
      // Not saved online: take it back off the list instead of pretending it worked
      setOutings(prev => prev.filter(o => o.id !== newPlan.id));
      writeJSON('rada_outings_cache', outings.filter(o => o.id !== newPlan.id));
      showToast(/plan/i.test(res.error) ? res.error : "Your hosting couldn't be saved. Please try again.", { type: 'error' });
    }
  };

  const handleRequestJoin = async (outingId: string, attendee: OutingAttendee) => {
    if (isDemoMode() && isDemoId(outingId)) {
      setDemoOutings(prev => prev.map(o => {
        if (o.id !== outingId) return o;
        const atts = [...(o.attendees || []).filter(a => a.userId !== attendee.userId && a.id !== attendee.id), attendee];
        return { ...o, attendees: atts, currentAttendeesCount: atts.filter(a => a.status === 'joined' || a.status === 'approved').length + 1 };
      }));
      return;
    }
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
    const res = await cloud.requestJoinOuting(outingId, attendee);
    if (res.error) {
      setOutings(prev => prev.map(o => o.id === outingId
        ? { ...o, attendees: (o.attendees || []).filter(a => a.id !== attendee.id) }
        : o));
      showToast("Your request couldn't be sent. Please try again.", { type: 'error' });
    }
  };

  const handleUpdateAttendeeStatus = async (
    outingId: string,
    attendeeId: string,
    status: 'approved' | 'declined'
  ) => {
    if (isDemoMode() && isDemoId(outingId)) {
      setDemoOutings(prev => prev.map(o => {
        if (o.id !== outingId) return o;
        const atts = (o.attendees || []).map(a => (a.id === attendeeId ? { ...a, status } : a));
        return { ...o, attendees: atts, currentAttendeesCount: atts.filter(a => a.status === 'joined' || a.status === 'approved').length + 1 };
      }));
      if (status === 'approved') await socials.openOutingChat(outingId);
      return;
    }
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
      writeJSON('rada_outings_cache', updatedList);
      return updatedList;
    });

    // Supabase update for outing_attendees status
    const upd = await cloud.updateOutingAttendeeStatus(attendeeId, status);
    if (upd.error) {
      // Put the guest back to pending so the host can try again
      setOutings(prev => prev.map(o => o.id === outingId
        ? { ...o, attendees: (o.attendees || []).map(a => a.id === attendeeId ? { ...a, status: 'pending' as const } : a) }
        : o));
      showToast("That request couldn't be updated. Please try again.", { type: 'error' });
      return;
    }

    // If approved, automatically create / link temporary Group Chat and add host + confirmed members
    if (status === 'approved') {
      const res = await socials.openOutingChat(outingId);
      if (res.error) showToast('Approved, but the group chat could not be set up: ' + res.error, { type: 'error' });
    }
  };

  const handleOpenOutingChat = async (outing: OutingPlan) => {
    const isHost = Boolean(session?.user?.id) && outing.hostId === session.user.id;
    // Only the host can unlock the chat; approved guests are added automatically and just need a refresh
    const res = isHost ? await socials.openOutingChat(outing.id) : (await socials.refresh(), { id: `grp-outing-${outing.id}`, error: null as string | null });
    if (res.error) {
      showToast(res.error, { type: 'error' });
      return;
    }
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
      if (remoteSpots && remoteSpots.length > 0) setSpots(stripMockSpots(remoteSpots));
      if (remoteEvents && remoteEvents.length > 0) setEvents(remoteEvents.filter((e: any) => !e.source));
      loadExternalEvents(true);
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
    loadExternalEvents(true);
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
    writeJSONDebounced('rada_businesses', businesses, { stripImages: true });
  }, [businesses]);

  useEffect(() => {
    writeJSONDebounced('rada_spots', spots, { stripImages: true });
  }, [spots]);

  useEffect(() => {
    // only merchant-created events are cached; live ticketing events always come from Supabase
    writeJSONDebounced('rada_events_v2', events.filter(e => !e.source), { stripImages: true });
  }, [events]);

  // The old Luku/thrift cache is no longer used
  useEffect(() => {
    localStorage.removeItem('rada_thrift');
  }, []);

  useEffect(() => {
    writeJSONDebounced('rada_statuses', statuses);
  }, [statuses]);

  // Status lifecycle: every minute, and when the app comes back to the foreground,
  // remove statuses older than 12 hours and refresh the "x ago" labels
  useEffect(() => {
    const tick = () => {
      try {
        setStatuses(prev => cleanStatuses(prev));
      } catch (err) {
        console.warn('Status tick error:', err);
      }
    };
    const id = window.setInterval(tick, 60_000);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        timer = setTimeout(tick, 250);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    writeJSONDebounced('rada_tickets', tickets);
  }, [tickets]);

  // Chats, match requests and group chats now live in Supabase (shared between people and devices).
  // The old on-device demo chats are discarded once.
  useEffect(() => {
    try { localStorage.removeItem('rada_conversations'); localStorage.removeItem('rada_pending_requests'); localStorage.removeItem('rada_sent_requests'); } catch {}
  }, []);
  const socials = useSocialsCloud(
    session?.user?.id && !isGuestMode ? session.user.id : undefined,
    currentUserProfile?.handle || ''
  );
  const conversations = socials.conversations;

  // Demo Mode: seed mock hostings once signed in (re-seeds only if your profile changes; anything you create is kept)
  const demoUid = session?.user?.id && !isGuestMode ? session.user.id : undefined;
  useEffect(() => {
    if (!isDemoMode() || !demoUid) return;
    const seed = buildDemoOutings(demoUid, {
      name: currentUserProfile?.name || 'You',
      handle: currentUserProfile?.handle || '@you',
      avatar: currentUserProfile?.avatar || '',
    });
    setDemoOutings(prev => [...seed, ...prev.filter(o => !/^demo-out-\d+$/.test(String(o.id)))]);
  }, [demoUid, currentUserProfile?.handle, currentUserProfile?.name, currentUserProfile?.avatar]);
  const [planDateChatId, setPlanDateChatId] = useState<string | null>(null);

  useEffect(() => {
    writeJSONDebounced('rada_contacts', emergencyContacts);
  }, [emergencyContacts]);

  useEffect(() => {
    writeJSONDebounced('rada_going_events', goingEventIds);
  }, [goingEventIds]);

  useEffect(() => {
    if (session?.user?.id && !isGuestMode) {
      localStorage.setItem('rada_current_user', JSON.stringify(currentUserProfile));
    }
  }, [currentUserProfile, session, isGuestMode]);

  useEffect(() => {
    writeJSONDebounced('rada_offers', offers, { stripImages: true });
  }, [offers]);

  useEffect(() => {
    writeJSONDebounced('rada_spot_claims', spotClaims);
  }, [spotClaims]);

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
    selectedLocationMapEvent ||
    qrPassTitle ||
    isPlanDateModalOpen ||
    isCreateGroupOpen ||
    viewAllTitle ||
    selectedSpotModal ||
    selectedEventModal ||
    activeOverlay ||
    isBusinessHubOpen ||
    isLivenessModalOpen ||
    isSuggestSpotModalOpen
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
        if (selectedLocationMapEvent) setSelectedLocationMapEvent(null);
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
        if (isSuggestSpotModalOpen) setIsSuggestSpotModalOpen(false);
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
      showToast('Press Back again to exit RADA');
      // Re-anchor history state to keep the user safely inside the web app
      window.history.pushState({ radaApp: true, tab: 'home' }, '');
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
    selectedLocationMapEvent,
    qrPassTitle,
    isPlanDateModalOpen,
    isCreateGroupOpen,
    viewAllTitle,
    selectedSpotModal,
    selectedEventModal,
    activeOverlay,
    isBusinessHubOpen,
    isLivenessModalOpen,
    isSuggestSpotModalOpen,
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
          showToast(`Saved on this device only (${err}).`, { type: 'error' });
        } else {
          ok = true;
        }
      })
      .catch((e) => {
        console.warn('Cloud save error:', e);
        showToast('Saved on this device only (offline?).', { type: 'error' });
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
      // All five requests go out at the same time instead of one after another
      const [remoteBiz, remoteListings, remoteReviewsRaw, remoteStatuses, remoteGoing] = await Promise.all([
        cloud.fetchBusinesses(),
        cloud.fetchListings(),
        cloud.fetchReviews(),
        cloud.fetchStatuses(),   // null = keep local
        cloud.fetchGoing(uid),   // null = keep local
      ]);
      if (!remoteBiz && !remoteListings) return; // offline or tables missing: keep local data
      const remoteReviews = remoteReviewsRaw || {};

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
      setSpots(stripMockSpots(mergedSpots));
      setEvents(mergedEvents);
      setOffers(mergedOffers);
      try {
        const remoteClaims = await cloud.fetchSpotClaims();
        if (remoteClaims && remoteClaims.length > 0) {
          setSpotClaims(remoteClaims);
        }
      } catch (cErr) {
        console.warn('Failed to sync spot claims:', cErr);
      }
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

    // One sync at a time. A request that arrives mid-sync (e.g. a save finishing) queues exactly one
    // follow-up so it still sees the newest data. Returning to the app only re-syncs after 60 s away.
    let inFlight = false;
    let queued = false;
    let lastDoneAt = 0;
    const run = () => {
      if (inFlight) { queued = true; return; }
      inFlight = true;
      syncFromCloud()
        .catch(e => console.warn('Cloud sync failed:', e))
        .finally(() => {
          inFlight = false;
          lastDoneAt = Date.now();
          if (queued) { queued = false; run(); }
        });
    };

    syncRef.current = run;
    run();
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || inFlight) return;
      if (Date.now() - lastDoneAt < 60_000) return;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        try {
          run();
        } catch (err) {
          console.warn('Cloud sync onVisible error:', err);
        }
      }, 500);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(resumeTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
      // Only wipe the previous person's data after a real sign-out; a plain app restart
      // (guest or still restoring the session) must keep what is saved on the device.
      if (localStorage.getItem('rada_last_uid')) {
        setTickets([]);
        setEmergencyContacts([]);
        localStorage.removeItem('rada_last_uid');
      }
      return;
    }
    let cancelled = false;

    // A different account signed in on this phone: clear the previous person's personal data
    const lastUid = localStorage.getItem('rada_last_uid');
    if (lastUid && lastUid !== uid) {
      setTickets(initialTickets);
      setEmergencyContacts(initialContacts);
      setGoingEventIds([]);
      setCurrentUserProfile(GUEST_PROFILE);
    }
    localStorage.setItem('rada_last_uid', uid);

    (async () => {
      const remote = await cloud.fetchUserData(uid);
      if (cancelled) return;
      // Brand-new account: name defaults to new_user_(random 2 numbers) and blank avatar
      const freshProfile = (): UserProfile => {
        const u = generateNewUserName();
        return {
          ...DEFAULT_PROFILE,
          name: u,
          username: u,
          handle: `@${u}`,
          avatar: '',
          bio: '',
        };
      };
      let base: UserProfile = remote?.profile ? remote.profile : freshProfile();
      base.name = sanitizeDisplayName(base.name);
      base.username = sanitizeUsername(base.username, base.name);
      base.handle = `@${base.username.replace(/^@/, '')}`;
      base.avatar = sanitizeAvatarUrl(base.avatar);
      if (remote) {
        if (remote.tickets) setTickets(remote.tickets);
        if (remote.contacts) setEmergencyContacts(remote.contacts);
      }
      // The `profiles` table holds the real username/name/bio/avatar. It always wins over the
      // older copy stored inside rada_user_data, which is what used to bring the old username back.
      try {
        const patch = await cloud.fetchOwnProfilePatch(uid);
        if (cancelled) return;
        if (patch.name) patch.name = sanitizeDisplayName(patch.name);
        if (patch.avatar !== undefined) patch.avatar = sanitizeAvatarUrl(patch.avatar);
        base = { ...base, ...patch };
        base.name = sanitizeDisplayName(base.name);
        base.username = sanitizeUsername(base.username, base.name);
        base.handle = `@${base.username.replace(/^@/, '')}`;
      } catch (e) {
        console.warn('Profile identity load failed:', e);
      }
      base.name = sanitizeDisplayName(base.name);
      base.avatar = sanitizeAvatarUrl(base.avatar);
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
          return `Could not save business: ${err}`;
        }
      }
    } catch (e) {
      console.error('insertBusiness threw:', e);
      return `Could not save business: ${e instanceof Error ? e.message : String(e)}`;
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

  // Spot Claiming with Proof of Ownership Verification (Admin checks & confirms)
  const handleSubmitClaimRequest = async (claim: SpotClaimRequest) => {
    setSpotClaims(prev => [claim, ...prev.filter(c => c.id !== claim.id)]);
    // Mark spot as having pending claim without transferring ownership yet
    setSpots(prev => prev.map(s => {
      if (String(s.id) === String(claim.spotId)) {
        return {
          ...s,
          hasPendingClaim: true,
          pendingClaimId: claim.id,
          pendingClaimBusinessId: claim.businessId
        };
      }
      return s;
    }));
    await cloud.submitSpotClaim(claim);
  };

  const handleApproveClaim = async (claim: SpotClaimRequest) => {
    const now = new Date().toISOString();
    setSpotClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'approved', reviewedAt: now, reviewedBy: 'admin' } : c));
    
    // Transfer spot ownership to claiming business
    setSpots(prev => prev.map(s => {
      if (String(s.id) === String(claim.spotId)) {
        return {
          ...s,
          businessId: claim.businessId,
          merchantId: claim.applicantUserId || session?.user?.id || currentUserId,
          isUserUploaded: false,
          is_claimed: true,
          claimedByBusinessId: claim.businessId,
          claimedAt: now,
          hasPendingClaim: false,
          pendingClaimId: undefined,
          pendingClaimBusinessId: undefined
        };
      }
      return s;
    }));
    await cloud.reviewSpotClaim(claim.id, 'approved', undefined, 'admin');
  };

  const handleRejectClaim = async (claimId: string, reason?: string) => {
    const now = new Date().toISOString();
    let targetSpotId: string | number | undefined;
    setSpotClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        targetSpotId = c.spotId;
        return { ...c, status: 'rejected', rejectionReason: reason, reviewedAt: now, reviewedBy: 'admin' };
      }
      return c;
    }));

    if (targetSpotId !== undefined) {
      setSpots(prev => prev.map(s => {
        if (String(s.id) === String(targetSpotId)) {
          return {
            ...s,
            hasPendingClaim: false,
            pendingClaimId: undefined,
            pendingClaimBusinessId: undefined
          };
        }
        return s;
      }));
    }
    await cloud.reviewSpotClaim(claimId, 'rejected', reason, 'admin');
  };

  const handleClaimSpot = (spotId: number, businessId: string) => {
    // Forward to proof submission with target spot
    const target = spots.find(s => s.id === spotId);
    const targetBiz = businesses.find(b => b.id === businessId);
    if (!target || !targetBiz) return;
    const req: SpotClaimRequest = {
      id: `claim-${Date.now()}`,
      spotId,
      spotTitle: target.title,
      spotCategory: target.category,
      spotNeighborhood: target.neighborhood,
      spotAddress: target.address,
      spotImg: target.img,
      businessId,
      businessName: targetBiz.name,
      businessCategory: targetBiz.category,
      businessPhone: targetBiz.phone,
      businessEmail: targetBiz.email,
      businessLogo: targetBiz.logo,
      applicantUserId: session?.user?.id || currentUserId || '',
      applicantName: targetBiz.name,
      applicantHandle: `@${targetBiz.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      claimantRole: 'Owner / Founder',
      contactPhone: targetBiz.phone || '+254 ',
      contactEmail: targetBiz.email || '',
      officialSocialUrl: targetBiz.instagram,
      proofNote: `Ownership claim submitted by verified merchant ${targetBiz.name}.`,
      proofDocuments: [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    handleSubmitClaimRequest(req);
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
        showToast('Please sign in to manage spots.', { type: 'error' });
        return;
      }

      // Check ownership if editing an existing spot
      const existing = spots.find(s => s.id === spot.id);
      if (existing && existing.merchantId && existing.merchantId !== ownerId) {
        const userBizIds = businesses.filter(b => b.ownerId === ownerId).map(b => b.id);
        if (!existing.businessId || !userBizIds.includes(existing.businessId)) {
          showToast('Permission denied: Only the spot owner or verified merchant can edit this spot.', { type: 'error' });
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
      } else {
        setEvents(prev => prev.filter(e => e.id !== id));
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
      locationStr: movie.locationName || 'Cinema',
      type: 'Cinema Movie Pass'
    };
    setTickets(prev => [newPass, ...prev]);
    window.open(movie.bookingUrl || movie.url, '_blank', 'noopener');
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
    });
  };

  // Manual delete: only the owner can delete their own status, anytime
  const handleDeleteStatus = (statusId: string) => {
    requireAuth('delete your status', () => {
      const target = statuses.find(s => s.id === statusId);
      if (!target || !isOwnStatus(target, { userId: session?.user?.id, handle: currentUserProfile.handle })) return;
      setStatuses(prev => prev.filter(s => s.id !== statusId));
      deleteStatusInCloud(statusId);
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
    });
  };

  // Event "I'm Going" Toggle: clickable once to go; if clicked again, remove count
  const handleToggleGoing = (event: EventItem) => {
    const isAlreadyGoing = goingEventIds.includes(event.id);
    // rada_going is keyed by numeric listing ids; live (uuid) events are tracked on this device only
    if (currentUserId && typeof event.id === 'number') {
      const numericId = event.id;
      cloudWrite(() => cloud.setGoing(numericId, currentUserId, !isAlreadyGoing));
    }
    if (isAlreadyGoing) {
      // Untoggle: remove count
      setGoingEventIds(prev => prev.filter(id => id !== event.id));
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: Math.max(0, e.goingCount - 1) } : e));
      setExternalEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: Math.max(0, e.goingCount - 1) } : e));
      if (selectedEventModal && selectedEventModal.id === event.id) {
        setSelectedEventModal(prev => prev ? { ...prev, goingCount: Math.max(0, prev.goingCount - 1) } : null);
      }
      setTickets(prev => prev.filter(t => t.title !== event.title));
    } else {
      // Toggle: add count
      setGoingEventIds(prev => [...prev, event.id]);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: e.goingCount + 1 } : e));
      setExternalEvents(prev => prev.map(e => e.id === event.id ? { ...e, goingCount: e.goingCount + 1 } : e));
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
    showToast('Profile updated!', { category: 'profile' });
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
    showToast('Profile Verified', { category: 'profile' });
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
    setTimeout(() => {
      window.open(event.url, '_blank');
    }, 750);
  };

  // Plan a Date workflow
  const handlePlanDateFromSpot = (spot: SpotItem) => {
    setSelectedSpotModal(null);
    setDatePlanningSpot(spot);
    setPlanDateChatId(null);
    setIsPlanDateModalOpen(true);
  };

  const handleConfirmDateInvite = async (spot: SpotItem, date: string, time: string) => {
    setIsPlanDateModalOpen(false);
    setDatePlanningSpot(null);

    // Send into the chat Plan a Date was opened from, otherwise the most recent one-to-one chat
    const target =
      conversations.find(c => c.id === planDateChatId) ||
      conversations.find(c => c.type === 'direct');
    if (!target) {
      showToast('Match with someone first, then plan a date from your chat with them.', { type: 'error' });
      return;
    }
    const err = await socials.sendMessage(target.id, {
      kind: 'date_invite',
      content: `Date Invite: ${spot.title} on ${date}`,
      media: { dateInvite: { spotTitle: spot.title, address: spot.address, date, time, accepted: false } },
    });
    if (err) {
      showToast(err, { type: 'error' });
      return;
    }
    setTickets(prev => [{
      id: `date-${Date.now()}`,
      title: `Date with ${target.name} @ ${spot.title}`,
      dateStr: `${date} (${time})`,
      locationStr: spot.address,
      type: 'Vault Synced Outing'
    }, ...prev]);
    setPlanDateChatId(null);
    setTargetChatId(target.id);
    setActiveTab('socials');
  };

  // Create Group Chat (real members, looked up by @username)
  const handleCreateGroup = async (name: string, handles: string[]) => {
    const res = await socials.createGroup(name, handles);
    if (res.error || !res.id) {
      showToast(res.error || 'Could not create the group.', { type: 'error' });
      return;
    }
    setIsCreateGroupOpen(false);
    if (res.missing.length > 0) {
      showToast('Group created. Not found: ' + res.missing.map(h => '@' + h).join(', '), { type: 'error' });
    }
    setTargetChatId(res.id);
    setActiveTab('socials');
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

  const isAdmin = !isGuestMode && isPlatformAdmin({ email: session?.user?.email || currentUserProfile?.email, role: userRole });

  const handleDeleteSpot = async (spot: SpotItem | { id: string | number; title?: string }) => {
    const spotId = spot.id;
    const spotTitle = (spot as any).title || '';

    try {
      // 1. Supabase unclaimedspots table
      if (isSupabaseConfigured && supabase) {
        const rawId = String(spotId);
        const cleanId = rawId.replace('unclaimed-', '').replace('scraped-', '');
        try {
          await supabase.from('unclaimedspots').delete().or(`id.eq.${cleanId},id.eq.${rawId}`);
        } catch (_) {}
        if (spotTitle) {
          try {
            await supabase.from('unclaimedspots').delete().eq('name', spotTitle);
          } catch (_) {}
        }
      }

      // 2. Supabase spots table
      if (isSupabaseConfigured && supabase) {
        const numId = Number(spotId);
        if (Number.isFinite(numId) && !isNaN(numId)) {
          try {
            await supabase.from('spots').delete().eq('id', numId);
          } catch (_) {}
        } else {
          try {
            await supabase.from('spots').delete().eq('id', spotId);
          } catch (_) {}
        }
        if (spotTitle) {
          try {
            await supabase.from('spots').delete().eq('title', spotTitle);
          } catch (_) {}
        }
      }

      // 3. Supabase rada_listings table
      try {
        await cloud.deleteListing('spot', spotId);
      } catch (_) {}
    } catch (e) {
      console.warn('Backend delete spot error:', e);
    }

    // 4. In-memory feed cache eviction
    evictUnclaimedSpot(spotId, spotTitle);

    // 5. Update local spots state and localStorage
    setSpots(prev => {
      const updated = prev.filter(s => String(s.id) !== String(spotId) && (!spotTitle || (s.title || '').trim().toLowerCase() !== spotTitle.trim().toLowerCase()));
      try {
        localStorage.setItem('rada_spots', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // 6. Clean from saved places
    setSavedItems(prev => prev.filter(item => !(item.kind === 'spot' && String(item.id) === String(spotId))));

    // 7. If currently open in modal, close it
    if (selectedSpotModal && (String(selectedSpotModal.id) === String(spotId) || (spotTitle && selectedSpotModal.title === spotTitle))) {
      setSelectedSpotModal(null);
    }

    showToast(`"${spotTitle || 'Spot'}" was permanently deleted.`, { type: 'success' });
  };

  return (
    <ToastProvider>
      <BusinessesProvider businesses={businesses}>
        <div className="min-h-screen bg-white text-slate-900 dark:bg-[#121113] dark:text-slate-100 flex flex-col transition-colors duration-200 antialiased overflow-x-hidden">
          {/* Primary Application Splash Screen */}
          {showSplash && <SplashScreen durationMs={1200} onDismiss={() => setShowSplash(false)} />}

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


          {/* Account Suspended Banner */}
          {suspensionReason && (
            <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-md z-40 sticky top-0">
              <div className="flex items-center gap-2 flex-1">
                <i className="fa-solid fa-triangle-exclamation text-amber-200"></i>
                <span>Account Suspended: {suspensionReason}</span>
              </div>
              <button
                onClick={() => setSuspensionReason(null)}
                className="text-white/80 hover:text-white px-1.5 py-0.5 rounded text-xs cursor-pointer"
                title="Dismiss banner"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

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
            userEmail={session?.user?.email || currentUserProfile?.email}
            onLogout={handleSignOut}
            onOpenSaved={() => setIsSavedModalOpen(true)}
            savedCount={savedItems.length}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            onOpenSuggestSpot={() => setIsSuggestSpotModalOpen(true)}
            onRefresh={handleHeaderRefresh}
          />

          {/* Main Content Viewports */}
          <main className="flex-1 pb-24 min-[900px]:pb-10 max-w-lg min-[900px]:max-w-none mx-auto w-full relative px-0 min-[900px]:pl-60">
            <div className="w-full min-[900px]:max-w-5xl min-[900px]:mx-auto min-[900px]:px-8 min-[900px]:py-6">
            <ErrorBoundary fallbackTitle="Resuming View">
            <Suspense fallback={<TabFallback />}>
            {activeTab === 'home' && (
              <HomeTab
                events={allEvents}
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
                onOpenSuggestSpot={() => setIsSuggestSpotModalOpen(true)}
                onOpenBusinessProfile={handleOpenBusinessProfile}
                showToast={showToast}
                isAdmin={!isGuestMode && isPlatformAdmin({ email: session?.user?.email || currentUserProfile?.email, role: userRole })}
                currentUserEmail={session?.user?.email || currentUserProfile?.email}
                currentUserId={session?.user?.id || currentUserId}
                currentUserRole={userRole}
                businesses={businesses}
                currentLocation={currentLocation}
                isGpsActive={isGpsActive}
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
                onOpenSuggestSpot={() => setIsSuggestSpotModalOpen(true)}
                onPostReview={handlePostReview}
                onNavigateToCalendar={handleNavigateToCalendar}
                showToast={showToast}
                isAdmin={isAdmin}
                onDeleteSpot={handleDeleteSpot}
              />
            )}

            {(activeTab === 'outings' || activeTab === 'plans') && (
              <OutingsTab
                outings={allOutings}
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
                spotClaims={spotClaims}
                onSubmitClaimRequest={handleSubmitClaimRequest}
                showToast={showToast}
              />
            )}

            {activeTab === 'socials' && (
              <SocialsTab
                discoveryProfiles={discoveryProfiles}
                conversations={conversations}
                currentUserProfile={currentUserProfile}
                myUserId={session?.user?.id && !isGuestMode ? session.user.id : undefined}
                requests={socials.requests}
                onSendMatchRequest={socials.sendRequest}
                onRespondRequest={socials.respondRequest}
                onSendMessage={socials.sendMessage}
                onLoadHistory={socials.loadHistory}
                onRefreshSocials={socials.refresh}
                onOpenPlanDateModal={(chatId) => requireAuth('send messages', () => { setPlanDateChatId(chatId || null); setIsPlanDateModalOpen(true); })}
                onOpenCreateGroupModal={() => requireAuth('send messages', () => setIsCreateGroupOpen(true))}
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
                events={allEvents}
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
                events={allEvents}
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
            </Suspense>
            </ErrorBoundary>
            </div>
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
          <ErrorBoundary fallbackTitle="Resuming View">
          <Suspense fallback={null}>
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
                spotClaims={spotClaims}
                onSubmitClaimRequest={handleSubmitClaimRequest}
                onClose={() => setIsBusinessHubOpen(false)}
                showToast={showToast}
              />
            </div>
          )}

          {(selectedLocationMapSpot || selectedLocationMapEvent) && (
            <LocationMapModal
              spot={selectedLocationMapSpot}
              event={selectedLocationMapEvent}
              onClose={() => { setSelectedLocationMapSpot(null); setSelectedLocationMapEvent(null); }}
              showToast={showToast}
            />
          )}

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
            spots={allMergedSpots}
            events={allEvents}
            cinemaMovies={cinemaMovies}
            offers={offers}
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
            onOpenEventMap={(evt) => setSelectedLocationMapEvent(evt)}
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
              });
            }}
            onDeleteEmergencyContact={(id) => {
              setEmergencyContacts(prev => prev.filter(c => c.id !== id));
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
            isAdmin={isAdmin}
            onDeleteSpot={handleDeleteSpot}
          />

          <UserProfileModal
            user={viewingProfile}
            isMutualMatch={Boolean(viewingProfile?.id && conversations.some(c => c.type === 'direct' && (c as any).otherUserId === viewingProfile.id))}
            onClose={() => setViewingProfile(null)}
            onSendMatchRequest={(u) => {
              requireAuth('send messages', async () => {
                if (!u.id) { showToast('This profile cannot receive requests yet.', { type: 'error' }); return; }
                const res = await socials.sendRequest(u.id);
                if (res.status === 'error') showToast(res.error || 'Could not send the request.', { type: 'error' });
                else if (res.status === 'matched') {
                  showToast(`It's a match with ${u.handle}!`, { category: 'match' });
                  if (res.conversationId) setTargetChatId(res.conversationId);
                  setActiveTab('socials');
                } else if (res.status === 'already_sent') showToast(`You already sent ${u.handle} a request.`);
                else showToast(`Hangout & Match request sent to ${u.handle}!`, { category: 'match' });
                setViewingProfile(null);
              });
            }}
            onSendMessage={(u) => {
              requireAuth('send messages', () => {
                const dm = conversations.find(c => c.type === 'direct' && (c as any).otherUserId === u.id);
                if (dm) setTargetChatId(dm.id);
                setActiveTab('socials');
                setViewingProfile(null);
              });
            }}
            showToast={showToast}
            onOpenSavedItems={() => requireAuth('view saved collections', () => setIsSavedModalOpen(true))}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            currentUserId={session?.user?.id}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />

          {selectedPublicBusiness && (
            <PublicBusinessProfileModal
              business={selectedPublicBusiness}
              onClose={() => setSelectedPublicBusiness(null)}
              offers={offers}
              spots={spots}
              events={allEvents}
              onOpenSpotDetails={(spot) => setSelectedSpotModal(spot)}
              onOpenEventDetails={(event) => setSelectedEventModal(event)}
              showToast={showToast}
            />
          )}

          {isAccountSettingsOpen && (
            <AccountSettingsModal
              isOpen={isAccountSettingsOpen}
              onClose={() => setIsAccountSettingsOpen(false)}
              session={session}
              currentUserProfile={currentUserProfile}
              showToast={showToast}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onSignOut={handleSignOut}
              onProfileChange={handleOwnProfileChange}
              outings={allOutings}
            />
          )}

          {isSavedModalOpen && (
            <SavedPlacesModal
              isOpen={isSavedModalOpen}
              onClose={() => setIsSavedModalOpen(false)}
              savedItems={savedItems}
              savedFolders={savedFolders}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onAssignItemFolder={handleAssignItemFolder}
              spots={allMergedSpots}
              events={allEvents}
              offers={offers}
              onToggleSave={handleToggleSave}
              onOpenSpot={(spot) => setSelectedSpotModal(spot)}
              onOpenEvent={(evt) => setSelectedEventModal(evt)}
              showToast={showToast}
            />
          )}

          {isLivenessModalOpen && (
            <LivenessVerificationModal
              isOpen={isLivenessModalOpen}
              onClose={() => setIsLivenessModalOpen(false)}
              currentUserProfile={currentUserProfile}
              userId={session?.user?.id}
              onVerificationSuccess={handleVerificationSuccess}
              showToast={showToast}
            />
          )}

          {isSuggestSpotModalOpen && (
            <SuggestSpotModal
              isOpen={isSuggestSpotModalOpen}
              onClose={() => setIsSuggestSpotModalOpen(false)}
              onSubmitSuccess={(spot) => {
                if (spot.status === 'approved') {
                  setSpots(prev => [spot, ...prev.filter(s => String(s.id) !== String(spot.id))]);
                }
              }}
              showToast={showToast}
              currentUserId={session?.user?.id}
              currentUserProfile={currentUserProfile}
            />
          )}

          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => { setIsAuthModalOpen(false); setIsGuestMode(true); }}
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
              spotClaims={spotClaims}
              onApproveClaim={handleApproveClaim}
              onRejectClaim={handleRejectClaim}
              spotsCount={spots.length}
              currentUserEmail={session?.user?.email || currentUserProfile?.email}
              currentUserId={session?.user?.id || currentUserProfile?.id}
              currentUserRole={userRole}
              onSpotPublished={(spot) => {
                setSpots(prev => [spot, ...prev.filter(s => String(s.id) !== String(spot.id))]);
              }}
              onSpotDeleted={(spotId) => {
                handleDeleteSpot({ id: spotId });
              }}
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

          </Suspense>
          </ErrorBoundary>

          {/* Account Suspended Modal */}
          {suspensionReason && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1C1A1E] border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                  <i className="fa-solid fa-ban text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Account Suspended
                  </h3>
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300">
                    Account Suspended: {suspensionReason}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                    Your account has been suspended by a platform administrator. Access to account management, merchant operations, and personalized features has been revoked.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSuspensionReason(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl hover:opacity-90 transition cursor-pointer"
                  >
                    Sign In with Another Account
                  </button>
                  <button
                    onClick={() => {
                      setSuspensionReason(null);
                      setIsGuestMode(true);
                    }}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
        </div>
      </BusinessesProvider>
    </ToastProvider>
  );
}
 
                      
          
