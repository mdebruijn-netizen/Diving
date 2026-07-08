import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@aquameet/ui';
import { can, status as entStatus, type EntitlementDoc, type FeatureKey } from '@aquameet/entitlements';
import type { Plan } from '@aquameet/control-plane';
import { api } from './api';

export interface OrgInfo {
  organization: { id: string; name: string };
  account: { email: string; role: string };
  subscription: { planId: string; status: string; currentPeriodEnd: string } | null;
  plan: Plan;
  entitlement: { doc: EntitlementDoc };
  usage: Record<string, number>;
}

const OrgContext = createContext<OrgInfo | null>(null);

/** Loads the organisation's plan + entitlements once and shares them with the app. */
export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  useEffect(() => {
    api.get<OrgInfo>('/org').then(setOrg).catch(() => setOrg(null));
  }, []);
  return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgInfo | null {
  return useContext(OrgContext);
}

/** True when the org's verified entitlement currently grants the feature. */
export function useFeature(feature: FeatureKey): boolean {
  const org = useOrg();
  if (!org) return false;
  const doc = org.entitlement.doc;
  return entStatus(doc) !== 'expired' && can(doc, feature);
}

/**
 * Gate UI behind a plan feature. When locked it renders a small Pro badge (or a
 * custom fallback) so the capability is discoverable and drives upgrades.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useFeature(feature);
  if (allowed) return <>{children}</>;
  return <>{fallback ?? <Badge tone="warn">Pro</Badge>}</>;
}
