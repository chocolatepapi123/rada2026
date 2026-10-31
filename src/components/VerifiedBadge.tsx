import React from 'react';
import { usePublicTiers } from '../lib/subscriptions';

/**
 * RADA verified host badge: a brand-orange shield with a spark star.
 * Replaces the generic blue/green checkmark everywhere a host is verified.
 *
 * status: only 'approved' (or 'verified') renders. Anything else renders nothing, so existing
 * call sites like <VerifiedBadge status={isPro ? 'approved' : 'none'} /> keep working.
 */
export type VerifiedBadgeStatus = 'approved' | 'verified' | 'pending' | 'none' | 'rejected' | string | undefined | null;

interface VerifiedBadgeProps {
  status?: VerifiedBadgeStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  /** Golden: verified AND on the Elite creator plan. Gold shield with a crown. */
  golden?: boolean;
}

const PX: Record<NonNullable<VerifiedBadgeProps['size']>, number> = { xs: 14, sm: 16, md: 20, lg: 30 };

// 5-point star centred in the shield
const STAR = (() => {
  const cx = 12, cy = 11.4, outer = 5.4, inner = 2.3;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
})();

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status = 'approved',
  size = 'sm',
  showLabel = false,
  label = 'Verified host',
  className = '',
  golden = false,
}) => {
  if (status !== 'approved' && status !== 'verified') return null;
  const px = PX[size] ?? PX.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}
      title={golden ? 'Golden verified RADA host' : 'Verified RADA host'}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        role="img"
        aria-label={golden ? 'Golden verified RADA host' : 'Verified RADA host'}
        className="shrink-0 bg-transparent"
      >
        {/* shield */}
        <path
          d="M12 1.6 20.6 4.7v6.6c0 5.2-3.6 9.2-8.6 11.3-5-2.1-8.6-6.1-8.6-11.3V4.7L12 1.6Z"
          fill={golden ? '#D99A1E' : '#E0533C'}
        />
        {/* soft light half for depth */}
        <path
          d="M12 1.6 3.4 4.7v6.6c0 5.2 3.6 9.2 8.6 11.3V1.6Z"
          fill="#FFFFFF"
          opacity="0.14"
        />
        {/* amber rim accent along the top edge */}
        <path d="M12 1.6 20.6 4.7v1.4L12 3 3.4 6.1V4.7L12 1.6Z" fill={golden ? '#FDE68A' : '#F4A261'} />
        {/* star */}
        {golden ? (
          /* crown */
          <path d="M7.2 14.6 6.4 8.6l3.1 2.5L12 7.4l2.5 3.7 3.1-2.5-.8 6H7.2Zm0 1.2h9.6v1.3H7.2v-1.3Z" fill="#FFF7E8" />
        ) : (
          <polygon points={STAR} fill="#FFF7E8" />
        )}
      </svg>
      {showLabel && <span className={`text-[11px] font-black ${golden ? 'text-amber-600 dark:text-amber-400' : 'text-[#E0533C] dark:text-[#D17A68]'}`}>{golden && label === 'Verified host' ? 'Golden host' : label}</span>}
    </span>
  );
};

interface HostBadgeProps {
  /** The host's user id. Used to look up their creator plan. */
  hostId?: string | null;
  /** Whether RADA treats this host as verified. */
  verified?: boolean;
  size?: VerifiedBadgeProps['size'];
  showLabel?: boolean;
  className?: string;
}

/**
 * The one place that decides which host badge to show:
 * not verified -> nothing; verified -> orange shield; verified + Elite -> gold shield with crown.
 */
export const HostBadge: React.FC<HostBadgeProps> = ({ hostId, verified = false, size = 'sm', showLabel = false, className = '' }) => {
  const tiers = usePublicTiers([hostId]);
  if (!verified) return null;
  const golden = !!hostId && tiers[hostId]?.creator === 'elite';
  return <VerifiedBadge status="approved" golden={golden} size={size} showLabel={showLabel} className={className} />;
};

export default VerifiedBadge;
