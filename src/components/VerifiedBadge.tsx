import React from 'react';

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
}) => {
  if (status !== 'approved' && status !== 'verified') return null;
  const px = PX[size] ?? PX.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}
      title="Verified RADA host"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Verified RADA host"
        className="shrink-0 bg-transparent"
      >
        {/* shield */}
        <path
          d="M12 1.6 20.6 4.7v6.6c0 5.2-3.6 9.2-8.6 11.3-5-2.1-8.6-6.1-8.6-11.3V4.7L12 1.6Z"
          fill="#E0533C"
        />
        {/* soft light half for depth */}
        <path
          d="M12 1.6 3.4 4.7v6.6c0 5.2 3.6 9.2 8.6 11.3V1.6Z"
          fill="#FFFFFF"
          opacity="0.14"
        />
        {/* amber rim accent along the top edge */}
        <path d="M12 1.6 20.6 4.7v1.4L12 3 3.4 6.1V4.7L12 1.6Z" fill="#F4A261" />
        {/* star */}
        <polygon points={STAR} fill="#FFF7E8" />
      </svg>
      {showLabel && <span className="text-[11px] font-black text-[#E0533C] dark:text-[#D17A68]">{label}</span>}
    </span>
  );
};

export default VerifiedBadge;
