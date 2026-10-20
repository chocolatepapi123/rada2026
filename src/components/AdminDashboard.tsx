import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Search, ShieldCheck, Clock, XCircle, RefreshCw, LayoutDashboard, MapPinPlus, Users,
  BadgeCheck, Crown, Trash2, Ban, UserX, Store, Sparkles, CircleDollarSign,
} from 'lucide-react';
import type {
  BusinessAccount, SpotItem, AdminUserRecord, PlatformStats, SubscriptionStatus,
} from '../types';
import { AdminSpotPublisher } from './MerchantHubTab';
import {
  fetchPlatformStats, fetchAdminUsers, setUserSuspension, revokeCreatorStatus,
  revokeBusinessStatus, deleteAccountAdmin, setBusinessSubscription, publishAdminSpot,
  fetchUnclaimedSpots, deleteListing, reviewBusiness,
} from '../lib/cloudSync';

type VerificationStatus = 'pending' | 'approved' | 'rejected';
type TabId = 'overview' | 'verification' | 'spots' | 'users';

export interface AdminDashboardProps {
  businesses: BusinessAccount[];
  onClose: () => void;
  onRefresh?: () => void;
  showToast?: (message: string) => void;
  /** Persist a business update (the app's existing handler). Falls back to cloudSync.reviewBusiness. */
  onUpdateBusiness?: (businessId: string, updates: Partial<BusinessAccount>) => void;
  /** Called after an unclaimed spot is saved, so the app can add it to local state straight away. */
  onSpotPublished?: (spot: SpotItem) => void;
  /** Called after an unclaimed spot is deleted. */
  onSpotDeleted?: (spotId: number | string) => void;
  /** Signed-in admin's user id (stamped on the spot as merchantId). */
  adminUserId?: string;
  /** Local counts, used while the live platform stats are still loading or unavailable. */
  spotsCount?: number;
  eventsCount?: number;
}

const SUB_STATUSES: SubscriptionStatus[] = ['none', 'active', 'trialing', 'past_due', 'canceled'];

const statusOf = (b: BusinessAccount): VerificationStatus =>
  b.verificationStatus || (b.verified ? 'approved' : 'pending');

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500';
const chipBase = 'px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer whitespace-nowrap';

export function AdminDashboardModal({
  businesses, onClose, onRefresh, showToast, onUpdateBusiness,
  onSpotPublished, onSpotDeleted, adminUserId, spotsCount, eventsCount,
}: AdminDashboardProps) {
  const toast = useCallback((m: string) => showToast?.(m), [showToast]);

  const [tab, setTab] = useState<TabId>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- live data ----
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[] | null>(null);
  const [usersError, setUsersError] = useState(false);
  const [unclaimed, setUnclaimed] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    const [s, u, sp] = await Promise.all([
      fetchPlatformStats(),
      fetchAdminUsers(businesses),
      fetchUnclaimedSpots(),
    ]);
    setStats(s);
    setUsers(u);
    setUsersError(u === null);
    setUnclaimed(sp || []);
  }, [businesses]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const refresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();
    await loadAll();
    toast('Admin data refreshed.');
    setIsRefreshing(false);
  };

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
      if (err) { toast(err); return; }
      onRefresh?.();
    }
    setSelectedBiz(null);
    setRejectReason('');
    toast(msg);
  };

  const approve = (b: BusinessAccount) =>
    saveBusiness(b, {
      verified: true, verificationStatus: 'approved', verificationNote: '',
      verifiedAt: new Date().toISOString(), verifiedBy: 'admin',
    }, `${b.name} approved and verified.`);

  const reject = (b: BusinessAccount) => {
    const reason = rejectReason.trim();
    if (!reason) { toast('Please enter a rejection reason.'); return; }
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

  const changeSubscription = async (b: BusinessAccount, status: SubscriptionStatus) => {
    const err = await setBusinessSubscription(b.id, {
      status, plan: b.subscriptionPlan, amount: b.subscriptionAmount, renewsAt: b.subscriptionRenewsAt,
    });
    if (err) { toast(err); return; }
    setSubOverride(o => ({ ...o, [b.id]: status }));
    toast(`Subscription set to ${status.replace('_', ' ')}.`);
  };

  // =====================================================================
  // UNCLAIMED SPOTS
  // =====================================================================
  const [showSpotForm, setShowSpotForm] = useState(false);

  const publishFromForm = async (spot: SpotItem): Promise<string | null> => {
    const err = await publishAdminSpot(spot);
    if (err) return err;
    const stamped: SpotItem = { ...spot, businessId: undefined, is_claimed: false, isAdminPublished: true, isUserUploaded: false };
    onSpotPublished?.(stamped);
    setUnclaimed(list => [stamped, ...list]);
    void fetchPlatformStats().then(setStats);
    return null;
  };

  const removeSpot = async (s: any) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    const err = await deleteListing('spot', s.id);
    if (err) { toast(err); return; }
    setUnclaimed(list => list.filter(x => String(x.id) !== String(s.id)));
    onSpotDeleted?.(s.id);
    toast('Spot deleted.');
  };

  // =====================================================================
  // USERS
  // =====================================================================
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'merchants' | 'hosts' | 'suspended'>('all');
  const [action, setAction] = useState<null | { kind: 'suspend' | 'unsuspend' | 'revokeHost' | 'revokeBiz' | 'delete'; user: AdminUserRecord }>(null);
  const [actionText, setActionText] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return (users || []).filter(u => {
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
    if (kind === 'delete' && actionText.trim() !== 'DELETE') { toast('Type DELETE to confirm.'); return; }
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
    if (err) { toast(err); return; }
    toast(msg);
    closeAction();
    setUsers(await fetchAdminUsers(businesses));
    void fetchPlatformStats().then(setStats);
  };

  // =====================================================================
  // OVERVIEW DERIVED
  // =====================================================================
  const paidBusinesses = useMemo(
    () => businesses.filter(b => subOf(b) === 'active'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businesses, subOverride]
  );
  const monthlyRevenue = paidBusinesses.reduce((sum, b) => sum + (b.subscriptionAmount || 0), 0);
  const activeHosts = (users || []).filter(u => u.isCreator && !u.isSuspended);
  const num = (live: number | null | undefined, fallback?: number) =>
    live ?? fallback ?? '–';

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'verification', label: 'Businesses', icon: <BadgeCheck className="w-4 h-4" />, badge: counts.pending },
    { id: 'spots', label: 'Add Unclaimed Spot', icon: <MapPinPlus className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  ];

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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-purple-600">RADA Admin</p>
                <h1 className="text-lg font-black leading-tight truncate">👑 Admin Control Hub</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Refresh from Supabase"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Total users" value={num(stats?.totalUsers)} icon={<Users className="w-5 h-5" />} />
                    <StatCard label="Total spots" value={num(stats?.totalSpots, spotsCount)} icon={<MapPinPlus className="w-5 h-5" />} />
                    <StatCard label="Total events" value={num(stats?.totalEvents, eventsCount)} icon={<Sparkles className="w-5 h-5" />} />
                    <StatCard label="Businesses" value={num(stats?.totalBusinesses, businesses.length)} icon={<Store className="w-5 h-5" />} />
                    <StatCard label="Pro hosts" value={num(stats?.professionalHosts)} icon={<Crown className="w-5 h-5" />} />
                    <StatCard label="Unclaimed spots" value={num(stats?.unclaimedSpots, unclaimed.length)} icon={<MapPinPlus className="w-5 h-5" />} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black">Active paid business accounts ({paidBusinesses.length})</h2>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <CircleDollarSign className="w-4 h-4" />
                      {monthlyRevenue > 0 ? `KES ${monthlyRevenue.toLocaleString()} / mo recorded` : 'No amounts recorded'}
                    </span>
                  </div>
                  {paidBusinesses.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      No business has an active subscription yet. Set one from a business's review panel.
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
                    <h2 className="text-sm font-black">Publish an unclaimed spot</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Same form merchants use: every category, subcategory, menu and photo option. It goes live
                      with no business account, and merchants can search for it and claim it later.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSpotForm(true)}
                    className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-3 font-bold flex items-center justify-center gap-2"
                  >
                    <MapPinPlus className="w-4 h-4" /> Add unclaimed spot
                  </button>
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-black">Waiting to be claimed ({unclaimed.length})</h2>
                  {unclaimed.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                      No unclaimed spots yet.
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
            {tab === 'users' && (
              <div className="p-4 space-y-3">
                <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Search name, @username, email or ID..." />
                <div className="flex gap-2 overflow-x-auto">
                  {([['all', 'All'], ['merchants', 'Merchants'], ['hosts', 'Pro hosts'], ['suspended', 'Suspended']] as const).map(([id, label]) => (
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
                  const locked = u.role === 'admin';
                  return (
                    <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{u.name || u.username || 'Unnamed'}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {[u.username && `@${u.username}`, u.email].filter(Boolean).join(' • ') || u.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {u.role === 'admin' && <Pill tone="purple">Admin</Pill>}
                          {u.isMerchant && <Pill tone="amber">Merchant</Pill>}
                          {u.isCreator && <Pill tone="blue">Pro host</Pill>}
                          {u.isSuspended && <Pill tone="red">Suspended</Pill>}
                        </div>
                      </div>
                      {u.isSuspended && u.suspendedReason && (
                        <p className="text-xs text-red-600 dark:text-red-400">Reason: {u.suspendedReason}</p>
                      )}
                      {!locked && (
                        <div className="flex flex-wrap gap-2">
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN SPOT PUBLISHER (merchant spot form in admin mode) */}
      {showSpotForm && (
        <AdminSpotPublisher
          adminUserId={adminUserId || ''}
          onPublish={publishFromForm}
          onClose={() => setShowSpotForm(false)}
          showToast={toast}
        />
      )}

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

              <label className="block">
                <span className="text-xs text-slate-500">Subscription</span>
                <select
                  className={inputCls}
                  value={subOf(selectedBiz)}
                  onChange={e => changeSubscription(selectedBiz, e.target.value as SubscriptionStatus)}
                >
                  {SUB_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </label>

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
