import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTabStack,
  pushTabToStack,
  popTabFromStack,
  normalizeNavTab,
} from '../src/lib/tabHistory.ts';

test('normalizes legacy plans tab id to outings', () => {
  assert.equal(normalizeNavTab('plans'), 'outings');
  assert.equal(normalizeNavTab('spots'), 'spots');
});

test('createInitialTabStack seeds home or [home, deepLinkTab]', () => {
  assert.deepEqual(createInitialTabStack('home'), ['home']);
  assert.deepEqual(createInitialTabStack('outings'), ['home', 'outings']);
  assert.deepEqual(createInitialTabStack('plans'), ['home', 'outings']);
});

test('pressing back walks backward through previously visited tabs in order', () => {
  let stack = createInitialTabStack('home');
  stack = pushTabToStack(stack, 'spots').stack;
  stack = pushTabToStack(stack, 'outings').stack;
  stack = pushTabToStack(stack, 'socials').stack;
  assert.deepEqual(stack, ['home', 'spots', 'outings', 'socials']);

  let res = popTabFromStack(stack, { radaApp: true, tab: 'outings', depth: 3 });
  assert.equal(res.targetTab, 'outings');
  assert.equal(res.poppedFrom, 'socials');
  stack = res.stack;

  res = popTabFromStack(stack, { radaApp: true, tab: 'spots', depth: 2 });
  assert.equal(res.targetTab, 'spots');
  assert.equal(res.poppedFrom, 'outings');
  stack = res.stack;

  res = popTabFromStack(stack, { radaApp: true, tab: 'home', depth: 1 });
  assert.equal(res.targetTab, 'home');
  assert.equal(res.poppedFrom, 'spots');
  stack = res.stack;

  // At root home, no previous tab remains (double-back exit prompt handles this)
  res = popTabFromStack(stack, { radaApp: true, guard: true, depth: 0 });
  assert.equal(res.targetTab, null);
  assert.deepEqual(res.stack, ['home']);
});

test('deduplicates consecutive identical tabs and preserves revisited tabs like Spots -> Home -> Outings', () => {
  let stack = createInitialTabStack('home');
  stack = pushTabToStack(stack, 'spots').stack;
  assert.equal(pushTabToStack(stack, 'spots').changed, false);
  stack = pushTabToStack(stack, 'home').stack;
  stack = pushTabToStack(stack, 'outings').stack;
  assert.deepEqual(stack, ['home', 'spots', 'home', 'outings']);

  let res = popTabFromStack(stack);
  assert.equal(res.targetTab, 'home');
  res = popTabFromStack(res.stack);
  assert.equal(res.targetTab, 'spots');
  res = popTabFromStack(res.stack);
  assert.equal(res.targetTab, 'home');
});

test('returns to spots even when mobile browser skips intermediate home entry to guard', () => {
  let stack = createInitialTabStack('home');
  stack = pushTabToStack(stack, 'spots').stack;

  const res = popTabFromStack(stack, { radaApp: true, guard: true, depth: 0 });
  assert.equal(res.targetTab, 'home');
  assert.equal(res.poppedFrom, 'spots');
  assert.deepEqual(res.stack, ['home']);
});

test('syncs stack if browser history jumps back multiple tabs', () => {
  let stack = createInitialTabStack('home');
  stack = pushTabToStack(stack, 'spots').stack;
  stack = pushTabToStack(stack, 'outings').stack;
  stack = pushTabToStack(stack, 'vault').stack;

  const res = popTabFromStack(stack, { radaApp: true, tab: 'spots', depth: 2 });
  assert.equal(res.targetTab, 'spots');
  assert.deepEqual(res.stack, ['home', 'spots']);
});
