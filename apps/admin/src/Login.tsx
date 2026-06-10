import { useState } from 'react';
import { Button, Field, Icon, Logo } from '@aquameet/ui';
import { saveSession, type Session } from './auth';

const FEATURES = [
  'Create public or private competitions in minutes',
  'Live e-judging with automatic World Aquatics results',
  'Public scoreboard, results and infoboard in real time',
];

const AUTH = `${window.location.origin}/api/auth`;

type Mode = 'login' | 'signup';

interface SessionResponse {
  token: string;
  email: string;
  org: string;
  organizationId: string;
  role: string;
}

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [mode, setMode] = useState<Mode>(() => (window.location.hash.includes('signup') ? 'signup' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [org, setOrg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const land = (r: SessionResponse) => {
    const session: Session = {
      email: r.email,
      org: r.org,
      token: r.token,
      organizationId: r.organizationId,
      role: r.role,
    };
    saveSession(session);
    onLogin(session);
  };

  const call = async (path: string, body: unknown) => {
    const res = await fetch(`${AUTH}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `error_${res.status}`);
    return data;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMagicLink(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        land((await call('/signup', { email: email.trim(), password: password || undefined, orgName: org.trim() })) as SessionResponse);
      } else {
        land((await call('/login', { email: email.trim(), password })) as SessionResponse);
      }
    } catch (err) {
      setError(friendly(String((err as Error).message)));
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async () => {
    setError(null);
    setMagicLink(null);
    if (!email.trim()) return setError('Enter your email first.');
    setBusy(true);
    try {
      const res = (await call('/magic/request', { email: email.trim() })) as { sent: boolean; link?: string };
      setMagicLink(res.link ?? 'sent');
    } catch (err) {
      setError(friendly(String((err as Error).message)));
    } finally {
      setBusy(false);
    }
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
          <div className="row" style={{ gap: 8, marginBottom: 18 }}>
            <Button variant={mode === 'login' ? 'primary' : 'ghost'} onClick={() => setMode('login')}>Sign in</Button>
            <Button variant={mode === 'signup' ? 'primary' : 'ghost'} onClick={() => setMode('signup')}>Create organisation</Button>
          </div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Start free'}</h1>
          <p className="sub">
            {mode === 'login' ? 'Sign in to your organiser workspace.' : 'Create your club/federation workspace on the free plan.'}
          </p>

          <form className="col" onSubmit={submit}>
            {mode === 'signup' && (
              <Field label="Organisation / club">
                <input placeholder="Diving club…" value={org} onChange={(e) => setOrg(e.target.value)} required />
              </Field>
            )}
            <Field label="Email address">
              <input type="email" placeholder="you@club.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </Field>
            <Field label={mode === 'signup' ? 'Password (optional)' : 'Password'} hint={mode === 'signup' ? 'Leave blank to use magic-link sign-in only.' : undefined}>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>

            {error && <p style={{ color: 'var(--bad)', fontSize: '0.86rem', margin: 0 }}>{error}</p>}
            {magicLink && (
              <p style={{ fontSize: '0.86rem', margin: 0 }} className="dim">
                Check your email for a sign-in link.{' '}
                {magicLink !== 'sent' && (<>Dev link: <a href={magicLink}>open</a></>)}
              </p>
            )}

            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create organisation' : 'Sign in'}
            </Button>
          </form>

          <button
            onClick={sendMagic}
            disabled={busy}
            style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.86rem', padding: 0 }}
          >
            Email me a sign-in link instead
          </button>
        </div>
      </div>
    </div>
  );
}

function friendly(code: string): string {
  switch (code) {
    case 'email_in_use': return 'That email already has an account — sign in instead.';
    case 'invalid_credentials': return 'Wrong email or password.';
    case 'email_and_org_required': return 'Enter an organisation name and email.';
    default: return 'Something went wrong. Please try again.';
  }
}
