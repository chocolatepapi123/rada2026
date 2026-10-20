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

export function useBusinesses(): BusinessAccount[] {
  return useContext(BusinessesContext);
}

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
  onClick?: (business: BusinessAccount) => void;
  className?: string;
}

/**
 * Shows the RADA verification badge ONLY if the item's business is approved.
 * Pending, rejected, or not-visible businesses get no badge.
 * If onClick is passed or business is found, clicking can open the full-screen profile.
 */
export function BusinessBadge({
  businessId,
  category,
  size = 'xs',
  unclaimedVerified = false,
  onClick,
  className = ''
}: BusinessBadgeProps) {
  const businesses = useContext(BusinessesContext);
  const matchedBiz = businessId ? businesses.find((b) => b.id === businessId) : null;

  const show = businessId
    ? isBusinessApproved(matchedBiz)
    : unclaimedVerified;

  if (!show) return null;

  if (onClick && matchedBiz) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(matchedBiz);
        }}
        className={`inline-flex items-center hover:opacity-85 transition cursor-pointer ${className}`}
        title={`View ${matchedBiz.name} profile`}
      >
        <MerchantVerificationBadge category={category} size={size} />
      </button>
    );
  }

  return (
    <span className={className}>
      <MerchantVerificationBadge category={category} size={size} />
    </span>
  );
}

export default BusinessBadge;
