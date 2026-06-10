import { useEffect, useState } from 'react';
import { Card, Logo } from '@aquameet/ui';
import type { Category, Session } from '@aquameet/competition';
import { ageBandLabel, formatDateRange } from '@aquameet/competition';
import { publicApi } from './public-api';

interface ScheduleData {
  competition: { id: string; name: string; date: string; endDate?: string; location?: string };
  schedule: { session: Session; categories: Category[] }[];
  unscheduled: Category[];
}

const SHELL: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '40px 20px' };

/** Public, read-only schedule for a competition (sessions + their events). */
export function PublicSchedule({ competitionId }: { competitionId: string }) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    publicApi.get<ScheduleData>(`/competitions/${competitionId}/schedule`).then(setData).catch(() => setMissing(true));
  }, [competitionId]);

  if (missing) {
    return <div className="content" style={SHELL}><Logo /><Card title="Not found"><p className="muted">This competition schedule isn't available.</p></Card></div>;
  }
  if (!data) return <div className="content" style={SHELL}><Logo /><p className="muted">Loading schedule…</p></div>;

  return (
    <div className="content" style={SHELL}>
      <div style={{ marginBottom: 20 }}><Logo /></div>
      <Card title={data.competition.name}>
        <p className="muted" style={{ marginTop: 0 }}>
          {data.competition.location ? `${data.competition.location} · ` : ''}
          {data.competition.date ? formatDateRange(data.competition.date, data.competition.endDate) : ''}
        </p>
      </Card>

      {data.schedule.length === 0 ? (
        <p className="muted">The schedule hasn't been published yet.</p>
      ) : (
        data.schedule.map(({ session, categories }) => (
          <Card key={session.id} title={`${session.name}${session.startTime ? ` · ${session.startTime}` : ''}`}>
            {categories.length === 0 ? (
              <p className="muted">No events yet.</p>
            ) : (
              <table className="table">
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ width: 28 }} className="dim">{i + 1}</td>
                      <td><b>{c.name}</b></td>
                      <td className="dim">{c.gender} · {c.rules.diveCount} dives{ageBandLabel(c) ? ` · ${ageBandLabel(c)}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}

      {data.unscheduled.length > 0 && (
        <Card title="Not yet scheduled">
          <div className="col" style={{ gap: 4 }}>
            {data.unscheduled.map((c) => (
              <span key={c.id}><b>{c.name}</b> <span className="muted" style={{ fontSize: '0.82rem' }}>{c.gender} · {c.rules.diveCount} dives</span></span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
