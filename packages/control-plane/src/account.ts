import type { Subscription } from './subscription';

/**
 * Club/organisation accounts (plan v2 §4). An **organisation is a tenant**: it
 * owns competitions and carries the plan/subscription. People sign in with an
 * {@link Account} (email + optional password, or a magic link). This stays a
 * pure data/helper module — storage lives at the edge (apps/api).
 */

export type Role = 'org_admin' | 'competition_admin' | 'judge' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Account {
  id: string;
  organizationId: string;
  /** Lowercased email — the login identifier (unique across the platform). */
  email: string;
  /** PBKDF2 hash; absent for magic-link-only accounts. */
  passwordHash?: string;
  role: Role;
  createdAt: string;
}

export type AuthTokenKind = 'session' | 'magic';

export interface AuthToken {
  token: string;
  accountId: string;
  organizationId: string;
  kind: AuthTokenKind;
  /** ISO timestamp after which the token is rejected. */
  expiresAt: string;
  createdAt: string;
}

/** Far-future period end so the free plan reads as `active` indefinitely. */
export function freePlanPeriodEnd(now = new Date()): string {
  return new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
}

/** The starter subscription provisioned when an organisation is created. */
export function newFreeSubscription(organizationId: string, now = new Date()): Subscription {
  return {
    tenantId: organizationId,
    planId: 'free',
    status: 'active',
    currentPeriodEnd: freePlanPeriodEnd(now),
  };
}
