import React from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { ProfessionalStatus } from '../utils/professionalAccount';

interface VerifiedBadgeProps {
  status: ProfessionalStatus;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

const SIZES = { xs: 'w-3.5 h-3.5', sm: 'w-4 h-4', md: 'w-5 h-5' } as const;

/** Blue check = approved professional account. Amber clock = application under review. */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ status, size = 'sm', showLabel = false }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 shrink-0" title="Verified professional account">
        <BadgeCheck className={`${SIZES[size]} text-white fill-[#1D9BF0]`} aria-label="Verified" />
        {showLabel && <span className="text-[10px] font-black text-[#1D9BF0]">Verified</span>}
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 shrink-0" title="Professional account under review">
        <Clock className={`${SIZES[size]} text-amber-500`} aria-label="Under review" />
        {showLabel && <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">Under review</span>}
      </span>
    );
  }
  return null;
};
