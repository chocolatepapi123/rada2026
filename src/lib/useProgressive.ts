import { useEffect, useState, startTransition } from 'react';

/**
 * Progressive rendering for long lists: paint `initial` items now, then add `step` more every `delay` ms
 * in a low-priority transition until all `total` are shown. Keeps the first paint (and tab switches) cheap.
 * Pass `resetKey` (e.g. the active filter) to start over from `initial` when the list changes.
 */
export function useProgressiveCount(total: number, initial: number, step = initial, delay = 90, resetKey: unknown = null): number {
  const [state, setState] = useState({ key: resetKey, count: initial });
  const count = state.key === resetKey ? state.count : initial;

  useEffect(() => {
    if (state.key !== resetKey) setState({ key: resetKey, count: initial });
  }, [resetKey, state.key, initial]);

  useEffect(() => {
    if (count >= total) return;
    const t = setTimeout(() => {
      startTransition(() => setState((s) => ({ key: resetKey, count: Math.min((s.key === resetKey ? s.count : initial) + step, total) })));
    }, delay);
    return () => clearTimeout(t);
  }, [count, total, step, delay, resetKey, initial]);

  return Math.min(count, total);
}
