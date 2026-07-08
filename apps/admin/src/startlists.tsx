import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field } from '@aquameet/ui';
import type { Category, Competition, Diver, Entry, StartListItem } from '@aquameet/competition';
import { generateDraw } from '@aquameet/competition';
import { api, useCollection } from './api';

/** Draw and manage the running order (start list) per category. */
export function StartLists() {
  const { items: competitions, loading } = useCollection<Competition>('/competitions');
  const [competitionId, setCompetitionId] = useState('');

  useEffect(() => {
    if (!competitionId && competitions[0]) setCompetitionId(competitions[0].id);
  }, [competitions, competitionId]);

  if (loading) return <p className="muted">Loading…</p>;
  if (competitions.length === 0) {
    return <EmptyState icon="trophy" title="No competitions yet" description="Create a competition and its categories first." />;
  }
  return (
    <div className="col" style={{ gap: 18 }}>
      <Field label="Competition">
        <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
          {competitions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      {competitionId && <CompetitionStartLists competitionId={competitionId} />}
    </div>
  );
}

function CompetitionStartLists({ competitionId }: { competitionId: string }) {
  const { items: categories } = useCollection<Category>(`/categories?competitionId=${competitionId}`);
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (categories.length && !categories.find((c) => c.id === categoryId)) setCategoryId(categories[0]!.id);
  }, [categories, categoryId]);

  if (categories.length === 0) return <p className="muted">This competition has no categories yet.</p>;

  return (
    <div className="col" style={{ gap: 16 }}>
      <Field label="Event / category">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {categoryId && <CategoryStartList key={categoryId} categoryId={categoryId} />}
    </div>
  );
}

function CategoryStartList({ categoryId }: { categoryId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [divers, setDivers] = useState<Diver[]>([]);
  const [order, setOrder] = useState<string[]>([]); // entryIds
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [es, ds, list] = await Promise.all([
      api.list<Entry>(`/categories/${categoryId}/entries`),
      api.list<Diver>('/divers'),
      api.list<StartListItem>(`/categories/${categoryId}/startlist`),
    ]);
    setEntries(es);
    setDivers(ds);
    // Start from the saved list (ordered), then append any entries not yet in it.
    const listed = list.map((i) => i.entryId).filter((id) => es.some((e) => e.id === id));
    const rest = es.map((e) => e.id).filter((id) => !listed.includes(id));
    const init = [...listed, ...rest];
    setOrder(init);
    setSavedOrder(list.length ? listed.concat(rest) : []);
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const nameByEntry = useMemo(() => {
    const dName = new Map(divers.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
    return new Map(entries.map((e) => [e.id, dName.get(e.diverId) ?? 'Unknown diver']));
  }, [entries, divers]);

  const dirty = order.join() !== savedOrder.join();

  const drawRandom = () => {
    const seed = Date.now() >>> 0;
    setOrder(generateDraw(order.map((entryId) => ({ entryId })), 'random', seed).map((d) => d.entryId));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setOrder(next);
  };
  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/categories/${categoryId}/startlist`, { items: order.map((entryId, i) => ({ entryId, order: i })) });
      setSavedOrder(order);
    } finally {
      setSaving(false);
    }
  };

  if (entries.length === 0) return <Card title="Start list"><p className="muted">No entries in this event yet.</p></Card>;

  return (
    <Card
      title={
        <span className="row between" style={{ width: '100%' }}>
          <span>Running order</span>
          <span className="row" style={{ gap: 8 }}>
            {dirty && <Badge tone="warn">Unsaved</Badge>}
            {savedOrder.length > 0 && !dirty && <Badge tone="good">Saved</Badge>}
          </span>
        </span>
      }
    >
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button icon="play" onClick={drawRandom}>Draw random</Button>
        <Button variant="ghost" onClick={() => setOrder([...savedOrder.length ? savedOrder : entries.map((e) => e.id)])}>Reset</Button>
        <Button variant="ghost" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save start list'}</Button>
      </div>
      <div className="col" style={{ gap: 4 }}>
        {order.map((entryId, i) => (
          <div key={entryId} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span className="row" style={{ gap: 12 }}>
              <span className="muted" style={{ width: 22, textAlign: 'right' }}>{i + 1}</span>
              <span>{nameByEntry.get(entryId)}</span>
            </span>
            <span className="row" style={{ gap: 4 }}>
              <MoveBtn label="↑" onClick={() => move(i, -1)} disabled={i === 0} />
              <MoveBtn label="↓" onClick={() => move(i, 1)} disabled={i === order.length - 1} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MoveBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: 'var(--ink-800)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, width: 28, height: 28 }}>{label}</button>
  );
}
