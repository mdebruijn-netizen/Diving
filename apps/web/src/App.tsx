import { useEffect, useState } from 'react';
import { Logo } from '@aquameet/ui';
import { Results, Scoreboard } from './components';
import { useSession } from './useSession';
import { Join, RegistrationPage } from './register';

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
 * Public entry component. Hash routes drive the self-registration surfaces
 * (#/join, #/r/<token>); everything else is the live results/scoreboard,
 * configured via query params (?session=ID&view=results|scoreboard).
 */
export function App() {
  const hash = useHash();
  if (hash.startsWith('#/join')) return <Join />;
  const reg = hash.match(/^#\/r\/(.+)$/);
  if (reg) return <RegistrationPage token={reg[1]!} />;
  return <SessionApp />;
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
        <p className="muted">Verbinden met sessie {sessionId}…</p>
      </div>
    );
  }
  return view === 'scoreboard' ? <Scoreboard projection={projection} /> : <Results projection={projection} />;
}
