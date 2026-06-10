import { Badge, Button, Card } from '@aquameet/ui';
import { PLANS, type PlanId } from '@aquameet/control-plane';
import { status as entStatus } from '@aquameet/entitlements';
import { useOrg } from './org';

const PRICING_URL = `${window.location.origin}/web/#/pricing`;
const LIMIT_LABELS: Record<string, string> = {
  concurrentEvents: 'Concurrent events',
  channels: 'Infoboard channels',
  judgeDevices: 'Judge devices',
};
const TIER_ORDER: PlanId[] = ['free', 'infoboard', 'competition_pro', 'enterprise'];

export function Billing() {
  const org = useOrg();
  if (!org) return <p className="muted">Loading plan…</p>;

  const doc = org.entitlement.doc;
  const st = entStatus(doc);
  const limits = org.plan.entitlements.limits;

  return (
    <div className="col" style={{ gap: 18 }}>
      <Card title="Your plan">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="col" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 10 }}>
              <h2 style={{ margin: 0 }}>{org.plan.name}</h2>
              <Badge tone={st === 'active' ? 'good' : st === 'grace' ? 'warn' : 'bad'}>
                {st === 'active' ? 'Active' : st === 'grace' ? 'Grace period' : 'Expired'}
              </Badge>
            </div>
            <span className="muted">{org.organization.name} · {org.account.email}</span>
          </div>
          <a href={PRICING_URL} target="_blank" rel="noreferrer"><Button icon="trophy">Compare plans</Button></a>
        </div>
      </Card>

      <Card title="Usage this period">
        <div className="col" style={{ gap: 14 }}>
          {Object.keys(LIMIT_LABELS).map((key) => {
            const lim = limits[key];
            const used = org.usage[key] ?? 0;
            if (lim === undefined) {
              return <UsageRow key={key} label={LIMIT_LABELS[key]!} used={used} limit={undefined} />;
            }
            return <UsageRow key={key} label={LIMIT_LABELS[key]!} used={used} limit={lim} />;
          })}
        </div>
      </Card>

      <Card title="Plans">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {TIER_ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = org.plan.id === id;
            const feats = Object.keys(plan.entitlements.features).filter((f) => plan.entitlements.features[f as keyof typeof plan.entitlements.features]);
            return (
              <div
                key={id}
                style={{
                  border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 'var(--r)',
                  padding: 14,
                  background: isCurrent ? 'rgba(45,212,191,0.06)' : 'transparent',
                }}
              >
                <div className="row between">
                  <b>{plan.name}</b>
                  {isCurrent && <Badge tone="good">Current</Badge>}
                </div>
                <p className="muted" style={{ fontSize: '0.8rem', margin: '8px 0 0' }}>{feats.length} features</p>
                {!isCurrent && (
                  <a href={PRICING_URL} target="_blank" rel="noreferrer">
                    <Button variant="ghost" block>{id === 'free' ? 'Downgrade' : 'Upgrade'}</Button>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | undefined }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const over = limit !== undefined && used > limit;
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row between">
        <span>{label}</span>
        <span className="muted">{used}{limit !== undefined ? ` / ${limit}` : ''}</span>
      </div>
      {limit !== undefined ? (
        <div style={{ height: 8, borderRadius: 6, background: 'var(--line-soft)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--bad)' : 'var(--accent-grad)' }} />
        </div>
      ) : (
        <span className="muted" style={{ fontSize: '0.8rem' }}>Not included in this plan</span>
      )}
    </div>
  );
}
