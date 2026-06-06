import type { SessionProjection } from '@aquameet/sync';
import { currentDive, formatScore, hasResults, rankedRows } from './view-model';

/** Public results screen: the live ranking for a session. */
export function Results({ projection }: { projection: SessionProjection }) {
  if (!hasResults(projection)) {
    return <main className="empty">Nog geen uitslagen.</main>;
  }
  return (
    <main className="results">
      <h1>Uitslag</h1>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Deelnemer</th>
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          {rankedRows(projection).map((row) => (
            <tr key={row.entryId}>
              <td>{row.rank}</td>
              <td>{row.entryId}</td>
              <td>{formatScore(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

/** Big-screen scoreboard: the dive in focus plus the leader. */
export function Scoreboard({ projection }: { projection: SessionProjection }) {
  const dive = currentDive(projection);
  const leader = rankedRows(projection)[0];
  return (
    <main className="scoreboard">
      {dive ? (
        <section className="now">
          <span className="label">{dive.pending ? 'Aan de beurt' : 'Laatste sprong'}</span>
          <span className="entry">{dive.entryId}</span>
          <span className="score">{formatScore(dive.score)}</span>
        </section>
      ) : (
        <section className="now">
          <span className="label">Wachten op de eerste sprong…</span>
        </section>
      )}
      {leader && (
        <footer className="leader">
          Leider: {leader.entryId} — {formatScore(leader.total)}
        </footer>
      )}
    </main>
  );
}
