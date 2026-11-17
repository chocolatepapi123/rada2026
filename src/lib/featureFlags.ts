import { isDemoMode } from './demoMode.ts';

/**
 * Discover (the swipe deck of verified singles) is built but hidden for launch week.
 * To switch it on: set VITE_SHOW_DISCOVER=true in your host's environment settings and redeploy.
 * Nothing is deleted: the code, the selfie check and the database stay as they are.
 * Demo mode (promo recordings) always shows it.
 */
export const DISCOVER_VISIBLE: boolean = import.meta.env.VITE_SHOW_DISCOVER === 'true' || isDemoMode();
