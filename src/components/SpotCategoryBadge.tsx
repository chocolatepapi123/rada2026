import React from 'react';
import { getCategoryDef, FALLBACK_CATEGORY } from '../lib/spotCategories.ts';

interface SpotCategoryTileProps {
  category?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-5 h-5 rounded-md', icon: 'w-3 h-3' },
  sm: { box: 'w-6 h-6 rounded-lg', icon: 'w-3.5 h-3.5' },
  md: { box: 'w-7 h-7 rounded-xl', icon: 'w-3.5 h-3.5' },
};

/**
 * Pastel rounded-square icon tile matching the S05 category cards.
 */
export const SpotCategoryTile: React.FC<SpotCategoryTileProps> = ({
  category,
  size = 'sm',
  className = '',
}) => {
  const def = category ? getCategoryDef(category) : FALLBACK_CATEGORY;
  const Icon = def.icon;
  const dims = SIZE_MAP[size];

  return (
    <span
      className={`${dims.box} inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ backgroundColor: `${def.color}1F` }}
      aria-hidden="true"
    >
      <Icon className={dims.icon} style={{ color: def.color }} />
    </span>
  );
};

interface SpotCategoryBadgeProps {
  category?: string | null;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Compact pill/card showing the S05 rounded-square icon tile + canonical category label.
 */
export const SpotCategoryBadge: React.FC<SpotCategoryBadgeProps> = ({
  category,
  size = 'xs',
  className = '',
}) => {
  const def = category ? getCategoryDef(category) : FALLBACK_CATEGORY;
  const label = def.id === 'other' && category ? category : def.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#121113] border border-slate-200/80 dark:border-slate-800 ${
        size === 'xs' ? 'pl-1 pr-2 py-0.5 text-[10px]' : 'pl-1.5 pr-2.5 py-1 text-[11px]'
      } font-bold text-slate-700 dark:text-slate-200 max-w-full ${className}`}
    >
      <SpotCategoryTile category={category} size={size === 'xs' ? 'xs' : 'sm'} />
      <span className="truncate">{label}</span>
    </span>
  );
};
