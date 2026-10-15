import React, { useMemo, useState } from 'react';
import { X, Search, ShieldCheck, Clock, XCircle } from 'lucide-react';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface BusinessAccount {
  id: string;
  name: string;
  category?: string;
  address?: string;
  description?: string;
  ownerId?: string;
  verified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationNote?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface AdminDashboardProps {
  businesses: BusinessAccount[];
  onClose: () => void;
  showToast?: (message: string) => void;
  onUpdateBusiness?: (
    businessId: string,
    updates: Partial<BusinessAccount>
  ) => void;
}

export function AdminDashboard({
  businesses,
  onClose,
  showToast,
  onUpdateBusiness,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] =
    useState<VerificationStatus>('pending');

  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessAccount | null>(null);

  const [rejectReason, setRejectReason] = useState('');

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return businesses.filter((business) => {
      const status =
        business.verificationStatus ||
        (business.verified ? 'approved' : 'pending');

      const matchesStatus = status === activeTab;

      const matchesSearch =
        !query ||
        business.name.toLowerCase().includes(query) ||
        business.category?.toLowerCase().includes(query) ||
        business.address?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [businesses, activeTab, search]);

  const updateBusiness = (
    business: BusinessAccount,
    updates: Partial<BusinessAccount>
  ) => {
    if (onUpdateBusiness) {
      onUpdateBusiness(business.id, updates);
    }

    setSelectedBusiness(null);

    showToast?.('Business updated successfully.');
  };

  const approveBusiness = (business: BusinessAccount) => {
    updateBusiness(business, {
      verified: true,
      verificationStatus: 'approved',
      verificationNote: '',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'admin',
    });
  };

  const rejectBusiness = (business: BusinessAccount) => {
    const reason = rejectReason.trim();

    if (!reason) {
      showToast?.('Please enter a rejection reason.');
      return;
    }

    updateBusiness(business, {
      verified: false,
      verificationStatus: 'rejected',
      verificationNote: reason,
      verifiedAt: undefined,
      verifiedBy: 'admin',
    });

    setRejectReason('');
  };

  const counts = {
    pending: businesses.filter(
      (business) =>
        (business.verificationStatus ||
          (business.verified ? 'approved' : 'pending')) === 'pending'
    ).length,

    approved: businesses.filter(
      (business) =>
        (business.verificationStatus ||
          (business.verified ? 'approved' : 'pending')) === 'approved'
    ).length,

    rejected: businesses.filter(
      (business) =>
        (business.verificationStatus ||
          (business.verified ? 'approved' : 'pending')) === 'rejected'
    ).length,
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                RADA Admin
              </p>

              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Business Verification
              </h1>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('pending')}
              className="rounded-xl border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <Clock className="w-5 h-5 text-amber-500 mb-2" />
              <p className="text-2xl font-black">{counts.pending}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className="rounded-xl border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500 mb-2" />
              <p className="text-2xl font-black">{counts.approved}</p>
              <p className="text-xs text-slate-500">Approved</p>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className="rounded-xl border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <XCircle className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-2xl font-black">{counts.rejected}</p>
              <p className="text-xs text-slate-500">Rejected</p>
            </button>
          </div>

          {/* SEARCH */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search businesses..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* BUSINESS LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredBusinesses.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  No {activeTab} businesses
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Businesses will appear here when they match this status.
                </p>
              </div>
            ) : (
              filteredBusinesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => setSelectedBusiness(business)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {business.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {business.category || 'Business'}{' '}
                        {business.address
                          ? `• ${business.address}`
                          : ''}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                      {activeTab}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {selectedBusiness && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase text-purple-600">
                  Review Business
                </p>

                <h2 className="text-lg font-black">
                  {selectedBusiness.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedBusiness(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Category</p>
                <p className="font-semibold">
                  {selectedBusiness.category || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-semibold">
                  {selectedBusiness.address || 'Not provided'}
                </p>
              </div>

              {selectedBusiness.description && (
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-sm">
                    {selectedBusiness.description}
                  </p>
                </div>
              )}

              {selectedBusiness.verificationNote && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                  <p className="text-xs font-bold text-red-600">
                    Previous verification note
                  </p>
                  <p className="text-sm mt-1">
                    {selectedBusiness.verificationNote}
                  </p>
                </div>
              )}

              {/* REJECTION */}
              {activeTab === 'pending' && (
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="If rejecting, enter the reason..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              )}

              <div className="flex gap-3 pt-2">
                {activeTab === 'pending' && (
                  <>
                    <button
                      onClick={() => approveBusiness(selectedBusiness)}
                      className="flex-1 rounded-xl bg-emerald-600 text-white py-3 font-bold hover:bg-emerald-700"
                    >
                      Approve Business
                    </button>

                    <button
                      onClick={() => rejectBusiness(selectedBusiness)}
                      className="flex-1 rounded-xl bg-red-600 text-white py-3 font-bold hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}

                {activeTab !== 'pending' && (
                  <button
                    onClick={() => setSelectedBusiness(null)}
                    className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-bold"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    }
