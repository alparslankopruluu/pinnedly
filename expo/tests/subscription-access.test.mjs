import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_USAGE_LIMITS, getAccessDecision } from '../types/subscription.ts';

const free = {
  plan: 'free',
  status: 'free',
  aiUsed: 0,
  aiLimit: 3,
};

const premium = {
  plan: 'premium',
  status: 'active',
  aiUsed: 0,
  aiLimit: 100,
};

test('free content limits allow the item below the boundary and block at the boundary', () => {
  for (const [resource, limit] of Object.entries(FREE_USAGE_LIMITS)) {
    assert.equal(
      getAccessDecision(free, 'create', { resource, usage: limit - 1 }).allowed,
      true
    );
    const blocked = getAccessDecision(free, 'create', {
      resource,
      usage: limit,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, 'limit_reached');
  }
});

test('premium content creation is unlimited', () => {
  assert.equal(
    getAccessDecision(premium, 'create', { resource: 'bookmarks', usage: 100_000 }).allowed,
    true
  );
});

test('premium-only features are blocked for free and enabled for premium', () => {
  for (const feature of ['kanban', 'projectGallery', 'sharing', 'advancedReminders', 'dataExport']) {
    assert.equal(getAccessDecision(free, feature).reason, 'premium_required');
    assert.equal(getAccessDecision(premium, feature).allowed, true);
  }
});

test('AI allows three free messages and one hundred premium messages', () => {
  assert.equal(getAccessDecision({ ...free, aiUsed: 2 }, 'ai').allowed, true);
  assert.equal(getAccessDecision({ ...free, aiUsed: 3 }, 'ai').allowed, false);
  assert.equal(getAccessDecision({ ...premium, aiUsed: 99 }, 'ai').allowed, true);
  assert.equal(getAccessDecision({ ...premium, aiUsed: 100 }, 'ai').reason, 'ai_quota_exhausted');
});

test('loading subscription state fails closed', () => {
  assert.equal(
    getAccessDecision({ ...free, status: 'loading' }, 'sharing').reason,
    'entitlement_unavailable'
  );
});
