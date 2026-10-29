import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Search, ShieldCheck, Clock, XCircle, RefreshCw, LayoutDashboard, MapPinPlus, Users,
  BadgeCheck, Crown, Trash2, Ban, UserX, Store, Sparkles, ImagePlus, CircleDollarSign,
  Film, Flag, ExternalLink, FileText, CheckCircle2, AlertCircle, MapPin, Phone, Mail, Globe, Image as ImageIcon,
} from 'lucide-react';
import type {
  BusinessAccount, SpotCategory, SpotItem, AdminUserRecord, PlatformStats,
  SubscriptionStatus, UnclaimedSpotInput, SpotClaimRequest, AdminPermissions
} from '../types';
import { isOfficialAdmin, DEFAULT_DELEGATED_PERMISSIONS, SUPER_ADMIN_PERMISSIONS } from '../types';
import { fetchBusinesses,
  fetchPlatformStats, fetchAdminUsers, setUserSuspension, revokeCreatorStatus,
  revokeBusinessStatus, deleteAccountAdmin, publishUnclaimedSpot,
  fetchUnclaimedSpots, deleteListing, reviewBusiness, fetchSpotClaims, reviewSpotClaim,
  fetchPendingUserSpots, approveCommunitySpot, rejectCommunitySpot,
  setUserAdminRole
} from '../lib/cloudSync';
import { CinemaAdminPanel } from './CinemaAdminPanel.tsx';
import { AdminSubscriptionsPanel } from './AdminSubscriptionsPanel';
import { AdminReportsPanel } from './AdminReportsPanel';
import { supabase } from '../lib/supabase';
import { initialBusinesses } from '../data/initialData.ts';
import type { ToastOptions } from './Toast.tsx';

type VerificationStatus = 'pending' | 'approved' | 'rejected';
type TabId = 'overview' | 'pending_spots' | 'claims' | 'verification' | 'spots' | 'cinema' | 'users' | 'subscriptions' | 'reports';

export interface AdminDashboardProps {
  businesses: BusinessAccount[];
  onClose: () => void;
  onRefresh?: () => void;
  showToast?: (message: string, options?: ToastOptions) => void;
  /** Persist a business update (the app's existing handler). Falls back to cloudSync.reviewBusiness. */
  onUpdateBusiness?: (businessId: string, updates: Partial<BusinessAccount>) => void;
  /** Called after an unclaimed spot is saved, so the app can add it to local state straight away. */
  onSpotPublished?: (spot: SpotItem) => void;
  /** Called after an unclaimed spot is deleted. */
  onSpotDeleted?: (spotId: number | string) => void;
  /** Local counts, used while the live platform stats are still loading or unavailable. */
  spotsCount?: number;
  eventsCount?: number;
  spotClaims?: SpotClaimRequest[];
  onApproveClaim?: (claim: SpotClaimRequest) => void;
  onRejectClaim?: (claimId: string, reason?: string) => void;
  currentUserEmail?: string;
  currentUserId?: string;
  currentUserRole?: string;
}

const SPOT_CATEGORIES: { id: SpotCategory; label: string }[] = [
  { id: 'restaurants_dining', label: 'Restaurants & Dining' },
  { id: 'cafes_bakeries', label: 'Cafes & Bakeries' },
  { id: 'clubs_lounges', label: 'Clubs & Lounges' },
  { id: 'date_spots', label: 'Date Spots' },
  { id: 'nature', label: 'Nature & Outdoors' },
  { id: 'creative_leisure', label: 'Creative & Leisure' },
  { id: 'tech_gaming', label: 'Tech & Gaming' },
  { id: 'action_sports', label: 'Action & Sports' },
  { id: 'hotels_luxury', label: 'Hotels & Luxury Stays' },
  { id: 'vacation_escapes', label: 'Vacation Escapes' },
  { id: 'spa_wellness', label: 'Spa & Wellness' },
  { id: 'event_space', label: 'Event Space' },
];

const statusOf = (b: BusinessAccount): VerificationStatus =>
  b.verificationStatus || (b.verified ? 'approved' : 'pending');

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500';
const chipBase = 'px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer whitespace-nowrap';

const emptyForm = {
  title: '', category: 'restaurants_dining' as SpotCategory, neighborhood: '', address: '',
  description: '', phone: '', openingHours: '', price: '', instagram: '', website: '',
  lat: '', lng: '', img: '',
};

export function AdminDashboardModal({
  businesses: businessesProp, onClose, onRefresh, showToast, onUpdateBusiness,
  onSpotPublished, onSpotDeleted, spotsCount, eventsCount,
  spotClaims = [], onApproveClaim, onRejectClaim,
  currentUserEmail, currentUserId, currentUserRole
}: AdminDashboardProps) {
  const toast = useCallback((m: string, options?: ToastOptions) => showToast?.(m, options), [showToast]);

  const [tab, setTab] = useState<TabId>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- live data ----
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[] | null>(null);
  const [usersError, setUsersError] = useState(false);
  const [unclaimed, setUnclaimed] = useState<any[]>([]);

  // Current admin identity & permissions
  const isOfficial = isOfficialAdmin(currentUserEmail);
  const myUserRecord = users?.find(u => u.id === currentUserId || (currentUserEmail && u.email?.toLowerCase() === currentUserEmail.toLowerCase()));
  const myPermissions: AdminPermissions = isOfficial
    ? SUPER_ADMIN_PERMISSIONS
    : (myUserRecord?.adminPermissions || DEFAULT_DELEGATED_PERMISSIONS);

  // Admin permissions assignment modal state
  const [adminModalUser, setAdminModalUser] = useState<AdminUserRecord | null>(null);
  const [adminPermsForm, setAdminPermsForm] = useState<AdminPermissions>(DEFAULT_DELEGATED_PERMISSIONS);
  const [savingAdminPerms, setSavingAdminPerms] = useState(false);

  // Businesses shown in admin = every real business in Supabase + any local real ones (demo seeds excluded).
  const [remoteBiz, setRemoteBiz] = useState<BusinessAccount[]>([]);
  const businesses = useMemo(() => {
    const seedIds = new Set(initialBusinesses.map(b => b.id));
    const map = new Map<string, BusinessAccount>();
    for (const b of remoteBiz) map.set(b.id, b);
    for (const b of businessesProp) if (!seedIds.has(b.id) && !map.has(b.id)) map.set(b.id, b);
    // prefer the freshest app-state copy for edits made this session
    for (const b of businessesProp) if (map.has(b.id) && !seedIds.has(b.id)) map.set(b.id, { ...map.get(b.id)!, ...b });
    return Array.from(map.values());
  }, [remoteBiz, businessesProp]);
  const [liveClaims, setLiveClaims] = useState<SpotClaimRequest[]>(spotClaims || []);
  const [claimStatusFilter, setClaimStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [claimSearch, setClaimSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<SpotClaimRequest | null>(null);
  const [claimRejectNote, setClaimRejectNote] = useState('');
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // ---- Pending user-submitted spots state ----
  const [pendingSpots, setPendingSpots] = useState<SpotItem[]>([]);
  const [pendingSpotSearch, setPendingSpotSearch] = useState('');
  const [activeRejectingSpotId, setActiveRejectingSpotId] = useState<number | string | null>(null);
  const [rejectSpotReason, setRejectSpotReason] = useState<Record<string | number, string>>({});
  const [previewSpotPhoto, setPreviewSpotPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (spotClaims && spotClaims.length > 0) {
      setLiveClaims(spotClaims);
    }
  }, [spotClaims]);

  // Source of truth for unclaimed spots: public.unclaimedspots (paged, so >1000 rows still load).
  const fetchUnclaimedFromDb = useCallback(async (): Promise<any[] | null> => {
    if (!supabase) return null;
    const rows: any[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 20000; from += PAGE) {
      const { data, error } = await supabase
        .from('unclaimedspots')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) { console.warn('unclaimedspots read failed:', error.message); return rows.length ? rows : null; }
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return rows.map(r => ({
      id: r.id,
      title: r.name,
      category: r.category,
      neighborhood: r.neighborhood || r.address || '',
      address: r.address,
      img: r.thumbnail,
      lat: r.latitude,
      lng: r.longitude,
      phone: r.phone,
      website: r.website,
      isUnclaimed: true,
      _src: 'unclaimedspots',
    }));
  }, []);

  const loadAll = useCallback(async () => {
    const rb = (await fetchBusinesses()) || [];
    setRemoteBiz(rb);
    const [s, u, sp, cl, ps, dbUnclaimed] = await Promise.all([
      fetchPlatformStats(),
      fetchAdminUsers(rb.length ? rb : businessesProp),
      fetchUnclaimedSpots(),
      fetchSpotClaims(),
      fetchPendingUserSpots(),
      fetchUnclaimedFromDb(),
    ]);
    setStats(s);
    setUsers(u);
    setUsersError(u === null);
    // live table first; keep any extra rows the old loader returned (matched by id)
    const seen = new Set((dbUnclaimed || []).map(x => String(x.id)));
    setUnclaimed([...(dbUnclaimed || []), ...(sp || []).filter((x: any) => !seen.has(String(x.id)))]);
    setPendingSpots(ps || []);
    if (cl && cl.length > 0) {
      setLiveClaims(cl);
    } else if (spotClaims && spotClaims.length > 0) {
      setLiveClaims(spotClaims);
    }
  }, [businessesProp, spotClaims, fetchUnclaimedFromDb]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const refresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();
    await loadAll();
    setIsRefreshing(false);
  };

  const handleAdminApproveClaim = async (claim: SpotClaimRequest) => {
    if (onApproveClaim) {
      onApproveClaim(claim);
    } else {
      const err = await reviewSpotClaim(claim.id, 'approved');
      if (err) { toast(err, { type: 'error' }); return; }
    }
    setLiveClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: 'admin' } : c));
    setSelectedClaim(null);
    onRefresh?.();
  };

  const handleAdminRejectClaim = async (claim: SpotClaimRequest) => {
    const reason = claimRejectNote.trim();
    if (!reason) {
      toast('Please enter a rejection reason.', { type: 'error' });
      return;
    }
    if (onRejectClaim) {
      onRejectClaim(claim.id, reason);
    } else {
      const err = await reviewSpotClaim(claim.id, 'rejected', reason);
      if (err) { toast(err, { type: 'error' }); return; }
    }
    setLiveClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'rejected', rejectionReason: reason, reviewedAt: new Date().toISOString(), reviewedBy: 'admin' } : c));
    setSelectedClaim(null);
    setClaimRejectNote('');
    onRefresh?.();
  };

  // =====================================================================
  // PENDING COMMUNITY SPOTS APPROVAL PIPELINE
  // =====================================================================
  const handleApproveCommunitySpot = async (spot: SpotItem) => {
    const { spot: approved, error } = await approveCommunitySpot(spot.id);
    if (error || !approved) {
      toast(error || 'Failed to approve spot', { type: 'error' });
      return;
    }
    setPendingSpots(prev => prev.filter(s => String(s.id) !== String(spot.id)));
    onSpotPublished?.(approved);
    onRefresh?.();
  };

  const handleRejectCommunitySpot = async (spot: SpotItem) => {
    const reason = rejectSpotReason[spot.id]?.trim() || 'Did not meet listing standards or quality guidelines';
    const { error } = await rejectCommunitySpot(spot.id, reason);
    if (error) {
      toast(error || 'Failed to reject spot', { type: 'error' });
      return;
    }
    setPendingSpots(prev => prev.filter(s => String(s.id) !== String(spot.id)));
    setActiveRejectingSpotId(null);
    onRefresh?.();
  };

  const filteredPendingSpots = useMemo(() => {
    const q = pendingSpotSearch.trim().toLowerCase();
    if (!q) return pendingSpots;
    return pendingSpots.filter(s =>
      [
        s.title,
        s.neighborhood,
        s.category,
        s.address,
        s.description,
        s.submitted_by_name,
        s.submitted_by_email,
        s.submitted_by_user_id
      ].some(val => String(val || '').toLowerCase().includes(q))
    );
  }, [pendingSpots, pendingSpotSearch]);

  // =====================================================================
  // VERIFICATION
  // =====================================================================
  const [vStatus, setVStatus] = useState<VerificationStatus>('pending');
  const [bizSearch, setBizSearch] = useState('');
  const [selectedBiz, setSelectedBiz] = useState<BusinessAccount | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [subOverride, setSubOverride] = useState<Record<string, SubscriptionStatus>>({});

  const subOf = (b: BusinessAccount): SubscriptionStatus => subOverride[b.id] || b.subscriptionStatus || 'none';

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    businesses.forEach(b => { c[statusOf(b)]++; });
    return c;
  }, [businesses]);

  const filteredBiz = useMemo(() => {
    const q = bizSearch.trim().toLowerCase();
    return businesses.filter(b =>
      statusOf(b) === vStatus &&
      (!q || [b.name, b.category, b.address].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [businesses, vStatus, bizSearch]);

  const saveBusiness = async (b: BusinessAccount, updates: Partial<BusinessAccount>, msg: string) => {
    if (onUpdateBusiness) {
      onUpdateBusiness(b.id, updates);
    } else {
      const err = await reviewBusiness(b.id, updates);
      if (err) { toast(err, { type: 'error' }); return; }
      onRefresh?.();
    }
    setSelectedBiz(null);
    setRejectReason('');
  };

  const approve = (b: BusinessAccount) =>
    saveBusiness(b, {
      verified: true, verificationStatus: 'approved', verificationNote: '',
      verifiedAt: new Date().toISOString(), verifiedBy: 'admin',
    }, `${b.name} approved and verified.`);

  const reject = (b: BusinessAccount) => {
    const reason = rejectReason.trim();
    if (!reason) { toast('Please enter a rejection reason.', { type: 'error' }); return; }
    return saveBusiness(b, {
      verified: false, verificationStatus: 'rejected', verificationNote: reason,
      verifiedAt: undefined, verifiedBy: 'admin',
    }, `${b.name} rejected.`);
  };

  const revokeBadge = (b: BusinessAccount) =>
    saveBusiness(b, {
      verified: false, verificationStatus: 'pending', verificationNote: 'Verified badge removed by admin.',
      verifiedAt: undefined, verifiedBy: 'admin',
    }, `Verified badge removed from ${b.name}.`);

  // =====================================================================
  // UNCLAIMED SPOTS
  // =====================================================================
  const [form, setForm] = useState(emptyForm);
  const [publishing, setPublishing] = useState(false);
  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const onPickImage = (file?: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {  return; }
    const reader = new FileReader();
    reader.onload = () => setF('img', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const publishSpot = async () => {
    if (!form.title.trim()) { toast('Spot name is required.', { type: 'error' }); return; }
    if (!form.neighborhood.trim()) { toast('Neighborhood is required.', { type: 'error' }); return; }
    const lat = form.lat.trim() ? Number(form.lat) : undefined;
    const lng = form.lng.trim() ? Number(form.lng) : undefined;
    if ((lat !== undefined && !Number.isFinite(lat)) || (lng !== undefined && !Number.isFinite(lng))) {
 return;
    }
    const input: UnclaimedSpotInput = {
      title: form.title, category: form.category, neighborhood: form.neighborhood, address: form.address,
      description: form.description, phone: form.phone, openingHours: form.openingHours, price: form.price,
      img: form.img, lat, lng, website: form.website, instagram: form.instagram,
    };
    setPublishing(true);
    const { error, spot } = await publishUnclaimedSpot(input);
    setPublishing(false);
    if (error || !spot) { toast(error || 'Could not publish spot.', { type: 'error' }); return; }
    onSpotPublished?.(spot);
    setUnclaimed(list => [spot, ...list]);
    setForm(emptyForm);
    void fetchPlatformStats().then(setStats);
  };

  const removeSpot = async (s: any) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    if (s._src === 'unclaimedspots' && supabase) {
      const { data, error } = await supabase.from('unclaimedspots').delete().eq('id', s.id).select('id');
      if (error || !data || data.length === 0) {
        toast(error?.message || 'Could not delete. Sign in with the admin account and try again.', { type: 'error' });
        return;
      }
    } else {
      const err = await deleteListing('spot', s.id);
      if (err) { toast(err, { type: 'error' }); return; }
    }
    setUnclaimed(list => list.filter(x => String(x.id) !== String(s.id)));
    onSpotDeleted?.(s.id);
  };

  // =====================================================================
  // USERS
  // =====================================================================
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admins' | 'merchants' | 'hosts' | 'suspended'>('all');
  const [action, setAction] = useState<null | { kind: 'suspend' | 'unsuspend' | 'revokeHost' | 'revokeBiz' | 'delete'; user: AdminUserRecord }>(null);
  const [actionText, setActionText] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return (users || []).filter(u => {
      if (userFilter === 'admins' && u.role !== 'admin') return false;
      if (userFilter === 'merchants' && !u.isMerchant) return false;
      if (userFilter === 'hosts' && !u.isCreator) return false;
      if (userFilter === 'suspended' && !u.isSuspended) return false;
      return !q || [u.name, u.username, u.email, u.id].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [users, userSearch, userFilter]);

  const closeAction = () => { setAction(null); setActionText(''); };

  const runAction = async () => {
    if (!action) return;
    const { kind, user } = action;
    if (kind === 'delete' && actionText.trim() !== 'DELETE') {  return; }
    setBusy(true);
    let err: string | null = null;
    let msg = '';

    if (kind === 'suspend') {
      err = await setUserSuspension(user.id, true, actionText.trim());
      msg = `${user.name || 'User'} suspended.`;
    } else if (kind === 'unsuspend') {
      err = await setUserSuspension(user.id, false);
      msg = `${user.name || 'User'} reinstated.`;
    } else if (kind === 'revokeHost') {
      err = await revokeCreatorStatus(user.id);
      msg = 'Professional host status revoked.';
    } else if (kind === 'revokeBiz') {
      for (const id of user.businessIds) {
        const e = await revokeBusinessStatus(id, actionText.trim() || undefined);
        if (e) { err = e; break; }
      }
      msg = 'Business status revoked.';
      if (!err) onRefresh?.();
    } else {
      const res = await deleteAccountAdmin(user.id);
      err = res.error;
      msg = res.authDeleted
        ? 'Account deleted.'
        : 'Account data deleted. The login itself needs the admin_delete_user function (see migration).';
      if (!err) onRefresh?.();
    }
    setBusy(false);
    if (err) { toast(err, { type: 'error' }); return; }
    closeAction();
    setUsers(await fetchAdminUsers(businesses));
    void fetchPlatformStats().then(setStats);
  };

  // =====================================================================
  // OVERVIEW DERIVED
  // =====================================================================
  const paidBusinesses = useMemo(
    () => businesses.filter(b => subOf(b) === 'active' || subOf(b) === 'trialing'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businesses, subOverride]
  );
  const monthlyRevenue = paidBusinesses.reduce((sum, b) => sum + (b.subscriptionAmount || 0), 0);
  const activeHosts = (users || []).filter(u => u.isCreator && !u.isSuspended);
  const num = (live: number | null | undefined, fallback?: number) =>
    live ?? fallback ?? '–';

  const pendingClaimsCount = useMemo(() => {
    return (liveClaims || []).filter(c => c.status === 'pending').length;
  }, [liveClaims]);

  const claimCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    (liveClaims || []).forEach(c => {
      counts.all++;
      if (c.status in counts) counts[c.status as 'pending' | 'approved' | 'rejected']++;
    });
    return counts;
  }, [liveClaims]);

  const filteredClaims = useMemo(() => {
    const q = claimSearch.trim().toLowerCase();
    return (liveClaims || []).filter(c => {
      const matchesStatus = claimStatusFilter === 'all' || c.status === claimStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [
        c.spotTitle,
        c.businessName,
        c.spotNeighborhood,
        c.claimantRole,
        c.contactEmail,
        c.contactPhone,
        c.applicantHandle,
        c.applicantName,
        c.proofNote
      ].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [liveClaims, claimStatusFilter, claimSearch]);

  const openAdminPermsModal = (u: AdminUserRecord) => {
    setAdminModalUser(u);
    setAdminPermsForm(u.adminPermissions || { ...DEFAULT_DELEGATED_PERMISSIONS });
  };

  const handleSaveAdminPerms = async () => {
    if (!adminModalUser) return;
    setSavingAdminPerms(true);
    const err = await setUserAdminRole(adminModalUser.id, 'admin', adminPermsForm);
    setSavingAdminPerms(false);
    if (err) {
      toast(err, { type: 'error' });
      return;
    }
    toast(`${adminModalUser.name || adminModalUser.username || 'User'} is now an Admin with custom limits. 🛡️`, { type: 'success' });
    setUsers(prev => prev ? prev.map(u => u.id === adminModalUser.id ? { ...u, role: 'admin', adminPermissions: adminPermsForm } : u) : null);
    setAdminModalUser(null);
    onRefresh?.();
  };

  const handleDemoteAdmin = async (user: AdminUserRecord) => {
    if (isOfficialAdmin(user.email)) {
      toast('The official super admin account cannot be demoted.', { type: 'error' });
      return;
    }
    if (!window.confirm(`Revoke admin privileges for ${user.name || user.email}?`)) return;
    setSavingAdminPerms(true);
    const err = await setUserAdminRole(user.id, 'user');
    setSavingAdminPerms(false);
    if (err) {
      toast(err, { type: 'error' });
      return;
    }
    toast(`${user.name || user.username || 'User'} demoted to standard user.`, { type: 'info' });
    setUsers(prev => prev ? prev.map(u => u.id === user.id ? { ...u, role: 'user', adminPermissions: undefined } : u) : null);
    setAdminModalUser(null);
    onRefresh?.();
  };

  const allTabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number; enabled: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, enabled: true },
    { id: 'pending_spots', label: 'Pending Spots', icon: <MapPin className="w-4 h-4" />, badge: pendingSpots.length, enabled: myPermissions.canManageSpots },
    { id: 'claims', label: 'Spot Claims', icon: <ShieldCheck className="w-4 h-4" />, badge: pendingClaimsCount, enabled: myPermissions.canApproveClaims },
    { id: 'verification', label: 'Businesses', icon: <BadgeCheck className="w-4 h-4" />, badge: counts.pending, enabled: myPermissions.canVerifyMerchants },
    { id: 'spots', label: 'Add Community Spot', icon: <MapPinPlus className="w-4 h-4" />, enabled: myPermissions.canManageSpots },
    { id: 'cinema', label: 'Cinema', icon: <Film className="w-4 h-4" />, enabled: myPermissions.canManageCinema },
    { id: 'users', label: 'Users & Admins', icon: <Users className="w-4 h-4" />, enabled: isOfficial || myPermissions.canManageUsers },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CircleDollarSign className="w-4 h-4" />, enabled: isOfficial || myPermissions.canManageSubscriptions },
    { id: 'reports', label: 'Reports', icon: <Flag className="w-4 h-4" />, enabled: isOfficial || myPermissions.canManageUsers },
  ];
  const tabs = allTabs.filter(t => t.enabled);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === tab)) {
      setTab('overview');
    }
  }, [tabs, tab]);

  const StatCard = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <div className="text-purple-600 mb-2">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-6xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden sm:rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

          {/* HEADER */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-purple-600">RADA Admin</p>
                  {isOfficial ? (
                    <span className="text-[10px] bg-gradient-to-r from-amber-500 to-purple-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                      👑 Official Super Admin
                    </span>
                  ) : (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                      🛡️ Delegated Admin
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-black leading-tight truncate">👑 Admin Control Hub</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`${chipBase} flex items-center gap-1.5 ${
                  tab === t.id
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {t.icon}
                {t.label}
                {!!t.badge && (
                  <span className={`text-[10px] px-1.5 rounded-full ${tab === t.id ? 'bg-white/25' : 'bg-amber-500 text-white'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ================= OVERVIEW ================= */}
            {tab === 'overview' && (
              <div className="p-4 space-y-5">
                <div>
                  <h2 className="text-sm font-black mb-2">Platform</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
                    <StatCard label="Total users" value={num(stats?.totalUsers)} icon={<Users className="w-5 h-5" />} />
                    <StatCard label="Total spots" value={num(stats?.totalSpots, spotsCount)} icon={<MapPinPlus className="w-5 h-5" />} />
                    <StatCard label="Community spots" value={unclaimed.length} icon={<MapPinPlus className="w-5 h-5 text-emerald-600" />} />
                    <StatCard label="Pending spots" value={pendingSpots.length} icon={<MapPin className="w-5 h-5 text-orange-500" />} />
                    <StatCard label="Total events" value={num(stats?.totalEvents, eventsCount)} icon={<Sparkles className="w-5 h-5" />} />
                    <StatCard label="Businesses" value={num(stats?.totalBusinesses, businesses.length)} icon={<Store className="w-5 h-5" />} />
                    <StatCard label="Pro hosts" value={num(stats?.professionalHosts)} icon={<Crown className="w-5 h-5" />} />
                    <StatCard label="Spot Claims" value={liveClaims.length} icon={<ShieldCheck className="w-5 h-5" />} />
                  </div>
                </div>

                {pendingSpots.length > 0 && (
                  <div className="rounded-2xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-orange-900 dark:text-orange-200">
                          {pendingSpots.length} User Spot{pendingSpots.length > 1 ? 's' : ''} Awaiting Review & Approval
                        </p>
                        <p className="text-xs text-orange-800/80 dark:text-orange-300/80">
                          Community suggestions submitted with photo galleries. Review details & approve for publication.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('pending_spots')}
                      className="px-4 py-2 bg-[#E0533C] dark:bg-[#A94F3E] hover:bg-orange-700 text-white rounded-xl text-xs font-black shrink-0 transition cursor-pointer self-start sm:self-auto"
                    >
                      Review Pending Spots ({pendingSpots.length}) ↗
                    </button>
                  </div>
                )}

                {pendingClaimsCount > 0 && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                          {pendingClaimsCount} Spot Claim{pendingClaimsCount > 1 ? 's' : ''} Awaiting Proof Review
                        </p>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                          Merchants submitted proof of ownership documents to claim venues.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('claims')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition cursor-pointer self-start sm:self-auto"
                    >
                      Review Claims ↗
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black">Premium business accounts ({paidBusinesses.length})</h2>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <CircleDollarSign className="w-4 h-4" />
                      {monthlyRevenue > 0 ? `KES ${monthlyRevenue.toLocaleString()} / mo recorded` : 'No amounts recorded'}
                    </span>
                  </div>
                  {paidBusinesses.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      No business is on a paid or trial plan yet. Manage plans from the Subscriptions tab.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paidBusinesses.map(b => (
                        <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{b.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {b.subscriptionPlan || 'Paid plan'}
                              {b.subscriptionRenewsAt ? ` • renews ${b.subscriptionRenewsAt.split('T')[0]}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {b.subscriptionAmount ? `KES ${b.subscriptionAmount.toLocaleString()}` : '–'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-black mb-2">Active professional hosts ({users ? activeHosts.length : '–'})</h2>
                  {usersError ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      Could not load accounts. Check that your admin read policy on profiles is in place.
                    </p>
                  ) : activeHosts.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      No professional host accounts yet.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {activeHosts.map(u => (
                        <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{u.name || u.username || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500 truncate">{u.username ? `@${u.username}` : u.email || u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= PENDING SPOTS ================= */}
            {tab === 'pending_spots' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E0533C] dark:text-[#D17A68]" />
                      <span>Pending User-Submitted Spots ({pendingSpots.length})</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review community-submitted spots, inspect photo galleries, and publish or reject them.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={pendingSpotSearch}
                      onChange={(e) => setPendingSpotSearch(e.target.value)}
                      placeholder="Search pending spots..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E0533C] dark:focus:ring-[#D17A68]"
                    />
                  </div>
                </div>

                {filteredPendingSpots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No pending user spots
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      All community submissions have been reviewed! When regular users suggest new spots, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPendingSpots.map((spot) => {
                      const photos = (spot.photos && spot.photos.length > 0)
                        ? spot.photos
                        : (spot.images && spot.images.length > 0 ? spot.images : (spot.img ? [spot.img] : []));
                      const isRejecting = activeRejectingSpotId === spot.id;

                      return (
                        <div
                          key={spot.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs space-y-4"
                        >
                          {/* Top Row: Title, Category, Location, Price, Status Chip */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                                  {spot.title}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                  {spot.category.replace(/_/g, ' ')}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Approval</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                  <MapPin className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68]" />
                                  {spot.neighborhood} {spot.address ? `• ${spot.address}` : ''}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {spot.price || 'KES $$'}
                                </span>
                              </div>
                            </div>

                            {/* Submitter Details Tag */}
                            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-purple-500" />
                                <span>Submitted by: {spot.submitted_by_name || 'Community Member'}</span>
                              </p>
                              {spot.submitted_by_email && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {spot.submitted_by_email}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {spot.submittedAt ? new Date(spot.submittedAt).toLocaleString() : 'Recently'}
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          {spot.description && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Description & Atmosphere
                              </p>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                {spot.description}
                              </p>
                            </div>
                          )}

                          {/* Tags */}
                          {spot.tags && spot.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-400 mr-1">Tags:</span>
                              {spot.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Full Photo Gallery */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span>Uploaded Photo Gallery ({photos.length})</span>
                              </p>
                              <span className="text-[10px] text-slate-400">Click photo to view full size</span>
                            </div>

                            {photos.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No photos uploaded for this spot.</p>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {photos.map((photoUrl, pIdx) => (
                                  <div
                                    key={pIdx}
                                    onClick={() => setPreviewSpotPhoto(photoUrl)}
                                    className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer group hover:scale-[1.02] transition"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Spot photo ${pIdx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                                      View
                                    </div>
                                    {pIdx === 0 && (
                                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/70 text-[9px] font-bold text-white">
                                        Cover
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Controls: Approve & Publish or Reject */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {!isRejecting ? (
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <button
                                  type="button"
                                  onClick={() => handleApproveCommunitySpot(spot)}
                                  className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Approve & Publish</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveRejectingSpotId(spot.id)}
                                  className="flex-1 sm:flex-initial px-4 py-2 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <div className="w-full space-y-2 bg-red-50/60 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/60">
                                <p className="text-xs font-bold text-red-800 dark:text-red-300">
                                  Provide a reason for rejecting "{spot.title}":
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    value={rejectSpotReason[spot.id] || ''}
                                    onChange={(e) =>
                                      setRejectSpotReason(prev => ({ ...prev, [spot.id]: e.target.value }))
                                    }
                                    placeholder="e.g. Duplicate listing, invalid photos, closed venue..."
                                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRejectCommunitySpot(spot)}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                                    >
                                      Confirm Rejection
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveRejectingSpotId(null)}
                                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= SPOT CLAIMS ================= */}
            {tab === 'claims' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Spot Ownership Claims & Proof Verification</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify proof of ownership (business permits, utility bills, signage) before confirming spot claims.
                    </p>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="grid grid-cols-4 gap-2.5">
                  {([
                    ['pending', 'Pending', <Clock key="p" className="w-4 h-4 text-amber-500 mb-1" />, 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'],
                    ['approved', 'Approved', <CheckCircle2 key="a" className="w-4 h-4 text-emerald-500 mb-1" />, 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'],
                    ['rejected', 'Rejected', <XCircle key="r" className="w-4 h-4 text-red-500 mb-1" />, 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'],
                    ['all', 'All Claims', <ShieldCheck key="all" className="w-4 h-4 text-purple-500 mb-1" />, 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'],
                  ] as [typeof claimStatusFilter, string, React.ReactNode, string][]).map(([id, label, icon, activeCls]) => (
                    <button
                      key={id}
                      onClick={() => setClaimStatusFilter(id)}
                      className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        claimStatusFilter === id ? activeCls : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {icon}
                      <p className="text-xl font-black">{claimCounts[id as keyof typeof claimCounts]}</p>
                      <p className="text-[11px] font-bold truncate">{label}</p>
                    </button>
                  ))}
                </div>

                <SearchBox value={claimSearch} onChange={setClaimSearch} placeholder="Search spot title, business name, claimant contact..." />

                {filteredClaims.length === 0 ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                    <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      No {claimStatusFilter === 'all' ? '' : claimStatusFilter} spot claims found
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {claimStatusFilter === 'pending'
                        ? 'When merchants claim a spot and upload proof of ownership, they will appear here for verification.'
                        : 'No claims match your current filter query.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClaims.map(c => {
                      const isPending = c.status === 'pending';
                      const isApproved = c.status === 'approved';
                      const isRejected = c.status === 'rejected';

                      return (
                        <div
                          key={c.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-purple-400/80 dark:hover:border-purple-600 transition bg-white dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {c.spotImg ? (
                              <img src={c.spotImg} alt={c.spotTitle} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                                <Store className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">{c.spotTitle}</h3>
                                {c.spotCategory && (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {c.spotCategory}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="truncate">{c.spotNeighborhood ? `${c.spotNeighborhood} • ` : ''}{c.spotAddress || 'Address not provided'}</span>
                              </p>

                              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Store className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Claimed by: {c.businessName}</span>
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">Role: <strong className="text-slate-700 dark:text-slate-300">{c.claimantRole}</strong></span>
                                {c.proofDocuments && c.proofDocuments.length > 0 && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                                      <FileText className="w-3 h-3" />
                                      <span>{c.proofDocuments.length} doc{c.proofDocuments.length > 1 ? 's' : ''}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                            <div>
                              {isPending && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                  <span>Pending Review</span>
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Ownership Approved</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Claim Rejected</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setClaimRejectNote(c.rejectionReason || '');
                              }}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Inspect & Confirm</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= VERIFICATION ================= */}
            {tab === 'verification' && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ['pending', 'Pending', <Clock key="p" className="w-5 h-5 text-amber-500 mb-2" />, 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'],
                    ['approved', 'Verified', <ShieldCheck key="a" className="w-5 h-5 text-emerald-500 mb-2" />, 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'],
                    ['rejected', 'Rejected', <XCircle key="r" className="w-5 h-5 text-red-500 mb-2" />, 'border-red-500 bg-red-50/50 dark:bg-red-950/20'],
                  ] as [VerificationStatus, string, React.ReactNode, string][]).map(([id, label, icon, active]) => (
                    <button
                      key={id}
                      onClick={() => setVStatus(id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        vStatus === id ? active : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      {icon}
                      <p className="text-2xl font-black">{counts[id]}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </button>
                  ))}
                </div>

                <SearchBox value={bizSearch} onChange={setBizSearch} placeholder="Search businesses..." />

                {filteredBiz.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300">No {vStatus === 'approved' ? 'verified' : vStatus} businesses found</p>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      {vStatus === 'pending'
                        ? 'New merchant verification requests will appear here.'
                        : `Businesses with status "${vStatus}" will be listed here.`}
                    </p>
                  </div>
                ) : filteredBiz.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBiz(b); setRejectReason(''); }}
                    className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold flex items-center gap-1.5">
                          <span className="truncate">{b.name}</span>
                          {vStatus === 'approved' && <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {b.category || 'Business'}{b.address ? ` • ${b.address}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{vStatus}</span>
                        {subOf(b) !== 'none' && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            {subOf(b).replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ================= UNCLAIMED SPOTS ================= */}
            {tab === 'spots' && (
              <div className="p-4 grid lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-black">Publish a community spot</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Goes live immediately with no business account. Merchants can search for it and claim it later.
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">Spot name *</span>
                    <input className={inputCls} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Karura Forest Café" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">Category *</span>
                    <select className={inputCls} value={form.category} onChange={e => setF('category', e.target.value)}>
                      {SPOT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Neighborhood *</span>
                      <input className={inputCls} value={form.neighborhood} onChange={e => setF('neighborhood', e.target.value)} placeholder="Westlands" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Price</span>
                      <input className={inputCls} value={form.price} onChange={e => setF('price', e.target.value)} placeholder="KES $$" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">Address</span>
                    <input className={inputCls} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Street, building, landmark" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">Description</span>
                    <textarea className={inputCls} rows={3} value={form.description} onChange={e => setF('description', e.target.value)} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Phone</span>
                      <input className={inputCls} value={form.phone} onChange={e => setF('phone', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Opening hours</span>
                      <input className={inputCls} value={form.openingHours} onChange={e => setF('openingHours', e.target.value)} placeholder="Mon–Sun 8am–10pm" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Instagram</span>
                      <input className={inputCls} value={form.instagram} onChange={e => setF('instagram', e.target.value)} placeholder="@handle" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Website</span>
                      <input className={inputCls} value={form.website} onChange={e => setF('website', e.target.value)} placeholder="https://" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Latitude</span>
                      <input className={inputCls} inputMode="decimal" value={form.lat} onChange={e => setF('lat', e.target.value)} placeholder="-1.2675" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Longitude</span>
                      <input className={inputCls} inputMode="decimal" value={form.lng} onChange={e => setF('lng', e.target.value)} placeholder="36.8115" />
                    </label>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-500">Cover photo</span>
                    <div className="mt-1 flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                        <ImagePlus className="w-4 h-4" /> Choose photo
                        <input type="file" accept="image/*" className="hidden" onChange={e => onPickImage(e.target.files?.[0])} />
                      </label>
                      {form.img && <img src={form.img} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    </div>
                  </div>

                  <button
                    onClick={publishSpot}
                    disabled={publishing}
                    className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-3 font-bold"
                  >
                    {publishing ? 'Publishing…' : 'Publish community spot'}
                  </button>
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-black">Community listings ({unclaimed.length})</h2>
                  {unclaimed.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      No community listings yet.
                    </p>
                  ) : unclaimed.map(s => (
                    <div key={String(s.id)} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      {s.img && <img src={s.img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{s.title}</p>
                        <p className="text-xs text-slate-500 truncate">{s.neighborhood} • is_claimed: false</p>
                      </div>
                      <button onClick={() => removeSpot(s)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Delete spot">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= USERS ================= */}
            {tab === 'cinema' && <CinemaAdminPanel toast={toast} />}

            {/* ================= SUBSCRIPTIONS ================= */}
            {tab === 'subscriptions' && <AdminSubscriptionsPanel toast={toast} />}
            {tab === 'reports' && <AdminReportsPanel toast={toast} />}

            {tab === 'users' && (
              <div className="p-4 space-y-3">
                <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Search name, @username, email or ID..." />
                <div className="flex gap-2 overflow-x-auto">
                  {([['all', 'All'], ['admins', '👑 Admins'], ['merchants', 'Merchants'], ['hosts', 'Pro hosts'], ['suspended', 'Suspended']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setUserFilter(id)}
                      className={`${chipBase} ${userFilter === id ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {users === null && !usersError && <p className="text-sm text-slate-500 py-8 text-center">Loading accounts…</p>}
                {usersError && (
                  <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                    Could not load accounts. Make sure you are signed in as the admin and the admin read policy on profiles exists (see admin_migration.sql).
                  </p>
                )}
                {users && filteredUsers.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">No accounts match.</p>}

                {filteredUsers.map(u => {
                  const isSuper = isOfficialAdmin(u.email);
                  const isAdmin = u.role === 'admin';

                  return (
                    <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 bg-white dark:bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{u.name || u.username || 'Unnamed'}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {[u.username && `@${u.username}`, u.email].filter(Boolean).join(' • ') || u.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {isSuper ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-2xs flex items-center gap-1">
                              👑 Official Super Admin
                            </span>
                          ) : isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                              🛡️ Delegated Admin
                            </span>
                          ) : null}
                          {u.isMerchant && <Pill tone="amber">Merchant</Pill>}
                          {u.isCreator && <Pill tone="blue">Pro host</Pill>}
                          {u.isSuspended && <Pill tone="red">Suspended</Pill>}
                        </div>
                      </div>

                      {/* Delegated Admin Operational Limits Badge */}
                      {isAdmin && !isSuper && (
                        <div className="bg-slate-50 dark:bg-slate-900/90 rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>Configured Permissions</span>
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              Limit: {u.adminPermissions?.maxDailyApprovals ? `${u.adminPermissions.maxDailyApprovals}/day` : 'Unlimited'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                            <span>Spots: {u.adminPermissions?.canManageSpots !== false ? '✅' : '❌'}</span>
                            <span>Claims: {u.adminPermissions?.canApproveClaims !== false ? '✅' : '❌'}</span>
                            <span>Merchants: {u.adminPermissions?.canVerifyMerchants ? '✅' : '❌'}</span>
                            <span>Cinema: {u.adminPermissions?.canManageCinema !== false ? '✅' : '❌'}</span>
                            <span>Users: {u.adminPermissions?.canManageUsers ? '✅' : '❌'}</span>
                            <span>Subscriptions: {u.adminPermissions?.canManageSubscriptions ? '✅' : '❌'}</span>
                          </div>
                        </div>
                      )}

                      {u.isSuspended && u.suspendedReason && (
                        <p className="text-xs text-red-600 dark:text-red-400">Reason: {u.suspendedReason}</p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {isSuper ? (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 py-1">
                            ⭐️ Protected Account (Platform Owner)
                          </span>
                        ) : (
                          <>
                            {/* Make / Configure Admin Button (Official Admin Only) */}
                            {isOfficial && (
                              <ActionBtn
                                onClick={() => openAdminPermsModal(u)}
                                icon={<Crown className="w-3.5 h-3.5 text-purple-600" />}
                                label={isAdmin ? 'Configure Limits ⚙️' : 'Make Admin 🛡️'}
                              />
                            )}

                            {isAdmin && isOfficial && (
                              <ActionBtn
                                danger
                                onClick={() => handleDemoteAdmin(u)}
                                icon={<UserX className="w-3.5 h-3.5" />}
                                label="Demote to User"
                              />
                            )}

                            {/* Actions available to Official Admin or Sub-Admins with canManageUsers */}
                            {(isOfficial || myPermissions.canManageUsers) && (
                              <>
                                <ActionBtn
                                  onClick={() => setAction({ kind: u.isSuspended ? 'unsuspend' : 'suspend', user: u })}
                                  icon={<Ban className="w-3.5 h-3.5" />}
                                  label={u.isSuspended ? 'Unblock' : 'Suspend / Block'}
                                />
                                {u.isCreator && (
                                  <ActionBtn onClick={() => setAction({ kind: 'revokeHost', user: u })} icon={<UserX className="w-3.5 h-3.5" />} label="Revoke creator" />
                                )}
                                {u.isMerchant && (
                                  <ActionBtn onClick={() => setAction({ kind: 'revokeBiz', user: u })} icon={<Store className="w-3.5 h-3.5" />} label="Revoke business" />
                                )}
                                <ActionBtn danger onClick={() => setAction({ kind: 'delete', user: u })} icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete account" />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BUSINESS REVIEW MODAL */}
      {selectedBiz && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-bold text-purple-600">Review business</p>
                <h2 className="text-lg font-black truncate">{selectedBiz.name}</h2>
              </div>
              <button onClick={() => setSelectedBiz(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Category" value={selectedBiz.category} />
              <Field label="Address" value={selectedBiz.address} />
              <Field label="Contact" value={[selectedBiz.email, selectedBiz.phone].filter(Boolean).join(' • ')} />
              {selectedBiz.bio && <Field label="About" value={selectedBiz.bio} />}

              {selectedBiz.verificationNote && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                  <p className="text-xs font-bold text-red-600">Verification note</p>
                  <p className="text-sm mt-1">{selectedBiz.verificationNote}</p>
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Subscription</p>
                  <p className="text-sm font-bold mt-1 capitalize">
                    {subOf(selectedBiz).replace('_', ' ')}
                    {selectedBiz.subscriptionPlan ? ` · ${selectedBiz.subscriptionPlan}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedBiz(null); setTab('subscriptions'); }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Manage plan
                </button>
              </div>

              {statusOf(selectedBiz) === 'pending' && (
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="If rejecting, enter the reason..."
                  rows={3}
                  className={inputCls}
                />
              )}

              <div className="flex gap-3 pt-1">
                {statusOf(selectedBiz) === 'pending' && (
                  <>
                    <button onClick={() => approve(selectedBiz)} className="flex-1 rounded-xl bg-emerald-600 text-white py-3 font-bold hover:bg-emerald-700">
                      Approve & verify
                    </button>
                    <button onClick={() => reject(selectedBiz)} className="flex-1 rounded-xl bg-red-600 text-white py-3 font-bold hover:bg-red-700">
                      Reject
                    </button>
                  </>
                )}
                {statusOf(selectedBiz) === 'approved' && (
                  <button onClick={() => revokeBadge(selectedBiz)} className="flex-1 rounded-xl bg-amber-500 text-white py-3 font-bold hover:bg-amber-600">
                    Revoke verified badge
                  </button>
                )}
                {statusOf(selectedBiz) === 'rejected' && (
                  <button onClick={() => approve(selectedBiz)} className="flex-1 rounded-xl bg-emerald-600 text-white py-3 font-bold hover:bg-emerald-700">
                    Approve instead
                  </button>
                )}
                <button
                  onClick={() => setSelectedBiz(null)}
                  className="px-5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPOT CLAIM REVIEW MODAL */}
      {selectedClaim && (
        <div className="absolute inset-0 z-[115] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-950 z-10">
              <div className="min-w-0">
                <span className="text-[11px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Spot Ownership Verification</span>
                </span>
                <h2 className="text-base sm:text-lg font-black truncate mt-0.5">
                  Review Claim: {selectedClaim.spotTitle}
                </h2>
              </div>
              <button 
                onClick={() => { setSelectedClaim(null); setClaimRejectNote(''); }} 
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-5">
              
              {/* Target Spot Preview Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
                {selectedClaim.spotImg ? (
                  <img src={selectedClaim.spotImg} alt={selectedClaim.spotTitle} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    Target Venue
                  </span>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 mt-0.5 truncate">{selectedClaim.spotTitle}</h3>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E0533C] dark:text-[#D17A68]" />
                    <span>{selectedClaim.spotNeighborhood} • {selectedClaim.spotAddress}</span>
                  </p>
                </div>
              </div>

              {/* Claiming Business Account & Representative */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Claiming Business</h4>
                  <div className="flex items-center gap-2.5">
                    {selectedClaim.businessLogo ? (
                      <img src={selectedClaim.businessLogo} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center text-xs font-black">
                        <Store className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{selectedClaim.businessName}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{selectedClaim.businessCategory || 'Venue Merchant'}</p>
                    </div>
                  </div>
                  {selectedClaim.businessPhone && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{selectedClaim.businessPhone}</span>
                    </p>
                  )}
                  {selectedClaim.businessEmail && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{selectedClaim.businessEmail}</span>
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Claimant Credentials</h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Role at Venue: <span className="text-purple-600 dark:text-purple-400">{selectedClaim.claimantRole}</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{selectedClaim.contactPhone}</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{selectedClaim.contactEmail}</span>
                    </p>
                    {selectedClaim.officialSocialUrl && (
                      <a
                        href={selectedClaim.officialSocialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 truncate pt-0.5"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{selectedClaim.officialSocialUrl}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Claimant's Proof Note / Explanation */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Proof of Ownership Statement
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedClaim.proofNote || 'No text note provided. See attached documentation below.'}
                </div>
              </div>

              {/* Uploaded Documents & Permits */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>Uploaded Proof Documents & Permits ({selectedClaim.proofDocuments?.length || 0})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Click any document to inspect full size</span>
                </div>

                {!selectedClaim.proofDocuments || selectedClaim.proofDocuments.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400">
                    No images or scans uploaded. Review note above or contact claimant.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedClaim.proofDocuments.map((docUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewDocUrl(docUrl)}
                        className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-4/3 cursor-pointer hover:border-purple-500 transition shadow-xs"
                      >
                        <img src={docUrl} alt={`Proof doc ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-white text-xs font-black">
                          <ExternalLink className="w-4 h-4" />
                          <span>View Scan</span>
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                          Doc #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Review Feedback (if already rejected or reviewed) */}
              {selectedClaim.rejectionReason && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 p-3.5 space-y-1">
                  <p className="text-xs font-black text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Previous Rejection Feedback</span>
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                    {selectedClaim.rejectionReason}
                  </p>
                </div>
              )}

              {/* Status and Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {selectedClaim.status === 'pending' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        Rejection reason (if denying claim):
                      </label>
                      <textarea
                        value={claimRejectNote}
                        onChange={e => setClaimRejectNote(e.target.value)}
                        placeholder="e.g. Document image is blurry, please re-upload a clear Single Business Permit or business lease..."
                        rows={2}
                        className={inputCls}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <button
                        onClick={() => handleAdminApproveClaim(selectedClaim)}
                        className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Transfer Ownership</span>
                      </button>
                      <button
                        onClick={() => handleAdminRejectClaim(selectedClaim)}
                        className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 text-white py-3.5 font-black text-xs transition cursor-pointer shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Claim</span>
                      </button>
                    </div>
                  </>
                ) : selectedClaim.status === 'approved' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                          Ownership Confirmed & Active
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          Spot management assigned to {selectedClaim.businessName}.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdminRejectClaim(selectedClaim)}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Revoke Claim
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-xs font-black text-red-900 dark:text-red-200">
                          Claim Rejected
                        </p>
                        <p className="text-[11px] text-red-700 dark:text-red-300">
                          Spot remains open for valid merchant verification.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdminApproveClaim(selectedClaim)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve Instead
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN PROOF DOCUMENT ZOOM LIGHTBOX */}
      {previewDocUrl && (
        <div 
          onClick={() => setPreviewDocUrl(null)}
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewDocUrl} alt="Ownership Proof Document" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setPreviewDocUrl(null)}
              className="absolute top-3 right-3 w-9 h-9 bg-black/80 hover:bg-black text-white rounded-full flex items-center justify-center transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* USER ACTION CONFIRMATION */}
      {action && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <h2 className="text-lg font-black">
              {{
                suspend: 'Suspend account',
                unsuspend: 'Reinstate account',
                revokeHost: 'Revoke professional host status',
                revokeBiz: 'Revoke business status',
                delete: 'Delete account permanently',
              }[action.kind]}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {action.kind === 'delete'
                ? `This removes ${action.user.name || 'this user'}'s profile, businesses, listings and saved data. It cannot be undone.`
                : action.kind === 'suspend'
                ? `${action.user.name || 'This user'} will be blocked from the app until you reinstate them.`
                : action.kind === 'unsuspend'
                ? `${action.user.name || 'This user'} will regain access.`
                : action.kind === 'revokeHost'
                ? 'They go back to a personal account and lose host tools.'
                : `All of ${action.user.name || 'this user'}'s businesses lose verified status.`}
            </p>
            {(action.kind === 'suspend' || action.kind === 'revokeBiz') && (
              <textarea
                className={inputCls}
                rows={2}
                value={actionText}
                onChange={e => setActionText(e.target.value)}
                placeholder="Reason (optional)"
              />
            )}
            {action.kind === 'delete' && (
              <input
                className={inputCls}
                value={actionText}
                onChange={e => setActionText(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
            )}
            <div className="flex gap-3">
              <button onClick={closeAction} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 font-bold">
                Cancel
              </button>
              <button
                onClick={runAction}
                disabled={busy}
                className={`flex-1 rounded-xl py-2.5 font-bold text-white disabled:opacity-60 ${
                  action.kind === 'delete' || action.kind === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox Modal */}
      {previewSpotPhoto && (
        <div
          onClick={() => setPreviewSpotPhoto(null)}
          className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
          >
            <button
              type="button"
              onClick={() => setPreviewSpotPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-red-600 transition z-10 cursor-pointer"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewSpotPhoto}
              alt="Community Spot Photo"
              className="max-h-[82vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* ADMIN PERMISSIONS & LIMITS CONFIGURATION MODAL */}
      {adminModalUser && (
        <div className="absolute inset-0 z-[125] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-black">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Configure Admin Limits</h3>
                  <p className="text-xs text-slate-500">
                    {adminModalUser.name || adminModalUser.username || adminModalUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalUser(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 p-3 rounded-xl">
              Official Admin (Super Admin) sets granular operational privileges and approval caps for this account.
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Functional Access
              </h4>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canManageSpots}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canManageSpots: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Manage Spots & Community Submissions</span>
                  <span className="text-slate-500">Can add spots and inspect/approve pending user hangout submissions.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canApproveClaims}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canApproveClaims: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Review Spot Ownership Claims</span>
                  <span className="text-slate-500">Can inspect ownership permits and transfer venue ownership to businesses.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canVerifyMerchants}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canVerifyMerchants: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Verify Businesses & Merchants</span>
                  <span className="text-slate-500">Can review and award verified business checkmarks to merchants.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canManageCinema}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canManageCinema: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Manage Cinema & Movie Showings</span>
                  <span className="text-slate-500">Can update movie listings, screening times, and theater details.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canManageSubscriptions}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canManageSubscriptions: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Manage Subscriptions & Billing</span>
                  <span className="text-slate-500">Can view revenue, adjust subscription tiers, and audit payments.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermsForm.canManageUsers}
                  onChange={e => setAdminPermsForm(p => ({ ...p, canManageUsers: e.target.checked }))}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold block">Manage Users (Suspend / Revoke)</span>
                  <span className="text-slate-500">Can suspend bad actors and revoke creator/business roles.</span>
                </div>
              </label>
            </div>

            {/* Daily Approval Ceiling */}
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Daily Approval Limit
              </label>
              <select
                value={adminPermsForm.maxDailyApprovals ?? 10}
                onChange={e => setAdminPermsForm(p => ({ ...p, maxDailyApprovals: Number(e.target.value) }))}
                className={inputCls}
              >
                <option value={5}>5 approvals / day (Strict Trial)</option>
                <option value={10}>10 approvals / day (Standard Sub-Admin)</option>
                <option value={25}>25 approvals / day (Trusted Lead)</option>
                <option value={50}>50 approvals / day (High Volume)</option>
                <option value={9999}>Unlimited Approvals</option>
              </select>
              <p className="text-[10px] text-slate-400">Limits daily claims and community approvals this admin can perform.</p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleSaveAdminPerms}
                disabled={savingAdminPerms}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Crown className="w-4 h-4" />
                <span>{savingAdminPerms ? 'Saving…' : 'Save Admin Permissions'}</span>
              </button>

              {adminModalUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleDemoteAdmin(adminModalUser)}
                  disabled={savingAdminPerms}
                  className="py-3 px-4 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs transition cursor-pointer"
                >
                  Demote to User
                </button>
              )}

              <button
                type="button"
                onClick={() => setAdminModalUser(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Back-compat: existing imports of `AdminDashboard` keep working. */
export const AdminDashboard = AdminDashboardModal;
export default AdminDashboardModal;

// ---------------------------------------------------------------------
// small presentational helpers
// ---------------------------------------------------------------------
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold">{value || 'Not provided'}</p>
    </div>
  );
}

function Avatar({ user }: { user: AdminUserRecord }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-sm font-black shrink-0">
      {(user.name || user.username || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function Pill({ tone, children }: { tone: 'purple' | 'amber' | 'blue' | 'red'; children: React.ReactNode }) {
  const tones = {
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

function ActionBtn({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
        danger
          ? 'border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
