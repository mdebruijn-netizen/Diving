import type { EntitlementDoc } from '@aquameet/entitlements';
import { planFor } from './plans';
import { resolvePlanId, type Subscription } from './subscription';

export interface BuildDocInput {
  subscription: Subscription;
  issuedAt: string;
  /** Days the document keeps working offline past the billing period end. */
  offlineGraceDays: number;
  /** Unique value per issuance (replay protection). */
  nonce: string;
}

/**
 * Build the (unsigned) entitlement document for a tenant from its subscription.
 * Expiry is tied to the billing period so the runtime grace/expiry logic in
 * `@aquameet/entitlements` takes over from there. Signing happens at the edge
 * with the private key; this stays a pure, testable mapping.
 */
export function buildEntitlementDoc(input: BuildDocInput): EntitlementDoc {
  const plan = planFor(resolvePlanId(input.subscription));
  return {
    v: 1,
    tenantId: input.subscription.tenantId,
    plan: plan.id,
    entitlements: plan.entitlements,
    issuedAt: input.issuedAt,
    expiresAt: input.subscription.currentPeriodEnd,
    offlineGraceDays: input.offlineGraceDays,
    nonce: input.nonce,
  };
}
