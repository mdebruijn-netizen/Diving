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
        <h1>Welkom, {session.org}</h1>
        <p>Hier bestuur je je wedstrijden. Begin met een nieuwe wedstrijd of controleer een sprongenlijst.</p>
      </div>

      <div className="grid cols-4">
        <Stat label="Wedstrijden" value={competitions.items.length} hint={competitions.items.length ? 'Beheren' : 'Nog geen wedstrijd'} icon="trophy" />
        <Stat label="Deelnemers" value={divers.items.length} hint={divers.items.length ? 'Ingeschreven' : 'Voeg divers toe'} icon="users" />
        <Stat label="Categorieën" value={categories.items.length} hint="Geslacht × leeftijd" icon="layers" />
        <Stat label="Live sessies" value="0" hint="Niets actief" icon="broadcast" />
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <Card title="Snel aan de slag">
          <div className="col">
            <QuickAction icon="trophy" title="Nieuwe wedstrijd" desc="Datum, locatie en onderdelen instellen." onClick={() => go('#/events')} />
            <QuickAction icon="users" title="Deelnemers toevoegen" desc="Importeer of voeg divers en clubs toe." onClick={() => go('#/participants')} />
            <QuickAction icon="clipboard" title="Dive sheet controleren" desc="Valideer een sprongenlijst tegen de FINA-tabel." onClick={() => go('#/sheets')} />
          </div>
        </Card>

        <Card title="Aan de slag">
          <div className="col">
            <Step done title="Account aangemaakt" />
            <Step title="Eerste wedstrijd aanmaken" />
            <Step title="Categorieën & deelnemers instellen" />
            <Step title="Live e-jurering starten" />
          </div>
          <div style={{ marginTop: 16 }}>
            <Button icon="plus" onClick={() => go('#/events')}>Nieuwe wedstrijd</Button>
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
        <h1>Dive-sheet validatie</h1>
        <p>Controleer een sprongenlijst tegen de officiële FINA 2017–2021 DD-tabel — vóór de wedstrijd, niet aan het bad.</p>
      </div>

      <div className="grid cols-2">
        <Card title="Sprongenlijst">
          <div className="grid cols-2" style={{ marginBottom: 14 }}>
            <Field label="Onderdeel">
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
                {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Aantal sprongen">
              <input type="number" value={diveCount} onChange={(e) => setDiveCount(Number(e.target.value))} />
            </Field>
            <Field label="Min. groepen">
              <input type="number" value={distinctGroups} onChange={(e) => setDistinctGroups(Number(e.target.value))} />
            </Field>
            <Field label="Max. totaal-DD" hint="Leeg = geen limiet">
              <input type="number" value={maxTotalDd} onChange={(e) => setMaxTotalDd(e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Sprongen" hint="Eén per regel: code positie (bv. 5253 B)">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} />
          </Field>
        </Card>

        <div className="col">
          <Card title="Resultaat" actions={result.valid ? <Badge tone="good">Geldig</Badge> : <Badge tone="bad">Ongeldig</Badge>}>
            <div className="grid cols-2">
              <Stat label="Totaal DD" value={result.totalDd.toFixed(1)} />
              <Stat label="Problemen" value={String(result.issues.length)} />
            </div>
          </Card>

          {result.issues.length > 0 ? (
            <Card title="Problemen">
              <div className="col">
                {result.issues.map((issue, i) => (
                  <div className="row" key={i} style={{ gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--bad)', marginTop: 2 }}><Icon name="alert" /></span>
                    <span className="col" style={{ gap: 2 }}>
                      <span><Badge tone="bad">{issue.code}</Badge>{issue.diveIndex !== undefined ? <span className="muted" style={{ marginLeft: 8 }}>regel {issue.diveIndex + 1}</span> : null}</span>
                      <span className="dim" style={{ fontSize: '0.9rem' }}>{issue.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Problemen">
              <EmptyState icon="check" title="Alles in orde" description="Deze lijst voldoet aan alle ingestelde regels." />
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
          title={`${title} — binnenkort`}
          description={description}
          action={cta ? <Button icon="plus">{cta}</Button> : undefined}
        />
      </Card>
    </>
  );
}
