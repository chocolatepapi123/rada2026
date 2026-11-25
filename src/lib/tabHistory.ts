export interface RadaHistoryState {
  radaApp: true;
  tab?: string;
  guard?: boolean;
  modal?: boolean;
  depth?: number;
}

const MAX_TAB_HISTORY = 50;

export const normalizeNavTab = (tab: string): string => (tab === 'plans' ? 'outings' : tab);

export function createInitialTabStack(initialTab: string): string[] {
  const normalized = normalizeNavTab(initialTab || 'home');
  return normalized === 'home' ? ['home'] : ['home', normalized];
}

export function pushTabToStack(
  stack: string[],
  tab: string
): { stack: string[]; changed: boolean; tab: string } {
  const normalized = normalizeNavTab(tab || 'home');
  const current = stack[stack.length - 1];
  if (current === normalized) {
    return { stack, changed: false, tab: normalized };
  }
  const next = [...stack, normalized];
  if (next.length > MAX_TAB_HISTORY) {
    next.splice(0, next.length - MAX_TAB_HISTORY);
  }
  return { stack: next, changed: true, tab: normalized };
}

export function popTabFromStack(
  stack: string[],
  poppedToState?: RadaHistoryState | null
): { stack: string[]; targetTab: string | null; poppedFrom: string | null } {
  if (stack.length <= 1) {
    return { stack, targetTab: null, poppedFrom: null };
  }

  const poppedFrom = stack[stack.length - 1];
  let next = stack.slice(0, -1);

  if (poppedToState?.radaApp && poppedToState.tab && !poppedToState.guard && !poppedToState.modal) {
    const stateTab = normalizeNavTab(poppedToState.tab);
    if (next[next.length - 1] !== stateTab) {
      const idx = next.lastIndexOf(stateTab);
      if (idx >= 0) {
        next = next.slice(0, idx + 1);
      }
    }
  }

  return {
    stack: next,
    targetTab: next[next.length - 1] || 'home',
    poppedFrom,
  };
}
