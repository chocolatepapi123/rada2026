import React, { useState } from 'react';
import { AlertTriangle, Trash2, Ban, ShieldCheck, X, Check, ShieldAlert } from 'lucide-react';

export type AdminActionType = 'delete_account' | 'suspend_account' | 'unsuspend_account' | 'revoke_business' | 'delete_status' | 'delete_spot';

export interface AdminTargetAccount {
  id: string;
  name: string;
  handle?: string;
  email?: string;
  role?: string;
  isMerchant?: boolean;
  isSuspended?: boolean;
  businessName?: string;
}

interface AdminConfirmModalProps {
  isOpen: boolean;
  actionType: AdminActionType;
  target: AdminTargetAccount;
  onClose: () => void;
  onConfirm: (target: AdminTargetAccount, reason?: string) => Promise<void> | void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  actionType,
  target,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Violation of community standards');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isPermanentDelete = actionType === 'delete_account';
  const isDeleteRequirementMet = !isPermanentDelete || deleteConfirmationText.trim() === 'DELETE';

  const handleExecute = async () => {
    if (isPermanentDelete && deleteConfirmationText.trim() !== 'DELETE') {
      setErrorMsg('Please type DELETE in capital letters to confirm account deletion.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onConfirm(target, reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionConfig = () => {
    switch (actionType) {
      case 'delete_account':
        return {
          title: 'Permanently Delete Account',
          icon: Trash2,
          iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          description: 'This will permanently delete this account, along with all associated spots, listings, reviews, and profile data from RADA. This action is irreversible.',
          requiresReason: false,
          requiresTypeDelete: true,
        };
      case 'suspend_account':
        return {
          title: 'Suspend Account Access',
          icon: Ban,
          iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
          description: 'This will immediately revoke login access and hide user activity. The user will be shown this suspension reason upon opening the app.',
          requiresReason: true,
          requiresTypeDelete: false,
        };
      case 'unsuspend_account':
        return {
          title: 'Reinstate / Unsuspend Account',
          icon: ShieldCheck,
          iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          description: 'This will lift the suspension and restore normal login access for this account.',
          requiresReason: false,
          requiresTypeDelete: false,
        };
      case 'revoke_business':
        return {
          title: 'Revoke Merchant / Business Status',
          icon: ShieldAlert,
          iconBg: 'bg-orange-100 text-[#E0533C] dark:bg-orange-950/60 dark:text-orange-400',
          confirmBtn: 'bg-[#E0533C] hover:bg-orange-700 text-white',
          description: 'This will revoke official verification and business storefront privileges for this merchant.',
          requiresReason: true,
          requiresTypeDelete: false,
        };
      case 'delete_status':
        return {
          title: 'Delete Community Status Post',
          icon: Trash2,
          iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          description: 'Remove this status broadcast and its replies immediately from the community feed.',
          requiresReason: false,
          requiresTypeDelete: false,
        };
      case 'delete_spot':
        return {
          title: 'Delete Venue / Spot Listing',
          icon: Trash2,
          iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          description: 'Permanently remove this spot listing from the directory and map.',
          requiresReason: false,
          requiresTypeDelete: false,
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="bg-white dark:bg-[#1C1A1E] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {config.title}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                👑 Admin Security Confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Card */}
        <div className="bg-slate-50 dark:bg-[#121113] p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Target Account
          </span>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                {target.name || target.businessName || 'User Account'}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {target.handle || target.email || target.id}
              </p>
            </div>
            {target.role && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                {target.role}
              </span>
            )}
          </div>
        </div>

        {/* Description / Warning */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {config.description}
        </p>

        {/* Reason Selector for Suspension or Revocation */}
        {config.requiresReason && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Reason for action:
            </label>
            <div className="space-y-1.5">
              {[
                'Violation of community standards',
                'Spam or fake profile activity',
                'Inappropriate / offensive content',
                'Fraudulent business representation',
                'Repeated user reports',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    reason === preset
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-white dark:bg-[#1C1A1E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Or type custom reason..."
                className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* High security guard for Account Deletion */}
        {config.requiresTypeDelete && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60">
            <label className="text-[11px] font-black text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Type "DELETE" to confirm irreversible erasure:</span>
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => {
                setDeleteConfirmationText(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-white dark:bg-[#1C1A1E] border border-red-300 dark:border-red-800 rounded-xl text-xs font-black tracking-widest text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
            />
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400 font-bold">
            {errorMsg}
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !isDeleteRequirementMet}
            onClick={handleExecute}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${config.confirmBtn}`}
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm {actionType === 'delete_account' ? 'Deletion' : 'Action'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
