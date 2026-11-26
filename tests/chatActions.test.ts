import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDIT_WINDOW_MS,
  DELETE_FOR_EVERYONE_WINDOW_MS,
  canEditMessage,
  canDeleteForEveryone,
  canDeleteAllForEveryone,
  formatMessagesForCopy,
  isChatHiddenLocally,
} from '../src/lib/chatActions.ts';
import { initialOffers } from '../src/data/initialData.ts';
import { demoMerchantOffers } from '../src/lib/demoPersonas.ts';
import type { ChatConversation, ChatMessage } from '../src/types.ts';

test('canEditMessage enforces 10-minute window and own plain text only', () => {
  const now = Date.UTC(2026, 10, 26, 12, 0, 0);
  const base: ChatMessage = {
    id: 'm1',
    sender: 'me',
    text: 'Meet at 7pm',
    time: '12:00 PM',
    createdAt: new Date(now - 9 * 60 * 1000).toISOString(),
  };

  assert.equal(canEditMessage(base, now), true);
  assert.equal(canEditMessage({ ...base, createdAt: new Date(now - EDIT_WINDOW_MS).toISOString() }, now), true);
  assert.equal(canEditMessage({ ...base, createdAt: new Date(now - EDIT_WINDOW_MS - 1000).toISOString() }, now), false);
  assert.equal(canEditMessage({ ...base, sender: 'them' }, now), false);
  assert.equal(canEditMessage({ ...base, photos: ['https://example.com/a.jpg'] }, now), false);
  assert.equal(canEditMessage({ ...base, audioUrl: 'https://example.com/a.webm' }, now), false);
  assert.equal(
    canEditMessage({ ...base, dateInvite: { spotTitle: 'Talisman', address: 'Karen', date: '2026-11-28', time: '7:00 PM' } }, now),
    false
  );
  assert.equal(canEditMessage({ ...base, text: 'Date accepted: Talisman on 2026-11-28 at 7:00 PM' }, now), false);
});

test('canDeleteForEveryone and canDeleteAllForEveryone enforce 12-hour window silently', () => {
  const now = Date.UTC(2026, 10, 26, 20, 0, 0);
  const recentMine: ChatMessage = {
    id: 'm1',
    sender: 'me',
    text: 'On my way',
    time: '8:00 AM',
    createdAt: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
  };
  const expiredMine: ChatMessage = {
    id: 'm2',
    sender: 'me',
    text: 'Yesterday message',
    time: '7:00 AM',
    createdAt: new Date(now - DELETE_FOR_EVERYONE_WINDOW_MS - 1000).toISOString(),
  };
  const theirs: ChatMessage = {
    id: 'm3',
    sender: 'them',
    text: 'Sounds good',
    time: '8:05 AM',
    createdAt: new Date(now - 60 * 1000).toISOString(),
  };

  assert.equal(canDeleteForEveryone(recentMine, now), true);
  assert.equal(canDeleteForEveryone(expiredMine, now), false);
  assert.equal(canDeleteForEveryone(theirs, now), false);

  assert.equal(canDeleteAllForEveryone([recentMine], now), true);
  assert.equal(canDeleteAllForEveryone([recentMine, expiredMine], now), false);
  assert.equal(canDeleteAllForEveryone([recentMine, theirs], now), false);
  assert.equal(canDeleteAllForEveryone([], now), false);
});

test('formatMessagesForCopy formats single and multiple selected messages', () => {
  const m1: ChatMessage = { id: '1', sender: 'me', text: 'Karura morning walk?', time: '09:00' };
  const m2: ChatMessage = { id: '2', sender: 'them', text: 'Gate A at 8!', time: '09:02' };
  assert.equal(formatMessagesForCopy([m1], '@wanjiru'), 'Karura morning walk?');
  assert.equal(
    formatMessagesForCopy([m1, m2], '@wanjiru'),
    '[09:00] You: Karura morning walk?\n[09:02] @wanjiru: Gate A at 8!'
  );
});

test('isChatHiddenLocally hides deleted chats until a newer message arrives', () => {
  const conv = {
    id: 'c1',
    name: '@brian',
    avatar: '',
    type: 'direct',
    lastMessage: 'Hi',
    messages: [],
    lastMessageAt: new Date(1000).toISOString(),
  } as ChatConversation;

  assert.equal(isChatHiddenLocally(conv, { c1: 2000 }), true);
  assert.equal(isChatHiddenLocally(conv, { c1: 500 }), false);
});

test('offers and promotions contain real Nairobi venues without claimCode redeeming', () => {
  assert.ok(initialOffers.length >= 8);
  for (const offer of initialOffers) {
    assert.equal(offer.claimCode, undefined, `Offer ${offer.id} should not have claimCode`);
    assert.ok(offer.posterUrl && offer.posterUrl.startsWith('https://'), `Offer ${offer.id} needs posterUrl`);
    assert.ok(offer.venue || offer.location, `Offer ${offer.id} needs venue/location`);
  }

  const demoOffers = demoMerchantOffers();
  assert.ok(demoOffers.length > 0);
  for (const offer of demoOffers) {
    assert.equal(offer.claimCode, undefined, `Demo offer ${offer.id} should not have claimCode`);
  }
});
