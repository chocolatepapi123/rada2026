# Parked Feature: Merchant Hub

## What it does
Provides the full business/merchant portal for registering venues, editing spot details, managing offers, claiming unclaimed spots, configuring venue event tickets, inviting team members, and toggling open-today promos (`MerchantHubTab.tsx`, `MerchantTicketsSection.tsx`, `SpotDetailsEditor.tsx`, `DynamicLocationSelector.tsx`, `TeamPanel.tsx`, and `team.ts`).

It was previously gated behind `showBusinessHub = false` in `src/components/Header.tsx` and an empty `MerchantHubTab = () => null` stub in `src/App.tsx`.

## Files in this folder
- `MerchantHubTab.tsx` (moved from `src/components/MerchantHubTab.tsx`)
- `MerchantTicketsSection.tsx` (moved from `src/components/MerchantTicketsSection.tsx`)
- `SpotDetailsEditor.tsx` (moved from `src/components/SpotDetailsEditor.tsx`)
- `DynamicLocationSelector.tsx` (moved from `src/components/DynamicLocationSelector.tsx`)
- `TeamPanel.tsx` (moved from `src/components/TeamPanel.tsx`)
- `team.ts` (moved from `src/lib/team.ts`)

## Files intentionally kept in `src/` (live dependencies)
- `src/components/RetentionBits.tsx` — `ClaimOfferButton` and `ReviewReplyBlock` are used live in `Overlays.tsx` and `PublicBusinessProfileModal.tsx` (`RedeemCodePanel` and `OfferStatsLine` are consumed by `MerchantHubTab.tsx`).
- `src/components/PublicBusinessProfileModal.tsx` and `src/components/BusinessBadge.tsx` — live public business profile views and `BusinessesProvider`.
- `src/lib/spotDetailFields.ts` — `getBlockTitle` is used live by `SpotDetailSections.tsx` (editor sections also import its types).
- `src/lib/cloudSync.ts` — still retains business/listing/claim CRUD functions used by `App.tsx` and `AdminDashboardModal.tsx`.

## How to re-enable
1. Import `MerchantHubTab` lazily or directly in `src/App.tsx` from `./features-parked/merchant-hub/MerchantHubTab`.
2. Restore the `isBusinessHubOpen` modal state (or `'merchant'` tab route) and the merchant CRUD / spot-claim handlers (`handleCreateBusiness`, `handleUpdateBusiness`, `handleCreateOffer`, `handleUpdateOffer`, `handleDeleteOffer`, `handleSubmitClaimRequest`, `handleClaimSpot`, `handleReleaseSpot`, `handleAddOrUpdateSpot`, `handleAddEvent`, `handleDeleteListing`) in `src/App.tsx`.
3. Add a menu button/prop (`onOpenBusinessHub`) in `src/components/Header.tsx` to open the Merchant Hub when `showBusinessHub` is enabled.

## Supabase tables & RPCs required
- **Tables**: `businesses`, `rada_listings`, `spot_claims`, `spot_details`, `business_team_members`, `business_team_invites`, `external_events`
- **RPCs / Edge Functions**: `invite_team_member`, `accept_team_invite`, `remove_team_member`, `set_team_role` (see `team.ts`), plus `cloudSync.ts` listing/claim helpers.
