import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Crown, Loader2, Lock, Store, X } from 'lucide-react';
import { planRank, type PlanId } from '../lib/subscriptions';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * Professional profile card + full profile page.
 * Used for host/creator accounts (UserProfileModal) and for businesses (Merchant Hub).
 * Viewing is open to every professional account; EDITING is only for the Pro and Elite plans.
 */

export const NAME_LIMIT = 40;
export const BIO_LIMIT = 300;

/** Pro and Elite can edit. Free can only look at the card. */
export const canEditProProfile = (plan?: PlanId | null): boolean => planRank(plan) >= 1;

const planLabel = (plan?: PlanId | null) => (plan === 'elite' ? 'Elite' : plan === 'pro' ? 'Pro' : 'Free');

export interface ProStat {
  label: string;
  value: number | string;
}

export interface ProListItem {
  id: string;
  title: string;
  meta?: string;
  image?: string;
}

interface CardProps {
  kind: 'creator' | 'business';
  name: string;
  /** @username for a host, category or area for a business */
  subtitle?: string;
  avatar?: string;
  bio?: string;
  plan?: PlanId | null;
  stats?: ProStat[];
  onOpen: () => void;
}

const initial = (s: string) => (s.trim()[0] || 'R').toUpperCase();

/** The tappable card. Opens the full profile page. */
export const ProProfileCard: React.FC<CardProps> = ({ kind, name, subtitle, avatar, bio, plan, stats = [], onOpen }) => {
  const editable = canEditProProfile(plan);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-3xl p-4 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt="" loading="lazy" className="w-14 h-14 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-black text-slate-500 shrink-0">
            {initial(name)}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-black truncate text-slate-900 dark:text-white">{name || (kind === 'business' ? 'Your business' : 'Your name')}</p>
            <VerifiedBadge status="approved" size="sm" golden={plan === 'elite'} />
          </div>
          {subtitle && <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
          <span
            className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
              editable
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {editable ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {editable ? planLabel(plan) : 'Pro & Elite'}
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
      </div>

      {bio ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">{bio}</p>
      ) : (
        <p className="mt-3 text-[12.5px] text-slate-400">{editable ? 'Add a bio so people know who you are.' : 'Upgrade to Pro or Elite to edit your profile.'}</p>
      )}

      {stats.length > 0 && (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))` }}>
          {stats.slice(0, 3).map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
              <p className="text-[15px] font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

interface PageProps {
  kind: 'creator' | 'business';
  plan?: PlanId | null;
  name: string;
  subtitle?: string;
  avatar?: string;
  bio?: string;
  /** Label for the name field: "Display name" for hosts, "Business name" for businesses. */
  nameLabel?: string;
  /** Saves name and bio. Resolve with an error message, or null when saved. */
  onSave: (v: { name: string; bio: string }) => Promise<string | null>;
  /** False hides the editor even on Pro/Elite (for example a team member who is not the owner). */
  allowEdit?: boolean;
  businesses?: ProListItem[];
  businessesTitle?: string;
  hosted?: ProListItem[];
  hostedTitle?: string;
  hostedEmpty?: string;
  onOpenBusiness?: (id: string) => void;
  onUpgrade?: () => void;
  onClose: () => void;
}

const fieldCls =
  'w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-[#E0533C] text-slate-900 dark:text-slate-100';

const ListSection: React.FC<{ title: string; icon: React.ReactNode; items: ProListItem[]; empty: string; onPick?: (id: string) => void }> = ({
  title,
  icon,
  items,
  empty,
  onPick,
}) => (
  <section className="rounded-3xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 overflow-hidden">
    <h4 className="px-4 pt-4 pb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
      {icon} {title} <span className="text-slate-400">({items.length})</span>
    </h4>
    {items.length === 0 ? (
      <p className="px-4 pb-4 text-[12px] font-semibold text-slate-400">{empty}</p>
    ) : (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              disabled={!onPick}
              onClick={() => onPick?.(it.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left disabled:cursor-default cursor-pointer"
            >
              {it.image ? (
                <img src={it.image} alt="" loading="lazy" className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0" />
              ) : (
                <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold truncate text-slate-900 dark:text-white">{it.title}</span>
                {it.meta && <span className="block text-[11px] font-semibold text-slate-500 truncate">{it.meta}</span>}
              </span>
              {onPick && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

/** Full-screen profile page. Editable on Pro and Elite, read-only with an upgrade prompt on Free. */
export const ProProfilePage: React.FC<PageProps> = ({
  kind,
  plan,
  name,
  subtitle,
  avatar,
  bio,
  nameLabel = 'Display name',
  onSave,
  allowEdit = true,
  businesses,
  businessesTitle = 'Businesses',
  hosted,
  hostedTitle = 'Events hosted',
  hostedEmpty = 'Nothing hosted yet.',
  onOpenBusiness,
  onUpgrade,
  onClose,
}) => {
  const planAllows = canEditProProfile(plan);
  const editable = planAllows && allowEdit;
  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  // Follow the stored values when they change (for example after a save elsewhere)
  useEffect(() => setDraftName(name), [name]);
  useEffect(() => setDraftBio(bio || ''), [bio]);

  const dirty = draftName.trim() !== name.trim() || draftBio.trim() !== (bio || '').trim();

  const save = async () => {
    if (!editable || saving) return;
    setSaving(true);
    setErr('');
    setSaved(false);
    const e = await onSave({ name: draftName.trim(), bio: draftBio.trim() });
    setSaving(false);
    if (e) setErr(e);
    else setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#F8F8F6] dark:bg-[#121113] text-slate-900 dark:text-slate-100 flex flex-col animate-in fade-in duration-150">
      <div className="px-3 py-3 bg-white dark:bg-[#1C1A1E] shadow-sm flex items-center gap-2 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <span className="w-9" />
        <h3 className="flex-1 text-center text-[15px] font-black tracking-tight">{kind === 'business' ? 'Business profile' : 'Professional profile'}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-32 max-w-lg w-full mx-auto">
        <div className="flex flex-col items-center text-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-24 h-24 rounded-3xl object-cover bg-slate-100 dark:bg-slate-800" />
          ) : (
            <span className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-black text-slate-500">{initial(name)}</span>
          )}
          <div className="mt-3 flex items-center gap-1.5">
            <h2 className="text-xl font-black tracking-tight">{name || (kind === 'business' ? 'Your business' : 'Your name')}</h2>
            <VerifiedBadge status="approved" size="md" golden={plan === 'elite'} />
          </div>
          {subtitle && <p className="text-[13px] font-semibold text-slate-500">{subtitle}</p>}
        </div>

        {!planAllows && (
          <div className="rounded-3xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-2">
            <p className="flex items-center gap-2 text-[13px] font-black text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4" /> Editing your profile is on Pro and Elite
            </p>
            <p className="text-[12px] font-semibold text-amber-900/80 dark:text-amber-200/80">
              Upgrade to change your {kind === 'business' ? 'business name' : 'display name'} and bio, and to manage your profile page.
            </p>
            {onUpgrade && (
              <button type="button" onClick={onUpgrade} className="px-4 py-2 rounded-xl bg-[#E0533C] text-white text-[12px] font-black cursor-pointer">
                See plans
              </button>
            )}
          </div>
        )}

        {planAllows && !allowEdit && (
          <p className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800/60 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
            Only the owner can edit this profile.
          </p>
        )}

        <section className="rounded-3xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1" htmlFor="pro-name">{nameLabel}</label>
            <input
              id="pro-name"
              value={draftName}
              onChange={(e) => { setDraftName(e.target.value.slice(0, NAME_LIMIT)); setSaved(false); }}
              disabled={!editable}
              maxLength={NAME_LIMIT}
              className={`${fieldCls} disabled:opacity-60`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1" htmlFor="pro-bio">Bio</label>
            <textarea
              id="pro-bio"
              value={draftBio}
              onChange={(e) => { setDraftBio(e.target.value.slice(0, BIO_LIMIT)); setSaved(false); }}
              disabled={!editable}
              rows={4}
              maxLength={BIO_LIMIT}
              placeholder={kind === 'business' ? 'What you do, what you are known for.' : 'Who you are and what you host.'}
              className={`${fieldCls} resize-none disabled:opacity-60`}
            />
            <p className="mt-1 text-right text-[10px] font-bold text-slate-400">{draftBio.length}/{BIO_LIMIT}</p>
          </div>
          {err && <p className="text-[12px] font-bold text-rose-600">{err}</p>}
          {saved && !dirty && <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">Saved.</p>}
        </section>

        {businesses && (
          <ListSection
            title={businessesTitle}
            icon={<Store className="w-3.5 h-3.5" />}
            items={businesses}
            empty="No businesses yet. Create one from the Merchant Hub."
            onPick={onOpenBusiness}
          />
        )}
        {hosted && <ListSection title={hostedTitle} icon={<CalendarDays className="w-3.5 h-3.5" />} items={hosted} empty={hostedEmpty} />}
      </div>

      {editable && (
        <div className="fixed bottom-0 left-0 right-0 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-white dark:bg-[#1C1A1E] shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || !draftName.trim()}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-[#E0533C] text-white font-black text-[13px] disabled:opacity-40 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </button>
        </div>
      )}
    </div>
  );
};
