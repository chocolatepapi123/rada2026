/**
 * Utility helpers for user profile defaults and display name sanitization.
 */

/**
 * Generates a random default display name in the exact format "new_user_(random 2 numbers)"
 * e.g. "new_user_42", "new_user_87"
 */
export const generateNewUserName = (): string => {
  const num = Math.floor(10 + Math.random() * 90);
  return `new_user_${num}`;
};

/**
 * True for blank values and the old hard-coded placeholder names ("lowkey wayne", "Wayne",
 * "Explorer", "Guest Explorer"...). Matches the WHOLE name only, so real people whose names
 * merely contain "Wayne" (or "Waweru") are never renamed.
 */
const LEGACY_DEFAULT_NAMES = new Set([
  'wayne', 'lowkey wayne', 'wayne (owner)', 'guest', 'explorer', 'guest explorer',
]);
export const isLegacyWayneName = (name?: string | null): boolean => {
  const n = (name || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/^@/, '');
  return !n || LEGACY_DEFAULT_NAMES.has(n);
};

/**
 * Ensures display name is never legacy placeholder or blank, defaulting to "new_user_(random 2 numbers)"
 */
export const sanitizeDisplayName = (name?: string | null): string => {
  if (isLegacyWayneName(name)) {
    return generateNewUserName();
  }
  return (name || '').trim();
};

/**
 * Ensures username is never legacy placeholder or blank, defaulting to "new_user_(random 2 numbers)"
 */
export const sanitizeUsername = (username?: string | null, fallbackName?: string | null): string => {
  const cleanU = (username || '').replace(/^@/, '').trim();
  if (isLegacyWayneName(cleanU)) {
    if (fallbackName && !isLegacyWayneName(fallbackName)) {
      return fallbackName.replace(/^@/, '').trim();
    }
    return generateNewUserName();
  }
  return cleanU;
};

/**
 * Checks if an avatar URL is one of the old mock photo placeholders
 */
export const isMockAvatarUrl = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  return url.includes('photo-1535713875002-d1d0cf377fde') || url.includes('photo-1534528741775');
};

/**
 * Sanitizes avatar URLs to be completely blank when undefined, empty, or an old mock photo
 */
export const sanitizeAvatarUrl = (url?: string | null): string => {
  if (isMockAvatarUrl(url)) {
    return '';
  }
  return (url || '').trim();
};
