import { Badge, Card, EmptyState, Logo } from '@aquameet/ui';
import type { SessionProjection } from '@aquameet/sync';
import { currentDive, formatScore, hasResults, rankedRows } from './view-model';

/** Public results screen: the live ranking for a session. */
export function Results({ projection }: { projection: SessionProjection }) {
  const rows = rankedRows(projection);
  return (
    <div className="content" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div className="between" style={{ marginBottom: 20 }}>
        <Logo />
        <Badge tone="info">Live results</Badge>
      </div>
      <Card title="Results">
        {hasResults(projection) ? (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>Participant</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.entryId}>
                  <td className="rank">{row.rank}</td>
                  <td>{row.entryId}</td>
                  <td className="num">{formatScore(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="trophy" title="No results yet" description="As soon as the judges score, results appear here live." />
        )}
      </Card>
    </div>
  );
}

/** Big-screen scoreboard: the dive in focus plus the leader. */
export function Scoreboard({ projection }: { projection: SessionProjection }) {
  const dive = currentDive(projection);
  const leader = rankedRows(projection)[0];
  return (
    <div className="board">
      <div className="head">
        <Logo />
        <Badge tone="info">Live</Badge>
      </div>
      <div className="now">
        <span className="lbl">{dive ? (dive.pending ? 'Up next' : 'Last dive') : 'Waiting for the start'}</span>
        <span className="who">{dive?.entryId ?? '—'}</span>
        <span className="score mono">{formatScore(dive?.score)}</span>
      </div>
      {leader && (
        <div className="leader">
          Leader:&nbsp;<b>{leader.entryId}</b>&nbsp;— {formatScore(leader.total)}
        </div>
      )}
    </div>
  );
}
