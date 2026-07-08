import type { Entitlements } from '@aquameet/entitlements';

/**
 * Plan catalogue (plan Deel 2 §C, Deel 3 §O). Plans are the single source of
 * truth for what a tenant may do; an entitlement document is derived from the
 * tenant's plan + subscription and signed for offline-verifiable feature gating.
 */
export type PlanId = 'free' | 'infoboard' | 'competition_pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  entitlements: Entitlements;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    entitlements: {
      features: { 'infoboard.module': true },
      limits: { channels: 1, concurrentEvents: 1 },
    },
  },
  infoboard: {
    id: 'infoboard',
    name: 'Infoboard',
    entitlements: {
      features: {
        'infoboard.module': true,
        'infoboard.polls': true,
        'infoboard.feedback': true,
      },
      limits: { channels: 5, concurrentEvents: 2 },
    },
  },
  competition_pro: {
    id: 'competition_pro',
    name: 'Competition Pro',
    entitlements: {
      features: {
        'infoboard.module': true,
        'infoboard.polls': true,
        'infoboard.feedback': true,
        'competition.module': true,
        'competition.ejudging': true,
        'competition.synchro': true,
        'competition.liveremote': true,
        'scoreboard.external': true,
      },
      limits: { channels: 20, concurrentEvents: 4, judgeDevices: 20 },
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    entitlements: {
      features: {
        'infoboard.module': true,
        'infoboard.polls': true,
        'infoboard.feedback': true,
        'competition.module': true,
        'competition.ejudging': true,
        'competition.synchro': true,
        'competition.liveremote': true,
        'scoreboard.external': true,
        'scoreboard.broadcast': true,
      },
      limits: { channels: 1000, concurrentEvents: 50, judgeDevices: 200 },
    },
  },
};

export function planFor(planId: PlanId): Plan {
  return PLANS[planId];
}
