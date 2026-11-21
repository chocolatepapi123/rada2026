# Parked Feature: Verification & Tier Badges

## What it does
Previously rendered verified user, host, merchant, and paid-tier badges across profile cards, spot cards, outings, and public business profiles. All badge components were intentionally stubbed to return `null` when RADA removed verification badges and paid tiers.

## Files kept in `src/` (live dependencies)
These files remain in `src/components/` because live components import and render them:
- `src/components/VerifiedBadge.tsx` — stubbed (`return null`); imported by `OutingsTab.tsx`, `CreatorHubTab.tsx`, `ProfileSettingsKit.tsx`, `UserProfileModal.tsx`, `ProProfile.tsx`.
- `src/components/MerchantVerificationBadge.tsx` — stubbed (`return null`); imported by `PublicBusinessProfileModal.tsx`.
- `src/components/BusinessBadge.tsx` — `BusinessesProvider` and `isBusinessApproved` are live in `App.tsx`, `SpotsTab.tsx`, `HomeTab.tsx`, `Overlays.tsx`, `PublicBusinessProfileModal.tsx`; its visual badge (`BusinessBadge` / `PublicTierBadges`) returns `null`.

## How to re-enable
1. Restore the badge JSX inside `VerifiedBadge.tsx`, `MerchantVerificationBadge.tsx`, and `BusinessBadge.tsx`.
2. Re-enable `TIER_BADGES_ENABLED = true` in `src/lib/subscriptions.ts` if tier pills should be displayed alongside verified badges.

## Supabase tables & RPCs required
- **Tables**: `profiles`, `businesses`, `subscriptions`
- **RPCs**: `get_public_badges`
