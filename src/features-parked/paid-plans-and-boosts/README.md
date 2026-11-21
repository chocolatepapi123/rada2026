# Parked Feature: Paid Plans, M-Pesa Checkout & Boosts

## What it does
Monetization UI for Creator & Merchant subscription tiers (`SubscriptionPlans.tsx`), automated STK Push payments (`PayWithMpesaSheet.tsx`), manual Till/Paybill claim submission (`ManualPaySheet.tsx`, `MyPaymentClaims.tsx`), and paid listing/outing boost requests (`PromotionsPanel.tsx`).

All RADA features are currently free/unlocked (`useMySubscriptions` grants full access and `TIER_BADGES_ENABLED = false` in `src/lib/subscriptions.ts`).

## Files in this folder
- `SubscriptionPlans.tsx` (moved from `src/components/SubscriptionPlans.tsx`)
- `PayWithMpesaSheet.tsx` (moved from `src/components/PayWithMpesaSheet.tsx`)
- `ManualPaySheet.tsx` (moved from `src/components/ManualPaySheet.tsx`)
- `MyPaymentClaims.tsx` (moved from `src/components/MyPaymentClaims.tsx`)
- `PromotionsPanel.tsx` (moved from `src/components/PromotionsPanel.tsx`)

## Files intentionally kept in `src/` (live dependencies)
- `src/lib/subscriptions.ts` — imported by `ProfilePage.tsx`, `CreatorHubTab.tsx`, `OutingsTab.tsx`, `UserProfileModal.tsx`, `PublicBusinessProfileModal.tsx`, `AdminSubscriptionsPanel.tsx`, `VerifiedBadge.tsx`, `BusinessBadge.tsx`, `ProProfile.tsx`, and `tests/guards.test.ts`.
- `src/lib/payments.ts` — `normalizeKenyanPhone` is imported live by `src/components/TicketBuySheet.tsx`.
- `src/lib/manualPayments.ts` & `src/components/AdminManualPayments.tsx` — mounted live inside `AdminDashboardModal.tsx` (`payments` admin tab).
- `src/lib/promotions.ts` & `src/components/AdminPromotionsPanel.tsx` — `useActivePromotions` and promotion sort helpers run live in `HomeTab.tsx`, `SpotsTab.tsx`, `OutingsTab.tsx`, `Overlays.tsx`, `SpotsExplorer.tsx`, and the admin `promotions` tab.
- `src/components/AdminSubscriptionsPanel.tsx` — mounted live in `AdminDashboardModal.tsx` (`subscriptions` tab; imports `PlanPill` from `./SubscriptionPlans`).
- `src/components/OutingExtras.tsx` — `WaitlistButton` and `TemplatePicker` are live in `OutingsTab.tsx` (`TrialReportCard` is imported by `SubscriptionPlans.tsx`).

## How to re-enable
1. Set `TIER_BADGES_ENABLED = true` and restore tier enforcement in `src/lib/subscriptions.ts` (`useMySubscriptions`, `getOutingQuota`, `attendeeCeiling`).
2. Mount `SubscriptionPlans` in `ProfilePage.tsx` / `CreatorHubTab.tsx` (for creator plans) and `MerchantHubTab.tsx` (for merchant plans).
3. Mount `PromotionsPanel` inside `MerchantHubTab.tsx` and/or `CreatorHubTab.tsx` so hosts and businesses can purchase boosts.

## Supabase tables, RPCs & Edge Functions required
- **Tables**: `subscriptions`, `payment_plans`, `payments`, `manual_pay_config`, `manual_payment_claims`, `promo_products`, `promotions`
- **RPCs**: `get_my_subscriptions`, `get_my_outing_usage`, `get_public_badges`, `submit_manual_payment`, `request_promotion`
- **Edge Functions**: `mpesa-stk-push`, `mpesa-callback`
