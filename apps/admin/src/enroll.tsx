import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Icon, Stat } from '@aquameet/ui';
import type { Category, Competition, DiveSheet, Diver, Entry } from '@aquameet/competition';
import { api, newId, useCollection } from './api';
import { parseSheetInput, validateSheet, type Discipline } from './view-model';

const EXAMPLE = '101 B\n201 B\n301 B\n401 B\n5253 B\n105 B';

function diverLabel(d: Diver | undefined): string {
  return d ? `${d.firstName} ${d.lastName}` : '—';
}

/**
 * Enrollment flow: pick a category, see who's entered, and enroll a diver with
 * their dive sheet — validated inline against the category's rules at the
 * moment of entry (not as a separate admin step).
 */
export function Enrollment() {
  const categories = useCollection<Category>('/categories');
  const competitions = useCollection<Competition>('/competitions');
  const divers = useCollection<Diver>('/divers');
  const [categoryId, setCategoryId] = useState('');

  const category = categories.items.find((c) => c.id === categoryId);
  const compName = (cid?: string) => competitions.items.find((c) => c.id === cid)?.name;

  return (
    <>
      <div className="page-head">
        <h1>Inschrijvingen</h1>
        <p>Schrijf divers in per categorie en vul hun programma in — de sprongenlijst wordt meteen tegen de categorieregels gecontroleerd.</p>
      </div>

      <Card title="Categorie">
        {categories.items.length === 0 ? (
          <EmptyState icon="layers" title="Nog geen categorieën" description="Maak eerst een categorie aan onder Categorieën." />
        ) : (
          <Field label="Kies de categorie waarvoor je inschrijft">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— kies categorie —</option>
              {categories.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{compName(c.competitionId) ? ` · ${compName(c.competitionId)}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Card>

      {category ? (
        <CategoryEnrollment category={category} divers={divers.items} />
      ) : null}
    </>
  );
}

function CategoryEnrollment({ category, divers }: { category: Category; divers: Diver[] }) {
  const discipline = category.disciplineId as Discipline;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEntries = () => {
    setLoading(true);
    api.list<Entry>(`/categories/${category.id}/entries`).then(setEntries).finally(() => setLoading(false));
  };
  useEffect(refreshEntries, [category.id]);

  const diverById = useMemo(() => new Map(divers.map((d) => [d.id, d])), [divers]);
  const enrolledIds = new Set(entries.map((e) => e.diverId));
  const available = divers.filter((d) => !enrolledIds.has(d.id));

  return (
    <div className="grid cols-2" style={{ marginTop: 18 }}>
      <EnrollForm category={category} discipline={discipline} available={available} onSaved={refreshEntries} />

      <Card title="Ingeschreven" actions={<Badge tone="info">{entries.length}</Badge>}>
        <p className="muted" style={{ marginTop: 0 }}>
          Regels: {category.rules.diveCount} sprongen
          {category.rules.requireDistinctGroups ? ` · min. ${category.rules.requireDistinctGroups} groepen` : ''}
          {category.rules.maxTotalDd ? ` · max. DD ${category.rules.maxTotalDd}` : ''} · onderdeel {category.disciplineId}
        </p>
        {loading ? <p className="muted">Laden…</p> : entries.length === 0 ? (
          <EmptyState icon="users" title="Nog niemand ingeschreven" description="Voeg links de eerste diver met programma toe." />
        ) : (
          <div className="col">
            {entries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                category={category}
                discipline={discipline}
                diverName={diverLabel(diverById.get(e.diverId))}
                onRemove={async () => { await api.del(`/entries/${e.id}`); refreshEntries(); }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EnrollForm({
  category, discipline, available, onSaved,
}: { category: Category; discipline: Discipline; available: Diver[]; onSaved: () => void }) {
  const [diverId, setDiverId] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const dives = useMemo(() => parseSheetInput(text), [text]);
  const result = useMemo(() => validateSheet(discipline, dives, category.rules), [discipline, dives, category.rules]);
  const canSave = diverId !== '' && dives.length > 0 && result.valid && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const entryId = newId();
      await api.put(`/entries/${entryId}`, { id: entryId, diverId, categoryId: category.id });
      await api.put(`/sheets/${entryId}`, { entryId, dives });
      setDiverId(''); setText('');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Diver inschrijven">
      <div className="col">
        <Field label="Diver">
          <select value={diverId} onChange={(e) => setDiverId(e.target.value)}>
            <option value="">— kies diver —</option>
            {available.map((d) => <option key={d.id} value={d.id}>{diverLabel(d)} ({d.birthYear})</option>)}
          </select>
        </Field>
        {available.length === 0 ? <p className="muted">Alle bekende divers zijn al ingeschreven (of voeg er meer toe onder Deelnemers).</p> : null}

        <Field label="Programma (sprongenlijst)" hint="Eén per regel: code positie — bv. 5253 B">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={EXAMPLE} />
        </Field>

        <div className="grid cols-2">
          <Stat label="Totaal DD" value={result.totalDd.toFixed(1)} />
          <Stat label="Sprongen" value={`${dives.length} / ${category.rules.diveCount}`} />
        </div>

        {dives.length > 0 && result.issues.length > 0 ? (
          <div className="col" style={{ gap: 8 }}>
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
        ) : dives.length > 0 ? (
          <Badge tone="good">Programma is geldig</Badge>
        ) : null}

        <Button icon="check" disabled={!canSave} onClick={save}>
          {saving ? 'Opslaan…' : 'Inschrijven'}
        </Button>
        {!result.valid && dives.length > 0 ? <p className="muted">Los eerst de problemen op voordat je kunt inschrijven.</p> : null}
      </div>
    </Card>
  );
}

function EntryRow({
  entry, category, discipline, diverName, onRemove,
}: { entry: Entry; category: Category; discipline: Discipline; diverName: string; onRemove: () => void }) {
  const [sheet, setSheet] = useState<DiveSheet | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<DiveSheet>(`/sheets/${entry.id}`).then(setSheet).catch(() => setSheet(null)).finally(() => setLoaded(true));
  }, [entry.id]);

  const status = (() => {
    if (!loaded) return <Badge tone="info">…</Badge>;
    if (!sheet || sheet.dives.length === 0) return <Badge tone="warn">geen lijst</Badge>;
    return validateSheet(discipline, sheet.dives, category.rules).valid
      ? <Badge tone="good">geldig</Badge>
      : <Badge tone="bad">ongeldig</Badge>;
  })();

  return (
    <div className="row between" style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line-soft)' }}>
      <span className="row" style={{ gap: 10 }}>
        {status}
        <b>{diverName}</b>
        <span className="muted">{sheet ? `${sheet.dives.length} sprongen` : ''}</span>
      </span>
      <Button variant="danger" onClick={onRemove}>Uitschrijven</Button>
    </div>
  );
}
