import {
  Briefcase,
  Check,
  MapPin,
  Music2,
  Shirt,
  ShoppingBag,
  Ticket,
  Utensils,
} from 'lucide-react';

interface MerchantVerificationBadgeProps {
  category: string;
  size?: 'xs' | 'sm' | 'md';
}

export default function MerchantVerificationBadge({
  category,
  size = 'sm',
}: MerchantVerificationBadgeProps) {
  const normalizedCategory = String(category || '').toLowerCase();

  let Icon = Briefcase;
  let label = 'Verified Business';

  if (
    normalizedCategory.includes('event') ||
    normalizedCategory.includes('concert')
  ) {
    Icon = Ticket;
    label = 'Verified Event';
  } else if (
    normalizedCategory.includes('spot') ||
    normalizedCategory.includes('place') ||
    normalizedCategory.includes('venue')
  ) {
    Icon = MapPin;
    label = 'Verified Spot';
  } else if (
    normalizedCategory.includes('luku') ||
    normalizedCategory.includes('shop') ||
    normalizedCategory.includes('retail')
  ) {
    Icon = ShoppingBag;
    label = 'Verified Luku';
  } else if (
    normalizedCategory.includes('food') ||
    normalizedCategory.includes('restaurant') ||
    normalizedCategory.includes('cafe')
  ) {
    Icon = Utensils;
    label = 'Verified Food Business';
  } else if (
    normalizedCategory.includes('night') ||
    normalizedCategory.includes('club') ||
    normalizedCategory.includes('entertainment')
  ) {
    Icon = Music2;
    label = 'Verified Nightlife';
  } else if (
    normalizedCategory.includes('fashion') ||
    normalizedCategory.includes('clothing') ||
    normalizedCategory.includes('style')
  ) {
    Icon = Shirt;
    label = 'Verified Fashion';
  }

  const sizes = {
    xs: {
      wrapper: 'w-5 h-5',
      icon: 'w-3 h-3',
      check: 'w-2.5 h-2.5',
      checkWrapper: 'w-3 h-3 -right-1 -bottom-1',
    },
    sm: {
      wrapper: 'w-6 h-6',
      icon: 'w-3.5 h-3.5',
      check: 'w-2.5 h-2.5',
      checkWrapper: 'w-3.5 h-3.5 -right-1 -bottom-1',
    },
    md: {
      wrapper: 'w-8 h-8',
      icon: 'w-4.5 h-4.5',
      check: 'w-3 h-3',
      checkWrapper: 'w-4 h-4 -right-1 -bottom-1',
    },
  };

  const currentSize = sizes[size];

  return (
    <span
      className={`relative inline-flex items-center justify-center ${currentSize.wrapper}`}
      title={label}
      aria-label={label}
    >
      {/* Category icon */}
      <span className="inline-flex items-center justify-center w-full h-full rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20">
        <Icon className={currentSize.icon} strokeWidth={2.4} />
      </span>

      {/* RADA verification check */}
      <span
        className={`absolute flex items-center justify-center rounded-full bg-blue-600 text-white border-2 border-white dark:border-[#090a0f] ${currentSize.checkWrapper}`}
      >
        <Check
          className={currentSize.check}
          strokeWidth={3}
        />
      </span>
    </span>
  );
      }
