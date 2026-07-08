import { useEffect, useState } from 'react';
import { Logo } from '@aquameet/ui';
import { Results, Scoreboard } from './components';
import { useSession } from './useSession';
import { Join, RegistrationPage } from './register';
import { Home, Pricing } from './marketing';
import { PublicSchedule } from './schedule';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

/**
 * Public entry component. A live session (?session=ID) always shows the
 * results/scoreboard. Otherwise hash routes drive the marketing site (#/,
 * #/pricing) and the self-registration surfaces (#/join, #/r/<token>).
 */
export function App() {
  const hash = useHash();
  const hasSession = new URLSearchParams(window.location.search).has('session');
  if (hasSession) return <SessionApp />;
  if (hash.startsWith('#/join')) return <Join />;
  const reg = hash.match(/^#\/r\/(.+)$/);
  if (reg) return <RegistrationPage token={reg[1]!} />;
  const sched = hash.match(/^#\/schedule\/(.+)$/);
  if (sched) return <PublicSchedule competitionId={sched[1]!} />;
  if (hash.startsWith('#/pricing')) return <Pricing />;
  return <Home />;
}

function SessionApp() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') ?? 'demo';
  const apiBase = params.get('api') ?? window.location.origin;
  const view = params.get('view') ?? 'results';

  const projection = useSession(apiBase, sessionId);
  if (!projection) {
    return (
      <div className="screen">
        <Logo />
        <p className="muted">Connecting to session {sessionId}…</p>
      </div>
    );
  }
  return view === 'scoreboard' ? <Scoreboard projection={projection} /> : <Results projection={projection} />;
}
