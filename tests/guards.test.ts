// Run with: npm test   (uses Node's built-in test runner through tsx, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(join(root, dir))) {
    const rel = join(dir, f);
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

test('users are never told about Pochi, and the payout number is not in the app', () => {
  for (const f of walk('src')) {
    const s = read(f);
    assert.ok(!/pochi/i.test(s), `"Pochi" found in ${f}`);
    assert.ok(!s.includes('0758621886'), `payout number found in ${f}`);
  }
});

test('legal text: version, contact and key promises are present', () => {
  const legal = JSON.parse(read('src/data/legal.json'));
  assert.match(legal.version, /^2026-\d\d-draft-\d+$/);
  assert.equal(legal.support_email, 'hello.rada.app@gmail.com');
  const all = JSON.stringify(legal);
  assert.match(all, /does not renew by itself|do not renew by themselves/);
  assert.match(all, /Free plan/);
  assert.match(all, /Data Protection Act, 2019/);
  assert.match(all, /18 or older/);
});

test('demo mode cannot switch on in production by accident', () => {
  const s = read('src/lib/demoMode.ts');
  assert.match(s, /import\.meta\.env\.PROD/);
  assert.match(s, /DEMO_ALLOWED/);
});

test('only one admin email is hard-coded', () => {
  const s = read('src/types.ts');
  const emails = new Set((s.match(/[\w.+-]+@gmail\.com/g) || []).filter((e) => /admin|hello\.rada/.test(e)));
  assert.deepEqual([...emails], ['hello.rada.app@gmail.com']);
});

test('plan limits in the app match the numbers in the database migration', () => {
  const sub = read('src/lib/subscriptions.ts');
  const sql = read('supabase/migrations/20261110_phase2_limits.sql');
  assert.match(sub, /free: \{ perMonth: 4, attendees: 10 \}/);
  assert.match(sub, /pro: \{ perMonth: 10, attendees: 30 \}/);
  assert.match(sql, /when 'free' then 10 when 'pro' then 30/);
  assert.match(sql, /when 'free' then 4 when 'pro' then 10/);
  assert.match(sql, /v_used >= 12/);
  assert.match(sql, /v_used >= 10/);
  assert.match(sql, /v_used >= 20/);
});

test('migrations never delete user data', () => {
  for (const f of readdirSync(join(root, 'supabase/migrations')).filter((x) => x.startsWith('20261110') || x.startsWith('20261109'))) {
    const s = read(join('supabase/migrations', f)).toLowerCase();
    assert.ok(!/\bdelete from public\.(outings|rada_listings|hangouts|profiles)\b/.test(s), `${f} deletes user data`);
    assert.ok(!/\btruncate table\b/.test(s), `${f} truncates a table`);
  }
});

test('share preview tags and hosting config are in place', () => {
  const html = read('index.html');
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(Array.isArray(vercel.rewrites) && vercel.rewrites.some((r: any) => r.destination === '/index.html'));
  assert.ok(read('public/robots.txt').includes('User-agent'));
});

test('every script in package.json points to a file that exists', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const [name, cmd] of Object.entries(pkg.scripts as Record<string, string>)) {
    const m = String(cmd).match(/(?:node|tsx)\s+(?:--test\s+)?([\w./-]+\.(?:mjs|ts))/);
    if (m && !m[1].includes('*')) assert.ok(statSync(join(root, m[1])).isFile(), `script "${name}" points to missing ${m[1]}`);
  }
});

test('privacy policy covers the things the app really does', () => {
  const all = JSON.stringify(JSON.parse(read('src/data/legal.json')).docs.privacy);
  for (const word of ['data controller', 'Relationship status', 'Selfie check', 'Supabase', 'Open-Meteo', 'wsrv.nl', '72 hours', 'outside Kenya', 'Adults only|under 18']) {
    assert.match(all, new RegExp(word, 'i'), `privacy policy is missing: ${word}`);
  }
});

test('public legal pages exist and match the legal text version', () => {
  const legal = JSON.parse(read('src/data/legal.json'));
  for (const f of ['privacy.html', 'terms.html', 'guidelines.html', 'merchant-terms.html']) {
    const html = read(join('public', f));
    assert.ok(html.includes(legal.version), `${f} is out of date: run npm run legal`);
    assert.ok((html.match(/<h2>/g) || []).length >= 5, `${f} is missing its sections: run npm run legal`);
  }
});

test('no Google AI Studio leftovers', () => {
  for (const f of walk('src')) assert.ok(!/ai ?studio|aistudio/i.test(read(f)), `AI Studio text in ${f}`);
  assert.ok(!/ai ?studio|aistudio|DISABLE_HMR/i.test(read('vite.config.ts')));
  assert.ok(!/@google\/genai|"express"|"dotenv"/.test(read('package.json')));
});


test('face-check models are served from our own site, not a CDN', () => {
  const s = read('src/lib/faceCheck.ts');
  assert.match(s, /const MODEL_URL = '\/models'/);
  assert.ok(!/jsdelivr|unpkg|cdnjs/i.test(s), 'face check still points at a CDN');
  assert.match(read('package.json'), /copy-face-models\.mjs/);
});

test('index.html has a no-JavaScript fallback and the sitemap script covers the legal pages', () => {
  assert.match(read('index.html'), /<noscript>[\s\S]*RADA needs JavaScript[\s\S]*<\/noscript>/);
  const s = read('scripts/build-sitemap.mjs');
  for (const p of ['/privacy', '/terms', '/guidelines', '/merchant-terms']) assert.ok(s.includes(`'${p}'`), `sitemap is missing ${p}`);
});

test('Discover is hidden unless VITE_SHOW_DISCOVER=true, and the code is still there', () => {
  assert.match(read('src/lib/featureFlags.ts'), /VITE_SHOW_DISCOVER === 'true'/);
  const tab = read('src/components/SocialsTab.tsx');
  assert.match(tab, /DISCOVER_VISIBLE \|\| tab\.id !== 'discover'/);
  assert.match(tab, /fetchDiscoverPool/);
});

test('no inline scripts (so the Content-Security-Policy can forbid them) and a CSP header is set', () => {
  const html = read('index.html');
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html), 'inline <script> in index.html');
  assert.ok(!/\sonload=/.test(html), 'inline onload handler in index.html');
  for (const f of ['vercel.json', 'public/_headers']) {
    const s = read(f);
    assert.match(s, /Content-Security-Policy/);
    assert.match(s, /object-src 'none'/);
    assert.ok(!/script-src[^;]*unsafe-inline/.test(s), `${f}: script-src must not allow unsafe-inline`);
  }
});

test('terms say where listings come from, and the privacy text no longer names CDNs we dropped', () => {
  const all = JSON.stringify(JSON.parse(read('src/data/legal.json')));
  assert.match(all, /compiled from public sources/);
  assert.ok(!/jsDelivr|cdnjs|CARTO/.test(all));
});
