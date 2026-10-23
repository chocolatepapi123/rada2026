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
 * Checks if a name matches legacy hardcoded defaults like "lowkey wayne", "Wayne", or "Guest Explorer"
 */
export const isLegacyWayneName = (name?: string | null): boolean => {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim();
  return !n || /lowkey\s*wayne|wayne\s*\(owner\)|^wayne$|^Guest Explorer$|^Explorer$/i.test(n);
};

/**
 * Ensures display name is never "lowkey wayne" or blank, defaulting to "new_user_(random 2 numbers)"
 */
export const sanitizeDisplayName = (name?: string | null): string => {
  if (isLegacyWayneName(name)) {
    return generateNewUserName();
  }
  return (name || '').trim();
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
