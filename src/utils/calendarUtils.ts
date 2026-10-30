import { EventItem, TicketTier } from '../types.ts';

// Reference "Today" in RADA 2026 calendar dataset (14 Oct 2026)
export const isDateToday = (year: number, monthIndex: number, dayNumber: number): boolean => {
  const now = new Date();
  const isRealToday = now.getFullYear() === year && now.getMonth() === monthIndex && now.getDate() === dayNumber;
  return isRealToday;
};

// Check if an event date string matches a given calendar year, month, and day
export const doesEventMatchDay = (
  eventDateStr: string,
  year: number,
  monthIndex: number, // 0-indexed (0 = Jan, 9 = Oct, 10 = Nov)
  dayNumber: number,
  isTodaySelected?: boolean
): boolean => {
  if (!eventDateStr) return false;
  const lower = eventDateStr.toLowerCase().trim();

  // If today is selected and event has "today" or "happening today"
  if (isTodaySelected && (lower.includes('today') || lower.includes('happening today') || lower.includes('14 oct'))) {
    return true;
  }

  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const fullMonthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const monthShort = monthNames[monthIndex];
  const monthFull = fullMonthNames[monthIndex];
  const dayPadded = String(dayNumber).padStart(2, '0');
  const yearStr = String(year);

  // ISO date check (e.g. 2026-10-24)
  const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${dayPadded}`;
  if (lower.includes(isoDate)) return true;

  // Year check if explicit year is present in date string
  const hasYear = lower.includes('2025') || lower.includes('2026') || lower.includes('2027');
  if (hasYear && !lower.includes(yearStr)) return false;

  // Month check
  const hasMonth = lower.includes(monthShort) || lower.includes(monthFull);
  if (!hasMonth) return false;

  // Day check using regex boundary to prevent 4 matching 24 or 14
  const dayRegex = new RegExp(`(^|\\D)(0?${dayNumber})(st|nd|rd|th)?(\\D|$)`, 'i');
  return dayRegex.test(lower);
};

// Clean date header: "Events for Today", "Events for Saturday, Oct 24", etc.
export const getCleanDateHeader = (
  year: number,
  monthIndex: number,
  dayNumber: number,
  isToday?: boolean
): string => {
  if (isToday) {
    return 'Events for Today';
  }
  const dateObj = new Date(year, monthIndex, dayNumber);
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
  return `Events for ${dayOfWeek}, ${monthShort} ${dayNumber}`;
};

// Extract formatted ticket price or "Free Entry"
export const getEventPriceDisplay = (tiers?: TicketTier[]): string => {
  if (!tiers || tiers.length === 0) return 'Free Entry';
  const hasFree = tiers.some(t => t.price && t.price.toLowerCase().includes('free'));
  if (hasFree) return 'Free Entry';
  
  // Return first/lowest tier price
  return tiers[0].price || 'Tickets Available';
};

// Styling badge per event category / genre
export const getCategoryBadgeStyle = (category?: string, genre?: string) => {
  const cat = (category || '').toLowerCase();
  const gen = (genre || '').toLowerCase();

  if (cat === 'concerts' || gen.includes('afrobeats') || gen.includes('jazz')) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-950/80',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800'
    };
  }
  if (cat === 'nightlife' || gen.includes('amapiano') || gen.includes('house') || gen.includes('techno')) {
    return {
      bg: 'bg-rose-100 dark:bg-rose-950/80',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800'
    };
  }
  if (cat === 'art' || gen.includes('fashion') || gen.includes('visual')) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-950/80',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800'
    };
  }
  if (cat === 'cinemas') {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/80',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800'
    };
  }
  return {
    bg: 'bg-orange-100 dark:bg-orange-950/80',
    text: 'text-[#E0533C] dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800'
  };
};

/**
 * Parses any event or planned date string into year, 0-indexed month, and day number.
 * Supports strings like "Sun, 25 Oct 2026", "24 Oct", "Oct 14", "2026-10-24", "Today", etc.
 */
export const parseEventDate = (
  dateStr?: string | null
): { year: number; month: number; day: number } | null => {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();

  // Try ISO format YYYY-MM-DD
  const isoMatch = lower.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10) - 1,
      day: parseInt(isoMatch[3], 10)
    };
  }

  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  let monthIndex = 9; // default to October (index 9) for 2026 Nairobi festival season
  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i])) {
      monthIndex = i;
      break;
    }
  }

  // Extract 4-digit year if present (2025, 2026, 2027)
  let year = 2026;
  const yearMatch = lower.match(/\b(202[4-9])\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // Check for "today"
  if (lower.includes('today') || lower.includes('happening today')) {
    return { year: 2026, month: 9, day: 14 };
  }

  // Extract day number (1-31)
  const dayMatch = lower.match(/(?:^|\D)(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:\D|$)/);
  if (dayMatch) {
    return {
      year,
      month: monthIndex,
      day: parseInt(dayMatch[1], 10)
    };
  }

  return { year: 2026, month: 9, day: 14 };
};

