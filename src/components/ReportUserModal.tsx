import React, { useEffect, useState } from 'react';
import { X, Flag, Loader2, ShieldAlert } from 'lucide-react';
import {
  REPORT_REASONS,
  reportUser,
  blockUser,
  type ReportReason,
  type ReportContext,
} from '../lib/safety';

interface ReportUserModalProps {
  open: boolean;
  onClose: () => void;
  /** Supabase user id of the person being reported or blocked. */
  targetId?: string;
  /** Shown to the reporter, for example "@new_user_12". */
  targetHandle: string;
  context?: ReportContext;
  contextId?: string;
  /** Called after the person was blocked, so the parent can close the profile or chat. */
  onBlocked?: () => void;
  showToast: (msg: string, options?: any) => void;
  onOpenSos?: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  open,
  onClose,
  targetId,
  targetHandle,
  context = 'profile',
  contextId,
  onBlocked,
  showToast,
  onOpenSos,
}) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails('');
      setAlsoBlock(true);
      setBusy(false);
      setError('');
    }
  }, [open, targetId]);

  if (!open) return null;

  const cantAct = !targetId;

  async function submitReport() {
    if (!targetId || !reason) return;
    setBusy(true);
    setError('');
    const res = await reportUser({ reportedId: targetId, reason, details, context, contextId });
    if (!res.ok) {
      setBusy(false);
      setError(res.error || 'Could not send the report.');
      return;
    }
    if (alsoBlock) {
      const b = await blockUser(targetId);
      if (!b.ok) showToast(b.error || 'Report sent, but blocking failed.', { type: 'error' });
    }
    setBusy(false);
    showToast(
      alsoBlock
        ? `Thanks. Your report was sent and ${targetHandle} is blocked.`
        : 'Thanks. Your report was sent to the RADA team.'
    );
    onClose();
    if (alsoBlock) onBlocked?.();
  }

  async function blockOnly() {
    if (!targetId) return;
    setBusy(true);
    setError('');
    const b = await blockUser(targetId);
    setBusy(false);
    if (!b.ok) {
      setError(b.error || 'Could not block this person.');
      return;
    }
    showToast(`${targetHandle} is blocked. They can no longer find you or send you requests.`);
    onClose();
    onBlocked?.();
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Report ${targetHandle}`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-[#161316] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-base font-black flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#E0533C]" />
              <span className="truncate">Report {targetHandle}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Reports go to the RADA team. The person is not told who reported them.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {onOpenSos && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSos();
            }}
            className="w-full mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-left flex items-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">
              In danger right now? Open SOS instead.
            </span>
          </button>
        )}

        <div className="space-y-1.5">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                reason === r.id
                  ? 'border-[#E0533C] bg-[#E0533C]/5'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="mt-0.5 accent-[#E0533C]"
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold">{r.label}</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Add details (optional)"
          className="w-full mt-3 p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#0F0D10] border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#E0533C] resize-none"
        />

        <label className="flex items-center gap-2 mt-3 text-[11px] font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(e) => setAlsoBlock(e.target.checked)}
            className="w-4 h-4 accent-[#E0533C]"
          />
          <span>Also block {targetHandle}</span>
        </label>

        {error && <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
        {cantAct && (
          <p className="mt-3 text-[11px] font-semibold text-amber-600">
            This profile is not linked to an account yet, so it cannot be reported here.
          </p>
        )}

        <button
          type="button"
          onClick={submitReport}
          disabled={busy || cantAct || !reason}
          className="w-full mt-4 py-3 rounded-2xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
          <span>Send report</span>
        </button>
        <button
          type="button"
          onClick={blockOnly}
          disabled={busy || cantAct}
          className="w-full mt-2 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          Block only, without reporting
        </button>
      </div>
    </div>
  );
};
