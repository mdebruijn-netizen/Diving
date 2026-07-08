import type { PlanId } from './plans';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Subscription {
  tenantId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  /** ISO timestamp the current paid period ends — drives entitlement expiry. */
  currentPeriodEnd: string;
}

/** Billing events, typically mapped from Stripe webhooks. */
export type BillingEvent =
  | { type: 'activate' }
  | { type: 'payment_failed' }
  | { type: 'payment_recovered' }
  | { type: 'renew'; periodEnd: string }
  | { type: 'cancel' };

const TRANSITIONS: Record<SubscriptionStatus, Partial<Record<BillingEvent['type'], SubscriptionStatus>>> = {
  trialing: { activate: 'active', cancel: 'canceled' },
  active: { payment_failed: 'past_due', renew: 'active', cancel: 'canceled' },
  past_due: { payment_recovered: 'active', renew: 'active', cancel: 'canceled' },
  canceled: {},
};

export function nextStatus(current: SubscriptionStatus, event: BillingEvent): SubscriptionStatus {
  const next = TRANSITIONS[current][event.type];
  if (!next) {
    throw new Error(`illegal billing transition: ${current} -(${event.type})->`);
  }
  return next;
}

/** Apply a billing event, returning the updated subscription. */
export function applyBillingEvent(sub: Subscription, event: BillingEvent): Subscription {
  const status = nextStatus(sub.status, event);
  const currentPeriodEnd = event.type === 'renew' ? event.periodEnd : sub.currentPeriodEnd;
  return { ...sub, status, currentPeriodEnd };
}

/**
 * Plan whose entitlements currently apply: a canceled subscription falls back to
 * the free plan. (Time-based expiry/grace is enforced at runtime by the signed
 * entitlement document, not here.)
 */
export function resolvePlanId(sub: Subscription): PlanId {
  return sub.status === 'canceled' ? 'free' : sub.planId;
}
