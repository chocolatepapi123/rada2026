# Parked Feature: Liveness Selfie Verification

## What it does
In-browser face-detection/liveness selfie check using local `face-api.js` models served from `/models` (`src/lib/faceCheck.ts`), paired with a verification modal UI.

## Related file locations
- **Archived**: `archive/src/components/LivenessVerificationModal.tsx` (moved to `/archive/` because it had zero callers and referenced an unimplemented `cloud.updateProfileVerification` method).
- **Kept in `src/`**: `src/lib/faceCheck.ts` and `scripts/copy-face-models.mjs` remain in place because `package.json` (`predev` / `prebuild`) copies the models and `tests/guards.test.ts` asserts that `faceCheck.ts` serves models from `/models`.

## How to re-enable
1. Restore `LivenessVerificationModal.tsx` from `archive/src/components/LivenessVerificationModal.tsx`.
2. Implement `updateProfileVerification` in `src/lib/cloudSync.ts` (persisting `is_verified` / verification status on `profiles`).
3. Mount `LivenessVerificationModal` from `ProfilePage.tsx` or `CreatorHubTab.tsx`.

## Supabase tables & assets required
- **Tables**: `profiles`
- **Assets**: `/public/models/*` (populated by `scripts/copy-face-models.mjs`)
