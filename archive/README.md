# RADA Archive

Moved on **2026-11-21** during Phase 2 repository cleanup so all unused, dead, or duplicate files remain recoverable without cluttering the live application tree.

## List A — Dead / Unreferenced Files (13 files)

| Original Path | Archived Path | Reason |
| --- | --- | --- |
| `src/components/AccountSettingsModal.tsx` | `archive/src/components/AccountSettingsModal.tsx` | Replaced by `MenuAccountSection.tsx` inside the header menu and `ProfilePage.tsx`; had zero active callers. |
| `src/components/IntentPrompt.tsx` | `archive/src/components/IntentPrompt.tsx` | Superseded onboarding intent modal; not rendered or imported anywhere in live code. |
| `src/components/LivenessVerificationModal.tsx` | `archive/src/components/LivenessVerificationModal.tsx` | Unreferenced selfie/liveness verification modal (references non-existent `cloud.updateProfileVerification`). |
| `src/lib/systemBars.ts` | `archive/src/lib/systemBars.ts` | Unused system status-bar helper; `App.tsx` configures bars directly. |
| `public/icon.svg` | `archive/public/icon.svg` | Unused vector icon; `index.html`, `manifest.json`, and app code reference `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `rada-mark.png`. |
| `public/logo.jpg` | `archive/public/logo.jpg` | Unused legacy JPEG logo; app uses inline SVG logo and PNG icons. |
| `public/pin.svg` | `archive/public/pin.svg` | Unused SVG pin; `LocationMapModal.tsx` builds Leaflet pins with inline SVG HTML. |
| `server.ts` | `archive/server.ts` | Unused Express dev/static wrapper; app builds and serves as a pure Vite SPA (`package.json` `dev` runs `vite`, deployment uses `vercel.json`). |
| `EVENTS_UPDATE_README.md` | `archive/EVENTS_UPDATE_README.md` | Historical release/patch note with no runtime or workflow reference. |
| `REMOVED_FILES_PHASE1.txt` | `archive/REMOVED_FILES_PHASE1.txt` | Historical cleanup log from an earlier refactor. |
| `REMOVED_FILES_PHASE2.txt` | `archive/REMOVED_FILES_PHASE2.txt` | Historical cleanup log from an earlier refactor. |
| `REMOVED_FILES_PHASE3.txt` | `archive/REMOVED_FILES_PHASE3.txt` | Historical cleanup log from an earlier refactor. |
| `bun.lock` | `archive/bun.lock` | Unused Bun lockfile; repository uses `npm` (`package-lock.json`). |

## List B — Duplicates & Stale Copies (11 files)

| Original Path | Archived Path | Reason |
| --- | --- | --- |
| `rada-discover-pullup/src/components/AsksSection.tsx` | `archive/rada-discover-pullup/src/components/AsksSection.tsx` | Stale pre-merge copy; merged into `src/components/AsksSection.tsx`. |
| `rada-discover-pullup/src/components/HomeTab.tsx` | `archive/rada-discover-pullup/src/components/HomeTab.tsx` | Stale pre-merge copy; merged into `src/components/HomeTab.tsx`. |
| `rada-discover-pullup/src/components/PullUpSheet.tsx` | `archive/rada-discover-pullup/src/components/PullUpSheet.tsx` | Stale pre-merge copy; merged into `src/components/PullUpSheet.tsx`. |
| `rada-discover-pullup/src/lib/asks.ts` | `archive/rada-discover-pullup/src/lib/asks.ts` | Stale pre-merge copy; merged into `src/lib/asks.ts`. |
| `rada-discover-pullup/supabase/migrations/20261120_ask_likes_and_pullups.sql` | `archive/rada-discover-pullup/supabase/migrations/20261120_ask_likes_and_pullups.sql` | Stale pre-merge copy of migration already present in `supabase/migrations/`. |
| `rada-plan-hangout/src/App.tsx` | `archive/rada-plan-hangout/src/App.tsx` | Stale feature-branch patch copy already merged into `src/App.tsx`. |
| `rada-plan-hangout/src/components/Overlays.tsx` | `archive/rada-plan-hangout/src/components/Overlays.tsx` | Stale feature-branch patch copy already merged into `src/components/Overlays.tsx`. |
| `rada-plan-hangout/src/components/VaultTab.tsx` | `archive/rada-plan-hangout/src/components/VaultTab.tsx` | Stale feature-branch patch copy already merged into `src/components/VaultTab.tsx`. |
| `seed-cinemas.ts` | `archive/seed-cinemas.ts` | Root duplicate of `scripts/seed-cinemas.ts` (`package.json` `seed:cinemas` uses `scripts/seed-cinemas.ts`). |
| `src/lib/demoData.ts` | `archive/src/lib/demoData.ts` | Duplicate of `src/data/demoData.ts` (`App.tsx` imports `src/data/demoData.ts`). |
| `src/types.cinema-patch.ts` | `archive/src/types.cinema-patch.ts` | Old patch snippet already incorporated into `src/types.ts`. |
