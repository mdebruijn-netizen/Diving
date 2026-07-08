import type { EntitlementDoc, EntitlementStatus, FeatureKey } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a feature is enabled in a (already verified) entitlement document. */
export function can(doc: EntitlementDoc, feature: FeatureKey): boolean {
  return doc.entitlements.features[feature] === true;
}

/** Read a numeric limit, or `Infinity` when unspecified. */
export function limit(doc: EntitlementDoc, key: string): number {
  return doc.entitlements.limits[key] ?? Infinity;
}

/**
 * Validity status at `now`: `active` up to `expiresAt`, then `grace` for
 * `offlineGraceDays`, then `expired`. The hub/desktop keep operating while not
 * expired, so a live meet is never blocked mid-event.
 */
export function status(doc: EntitlementDoc, now: Date = new Date()): EntitlementStatus {
  const expires = Date.parse(doc.expiresAt);
  const graceEnd = expires + doc.offlineGraceDays * DAY_MS;
  const t = now.getTime();
  if (t <= expires) return 'active';
  if (t <= graceEnd) return 'grace';
  return 'expired';
}

/** A document is usable (features may be granted) unless it has expired. */
export function isUsable(doc: EntitlementDoc, now: Date = new Date()): boolean {
  return status(doc, now) !== 'expired';
}

/**
 * Resolve a feature, honouring validity: an expired document grants nothing,
 * regardless of its feature flags.
 */
export function canNow(doc: EntitlementDoc, feature: FeatureKey, now: Date = new Date()): boolean {
  return isUsable(doc, now) && can(doc, feature);
}
