import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  Building2,
  ChevronLeft,
  Search
} from 'lucide-react';
import { BusinessAccount } from '../types.ts';

interface AdminDashboardProps {
  businesses: BusinessAccount[];
  onUpdateBusiness: (business: BusinessAccount) => void;
  onClose: () => void;
  showToast: (message: string) => void;
}

export function AdminDashboard({
  businesses,
  onUpdateBusiness,
  onClose,
  showToast
}: AdminDashboardProps) {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessAccount | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const status =
        business.verificationStatus ||
        (business.verified ? 'approved' : 'pending');

      const matchesStatus = status === filter;

      const query = search.toLowerCase();

      const matchesSearch =
        !query ||
        business.name.toLowerCase().includes(query) ||
        business.neighborhood.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [businesses, filter, search]);

  const pendingCount = businesses.filter(
    b => (b.verificationStatus || (b.verified ? 'approved' : 'pending')) === 'pending'
  ).length;

  const approvedCount = businesses.filter(
    b => (b.verificationStatus || (b.verified ? 'approved' : 'pending')) === 'approved'
  ).length;

  const rejectedCount = businesses.filter(
    b => (b.verificationStatus || (b.verified ? 'approved' : 'pending')) === 'rejected'
  ).length;

  const approveBusiness = (business: BusinessAccount) => {
    const updated: BusinessAccount = {
      ...business,
      verified: true,
      verificationStatus: 'approved',
      verificationNote: undefined,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'admin'
    };

    onUpdateBusiness(updated);
    setSelectedBusiness(null);
    showToast(`${business.name} is now verified.`);
  };

  const rejectBusiness = (business: BusinessAccount) => {
    if (!rejectionReason.trim()) {
      showToast('Add a reason before rejecting this business.');
      return;
    }

    const updated: BusinessAccount = {
      ...business,
      verified: false,
      verificationStatus: 'rejected',
      verificationNote: rejectionReason.trim(),
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'admin'
    };

    onUpdateBusiness(updated);
    setSelectedBusiness(null);
    setRejectionReason('');
    showToast(`${business.name} was rejected.`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f8f6] dark:bg-[#121113] overflow-y-auto">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#f8f8f6]/95 dark:bg-[#121113]/95 backdrop-blur-md border-b border-slate-200 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                RADA Admin
              </p>
              <h1 className="text-xl font-black">
                Admin Dashboard
              </h1>
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">

          <button
            onClick={() => setFilter('pending')}
            className="rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 p-4 text-left"
          >
            <Clock3 className="w-5 h-5 mb-2 text-amber-500" />
            <p className="text-2xl font-black">{pendingCount}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </button>

          <button
            onClick={() => setFilter('approved')}
            className="rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 p-4 text-left"
          >
            <CheckCircle2 className="w-5 h-5 mb-2 text-emerald-500" />
            <p className="text-2xl font-black">{approvedCount}</p>
            <p className="text-xs text-slate-500">Approved</p>
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className="rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 p-4 text-left"
          >
            <XCircle className="w-5 h-5 mb-2 text-red-500" />
            <p className="text-2xl font-black">{rejectedCount}</p>
            <p className="text-xs text-slate-500">Rejected</p>
          </button>

        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-sm outline-none"
          />
        </div>

        {/* Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black capitalize">
            {filter} Businesses
          </h2>

          <span className="text-xs text-slate-400">
            {filteredBusinesses.length} result{filteredBusinesses.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Business list */}
        <div className="space-y-3">

          {filteredBusinesses.map((business) => (
            <button
              key={business.id}
              onClick={() => setSelectedBusiness(business)}
              className="w-full text-left rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 p-4 hover:border-slate-400 dark:hover:border-stone-600 transition"
            >
              <div className="flex items-center gap-3">

                <img
                  src={business.logo}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold truncate">
                    {business.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {business.neighborhood} · {business.category}
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    Submitted {business.createdDate}
                  </p>
                </div>

                <Building2 className="w-5 h-5 text-slate-400" />

              </div>
            </button>
          ))}

          {filteredBusinesses.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              No businesses in this queue.
            </div>
          )}

        </div>
      </main>

      {/* Review Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-stone-900 rounded-3xl shadow-2xl">

            <div className="p-5 border-b border-slate-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBusiness.logo}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover"
                />

                <div>
                  <h2 className="text-xl font-black">
                    {selectedBusiness.name}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {selectedBusiness.category}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Business Description
                </p>
                <p className="text-sm mt-1">
                  {selectedBusiness.bio || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-50 dark:bg-stone-800 p-3">
                  <p className="text-[10px] text-slate-400">Phone</p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedBusiness.phone}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-stone-800 p-3">
                  <p className="text-[10px] text-slate-400">Email</p>
                  <p className="text-sm font-semibold mt-1 break-all">
                    {selectedBusiness.email}
                  </p>
                </div>

              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-stone-800 p-3">
                <p className="text-[10px] text-slate-400">Location</p>
                <p className="text-sm font-semibold mt-1">
                  {selectedBusiness.address}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedBusiness.neighborhood}
                </p>
              </div>

              {selectedBusiness.verificationStatus === 'rejected' && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    Previous rejection
                  </p>
                  <p className="text-sm mt-1">
                    {selectedBusiness.verificationNote}
                  </p>
                </div>
              )}

              {filter === 'pending' && (
                <>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="If rejecting, explain what the merchant needs to fix..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm outline-none resize-none"
                  />

                  <div className="grid grid-cols-2 gap-3">

                    <button
                      onClick={() => rejectBusiness(selectedBusiness)}
                      className="py-3 rounded-xl border border-red-200 text-red-600 font-bold"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => approveBusiness(selectedBusiness)}
                      className="py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                    >
                      Verify Business
                    </button>

                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setSelectedBusiness(null);
                  setRejectionReason('');
                }}
                className="w-full py-3 text-sm text-slate-500"
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
