import type { ReactNode } from 'react';
import { Badge, Button, Card, Logo } from '@aquameet/ui';

const ADMIN = `${window.location.origin}/admin/`;
const SIGNUP = `${ADMIN}#/signup`;

/** Shared marketing chrome (header + footer) for the public homepage & pricing. */
function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', maxWidth: 1080, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}
      >
        <a href="#/" style={{ textDecoration: 'none' }}><Logo /></a>
        <nav className="row" style={{ gap: 18, alignItems: 'center' }}>
          <a href="#/pricing" className="dim" style={{ textDecoration: 'none' }}>Pricing</a>
          <a href={ADMIN} className="dim" style={{ textDecoration: 'none' }}>Sign in</a>
          <a href={SIGNUP}><Button>Start free</Button></a>
        </nav>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 1080, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
        {children}
      </main>
      <footer style={{ borderTop: '1px solid var(--line-soft)', marginTop: 64 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span className="muted">© {new Date().getFullYear()} AquaMeet — diving competition software</span>
          <span className="row" style={{ gap: 16 }}>
            <a href="#/pricing" className="muted" style={{ textDecoration: 'none' }}>Pricing</a>
            <a href={ADMIN} className="muted" style={{ textDecoration: 'none' }}>Organiser login</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export function Home() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '64px 0 40px' }}>
        <Badge tone="good">World Aquatics scoring · Offline-resilient</Badge>
        <h1 style={{ fontSize: 'clamp(2.1rem, 5vw, 3.4rem)', lineHeight: 1.1, margin: '18px auto', maxWidth: 760 }}>
          Run diving meets without the chaos.
        </h1>
        <p className="dim" style={{ fontSize: '1.15rem', maxWidth: 620, margin: '0 auto 28px' }}>
          Entries, e-judging, live results and an event infoboard — in one calm workspace that
          keeps working even when the pool's wifi doesn't.
        </p>
        <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
          <a href={`${window.location.origin}/admin/#/signup`}><Button size="lg">Start free</Button></a>
          <a href={`${window.location.origin}/web/?session=demo&view=scoreboard`}><Button size="lg" variant="ghost">See a live board</Button></a>
        </div>
      </section>

      {/* Trust strip */}
      <section className="row" style={{ gap: 24, justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0 40px' }}>
        {['World Aquatics scoring', 'Offline-resilient poolside', 'Public results & infoboard', 'Built for clubs & federations'].map((t) => (
          <span key={t} className="muted" style={{ fontSize: '0.9rem' }}>✓ {t}</span>
        ))}
      </section>

      {/* Modules */}
      <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card title="Competition module">
          <ul className="dim" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Entries, categories & age-group rules</li>
            <li>E-judging on tablets, individual & synchro</li>
            <li>Automatic, reproducible results</li>
          </ul>
        </Card>
        <Card title="Infoboard module">
          <ul className="dim" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Schedule, start lists & live results</li>
            <li>Announcements & documents</li>
            <li>Mobile-first + big-screen TV mode</li>
          </ul>
        </Card>
      </section>

      {/* How it works */}
      <section style={{ padding: '56px 0 8px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 28 }}>How it works</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            ['1', 'Create a meet', 'Set up sessions, events and categories. Make it public or private.'],
            ['2', 'Clubs self-register', 'Clubs add divers and dive sheets via a magic link — no account needed.'],
            ['3', 'Judge & go live', 'Score on tablets; results and the board update in real time.'],
          ].map(([n, title, body]) => (
            <div key={n} style={{ padding: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--accent-grad)', color: '#04141a', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{n}</div>
              <h3 style={{ margin: '12px 0 6px' }}>{title}</h3>
              <p className="dim" style={{ margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Offline */}
      <section style={{ padding: '48px 0 8px' }}>
        <Card title="Works when the internet doesn't">
          <p className="dim" style={{ margin: 0, maxWidth: 720 }}>
            A local Venue Hub on the pool LAN keeps scoring on solid ground. Every score is an
            append-only event, results are always recomputed (never patched), and the hub syncs to
            the cloud when the connection returns — no silent merges, no lost dives. A lapsed
            connection never blocks a live meet.
          </p>
        </Card>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '56px 0 8px' }}>
        <h2 style={{ marginBottom: 12 }}>Start free, upgrade when you host.</h2>
        <p className="dim" style={{ marginBottom: 20 }}>The infoboard is free. Add the competition module when you run a real meet.</p>
        <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
          <a href={`${window.location.origin}/admin/#/signup`}><Button size="lg">Create your workspace</Button></a>
          <a href="#/pricing"><Button size="lg" variant="ghost">See pricing</Button></a>
        </div>
      </section>
    </MarketingShell>
  );
}

interface Tier {
  name: string;
  price: string;
  tagline: string;
  cta: string;
  href: string;
  highlight?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: 'Free', price: '€0', tagline: 'Try it out / tiny club', cta: 'Start free', href: SIGNUP,
    features: ['Infoboard module', '1 channel', '1 concurrent event', 'Public results page', 'Community support'],
  },
  {
    name: 'Infoboard', price: '€19/mo', tagline: 'Only the board', cta: 'Start free', href: SIGNUP,
    features: ['Everything in Free', 'Polls & feedback', '5 channels', '2 concurrent events', 'Club logo'],
  },
  {
    name: 'Competition Pro', price: '€79/mo', tagline: 'Run real meets', cta: 'Start free', href: SIGNUP, highlight: true,
    features: ['Competition module + e-judging', 'Synchro scoring', 'Live remote results & TV', '20 judge devices', '4 concurrent events', 'Priority support'],
  },
  {
    name: 'Enterprise', price: 'Custom', tagline: 'Federations', cta: 'Talk to us', href: 'mailto:sales@aquameet.app',
    features: ['Everything in Pro', 'Broadcast scoreboard + data API', 'White-label & SSO', 'High limits', 'SLA & onboarding'],
  },
];

export function Pricing() {
  return (
    <MarketingShell>
      <section style={{ textAlign: 'center', padding: '48px 0 28px' }}>
        <h1 style={{ marginBottom: 10 }}>Simple plans that scale with your meet</h1>
        <p className="dim" style={{ maxWidth: 560, margin: '0 auto' }}>
          The infoboard is free forever. The competition module is the paywall — pay only when you host.
        </p>
      </section>
      <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, paddingBottom: 12 }}>
        {TIERS.map((t) => (
          <div
            key={t.name}
            style={{
              border: `1px solid ${t.highlight ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 'var(--r-lg)', padding: 20,
              background: t.highlight ? 'rgba(45,212,191,0.06)' : 'var(--ink-850)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div className="row between">
              <b style={{ fontSize: '1.05rem' }}>{t.name}</b>
              {t.highlight && <Badge tone="good">Popular</Badge>}
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{t.price}</div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{t.tagline}</span>
            </div>
            <ul className="dim" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, flex: 1 }}>
              {t.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <a href={t.href}><Button block variant={t.highlight ? 'primary' : 'ghost'}>{t.cta}</Button></a>
          </div>
        ))}
      </section>
      <p className="muted" style={{ textAlign: 'center', fontSize: '0.85rem', paddingTop: 16 }}>
        Add-ons available: extra judge devices & channels, a one-off per-event Pro pass, white-label and a data API.
      </p>
    </MarketingShell>
  );
}
