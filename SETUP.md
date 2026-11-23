# RADA daily seeding

Copy `scripts/` and `.github/workflows/seed-daily.yml` into your repo (replace your old `seed-spots.mjs` and `seed-next-category.mjs`).

**GitHub → Settings → Secrets and variables → Actions**

Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
Variables: R2_BUCKET = rada-media, R2_PUBLIC_BASE = your current public bucket URL (later https://img.rada.co.ke)

Cloudflare R2 token: R2 → Manage API tokens → Create → "Object Read & Write" on rada-media.
Also add a CORS rule on the bucket allowing GET from your PWA origin (needed for spots.json).

The workflow runs non-stop: one category across all places, then it starts itself on the next category. Start it once with Run workflow (untick dry run). If it ever stops, click Run workflow again. Settings -> Actions -> General -> Workflow permissions must allow read and write. Default is 10 spots per place per category; places are in scripts/seed-areas.json.

Tuning (env in the workflow): FACE_MIN_FRAC (0.02 = reject any visible face, raise to 0.05 to allow tiny background faces),
FACE_SCORE (lower = stricter), MIN_RATING, MIN_REVIEWS, MIN_PHOTOS, MAX_PHOTOS.
