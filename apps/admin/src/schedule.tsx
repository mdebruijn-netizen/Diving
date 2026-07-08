import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field } from '@aquameet/ui';
import type { Category, Competition, Session } from '@aquameet/competition';
import { ageBandLabel } from '@aquameet/competition';
import { api, newId, useCollection } from './api';

/** Build a competition's running order: sessions (ochtend/middag) with ordered categories. */
export function Schedule() {
  const { items: competitions, loading } = useCollection<Competition>('/competitions');
  const [competitionId, setCompetitionId] = useState('');

  useEffect(() => {
    if (!competitionId && competitions[0]) setCompetitionId(competitions[0].id);
  }, [competitions, competitionId]);

  if (loading) return <p className="muted">Loading…</p>;
  if (competitions.length === 0) {
    return <EmptyState icon="trophy" title="No competitions yet" description="Create a competition first, then plan its sessions here." />;
  }

  return (
    <div className="col" style={{ gap: 18 }}>
      <Field label="Competition">
        <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
          {competitions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      {competitionId && <CompetitionSchedule competitionId={competitionId} />}
    </div>
  );
}

function CompetitionSchedule({ competitionId }: { competitionId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const refresh = useCallback(async () => {
    const [s, c] = await Promise.all([
      api.list<Session>(`/competitions/${competitionId}/sessions`),
      api.list<Category>(`/categories?competitionId=${competitionId}`),
    ]);
    setSessions([...s].sort(byOrder));
    setCategories(c);
  }, [competitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unscheduled = categories.filter((c) => !c.sessionId).sort(byOrder);

  const addSession = async (name: string, startTime: string) => {
    const order = sessions.length ? Math.max(...sessions.map((s) => s.order)) + 1 : 0;
    const id = newId();
    await api.put(`/sessions/${id}`, { id, competitionId, name, startTime: startTime || undefined, order } satisfies Session);
    refresh();
  };

  const assign = async (cat: Category, sessionId: string) => {
    const inSession = categories.filter((c) => c.sessionId === sessionId);
    const order = inSession.length ? Math.max(...inSession.map((c) => c.order ?? 0)) + 1 : 0;
    await api.put(`/categories/${cat.id}`, { ...cat, sessionId, order });
    refresh();
  };
  const unassign = async (cat: Category) => {
    await api.put(`/categories/${cat.id}`, { ...cat, sessionId: undefined, order: undefined });
    refresh();
  };
  const move = async (cat: Category, dir: -1 | 1) => {
    const peers = categories.filter((c) => c.sessionId === cat.sessionId).sort(byOrder);
    const i = peers.findIndex((c) => c.id === cat.id);
    const j = i + dir;
    if (j < 0 || j >= peers.length) return;
    const a = peers[i]!, b = peers[j]!;
    await Promise.all([
      api.put(`/categories/${a.id}`, { ...a, order: b.order ?? j }),
      api.put(`/categories/${b.id}`, { ...b, order: a.order ?? i }),
    ]);
    refresh();
  };
  const removeSession = async (s: Session) => {
    // Unschedule its categories first so they aren't orphaned.
    await Promise.all(
      categories.filter((c) => c.sessionId === s.id).map((c) => api.put(`/categories/${c.id}`, { ...c, sessionId: undefined, order: undefined })),
    );
    await api.del(`/sessions/${s.id}`);
    refresh();
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      {sessions.map((s) => (
        <Card key={s.id} title={<SessionTitle s={s} onRemove={() => removeSession(s)} />}>
          <SessionCategories
            categories={categories.filter((c) => c.sessionId === s.id).sort(byOrder)}
            onMove={move}
            onRemove={unassign}
          />
          {unscheduled.length > 0 && (
            <div className="row" style={{ gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Add event:</span>
              <select defaultValue="" onChange={(e) => { const cat = unscheduled.find((c) => c.id === e.target.value); if (cat) assign(cat, s.id); e.currentTarget.value = ''; }}>
                <option value="">— choose —</option>
                {unscheduled.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </Card>
      ))}

      <NewSession onAdd={addSession} />

      <Card title="Unscheduled events">
        {unscheduled.length === 0 ? (
          <p className="muted">All categories are scheduled.</p>
        ) : (
          <div className="col" style={{ gap: 6 }}>
            {unscheduled.map((c) => (
              <div key={c.id} className="row between">
                <span>{c.name} <span className="muted" style={{ fontSize: '0.82rem' }}>{c.gender} · {c.rules.diveCount} dives{ageBandLabel(c) ? ` · ${ageBandLabel(c)}` : ''}</span></span>
                {sessions.length > 0 && (
                  <select defaultValue="" onChange={(e) => { if (e.target.value) assign(c, e.target.value); }}>
                    <option value="">Add to session…</option>
                    {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SessionTitle({ s, onRemove }: { s: Session; onRemove: () => void }) {
  return (
    <span className="row between" style={{ width: '100%' }}>
      <span>{s.name}{s.startTime ? <span className="muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}> · {s.startTime}</span> : null}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.82rem' }}>Remove</button>
    </span>
  );
}

function SessionCategories({ categories, onMove, onRemove }: { categories: Category[]; onMove: (c: Category, d: -1 | 1) => void; onRemove: (c: Category) => void }) {
  if (categories.length === 0) return <p className="muted">No events in this session yet.</p>;
  return (
    <div className="col" style={{ gap: 6 }}>
      {categories.map((c, i) => (
        <div key={c.id} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span className="row" style={{ gap: 10 }}>
            <span className="muted" style={{ width: 18, textAlign: 'right' }}>{i + 1}</span>
            <span>{c.name} <span className="muted" style={{ fontSize: '0.82rem' }}>{c.gender} · {c.rules.diveCount} dives{ageBandLabel(c) ? ` · ${ageBandLabel(c)}` : ''}</span></span>
          </span>
          <span className="row" style={{ gap: 4 }}>
            <IconBtn label="↑" onClick={() => onMove(c, -1)} disabled={i === 0} />
            <IconBtn label="↓" onClick={() => onMove(c, 1)} disabled={i === categories.length - 1} />
            <IconBtn label="✕" onClick={() => onRemove(c)} />
          </span>
        </div>
      ))}
    </div>
  );
}

function IconBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: 'var(--ink-800)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, width: 28, height: 28 }}>{label}</button>
  );
}

function NewSession({ onAdd }: { onAdd: (name: string, startTime: string) => void }) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  return (
    <Card title="Add session">
      <form className="row" style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name.trim(), startTime); setName(''); setStartTime(''); } }}>
        <Field label="Name"><input placeholder="Morning session" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Start time"><input placeholder="09:00" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
        <Button type="submit" icon="plus">Add</Button>
      </form>
    </Card>
  );
}

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);
