# RADA: Spots, Events & Outings in Nairobi

A React + Vite web app (installable as a PWA) backed by Supabase.

## Run it on your computer
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm run dev` (opens on http://localhost:3000)

## Check before every release
```
npm run lint     # type check
npm test         # guard tests
npm run build    # production build into /dist
npm run preview  # try the production build locally
```

## Put the website online
RADA is a static site. No server is needed.
- **Vercel:** import the repo. `vercel.json` already sets the build, the page rewrite and security headers.
- **Netlify / Cloudflare Pages:** build command `npm run build`, output folder `dist`. `public/_redirects` and `public/_headers` are included.
- In the host's environment settings add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_PUBLIC_URL` (your final web address).
- Do **not** set `VITE_ENABLE_DEMO` in production.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the website's settings.

## Supabase
- Run the SQL files in `supabase/migrations` in date order (the GitHub flow does not run them).
- In Supabase, keep **Confirm email** switched on (admin rights are tied to the admin email).
- Open the Security Advisor and make sure every table has row-level security.
- Edge functions live in `supabase/functions`. Payments stay off until the `MPESA_*` secrets are set. See `TICKETS_GO_LIVE.md`.

## Helper scripts (run on your own computer)
- `npm run seed:spots`: add spots from Google Maps data.
- `npm run seed:cinemas`: refresh cinema listings.
- `npm run shrink:photos`: shrink stored photos.

## Legal pages
`npm run legal` (also runs before every build) turns `src/data/legal.json` into public web pages: `/privacy.html`, `/terms.html`, `/guidelines.html` and `/merchant-terms.html`. Edit the text in `legal.json` only. If you want your operator name and address shown, fill `operator` in that file.

## Docs
`docs/RADA-User-Guide.pdf` and `docs/RADA-Plans-and-Pricing.pdf`.
