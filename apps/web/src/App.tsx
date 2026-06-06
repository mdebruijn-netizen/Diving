import { Results, Scoreboard } from './components';
import { useSession } from './useSession';

/**
 * Entry component. Configured via query params so a single deploy serves both
 * surfaces: ?session=ID&view=results|scoreboard&api=https://api.example.
 */
export function App() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') ?? 'demo';
  const apiBase = params.get('api') ?? window.location.origin;
  const view = params.get('view') ?? 'results';

  const projection = useSession(apiBase, sessionId);
  if (!projection) {
    return <main className="loading">Verbinden met sessie {sessionId}…</main>;
  }
  return view === 'scoreboard' ? (
    <Scoreboard projection={projection} />
  ) : (
    <Results projection={projection} />
  );
}
