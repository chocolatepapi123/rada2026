# Parked Feature: Claim Username Prompt

## What it does
Prompts signed-in accounts whose profile still has an auto-generated placeholder handle (`new_user_*` or `user_*`) to choose a permanent `@username` (`ClaimUsernamePrompt.tsx`). It was previously disabled in `src/App.tsx` via `SHOW_CLAIM_USERNAME_PROMPT = false`.

## Files in this folder
- `ClaimUsernamePrompt.tsx` (moved from `src/components/ClaimUsernamePrompt.tsx`)

## How to re-enable
1. Import `ClaimUsernamePrompt` in `src/App.tsx` from `./features-parked/claim-username-prompt/ClaimUsernamePrompt`.
2. Track `claimPromptDismissed` state and render `<ClaimUsernamePrompt>` when `session?.user?.id && !isGuestMode && !claimPromptDismissed && hasAutoUsername(currentUserProfile)`.
3. Pass `onClaimed={(newUsername) => handleOwnProfileChange({ username: newUsername })}` and `onDismiss={() => setClaimPromptDismissed(true)}`.

## Supabase tables & helpers required
- **Tables**: `profiles` (reads/updates `username`)
- **Helpers / RPCs** (`src/lib/cloudSync.ts`): `hasAutoUsername`, `checkUsernameAvailable`, `saveUnifiedProfile`, `validateUsernameFormat`, `USERNAME_MIN`, `USERNAME_MAX`
