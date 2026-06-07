import { useState } from 'react';
import { Button, Field, Icon, Logo } from '@aquameet/ui';
import { saveSession, type Session } from './auth';

const FEATURES = [
  'Competitions, categories and participants in one place',
  'Live e-judging with automatic results',
  'Public scoreboard and results in real time',
];

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const session: Session = { email: email.trim(), org: org.trim() || 'My organization' };
    saveSession(session);
    onLogin(session);
  };

  return (
    <div className="auth">
      <aside className="aside">
        <Logo />
        <div>
          <span className="kicker">Competition platform for diving</span>
          <h2 style={{ marginTop: 12 }}>Run your meet from entry to podium.</h2>
          <p className="lede">
            One professional workspace for the whole competition day — clean, fast and built for ease.
          </p>
          <div style={{ marginTop: 28 }}>
            {FEATURES.map((f) => (
              <div className="feature" key={f}>
                <span className="dot"><Icon name="check" /></span>
                <span className="dim">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <span className="muted">© AquaMeet</span>
      </aside>

      <div className="panel">
        <div className="box">
          <h1>Welcome back</h1>
          <p className="sub">Sign in to your organizer workspace.</p>
          <form className="col" onSubmit={submit}>
            <Field label="Email address">
              <input
                type="email"
                placeholder="you@club.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Organization / club" hint="Optional — shown in your workspace.">
              <input placeholder="Swim club…" value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" block>Sign in</Button>
          </form>
          <p className="muted" style={{ marginTop: 16, fontSize: '0.82rem' }}>
            Preview sign-in — password accounts are coming right after this.
          </p>
        </div>
      </div>
    </div>
  );
}
