import React from 'react';
import { Store, Ticket, Shirt, CheckCircle2 } from 'lucide-react';
import { BusinessCategory } from '../types.ts';

interface MerchantVerificationBadgeProps {
  category?: BusinessCategory | 'spot' | 'event' | 'thrift';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const MerchantVerificationBadge: React.FC<MerchantVerificationBadgeProps> = ({
  category = 'hospitality',
  size = 'sm',
  showLabel = true,
  className = ''
}) => {
  // Normalize category
  const isSpot = category === 'hospitality' || category === 'spot';
  const isEvent = category === 'event_organizer' || category === 'event';
  const isThrift = category === 'thrift_store' || category === 'thrift';

  let config = {
    label: 'Spot Verified',
    icon: Store,
    bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500'
  };

  if (isEvent) {
    config = {
      label: 'Organizer Verified',
      icon: Ticket,
      bgClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
      iconClass: 'text-purple-600 dark:text-purple-400',
      dotClass: 'bg-purple-500'
    };
  } else if (isThrift) {
    config = {
      label: 'Luku Verified Seller',
      icon: Shirt,
      bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500'
    };
  }

  const Icon = config.icon;

  const sizeClasses = {
    xs: {
      wrap: 'text-[9px] px-1.5 py-0.5 gap-1',
      icon: 'w-2.5 h-2.5',
      check: 'w-2 h-2'
    },
    sm: {
      wrap: 'text-[10px] px-2 py-0.5 gap-1.5',
      icon: 'w-3 h-3',
      check: 'w-2.5 h-2.5'
    },
    md: {
      wrap: 'text-xs px-2.5 py-1 gap-1.5',
      icon: 'w-3.5 h-3.5',
      check: 'w-3 h-3'
    },
    lg: {
      wrap: 'text-sm px-3 py-1.5 gap-2',
      icon: 'w-4 h-4',
      check: 'w-3.5 h-3.5'
    }
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border transition-all select-none ${config.bgClass} ${sizeClasses.wrap} ${className}`}
      title={config.label}
    >
      <Icon className={`${sizeClasses.icon} shrink-0 stroke-[2.2]`} />
      {showLabel && <span>{config.label}</span>}
      <CheckCircle2 className={`${sizeClasses.check} shrink-0 fill-current opacity-80`} />
    </span>
  );
};
