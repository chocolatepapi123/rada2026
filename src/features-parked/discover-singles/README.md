# Parked Feature: Discover Singles Swipe Deck

## What it does
Allows users to opt in to a singles discovery pool and swipe/send match requests from the Socials tab, plus toggle discoverability in Settings (`Overlays.tsx`). It is currently hidden by default via `VITE_SHOW_DISCOVER` in `src/lib/featureFlags.ts`.

## Files kept in `src/` (live dependencies / test guardrails)
Nothing was moved out of `src/` because `tests/guards.test.ts` and existing components still reference the flag and data loader directly:
- `src/lib/featureFlags.ts` — exports `DISCOVER_VISIBLE` (`import.meta.env.VITE_SHOW_DISCOVER === 'true'`).
- `src/lib/socialsCloud.ts` — exports `fetchDiscoverPool` and match request RPC wrappers.
- `src/components/SocialsTab.tsx` — still fetches `fetchDiscoverPool()` when `DISCOVER_VISIBLE` is true (though the swipe deck JSX & `'discover'` subtab button were removed in an earlier release).
- `src/components/Overlays.tsx` — retains the "Discoverable in Socials" Settings toggle gated by `DISCOVER_VISIBLE`.

## How to re-enable
1. Set `VITE_SHOW_DISCOVER=true` in `.env` / deployment environment variables.
2. Re-add the `{ id: 'discover', label: 'Discover' }` tab entry (filtering with `DISCOVER_VISIBLE || tab.id !== 'discover'`) and swipe-deck card UI inside `src/components/SocialsTab.tsx`, consuming `communitySingles` / `discoveryProfiles` and `onSendMatchRequest`.

## Supabase tables & RPCs required
- **Tables**: `profiles`, `match_requests`, `conversations`
- **RPCs**: `send_match_request`, `respond_match_request`
