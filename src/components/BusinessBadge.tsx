import React, { createContext, useContext } from 'react';
import type { BusinessAccount } from '../types.ts';
import MerchantVerificationBadge from './MerchantVerificationBadge.tsx';

/** A business counts as verified only when RADA admin has approved it. */
export function isBusinessApproved(business?: BusinessAccount | null): boolean {
  if (!business) return false;
  return business.verificationStatus
    ? business.verificationStatus === 'approved'
    : !!business.verified;
}

const BusinessesContext = createContext<BusinessAccount[]>([]);

export function BusinessesProvider({
  businesses,
  children,
}: {
  businesses: BusinessAccount[];
  children: React.ReactNode;
}) {
  return <BusinessesContext.Provider value={businesses}>{children}</BusinessesContext.Provider>;
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
 * Pending, rejected, or not-visible businesses get no badge.
 */
export function BusinessBadge({
  businessId,
  category,
  size = 'xs',
  unclaimedVerified = false,
}: BusinessBadgeProps) {
  const businesses = useContext(BusinessesContext);

  const show = businessId
    ? isBusinessApproved(businesses.find((b) => b.id === businessId))
    : unclaimedVerified;

  if (!show) return null;
  return <MerchantVerificationBadge category={category} size={size} />;
}
