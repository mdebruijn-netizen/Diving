import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Icon, Stat, type IconName } from '@aquameet/ui';
import type { Category, Competition, Diver } from '@aquameet/competition';
import { DISCIPLINES, type Discipline, parseSheetInput, validateSheet } from './view-model';
import { useCollection } from './api';
import type { Session } from './auth';

function go(hash: string) {
  window.location.hash = hash;
}

/* ---------------- Dashboard ---------------- */
export function Dashboard({ session }: { session: Session }) {
  const competitions = useCollection<Competition>('/competitions');
  const divers = useCollection<Diver>('/divers');
  const categories = useCollection<Category>('/categories');

  return (
    <>
      <div className="page-head">
        <h1>Welcome, {session.org}</h1>
        <p>Run your competitions from here. Start with a new competition or check a dive sheet.</p>
      </div>

      <div className="grid cols-4">
        <Stat label="Competitions" value={competitions.items.length} hint={competitions.items.length ? 'Manage' : 'No competitions yet'} icon="trophy" />
        <Stat label="Participants" value={divers.items.length} hint={divers.items.length ? 'Registered' : 'Add divers'} icon="users" />
        <Stat label="Categories" value={categories.items.length} hint="Gender × age" icon="layers" />
        <Stat label="Live sessions" value="0" hint="Nothing active" icon="broadcast" />
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <Card title="Quick start">
          <div className="col">
            <QuickAction icon="trophy" title="New competition" desc="Set date, location and events." onClick={() => go('#/events')} />
            <QuickAction icon="users" title="Add participants" desc="Import or add divers and clubs." onClick={() => go('#/participants')} />
            <QuickAction icon="clipboard" title="Enter a diver" desc="Enter with a program — validated instantly." onClick={() => go('#/enroll')} />
          </div>
        </Card>

        <Card title="Getting started">
          <div className="col">
            <Step done title="Account created" />
            <Step title="Create your first competition" />
            <Step title="Set up categories & participants" />
            <Step title="Start live e-judging" />
          </div>
          <div style={{ marginTop: 16 }}>
            <Button icon="plus" onClick={() => go('#/events')}>New competition</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function QuickAction({ icon, title, desc, onClick }: { icon: IconName; title: string; desc: string; onClick: () => void }) {
  return (
    <button className="row between" onClick={onClick} style={{ all: 'unset', cursor: 'pointer', padding: '12px', borderRadius: 12, border: '1px solid var(--line-soft)' }}>
      <span className="row">
        <span className="stat-mini" style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(34,211,238,0.12)', color: 'var(--cyan)' }}>
          <Icon name={icon} />
        </span>
        <span className="col" style={{ gap: 2 }}>
          <b>{title}</b>
          <span className="muted" style={{ fontSize: '0.84rem' }}>{desc}</span>
        </span>
      </span>
      <Icon name="play" />
    </button>
  );
}

function Step({ title, done }: { title: string; done?: boolean }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: done ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.05)', color: done ? 'var(--good)' : 'var(--muted)' }}>
        <Icon name="check" />
      </span>
      <span className={done ? 'dim' : ''} style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--text)' }}>{title}</span>
    </div>
  );
}

/* ---------------- Dive-sheet validation ---------------- */
export function Validate() {
  const [discipline, setDiscipline] = useState<Discipline>('springboard-3m');
  const [diveCount, setDiveCount] = useState(6);
  const [distinctGroups, setDistinctGroups] = useState(4);
  const [maxTotalDd, setMaxTotalDd] = useState<number | ''>('');
  const [text, setText] = useState('101 B\n201 B\n301 B\n401 B\n5253 B\n105 B');

  const result = useMemo(
    () =>
      validateSheet(discipline, parseSheetInput(text), {
        diveCount,
        requireDistinctGroups: distinctGroups,
        maxTotalDd: maxTotalDd === '' ? undefined : maxTotalDd,
      }),
    [discipline, text, diveCount, distinctGroups, maxTotalDd],
  );

  return (
    <>
      <div className="page-head">
        <h1>Sheet checker</h1>
        <p>Quickly try a standalone dive sheet against the FINA 2017–2021 DD table — handy for custom or exception schemes. Entering divers is done under Entries, where sheets are validated automatically.</p>
      </div>

      <div className="grid cols-2">
        <Card title="Dive sheet">
          <div className="grid cols-2" style={{ marginBottom: 14 }}>
            <Field label="Event">
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
                {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Number of dives">
              <input type="number" value={diveCount} onChange={(e) => setDiveCount(Number(e.target.value))} />
            </Field>
            <Field label="Min. groups">
              <input type="number" value={distinctGroups} onChange={(e) => setDistinctGroups(Number(e.target.value))} />
            </Field>
            <Field label="Max. total DD" hint="Empty = no limit">
              <input type="number" value={maxTotalDd} onChange={(e) => setMaxTotalDd(e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Dives" hint="One per line: code position (e.g. 5253 B)">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} />
          </Field>
        </Card>

        <div className="col">
          <Card title="Result" actions={result.valid ? <Badge tone="good">Valid</Badge> : <Badge tone="bad">Invalid</Badge>}>
            <div className="grid cols-2">
              <Stat label="Total DD" value={result.totalDd.toFixed(1)} />
              <Stat label="Issues" value={String(result.issues.length)} />
            </div>
          </Card>

          {result.issues.length > 0 ? (
            <Card title="Issues">
              <div className="col">
                {result.issues.map((issue, i) => (
                  <div className="row" key={i} style={{ gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--bad)', marginTop: 2 }}><Icon name="alert" /></span>
                    <span className="col" style={{ gap: 2 }}>
                      <span><Badge tone="bad">{issue.code}</Badge>{issue.diveIndex !== undefined ? <span className="muted" style={{ marginLeft: 8 }}>line {issue.diveIndex + 1}</span> : null}</span>
                      <span className="dim" style={{ fontSize: '0.9rem' }}>{issue.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Issues">
              <EmptyState icon="check" title="All good" description="This sheet meets every configured rule." />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Polished placeholders ---------------- */
export function Stub({ title, description, icon, cta }: { title: string; description: string; icon: IconName; cta?: string }) {
  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <Card>
        <EmptyState
          icon={icon}
          title={`${title} — coming soon`}
          description={description}
          action={cta ? <Button icon="plus">{cta}</Button> : undefined}
        />
      </Card>
    </>
  );
}
