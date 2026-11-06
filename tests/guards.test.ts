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
