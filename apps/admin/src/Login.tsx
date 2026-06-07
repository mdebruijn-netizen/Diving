import { useState } from 'react';
import { Button, Field, Icon, Logo } from '@aquameet/ui';
import { saveSession, type Session } from './auth';

const FEATURES = [
  'Wedstrijden, categorieën en deelnemers op één plek',
  'Live e-jurering met automatische uitslagen',
  'Publiek scorebord en uitslagen in realtime',
];

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const session: Session = { email: email.trim(), org: org.trim() || 'Mijn organisatie' };
    saveSession(session);
    onLogin(session);
  };

  return (
    <div className="auth">
      <aside className="aside">
        <Logo />
        <div>
          <span className="kicker">Wedstrijdplatform voor schoonspringen</span>
          <h2 style={{ marginTop: 12 }}>Organiseer je wedstrijd van inschrijving tot podium.</h2>
          <p className="lede">
            Eén professionele omgeving voor de hele wedstrijddag — strak, snel en gemaakt voor gemak.
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
          <h1>Welkom terug</h1>
          <p className="sub">Log in op je organisator-omgeving.</p>
          <form className="col" onSubmit={submit}>
            <Field label="E-mailadres">
              <input
                type="email"
                placeholder="jij@club.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Organisatie / club" hint="Optioneel — verschijnt in je omgeving.">
              <input placeholder="Zwemvereniging…" value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" block>Inloggen</Button>
          </form>
          <p className="muted" style={{ marginTop: 16, fontSize: '0.82rem' }}>
            Preview-login — accounts met wachtwoord volgen direct hierna.
          </p>
        </div>
      </div>
    </div>
  );
}
