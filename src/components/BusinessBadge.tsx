import React, { createContext, useContext, useMemo } from 'react';
import { Crown, Sparkles, Store } from 'lucide-react';
import type { BusinessAccount } from '../types.ts';
import MerchantVerificationBadge from './MerchantVerificationBadge.tsx';
import {
  TIER_BADGE_LABEL,
  tierBadgeFor,
  usePublicTiers,
  type PublicTiers,
  type SubKind,
  type TierBadgeKind,
} from '../lib/subscriptions';

/** A business counts as verified only when RADA admin has approved it. */
export function isBusinessApproved(business?: BusinessAccount | null): boolean {
  if (!business) return false;
  return business.verificationStatus
    ? business.verificationStatus === 'approved'
    : !!business.verified;
}

// ---------------------------------------------------------------------------
// Premium tier badges: Creator, Golden Creator, Business, Golden Featured
// ---------------------------------------------------------------------------
const TIER_STYLE: Record<TierBadgeKind, { cls: string; Icon: React.ElementType }> = {
  creator: { cls: 'bg-[#E0533C]/10 text-[#E0533C] dark:text-[#D17A68]', Icon: Sparkles },
  golden_creator: { cls: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-sm shadow-amber-500/30', Icon: Crown },
  business: { cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', Icon: Store },
  golden_featured: { cls: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-sm shadow-amber-500/30', Icon: Crown },
};

const TIER_SIZE = {
  xs: { box: 'h-5 px-1.5 gap-1 text-[10px]', icon: 'w-3 h-3', solo: 'w-5 h-5' },
  sm: { box: 'h-6 px-2.5 gap-1.5 text-[11px]', icon: 'w-3.5 h-3.5', solo: 'w-6 h-6' },
  md: { box: 'h-7 px-3 gap-1.5 text-xs', icon: 'w-4 h-4', solo: 'w-7 h-7' },
} as const;

export interface TierBadgeProps {
  badge: TierBadgeKind;
  size?: keyof typeof TIER_SIZE;
  /** Icon only (used where space is tight, e.g. listing cards). */
  iconOnly?: boolean;
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ badge, size = 'sm', iconOnly = false, className = '' }) => {
  const { cls, Icon } = TIER_STYLE[badge];
  const sz = TIER_SIZE[size];
  const label = TIER_BADGE_LABEL[badge];
  if (iconOnly) {
    return (
      <span
        title={label}
        aria-label={label}
        className={`inline-flex items-center justify-center rounded-full shrink-0 ${sz.solo} ${cls} ${className}`}
      >
        <Icon className={sz.icon} />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full font-extrabold whitespace-nowrap shrink-0 ${sz.box} ${cls} ${className}`}>
      <Icon className={sz.icon} />
      <span>{label}</span>
    </span>
  );
};

interface PublicTierBadgesProps {
  tiers?: PublicTiers;
  /** Which account kinds to show. Defaults to both. */
  kinds?: SubKind[];
  size?: keyof typeof TIER_SIZE;
  /** Merchant badges only show for an approved business. */
  merchantApproved?: boolean;
  className?: string;
}

/** Renders whichever of Creator / Golden Creator / Business / Golden Featured the account has earned. */
export const PublicTierBadges: React.FC<PublicTierBadgesProps> = ({
  tiers,
  kinds = ['creator', 'merchant'] as SubKind[],
  size = 'sm',
  merchantApproved = true,
  className = '',
}) => {
  if (!tiers) return null;
  const badges = kinds
    .filter((k) => k !== 'merchant' || merchantApproved)
    .map((k) => tierBadgeFor(k, tiers[k]))
    .filter(Boolean) as TierBadgeKind[];
  if (badges.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      {badges.map((b) => (
        <TierBadge key={b} badge={b} size={size} />
      ))}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Context: businesses + the public tier of each owner (one batched lookup)
// ---------------------------------------------------------------------------
interface BusinessesContextValue {
  businesses: BusinessAccount[];
  tiers: Record<string, PublicTiers>;
}

const BusinessesContext = createContext<BusinessesContextValue>({ businesses: [], tiers: {} });

export function BusinessesProvider({
  businesses,
  children,
}: {
  businesses: BusinessAccount[];
  children: React.ReactNode;
}) {
  const ownerIds = useMemo(
    () => businesses.map((b) => b.ownerId).filter(Boolean) as string[],
    [businesses]
  );
  const tiers = usePublicTiers(ownerIds);
  const value = useMemo(() => ({ businesses, tiers }), [businesses, tiers]);
  return <BusinessesContext.Provider value={value}>{children}</BusinessesContext.Provider>;
}

/** Merchant tier of a business (its owner's live plan), or undefined when Free / unknown. */
export function useBusinessTier(businessId?: string) {
  const { businesses, tiers } = useContext(BusinessesContext);
  const biz = businessId ? businesses.find((b) => b.id === businessId) : undefined;
  return {
    approved: isBusinessApproved(biz),
    plan: biz?.ownerId ? tiers[biz.ownerId]?.merchant : undefined,
  };
}

interface BusinessBadgeProps {
  businessId?: string;
  category: string;
  size?: 'xs' | 'sm' | 'md';
  /** Used only when the item has no business attached (e.g. built-in RADA listings). */
  unclaimedVerified?: boolean;
}

/**
 * Shows the RADA verification badge ONLY if the item's business is approved.
 * Approved businesses on the Elite plan get the Golden Featured badge instead.
 * Pending, rejected, or not-visible businesses get no badge.
 */
export function BusinessBadge({
  businessId,
  category,
  size = 'xs',
  unclaimedVerified = false,
}: BusinessBadgeProps) {
  const { businesses, tiers } = useContext(BusinessesContext);

  const biz = businessId ? businesses.find((b) => b.id === businessId) : undefined;
  const show = businessId ? isBusinessApproved(biz) : unclaimedVerified;

  if (!show) return null;

  const merchantPlan = biz?.ownerId ? tiers[biz.ownerId]?.merchant : undefined;
  if (merchantPlan === 'elite') {
    return <TierBadge badge="golden_featured" size={size} iconOnly={size === 'xs'} />;
  }
  return <MerchantVerificationBadge category={category} size={size} />;
}
