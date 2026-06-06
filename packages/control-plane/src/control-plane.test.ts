import { describe, it, expect } from 'vitest';
import { canNow } from '@aquameet/entitlements';
import {
  PLANS,
  applyBillingEvent,
  buildEntitlementDoc,
  nextStatus,
  resolvePlanId,
  type Subscription,
} from './index';

describe('plan catalogue', () => {
  it('gates competition features by plan', () => {
    expect(PLANS.competition_pro.entitlements.features['competition.ejudging']).toBe(true);
    expect(PLANS.free.entitlements.features['competition.ejudging']).toBeUndefined();
    expect(PLANS.enterprise.entitlements.features['scoreboard.broadcast']).toBe(true);
    expect(PLANS.competition_pro.entitlements.features['scoreboard.broadcast']).toBeUndefined();
  });
});

describe('subscription state machine', () => {
  it('follows the happy path trialing -> active -> renew', () => {
    expect(nextStatus('trialing', { type: 'activate' })).toBe('active');
    expect(nextStatus('active', { type: 'renew', periodEnd: 'x' })).toBe('active');
  });

  it('handles dunning: active -> past_due -> recovered', () => {
    expect(nextStatus('active', { type: 'payment_failed' })).toBe('past_due');
    expect(nextStatus('past_due', { type: 'payment_recovered' })).toBe('active');
  });

  it('cancels from any live state and treats canceled as terminal', () => {
    expect(nextStatus('active', { type: 'cancel' })).toBe('canceled');
    expect(() => nextStatus('canceled', { type: 'activate' })).toThrow(/illegal/);
  });

  it('rejects illegal transitions', () => {
    expect(() => nextStatus('trialing', { type: 'payment_recovered' })).toThrow(/illegal/);
  });

  it('renew extends the billing period', () => {
    const sub: Subscription = {
      tenantId: 't1',
      planId: 'competition_pro',
      status: 'active',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    };
    const renewed = applyBillingEvent(sub, { type: 'renew', periodEnd: '2026-08-01T00:00:00.000Z' });
    expect(renewed.currentPeriodEnd).toBe('2026-08-01T00:00:00.000Z');
    expect(renewed.status).toBe('active');
  });

  it('falls back to free when canceled', () => {
    const sub: Subscription = {
      tenantId: 't1',
      planId: 'competition_pro',
      status: 'canceled',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    };
    expect(resolvePlanId(sub)).toBe('free');
  });
});

describe('entitlement document build', () => {
  const sub: Subscription = {
    tenantId: 't1',
    planId: 'competition_pro',
    status: 'active',
    currentPeriodEnd: '2026-07-01T00:00:00.000Z',
  };

  it('maps plan features and ties expiry to the billing period', () => {
    const doc = buildEntitlementDoc({ subscription: sub, issuedAt: '2026-06-01T00:00:00.000Z', offlineGraceDays: 30, nonce: 'n1' });
    expect(doc.plan).toBe('competition_pro');
    expect(doc.expiresAt).toBe('2026-07-01T00:00:00.000Z');
    // The runtime gate then grants features within the period...
    expect(canNow(doc, 'competition.ejudging', new Date('2026-06-15T00:00:00Z'))).toBe(true);
    // ...and denies them once past expiry + grace.
    expect(canNow(doc, 'competition.ejudging', new Date('2026-09-01T00:00:00Z'))).toBe(false);
  });

  it('downgrades a canceled tenant to free entitlements', () => {
    const doc = buildEntitlementDoc({
      subscription: { ...sub, status: 'canceled' },
      issuedAt: '2026-06-01T00:00:00.000Z',
      offlineGraceDays: 30,
      nonce: 'n2',
    });
    expect(doc.plan).toBe('free');
    expect(canNow(doc, 'competition.ejudging', new Date('2026-06-15T00:00:00Z'))).toBe(false);
  });
});
